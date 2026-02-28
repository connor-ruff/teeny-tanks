# Shared Package

`packages/shared` — types, constants, and map definitions imported by both server and client.

## Types (`types.ts`)

### Core Game Types

```typescript
type Team = 'red' | 'blue'

interface Vec2 { x: number; y: number }
```

### Entity State

**TankState** — full server-side tank representation:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Socket ID of the owning player |
| `name` | `string` | Display name |
| `team` | `Team` | Red or blue |
| `x`, `y` | `number` | Position in arena coordinates |
| `rotation` | `number` | Facing angle in radians |
| `health` | `number` | Always 0 or 1 (one-shot kills) |
| `input` | `PlayerInput` | Current input state (server-only) |
| `lastShotTime` | `number` | Cooldown tracking (server-only) |
| `respawnTimer` | `number \| null` | Countdown until respawn (server-only) |
| `hasFlag` | `boolean` | Whether carrying enemy flag |

**ProjectileState** — bullet in flight:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Auto-incrementing ID |
| `ownerId` | `string` | Socket ID of firing tank |
| `ownerTeam` | `Team` | Team of firing tank |
| `x`, `y` | `number` | Current position |
| `vx`, `vy` | `number` | Velocity components (updated on bounce) |
| `rotation` | `number` | Initial firing angle |
| `createdAt` | `number` | Timestamp for expiry calculation |

**FlagState** — team flag:

| Field | Type | Description |
|-------|------|-------------|
| `team` | `Team` | Which team this flag belongs to |
| `x`, `y` | `number` | Current position |
| `carrierId` | `string \| null` | Socket ID of carrier, or null |
| `atBase` | `boolean` | Whether at home position |

**GameState** — complete world state (server-internal):

| Field | Type | Description |
|-------|------|-------------|
| `tanks` | `Map<string, TankState>` | All tanks by socket ID |
| `projectiles` | `ProjectileState[]` | All active bullets |
| `flags` | `Record<Team, FlagState>` | Both team flags |
| `scores` | `Record<Team, number>` | Team scores |
| `scoreLimit` | `number` | Points needed to win |

### Wire Types

Slim versions sent over the network. These omit server-only fields to reduce bandwidth.

| Wire Type | Omitted Fields |
|-----------|---------------|
| `TankStateWire` | `input`, `lastShotTime`, `respawnTimer` |
| `ProjectileStateWire` | (same as ProjectileState) |
| `FlagStateWire` | (same as FlagState) |
| `GameStateWire` | Uses wire sub-types; `tanks` is `Record<string, TankStateWire>` instead of `Map` |

### Input

```typescript
interface PlayerInput {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  shoot: boolean
}
```

### Lobby Types

```typescript
interface LobbyPlayer {
  id: string
  name: string
  team: Team | null   // null = unassigned
  isHost: boolean
}

interface LobbyState {
  roomCode: string
  players: LobbyPlayer[]
  scoreLimit: number
}
```

### Socket Event Interfaces

See [networking.md](networking.md) for full event documentation.

---

## Constants (`constants.ts`)

### Tick Rate

| Constant | Value | Description |
|----------|-------|-------------|
| `TICK_RATE` | `20` | Server updates per second |
| `TICK_INTERVAL` | `50` | Milliseconds per tick (1000/20) |

### Tank

| Constant | Value | Description |
|----------|-------|-------------|
| `TANK_SPEED` | `135` | Pixels per second |
| `TANK_ROTATION_SPEED` | `1.8` | Radians per second |
| `TANK_COLLISION_RADIUS` | `14` | Circular hitbox radius (pixels) |
| `TANK_PUSH_FACTOR` | `0.35` | Collision separation bias for moving tank |
| `SHOOT_COOLDOWN` | `500` | Milliseconds between shots |
| `RESPAWN_DELAY` | `3000` | Milliseconds before respawning |

### Projectile

| Constant | Value | Description |
|----------|-------|-------------|
| `PROJECTILE_SPEED` | `210` | Pixels per second |
| `PROJECTILE_RADIUS` | `3` | Collision radius (pixels) |
| `PROJECTILE_LIFETIME` | `2500` | Milliseconds before expiry |

### Flag

| Constant | Value | Description |
|----------|-------|-------------|
| `FLAG_PICKUP_DISTANCE` | `20` | Pixels — tank must be this close to pick up |
| `FLAG_CAPTURE_ZONE_RADIUS` | `30` | Pixels — capture zone around home base |

### Scoring

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_SCORE_LIMIT` | `3` | Default points to win |
| `MIN_SCORE_LIMIT` | `1` | Minimum configurable |
| `MAX_SCORE_LIMIT` | `20` | Maximum configurable |

### Client Interpolation

| Constant | Value | Description |
|----------|-------|-------------|
| `LERP_SPEED` | `0.3` | Linear interpolation factor (0–1) |
| `SNAP_THRESHOLD` | `100` | Pixels — teleport instead of lerp if delta exceeds this |

### Team Positions

Positions are defined per-map. For the active map (`ClassicSimpleBoard`):

| Position | Red (north) | Blue (south) |
|----------|-------------|--------------|
| Flag spawn | `(250, 80)` | `(250, 770)` |
| Capture zone | Same as flag spawn | Same as flag spawn |
| Respawn areas | `(100, 120)`, `(400, 120)` | `(100, 730)`, `(400, 730)` |

---

## Maps

### Map Definition Interface (`maps/types.ts`)

```typescript
interface WallRect {
  x: number       // left edge
  y: number       // top edge
  width: number
  height: number
}

interface MapDefinition {
  name: string
  arenaWidth: number
  arenaHeight: number
  walls: WallRect[]
  teamPositions: {
    red: { flag: Vec2; captureZone: Vec2; respawns: Vec2[] }
    blue: { flag: Vec2; captureZone: Vec2; respawns: Vec2[] }
  }
  viewport: { width: number; height: number }
  cameraLerp: number
}
```

### ClassicSimpleBoard (active)

- **Arena**: 500 × 850 pixels
- **Viewport**: 500 × 700 (camera scrolls vertically)
- **Walls**: 4 interior walls — red barrier, blue barrier, left center barrier, right center barrier
- **Camera lerp**: 0.1

### ClassicBoard

- **Arena**: 800 × 1200 pixels
- **Walls**: Complex multi-wall layout with vertical barriers and flag-base protection walls
- **Not currently active** — selected via `maps/index.ts`
