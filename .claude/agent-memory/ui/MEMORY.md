# UI Agent Memory

## File Locations
- All UI markup + CSS: `packages/client/index.html` (inline `<style>` with CSS custom properties)
- HUD logic: `packages/client/src/ui/HudManager.ts`
- Lobby logic: `packages/client/src/ui/LobbyManager.ts`
- Build: `npm run --workspace=@teeny-tanks/client build` (Vite)
- Type-check: `npx tsc --noEmit -p packages/client/tsconfig.json`

## Design System (Pencil-Box / Hand-Drawn Aesthetic)

### Fonts (Google Fonts)
- `--font-display`: `'Fredoka One'` -- used for titles, scores, buttons
- `--font-main`: `'Patrick Hand'` -- used for body text, labels, inputs

### Color Palette (CSS custom properties in :root)
| Token | Value | Usage |
|---|---|---|
| `--bg-page` | `#ede4d3` | Page/overlay background (warm tan) |
| `--bg-card` | `#f5f0e8` | Card/panel fill (off-white/cream) |
| `--bg-inset` | `#eae3d5` | Inset areas (team columns, player lists) |
| `--red-team` | `#b94040` | Red team primary (dusty brick red) |
| `--red-team-light` | `#e8d0cf` | Red team highlight fill |
| `--red-team-dark` | `#8c2e2e` | Red team dark (borders) |
| `--blue-team` | `#4a6fa5` | Blue team primary (slate blue) |
| `--blue-team-light` | `#cfd8e8` | Blue team highlight fill |
| `--blue-team-dark` | `#34507a` | Blue team dark (borders) |
| `--accent-yellow` | `#c9a84c` | Goldenrod accent (create room, room code badge border) |
| `--accent-green` | `#5a7a3a` | Olive/sage (ready/join buttons) |
| `--accent-orange` | `#c47530` | Warm orange (unused currently) |
| `--danger` | `#b94040` | Error/destroyed text |
| `--text-primary` | `#2c2c2c` | Dark charcoal on light backgrounds |
| `--text-secondary` | `#5a5448` | Muted body text |
| `--text-dim` | `#8a8278` | Labels, hints |
| `--border-dark` | `#2c2c2c` | Thick card/button borders |
| `--border-mid` | `#6b6358` | Lighter structural borders |

### Border & Radius Convention
- Cards/buttons: `border: 3px solid var(--border-dark)`, `border-radius: 3px`
- Inset elements: `border: 2px solid var(--border-mid)`, `border-radius: 2-3px`
- Max border-radius used anywhere: 3px (hand-drawn feel)

### Shadow Convention
- `--shadow-card`: `3px 3px 0 rgba(44,44,44,0.25)` (flat paper cutout)
- `--shadow-button`: `2px 2px 0 rgba(44,44,44,0.3)`
- NO glow shadows, NO colored shadows, NO blur shadows

### Button Interaction Pattern
- Hover: `transform: translate(-1px, -1px)` + slightly larger shadow (lift effect)
- Active: `transform: translate(1px, 1px)` + smaller shadow (press effect)
- Disabled: `opacity: 0.4`, no transform

### Animation Convention
- `killSlideIn`: translateX slide-in, 250ms -- acceptable
- `announceIn/Out`: scale bounce 1.3->1 / 1->0.9, 300ms/400ms -- acceptable
- `respawnWobble`: subtle rotate -0.5deg to 0.5deg, 2s infinite -- replaces old opacity pulse
- `spin`: standard spinner rotation, 0.8s
- NO opacity pulsing, NO glow animations

### Purged Elements (Tron/Sci-Fi)
- Removed: all `box-shadow` glows, colored `text-shadow`, `filter: drop-shadow` with glow
- Removed: gradient backgrounds on cards (replaced with flat fills)
- Removed: `background-clip: text` gradient titles (replaced with solid color)
- Removed: `Exo 2` font (replaced with Fredoka One + Patrick Hand)
- Removed: dark backgrounds (#0a0a1a, #1a1a2e, #16213e) -- now cream/tan
- Removed: neon colors (#ff4444, #4488ff, #44ff44, #ffcc00)
- Removed: `respawnPulse` opacity animation
- Removed: large border-radius (8-16px) -- now 2-3px max

### Phaser Canvas Palette (synced with DOM theme)
Arena bg: `0xede4d3`, grid: `0xc8bfaa`@0.5, border: `0x2c2c2c`@1.0 3px, center: `0x8a7f6e`.
Teams: red `0xb94040`/`0x8a2c2c`, blue `0x4a6fa5`/`0x325480`, zone alpha 0.06.
Tank outline: `0x2c2c2c`, barrel: `0x6b6358`, tip: `0x2c2c2c`, dead: `0xa09888`.
Health: bg `0xd4cbbf`, border `0x2c2c2c`, good `0x5a7a3a`, mid `0xc9a84c`, low `0xb94040`.
Flag pole: `0x6b6358`, cap `0xf5f0e8`, indicator `0xc9a84c`.
Bullet: outer `0x2c2c2c`, core `0xf5f0e8`, trail `0x6b6358`@0.6.
Purged from Phaser: glowGraphics, ground glow halos, glow fillCircles, Math.sin pulse,
  highlight bevels, corner accents, gradient zone loops, Exo 2 font.
