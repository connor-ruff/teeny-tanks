import { ProjectileState, PROJECTILE_SPEED } from '@teeny-tanks/shared';

let nextProjectileId = 0;

export function createProjectile(
  ownerId: string,
  x: number,
  y: number,
  rotation: number,
  now: number,
): ProjectileState {
  return {
    id: `proj_${nextProjectileId++}`,
    ownerId,
    x,
    y,
    rotation,
    speed: PROJECTILE_SPEED,
    createdAt: now,
  };
}
