import * as THREE from 'three';
import { EYE_HEIGHT, applyMovementStepped, type PhysicsState } from '@browserstrike/shared';
import { InputManager } from './InputManager';
import { PointerLock } from './PointerLock';
import type { CollisionWorld } from './CollisionWorld';

const DEG2RAD = Math.PI / 180;
const MAX_PITCH = 89 * DEG2RAD;
const BASE_SENSITIVITY = 0.002;
const LS_KEY = 'browserstrike_sensitivity';
const DEFAULT_FOV = 75;
const SCOPE_SENS_MULTIPLIER = 0.4;
const SCOPE_ZOOM_SPEED = 12; // lerp speed for FOV transition

/**
 * First-person shooter controller:
 * - Mouse look (yaw / pitch) via Pointer Lock
 * - WASD movement with shared physics (gravity, jump)
 * - AABB collision resolution via CollisionWorld
 */
export class FPSController {
  readonly input: InputManager;
  readonly pointerLock: PointerLock;

  yaw = 0;
  pitch = 0;
  private sensitivity = 1.0;

  private _scoped = false;
  private scopeFov = DEFAULT_FOV;
  private targetFov = DEFAULT_FOV;
  private currentFov = DEFAULT_FOV;

  /** World position of the player's feet */
  readonly position = new THREE.Vector3(0, 0, 5);

  private physics: PhysicsState = {
    x: 0, y: 0, z: 5,
    velocityY: 0,
    isGrounded: true,
  };

  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private collisionWorld: CollisionWorld | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ) {
    this.input = new InputManager();
    this.pointerLock = new PointerLock(canvas);
    this.camera.position.set(this.position.x, this.position.y + EYE_HEIGHT, this.position.z);
    this.loadSensitivity();
  }

  getSensitivity(): number {
    return this.sensitivity;
  }

  setSensitivity(value: number): void {
    this.sensitivity = Math.max(0.1, Math.min(5.0, value));
    try { localStorage.setItem(LS_KEY, String(this.sensitivity)); } catch { /* ignore */ }
  }

  private loadSensitivity(): void {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) this.sensitivity = Math.max(0.1, Math.min(5.0, parseFloat(saved)));
    } catch { /* ignore */ }
  }

  setCollisionWorld(world: CollisionWorld): void {
    this.collisionWorld = world;
  }

  setScoped(scoped: boolean, fov?: number): void {
    this._scoped = scoped;
    if (scoped && fov !== undefined) {
      this.scopeFov = fov;
      this.targetFov = fov;
    } else {
      this.targetFov = DEFAULT_FOV;
    }
  }

  isScoped(): boolean {
    return this._scoped;
  }

  update(dt: number): void {
    this.updateRotation();
    this.updateMovement(dt);
    this.updateFov(dt);
    this.syncCamera();
  }

  private updateRotation(): void {
    if (!this.pointerLock.locked) return;

    const { dx, dy } = this.input.consumeMouseDelta();
    let sens = this.sensitivity * BASE_SENSITIVITY;
    if (this._scoped) sens *= SCOPE_SENS_MULTIPLIER;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    this.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, this.pitch));
  }

  private updateMovement(dt: number): void {
    if (!this.pointerLock.locked) return;

    const { keys } = this.input;

    let forward = 0;
    let right = 0;
    if (keys.w) forward += 1;
    if (keys.s) forward -= 1;
    if (keys.d) right += 1;
    if (keys.a) right -= 1;

    // Sync physics state from position
    this.physics.x = this.position.x;
    this.physics.y = this.position.y;
    this.physics.z = this.position.z;

    // Apply shared movement physics (gravity, jump, horizontal move)
    // Sub-stepped to prevent tunneling through walls at low framerates
    this.physics = applyMovementStepped(
      this.physics,
      { forward, right, jump: keys.space, yaw: this.yaw },
      dt,
      this.collisionWorld ? (s) => this.collisionWorld!.resolve(s) : undefined,
    );

    this.position.set(this.physics.x, this.physics.y, this.physics.z);
  }

  private updateFov(dt: number): void {
    if (Math.abs(this.currentFov - this.targetFov) > 0.1) {
      const t = 1 - Math.exp(-SCOPE_ZOOM_SPEED * dt);
      this.currentFov += (this.targetFov - this.currentFov) * t;
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    } else if (this.currentFov !== this.targetFov) {
      this.currentFov = this.targetFov;
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }

  private syncCamera(): void {
    this.camera.position.set(
      this.position.x,
      this.position.y + EYE_HEIGHT,
      this.position.z,
    );
    this.euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this.euler);
  }

  /** Get the current physics state (for prediction buffer). */
  getPhysicsState(): PhysicsState {
    return { ...this.physics };
  }

  /** Override physics state (for server reconciliation). */
  setPhysicsState(state: PhysicsState): void {
    this.physics = { ...state };
    this.position.set(state.x, state.y, state.z);
  }

  /** Apply a position offset (for smooth correction). */
  applyPositionDelta(dx: number, dy: number, dz: number): void {
    this.physics.x += dx;
    this.physics.y += dy;
    this.physics.z += dz;
    this.position.set(this.physics.x, this.physics.y, this.physics.z);
  }

  dispose(): void {
    this.input.dispose();
    this.pointerLock.dispose();
  }
}
