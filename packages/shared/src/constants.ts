import { ACTIVE_MAP } from './maps/index.js';

// Server tick rate
export const TICK_RATE = 20;
export const TICK_INTERVAL = 1000 / TICK_RATE;

// Arena dimensions — sourced from the active map definition
export const ARENA_WIDTH = ACTIVE_MAP.width;
export const ARENA_HEIGHT = ACTIVE_MAP.height;

// Tank
export const TANK_SPEED = 150; // pixels per second
export const TANK_REVERSE_MULTIPLIER = 0.8; // reverse is slower than forward (fraction of TANK_SPEED)
export const TANK_ROTATION_SPEED = 3; // radians per second
export const TANK_WIDTH = 35;
export const TANK_HEIGHT = 26;
export const TANK_SHOOT_COOLDOWN = 500; // ms
export const TANK_COLLISION_RADIUS = 17; // circular approximation for tank-to-tank collision
export const TANK_PUSH_FACTOR = 0.35;   // fraction of overlap transferred to dragged tank
export const TANK_RESPAWN_DELAY = 2000; // ms — cooldown before destroyed tank reappears

// Projectile
export const PROJECTILE_SPEED = 400; // pixels per second
export const PROJECTILE_RADIUS = 4;
export const PROJECTILE_LIFETIME = 2000; // ms
export const PROJECTILE_SPAWN_OFFSET = 5; // px — extra gap between tank edge and spawned bullet

// Flag
export const FLAG_RADIUS = 15;
export const FLAG_PICKUP_DISTANCE = 30;
export const CAPTURE_ZONE_RADIUS = 50;
export const FLAG_BASE_INSET = 80; // px — how far each flag sits from the top/bottom arena edge

// Teams
export const TEAM_RED = 'red' as const;
export const TEAM_BLUE = 'blue' as const;

// Spawning
export const SPAWN_DISTANCE_FROM_FLAG = 50; // px — how far spawn slots sit behind each team's flag

// Spawn positions (vertical layout — red at top/north, blue at bottom/south).
// Each team has up to 5 slots arranged in an arc around the flag so tanks
// don't spawn directly on top of the flag or each other.
// Red spawns are shifted slightly south of the flag; blue slightly north.
const SPAWN_OFFSETS = [
  { x: 0, y: 0 },     // slot 0: directly above/below flag
  { x: -60, y: 0 },   // slot 1: left
  { x: 60, y: 0 },    // slot 2: right
  { x: -30, y: 30 },  // slot 3: lower-left
  { x: 30, y: 30 },   // slot 4: lower-right
];

function buildSpawnSlots(
  baseX: number,
  baseY: number,
  yDirection: number, // +1 for red (push spawns south of flag), -1 for blue (push spawns north)
) {
  // Start SPAWN_DISTANCE_FROM_FLAG px away from the flag in the team's "back" direction
  const spawnBaseY = baseY + SPAWN_DISTANCE_FROM_FLAG * yDirection;
  return SPAWN_OFFSETS.map(off => ({
    x: baseX + off.x,
    y: spawnBaseY + off.y * yDirection,
  }));
}

export const SPAWN_POSITIONS = {
  red: buildSpawnSlots(ARENA_WIDTH / 2, FLAG_BASE_INSET, 1),
  blue: buildSpawnSlots(ARENA_WIDTH / 2, ARENA_HEIGHT - FLAG_BASE_INSET, -1),
};

// Flag positions (each team's flag is at their base)
export const FLAG_POSITIONS = {
  red: { x: ARENA_WIDTH / 2, y: FLAG_BASE_INSET },
  blue: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - FLAG_BASE_INSET },
};

// Capture zones (bring enemy flag to your own base)
export const CAPTURE_ZONES = {
  red: { x: ARENA_WIDTH / 2, y: FLAG_BASE_INSET },
  blue: { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - FLAG_BASE_INSET },
};

// Gameplay
export const SCORE_LIMIT = 3; // first team to reach this many captures wins

// Client interpolation
export const LERP_SPEED = 0.2; // fraction of remaining distance moved per state update
export const SNAP_THRESHOLD = 100; // px — teleport (skip lerp) when position jumps farther than this
