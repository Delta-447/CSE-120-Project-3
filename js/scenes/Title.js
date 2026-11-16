class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const cx = this.scale.width / 2;
    const style = { fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 5 };
    this.cameras.main.setBackgroundColor('#141820');
    this.add.text(cx, 100, 'Robot Escape', Object.assign({ fontSize: '56px' }, style)).setOrigin(0.5);
    this.add.text(cx, 160, 'Collect 5 energy crystals to unlock the exit', Object.assign({ fontSize: '18px' }, style, { color: '#7fe9ff', strokeThickness: 3 })).setOrigin(0.5);

    const options = [
      { label: '1 - Abandoned Factory (Nick)', key: 'Level1', y: 250 },
      { label: '2 - Mystical Mountains (Delano)', key: 'Level2', y: 300 },
    ];
    options.forEach(o => {
      const t = this.add.text(cx, o.y, o.label, Object.assign({ fontSize: '26px' }, style, { color: '#9cf' })).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => t.setColor('#ffffff'));
      t.on('pointerout', () => t.setColor('#99ccff'));
      t.on('pointerdown', () => this.scene.start(o.key));
    });
    this.input.keyboard.on('keydown-ONE', () => this.scene.start('Level1'));
    this.input.keyboard.on('keydown-TWO', () => this.scene.start('Level2'));

    const controls = [
      'A / D or Left / Right   move',
      'W / Up / Space          jump (hold for higher)',
      'R  respawn at checkpoint      Esc  back to menu',
    ];
    this.add.text(cx, 430, controls.join('\n'), Object.assign({ fontSize: '15px', lineSpacing: 6 }, style, { strokeThickness: 3, color: '#cccccc' })).setOrigin(0.5);
  }
}
