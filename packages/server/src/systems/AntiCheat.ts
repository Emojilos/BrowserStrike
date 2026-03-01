import { PLAYER_SPEED } from '@browserstrike/shared';

/** Maximum messages per second before rate limiting kicks in. */
const MAX_MESSAGES_PER_SEC = 60;

/** Window size in ms for the rate limiter sliding window. */
const RATE_WINDOW_MS = 1000;

/** Number of violations before logging a warning. */
const WARN_THRESHOLD = 5;

/** Tolerance multiplier for speed validation (account for delta stacking + float imprecision). */
const SPEED_TOLERANCE = 1.5;

/** Maximum pitch in radians (slightly above PI/2 to allow small float drift). */
const MAX_PITCH = Math.PI / 2 + 0.01;

interface PlayerAntiCheatState {
  /** Timestamps of recent messages (sliding window). */
  messageTimes: number[];
  /** Cumulative violation count. */
  violations: number;
  /** Previous position for speed hack detection (set after first input). */
  lastX: number;
  lastY: number;
  lastZ: number;
  hasLastPosition: boolean;
}

export class AntiCheat {
  private players = new Map<string, PlayerAntiCheatState>();

  /** Register a player for tracking. */
  addPlayer(sessionId: string): void {
    this.players.set(sessionId, {
      messageTimes: [],
      violations: 0,
      lastX: 0,
      lastY: 0,
      lastZ: 0,
      hasLastPosition: false,
    });
  }

  /** Unregister a player. */
  removePlayer(sessionId: string): void {
    this.players.delete(sessionId);
  }

  /**
   * Check if the player is sending messages too fast.
   * Returns true if the message should be REJECTED (rate limited).
   */
  isRateLimited(sessionId: string): boolean {
    const state = this.players.get(sessionId);
    if (!state) return true;

    const now = Date.now();

    // Prune old timestamps outside the window
    while (state.messageTimes.length > 0 && state.messageTimes[0] <= now - RATE_WINDOW_MS) {
      state.messageTimes.shift();
    }

    if (state.messageTimes.length >= MAX_MESSAGES_PER_SEC) {
      this.recordViolation(sessionId, 'rate_limit');
      return true;
    }

    state.messageTimes.push(now);
    return false;
  }

  /**
   * Clamp pitch to valid range [-PI/2, PI/2].
   * Returns clamped value.
   */
  clampPitch(pitch: number): number {
    return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
  }

  /**
   * Check if a position change is plausible given deltaTime and player speed.
   * Returns true if the movement is SUSPICIOUS (should be logged but still applied
   * since the server applies movement authoritatively).
   */
  checkSpeedHack(
    sessionId: string,
    newX: number,
    newY: number,
    newZ: number,
    deltaTime: number,
  ): boolean {
    const state = this.players.get(sessionId);
    if (!state) return false;

    if (!state.hasLastPosition) {
      state.lastX = newX;
      state.lastY = newY;
      state.lastZ = newZ;
      state.hasLastPosition = true;
      return false;
    }

    const dx = newX - state.lastX;
    const dz = newZ - state.lastZ;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    const maxDist = PLAYER_SPEED * deltaTime * SPEED_TOLERANCE;

    // Update stored position
    state.lastX = newX;
    state.lastY = newY;
    state.lastZ = newZ;

    if (horizontalDist > maxDist && horizontalDist > 1.0) {
      this.recordViolation(sessionId, 'speed_hack');
      return true;
    }

    return false;
  }

  /**
   * Sync the tracked position (e.g., on respawn/teleport).
   */
  syncPosition(sessionId: string, x: number, y: number, z: number): void {
    const state = this.players.get(sessionId);
    if (!state) return;
    state.lastX = x;
    state.lastY = y;
    state.lastZ = z;
    state.hasLastPosition = true;
  }

  /**
   * Reset position tracking (e.g., on round start).
   */
  resetPositions(): void {
    for (const state of this.players.values()) {
      state.hasLastPosition = false;
    }
  }

  /** Record a violation and log if threshold exceeded. */
  private recordViolation(sessionId: string, type: string): void {
    const state = this.players.get(sessionId);
    if (!state) return;
    state.violations++;

    if (state.violations % WARN_THRESHOLD === 0) {
      console.warn(
        `[AntiCheat] Player ${sessionId} has ${state.violations} violations (latest: ${type})`,
      );
    }
  }

  /** Get violation count for a player. */
  getViolations(sessionId: string): number {
    return this.players.get(sessionId)?.violations ?? 0;
  }
}
