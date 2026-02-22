import {
  GameState,
  PlayerInput,
  TankState,
  ProjectileState,
  TANK_SHOOT_COOLDOWN,
  TANK_RESPAWN_DELAY,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  PROJECTILE_SPAWN_OFFSET,
  TANK_WIDTH,
  TANK_HEIGHT,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  WallRect,
  ACTIVE_MAP,
} from '@teeny-tanks/shared';
import { createProjectile } from '../entities/Projectile.js';
import { respawnTank } from '../entities/Tank.js';

function bounceProjectileOffWall(
  proj: ProjectileState,
  wall: WallRect,
  x0: number,
  y0: number,
): void {
  const r = PROJECTILE_RADIUS;
  const dx = proj.x - x0;
  const dy = proj.y - y0;

  // Expand wall rect by projectile radius (Minkowski sum — treat proj as a point)
  const ex  = wall.x - r;
  const ey  = wall.y - r;
  const ex2 = wall.x + wall.width + r;
  const ey2 = wall.y + wall.height + r;

  // Slab method: find t-range where the segment [x0,y0]->[proj.x,proj.y] overlaps each slab
  let tMinX: number, tMaxX: number, tMinY: number, tMaxY: number;

  if (Math.abs(dx) < 1e-9) {
    // Moving vertically — check if start x is inside the x-slab
    if (x0 < ex || x0 > ex2) return;
    tMinX = -Infinity;
    tMaxX =  Infinity;
  } else {
    tMinX = (ex  - x0) / dx;
    tMaxX = (ex2 - x0) / dx;
    if (tMinX > tMaxX) { const tmp = tMinX; tMinX = tMaxX; tMaxX = tmp; }
  }

  if (Math.abs(dy) < 1e-9) {
    // Moving horizontally — check if start y is inside the y-slab
    if (y0 < ey || y0 > ey2) return;
    tMinY = -Infinity;
    tMaxY =  Infinity;
  } else {
    tMinY = (ey  - y0) / dy;
    tMaxY = (ey2 - y0) / dy;
    if (tMinY > tMaxY) { const tmp = tMinY; tMinY = tMaxY; tMaxY = tmp; }
  }

  const tEntry = Math.max(tMinX, tMinY);
  const tExit  = Math.min(tMaxX, tMaxY);

  // No intersection during this tick
  if (tEntry > tExit || tEntry > 1 || tExit < 0) return;

  // Place projectile at the entry point
  const tHit = Math.max(0, tEntry);
  proj.x = x0 + dx * tHit;
  proj.y = y0 + dy * tHit;

  // Reflect the axis that was last to enter the slab
  if (tMinX > tMinY) {
    proj.vx = -proj.vx;
  } else {
    proj.vy = -proj.vy;
  }

  proj.rotation = Math.atan2(proj.vy, proj.vx);
}

export interface ProjectileEvents {
  kills: Array<{ killerId: string; victimId: string }>;
}

export function updateProjectiles(
  state: GameState,
  inputs: Map<string, PlayerInput>,
  dt: number,
  now: number,
): ProjectileEvents {
  const events: ProjectileEvents = { kills: [] };

  // Spawn new projectiles from shooting players
  for (const [playerId, input] of inputs) {
    const tank = state.tanks[playerId];
    if (!tank || !tank.alive || !input.shoot) continue;

    if (now - tank.lastShotTime >= TANK_SHOOT_COOLDOWN) {
      // Spawn projectile at the front of the tank barrel
      const spawnX = tank.x + Math.cos(tank.rotation) * (TANK_WIDTH / 2 + PROJECTILE_SPAWN_OFFSET);
      const spawnY = tank.y + Math.sin(tank.rotation) * (TANK_HEIGHT / 2 + PROJECTILE_SPAWN_OFFSET);
      const proj = createProjectile(playerId, spawnX, spawnY, tank.rotation, now);
      state.projectiles.push(proj);
      tank.lastShotTime = now;
    }
  }

  // Move projectiles using velocity components and bounce off arena walls
  for (const proj of state.projectiles) {
    const x0 = proj.x;
    const y0 = proj.y;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    // Bounce off left/right walls
    if (proj.x - PROJECTILE_RADIUS <= 0) {
      proj.x = PROJECTILE_RADIUS;
      proj.vx = Math.abs(proj.vx);
      proj.rotation = Math.atan2(proj.vy, proj.vx);
    } else if (proj.x + PROJECTILE_RADIUS >= ARENA_WIDTH) {
      proj.x = ARENA_WIDTH - PROJECTILE_RADIUS;
      proj.vx = -Math.abs(proj.vx);
      proj.rotation = Math.atan2(proj.vy, proj.vx);
    }

    // Bounce off top/bottom walls
    if (proj.y - PROJECTILE_RADIUS <= 0) {
      proj.y = PROJECTILE_RADIUS;
      proj.vy = Math.abs(proj.vy);
      proj.rotation = Math.atan2(proj.vy, proj.vx);
    } else if (proj.y + PROJECTILE_RADIUS >= ARENA_HEIGHT) {
      proj.y = ARENA_HEIGHT - PROJECTILE_RADIUS;
      proj.vy = -Math.abs(proj.vy);
      proj.rotation = Math.atan2(proj.vy, proj.vx);
    }

    // Bounce off interior walls
    for (const wall of ACTIVE_MAP.walls) {
      bounceProjectileOffWall(proj, wall, x0, y0);
    }
  }

  // Check collisions with tanks and remove expired projectiles
  const toRemove = new Set<string>();

  for (const proj of state.projectiles) {
    // Remove if expired (bouncing bullets still expire after their lifetime)
    if (now - proj.createdAt > PROJECTILE_LIFETIME) {
      toRemove.add(proj.id);
      continue;
    }

    // Check collision with ALL tanks — friendly fire is enabled per spec
    for (const tank of Object.values(state.tanks)) {
      if (!tank.alive) continue;

      const dx = Math.abs(proj.x - tank.x);
      const dy = Math.abs(proj.y - tank.y);

      if (dx < TANK_WIDTH / 2 + PROJECTILE_RADIUS && dy < TANK_HEIGHT / 2 + PROJECTILE_RADIUS) {
        toRemove.add(proj.id);
        tank.health -= 1;

        if (tank.health <= 0) {
          tank.alive = false;
          events.kills.push({ killerId: proj.ownerId, victimId: tank.id });

          // If carrying a flag, drop it at current position
          if (tank.hasFlag) {
            tank.hasFlag = false;
            for (const flag of Object.values(state.flags)) {
              if (flag.carrierId === tank.id) {
                flag.carrierId = null;
                flag.x = tank.x;
                flag.y = tank.y;
                flag.atBase = false;
              }
            }
          }

          // Respawn after a brief cooldown
          setTimeout(() => {
            respawnTank(tank);
          }, TANK_RESPAWN_DELAY);
        }
        break;
      }
    }
  }

  // Remove destroyed/expired projectiles
  state.projectiles = state.projectiles.filter((p) => !toRemove.has(p.id));

  return events;
}
