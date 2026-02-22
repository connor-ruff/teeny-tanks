import { TankState, TANK_WIDTH, TANK_HEIGHT } from '@teeny-tanks/shared';

const LERP_SPEED = 0.2;

// Pencil-box team color palettes (muted, crayon-like)
const TEAM_COLORS = {
  red: {
    fill: 0xb94040,
    fillDark: 0x8a2c2c,
  },
  blue: {
    fill: 0x4a6fa5,
    fillDark: 0x325480,
  },
} as const;

const COLOR_OUTLINE = 0x2c2c2c;
const COLOR_BARREL = 0x6b6358;
const COLOR_BARREL_TIP = 0x2c2c2c;
const COLOR_FLAG_INDICATOR = 0xc9a84c;
const COLOR_HEALTH_BG = 0xd4cbbf;
const COLOR_HEALTH_BORDER = 0x2c2c2c;
const COLOR_HEALTH_GOOD = 0x5a7a3a;
const COLOR_HEALTH_MID = 0xc9a84c;
const COLOR_HEALTH_LOW = 0xb94040;
const COLOR_DEAD_TINT = 0xa09888;

export class TankSprite {
  private graphics: Phaser.GameObjects.Graphics;
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

    // Tank graphics
    this.graphics = scene.add.graphics();
    this.graphics.setPosition(state.x, state.y);

    // "YOU" label for local player
    this.label = scene.add.text(state.x, state.y - 32, isLocal ? 'YOU' : '', {
      fontSize: '11px',
      fontFamily: "'Fredoka One', sans-serif",
      color: '#2c2c2c',
      align: 'center',
      fontStyle: 'bold',
      stroke: '#ede4d3',
      strokeThickness: 2,
    });
    this.label.setOrigin(0.5, 0.5);

    this.draw(state);
  }

  private draw(state: TankState): void {
    this.graphics.clear();

    const team = TEAM_COLORS[state.team];
    const bodyAlpha = state.alive ? 1 : 0.25;

    // Tank body shadow (paper-cutout style)
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

    // Tank body fill (flat color)
    const bodyColor = state.alive ? team.fill : COLOR_DEAD_TINT;
    this.graphics.fillStyle(bodyColor, bodyAlpha);
    this.graphics.fillRoundedRect(
      -TANK_WIDTH / 2,
      -TANK_HEIGHT / 2,
      TANK_WIDTH,
      TANK_HEIGHT,
      3,
    );

    // Body outline (dark charcoal)
    this.graphics.lineStyle(2, COLOR_OUTLINE, bodyAlpha);
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
      const treadColor = team.fillDark;
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

      // Barrel tip (dark charcoal, not neon)
      this.graphics.fillStyle(COLOR_BARREL_TIP, 0.8);
      this.graphics.fillRect(TANK_WIDTH / 4 + TANK_WIDTH / 2 - 2, -3, 4, 6);
    }

    // Flag indicator (static goldenrod dot with dark outline, no pulse)
    if (state.hasFlag && state.alive) {
      this.graphics.fillStyle(COLOR_FLAG_INDICATOR, 1);
      this.graphics.fillCircle(0, -TANK_HEIGHT / 2 - 10, 5);
      this.graphics.lineStyle(2, COLOR_OUTLINE, 1);
      this.graphics.strokeCircle(0, -TANK_HEIGHT / 2 - 10, 5);
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

    // Update label position (stays above tank, not rotated)
    this.label.setPosition(newX, newY - 32);

    this.draw(state);
  }

  destroy(): void {
    this.graphics.destroy();
    this.label.destroy();
  }
}
