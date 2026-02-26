import { TankState, Team, SPAWN_POSITIONS, RESPAWN_POSITIONS } from '@teeny-tanks/shared';

/**
 * Pick a spawn slot for the given team. Uses slotIndex modulo the number of
 * available slots so it never goes out of bounds.
 */
function getSpawn(team: Team, slotIndex: number) {
  const slots = SPAWN_POSITIONS[team];
  return slots[slotIndex % slots.length];
}

/**
 * Pick a random respawn corner for the given team.
 * Each team has two corner positions (left and right of their side).
 */
function getRandomRespawn(team: Team) {
  const positions = RESPAWN_POSITIONS[team];
  return positions[Math.floor(Math.random() * positions.length)];
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

/**
 * Respawn a destroyed tank at a random corner on their team's side.
 * Used after death cooldown — picks randomly from the team's two respawn corners
 * so enemies can't predict the exact reentry point.
 */
export function respawnTank(tank: TankState): void {
  const spawn = getRandomRespawn(tank.team);
  tank.x = spawn.x;
  tank.y = spawn.y;
  tank.rotation = tank.team === 'red' ? Math.PI / 2 : -Math.PI / 2;
  tank.health = 1;
  tank.alive = true;
  tank.hasFlag = false;
}

/**
 * Reset a tank to its original spawn slot position. Used during full map resets
 * (e.g., after a flag capture) where tanks should return to formation, not random corners.
 */
export function resetTankToSpawn(tank: TankState, slotIndex: number): void {
  const spawn = getSpawn(tank.team, slotIndex);
  tank.x = spawn.x;
  tank.y = spawn.y;
  tank.rotation = tank.team === 'red' ? Math.PI / 2 : -Math.PI / 2;
  tank.health = 1;
  tank.alive = true;
  tank.hasFlag = false;
}
