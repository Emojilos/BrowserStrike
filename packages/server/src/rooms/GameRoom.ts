import { Room, Client } from 'colyseus';
import { MAX_PLAYERS_PER_ROOM } from '@browserstrike/shared';

export class GameRoom extends Room {
  maxClients = MAX_PLAYERS_PER_ROOM;

  onCreate(options: Record<string, unknown>) {
    console.log(`GameRoom created | id: ${this.roomId}`);
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    console.log(`Player joined: ${client.sessionId}`);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`Player left: ${client.sessionId} (consented: ${consented})`);
  }

  onDispose() {
    console.log(`GameRoom disposed | id: ${this.roomId}`);
  }
}
