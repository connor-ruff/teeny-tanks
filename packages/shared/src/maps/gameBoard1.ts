import type { MapDefinition } from './types.js';


export const GAME_BOARD_1: MapDefinition = {
  name: 'Game Board 1',
  width: 500,
  height: 850,

  // Each wall is an axis-aligned rectangle defined by its top-left corner and size:
  //   x      — pixels from the LEFT edge of the arena to the left edge of the wall
  //   y      — pixels from the TOP edge of the arena to the top edge of the wall
  //   width  — how wide the wall is (horizontally), in pixels
  //   height — how tall the wall is (vertically), in pixels
  //
  // Example: { x: 125, y: 180, width: 250, height: 10 } on a 500x700 arena means:
  //
  //   x=0                                               x=500
  //     ┌───────────────────────────────────────────────┐
  //     │    125px    │←────── 250px ──────→│   125px   │  ← y=180
  //     │             [■■■■■■■■■■■■■■■■■■■■■]           │
  //     │                                               │  ← y=190 (180+10)

  walls: [
    { x: 125, y: 150, width: 250, height: 10 }, // Red barrier (in front of red flag)
    { x: 125, y: 690, width: 250, height: 10 }, // Blue barrier (in front of blue flag)
    { x: 0, y: 300, width: 200, height: 250 },   // Left barrier (in middle of arena)
    { x: 300, y: 300, width: 200, height: 250 },   // Right barrier (in middle of arena)
  ],

  // Respawn positions — two corners per team (left, right) on their side of the map.
  // Placed ~1/6 from each side edge, behind (further from center than) the flag.
  // Red team is at the top (low Y), blue team at the bottom (high Y).
  //
  //   Map width = 500  →  1/6 ≈ 83px from each side edge
  //   Red Y = 40 (above the flag at y=80, safely in their back zone)
  //   Blue Y = 810 (below the flag at y=770, safely in their back zone)
  redRespawnPositions: [
    { x: 83, y: 40 },   // top-left corner
    { x: 417, y: 40 },  // top-right corner
  ],
  blueRespawnPositions: [
    { x: 83, y: 810 },  // bottom-left corner
    { x: 417, y: 810 }, // bottom-right corner
  ],
};
