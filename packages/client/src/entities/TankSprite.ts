import { TankState, TANK_WIDTH, TANK_HEIGHT, LERP_SPEED, SNAP_THRESHOLD } from '@teeny-tanks/shared';

// Pencil-box team color palettes (muted, crayon-like)
const TEAM_COLORS = {
  red: {
    fill: 0xb94040,
    fillDark: 0x8a2c2c,
    fillLight: 0xce5454,
  },
  blue: {
    fill: 0x4a6fa5,
    fillDark: 0x325480,
    fillLight: 0x5e84be,
  },
} as const;

const COLOR_OUTLINE = 0x2c2c2c;
const COLOR_BARREL = 0x6b6358;
const COLOR_BARREL_TIP = 0x2c2c2c;
const COLOR_FLAG_INDICATOR = 0xc9a84c;
const COLOR_DEAD_TINT = 0xa09888;

export class TankSprite {
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private turretGraphics: Phaser.GameObjects.Graphics;
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

    // Body graphics: chassis, treads, rivets, flag indicator
    this.bodyGraphics = scene.add.graphics();
    this.bodyGraphics.setPosition(state.x, state.y);

    // Turret graphics: dome + barrel — separate object at same position
    // This architecture allows independent turret aim in the future.
    this.turretGraphics = scene.add.graphics();
    this.turretGraphics.setPosition(state.x, state.y);

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

  private drawBody(state: TankState): void {
    this.bodyGraphics.clear();

    if (!state.alive) {
      // Faded ghost silhouette for dead tank
      this.bodyGraphics.fillStyle(COLOR_DEAD_TINT, 0.25);
      this.bodyGraphics.fillRoundedRect(
        -TANK_WIDTH / 2,
        -TANK_HEIGHT / 2,
        TANK_WIDTH,
        TANK_HEIGHT,
        3,
      );
      this.bodyGraphics.lineStyle(1, COLOR_OUTLINE, 0.25);
      this.bodyGraphics.strokeRoundedRect(
        -TANK_WIDTH / 2,
        -TANK_HEIGHT / 2,
        TANK_WIDTH,
        TANK_HEIGHT,
        3,
      );
      return;
    }

    const team = TEAM_COLORS[state.team];

    // Shadow (paper-cutout style)
    this.bodyGraphics.fillStyle(0x000000, 0.3);
    this.bodyGraphics.fillRoundedRect(
      -TANK_WIDTH / 2 + 2,
      -TANK_HEIGHT / 2 + 2,
      TANK_WIDTH,
      TANK_HEIGHT,
      3,
    );

    // Body fill
    this.bodyGraphics.fillStyle(team.fill, 1);
    this.bodyGraphics.fillRoundedRect(
      -TANK_WIDTH / 2,
      -TANK_HEIGHT / 2,
      TANK_WIDTH,
      TANK_HEIGHT,
      3,
    );

    // Body outline
    this.bodyGraphics.lineStyle(2, COLOR_OUTLINE, 1);
    this.bodyGraphics.strokeRoundedRect(
      -TANK_WIDTH / 2,
      -TANK_HEIGHT / 2,
      TANK_WIDTH,
      TANK_HEIGHT,
      3,
    );

    // Panel highlight: subtle 1px specular line along the top interior edge
    this.bodyGraphics.lineStyle(1, 0xffffff, 0.25);
    this.bodyGraphics.beginPath();
    this.bodyGraphics.moveTo(-TANK_WIDTH / 2 + 5, -TANK_HEIGHT / 2 + 3);
    this.bodyGraphics.lineTo(TANK_WIDTH / 2 - 5, -TANK_HEIGHT / 2 + 3);
    this.bodyGraphics.strokePath();

    // Tread segments: 5 rounded rects per track, at top and bottom edges.
    // Treads run horizontally (parallel to the facing direction), one strip
    // on each side of the chassis — the classic tank-track look from above.
    const treadH = 5;
    const numSegs = 5;
    const gapW = 2;
    const totalTreadW = TANK_WIDTH - 4;
    const segW = (totalTreadW - (numSegs - 1) * gapW) / numSegs;
    const treadStartX = -(totalTreadW / 2);

    this.bodyGraphics.fillStyle(team.fillDark, 0.9);
    for (let i = 0; i < numSegs; i++) {
      const sx = treadStartX + i * (segW + gapW);
      this.bodyGraphics.fillRoundedRect(sx, -TANK_HEIGHT / 2 - 1, segW, treadH, 1);
      this.bodyGraphics.fillRoundedRect(sx, TANK_HEIGHT / 2 - treadH + 1, segW, treadH, 1);
    }

    // Tread segment outlines
    this.bodyGraphics.lineStyle(1, COLOR_OUTLINE, 0.5);
    for (let i = 0; i < numSegs; i++) {
      const sx = treadStartX + i * (segW + gapW);
      this.bodyGraphics.strokeRoundedRect(sx, -TANK_HEIGHT / 2 - 1, segW, treadH, 1);
      this.bodyGraphics.strokeRoundedRect(sx, TANK_HEIGHT / 2 - treadH + 1, segW, treadH, 1);
    }

    // Rivet dots at four inner corners of chassis
    this.bodyGraphics.fillStyle(COLOR_OUTLINE, 0.7);
    const rv = { x: TANK_WIDTH / 2 - 8, y: TANK_HEIGHT / 2 - 7 };
    this.bodyGraphics.fillCircle(-rv.x, -rv.y, 2);
    this.bodyGraphics.fillCircle(rv.x, -rv.y, 2);
    this.bodyGraphics.fillCircle(-rv.x, rv.y, 2);
    this.bodyGraphics.fillCircle(rv.x, rv.y, 2);

    // Flag indicator: static goldenrod dot with dark outline above the tank
    if (state.hasFlag) {
      this.bodyGraphics.fillStyle(COLOR_FLAG_INDICATOR, 1);
      this.bodyGraphics.fillCircle(0, -TANK_HEIGHT / 2 - 10, 5);
      this.bodyGraphics.lineStyle(2, COLOR_OUTLINE, 1);
      this.bodyGraphics.strokeCircle(0, -TANK_HEIGHT / 2 - 10, 5);
    }
  }

  private drawTurret(state: TankState): void {
    this.turretGraphics.clear();

    if (!state.alive) {
      return;
    }

    const team = TEAM_COLORS[state.team];

    // Barrel dimensions — extends in the +x (facing) direction from turret center
    const barrelX = 2;
    const barrelLen = TANK_WIDTH / 2 + 6;
    const barrelEnd = barrelX + barrelLen;
    const barrelY = -3;
    const barrelH = 7;

    // Barrel shadow
    this.turretGraphics.fillStyle(0x000000, 0.2);
    this.turretGraphics.fillRect(barrelX, barrelY + 1, barrelLen, barrelH);

    // Barrel body (gray-brown)
    this.turretGraphics.fillStyle(COLOR_BARREL, 1);
    this.turretGraphics.fillRect(barrelX, barrelY, barrelLen - 4, barrelH);

    // Barrel tip: tapered trapezoid (wider at base, narrower at muzzle)
    this.turretGraphics.fillStyle(COLOR_BARREL_TIP, 0.9);
    this.turretGraphics.beginPath();
    this.turretGraphics.moveTo(barrelEnd - 4, barrelY);
    this.turretGraphics.lineTo(barrelEnd, barrelY + 2);
    this.turretGraphics.lineTo(barrelEnd, barrelY + barrelH - 2);
    this.turretGraphics.lineTo(barrelEnd - 4, barrelY + barrelH);
    this.turretGraphics.closePath();
    this.turretGraphics.fillPath();

    // Turret dome fill — drawn after barrel so dome covers the barrel base
    this.turretGraphics.fillStyle(team.fillLight, 1);
    this.turretGraphics.fillEllipse(0, 0, 16, 14);

    // Dome outline
    this.turretGraphics.lineStyle(2, COLOR_OUTLINE, 1);
    this.turretGraphics.strokeEllipse(0, 0, 16, 14);

    // Dome inner highlight: small light patch suggesting a top-left specular
    this.turretGraphics.fillStyle(0xffffff, 0.2);
    this.turretGraphics.fillEllipse(-2, -2, 6, 4);
  }

  private draw(state: TankState): void {
    this.drawBody(state);
    this.drawTurret(state);
  }

  syncTo(state: TankState): void {
    this.targetX = state.x;
    this.targetY = state.y;
    this.targetRotation = state.rotation;

    const currentX = this.bodyGraphics.x;
    const currentY = this.bodyGraphics.y;
    const dx = this.targetX - currentX;
    const dy = this.targetY - currentY;
    const distSq = dx * dx + dy * dy;

    // Snap instantly for large jumps (e.g., map reset teleport); lerp otherwise
    let newX: number;
    let newY: number;
    if (distSq > SNAP_THRESHOLD * SNAP_THRESHOLD) {
      newX = this.targetX;
      newY = this.targetY;
    } else {
      newX = currentX + dx * LERP_SPEED;
      newY = currentY + dy * LERP_SPEED;
    }

    this.bodyGraphics.setPosition(newX, newY);
    this.bodyGraphics.rotation = this.targetRotation;

    this.turretGraphics.setPosition(newX, newY);
    this.turretGraphics.rotation = this.targetRotation;

    // Label stays above tank in world space, not rotated with the tank
    this.label.setPosition(newX, newY - 30);

    this.draw(state);
  }

  destroy(): void {
    this.bodyGraphics.destroy();
    this.turretGraphics.destroy();
    this.label.destroy();
  }
}
