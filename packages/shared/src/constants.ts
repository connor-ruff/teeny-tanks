import { ACTIVE_MAP } from './maps/index.js';

// Server tick rate
export const TICK_RATE = 20;
export const TICK_INTERVAL = 1000 / TICK_RATE;

// Arena dimensions — sourced from the active map definition
export const ARENA_WIDTH = ACTIVE_MAP.width;
export const ARENA_HEIGHT = ACTIVE_MAP.height;

// Tank
export const TANK_SPEED = 135; // pixels per second
export const TANK_REVERSE_MULTIPLIER = 0.8; // reverse is slower than forward (fraction of TANK_SPEED)
export const TANK_ROTATION_SPEED = 1.8; // radians per second
export const TANK_WIDTH = 35;
export const TANK_HEIGHT = 26;
export const TANK_SHOOT_COOLDOWN = 1250; // ms
export const TANK_COLLISION_RADIUS = 17; // circular approximation for tank-to-tank collision
export const TANK_PUSH_FACTOR = 0.35;   // fraction of overlap transferred to dragged tank
export const TANK_RESPAWN_DELAY = 3500; // ms — cooldown before destroyed tank reappears

// Projectile
export const PROJECTILE_SPEED = 210; // pixels per second
export const PROJECTILE_RADIUS = 4;
export const PROJECTILE_LIFETIME = 2500; // ms
export const PROJECTILE_SPAWN_OFFSET = 5; // px — extra gap between tank edge and spawned bullet

// Flag
export const FLAG_RADIUS = 12;
export const FLAG_PICKUP_DISTANCE = 20;
export const CAPTURE_ZONE_RADIUS = 35;
export const FLAG_BASE_INSET = 80; // px — how far each flag sits from the top/bottom arena edge

// Teams
export const TEAM_RED = 'red' as const;
export const TEAM_BLUE = 'blue' as const;

// Spawn / respawn positions — sourced from the active map definition.
// Used for ALL spawn scenarios: initial game start, post-score reset, and post-death respawn.
// Each team has two positions (left/right corners on their side); slot index picks which one.
export const RESPAWN_POSITIONS = {
  red: ACTIVE_MAP.redRespawnPositions,
  blue: ACTIVE_MAP.blueRespawnPositions,
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
export const SCORE_LIMIT_DEFAULT = 3; // default number of captures to win
export const SCORE_LIMIT_MIN = 1;
export const SCORE_LIMIT_MAX = 20;

// Client interpolation
export const LERP_SPEED = 0.2; // fraction of remaining distance moved per state update
export const SNAP_THRESHOLD = 100; // px — teleport (skip lerp) when position jumps farther than this
