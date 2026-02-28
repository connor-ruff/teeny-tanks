import Phaser from 'phaser';
import { GameState, ARENA_WIDTH, ARENA_HEIGHT, TICK_INTERVAL, Team, ACTIVE_MAP } from '@teeny-tanks/shared';
import { SocketManager } from '../network/SocketManager.js';
import { HudManager } from '../ui/HudManager.js';
import { InputManager } from '../input/InputManager.js';
import { TankSprite } from '../entities/TankSprite.js';
import { ProjectileSprite } from '../entities/ProjectileSprite.js';
import { FlagSprite } from '../entities/FlagSprite.js';
import { CAMERA_LERP, CAMERA_DEADZONE_WIDTH, CAMERA_DEADZONE_HEIGHT } from '../constants.js';

// Warm paper / pencil-box palette
const COLOR_GRID = 0xc8bfaa;
const COLOR_BORDER = 0x2c2c2c;
const COLOR_CENTER_LINE = 0x8a7f6e;
const COLOR_RED_ZONE = 0xb94040;
const COLOR_BLUE_ZONE = 0x4a6fa5;
const COLOR_WALL_FILL = 0xc9b99a;
const COLOR_WALL_STROKE = 0x2c2c2c;

export class GameScene extends Phaser.Scene {
  private socketManager!: SocketManager;
  private hudManager!: HudManager;
  private inputManager!: InputManager;
  private tankSprites = new Map<string, TankSprite>();
  private projectileSprites = new Map<string, ProjectileSprite>();
  private flagSprites = new Map<string, FlagSprite>();
  private inputTimer = 0;
  private localAlive = true;
  private cameraTarget: Phaser.GameObjects.Rectangle | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.socketManager = this.registry.get('socketManager') as SocketManager;
    this.hudManager = this.registry.get('hudManager') as HudManager;
    this.inputManager = new InputManager(this);

    this.drawArena();

    // Camera world bounds — arena is larger than the viewport so the camera
    // follows the local player's tank within these limits.
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

    // Create flag sprites
    this.flagSprites.set('red', new FlagSprite(this, 'red'));
    this.flagSprites.set('blue', new FlagSprite(this, 'blue'));

    // Handle state updates
    this.socketManager.onState((state: GameState) => {
      this.syncState(state);
    });

    // Handle kill events for the kill feed
    this.socketManager.onKill((data) => {
      const state = this.socketManager.latestState;
      if (!state) return;

      const killerTank = state.tanks[data.killerId];
      const victimTank = state.tanks[data.victimId];
      const killerTeam: Team = killerTank?.team ?? 'red';
      const victimTeam: Team = victimTank?.team ?? 'blue';

      // Use display names, falling back to truncated IDs
      const killerName = killerTank?.displayName || data.killerId.slice(0, 6);
      const victimName = victimTank?.displayName || data.victimId.slice(0, 6);

      this.hudManager.addKillEntry(killerTeam, victimTeam, killerName, victimName);

      // Show respawn overlay if local player was killed
      if (data.victimId === this.socketManager.playerId) {
        this.hudManager.setRespawnVisible(true);
      }
    });

    // Handle flag capture events
    this.socketManager.onFlagCapture((data) => {
      const color = data.team === 'red'
        ? 'var(--red-team, #b94040)'
        : 'var(--blue-team, #4a6fa5)';
      const teamName = data.team === 'red' ? 'RED' : 'BLUE';
      this.hudManager.showAnnouncement(
        `${teamName} TEAM CAPTURES THE FLAG!`,
        data.team === 'red' ? '#b94040' : '#4a6fa5'
      );
    });
  }

  private drawArena(): void {
    const bg = this.add.graphics();

    // Graph-paper grid lines
    bg.lineStyle(1, COLOR_GRID, 0.5);
    const gridSize = 40;
    for (let x = 0; x <= ARENA_WIDTH; x += gridSize) {
      bg.lineBetween(x, 0, x, ARENA_HEIGHT);
    }
    for (let y = 0; y <= ARENA_HEIGHT; y += gridSize) {
      bg.lineBetween(0, y, ARENA_WIDTH, y);
    }

    // Team zones (flat, subtle tinted rectangles at north/south — vertical map layout)
    const zoneGfx = this.add.graphics();
    // Red zone (top/north)
    zoneGfx.fillStyle(COLOR_RED_ZONE, 0.06);
    zoneGfx.fillRect(0, 0, ARENA_WIDTH, 120);
    // Blue zone (bottom/south)
    zoneGfx.fillStyle(COLOR_BLUE_ZONE, 0.06);
    zoneGfx.fillRect(0, ARENA_HEIGHT - 120, ARENA_WIDTH, 120);

    // Respawn position markers (subtle circles behind everything else)
    const respawnGfx = this.add.graphics();
    const RESPAWN_MARKER_RADIUS = 14;
    const RESPAWN_MARKER_COLOR = 0xc8bfaa; // same warm grey as grid lines
    const RESPAWN_MARKER_ALPHA = 0.6;
    for (const pos of ACTIVE_MAP.redRespawnPositions) {
      respawnGfx.lineStyle(1.5, RESPAWN_MARKER_COLOR, RESPAWN_MARKER_ALPHA);
      respawnGfx.strokeCircle(pos.x, pos.y, RESPAWN_MARKER_RADIUS);
      // Small cross-hair inside
      respawnGfx.lineStyle(1, RESPAWN_MARKER_COLOR, RESPAWN_MARKER_ALPHA * 0.7);
      respawnGfx.lineBetween(pos.x - 5, pos.y, pos.x + 5, pos.y);
      respawnGfx.lineBetween(pos.x, pos.y - 5, pos.x, pos.y + 5);
    }
    for (const pos of ACTIVE_MAP.blueRespawnPositions) {
      respawnGfx.lineStyle(1.5, RESPAWN_MARKER_COLOR, RESPAWN_MARKER_ALPHA);
      respawnGfx.strokeCircle(pos.x, pos.y, RESPAWN_MARKER_RADIUS);
      // Small cross-hair inside
      respawnGfx.lineStyle(1, RESPAWN_MARKER_COLOR, RESPAWN_MARKER_ALPHA * 0.7);
      respawnGfx.lineBetween(pos.x - 5, pos.y, pos.x + 5, pos.y);
      respawnGfx.lineBetween(pos.x, pos.y - 5, pos.x, pos.y + 5);
    }

    // Center line with horizontal dashes (divides north/south teams)
    const centerGfx = this.add.graphics();
    centerGfx.lineStyle(2, COLOR_CENTER_LINE, 0.6);
    const dashLen = 12;
    const gapLen = 8;
    const centerY = ARENA_HEIGHT / 2;
    for (let x = 0; x < ARENA_WIDTH; x += dashLen + gapLen) {
      centerGfx.lineBetween(x, centerY, Math.min(x + dashLen, ARENA_WIDTH), centerY);
    }

    // Center circle
    centerGfx.lineStyle(1, COLOR_CENTER_LINE, 0.5);
    centerGfx.strokeCircle(ARENA_WIDTH / 2, centerY, 60);

    // Interior walls
    const wallGfx = this.add.graphics();
    for (const wall of ACTIVE_MAP.walls) {
      const { x, y, width: w, height: h } = wall;

      // Drop shadow (offset 2px down-right, 15% black)
      wallGfx.fillStyle(0x000000, 0.15);
      wallGfx.fillRect(x + 2, y + 2, w, h);

      // Fill
      wallGfx.fillStyle(COLOR_WALL_FILL, 1);
      wallGfx.fillRect(x, y, w, h);

      // Charcoal outline
      wallGfx.lineStyle(1.5, COLOR_WALL_STROKE, 1);
      wallGfx.strokeRect(x, y, w, h);

      // Subtle inner highlight on top and left edges
      wallGfx.lineStyle(1, 0xffffff, 0.3);
      wallGfx.lineBetween(x, y, x + w, y);       // top edge
      wallGfx.lineBetween(x, y, x, y + h);       // left edge
    }

    // Arena border (thick hand-drawn charcoal stroke)
    const border = this.add.graphics();
    border.lineStyle(3, COLOR_BORDER, 1);
    border.strokeRect(1, 1, ARENA_WIDTH - 2, ARENA_HEIGHT - 2);
  }

  update(_time: number, delta: number): void {
    // Send input at tick rate
    this.inputTimer += delta;
    if (this.inputTimer >= TICK_INTERVAL) {
      this.inputTimer -= TICK_INTERVAL;
      const input = this.inputManager.getInput();
      this.socketManager.sendInput(input);
    }
  }

  private syncState(state: GameState): void {
    const localId = this.socketManager.playerId;

    // Update/create tanks
    const activeTankIds = new Set(Object.keys(state.tanks));
    for (const [id, tankState] of Object.entries(state.tanks)) {
      const existing = this.tankSprites.get(id);
      if (existing) {
        existing.syncTo(tankState);
      } else {
        const sprite = new TankSprite(this, tankState, id === localId);
        this.tankSprites.set(id, sprite);
      }

      // Track local player alive state for respawn overlay + camera follow
      if (id === localId) {
        if (!this.localAlive && tankState.alive) {
          this.hudManager.setRespawnVisible(false);
        }
        this.localAlive = tankState.alive;

        // Camera follows the local player's interpolated tank position
        const tank = this.tankSprites.get(id)!;
        if (this.cameraTarget === null) {
          this.cameraTarget = this.add.rectangle(tank.x, tank.y, 1, 1, 0x000000, 0);
          this.cameras.main.startFollow(this.cameraTarget, true, CAMERA_LERP, CAMERA_LERP);
          this.cameras.main.setDeadzone(CAMERA_DEADZONE_WIDTH, CAMERA_DEADZONE_HEIGHT);
        } else {
          this.cameraTarget.setPosition(tank.x, tank.y);
        }
      }
    }

    // Remove disconnected tanks
    for (const [id, sprite] of this.tankSprites) {
      if (!activeTankIds.has(id)) {
        sprite.destroy();
        this.tankSprites.delete(id);
      }
    }

    // Update/create projectiles
    const activeProjectileIds = new Set(state.projectiles.map((p) => p.id));
    for (const projState of state.projectiles) {
      const existing = this.projectileSprites.get(projState.id);
      if (existing) {
        existing.syncTo(projState);
      } else {
        const sprite = new ProjectileSprite(this, projState);
        this.projectileSprites.set(projState.id, sprite);
      }
    }

    // Remove expired projectiles
    for (const [id, sprite] of this.projectileSprites) {
      if (!activeProjectileIds.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    }

    // Update flags
    this.flagSprites.get('red')?.syncTo(state.flags.red);
    this.flagSprites.get('blue')?.syncTo(state.flags.blue);

    // Update HUD scores
    this.hudManager.updateScores(state.scores);
  }
}
