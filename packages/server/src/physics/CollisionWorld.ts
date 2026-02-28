import {
  PLAYER_RADIUS, PLAYER_HEIGHT,
  type AABB, type PhysicsState,
  createAABB, aabbOverlap, resolveAABB,
} from '@browserstrike/shared';

/**
 * Server-side collision world. Holds static AABB volumes and resolves
 * player movement against them each tick.
 */
export class CollisionWorld {
  private readonly boxes: AABB[] = [];

  addBox(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number): void {
    this.boxes.push(createAABB(cx, cy, cz, hx, hy, hz));
  }

  private playerAABB(x: number, y: number, z: number): AABB {
    return createAABB(
      x, y + PLAYER_HEIGHT / 2, z,
      PLAYER_RADIUS, PLAYER_HEIGHT / 2, PLAYER_RADIUS,
    );
  }

  resolve(state: PhysicsState): PhysicsState {
    for (let iter = 0; iter < 4; iter++) {
      const pBox = this.playerAABB(state.x, state.y, state.z);
      let resolved = false;

      for (const box of this.boxes) {
        if (!aabbOverlap(pBox, box)) continue;

        const correction = resolveAABB(pBox, box);
        if (!correction) continue;

        state.x += correction.dx;
        state.y += correction.dy;
        state.z += correction.dz;

        if (correction.dy > 0) {
          state.velocityY = 0;
          state.isGrounded = true;
        }
        if (correction.dy < 0 && state.velocityY > 0) {
          state.velocityY = 0;
        }

        resolved = true;
        break;
      }

      if (!resolved) break;
    }

    return state;
  }
}
