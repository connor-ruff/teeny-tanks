import { TankState, TANK_WIDTH, TANK_HEIGHT, LERP_SPEED, SNAP_THRESHOLD } from '@teeny-tanks/shared';

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

    // Player name label above tank
    const labelText = isLocal ? `${state.displayName} (YOU)` : state.displayName;
    this.label = scene.add.text(state.x, state.y - 30, labelText, {
      fontSize: '13px',
      fontFamily: "'Patrick Hand', sans-serif",
      color: '#f5f0e8',
      align: 'center',
      stroke: '#2c2c2c',
      strokeThickness: 3,
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

  }

  syncTo(state: TankState): void {
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetRotation = state.rotation;

    const currentX = this.graphics.x;
    const currentY = this.graphics.y;
    const dx = this.targetX - currentX;
    const dy = this.targetY - currentY;
    const distSq = dx * dx + dy * dy;

    // Snap instantly when the position jump is large (e.g., map reset teleport).
    // Otherwise lerp for smooth frame-to-frame movement.
    let newX: number;
    let newY: number;
    if (distSq > SNAP_THRESHOLD * SNAP_THRESHOLD) {
      newX = this.targetX;
      newY = this.targetY;
    } else {
      newX = currentX + dx * LERP_SPEED;
      newY = currentY + dy * LERP_SPEED;
    }

    this.graphics.setPosition(newX, newY);
    this.graphics.rotation = this.targetRotation;

    // Update label position (stays above tank, not rotated)
    this.label.setPosition(newX, newY - 30);

    this.draw(state);
  }

  destroy(): void {
    this.graphics.destroy();
    this.label.destroy();
  }
}
