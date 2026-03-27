import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // No assets to load for MVP — using graphics primitives
  }

  create(): void {
    // GameScene is launched on demand when the game starts (after auth + lobby).
    // See main.ts socketManager.onGameStarted() handler.
  }
}
