import { Schema, type } from '@colyseus/schema';
import type { WeaponId } from '@browserstrike/shared';

export class KillEventSchema extends Schema {
  @type('string') killerNickname: string = '';
  @type('string') victimNickname: string = '';
  @type('string') weapon: WeaponId = 'deagle';
  @type('boolean') isHeadshot: boolean = false;
  @type('float64') timestamp: number = 0;
}
