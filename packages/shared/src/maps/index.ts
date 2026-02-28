// ─── Active Map ───────────────────────────────────────────────────────────────
// Change the import below to switch which board is loaded by both server and client.
// Each game board file is self-contained — walls, name, and any future map properties.
//
// Available maps:
//   ClassicSimpleBoard  →  GAME_BOARD  (two flag barriers, open midfield)
// ─────────────────────────────────────────────────────────────────────────────

export { GAME_BOARD as ACTIVE_MAP } from './ClassicSimpleBoard.js';
