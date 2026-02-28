import { Schema, type } from '@colyseus/schema';
import type { GameMode, MapId, RoundsToWin } from '@browserstrike/shared';

export class SettingsSchema extends Schema {
  @type('string') mode: GameMode = '1v1';
  @type('string') mapId: MapId = 'warehouse';
  @type('uint8') roundsToWin: RoundsToWin = 5;
  @type('uint16') roundTimeLimit: number = 120;
}
