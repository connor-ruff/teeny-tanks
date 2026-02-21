import {
  GameState,
  PlayerInput,
  TankState,
  TANK_SHOOT_COOLDOWN,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  TANK_WIDTH,
  TANK_HEIGHT,
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
      // Spawn projectile at the front of the tank
      const spawnX = tank.x + Math.cos(tank.rotation) * (TANK_WIDTH / 2 + 5);
      const spawnY = tank.y + Math.sin(tank.rotation) * (TANK_HEIGHT / 2 + 5);
      const proj = createProjectile(playerId, spawnX, spawnY, tank.rotation, now);
      state.projectiles.push(proj);
      tank.lastShotTime = now;
    }
  }

  // Move projectiles
  for (const proj of state.projectiles) {
    proj.x += Math.cos(proj.rotation) * proj.speed * dt;
    proj.y += Math.sin(proj.rotation) * proj.speed * dt;
  }

  // Check collisions with tanks
  const toRemove = new Set<string>();

  for (const proj of state.projectiles) {
    // Remove if out of bounds
    if (proj.x < 0 || proj.x > 1200 || proj.y < 0 || proj.y > 800) {
      toRemove.add(proj.id);
      continue;
    }

    // Remove if expired
    if (now - proj.createdAt > PROJECTILE_LIFETIME) {
      toRemove.add(proj.id);
      continue;
    }

    // Check collision with tanks (simple AABB)
    for (const tank of Object.values(state.tanks)) {
      if (tank.id === proj.ownerId || !tank.alive) continue;

      const dx = Math.abs(proj.x - tank.x);
      const dy = Math.abs(proj.y - tank.y);

      if (dx < TANK_WIDTH / 2 + PROJECTILE_RADIUS && dy < TANK_HEIGHT / 2 + PROJECTILE_RADIUS) {
        toRemove.add(proj.id);
        tank.health -= 1;

        if (tank.health <= 0) {
          tank.alive = false;
          events.kills.push({ killerId: proj.ownerId, victimId: tank.id });

          // If carrying a flag, drop it
          if (tank.hasFlag) {
            tank.hasFlag = false;
            for (const flag of Object.values(state.flags)) {
              if (flag.carrierId === tank.id) {
                flag.carrierId = null;
                // Flag drops at tank's position
                flag.x = tank.x;
                flag.y = tank.y;
                flag.atBase = false;
              }
            }
          }

          // Respawn after a brief delay (instant for MVP)
          setTimeout(() => {
            respawnTank(tank);
          }, 2000);
        }
        break;
      }
    }
  }

  // Remove destroyed projectiles
  state.projectiles = state.projectiles.filter((p) => !toRemove.has(p.id));

  return events;
}
