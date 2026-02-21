import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // No assets to load for MVP — using graphics primitives
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
