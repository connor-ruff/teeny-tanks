# Persistent User Data — Implementation Gameplan

## Overview

teeny-tanks is currently fully ephemeral — players enter a display name, get a socket.id, play, and everything is lost on disconnect. There is zero persistence, zero auth, and zero stats tracking. This gameplan adds:

1. **User accounts** — username/password registration and login
2. **SQLite database** — persistent storage on the server (file-based, no external services)
3. **Game stats** — kills, deaths, flags captured/returned, wins/losses
4. **Match history** — per-game records with individual player performance
5. **Leaderboards** — ranked player standings computed from aggregate stats

## Current State (before this work)

Understanding the starting point is critical for implementation:

- **Player identity**: Ephemeral `socket.id` assigned by Socket.IO on connect. Players enter a display name on the room screen — it exists only in memory.
- **No database**: Zero persistent storage. Rooms, players, game state are all in-memory Maps/objects.
- **No auth**: No login, no sessions, no tokens. Connection = identity.
- **Player flow**: Room Screen (enter name) → Create/Join Room → Lobby (host assigns teams) → Game → Game Over → back to lobby
- **Server-authoritative**: All game logic runs server-side at 20Hz tick rate. Client is a dumb renderer.

### Key existing files to understand

| File | Role |
|------|------|
| `packages/server/src/index.ts` | HTTP + Socket.IO server bootstrap. Uses raw `http.createServer()` (no Express). Binds to `127.0.0.1:3001`. |
| `packages/server/src/RoomManager.ts` | Handles socket `createRoom`/`joinRoom` events. Manages room lifecycle. Currently reads `displayName` from client event payloads. |
| `packages/server/src/GameRoom.ts` | Game loop, state management, scoring. Emits `playerKilled`, `flagCaptured`, `gameOver` events. |
| `packages/server/src/systems/ProjectileSystem.ts` | Bullet collision detection. Emits kill events. |
| `packages/server/src/systems/FlagSystem.ts` | Flag pickup, capture, return, and map reset logic. |
| `packages/shared/src/types.ts` | All shared TypeScript types: `LobbyPlayer`, `TankState`, `GameState`, socket event interfaces (`ClientToServerEvents`, `ServerToClientEvents`). |
| `packages/shared/src/constants.ts` | Game tuning constants, spawn positions, score limits. |
| `packages/client/src/ui/RoomScreen.ts` | DOM-based room creation/join UI. Has a display name text input. |
| `packages/client/src/ui/LobbyManager.ts` | DOM-based lobby UI. Host assigns teams, sets score limit, starts game. |
| `packages/client/src/ui/HudManager.ts` | In-game HUD — scores, game-over overlay. |
| `packages/client/src/network/SocketManager.ts` | Socket.IO client wrapper. Manages all event sending/receiving. |
| `packages/client/src/main.ts` | Wires all managers together, handles screen transitions. |
| `packages/client/index.html` | All DOM-based UI screens (room, lobby, game-over overlay). |

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth method | Username + password (bcrypt) | Simple, no external providers needed, fits the game's casual nature |
| Session tokens | JWT (7-day expiry, localStorage) | Stateless server-side verification, survives page refresh |
| Database | SQLite via `better-sqlite3` | File-based, zero infrastructure, zero cost, sub-millisecond reads/writes. Perfect for a small hosting server. |
| HTTP framework | None — raw Node `http` module | Only ~6 API endpoints needed. Manual routing keeps dependencies minimal. |
| Stats recording | In-memory during match, flush to DB on game over | Avoids DB writes during the hot 20Hz game loop. Single transaction at match end. |
| Incomplete matches | Discarded | If all players disconnect mid-game, no stats are saved. Keeps data clean. |
| Leaderboards | Computed from indexed columns on `users` table | No separate leaderboard table. `SELECT ... ORDER BY kills DESC LIMIT 20` is fast with indexes. |

---

## Database Schema

3 tables. The `users` table has denormalized aggregate stats for fast leaderboard queries — these are updated atomically at the end of each match alongside the detailed `match_players` records.

```sql
-- Authentication + profile + aggregate stats
CREATE TABLE users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash   TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  preferred_team  TEXT DEFAULT NULL,  -- 'red' | 'blue' | NULL
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  -- Denormalized aggregates (updated at end of each match)
  kills           INTEGER NOT NULL DEFAULT 0,
  deaths          INTEGER NOT NULL DEFAULT 0,
  flags_captured  INTEGER NOT NULL DEFAULT 0,
  flags_returned  INTEGER NOT NULL DEFAULT 0,
  games_played    INTEGER NOT NULL DEFAULT 0,
  wins            INTEGER NOT NULL DEFAULT 0,
  losses          INTEGER NOT NULL DEFAULT 0
);

-- One row per completed game
CREATE TABLE matches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code       TEXT NOT NULL,
  winner_team     TEXT NOT NULL,  -- 'red' | 'blue'
  score_red       INTEGER NOT NULL,
  score_blue      INTEGER NOT NULL,
  score_limit     INTEGER NOT NULL,
  started_at      TEXT NOT NULL,
  ended_at        TEXT NOT NULL DEFAULT (datetime('now')),
  duration_secs   INTEGER NOT NULL
);

-- Per-player performance in each match (join table)
CREATE TABLE match_players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id        INTEGER NOT NULL REFERENCES matches(id),
  user_id         INTEGER NOT NULL REFERENCES users(id),
  team            TEXT NOT NULL,  -- 'red' | 'blue'
  kills           INTEGER NOT NULL DEFAULT 0,
  deaths          INTEGER NOT NULL DEFAULT 0,
  flags_captured  INTEGER NOT NULL DEFAULT 0,
  flags_returned  INTEGER NOT NULL DEFAULT 0
);

-- Indexes for leaderboard queries and match history lookups
CREATE INDEX idx_users_kills ON users(kills DESC);
CREATE INDEX idx_users_wins ON users(wins DESC);
CREATE INDEX idx_users_flags_captured ON users(flags_captured DESC);
CREATE INDEX idx_match_players_user ON match_players(user_id);
CREATE INDEX idx_match_players_match ON match_players(match_id);
```

---

## Auth Flow

### Registration
1. Client sends `POST /api/auth/register` with `{ username, password, displayName }`
2. Server validates: username 3–20 chars alphanumeric, password 6+ chars, displayName 1–16 chars
3. Server hashes password with bcrypt (cost 10)
4. Server INSERTs into `users`. On UNIQUE conflict → 409 Conflict
5. Server creates JWT containing `{ userId, username }`, signed with `JWT_SECRET` env var
6. Returns `{ token, user: { id, username, displayName, preferredTeam } }`

### Login
1. Client sends `POST /api/auth/login` with `{ username, password }`
2. Server looks up user by username, compares bcrypt hash
3. On success → return JWT + user profile. On failure → 401 "Invalid credentials"

### Session Persistence
- Client stores JWT in `localStorage`
- On page load, client hits `GET /api/auth/me` (sends JWT in `Authorization: Bearer` header)
- If valid → skip auth screen, go to room screen. If 401 → show login screen.

### Socket.IO Integration
- Client passes JWT as `auth: { token }` in Socket.IO connection options
- Server validates JWT in `io.use()` middleware before allowing connection
- After validation, `socket.data.userId` and `socket.data.displayName` are set
- Display name comes from the DB, not from client input — the room screen's name input is removed
- Unauthenticated connections are rejected

---

## HTTP API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Create account, return JWT + profile |
| POST | `/api/auth/login` | No | Authenticate, return JWT + profile |
| GET | `/api/auth/me` | JWT | Validate token, return profile |
| GET | `/api/stats/:userId` | JWT | Get a player's profile + aggregate stats |
| GET | `/api/leaderboard?stat=kills&limit=20` | JWT | Get top players ranked by a stat |
| GET | `/api/matches?userId=X&limit=10&offset=0` | JWT | Get paginated match history for a user |

---

## New Files to Create

### Server (`packages/server/src/`)

```
db/
  database.ts          -- Opens SQLite file (data/teeny-tanks.db), runs migrations on startup
  migrations.ts        -- CREATE TABLE / CREATE INDEX SQL statements
  UserRepository.ts    -- create, findByUsername, findById, updateStats, getLeaderboard, getProfile
  MatchRepository.ts   -- createMatch, addMatchPlayer, getMatchesForUser
auth/
  authRoutes.ts        -- HTTP handlers for POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
  authMiddleware.ts    -- JWT verification function used by both HTTP routes and Socket.IO middleware
stats/
  StatsCollector.ts    -- In-memory per-match stat accumulator; flush() writes to DB in a single transaction
```

Also add `data/` to `.gitignore` (the SQLite DB file lives there).

### Client (`packages/client/src/`)

```
ui/AuthScreen.ts       -- Login/Register DOM screen (follows same pattern as RoomScreen.ts)
ui/StatsPanel.ts       -- Overlay showing user's aggregate stats
ui/LeaderboardPanel.ts -- Overlay showing ranked players
network/ApiClient.ts   -- HTTP fetch wrapper for all API calls; stores/sends JWT token
```

### New Dependencies (`packages/server/package.json`)

- `better-sqlite3` — synchronous SQLite driver
- `bcrypt` — password hashing
- `jsonwebtoken` — JWT creation/verification
- `@types/better-sqlite3`, `@types/bcrypt`, `@types/jsonwebtoken` — dev dependencies

---

## Modifications to Existing Files

### `packages/shared/src/types.ts`

Add new types:
```typescript
// Auth
interface AuthRegisterRequest { username: string; password: string; displayName: string; }
interface AuthLoginRequest { username: string; password: string; }
interface AuthResponse { token: string; user: UserProfile; }
interface UserProfile { id: number; username: string; displayName: string; preferredTeam: Team | null; createdAt: string; }

// Stats
interface PlayerStats { kills: number; deaths: number; flagsCaptured: number; flagsReturned: number; gamesPlayed: number; wins: number; losses: number; }
interface PlayerProfileWithStats extends UserProfile { stats: PlayerStats; }
interface LeaderboardEntry { rank: number; userId: number; displayName: string; value: number; }
type LeaderboardStat = 'kills' | 'wins' | 'flags_captured' | 'games_played';

// Match history
interface MatchSummary { matchId: number; roomCode: string; winnerTeam: Team; scoreRed: number; scoreBlue: number; durationSecs: number; endedAt: string; myTeam: Team; myKills: number; myDeaths: number; myFlagsCaptured: number; myFlagsReturned: number; won: boolean; }
```

Modify existing types:
- `ClientToServerEvents.createRoom` — remove `displayName` from payload (becomes `() => void`)
- `ClientToServerEvents.joinRoom` — remove `displayName` from payload (becomes `(data: { code: string }) => void`)
- `LobbyPlayer` — add `userId: number` field

### `packages/server/src/index.ts`

- Add HTTP request handler to `createServer()` callback for routing API requests
- Initialize database on startup (import and call `db/database.ts`)
- Add Socket.IO `io.use()` auth middleware

### `packages/server/src/RoomManager.ts`

- Read `displayName` from `socket.data.displayName` (set by auth middleware) instead of from client event payload
- Read `userId` from `socket.data.userId`

### `packages/server/src/GameRoom.ts`

- Track `userId` alongside `socket.id` in player data structures
- Instantiate `StatsCollector` when game phase starts
- Hook into game events: `ProjectileSystem` kills → `collector.recordKill(userId)` + `collector.recordDeath(userId)`, `FlagSystem` captures → `collector.recordCapture(userId)`
- On `gameOver` → call `collector.flush()` to write match + update user stats

### `packages/client/src/main.ts`

- Auth screen shown first. Socket.IO connection created only after successful auth.
- Flow becomes: Auth Screen → Room Screen → Lobby → Game

### `packages/client/src/network/SocketManager.ts`

- Constructor accepts JWT token, passes as `auth: { token }` in Socket.IO options
- Remove `displayName` from `createRoom` and `joinRoom` calls

### `packages/client/src/ui/RoomScreen.ts`

- Remove display name input field
- Show "Logged in as {displayName}" label + "Log Out" button
- Add "My Stats" and "Leaderboard" buttons

### `packages/client/index.html`

- Add auth screen HTML/CSS block (login/register forms)
- Add stats panel and leaderboard panel overlay HTML/CSS

---

## Stats Recording: How It Works

Stats accumulate **in-memory** during a match and are flushed to the database **once** at game over.

### During the match (memory only, no DB writes)
- `ProjectileSystem` detects a kill → `GameRoom` calls `collector.recordKill(killerUserId)` and `collector.recordDeath(victimUserId)`
- `FlagSystem` detects a capture → `GameRoom` calls `collector.recordCapture(userId)`
- `FlagSystem` detects a return → `GameRoom` calls `collector.recordReturn(userId)`

The `StatsCollector` is just a `Map<userId, { kills, deaths, flagsCaptured, flagsReturned }>` — incrementing integers, zero overhead during the hot game loop.

### On game over (single SQLite transaction)
1. `BEGIN TRANSACTION`
2. INSERT into `matches` → get back `match_id`
3. For each player: INSERT into `match_players` with their per-match stats
4. For each player: `UPDATE users SET kills = kills + ?, deaths = deaths + ?, ..., games_played = games_played + 1, wins = wins + (1 if winning team), losses = losses + (1 if losing team)`
5. `COMMIT`

This runs synchronously via `better-sqlite3` — atomic and sub-millisecond for this data volume.

### Abandoned matches
If all players disconnect before a winner is determined, no stats are recorded. This keeps data clean and avoids inflating stats from incomplete games.

---

## Implementation Phases

Each phase is independently testable. Complete one before starting the next.

### Phase 1: Database Foundation
**Goal**: SQLite database created on server startup with correct schema.

- Install `better-sqlite3` + types in `packages/server`
- Create `db/migrations.ts` — all CREATE TABLE/INDEX statements
- Create `db/database.ts` — opens `data/teeny-tanks.db`, runs migrations
- Create `db/UserRepository.ts` — CRUD operations with prepared statements
- Create `db/MatchRepository.ts` — match + match_player insert/query operations
- Add `data/` to `.gitignore`
- **Verify**: server starts, `data/teeny-tanks.db` exists, tables are correct (`sqlite3 data/teeny-tanks.db ".tables"`)

### Phase 2: Auth API (Server-Side)
**Goal**: Working registration, login, and JWT-protected Socket.IO connections.

- Install `bcrypt`, `jsonwebtoken` + types in `packages/server`
- Create `auth/authMiddleware.ts` — JWT verify function
- Create `auth/authRoutes.ts` — register, login, me handlers
- Update `index.ts` — add HTTP routing to `createServer()`, add Socket.IO `io.use()` middleware
- **Verify**: `curl -X POST localhost:3001/api/auth/register -H 'Content-Type: application/json' -d '{"username":"test","password":"test123","displayName":"Tester"}'` returns a JWT. Socket.IO connection without token is rejected.

### Phase 3: Client Auth UI
**Goal**: Players must log in before accessing the game. Full auth → room → lobby → game flow works.

- Add new shared types to `packages/shared/src/types.ts`
- Create `packages/client/src/network/ApiClient.ts`
- Create `packages/client/src/ui/AuthScreen.ts`
- Add auth screen HTML/CSS to `packages/client/index.html`
- Update `main.ts` — auth gates everything, SocketManager created after auth
- Update `SocketManager.ts` — accept token, pass in `auth` option, remove displayName from events
- Update `RoomScreen.ts` — remove name input, show logged-in user info
- Update `RoomManager.ts` — read displayName from `socket.data` instead of event payload
- Modify `ClientToServerEvents` in shared types — remove displayName from createRoom/joinRoom
- **Verify**: register a new account, log in, create room, join room from another browser, play a full game

### Phase 4: Stats Collection
**Goal**: Completed games write match records and update player stats in the database.

- Create `packages/server/src/stats/StatsCollector.ts`
- Update `GameRoom.ts` — instantiate collector, record events, flush on gameOver
- Track `userId` alongside `socket.id` throughout the game lifecycle
- **Verify**: play a game to completion, then query: `sqlite3 data/teeny-tanks.db "SELECT * FROM matches; SELECT * FROM match_players; SELECT display_name, kills, wins FROM users;"`

### Phase 5: Stats & Leaderboard UI
**Goal**: Players can view their stats, match history, and leaderboards from the room screen.

- Add API endpoints to `authRoutes.ts` (or a new `statsRoutes.ts`): `/api/stats/:userId`, `/api/leaderboard`, `/api/matches`
- Add corresponding methods to `ApiClient.ts`
- Create `StatsPanel.ts` — overlay showing logged-in user's aggregate stats
- Create `LeaderboardPanel.ts` — overlay with ranked players by various stats
- Add "My Stats" and "Leaderboard" buttons to room screen
- Optionally: show per-match stats on the game-over screen
- **Verify**: play 2+ games with 2+ accounts, confirm stats are accurate, leaderboard ranks correctly

---

## End-to-End Verification Checklist

After all phases are complete:

- [ ] `npm run build` succeeds from repo root (shared → server → client all compile)
- [ ] New account can be registered
- [ ] Existing account can log in
- [ ] Page refresh preserves login (JWT in localStorage)
- [ ] Logging out returns to auth screen
- [ ] Unauthenticated Socket.IO connections are rejected
- [ ] Display name in lobby/game comes from the user's profile, not client input
- [ ] Full game plays to completion and stats appear in DB
- [ ] Stats panel shows correct aggregate stats for the logged-in user
- [ ] Leaderboard shows players ranked correctly
- [ ] Match history shows recent games with per-player performance
- [ ] Multiple concurrent games don't interfere with each other's stats
