class Level2 extends Phaser.Scene {
  constructor() { super('Level2'); }
  preload() {}
  create() {
    this.add.text(20, 20, 'Mystical Mountains', { fontSize: '24px', color: '#fff' });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));
  }
  update() {}
}
