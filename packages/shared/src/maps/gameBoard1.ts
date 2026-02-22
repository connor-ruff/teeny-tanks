import type { MapDefinition } from './types.js';

// Game Board 1 — 500×700 arena
// Red base at north (y=80), Blue base at south (y=620)
//
// One horizontal barrier in front of each flag.
// 340px wide, centered — leaves 80px gaps on each side for tanks to go around.
//
// Spawn clearance:
//   Red lowest spawn: y=160 → barrier top at y=180 (clears tank AABB by 7px)
//   Blue highest spawn: y=540 → barrier bottom at y=520 (clears tank AABB by 7px)
export const GAME_BOARD_1: MapDefinition = {
  name: 'Game Board 1',
  width: 500,
  height: 700,
  walls: [
    { x: 80, y: 180, width: 340, height: 18 }, // Red barrier (in front of red flag)
    { x: 80, y: 502, width: 340, height: 18 }, // Blue barrier (in front of blue flag)
  ],
};
