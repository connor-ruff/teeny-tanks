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
- Fonts: Fredoka One (display) + Patrick Hand (body) via Google Fonts
- Phaser version: 3.87+
- Aesthetic: pencil-box / hand-drawn / early-web (cream backgrounds, thick dark borders, flat paper shadows, muted crayon colors)

## Phaser Canvas Color Palette (pencil-box theme)
All Phaser source files now use these constants. Keep them in sync.

### Backgrounds & Arena
- Paper background: `#ede4d3` / `0xede4d3` (warm cream, set in main.ts Phaser config)
- Grid lines: `0xc8bfaa` at 0.5 alpha (light warm grey, graph-paper look)
- Arena border: `0x2c2c2c` at 1.0, 3px stroke (dark charcoal)
- Center line: `0x8a7f6e` at 0.6 (warm charcoal, dashed)
- Center circle: `0x8a7f6e` at 0.5

### Team Colors
- Red team fill: `0xb94040` / dark: `0x8a2c2c`
- Blue team fill: `0x4a6fa5` / dark: `0x325480`
- Team zone alpha: 0.06 (very subtle flat tint)
- CSS team colors (announcements): `#b94040` (red), `#4a6fa5` (blue)

### Tank Details
- Outline (all tanks): `0x2c2c2c`
- Barrel: `0x6b6358` (warm grey), tip: `0x2c2c2c`
- Flag indicator: `0xc9a84c` (goldenrod), static, thick dark outline
- Dead tint: `0xa09888`
- "YOU" label: Fredoka One, color `#2c2c2c`, stroke `#ede4d3`
- No glow layer, no highlight strip, no pulsing effects

### Health Bar
- BG: `0xd4cbbf`, border: `0x2c2c2c`
- Good: `0x5a7a3a` (olive), Mid: `0xc9a84c` (goldenrod), Low: `0xb94040` (brick red)

### Flag & Capture Zone
- Pole: `0x6b6358`, cap: `0xf5f0e8`
- Zone ring: `0x2c2c2c` at 0.3 alpha
- No ground glow, no highlight stripe

### Projectile
- Outer body: `0x2c2c2c` (dark charcoal pencil dot)
- Core: `0xf5f0e8` (cream)
- Trail: `0x6b6358` at 0.6 alpha, 2px width
- No glow circles

### Common Neutral Colors
- Dark charcoal (outlines, borders): `0x2c2c2c`
- Warm grey (barrels, poles, trails): `0x6b6358`
- Off-white/cream (highlights, cores): `0xf5f0e8`
- Paper shadow: `0x000000` at 0.2-0.3 alpha, 2px offset

## Purged Elements (do NOT reintroduce)
- `glowGraphics` layer on TankSprite
- Ground glow halos on FlagSprite
- Glow fillCircle on ProjectileSprite
- `Math.sin` pulse alpha on flag indicator
- Top highlight bevel strip on tank body
- Health bar highlight strip
- Flag highlight triangle
- Corner accents on arena border
- Gradient loops for team zones (replaced with single flat rect)
- All neon hex values: `0xff4444`, `0x4488ff`, `0x44ff44`, `0xffcc00`
- All dark navy backgrounds: `0x0a0a1a`, `0x1a1a2e`, `0x151530`, `0x222244`, `0x222233`, `0x444466`, `0x333355`
- Exo 2 font (replaced with Fredoka One)
