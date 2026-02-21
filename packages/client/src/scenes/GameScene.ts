import Phaser from 'phaser';
import { GameState, ARENA_WIDTH, ARENA_HEIGHT, TICK_INTERVAL, Team } from '@teeny-tanks/shared';
import { SocketManager } from '../network/SocketManager.js';
import { HudManager } from '../ui/HudManager.js';
import { InputManager } from '../input/InputManager.js';
import { TankSprite } from '../entities/TankSprite.js';
import { ProjectileSprite } from '../entities/ProjectileSprite.js';
import { FlagSprite } from '../entities/FlagSprite.js';

// Colors matching the CSS custom properties
const COLOR_BG_DARK = 0x0a0a1a;
const COLOR_BG_MID = 0x1a1a2e;
const COLOR_GRID = 0x151530;
const COLOR_BORDER = 0x333355;
const COLOR_CENTER_LINE = 0x222244;
const COLOR_RED_ZONE = 0xff4444;
const COLOR_BLUE_ZONE = 0x4488ff;

export class GameScene extends Phaser.Scene {
  private socketManager!: SocketManager;
  private hudManager!: HudManager;
  private inputManager!: InputManager;
  private tankSprites = new Map<string, TankSprite>();
  private projectileSprites = new Map<string, ProjectileSprite>();
  private flagSprites = new Map<string, FlagSprite>();
  private inputTimer = 0;
  private localAlive = true;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.socketManager = this.registry.get('socketManager') as SocketManager;
    this.hudManager = this.registry.get('hudManager') as HudManager;
    this.inputManager = new InputManager(this);

    this.drawArena();

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

      // Shorten IDs for display
      const killerName = data.killerId.slice(0, 6);
      const victimName = data.victimId.slice(0, 6);

      this.hudManager.addKillEntry(killerTeam, victimTeam, killerName, victimName);

      // Show respawn overlay if local player was killed
      if (data.victimId === this.socketManager.playerId) {
        this.hudManager.setRespawnVisible(true);
      }
    });

    // Handle flag capture events
    this.socketManager.onFlagCapture((data) => {
      const color = data.team === 'red'
        ? 'var(--red-team, #ff4444)'
        : 'var(--blue-team, #4488ff)';
      const teamName = data.team === 'red' ? 'RED' : 'BLUE';
      this.hudManager.showAnnouncement(
        `${teamName} TEAM CAPTURES THE FLAG!`,
        data.team === 'red' ? '#ff4444' : '#4488ff'
      );
    });
  }

  private drawArena(): void {
    const bg = this.add.graphics();

    // Subtle grid pattern
    bg.lineStyle(1, COLOR_GRID, 0.4);
    const gridSize = 40;
    for (let x = 0; x <= ARENA_WIDTH; x += gridSize) {
      bg.lineBetween(x, 0, x, ARENA_HEIGHT);
    }
    for (let y = 0; y <= ARENA_HEIGHT; y += gridSize) {
      bg.lineBetween(0, y, ARENA_WIDTH, y);
    }

    // Team zone gradients (subtle tinted areas near each base)
    const zoneGfx = this.add.graphics();
    // Red zone (left side)
    for (let i = 0; i < 8; i++) {
      const alpha = 0.03 * (8 - i) / 8;
      zoneGfx.fillStyle(COLOR_RED_ZONE, alpha);
      zoneGfx.fillRect(0, 0, 80 + i * 20, ARENA_HEIGHT);
    }
    // Blue zone (right side)
    for (let i = 0; i < 8; i++) {
      const alpha = 0.03 * (8 - i) / 8;
      zoneGfx.fillStyle(COLOR_BLUE_ZONE, alpha);
      zoneGfx.fillRect(ARENA_WIDTH - 80 - i * 20, 0, 80 + i * 20, ARENA_HEIGHT);
    }

    // Center line with dashes
    const centerGfx = this.add.graphics();
    centerGfx.lineStyle(2, COLOR_CENTER_LINE, 0.6);
    const dashLen = 12;
    const gapLen = 8;
    const centerX = ARENA_WIDTH / 2;
    for (let y = 0; y < ARENA_HEIGHT; y += dashLen + gapLen) {
      centerGfx.lineBetween(centerX, y, centerX, Math.min(y + dashLen, ARENA_HEIGHT));
    }

    // Center circle
    centerGfx.lineStyle(1, COLOR_CENTER_LINE, 0.4);
    centerGfx.strokeCircle(centerX, ARENA_HEIGHT / 2, 60);

    // Arena border (thick, clean)
    const border = this.add.graphics();
    border.lineStyle(3, COLOR_BORDER, 0.8);
    border.strokeRect(1, 1, ARENA_WIDTH - 2, ARENA_HEIGHT - 2);

    // Corner accents
    const cornerSize = 20;
    const accentGfx = this.add.graphics();
    accentGfx.lineStyle(2, COLOR_BORDER, 0.5);
    // Top-left
    accentGfx.lineBetween(0, cornerSize, 0, 0);
    accentGfx.lineBetween(0, 0, cornerSize, 0);
    // Top-right
    accentGfx.lineBetween(ARENA_WIDTH, cornerSize, ARENA_WIDTH, 0);
    accentGfx.lineBetween(ARENA_WIDTH, 0, ARENA_WIDTH - cornerSize, 0);
    // Bottom-left
    accentGfx.lineBetween(0, ARENA_HEIGHT - cornerSize, 0, ARENA_HEIGHT);
    accentGfx.lineBetween(0, ARENA_HEIGHT, cornerSize, ARENA_HEIGHT);
    // Bottom-right
    accentGfx.lineBetween(ARENA_WIDTH, ARENA_HEIGHT - cornerSize, ARENA_WIDTH, ARENA_HEIGHT);
    accentGfx.lineBetween(ARENA_WIDTH, ARENA_HEIGHT, ARENA_WIDTH - cornerSize, ARENA_HEIGHT);
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

      // Track local player alive state for respawn overlay
      if (id === localId) {
        if (!this.localAlive && tankState.alive) {
          this.hudManager.setRespawnVisible(false);
        }
        this.localAlive = tankState.alive;
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
