import { TankState, TANK_WIDTH, TANK_HEIGHT } from '@teeny-tanks/shared';

const LERP_SPEED = 0.2;

// Team color palettes
const TEAM_COLORS = {
  red: {
    fill: 0xff4444,
    fillDark: 0xcc2222,
    glow: 0xff6666,
  },
  blue: {
    fill: 0x4488ff,
    fillDark: 0x2266dd,
    glow: 0x66aaff,
  },
} as const;

const COLOR_OUTLINE_LOCAL = 0xeeeeff;
const COLOR_OUTLINE = 0x666688;
const COLOR_BARREL = 0xccccdd;
const COLOR_BARREL_TIP = 0xffcc00;
const COLOR_FLAG_INDICATOR = 0xffcc00;
const COLOR_HEALTH_BG = 0x222233;
const COLOR_HEALTH_BORDER = 0x444466;
const COLOR_HEALTH_GOOD = 0x44ff44;
const COLOR_HEALTH_MID = 0xffcc00;
const COLOR_HEALTH_LOW = 0xff4444;
const COLOR_DEAD_TINT = 0x333344;

export class TankSprite {
  private graphics: Phaser.GameObjects.Graphics;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private targetX: number;
  private targetY: number;
  private targetRotation: number;
  private label: Phaser.GameObjects.Text;
  private isLocal: boolean;

  constructor(
    private scene: Phaser.Scene,
    state: TankState,
    isLocal: boolean,
  ) {
    this.isLocal = isLocal;
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetRotation = state.rotation;

    // Glow layer (behind the tank)
    this.glowGraphics = scene.add.graphics();
    this.glowGraphics.setPosition(state.x, state.y);

    // Tank graphics
    this.graphics = scene.add.graphics();
    this.graphics.setPosition(state.x, state.y);

    // "YOU" label for local player
    this.label = scene.add.text(state.x, state.y - 32, isLocal ? 'YOU' : '', {
      fontSize: '11px',
      fontFamily: "'Exo 2', sans-serif",
      color: '#eeeeff',
      align: 'center',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.label.setOrigin(0.5, 0.5);

    this.draw(state);
  }

  private draw(state: TankState): void {
    this.graphics.clear();
    this.glowGraphics.clear();

    const team = TEAM_COLORS[state.team];
    const outlineColor = this.isLocal ? COLOR_OUTLINE_LOCAL : COLOR_OUTLINE;
    const bodyAlpha = state.alive ? 1 : 0.25;

    // Glow effect for local player
    if (this.isLocal && state.alive) {
      this.glowGraphics.fillStyle(team.glow, 0.08);
      this.glowGraphics.fillCircle(0, 0, TANK_WIDTH * 1.2);
      this.glowGraphics.fillStyle(team.glow, 0.04);
      this.glowGraphics.fillCircle(0, 0, TANK_WIDTH * 1.6);
    }

    // Tank body shadow (depth effect)
    if (state.alive) {
      this.graphics.fillStyle(0x000000, 0.3);
      this.graphics.fillRoundedRect(
        -TANK_WIDTH / 2 + 2,
        -TANK_HEIGHT / 2 + 2,
        TANK_WIDTH,
        TANK_HEIGHT,
        3,
      );
    }

    // Tank body fill with slight gradient simulation (two rects)
    const bodyColor = state.alive ? team.fill : COLOR_DEAD_TINT;
    this.graphics.fillStyle(bodyColor, bodyAlpha);
    this.graphics.fillRoundedRect(
      -TANK_WIDTH / 2,
      -TANK_HEIGHT / 2,
      TANK_WIDTH,
      TANK_HEIGHT,
      3,
    );

    // Top highlight strip (bevel effect)
    if (state.alive) {
      this.graphics.fillStyle(0xffffff, 0.1);
      this.graphics.fillRect(
        -TANK_WIDTH / 2 + 2,
        -TANK_HEIGHT / 2 + 1,
        TANK_WIDTH - 4,
        TANK_HEIGHT * 0.3,
      );
    }

    // Body outline
    this.graphics.lineStyle(2, outlineColor, bodyAlpha);
    this.graphics.strokeRoundedRect(
      -TANK_WIDTH / 2,
      -TANK_HEIGHT / 2,
      TANK_WIDTH,
      TANK_HEIGHT,
      3,
    );

    // Tread marks (left and right side)
    if (state.alive) {
      const treadWidth = 5;
      const treadColor = state.alive ? team.fillDark : COLOR_DEAD_TINT;
      this.graphics.fillStyle(treadColor, 0.8);
      this.graphics.fillRect(
        -TANK_WIDTH / 2 - 1,
        -TANK_HEIGHT / 2 + 2,
        treadWidth,
        TANK_HEIGHT - 4,
      );
      this.graphics.fillRect(
        TANK_WIDTH / 2 - treadWidth + 1,
        -TANK_HEIGHT / 2 + 2,
        treadWidth,
        TANK_HEIGHT - 4,
      );
    }

    // Barrel
    if (state.alive) {
      // Barrel shadow
      this.graphics.fillStyle(0x000000, 0.2);
      this.graphics.fillRect(TANK_WIDTH / 4, -2 + 1, TANK_WIDTH / 2 + 2, 5);

      // Barrel body
      this.graphics.fillStyle(COLOR_BARREL, bodyAlpha);
      this.graphics.fillRect(TANK_WIDTH / 4, -3, TANK_WIDTH / 2 + 2, 6);

      // Barrel tip highlight
      this.graphics.fillStyle(COLOR_BARREL_TIP, 0.6);
      this.graphics.fillRect(TANK_WIDTH / 4 + TANK_WIDTH / 2 - 2, -3, 4, 6);
    }

    // Flag indicator (pulsing yellow dot above tank)
    if (state.hasFlag && state.alive) {
      const pulseAlpha = 0.7 + 0.3 * Math.sin(Date.now() * 0.006);
      this.graphics.fillStyle(COLOR_FLAG_INDICATOR, pulseAlpha);
      this.graphics.fillCircle(0, -TANK_HEIGHT / 2 - 10, 6);
      this.graphics.lineStyle(1, 0xffffff, pulseAlpha * 0.5);
      this.graphics.strokeCircle(0, -TANK_HEIGHT / 2 - 10, 6);

      // Glow around flag indicator
      this.graphics.fillStyle(COLOR_FLAG_INDICATOR, 0.15);
      this.graphics.fillCircle(0, -TANK_HEIGHT / 2 - 10, 12);
    }

    // Health bar
    if (state.alive) {
      const barWidth = TANK_WIDTH + 4;
      const barHeight = 5;
      const barY = TANK_HEIGHT / 2 + 6;
      const healthPct = state.health / 3;

      // Background
      this.graphics.fillStyle(COLOR_HEALTH_BG);
      this.graphics.fillRoundedRect(-barWidth / 2, barY, barWidth, barHeight, 2);

      // Border
      this.graphics.lineStyle(1, COLOR_HEALTH_BORDER);
      this.graphics.strokeRoundedRect(-barWidth / 2, barY, barWidth, barHeight, 2);

      // Health fill
      let healthColor = COLOR_HEALTH_GOOD;
      if (healthPct <= 0.33) healthColor = COLOR_HEALTH_LOW;
      else if (healthPct <= 0.66) healthColor = COLOR_HEALTH_MID;

      const fillWidth = Math.max(0, (barWidth - 2) * healthPct);
      if (fillWidth > 0) {
        this.graphics.fillStyle(healthColor);
        this.graphics.fillRoundedRect(
          -barWidth / 2 + 1,
          barY + 1,
          fillWidth,
          barHeight - 2,
          1,
        );

        // Health bar highlight
        this.graphics.fillStyle(0xffffff, 0.2);
        this.graphics.fillRect(
          -barWidth / 2 + 1,
          barY + 1,
          fillWidth,
          1,
        );
      }
    }
  }

  syncTo(state: TankState): void {
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetRotation = state.rotation;

    // Lerp position for smooth movement
    const currentX = this.graphics.x;
    const currentY = this.graphics.y;
    const newX = currentX + (this.targetX - currentX) * LERP_SPEED;
    const newY = currentY + (this.targetY - currentY) * LERP_SPEED;

    this.graphics.setPosition(newX, newY);
    this.graphics.rotation = this.targetRotation;

    this.glowGraphics.setPosition(newX, newY);
    this.glowGraphics.rotation = this.targetRotation;

    // Update label position (stays above tank, not rotated)
    this.label.setPosition(newX, newY - 32);

    this.draw(state);
  }

  destroy(): void {
    this.graphics.destroy();
    this.glowGraphics.destroy();
    this.label.destroy();
  }
}
