import { TankState, Team, SPAWN_POSITIONS } from '@teeny-tanks/shared';

export function createTank(id: string, team: Team): TankState {
  const spawn = SPAWN_POSITIONS[team];
  return {
    id,
    team,
    x: spawn.x,
    y: spawn.y,
    rotation: team === 'red' ? 0 : Math.PI,
    health: 3,
    alive: true,
    hasFlag: false,
    lastShotTime: 0,
  };
}

export function respawnTank(tank: TankState): void {
  const spawn = SPAWN_POSITIONS[tank.team];
  tank.x = spawn.x;
  tank.y = spawn.y;
  tank.rotation = tank.team === 'red' ? 0 : Math.PI;
  tank.health = 3;
  tank.alive = true;
  tank.hasFlag = false;
}
