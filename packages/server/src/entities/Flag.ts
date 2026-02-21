import { FlagState, Team, FLAG_POSITIONS } from '@teeny-tanks/shared';

export function createFlag(team: Team): FlagState {
  const pos = FLAG_POSITIONS[team];
  return {
    team,
    x: pos.x,
    y: pos.y,
    carrierId: null,
    atBase: true,
  };
}

export function resetFlag(flag: FlagState): void {
  const pos = FLAG_POSITIONS[flag.team];
  flag.x = pos.x;
  flag.y = pos.y;
  flag.carrierId = null;
  flag.atBase = true;
}
