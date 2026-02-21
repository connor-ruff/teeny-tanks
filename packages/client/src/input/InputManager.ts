import { PlayerInput } from '@teeny-tanks/shared';

export class InputManager {
  private keys: Record<string, boolean> = {};
  private tick = 0;

  constructor(scene: Phaser.Scene) {
    scene.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      this.keys[event.code] = true;
    });

    scene.input.keyboard!.on('keyup', (event: KeyboardEvent) => {
      this.keys[event.code] = false;
    });
  }

  getInput(): PlayerInput {
    return {
      tick: this.tick++,
      up: !!this.keys['KeyW'] || !!this.keys['ArrowUp'],
      down: !!this.keys['KeyS'] || !!this.keys['ArrowDown'],
      left: !!this.keys['KeyA'] || !!this.keys['ArrowLeft'],
      right: !!this.keys['KeyD'] || !!this.keys['ArrowRight'],
      shoot: !!this.keys['Space'],
    };
  }
}
