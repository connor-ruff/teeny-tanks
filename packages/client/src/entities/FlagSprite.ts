import { FlagStateWire, FLAG_RADIUS, CAPTURE_ZONES, CAPTURE_ZONE_RADIUS, Team } from '@teeny-tanks/shared';

// Pencil-box team colors (muted, crayon-like)
const TEAM_COLORS = {
  red: { primary: 0xb94040, dark: 0x8a2c2c },
  blue: { primary: 0x4a6fa5, dark: 0x325480 },
} as const;

const COLOR_POLE = 0x6b6358;
const COLOR_ZONE_RING = 0x2c2c2c;

export class FlagSprite {
  private graphics: Phaser.GameObjects.Graphics;
  private zoneGraphics: Phaser.GameObjects.Graphics;

  constructor(
    private scene: Phaser.Scene,
    private team: Team,
  ) {
    const colors = TEAM_COLORS[team];

    // Draw capture zone
    this.zoneGraphics = scene.add.graphics();
    const zone = CAPTURE_ZONES[team];

    // Outer ring (dark charcoal)
    this.zoneGraphics.lineStyle(1, COLOR_ZONE_RING, 0.3);
    this.zoneGraphics.strokeCircle(zone.x, zone.y, CAPTURE_ZONE_RADIUS);

    // Filled zone with team color (subtle tint)
    this.zoneGraphics.fillStyle(colors.primary, 0.06);
    this.zoneGraphics.fillCircle(zone.x, zone.y, CAPTURE_ZONE_RADIUS);

    // Inner ring for emphasis
    this.zoneGraphics.lineStyle(1, colors.primary, 0.15);
    this.zoneGraphics.strokeCircle(zone.x, zone.y, CAPTURE_ZONE_RADIUS * 0.6);

    // Dashed outer ring pattern (small dots around the circle -- hand-drawn flavor)
    const dotCount = 24;
    for (let i = 0; i < dotCount; i++) {
      const angle = (i / dotCount) * Math.PI * 2;
      const dotX = zone.x + Math.cos(angle) * CAPTURE_ZONE_RADIUS;
      const dotY = zone.y + Math.sin(angle) * CAPTURE_ZONE_RADIUS;
      this.zoneGraphics.fillStyle(colors.primary, 0.2);
      this.zoneGraphics.fillCircle(dotX, dotY, 2);
    }

    // Flag graphics
    this.graphics = scene.add.graphics();
  }

  syncTo(state: FlagStateWire): void {
    this.graphics.clear();

    // Don't draw flag if it's being carried (shown as indicator on tank)
    if (state.carrierId) return;

    const colors = TEAM_COLORS[this.team];

    // Flag pole shadow
    this.graphics.fillStyle(0x000000, 0.2);
    this.graphics.fillRect(state.x, state.y - FLAG_RADIUS + 1, 3, FLAG_RADIUS * 2);

    // Flag pole (warm grey-brown)
    this.graphics.fillStyle(COLOR_POLE);
    this.graphics.fillRect(state.x - 1, state.y - FLAG_RADIUS, 3, FLAG_RADIUS * 2);

    // Pole cap (small circle at top)
    this.graphics.fillStyle(0xf5f0e8);
    this.graphics.fillCircle(state.x, state.y - FLAG_RADIUS, 2);

    // Flag triangle
    this.graphics.fillStyle(colors.primary);
    this.graphics.fillTriangle(
      state.x + 2, state.y - FLAG_RADIUS,
      state.x + 2, state.y - FLAG_RADIUS + 14,
      state.x + 18, state.y - FLAG_RADIUS + 7,
    );

    // Flag outline
    this.graphics.lineStyle(1, colors.dark, 0.8);
    this.graphics.strokeTriangle(
      state.x + 2, state.y - FLAG_RADIUS,
      state.x + 2, state.y - FLAG_RADIUS + 14,
      state.x + 18, state.y - FLAG_RADIUS + 7,
    );

    // Pole base (small platform)
    this.graphics.fillStyle(colors.dark, 0.7);
    this.graphics.fillRect(state.x - 4, state.y + FLAG_RADIUS - 2, 9, 3);
  }

  destroy(): void {
    this.graphics.destroy();
    this.zoneGraphics.destroy();
  }
}
