# Architecture

High-level architecture of the teeny-tanks project.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 22 |
| Language | TypeScript | 5.7 |
| Server framework | Socket.IO | 4.8 |
| Game engine | Phaser | 3.87 |
| Bundler | Vite | 6.0 |
| Package management | npm workspaces | — |

## Monorepo Structure

```
teeny-tanks/
├── package.json              # Workspace root
├── tsconfig.base.json        # Shared TS config (all packages extend this)
├── specs/                    # Documentation
├── packages/
│   ├── shared/               # Types, constants, map definitions
│   │   ├── src/
│   │   │   ├── index.ts          # Barrel export
│   │   │   ├── types.ts          # All shared interfaces
│   │   │   ├── constants.ts      # Game tuning values
│   │   │   └── maps/
│   │   │       ├── types.ts      # WallRect, MapDefinition
│   │   │       ├── index.ts      # Active map export
│   │   │       ├── ClassicSimpleBoard.ts
│   │   │       └── ClassicBoard.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── server/               # Authoritative game server
│   │   ├── src/
│   │   │   ├── index.ts          # HTTP + Socket.IO bootstrap
│   │   │   ├── RoomManager.ts    # Room lifecycle
│   │   │   ├── GameRoom.ts       # Game loop + state
│   │   │   ├── entities/
│   │   │   │   ├── Tank.ts
│   │   │   │   ├── Projectile.ts
│   │   │   │   └── Flag.ts
│   │   │   └── systems/
│   │   │       ├── PhysicsSystem.ts
│   │   │       ├── CollisionSystem.ts
│   │   │       ├── ProjectileSystem.ts
│   │   │       └── FlagSystem.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── client/               # Phaser 3 browser client
│       ├── src/
│       │   ├── main.ts           # Bootstrap + wiring
│       │   ├── constants.ts      # Derived viewport values
│       │   ├── network/
│       │   │   └── SocketManager.ts
│       │   ├── input/
│       │   │   └── InputManager.ts
│       │   ├── scenes/
│       │   │   ├── BootScene.ts
│       │   │   └── GameScene.ts
│       │   ├── entities/
│       │   │   ├── TankSprite.ts
│       │   │   ├── ProjectileSprite.ts
│       │   │   └── FlagSprite.ts
│       │   └── ui/
│       │       ├── RoomScreen.ts
│       │       ├── LobbyManager.ts
│       │       └── HudManager.ts
│       ├── index.html            # HTML shell + all CSS
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
```

## Build Order

The packages have compile-time dependencies:

```
shared  →  server
        →  client
```

`shared` must build first because both `server` and `client` import its types and constants. The root `npm run build` script builds all three in the correct order.

## Server-Authoritative Model

All game logic runs on the server. The client is a "dumb renderer" — it sends input and draws whatever state the server tells it to draw.

```
┌─────────┐   PlayerInput (20 Hz)   ┌─────────┐
│  Client  │ ──────────────────────► │  Server  │
│ (Phaser) │                         │ (Node)   │
│          │ ◄────────────────────── │          │
└─────────┘   GameStateWire (20 Hz)  └─────────┘
              + event callbacks
```

### Why server-authoritative?

- Prevents cheating — clients cannot modify game state
- Consistent physics — all players see the same simulation
- Simplified conflict resolution — server is the single source of truth

### Trade-offs

- Adds latency (client must wait for server response)
- Server is the bottleneck for player count
- Client uses interpolation to smooth between ticks

## Game Loop

The server runs a fixed-timestep loop at 20 Hz (50ms per tick):

```
Each tick:
  1. Process all queued PlayerInputs
  2. Run PhysicsSystem    — move tanks, resolve wall collisions
  3. Run CollisionSystem  — tank-to-tank push separation
  4. Run ProjectileSystem — move bullets, bounce off walls, check hits
  5. Run FlagSystem       — pickup, carry, capture, flag returns
  6. Check win condition  — if score >= SCORE_LIMIT → emit gameOver
  7. Serialize state      — strip server-only fields → GameStateWire
  8. Broadcast state      — emit to all sockets in room
```

## Room Lifecycle

```
[Player connects]
       │
       ▼
  createRoom / joinRoom
       │
       ▼
  ┌─────────┐
  │  LOBBY   │  ← team assignment, score config
  └────┬─────┘
       │ host clicks "Start Game"
       ▼
  ┌─────────┐
  │  GAME    │  ← 20 Hz loop running
  └────┬─────┘
       │ score limit reached
       ▼
  ┌──────────┐
  │ GAME OVER│  ← gameOver event, loop stopped
  └──────────┘
```

## Key Design Decisions

1. **WebSocket-only transport** — Socket.IO is configured with `transports: ['websocket']` (no HTTP long-polling fallback). This reduces latency for the real-time game loop.

2. **Wire types for serialization** — The server maintains rich `TankState` / `ProjectileState` objects internally but strips server-only fields (like `lastShotTime`, `input`) before broadcasting. The slim `*Wire` types minimize bandwidth.

3. **Vertical map orientation** — Red team is at the top (north), Blue at the bottom (south). This is a deliberate design choice reflected in spawn positions, flag locations, and camera defaults.

4. **Canvas rendering** — Tank, projectile, and flag sprites are drawn procedurally using Phaser's Graphics API rather than loaded from image assets. This creates the "pencil-box" hand-drawn aesthetic.

5. **DOM-based UI** — Room selection, lobby, HUD, and game-over screens use standard HTML/CSS overlays rather than Phaser UI objects. This simplifies styling and responsiveness.
