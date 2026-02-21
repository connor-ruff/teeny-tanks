import {
  GameState,
  PlayerInput,
  TANK_SPEED,
  TANK_ROTATION_SPEED,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TANK_WIDTH,
  TANK_HEIGHT,
} from '@teeny-tanks/shared';

export function updatePhysics(
  state: GameState,
  inputs: Map<string, PlayerInput>,
  dt: number,
): void {
  for (const [playerId, input] of inputs) {
    const tank = state.tanks[playerId];
    if (!tank || !tank.alive) continue;

    // Rotation
    if (input.left) {
      tank.rotation -= TANK_ROTATION_SPEED * dt;
    }
    if (input.right) {
      tank.rotation += TANK_ROTATION_SPEED * dt;
    }

    // Movement (forward/backward along facing direction)
    let dx = 0;
    let dy = 0;
    if (input.up) {
      dx += Math.cos(tank.rotation) * TANK_SPEED * dt;
      dy += Math.sin(tank.rotation) * TANK_SPEED * dt;
    }
    if (input.down) {
      dx -= Math.cos(tank.rotation) * TANK_SPEED * dt * 0.5; // slower reverse
      dy -= Math.sin(tank.rotation) * TANK_SPEED * dt * 0.5;
    }

    tank.x += dx;
    tank.y += dy;

    // Clamp to arena bounds
    const halfW = TANK_WIDTH / 2;
    const halfH = TANK_HEIGHT / 2;
    tank.x = Math.max(halfW, Math.min(ARENA_WIDTH - halfW, tank.x));
    tank.y = Math.max(halfH, Math.min(ARENA_HEIGHT - halfH, tank.y));
  }
}
