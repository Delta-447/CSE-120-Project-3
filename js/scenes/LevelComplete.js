class LevelComplete extends Phaser.Scene {
  constructor() { super('LevelComplete'); }

  init(data) {
    this.result = data;
  }

  create() {
    const r = this.result;
    const cx = this.scale.width / 2;
    const style = { fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 5 };
    this.cameras.main.setBackgroundColor('#141820');
    this.add.text(cx, 110, 'Level Complete!', Object.assign({ fontSize: '48px' }, style, { color: '#7fffa0' })).setOrigin(0.5);
    this.add.text(cx, 175, r.levelName, Object.assign({ fontSize: '26px' }, style)).setOrigin(0.5);
    const mins = Math.floor(r.seconds / 60), secs = String(r.seconds % 60).padStart(2, '0');
    const lines = [
      'Score     ' + r.score,
      'Crystals  ' + r.crystals + ' / ' + r.totalCrystals,
      'Time      ' + mins + ':' + secs,
    ];
    this.add.text(cx, 270, lines.join('\n'), Object.assign({ fontSize: '24px', lineSpacing: 12 }, style)).setOrigin(0.5);
    this.add.text(cx, 420, 'Enter - main menu     R - play again', Object.assign({ fontSize: '18px' }, style, { color: '#9cf' })).setOrigin(0.5);
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Title'));
    this.input.keyboard.once('keydown-R', () => this.scene.start(r.levelKey));
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }
}
