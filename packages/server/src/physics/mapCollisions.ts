import { CollisionWorld } from './CollisionWorld.js';

/**
 * Builds server-side collision geometry for the Warehouse map.
 * Matches the client's buildWarehouseMap() collision boxes exactly.
 */
export function buildWarehouseCollisions(): CollisionWorld {
  const world = new CollisionWorld();

  const wallHeight = 4;
  const wallThickness = 0.4;

  function addWall(w: number, h: number, d: number, x: number, y: number, z: number): void {
    world.addBox(x, y, z, w / 2, h / 2, d / 2);
  }

  function addCrate(w: number, h: number, d: number, x: number, z: number): void {
    world.addBox(x, h / 2, z, w / 2, h / 2, d / 2);
  }

  // Outer walls
  addWall(40, wallHeight, wallThickness, 0, wallHeight / 2, -20);
  addWall(40, wallHeight, wallThickness, 0, wallHeight / 2, 20);
  addWall(wallThickness, wallHeight, 40, -20, wallHeight / 2, 0);
  addWall(wallThickness, wallHeight, 40, 20, wallHeight / 2, 0);

  // Interior walls
  addWall(12, wallHeight, wallThickness, -7, wallHeight / 2, 0);
  addWall(12, wallHeight, wallThickness, 7, wallHeight / 2, 0);
  addWall(wallThickness, wallHeight, 10, -8, wallHeight / 2, -10);
  addWall(wallThickness, wallHeight, 10, 8, wallHeight / 2, 10);

  // Crates — spawn A area
  addCrate(2, 1.2, 2, -14, -14);
  addCrate(1.5, 1, 1.5, -12, -16);

  // Crates — spawn B area
  addCrate(2, 1.2, 2, 14, 14);
  addCrate(1.5, 1, 1.5, 12, 16);

  // Mid-map cover
  addCrate(1.5, 2, 1.5, 0, -6);
  addCrate(1.5, 1, 3, 0, 6);

  // Side cover
  addCrate(2, 1.5, 1, -5, 8);
  addCrate(1, 1, 2, 6, -8);

  return world;
}

/** Returns a CollisionWorld for the given map ID. */
export function buildMapCollisions(mapId: string): CollisionWorld {
  switch (mapId) {
    case 'warehouse':
    default:
      return buildWarehouseCollisions();
  }
}
