import * as THREE from 'three';
import { EYE_HEIGHT } from '@browserstrike/shared';

/**
 * Spectator mode: when the local player dies in 2v2,
 * smoothly follows a living teammate's camera.
 */
export class SpectatorSystem {
  private active = false;
  private targetSessionId: string | null = null;
  private targetNickname = '';

  /** Smoothing factor for camera interpolation (0-1, higher = snappier). */
  private static readonly LERP_SPEED = 8;

  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  /** Whether spectator mode is currently active. */
  isActive(): boolean {
    return this.active;
  }

  /** Get the nickname of the player being spectated. */
  getTargetNickname(): string {
    return this.targetNickname;
  }

  /**
   * Activate spectator mode following a teammate.
   * @param sessionId Session ID of the teammate to follow
   * @param nickname Nickname to display in UI
   */
  activate(sessionId: string, nickname: string): void {
    this.active = true;
    this.targetSessionId = sessionId;
    this.targetNickname = nickname;
  }

  /** Deactivate spectator mode (e.g. on respawn / round reset). */
  deactivate(): void {
    this.active = false;
    this.targetSessionId = null;
    this.targetNickname = '';
  }

  /** Get the session ID currently being spectated. */
  getTargetSessionId(): string | null {
    return this.targetSessionId;
  }

  /**
   * Update camera to follow the spectated player.
   * Uses interpolated position from RemotePlayerManager data.
   *
   * @param targetX Target player X position
   * @param targetY Target player Y position (feet)
   * @param targetZ Target player Z position
   * @param targetYaw Target player yaw
   * @param targetPitch Target player pitch
   * @param dt Delta time in seconds
   */
  updateCamera(
    targetX: number,
    targetY: number,
    targetZ: number,
    targetYaw: number,
    targetPitch: number,
    dt: number,
  ): void {
    if (!this.active) return;

    const t = Math.min(1, SpectatorSystem.LERP_SPEED * dt);

    // Lerp camera position to target eye position
    const eyeY = targetY + EYE_HEIGHT;
    this.camera.position.x += (targetX - this.camera.position.x) * t;
    this.camera.position.y += (eyeY - this.camera.position.y) * t;
    this.camera.position.z += (targetZ - this.camera.position.z) * t;

    // Smoothly rotate to target's view direction
    this.euler.set(targetPitch, targetYaw, 0);
    const targetQuat = new THREE.Quaternion().setFromEuler(this.euler);
    this.camera.quaternion.slerp(targetQuat, t);
  }
}
