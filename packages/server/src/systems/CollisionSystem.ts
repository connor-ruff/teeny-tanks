import {
  GameState,
  PlayerInput,
  TANK_COLLISION_RADIUS,
  TANK_PUSH_FACTOR,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TANK_WIDTH,
  TANK_HEIGHT,
} from '@teeny-tanks/shared';

/**
 * Resolves tank-to-tank collisions so tanks cannot pass through each other.
 *
 * Uses circular collision detection (TANK_COLLISION_RADIUS). When two tanks
 * overlap, they are pushed apart along the line connecting their centers.
 *
 * The separation is asymmetric based on which tank is "actively moving"
 * (has input this tick) vs stationary:
 *  - A moving tank pushing into a stationary one: the moving tank is slowed
 *    (absorbs more of the push-back), and the stationary tank is dragged at
 *    TANK_PUSH_FACTOR of the overlap.
 *  - Two tanks moving head-on: overlap is split evenly (both slow down).
 *  - Two stationary tanks overlapping: split evenly to resolve.
 *
 * Run AFTER PhysicsSystem each tick.
 */
export function resolveCollisions(
  state: GameState,
  inputs: Map<string, PlayerInput>,
): void {
  const tanks = Object.values(state.tanks).filter(t => t.alive);
  const minDist = TANK_COLLISION_RADIUS * 2;
  const minDistSq = minDist * minDist;

  for (let i = 0; i < tanks.length; i++) {
    for (let j = i + 1; j < tanks.length; j++) {
      const a = tanks[i];
      const b = tanks[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;

      if (distSq >= minDistSq || distSq === 0) continue;

      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;

      // Unit normal from a -> b
      const nx = dx / dist;
      const ny = dy / dist;

      // Determine which tanks are actively moving (have movement input)
      const inputA = inputs.get(a.id);
      const inputB = inputs.get(b.id);
      const movingA = inputA ? (inputA.up || inputA.down) : false;
      const movingB = inputB ? (inputB.up || inputB.down) : false;

      // How much of the overlap each tank absorbs (fraction pushed away).
      // "shareA" is how much tank A is pushed backward (in -normal direction).
      let shareA: number;
      let shareB: number;

      if (movingA && movingB) {
        // Head-on: split evenly — neither advances
        shareA = 0.5;
        shareB = 0.5;
      } else if (movingA && !movingB) {
        // A is the pusher, B is dragged.
        // A absorbs most of the push-back; B gets nudged by PUSH_FACTOR.
        shareA = 1 - TANK_PUSH_FACTOR;
        shareB = TANK_PUSH_FACTOR;
      } else if (!movingA && movingB) {
        // B is the pusher, A is dragged.
        shareA = TANK_PUSH_FACTOR;
        shareB = 1 - TANK_PUSH_FACTOR;
      } else {
        // Both stationary (spawned overlapping, etc.) — split evenly
        shareA = 0.5;
        shareB = 0.5;
      }

      // Push tanks apart along the normal
      a.x -= nx * overlap * shareA;
      a.y -= ny * overlap * shareA;
      b.x += nx * overlap * shareB;
      b.y += ny * overlap * shareB;

      // Re-clamp to arena bounds after push
      const halfW = TANK_WIDTH / 2;
      const halfH = TANK_HEIGHT / 2;
      a.x = Math.max(halfW, Math.min(ARENA_WIDTH - halfW, a.x));
      a.y = Math.max(halfH, Math.min(ARENA_HEIGHT - halfH, a.y));
      b.x = Math.max(halfW, Math.min(ARENA_WIDTH - halfW, b.x));
      b.y = Math.max(halfH, Math.min(ARENA_HEIGHT - halfH, b.y));
    }
  }
}
