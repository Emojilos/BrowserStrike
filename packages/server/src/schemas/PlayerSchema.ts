import { Schema, type } from '@colyseus/schema';
import {
  PLAYER_HP,
  type Team,
  type WeaponId,
  WEAPONS,
  DEFAULT_WEAPON,
} from '@browserstrike/shared';

export class PlayerSchema extends Schema {
  @type('string') sessionId: string = '';
  @type('string') nickname: string = '';
  @type('string') team: Team = 'unassigned';
  @type('boolean') isAlive: boolean = true;
  @type('int16') hp: number = PLAYER_HP;

  // Position
  @type('float32') x: number = 0;
  @type('float32') y: number = 0;
  @type('float32') z: number = 0;

  // Rotation
  @type('float32') yaw: number = 0;
  @type('float32') pitch: number = 0;

  // Weapon state
  @type('string') currentWeapon: WeaponId = DEFAULT_WEAPON;
  @type('uint8') ammo: number = WEAPONS[DEFAULT_WEAPON].magazine;
  @type('boolean') isReloading: boolean = false;

  // Stats
  @type('uint16') kills: number = 0;
  @type('uint16') deaths: number = 0;
}
