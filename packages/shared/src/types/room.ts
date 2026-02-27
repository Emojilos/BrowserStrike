import type { GameStatus, GameMode, MapId, RoundsToWin } from './game.js';
import type { PlayerState } from './player.js';

export interface RoomState {
  roomCode: string;
  status: GameStatus;
  settings: {
    mode: GameMode;
    mapId: MapId;
    roundsToWin: RoundsToWin;
    roundTimeLimit: number;
  };
  adminId: string;
  scoreTeamA: number;
  scoreTeamB: number;
  currentRound: number;
  roundTimer: number;
  players: Map<string, PlayerState>;
}
