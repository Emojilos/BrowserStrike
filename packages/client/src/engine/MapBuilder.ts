import * as THREE from 'three';

/** Creates a prototype Warehouse map from Three.js primitives. */
export function buildWarehouseMap(scene: THREE.Scene): void {
  // --- Materials ---
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 });
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.7 });
  const crateDarkMat = new THREE.MeshStandardMaterial({ color: 0x6b4f10, roughness: 0.7 });

  // --- Floor (40x40) ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // --- Walls ---
  const wallHeight = 4;
  const wallThickness = 0.4;

  // Helper to create a wall segment
  function addWall(
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      wallMat,
    );
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    return wall;
  }

  // Outer walls (4 sides)
  // North wall (z = -20)
  addWall(40, wallHeight, wallThickness, 0, wallHeight / 2, -20);
  // South wall (z = +20)
  addWall(40, wallHeight, wallThickness, 0, wallHeight / 2, 20);
  // West wall (x = -20)
  addWall(wallThickness, wallHeight, 40, -20, wallHeight / 2, 0);
  // East wall (x = +20)
  addWall(wallThickness, wallHeight, 40, 20, wallHeight / 2, 0);

  // --- Interior walls (creating warehouse corridors) ---
  // Center divider with gap
  addWall(12, wallHeight, wallThickness, -7, wallHeight / 2, 0);
  addWall(12, wallHeight, wallThickness, 7, wallHeight / 2, 0);

  // Side corridor walls
  addWall(wallThickness, wallHeight, 10, -8, wallHeight / 2, -10);
  addWall(wallThickness, wallHeight, 10, 8, wallHeight / 2, 10);

  // --- Crates (varied sizes, scattered for cover) ---
  function addCrate(
    w: number,
    h: number,
    d: number,
    x: number,
    z: number,
    mat?: THREE.Material,
  ): THREE.Mesh {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      mat ?? crateMat,
    );
    crate.position.set(x, h / 2, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
    return crate;
  }

  // Spawn A area (NW corner) — a few crates for cover
  addCrate(2, 1.2, 2, -14, -14);
  addCrate(1.5, 1, 1.5, -12, -16, crateDarkMat);

  // Spawn B area (SE corner)
  addCrate(2, 1.2, 2, 14, 14, crateDarkMat);
  addCrate(1.5, 1, 1.5, 12, 16);

  // Mid-map cover
  addCrate(1.5, 2, 1.5, 0, -6);
  addCrate(1.5, 1, 3, 0, 6, crateDarkMat);

  // Side cover
  addCrate(2, 1.5, 1, -5, 8);
  addCrate(1, 1, 2, 6, -8, crateDarkMat);
}
