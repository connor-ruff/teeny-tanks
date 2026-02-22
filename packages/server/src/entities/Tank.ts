import { TankState, Team, SPAWN_POSITIONS } from '@teeny-tanks/shared';

export function createTank(id: string, team: Team): TankState {
  const spawn = SPAWN_POSITIONS[team];
  return {
    id,
    team,
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

export function respawnTank(tank: TankState): void {
  const spawn = SPAWN_POSITIONS[tank.team];
  tank.x = spawn.x;
  tank.y = spawn.y;
  tank.rotation = tank.team === 'red' ? Math.PI / 2 : -Math.PI / 2;
  tank.health = 1;
  tank.alive = true;
  tank.hasFlag = false;
}
