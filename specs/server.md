# Server Package

`packages/server` — the authoritative game server built on Node.js and Socket.IO.

## Entry Point (`index.ts`)

The server bootstraps in a few steps:

1. Creates an HTTP server (no Express — raw `http.createServer`)
2. Attaches Socket.IO with WebSocket-only transport
3. Binds to `127.0.0.1:3001` (loopback only — expects a reverse proxy like nginx in production)
4. Creates a `RoomManager` and registers it as the Socket.IO connection handler
5. Registers `SIGTERM`/`SIGINT` handlers for graceful shutdown (closes all sockets, stops HTTP listener)

---

## RoomManager (`RoomManager.ts`)

Manages the lifecycle of game rooms and routes incoming socket connections.

### Room Codes

- 4-character uppercase codes generated from a 24-letter alphabet (excludes `I` and `O` to avoid ambiguity)
- ~330,000 possible codes
- Collision-checked on generation

### Connection Flow

```
Socket connects
  │
  ├─ createRoom(name)  → generates code, creates GameRoom, joins socket
  │
  └─ joinRoom(name, code) → validates room exists + not full, joins socket
```

### State Tracking

- `rooms: Map<string, GameRoom>` — room code → game room
- `socketRooms: Map<string, string>` — socket ID → room code (for cleanup on disconnect)

### Disconnect Handling

When a socket disconnects, the manager:
1. Looks up the room via `socketRooms`
2. Calls `room.removePlayer(socketId)`
3. If the room is empty, deletes it from the map

---

## GameRoom (`GameRoom.ts`)

The core game container. Each room has its own game state and loop.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string` | 4-char room code |
| `hostId` | `string` | Socket ID of the host (first player) |
| `state` | `GameState` | Full authoritative state |
| `lobbyPlayers` | `Map<string, LobbyPlayer>` | Players in lobby phase |
| `phase` | `'lobby' \| 'game'` | Current room phase |
| `loopInterval` | `NodeJS.Timeout \| null` | Game loop timer handle |

### Lobby Phase

During the lobby phase, the host can:
- **Assign teams** — move players between red, blue, and unassigned
- **Set score limit** — adjust within `MIN_SCORE_LIMIT`..`MAX_SCORE_LIMIT`
- **Start the game** — only if at least 1 player per team

On start, the room:
1. Creates `TankState` for each assigned player
2. Creates both `FlagState` objects at their home bases
3. Starts the game loop (`setInterval` at `TICK_INTERVAL`)

### Game Loop

Runs at 20 Hz. Each tick:

```
1. PhysicsSystem.update(state, delta, map)
   └─ Moves tanks based on input, resolves wall collisions

2. CollisionSystem.update(state)
   └─ Pushes overlapping tanks apart

3. ProjectileSystem.update(state, delta, map)
   └─ Moves bullets, bounces off walls, checks tank hits
   └─ Returns kill events [{killerId, victimId}]

4. FlagSystem.update(state, map)
   └─ Handles flag pickup, carry, capture, return
   └─ Returns capture events [{team, playerId}]

5. Process kill events → emit 'kill' to room
6. Process capture events → increment score, emit 'flagCapture', reset map
7. Check win condition → if score >= scoreLimit, emit 'gameOver', stop loop
8. Serialize state → strip server-only fields → GameStateWire
9. Broadcast 'gameState' to all sockets in room
```

### State Serialization

The `serializeState()` method converts the internal `GameState` to a `GameStateWire`:
- `tanks` Map → plain object (Record)
- Strips `input`, `lastShotTime`, `respawnTimer` from each tank
- Passes projectiles and flags through as-is

### Player Input Handling

Each socket has an `input` event listener. When received, the input is stored directly on the player's `TankState.input` object. The physics system reads this on the next tick.

---

## Entities

### Tank (`entities/Tank.ts`)

**`createTank(id, name, team, map)`**

Creates a new tank at a random respawn position for the given team.

- Health: `1` (one-shot kill)
- Rotation: `Math.PI / 2` (facing south) for red, `-Math.PI / 2` (facing north) for blue
- Position: randomly selected from team's respawn positions
- All input flags default to `false`

**`respawnTank(tank, map)`**

Called after the respawn timer expires:
- Moves tank to a random respawn position
- Resets health to 1
- Resets rotation to team default
- Clears input state

**`resetTankToSpawn(tank, map)`**

Full reset used on map reset (after a flag capture):
- Same as respawn but also clears `hasFlag`
- Clears `respawnTimer`

### Projectile (`entities/Projectile.ts`)

**`createProjectile(tank)`**

Spawns a bullet at the tip of the tank's barrel:
- Position offset: `18px` forward from tank center along rotation
- Velocity: `vx = cos(rotation) * PROJECTILE_SPEED`, `vy = sin(rotation) * PROJECTILE_SPEED`
- ID: auto-incrementing counter (module-level `let nextId = 0`)
- Stores `ownerId` and `ownerTeam` for kill attribution

### Flag (`entities/Flag.ts`)

**`createFlag(team, map)`**

Creates a flag at the team's flag position from the map definition.

**`resetFlag(flag, map)`**

Returns the flag to its home base:
- Resets position to team's flag spawn
- Clears `carrierId`
- Sets `atBase = true`

---

## Systems

### PhysicsSystem (`systems/PhysicsSystem.ts`)

Processes tank movement each tick.

**Rotation**: If `input.left` → subtract `TANK_ROTATION_SPEED * dt`. If `input.right` → add it.

**Movement**: If `input.up` → move forward along rotation at `TANK_SPEED * dt`. If `input.down` → move backward at `TANK_SPEED * 0.6 * dt` (reverse is slower).

**Wall collision**: After movement, checks each wall in the map. Uses AABB overlap detection with `TANK_COLLISION_RADIUS` as a buffer. Pushes the tank out along the axis of least penetration.

**Arena bounds**: Clamps tank position to `[TANK_COLLISION_RADIUS, arenaWidth - TANK_COLLISION_RADIUS]` on both axes.

### CollisionSystem (`systems/CollisionSystem.ts`)

Handles tank-to-tank collisions after movement.

**Detection**: Circular overlap using `TANK_COLLISION_RADIUS * 2` as the minimum distance between tank centers.

**Separation**: Pushes tanks apart along the line between their centers. The push ratio depends on who's moving:
- If one tank is moving and the other isn't → mover gets `TANK_PUSH_FACTOR` (0.35) of the overlap, stationary gets the rest
- If both or neither are moving → 50/50 split

After separation, re-clamps to arena bounds.

### ProjectileSystem (`systems/ProjectileSystem.ts`)

The most complex system. Handles bullet lifecycle each tick.

**Spawning**: When a tank has `input.shoot` and cooldown has elapsed:
1. Calculate barrel tip position (18px forward from tank center)
2. Validate the spawn point is in-bounds and not inside a wall
3. If spawn point is invalid, the tank is destroyed (anti-stuck mechanic)
4. Create projectile, add to state

**Movement**: Advances position by `vx * dt`, `vy * dt`.

**Arena edge bouncing**: If a bullet exits the arena bounds, reflect the appropriate velocity component (`vx` or `vy`) and clamp position back inside.

**Wall bouncing**: Uses a slab-method algorithm for accurate collision with interior walls:
1. Trace the bullet's path from previous position to current position
2. Find the earliest wall intersection along the path
3. Reflect the velocity component (x or y) based on which wall face was hit
4. Place the bullet at the reflection point

**Tank hits**: Checks distance between each bullet and each tank (using `TANK_COLLISION_RADIUS + PROJECTILE_RADIUS`). Friendly fire is enabled — any bullet can hit any tank, including the shooter. On hit:
- Tank health → 0
- Tank's carried flag is dropped at current position
- Respawn timer starts (`RESPAWN_DELAY`)
- Bullet is removed
- Kill event is returned

**Expiry**: Bullets older than `PROJECTILE_LIFETIME` are removed.

### FlagSystem (`systems/FlagSystem.ts`)

Handles the capture-the-flag mechanics.

**Pickup**: Each tick, checks if any alive enemy tank (without a flag) is within `FLAG_PICKUP_DISTANCE` of a flag that's on the ground. If so:
- Set `flag.carrierId` to the tank's ID
- Set `flag.atBase = false`
- Set `tank.hasFlag = true`

**Carrying**: If a flag has a carrier, update the flag's position to match the carrier's position.

**Capture**: If a flag carrier enters their own team's capture zone (within `FLAG_CAPTURE_ZONE_RADIUS` of the capture zone center), a capture event is fired. The `GameRoom` increments the score and calls a full map reset — all tanks respawn and both flags return to base.

**Flag return**: If a friendly tank drives over their own dropped flag (not at base, no carrier), the flag is returned to base immediately.
