import { Room, Client } from 'colyseus';
import {
  MAX_PLAYERS_PER_ROOM,
  ROOM_CODE_LENGTH,
  PLAYER_HP,
  DEFAULT_WEAPON,
  WEAPONS,
} from '@browserstrike/shared';
import { GameState } from '../schemas/GameState.js';
import { PlayerSchema } from '../schemas/PlayerSchema.js';

function generateRoomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS_PER_ROOM;

  onCreate(options: Record<string, unknown>) {
    this.setState(new GameState());
    this.state.roomCode = generateRoomCode(ROOM_CODE_LENGTH);
    this.state.adminId = '';
    console.log(`GameRoom created | id: ${this.roomId} | code: ${this.state.roomCode}`);
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    const player = new PlayerSchema();
    player.sessionId = client.sessionId;
    player.nickname = typeof options.nickname === 'string' ? options.nickname : 'Player';
    player.hp = PLAYER_HP;
    player.currentWeapon = DEFAULT_WEAPON;
    player.ammo = WEAPONS[DEFAULT_WEAPON].magazine;

    this.state.players.set(client.sessionId, player);

    // First player to join becomes admin
    if (this.state.adminId === '') {
      this.state.adminId = client.sessionId;
    }

    console.log(`Player joined: ${client.sessionId} (${player.nickname})`);
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);

    // Reassign admin if the admin left
    if (this.state.adminId === client.sessionId) {
      const remaining = Array.from(this.state.players.keys());
      this.state.adminId = remaining.length > 0 ? remaining[0] : '';
    }

    console.log(`Player left: ${client.sessionId} (consented: ${consented})`);
  }

  onDispose() {
    console.log(`GameRoom disposed | id: ${this.roomId}`);
  }
}
