import {
  GameState,
  PlayerInput,
  TankState,
  TANK_SHOOT_COOLDOWN,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  TANK_WIDTH,
  TANK_HEIGHT,
  ARENA_WIDTH,
  ARENA_HEIGHT,
} from '@teeny-tanks/shared';
import { createProjectile } from '../entities/Projectile.js';
import { respawnTank } from '../entities/Tank.js';

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
      const spawnX = tank.x + Math.cos(tank.rotation) * (TANK_WIDTH / 2 + 5);
      const spawnY = tank.y + Math.sin(tank.rotation) * (TANK_HEIGHT / 2 + 5);
      const proj = createProjectile(playerId, spawnX, spawnY, tank.rotation, now);
      state.projectiles.push(proj);
      tank.lastShotTime = now;
    }
  }

  // Move projectiles using velocity components and bounce off arena walls
  for (const proj of state.projectiles) {
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
          }, 2000);
        }
        break;
      }
    }
  }

  // Remove destroyed/expired projectiles
  state.projectiles = state.projectiles.filter((p) => !toRemove.has(p.id));

  return events;
}
