# Client Package

`packages/client` — the Phaser 3 browser client, bundled by Vite.

## Bootstrap (`main.ts`)

The entry point creates all managers and wires them together:

1. **SocketManager** — connects to the server
2. **RoomScreen** — DOM overlay for creating/joining rooms
3. **LobbyManager** — DOM overlay for team setup
4. **HudManager** — in-game DOM overlays (scores, kill feed, announcements)
5. **Phaser.Game** — initialized with `BootScene` and `GameScene`

### Wiring Flow

```
RoomScreen
  ├─ onCreate → socket.createRoom() → onRoomCreated → show LobbyManager
  └─ onJoin   → socket.joinRoom()   → onRoomJoined  → show LobbyManager

LobbyManager
  └─ onStart → socket.startGame() → onGameStarted → show Phaser canvas + HUD

GameScene
  └─ reads socket state each tick → renders game
  └─ sends InputManager state to socket at 20 Hz

SocketManager
  ├─ onKill         → scene.showKillFeed()
  ├─ onFlagCapture  → scene.showAnnouncement() + hud.updateScores()
  └─ onGameOver     → hud.showGameOver()
```

### Phaser Config

```typescript
{
  type: Phaser.CANVAS,
  width: VIEWPORT_WIDTH,   // from active map (500)
  height: VIEWPORT_HEIGHT, // from active map (700)
  backgroundColor: '#f5f0e8',  // warm paper color
  scene: [BootScene, GameScene],
  physics: { default: 'arcade' }  // arcade physics enabled but unused
}
```

The Phaser canvas starts hidden (`display: none`) and is shown when the game starts.

---

## Scenes

### BootScene (`scenes/BootScene.ts`)

Minimal scene that immediately transitions to `GameScene`. Exists as a placeholder for future asset loading.

### GameScene (`scenes/GameScene.ts`)

The main rendering scene. All game visuals are drawn here.

#### Arena Drawing

The arena is drawn once on scene creation using Phaser Graphics:

1. **Grid background** — light lines every 40px across the full arena
2. **Team zones** — semi-transparent colored rectangles at top (red, 120px tall) and bottom (blue, 120px tall)
3. **Respawn markers** — small circles with crosshair lines at each respawn position
4. **Center line** — horizontal dashed line at the arena midpoint
5. **Center circle** — decorative circle at dead center
6. **Interior walls** — each wall drawn with:
   - Drop shadow (offset down-right)
   - Filled rectangle (warm grey)
   - Darker outline stroke
   - Top-edge highlight line
7. **Arena border** — thick charcoal stroke around the full arena

#### Sprite Management

The scene maintains three sprite maps keyed by entity ID:

| Map | Key | Sprite Class |
|-----|-----|-------------|
| `tankSprites` | socket ID (string) | `TankSprite` |
| `projectileSprites` | projectile ID (number) | `ProjectileSprite` |
| `flagSprites` | team name (string) | `FlagSprite` |

Each frame, the scene reads `socketManager.latestState` and:
1. **Creates** sprites for new entities
2. **Updates** existing sprites with new positions/state
3. **Destroys** sprites for entities no longer in state

#### Input Polling

An `InputManager` is created on scene start. Every `TICK_INTERVAL` (50ms), a Phaser timer event fires that:
1. Reads current keyboard state from `InputManager`
2. Sends the `PlayerInput` to the server via `socketManager.sendInput()`

#### Camera

- **Bounds**: set to full arena dimensions
- **Follow**: tracks the local player's tank sprite
- **Lerp**: `CAMERA_LERP` (0.1) for smooth tracking
- **Deadzone**: centered region where camera doesn't move (reduces jitter)

#### Event Display

- **Kill feed**: calls `hudManager.addKillEntry()` with killer/victim names and teams
- **Flag capture announcements**: calls `hudManager.showAnnouncement()` with team-colored text
- **Respawn overlay**: shows/hides based on local tank's health (0 = show "Destroyed")
- **Score updates**: updates HUD score bar after each state tick

---

## Entities (Sprites)

### TankSprite (`entities/TankSprite.ts`)

The most complex sprite. Draws a tank procedurally using Phaser Graphics.

#### Visual Layers (drawn bottom-up)

1. **Flag carrier aura** — pulsing ring in the enemy team's color (only when carrying flag)
2. **Body shadow** — dark rounded rectangle, offset down-right
3. **Treads** — 5 rectangular segments per side, darker than body, with gaps between
4. **Body** — rounded rectangle in team color
5. **Body outline** — darker stroke around body
6. **Panel highlight** — lighter rectangle on the upper portion
7. **Rivets** — 4 small dots near corners
8. **Turret dome** — filled circle at center
9. **Turret barrel** — tapered rectangle extending from center toward facing direction
10. **Mini flag** — small flag icon on the right side when carrying (bobbing animation)
11. **Name label** — Phaser Text above tank with player name

#### Dead State

When health = 0, the tank is drawn as a faded ghost:
- Alpha reduced to 0.25
- No aura, no flag indicator
- Same shape but visually "ghosted out"

#### Interpolation

Position updates use linear interpolation (`LERP_SPEED = 0.3`) for smooth movement between server ticks. If the delta between current and target position exceeds `SNAP_THRESHOLD` (100px), the tank snaps immediately (e.g., on respawn or map reset).

Rotation interpolation uses shortest-arc logic to prevent spinning the wrong way around.

### ProjectileSprite (`entities/ProjectileSprite.ts`)

Simple circle drawn with Phaser Graphics:

- **Outer ring**: charcoal color, radius 3px
- **Inner dot**: cream/off-white, radius 1.5px
- **Trail line**: 8px line extending behind the bullet in the opposite direction of travel

Position is set directly from server state (no interpolation — bullets move fast enough that lerping isn't needed).

### FlagSprite (`entities/FlagSprite.ts`)

Two visual elements:

**Capture zone** (always drawn):
- Circle outline in team color
- Semi-transparent fill
- Small dots around the perimeter

**Flag on ground** (only when not carried):
- Vertical pole (warm grey line)
- Triangular pennant in team color
- Small base platform

When a flag is being carried, only the capture zone is rendered — the flag itself is represented by the carrier's mini-flag indicator on `TankSprite`.

---

## Input (`input/InputManager.ts`)

Captures keyboard state each frame:

| Key | Action |
|-----|--------|
| `W` / `ArrowUp` | `up` — move forward |
| `S` / `ArrowDown` | `down` — move backward (60% speed) |
| `A` / `ArrowLeft` | `left` — rotate counter-clockwise |
| `D` / `ArrowRight` | `right` — rotate clockwise |
| `Space` | `shoot` — fire bullet |

Returns a `PlayerInput` object with boolean flags. The scene polls this at 20 Hz and sends to the server.

---

## UI Managers

All UI is rendered as HTML/CSS overlays on top of the Phaser canvas. The overlay elements are defined in `index.html` with styling inline.

### RoomScreen (`ui/RoomScreen.ts`)

The initial screen shown when the page loads.

**Create Room**:
- Text input for display name
- "Create Room" button
- Validates: name must not be empty

**Join Room**:
- Text input for display name
- Text input for 4-letter room code (auto-uppercased, non-letters filtered)
- "Join Room" button
- Validates: name must not be empty, code must be exactly 4 characters

**Error display**: red text below the form for invalid input or server errors (room not found, room full).

### LobbyManager (`ui/LobbyManager.ts`)

Three-column layout for team assignment.

```
┌──────────┬──────────────┬──────────┐
│   RED    │  Unassigned  │   BLUE   │
│          │              │          │
│ [player] │   [player]   │ [player] │
│ [player] │              │ [player] │
└──────────┴──────────────┴──────────┘
         [ Score Limit: 3 ]
           [ Start Game ]
```

**Player chips**: show player name + host badge (if host). Host sees arrow buttons to move players between columns.

**Score limit**: `+`/`-` buttons (host only) to adjust between 1–20.

**Start button**: host only, emits `startGame` event.

Non-host players see a "Waiting for host..." spinner instead of controls.

### HudManager (`ui/HudManager.ts`)

In-game heads-up display elements.

**Score bar** (top center):
```
┌───────────────────────────┐
│   Red: 2 / 3  VS  Blue: 1 / 3   │
└───────────────────────────┘
```

**Kill feed** (top right):
- Max 5 entries visible
- Each entry shows: `[killer name] ► [victim name]` with team colors
- Entries slide in from the right, auto-remove after 4 seconds

**Respawn overlay** (center screen):
- Large "DESTROYED" text with wobble animation
- Only visible when local player's tank health = 0

**Announcements** (center screen):
- Large team-colored text (e.g., "Red Team Captured the Flag!")
- Visible for 2.5 seconds, centered horizontally

**Game over overlay** (full screen):
- Title: "Game Over"
- Winning team + final score
- "Return to Lobby" button

---

## Styling

All CSS is embedded in `index.html`. The visual design follows a "pencil-box" / hand-drawn aesthetic:

**Color palette**:
- Background: `#f5f0e8` (warm paper)
- Text: `#4a4a4a` (charcoal)
- Red team: `#b94040`
- Blue team: `#4a6fa5`
- Accents: `#d4a574` (warm tan)

**Fonts**:
- Display/headings: `Fredoka One` (Google Fonts)
- Body/UI: `Patrick Hand` (Google Fonts)

**Common patterns**:
- Rounded corners (`border-radius`)
- Subtle borders (warm tan or charcoal)
- No heavy shadows or gradients
- Button hover: slight scale transform + brightness

---

## Vite Configuration (`vite.config.ts`)

- **Dev server**: port 5173
- **Proxy**: `/socket.io` → `http://localhost:3001` (WebSocket-aware)
- **Code splitting**: Phaser is split into a separate chunk (`vendor-phaser`) for better caching
- **Manual chunks**: `phaser` and any `phaser/` imports bundled together
