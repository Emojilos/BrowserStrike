import type { Vec3, Team } from './game.js';
import type { WeaponId } from './weapons.js';
import type { KeyState } from './player.js';

// Client → Server messages

export interface InputMessage {
  seq: number;
  keys: KeyState;
  yaw: number;
  pitch: number;
  deltaTime: number;
}

export interface ShootMessage {
  seq: number;
  timestamp: number;
  origin: Vec3;
  direction: Vec3;
}

export interface ReloadMessage {}

export interface SelectWeaponMessage {
  weapon: WeaponId;
}

export interface JoinTeamMessage {
  team: Team;
}

export interface StartGameMessage {}

// Server → Client events

export interface HitEvent {
  targetId: string;
  damage: number;
  isHeadshot: boolean;
  direction: Vec3;
}

export interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  weaponId: WeaponId;
  isHeadshot: boolean;
}

export interface RoundEndEvent {
  winnerTeam: Team;
  scoreA: number;
  scoreB: number;
}

export interface MatchEndEvent {
  winnerTeam: Team;
  finalScoreA: number;
  finalScoreB: number;
}

export interface PlayerDiedEvent {
  sessionId: string;
}

export interface SoundEvent {
  type: string;
  position: Vec3;
  sourceId: string;
}
