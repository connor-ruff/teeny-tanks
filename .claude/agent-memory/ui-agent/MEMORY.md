# UI Agent Memory

See the shared UI memory at `../.claude/agent-memory/ui/MEMORY.md` for the canonical reference.
This file mirrors key points for the ui-agent workspace.

## Quick Reference
- Client code: `packages/client/src/`
- CSS theme: `packages/client/index.html` (inline `<style>` with CSS custom properties)
- HUD: DOM-based (`packages/client/src/ui/HudManager.ts`)
- Lobby: DOM-based (`packages/client/src/ui/LobbyManager.ts`)
- Build: `npm run --workspace=@teeny-tanks/client build` (Vite)
- Type-check: `npx tsc --noEmit -p packages/client/tsconfig.json`
- Font: Exo 2 (Google Fonts)
- Phaser version: 3.87+
