// Server tick rate
export const TICK_RATE = 20;
export const TICK_INTERVAL = 1000 / TICK_RATE;

// Arena
export const ARENA_WIDTH = 1200;
export const ARENA_HEIGHT = 800;

// Tank
export const TANK_SPEED = 200; // pixels per second
export const TANK_ROTATION_SPEED = 3; // radians per second
export const TANK_WIDTH = 40;
export const TANK_HEIGHT = 30;
export const TANK_SHOOT_COOLDOWN = 500; // ms

// Projectile
export const PROJECTILE_SPEED = 400; // pixels per second
export const PROJECTILE_RADIUS = 4;
export const PROJECTILE_LIFETIME = 2000; // ms

// Flag
export const FLAG_RADIUS = 15;
export const FLAG_PICKUP_DISTANCE = 30;
export const CAPTURE_ZONE_RADIUS = 50;

// Teams
export const TEAM_RED = 'red' as const;
export const TEAM_BLUE = 'blue' as const;

// Spawn positions
export const SPAWN_POSITIONS = {
  red: { x: 100, y: ARENA_HEIGHT / 2 },
  blue: { x: ARENA_WIDTH - 100, y: ARENA_HEIGHT / 2 },
};

// Flag positions (each team's flag is at their base)
export const FLAG_POSITIONS = {
  red: { x: 100, y: ARENA_HEIGHT / 2 },
  blue: { x: ARENA_WIDTH - 100, y: ARENA_HEIGHT / 2 },
};

// Capture zones (bring enemy flag to your own base)
export const CAPTURE_ZONES = {
  red: { x: 100, y: ARENA_HEIGHT / 2 },
  blue: { x: ARENA_WIDTH - 100, y: ARENA_HEIGHT / 2 },
};
