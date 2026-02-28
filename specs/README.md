# Teeny Tanks — Technical Documentation

This folder contains the technical documentation for the teeny-tanks project. Each document covers a specific area of the codebase.

## Documents

| File | Description |
|------|-------------|
| [gameplay.md](gameplay.md) | Game rules, objectives, and mechanics |
| [architecture.md](architecture.md) | High-level architecture, tech stack, data flow, and project structure |
| [shared-package.md](shared-package.md) | Shared types, constants, and map definitions |
| [server.md](server.md) | Server entry point, room management, game loop, entities, and systems |
| [client.md](client.md) | Client rendering, scenes, sprites, input, and UI managers |
| [networking.md](networking.md) | Socket.IO protocol, events, state serialization, and data flow |

## Quick Reference

- **Monorepo**: 3 npm workspace packages — `shared`, `server`, `client`
- **Build order**: `shared` → `server` → `client` (run `npm run build` from root)
- **Server**: Node.js + Socket.IO on port 3001
- **Client**: Phaser 3 + Vite on port 5173 (dev), proxied to server
- **Game loop**: Server-authoritative at 20 Hz (50ms tick)
