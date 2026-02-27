import type { WeaponId, WeaponConfig } from '../types/weapons.js';

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  deagle: {
    id: 'deagle',
    name: 'Desert Eagle',
    type: 'pistol',
    damage: { body: 35, head: 70 },
    fireRate: 500, // ms between shots (semi-auto, ~2 shots/sec)
    magazine: 7,
    reloadTime: 2000, // ms
    spread: { base: 0.02, moving: 0.05, sustained: 0 },
    range: 80,
    automatic: false,
  },
  ssg08: {
    id: 'ssg08',
    name: 'SSG-08',
    type: 'sniper',
    damage: { body: 75, head: 150 },
    fireRate: 1500, // ms (bolt-action, ~1 shot/1.5sec)
    magazine: 10,
    reloadTime: 2500,
    spread: { base: 0.005, moving: 0.08, sustained: 0 },
    range: 150,
    automatic: false,
  },
  mp9: {
    id: 'mp9',
    name: 'MP9',
    type: 'smg',
    damage: { body: 20, head: 40 },
    fireRate: 100, // ms (~10 shots/sec)
    magazine: 30,
    reloadTime: 2500,
    spread: { base: 0.04, moving: 0.07, sustained: 0.003 },
    range: 50,
    automatic: true,
  },
} as const;

export const DEFAULT_WEAPON: WeaponId = 'deagle';
export const WEAPON_IDS: WeaponId[] = ['deagle', 'ssg08', 'mp9'];
