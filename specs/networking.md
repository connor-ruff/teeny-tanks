# Networking

Socket.IO event protocol, state serialization, and data flow between client and server.

## Transport

- **Library**: Socket.IO 4.8 (server) / socket.io-client 4.8 (client)
- **Transport**: WebSocket only — `transports: ['websocket']` (no HTTP long-polling)
- **Connection**: Client connects to server origin (auto-detected, proxied through Vite in dev)

## Event Reference

### Client → Server (`ClientToServerEvents`)

| Event | Payload | Description |
|-------|---------|-------------|
| `createRoom` | `{ name: string }` | Create a new room. Sender becomes host. |
| `joinRoom` | `{ name: string, code: string }` | Join an existing room by code. |
| `assignTeam` | `{ playerId: string, team: Team \| null }` | Host assigns a player to a team (or unassigns with `null`). |
| `setScoreLimit` | `{ scoreLimit: number }` | Host sets the score limit (1–20). |
| `startGame` | `{}` | Host starts the game (requires ≥1 player per team). |
| `input` | `PlayerInput` | Player's current input state (sent at 20 Hz). |

### Server → Client (`ServerToClientEvents`)

| Event | Payload | Description |
|-------|---------|-------------|
| `roomCreated` | `{ code: string }` | Confirms room creation, provides room code. |
| `roomJoined` | `{ code: string }` | Confirms successful room join. |
| `error` | `{ message: string }` | Error message (room not found, room full, etc.). |
| `lobbyUpdate` | `LobbyState` | Full lobby state broadcast to all players in room. |
| `gameStarted` | `{}` | Game has begun — clients should show the game canvas. |
| `gameState` | `GameStateWire` | Full game state snapshot (broadcast at 20 Hz). |
| `kill` | `{ killerId: string, victimId: string }` | A tank was destroyed. |
| `flagCapture` | `{ team: Team, playerId: string }` | A flag was captured, map is resetting. |
| `gameOver` | `{ winningTeam: Team, scores: Record<Team, number> }` | Game ended — winning team and final scores. |

## Data Flow Diagram

```
Client                                          Server
  │                                                │
  │──── createRoom({name}) ───────────────────────►│
  │◄─── roomCreated({code}) ──────────────────────│
  │                                                │
  │──── joinRoom({name, code}) ──────────────────►│
  │◄─── roomJoined({code}) ──────────────────────│
  │                                                │
  │◄─── lobbyUpdate(LobbyState) ─────────────────│  (broadcast to all)
  │                                                │
  │──── assignTeam({playerId, team}) ────────────►│  (host only)
  │──── setScoreLimit({scoreLimit}) ─────────────►│  (host only)
  │◄─── lobbyUpdate(LobbyState) ─────────────────│  (re-broadcast)
  │                                                │
  │──── startGame({}) ───────────────────────────►│  (host only)
  │◄─── gameStarted({}) ────────────────────────│  (broadcast to all)
  │                                                │
  │  ┌─── GAME LOOP (20 Hz) ──────────────────┐   │
  │  │                                         │   │
  │──┼── input(PlayerInput) ──────────────────►│   │
  │  │                                         │   │
  │◄─┼── gameState(GameStateWire) ────────────│   │  (broadcast)
  │◄─┼── kill({killerId, victimId}) ──────────│   │  (on tank death)
  │◄─┼── flagCapture({team, playerId}) ───────│   │  (on capture)
  │  │                                         │   │
  │  └─────────────────────────────────────────┘   │
  │                                                │
  │◄─── gameOver({winningTeam, scores}) ─────────│  (game ends)
  │                                                │
```

## State Serialization

The server maintains rich internal state (`GameState`) with server-only fields. Before broadcasting, it serializes to `GameStateWire`:

### What gets stripped

| Entity | Server-only fields removed |
|--------|---------------------------|
| Tank | `input` (PlayerInput), `lastShotTime` (number), `respawnTimer` (number \| null) |
| Projectile | (nothing stripped — all fields sent) |
| Flag | (nothing stripped — all fields sent) |

### Structural changes

| Field | Internal type | Wire type |
|-------|--------------|-----------|
| `tanks` | `Map<string, TankState>` | `Record<string, TankStateWire>` |
| `projectiles` | `ProjectileState[]` | `ProjectileStateWire[]` |
| `flags` | `Record<Team, FlagState>` | `Record<Team, FlagStateWire>` |

## Client-Side State Handling

### SocketManager caching

The `SocketManager` caches the latest received state:
- `latestState: GameStateWire | null` — updated on every `gameState` event
- `latestLobby: LobbyState | null` — updated on every `lobbyUpdate` event

The game scene reads `latestState` each render frame (not tied to socket events).

### Interpolation

The client does **not** buffer multiple states or do server reconciliation. Instead:

- Tank positions are interpolated using `LERP_SPEED` (0.3) — each frame, the sprite moves 30% of the way toward the server position
- If the gap exceeds `SNAP_THRESHOLD` (100px), the sprite teleports (handles respawns and map resets)
- Rotation uses shortest-arc interpolation to prevent spinning the wrong way
- Projectiles are placed directly at server position (no interpolation — too fast)
- Flags follow their carrier or sit at the server-reported position

### Entity lifecycle

Each frame, the scene compares sprites against the latest state:

```
For each entity type (tanks, projectiles, flags):
  - If entity is in state but no sprite exists  → create sprite
  - If entity is in state and sprite exists      → update sprite
  - If sprite exists but entity not in state     → destroy sprite
```

## Bandwidth Considerations

At 20 Hz with a full room (10 players):

**Per tick payload** (approximate):
- 10 tanks × ~120 bytes each ≈ 1.2 KB
- 0–20 projectiles × ~60 bytes each ≈ 0–1.2 KB
- 2 flags × ~40 bytes each ≈ 80 bytes
- Scores + metadata ≈ 50 bytes
- **Total**: ~1.5–2.5 KB per tick

**Per second**: ~30–50 KB/s downstream per client

Event messages (kills, captures) are negligible bandwidth — they fire infrequently and are small.

## Error Handling

Server errors are communicated via the `error` event with a `{ message: string }` payload. Known error conditions:

| Condition | Message |
|-----------|---------|
| Room code not found | `"Room not found"` |
| Room is full (10 players) | `"Room is full"` |
| Non-host tries host action | (silently ignored, no error emitted) |
| Game already started | (join attempt rejected) |
