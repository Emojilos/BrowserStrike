import type { MapId, MapConfig } from '../types/game.js';

export const MAPS: Record<MapId, MapConfig> = {
  warehouse: {
    id: 'warehouse',
    name: 'Warehouse',
    description: 'Dark warehouse with crates and narrow passages',
    size: { width: 40, depth: 40 },
    spawnA: { x: -16, y: 0, z: -16 },
    spawnB: { x: 16, y: 0, z: 16 },
  },
  dust_alley: {
    id: 'dust_alley',
    name: 'Dust Alley',
    description: 'Desert town with arches, alleys and an open square',
    size: { width: 40, depth: 40 },
    spawnA: { x: -16, y: 0, z: 0 },
    spawnB: { x: 16, y: 0, z: 0 },
  },
  office: {
    id: 'office',
    name: 'Office',
    description: 'Two-story office building with corridors and stairs',
    size: { width: 40, depth: 40 },
    spawnA: { x: -16, y: 0, z: -16 },
    spawnB: { x: 16, y: 4, z: 16 },
  },
  trainyard: {
    id: 'trainyard',
    name: 'Trainyard',
    description: 'Railway station with wagons, platforms, open and closed areas',
    size: { width: 40, depth: 40 },
    spawnA: { x: -16, y: 0, z: -12 },
    spawnB: { x: 16, y: 0, z: 12 },
  },
};

export const MAP_IDS: MapId[] = ['warehouse', 'dust_alley', 'office', 'trainyard'];
export const DEFAULT_MAP: MapId = 'warehouse';
