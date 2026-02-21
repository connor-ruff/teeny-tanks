import { ProjectileState, PROJECTILE_RADIUS } from '@teeny-tanks/shared';

const COLOR_BULLET_CORE = 0xffffff;
const COLOR_BULLET_OUTER = 0xffcc00;
const COLOR_BULLET_GLOW = 0xffcc00;

export class ProjectileSprite {
  private graphics: Phaser.GameObjects.Graphics;
  private prevX: number;
  private prevY: number;

  constructor(
    private scene: Phaser.Scene,
    state: ProjectileState,
  ) {
    this.graphics = scene.add.graphics();
    this.prevX = state.x;
    this.prevY = state.y;
    this.drawAt(state.x, state.y);
  }

  private drawAt(x: number, y: number): void {
    this.graphics.clear();

    // Outer glow
    this.graphics.fillStyle(COLOR_BULLET_GLOW, 0.1);
    this.graphics.fillCircle(x, y, PROJECTILE_RADIUS * 4);
    this.graphics.fillStyle(COLOR_BULLET_GLOW, 0.15);
    this.graphics.fillCircle(x, y, PROJECTILE_RADIUS * 2.5);

    // Short trail (line from previous position)
    const dx = x - this.prevX;
    const dy = y - this.prevY;
    const trailLen = Math.sqrt(dx * dx + dy * dy);
    if (trailLen > 2) {
      // Normalize and extend trail slightly behind
      const nx = dx / trailLen;
      const ny = dy / trailLen;
      const tailX = x - nx * Math.min(trailLen, 14);
      const tailY = y - ny * Math.min(trailLen, 14);

      this.graphics.lineStyle(3, COLOR_BULLET_OUTER, 0.4);
      this.graphics.lineBetween(tailX, tailY, x, y);
      this.graphics.lineStyle(1, COLOR_BULLET_CORE, 0.6);
      this.graphics.lineBetween(tailX, tailY, x, y);
    }

    // Bullet body
    this.graphics.fillStyle(COLOR_BULLET_OUTER);
    this.graphics.fillCircle(x, y, PROJECTILE_RADIUS + 1);

    // Bright core
    this.graphics.fillStyle(COLOR_BULLET_CORE);
    this.graphics.fillCircle(x, y, PROJECTILE_RADIUS - 1);
  }

  syncTo(state: ProjectileState): void {
    this.drawAt(state.x, state.y);
    this.prevX = state.x;
    this.prevY = state.y;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
