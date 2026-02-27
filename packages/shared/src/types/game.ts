export type GameStatus = 'lobby' | 'weapon_select' | 'playing' | 'round_end' | 'match_end';
export type Team = 'A' | 'B' | 'unassigned';
export type GameMode = '1v1' | '2v2';
export type RoundsToWin = 5 | 7 | 10 | 13;

export type MapId = 'warehouse' | 'dust_alley' | 'office' | 'trainyard';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  yaw: number;
  pitch: number;
}

export interface MapConfig {
  id: MapId;
  name: string;
  description: string;
  size: { width: number; depth: number };
  spawnA: Vec3;
  spawnB: Vec3;
}

export interface RoomSettings {
  mode: GameMode;
  mapId: MapId;
  roundsToWin: RoundsToWin;
  roundTimeLimit: number;
}
