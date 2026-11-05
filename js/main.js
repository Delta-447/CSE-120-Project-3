const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: document.body,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 900 }, debug: false }
  },
  scene: [Title, Level1, Level2]
};

new Phaser.Game(config);
