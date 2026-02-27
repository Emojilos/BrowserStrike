export type WeaponId = 'deagle' | 'ssg08' | 'mp9';
export type WeaponType = 'pistol' | 'sniper' | 'smg';

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  type: WeaponType;
  damage: { body: number; head: number };
  fireRate: number; // ms between shots
  magazine: number;
  reloadTime: number; // ms
  spread: {
    base: number; // base spread (radians)
    moving: number; // additional spread when moving
    sustained: number; // spread increase per consecutive shot (for auto weapons)
  };
  range: number; // effective range in units
  automatic: boolean;
}
