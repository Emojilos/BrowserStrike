import { PLAYER_SPEED, GRAVITY, JUMP_VELOCITY } from '../constants/game.js';

export interface MovementInput {
  forward: number;   // -1, 0, or 1
  right: number;     // -1, 0, or 1
  jump: boolean;
  yaw: number;       // radians
}

export interface PhysicsState {
  x: number;
  y: number;
  z: number;
  velocityY: number;
  isGrounded: boolean;
}

/**
 * Pure function: applies one frame of movement physics.
 * Used on both client (prediction) and server (authoritative).
 * Returns a new PhysicsState — does NOT mutate the input.
 */
export function applyMovement(
  state: PhysicsState,
  input: MovementInput,
  dt: number,
): PhysicsState {
  let { x, y, z, velocityY, isGrounded } = state;

  // --- Horizontal movement ---
  let mx = 0;
  let mz = 0;
  if (input.forward !== 0) mz -= input.forward;
  if (input.right !== 0) mx += input.right;

  // Normalize diagonal
  const len = Math.sqrt(mx * mx + mz * mz);
  if (len > 0) {
    mx /= len;
    mz /= len;
  }

  // Rotate by yaw
  const sinYaw = Math.sin(input.yaw);
  const cosYaw = Math.cos(input.yaw);
  const worldX = mx * cosYaw + mz * sinYaw;
  const worldZ = -mx * sinYaw + mz * cosYaw;

  const speed = PLAYER_SPEED * dt;
  x += worldX * speed;
  z += worldZ * speed;

  // --- Vertical movement (gravity + jump) ---
  if (isGrounded && input.jump) {
    velocityY = JUMP_VELOCITY;
    isGrounded = false;
  }

  velocityY += GRAVITY * dt;
  y += velocityY * dt;

  // Floor clamp (y=0 is ground level for feet)
  if (y <= 0) {
    y = 0;
    velocityY = 0;
    isGrounded = true;
  }

  return { x, y, z, velocityY, isGrounded };
}

/**
 * Maximum sub-step duration (seconds).
 * At PLAYER_SPEED=6, each sub-step moves ≈0.1 units — well under
 * the thinnest wall (0.4 units), preventing tunneling.
 */
const MAX_SUB_STEP = 1 / 60;

/**
 * Applies movement in sub-steps with collision resolution after each step.
 * Prevents tunneling through walls at low framerates or high delta times.
 */
export function applyMovementStepped(
  state: PhysicsState,
  input: MovementInput,
  dt: number,
  resolve?: (state: PhysicsState) => PhysicsState,
): PhysicsState {
  let remaining = dt;
  let s = state;

  while (remaining > 1e-6) {
    const step = Math.min(remaining, MAX_SUB_STEP);
    s = applyMovement(s, input, step);
    if (resolve) s = resolve(s);
    remaining -= step;
  }

  return s;
}
