import type { MapDefinition } from './types.js';


export const GAME_BOARD: MapDefinition = {
  name: 'Classic Simple Board',
  width: 800,
  height: 1200,

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
    { x: 0, y: 400, width: 335, height: 400},   // Left barrier (in middle of arena)
    { x: 465, y: 400, width: 335, height: 400},  // Right barrier (in middle of arena)

    { x: 0,  y: 280, width: 180, height: 120},   // Left barrier in front of north flag
    { x: 620,  y: 280, width: 180, height: 120},   // Right barrier in front of north flag
    { x: 270,  y: 120 , width: 260, height: 10},  // First horiz barrier in front of north flag
    { x: 335,  y: 280, width: 130, height: 10},  // Second horiz barrier in front of north flag 
    { x: 395,  y: 130, width: 10, height: 85},  // Vertical barrier right under flag
    { x: 180,  y: 0,   width: 10, height: 190}, // Vertical barrier to the left of the north flag
    { x: 610,  y: 0,   width: 10, height: 190}, // Vertical barrier to the right of the north flag

    { x: 0,  y: 800, width: 180, height: 120},   // Left barrier in front of south flag
    { x: 620,  y: 800, width: 180, height: 120},   // Right barrier in front of south flag
    { x: 270,  y: 1070, width: 260, height: 10},  // First horiz barrier in front of south flag
    { x: 335,  y: 910, width: 130, height: 10},  // Second horiz barrier in front of south flag
    { x: 395,  y: 920, width: 10, height: 85},  // Vertical barrier right under flag
    { x: 180,  y: 1010,   width: 10, height: 190}, // Vertical barrier to the left of the south flag
    { x: 610,  y: 1010,   width: 10, height: 190}, // Vertical barrier to the right of the south flag
  ],

  // Respawn positions — two corners per team (left, right) on their side of the map.
  // Placed ~1/6 from each side edge, behind (further from center than) the flag.
  // Red team is at the top (low Y), blue team at the bottom (high Y).
  //
  //   Map width = 800  →  1/6 ≈ 133px from each side edge
  //   Red Y = 60 (above the flag at y=80, safely in their back zone)
  //   Blue Y = 1140 (below the flag at y=1160, safely in their back zone)
  redRespawnPositions: [
    { x: 80, y: 60 },   // top-left corner
    { x: 720, y: 60 },  // top-right corner
  ],
  blueRespawnPositions: [
    { x: 80, y: 1140 },  // bottom-left corner
    { x: 720, y: 1140 }, // bottom-right corner
  ],

  // Viewport & camera
  viewportWidth: 800,
  viewportHeight: 700,
  cameraLerp: 0.1,
  cameraDeadzoneWidth: 60,
  cameraDeadzoneHeight: 60,
};
