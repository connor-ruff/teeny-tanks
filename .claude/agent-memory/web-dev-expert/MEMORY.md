# Teeny Tanks - Agent Memory

## Project Structure
- Monorepo with `packages/shared`, `packages/server`, `packages/client`
- Shared must be built before server/client: `npm run build -w packages/shared`
- Full build: `npm run build` (chains shared -> server -> client)
- Dev: `npm run dev` (concurrently runs server and client)

## Architecture
- **Server**: Node.js + Socket.IO on port 3001, uses `RoomManager` to manage multiple `GameRoom` instances
- **Client**: Vite + Phaser 3 on port 5173, DOM-based UI overlays for lobby/HUD
- **Shared**: TypeScript types, Socket.IO event contracts, game constants

## Key Patterns
- Socket.IO events are typed via `ClientToServerEvents` / `ServerToClientEvents` in shared
- Game rooms use Socket.IO rooms for scoped broadcasting (`io.to(roomCode).emit(...)`)
- Client uses callback arrays for event subscriptions (e.g., `onState`, `onAssignment`)
- DOM UI managers (`RoomScreen`, `LobbyManager`, `HudManager`) query elements by ID from `index.html`
- Phaser scenes access managers via `game.registry.set/get`
- CSS uses custom properties extensively (see `:root` in `index.html`)

## Room System
- Room codes: 4 uppercase letters (excluding I, O to avoid confusion)
- Flow: Room Screen -> Lobby (with room code badge) -> Game
- Server: `RoomManager` creates/destroys `GameRoom` instances; empty rooms auto-cleanup
- Client: `RoomScreen` handles create/join UI; `SocketManager` emits `createRoom`/`joinRoom`

## Game Loop
- Server-authoritative at 20 ticks/sec (`TICK_RATE = 20`)
- Systems: PhysicsSystem, ProjectileSystem, FlagSystem (run sequentially each tick)
- Client interpolates with lerp (`LERP_SPEED = 0.2`)

## File Naming
- Entities: `packages/server/src/entities/` (Tank.ts, Projectile.ts, Flag.ts)
- Systems: `packages/server/src/systems/` (PhysicsSystem.ts, ProjectileSystem.ts, FlagSystem.ts)
- Client entities: `packages/client/src/entities/` (*Sprite.ts files)
- Client UI: `packages/client/src/ui/` (RoomScreen.ts, LobbyManager.ts, HudManager.ts)

## Gameplay Rules (Finalized Specs)
- 2 teams (Red/Blue), 1–5 players each
- **Map is VERTICAL**: flags at north/south (top/bottom), NOT east/west — all coordinate logic must use Y-axis for team sides
- 1 bullet kills any tank (including self/teammates — friendly fire always on)
- Bullets bounce off all 4 edges; expire by time OR on tank hit
- Score = return enemy flag to your flag spawn; map resets instantly on each point
- End-game: first to target score (configurable, typically 3 or 5); server emits `gameOver` event
- Respawn: near home base after brief cooldown
