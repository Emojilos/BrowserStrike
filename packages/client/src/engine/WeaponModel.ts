import * as THREE from 'three';
import { WEAPONS } from '@browserstrike/shared';
import type { WeaponId } from '@browserstrike/shared';

/** Per-weapon recoil and position tuning. */
const WEAPON_PARAMS: Record<WeaponId, {
  restPosition: THREE.Vector3;
  recoilDuration: number;
  recoilKickBack: number;
  recoilKickUp: number;
  recoilRotation: number;
}> = {
  deagle: {
    restPosition: new THREE.Vector3(0.25, -0.22, -0.45),
    recoilDuration: 0.12,
    recoilKickBack: 0.06,
    recoilKickUp: 0.04,
    recoilRotation: 0.15,
  },
  ssg08: {
    restPosition: new THREE.Vector3(0.22, -0.24, -0.50),
    recoilDuration: 0.25, // longer bolt-action recoil
    recoilKickBack: 0.10,
    recoilKickUp: 0.06,
    recoilRotation: 0.22,
  },
  mp9: {
    restPosition: new THREE.Vector3(0.23, -0.20, -0.42),
    recoilDuration: 0.06, // snappy SMG recoil
    recoilKickBack: 0.03,
    recoilKickUp: 0.02,
    recoilRotation: 0.06,
  },
};

/**
 * First-person weapon model rendered relative to the camera.
 * Uses a separate scene + camera overlay so the weapon never clips into world geometry.
 *
 * Supports Deagle, SSG-08, and MP9 — all built from low-poly primitives.
 */
export class WeaponModel {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;

  private readonly weaponGroup = new THREE.Group();
  private readonly restRotation = new THREE.Euler(0, 0, 0);

  // Recoil animation state
  private recoilTimer = 0;

  // Fire state
  private lastFireTime = 0;
  private mouseWasDown = false;

  // Current weapon
  private weaponId: WeaponId = 'deagle';

  constructor(aspect: number, weaponId: WeaponId = 'deagle') {
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.01, 10);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    dirLight.position.set(1, 2, 1);
    this.scene.add(dirLight);

    this.weaponId = weaponId;
    this.buildWeaponModel(weaponId);
    this.weaponGroup.position.copy(WEAPON_PARAMS[weaponId].restPosition);
    this.scene.add(this.weaponGroup);
  }

  /** Switch to a different weapon — rebuilds model geometry. */
  switchWeapon(newWeaponId: WeaponId): void {
    if (newWeaponId === this.weaponId) return;
    this.weaponId = newWeaponId;
    this.recoilTimer = 0;
    this.lastFireTime = 0;
    this.mouseWasDown = false;
    this.clearWeaponGroup();
    this.buildWeaponModel(newWeaponId);
    this.weaponGroup.position.copy(WEAPON_PARAMS[newWeaponId].restPosition);
    this.weaponGroup.rotation.copy(this.restRotation);
  }

  getWeaponId(): WeaponId {
    return this.weaponId;
  }

  private clearWeaponGroup(): void {
    while (this.weaponGroup.children.length > 0) {
      const child = this.weaponGroup.children[0];
      this.weaponGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }

  private buildWeaponModel(id: WeaponId): void {
    switch (id) {
      case 'deagle': this.buildDeagleModel(); break;
      case 'ssg08': this.buildSSG08Model(); break;
      case 'mp9': this.buildMP9Model(); break;
    }
  }

  private buildDeagleModel(): void {
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 });
    const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.2, roughness: 0.8 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 });

    // Slide
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), gunMetal);
    slide.position.set(0, 0.02, -0.03);
    this.weaponGroup.add(slide);

    // Barrel extension
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.06), accentMaterial);
    barrel.position.set(0, 0.02, -0.16);
    this.weaponGroup.add(barrel);

    // Muzzle
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8), gunMetal);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.025, -0.195);
    this.weaponGroup.add(muzzle);

    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.15), gunMetal);
    frame.position.set(0, -0.01, -0.01);
    this.weaponGroup.add(frame);

    // Trigger guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.04), gunMetal);
    guard.position.set(0, -0.025, -0.02);
    this.weaponGroup.add(guard);

    // Trigger
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.018, 0.006), accentMaterial);
    trigger.position.set(0, -0.02, -0.015);
    this.weaponGroup.add(trigger);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.08, 0.035), gripMaterial);
    grip.position.set(0, -0.06, 0.03);
    grip.rotation.x = 0.15;
    this.weaponGroup.add(grip);

    // Magazine base plate
    const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.01, 0.03), accentMaterial);
    magBase.position.set(0, -0.1, 0.03);
    this.weaponGroup.add(magBase);

    // Rear sight
    const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.008, 0.005), accentMaterial);
    rearSight.position.set(0, 0.045, 0.06);
    this.weaponGroup.add(rearSight);

    // Front sight
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.005), accentMaterial);
    frontSight.position.set(0, 0.045, -0.12);
    this.weaponGroup.add(frontSight);
  }

  private buildSSG08Model(): void {
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 });
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, metalness: 0.1, roughness: 0.7 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
    const scopeMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6, roughness: 0.4 });

    // Long barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 8), gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.18);
    this.weaponGroup.add(barrel);

    // Receiver / action body
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.18), gunMetal);
    receiver.position.set(0, 0.02, 0.03);
    this.weaponGroup.add(receiver);

    // Bolt handle (right side of receiver)
    const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.04, 6), accentMaterial);
    boltHandle.rotation.z = Math.PI / 2;
    boltHandle.position.set(0.03, 0.02, 0.06);
    this.weaponGroup.add(boltHandle);

    // Bolt knob
    const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), accentMaterial);
    boltKnob.position.set(0.05, 0.02, 0.06);
    this.weaponGroup.add(boltKnob);

    // Scope mount rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.14), accentMaterial);
    rail.position.set(0, 0.045, 0.0);
    this.weaponGroup.add(rail);

    // Scope tube
    const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), scopeMaterial);
    scopeBody.rotation.x = Math.PI / 2;
    scopeBody.position.set(0, 0.07, -0.02);
    this.weaponGroup.add(scopeBody);

    // Scope front lens ring
    const scopeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 8), accentMaterial);
    scopeFront.rotation.x = Math.PI / 2;
    scopeFront.position.set(0, 0.07, -0.10);
    this.weaponGroup.add(scopeFront);

    // Scope rear lens ring
    const scopeRear = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.01, 8), accentMaterial);
    scopeRear.rotation.x = Math.PI / 2;
    scopeRear.position.set(0, 0.07, 0.06);
    this.weaponGroup.add(scopeRear);

    // Wooden stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.06, 0.16), woodMaterial);
    stock.position.set(0, -0.01, 0.18);
    stock.rotation.x = 0.05;
    this.weaponGroup.add(stock);

    // Stock butt plate
    const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.07, 0.01), accentMaterial);
    buttPlate.position.set(0, -0.01, 0.26);
    this.weaponGroup.add(buttPlate);

    // Trigger guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.04), gunMetal);
    guard.position.set(0, -0.02, 0.04);
    this.weaponGroup.add(guard);

    // Trigger
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.015, 0.005), accentMaterial);
    trigger.position.set(0, -0.015, 0.04);
    this.weaponGroup.add(trigger);

    // Magazine
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.03), gunMetal);
    magazine.position.set(0, -0.05, 0.02);
    magazine.rotation.x = 0.1;
    this.weaponGroup.add(magazine);

    // Muzzle brake
    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.03, 8), accentMaterial);
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.02, -0.42);
    this.weaponGroup.add(muzzleBrake);
  }

  private buildMP9Model(): void {
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.3 });
    const polymerMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.1, roughness: 0.9 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });

    // Upper receiver / barrel shroud
    const upperReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.18), gunMetal);
    upperReceiver.position.set(0, 0.02, -0.04);
    this.weaponGroup.add(upperReceiver);

    // Barrel (short SMG barrel)
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.17);
    this.weaponGroup.add(barrel);

    // Lower receiver / grip housing
    const lowerReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.03, 0.10), polymerMaterial);
    lowerReceiver.position.set(0, -0.005, 0.0);
    this.weaponGroup.add(lowerReceiver);

    // Pistol grip (angled)
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.03), polymerMaterial);
    grip.position.set(0, -0.05, 0.03);
    grip.rotation.x = 0.2;
    this.weaponGroup.add(grip);

    // Magazine (long stick mag, slightly angled forward)
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.10, 0.025), gunMetal);
    magazine.position.set(0, -0.07, -0.02);
    magazine.rotation.x = -0.1;
    this.weaponGroup.add(magazine);

    // Charging handle (top)
    const chargingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.02), accentMaterial);
    chargingHandle.position.set(0, 0.042, 0.0);
    this.weaponGroup.add(chargingHandle);

    // Folding stock (compact, folded to right side)
    const stockArm = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.12), accentMaterial);
    stockArm.position.set(0.025, 0.01, 0.10);
    this.weaponGroup.add(stockArm);

    // Stock end plate
    const stockEnd = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.035, 0.02), accentMaterial);
    stockEnd.position.set(0.025, 0.005, 0.16);
    this.weaponGroup.add(stockEnd);

    // Front sight post
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.01, 0.005), accentMaterial);
    frontSight.position.set(0, 0.042, -0.12);
    this.weaponGroup.add(frontSight);

    // Trigger guard
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.035), polymerMaterial);
    guard.position.set(0, -0.02, 0.01);
    this.weaponGroup.add(guard);

    // Trigger
    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.015, 0.005), accentMaterial);
    trigger.position.set(0, -0.015, 0.01);
    this.weaponGroup.add(trigger);

    // Muzzle
    const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.015, 8), gunMetal);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.02, -0.215);
    this.weaponGroup.add(muzzle);
  }

  /**
   * Attempt to fire. Returns true if a shot was fired.
   * Enforces semi-auto (for non-automatic) and fire rate.
   */
  tryFire(mouseDown: boolean, now: number): boolean {
    const config = WEAPONS[this.weaponId];

    if (config.automatic) {
      // Automatic: fire while held, rate-limited
      if (!mouseDown) {
        this.mouseWasDown = false;
        return false;
      }
      this.mouseWasDown = true;
    } else {
      // Semi-auto: only fire on fresh click
      const freshClick = mouseDown && !this.mouseWasDown;
      this.mouseWasDown = mouseDown;
      if (!freshClick) return false;
    }

    // Fire rate limiting
    if (now - this.lastFireTime < config.fireRate) return false;

    this.lastFireTime = now;
    const params = WEAPON_PARAMS[this.weaponId];
    this.recoilTimer = params.recoilDuration;
    return true;
  }

  /** Called every frame to animate recoil recovery */
  update(dt: number): void {
    const params = WEAPON_PARAMS[this.weaponId];

    if (this.recoilTimer > 0) {
      this.recoilTimer = Math.max(0, this.recoilTimer - dt);
      const t = this.recoilTimer / params.recoilDuration;
      const kick = Math.sin(t * Math.PI);

      this.weaponGroup.position.set(
        params.restPosition.x,
        params.restPosition.y + params.recoilKickUp * kick,
        params.restPosition.z + params.recoilKickBack * kick,
      );
      this.weaponGroup.rotation.set(
        -params.recoilRotation * kick,
        this.restRotation.y,
        this.restRotation.z,
      );
    } else {
      this.weaponGroup.position.copy(params.restPosition);
      this.weaponGroup.rotation.copy(this.restRotation);
    }
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.clearWeaponGroup();
  }
}
