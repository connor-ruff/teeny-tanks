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
    { x: 125, y: 180, width: 250, height: 10 }, // Red barrier (in front of red flag)
    { x: 125, y: 660, width: 250, height: 10 }, // Blue barrier (in front of blue flag)
  ],
};
