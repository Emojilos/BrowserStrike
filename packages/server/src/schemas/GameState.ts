import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';
import type { GameStatus } from '@browserstrike/shared';
import { SettingsSchema } from './SettingsSchema.js';
import { PlayerSchema } from './PlayerSchema.js';
import { KillEventSchema } from './KillEventSchema.js';

export class GameState extends Schema {
  @type('string') roomCode: string = '';
  @type('string') status: GameStatus = 'lobby';
  @type(SettingsSchema) settings: SettingsSchema = new SettingsSchema();
  @type('string') adminId: string = '';
  @type('uint8') scoreTeamA: number = 0;
  @type('uint8') scoreTeamB: number = 0;
  @type('uint8') currentRound: number = 0;
  @type('float32') roundTimer: number = 0;
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type([KillEventSchema]) killFeed = new ArraySchema<KillEventSchema>();
}
