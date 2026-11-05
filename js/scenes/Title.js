class Title extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    const cx = this.scale.width / 2;
    this.add.text(cx, 120, 'Robot Escape', { fontSize: '48px', color: '#fff' }).setOrigin(0.5);
    const l1 = this.add.text(cx, 260, '1 - Abandoned Factory (Nick)', { fontSize: '24px', color: '#9cf' }).setOrigin(0.5).setInteractive();
    const l2 = this.add.text(cx, 320, '2 - Mystical Mountains (Delano)', { fontSize: '24px', color: '#9cf' }).setOrigin(0.5).setInteractive();
    l1.on('pointerdown', () => this.scene.start('Level1'));
    l2.on('pointerdown', () => this.scene.start('Level2'));
    this.input.keyboard.on('keydown-ONE', () => this.scene.start('Level1'));
    this.input.keyboard.on('keydown-TWO', () => this.scene.start('Level2'));
  }
}
