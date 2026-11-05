class Level1 extends Phaser.Scene {
  constructor() { super('Level1'); }
  preload() {}
  create() {
    this.add.text(20, 20, 'Abandoned Factory', { fontSize: '24px', color: '#fff' });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));
  }
  update() {}
}
