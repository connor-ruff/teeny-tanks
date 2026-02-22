import { TankState, Team, SPAWN_POSITIONS } from '@teeny-tanks/shared';

/**
 * Pick a spawn slot for the given team. Uses slotIndex modulo the number of
 * available slots so it never goes out of bounds.
 */
function getSpawn(team: Team, slotIndex: number) {
  const slots = SPAWN_POSITIONS[team];
  return slots[slotIndex % slots.length];
}

export function createTank(id: string, team: Team, slotIndex: number = 0, displayName: string = ''): TankState {
  const spawn = getSpawn(team, slotIndex);
  return {
    id,
    team,
    displayName,
    x: spawn.x,
    y: spawn.y,
    // Red faces south (down), blue faces north (up) — vertical map layout
    rotation: team === 'red' ? Math.PI / 2 : -Math.PI / 2,
    health: 1,
    alive: true,
    hasFlag: false,
    lastShotTime: 0,
  };
}

export function respawnTank(tank: TankState, slotIndex: number = 0): void {
  const spawn = getSpawn(tank.team, slotIndex);
  tank.x = spawn.x;
  tank.y = spawn.y;
  tank.rotation = tank.team === 'red' ? Math.PI / 2 : -Math.PI / 2;
  tank.health = 1;
  tank.alive = true;
  tank.hasFlag = false;
}
