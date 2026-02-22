import {
  GameState,
  PlayerInput,
  TankState,
  TANK_SPEED,
  TANK_REVERSE_MULTIPLIER,
  TANK_ROTATION_SPEED,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  TANK_WIDTH,
  TANK_HEIGHT,
  WallRect,
  ACTIVE_MAP,
} from '@teeny-tanks/shared';

function resolveWallCollision(tank: TankState, wall: WallRect): void {
  const halfW = TANK_WIDTH / 2;
  const halfH = TANK_HEIGHT / 2;

  const overlapX = Math.min(tank.x + halfW, wall.x + wall.width) - Math.max(tank.x - halfW, wall.x);
  const overlapY = Math.min(tank.y + halfH, wall.y + wall.height) - Math.max(tank.y - halfH, wall.y);

  if (overlapX <= 0 || overlapY <= 0) return;

  const wallCenterX = wall.x + wall.width / 2;
  const wallCenterY = wall.y + wall.height / 2;

  if (overlapX < overlapY) {
    tank.x += tank.x < wallCenterX ? -overlapX : overlapX;
  } else {
    tank.y += tank.y < wallCenterY ? -overlapY : overlapY;
  }
}

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
      dx -= Math.cos(tank.rotation) * TANK_SPEED * dt * TANK_REVERSE_MULTIPLIER;
      dy -= Math.sin(tank.rotation) * TANK_SPEED * dt * TANK_REVERSE_MULTIPLIER;
    }

    tank.x += dx;
    tank.y += dy;

    // Push out of interior walls
    for (const wall of ACTIVE_MAP.walls) {
      resolveWallCollision(tank, wall);
    }

    // Clamp to arena bounds
    const halfW = TANK_WIDTH / 2;
    const halfH = TANK_HEIGHT / 2;
    tank.x = Math.max(halfW, Math.min(ARENA_WIDTH - halfW, tank.x));
    tank.y = Math.max(halfH, Math.min(ARENA_HEIGHT - halfH, tank.y));
  }
}
