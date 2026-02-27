import type { Vec3, Rotation, Team } from './game.js';
import type { WeaponId } from './weapons.js';

export interface PlayerState {
  sessionId: string;
  nickname: string;
  team: Team;
  isAlive: boolean;
  hp: number;
  position: Vec3;
  rotation: Rotation;
  currentWeapon: WeaponId;
  ammo: number;
  isReloading: boolean;
  kills: number;
  deaths: number;
}

export interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  space: boolean;
}
