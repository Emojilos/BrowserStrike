import type { GameState } from '../schemas/GameState.js';
import type { PlayerSchema } from '../schemas/PlayerSchema.js';
import type { Clock } from 'colyseus';
import {
  PLAYER_HP,
  WEAPON_SELECT_TIME,
  ROUND_COUNTDOWN,
  ROUND_END_PAUSE,
  ROUND_TIME_LIMIT,
  WEAPONS,
  DEFAULT_WEAPON,
  MAPS,
  TICK_RATE,
} from '@browserstrike/shared';
import type { GameStatus, Team, WeaponId, RoundEndEvent, MatchEndEvent } from '@browserstrike/shared';

export interface RoundSystemCallbacks {
  broadcast: (type: string, data: unknown) => void;
  onMatchEnd: () => void;
}

/**
 * Server-side round state machine.
 *
 * States: lobby → weapon_select (5s) → countdown (3s) → playing → round_end (3s)
 *         → loop back to weapon_select OR → match_end
 */
export class RoundSystem {
  private state: GameState;
  private clock: Clock;
  private callbacks: RoundSystemCallbacks;

  /** Countdown timer (ticks down each server tick) */
  private phaseTimer = 0;

  /** Weapon selections received during weapon_select phase. */
  private weaponSelections = new Map<string, WeaponId>();

  constructor(state: GameState, clock: Clock, callbacks: RoundSystemCallbacks) {
    this.state = state;
    this.clock = clock;
    this.callbacks = callbacks;
  }

  /** Called by GameRoom when startGame message is received. Transitions from lobby. */
  startGame(): void {
    if (this.state.status !== 'lobby') return;

    this.state.currentRound = 0;
    this.state.scoreTeamA = 0;
    this.state.scoreTeamB = 0;

    this.enterWeaponSelect();
  }

  /** Called every server tick from setSimulationInterval. */
  tick(): void {
    const dt = 1 / TICK_RATE;

    switch (this.state.status as GameStatus) {
      case 'weapon_select':
        this.tickWeaponSelect(dt);
        break;
      case 'playing':
        this.tickPlaying(dt);
        break;
      case 'round_end':
        this.tickRoundEnd(dt);
        break;
      // lobby and match_end don't tick
    }
  }

  /** Handle selectWeapon message from a player. */
  selectWeapon(sessionId: string, weaponId: WeaponId): void {
    if (this.state.status !== 'weapon_select') return;
    if (!WEAPONS[weaponId]) return;
    this.weaponSelections.set(sessionId, weaponId);
  }

  // ── Phase transitions ──────────────────────────────────

  private enterWeaponSelect(): void {
    this.state.status = 'weapon_select';
    this.phaseTimer = WEAPON_SELECT_TIME;
    this.state.roundTimer = WEAPON_SELECT_TIME;
    this.weaponSelections.clear();

    this.state.currentRound++;

    console.log(`Round ${this.state.currentRound}: weapon_select (${WEAPON_SELECT_TIME}s)`);
  }

  private enterCountdown(): void {
    this.state.status = 'playing'; // Client sees 'playing' but we show countdown via roundTimer
    // Actually use a distinct approach: set countdown phase as a sub-state
    // For simplicity, we use the roundTimer to show countdown and block inputs
    // The task spec says countdown is a separate state, but GameStatus type only has 'playing'
    // We'll broadcast a 'countdown' event and use roundTimer

    // Apply weapon selections
    this.state.players.forEach((player, sessionId) => {
      const selectedWeapon = this.weaponSelections.get(sessionId) ?? DEFAULT_WEAPON;
      player.currentWeapon = selectedWeapon;
      player.ammo = WEAPONS[selectedWeapon].magazine;
      player.isReloading = false;
    });

    // Spawn all players at spawn points with full HP
    this.spawnPlayers();

    // Start countdown phase
    this.phaseTimer = ROUND_COUNTDOWN;
    this.state.roundTimer = ROUND_COUNTDOWN;

    this.callbacks.broadcast('countdown', { seconds: ROUND_COUNTDOWN });
    console.log(`Round ${this.state.currentRound}: countdown (${ROUND_COUNTDOWN}s)`);

    // After countdown, transition to actual playing
    this.clock.setTimeout(() => {
      if (this.state.status === 'playing') {
        this.phaseTimer = ROUND_TIME_LIMIT;
        this.state.roundTimer = ROUND_TIME_LIMIT;
        this.callbacks.broadcast('roundStart', { round: this.state.currentRound });
        console.log(`Round ${this.state.currentRound}: PLAYING (${ROUND_TIME_LIMIT}s)`);
      }
    }, ROUND_COUNTDOWN * 1000);
  }

  private enterRoundEnd(winnerTeam: Team | 'draw'): void {
    this.state.status = 'round_end';
    this.phaseTimer = ROUND_END_PAUSE;
    this.state.roundTimer = ROUND_END_PAUSE;

    // Update score
    if (winnerTeam === 'A') {
      this.state.scoreTeamA++;
    } else if (winnerTeam === 'B') {
      this.state.scoreTeamB++;
    }
    // 'draw' — no score change

    const roundEndEvent: RoundEndEvent = {
      winnerTeam: winnerTeam === 'draw' ? 'unassigned' : winnerTeam,
      scoreA: this.state.scoreTeamA,
      scoreB: this.state.scoreTeamB,
    };
    this.callbacks.broadcast('roundEnd', roundEndEvent);

    console.log(
      `Round ${this.state.currentRound} ended: ${winnerTeam === 'draw' ? 'DRAW' : `Team ${winnerTeam} wins`} | Score: ${this.state.scoreTeamA} - ${this.state.scoreTeamB}`,
    );
  }

  private enterMatchEnd(): void {
    this.state.status = 'match_end';
    this.state.roundTimer = 0;

    const winnerTeam: Team = this.state.scoreTeamA >= this.state.settings.roundsToWin ? 'A' : 'B';

    const matchEndEvent: MatchEndEvent = {
      winnerTeam,
      finalScoreA: this.state.scoreTeamA,
      finalScoreB: this.state.scoreTeamB,
    };
    this.callbacks.broadcast('matchEnd', matchEndEvent);

    console.log(
      `MATCH END: Team ${winnerTeam} wins! Final: ${this.state.scoreTeamA} - ${this.state.scoreTeamB}`,
    );

    this.callbacks.onMatchEnd();
  }

  // ── Tick handlers ──────────────────────────────────────

  private tickWeaponSelect(dt: number): void {
    this.phaseTimer -= dt;
    this.state.roundTimer = Math.max(0, this.phaseTimer);

    if (this.phaseTimer <= 0) {
      this.enterCountdown();
    }
  }

  private tickPlaying(dt: number): void {
    // During countdown phase, phaseTimer counts down from ROUND_COUNTDOWN
    // After countdown, it counts down from ROUND_TIME_LIMIT
    this.phaseTimer -= dt;
    this.state.roundTimer = Math.max(0, this.phaseTimer);

    // Don't check win conditions during countdown
    if (this.phaseTimer > ROUND_TIME_LIMIT) return;

    // Check timer expiry
    if (this.phaseTimer <= 0) {
      this.enterRoundEnd('draw');
      return;
    }

    // Check team elimination
    const winner = this.checkTeamElimination();
    if (winner) {
      this.enterRoundEnd(winner);
    }
  }

  private tickRoundEnd(dt: number): void {
    this.phaseTimer -= dt;
    this.state.roundTimer = Math.max(0, this.phaseTimer);

    if (this.phaseTimer <= 0) {
      // Check if match is over
      if (
        this.state.scoreTeamA >= this.state.settings.roundsToWin ||
        this.state.scoreTeamB >= this.state.settings.roundsToWin
      ) {
        this.enterMatchEnd();
      } else {
        this.enterWeaponSelect();
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────

  /** Check if all players on one team are dead. Returns winning team or null. */
  private checkTeamElimination(): Team | null {
    let teamAAlive = 0;
    let teamBAlive = 0;
    let teamATotal = 0;
    let teamBTotal = 0;

    this.state.players.forEach((player) => {
      if (player.team === 'A') {
        teamATotal++;
        if (player.isAlive) teamAAlive++;
      } else if (player.team === 'B') {
        teamBTotal++;
        if (player.isAlive) teamBAlive++;
      }
    });

    // Need at least one player on each team
    if (teamATotal === 0 || teamBTotal === 0) return null;

    if (teamAAlive === 0) return 'B';
    if (teamBAlive === 0) return 'A';
    return null;
  }

  /** Spawn all players at their team's spawn point with full HP. */
  private spawnPlayers(): void {
    const mapConfig = MAPS[this.state.settings.mapId];

    // Spread players around the spawn point to avoid stacking
    let spawnAIndex = 0;
    let spawnBIndex = 0;

    this.state.players.forEach((player) => {
      player.hp = PLAYER_HP;
      player.isAlive = true;
      player.isReloading = false;

      // Reset velocity
      player.velocityY = 0;
      player.isGrounded = true;

      if (player.team === 'A') {
        const offset = spawnAIndex * 1.5; // 1.5 units apart
        player.x = mapConfig.spawnA.x + offset;
        player.y = mapConfig.spawnA.y;
        player.z = mapConfig.spawnA.z;
        player.yaw = 0; // Face positive X
        spawnAIndex++;
      } else if (player.team === 'B') {
        const offset = spawnBIndex * 1.5;
        player.x = mapConfig.spawnB.x - offset;
        player.y = mapConfig.spawnB.y;
        player.z = mapConfig.spawnB.z;
        player.yaw = Math.PI; // Face negative X (toward A)
        spawnBIndex++;
      }

      player.pitch = 0;
    });
  }

  /** Whether the game is in a state where player input should be processed. */
  isPlayable(): boolean {
    return this.state.status === 'playing' && this.phaseTimer <= ROUND_TIME_LIMIT;
  }

  /** Whether shooting should be allowed. */
  isShootingAllowed(): boolean {
    return this.isPlayable();
  }

  /** Reset for returning to lobby (e.g., after match end rematch). */
  returnToLobby(): void {
    this.state.status = 'lobby';
    this.state.currentRound = 0;
    this.state.scoreTeamA = 0;
    this.state.scoreTeamB = 0;
    this.state.roundTimer = 0;
    this.weaponSelections.clear();

    // Reset player stats
    this.state.players.forEach((player) => {
      player.kills = 0;
      player.deaths = 0;
      player.hp = PLAYER_HP;
      player.isAlive = true;
      player.isReloading = false;
      player.team = 'unassigned';
    });

    // Clear kill feed
    this.state.killFeed.splice(0, this.state.killFeed.length);
  }
}
