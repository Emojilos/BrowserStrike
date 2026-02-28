import * as THREE from 'three';
import { PLAYER_HEIGHT, PLAYER_RADIUS, EYE_HEIGHT } from '@browserstrike/shared';

interface RemotePlayer {
  group: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  /** Last known team for colour updates */
  team: string;
}

const TEAM_COLORS: Record<string, number> = {
  A: 0x4488ff, // blue
  B: 0xff4444, // red
  unassigned: 0x888888, // grey
};

/**
 * Manages Three.js representations of remote (non-local) players.
 * Spawns/despawns capsule meshes and updates their transforms from
 * Colyseus PlayerSchema data.
 */
export class RemotePlayerManager {
  private players = new Map<string, RemotePlayer>();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly localSessionId: string,
  ) {}

  /** Add a remote player capsule to the scene. */
  addPlayer(sessionId: string, team: string): void {
    if (sessionId === this.localSessionId) return;
    if (this.players.has(sessionId)) return;

    const color = TEAM_COLORS[team] ?? TEAM_COLORS.unassigned;
    const mat = new THREE.MeshLambertMaterial({ color });

    // Body — cylinder (capsule approximation)
    const bodyHeight = PLAYER_HEIGHT - PLAYER_RADIUS * 2;
    const bodyGeo = new THREE.CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, bodyHeight, 8);
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = PLAYER_RADIUS + bodyHeight / 2;
    body.castShadow = true;

    // Head — sphere
    const headGeo = new THREE.SphereGeometry(PLAYER_RADIUS, 8, 6);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = EYE_HEIGHT;
    head.castShadow = true;

    const group = new THREE.Group();
    group.add(body);
    group.add(head);
    this.scene.add(group);

    this.players.set(sessionId, { group, body, head, team });
  }

  /** Remove a remote player from the scene. */
  removePlayer(sessionId: string): void {
    const rp = this.players.get(sessionId);
    if (!rp) return;

    this.scene.remove(rp.group);
    rp.body.geometry.dispose();
    rp.head.geometry.dispose();
    (rp.body.material as THREE.Material).dispose();
    // head shares the same material reference? No — each has its own.
    (rp.head.material as THREE.Material).dispose();

    this.players.delete(sessionId);
  }

  /** Update position and rotation for a remote player. */
  updatePlayer(
    sessionId: string,
    x: number,
    y: number,
    z: number,
    yaw: number,
    team: string,
  ): void {
    if (sessionId === this.localSessionId) return;

    const rp = this.players.get(sessionId);
    if (!rp) return;

    rp.group.position.set(x, y, z);
    rp.group.rotation.y = yaw;

    // Update colour if team changed
    if (rp.team !== team) {
      rp.team = team;
      const color = TEAM_COLORS[team] ?? TEAM_COLORS.unassigned;
      (rp.body.material as THREE.MeshLambertMaterial).color.setHex(color);
      (rp.head.material as THREE.MeshLambertMaterial).color.setHex(color);
    }
  }

  /** Dispose all remote player meshes. */
  dispose(): void {
    for (const [id] of this.players) {
      this.removePlayer(id);
    }
  }
}
