
class Level1 extends Phaser.Scene {
  constructor() {
    super('Level1');
  }

  preload() {
    Player.preload(this);

    this.load.image(
      'industrialTiles',
      'assets/tilesets/industrial/tilemap_packed.png'
    );

    this.load.tilemapTiledJSON(
      'factoryMap',
      'assets/tilemaps/level1_factory.json'
    );
  }

  create() {
    const map = this.make.tilemap({ key: 'factoryMap' });

    const tiles = map.addTilesetImage(
      'tilemap_packed',
      'industrialTiles'
    );

    this.backgroundLayer = map.createLayer('Background', tiles, 0, 0);
    this.platformLayer = map.createLayer('Platform', tiles, 0, 0);
    this.spikesLayer = map.createLayer('Spikes', tiles, 0, 0);

    this.mapWidth = map.widthInPixels;
    this.mapHeight = map.heightInPixels;

    this.platformLayer.setCollisionByProperty({ collides: true });

    const spawn = map.findObject('Objects', o => o.name === 'spawn');

    this.player = new Player(this, spawn.x, spawn.y);

    this.physics.add.collider(this.player, this.platformLayer);

    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapWidth, this.mapHeight);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(160, 220);

    this.add.text(20, 20, 'Abandoned Factory', {
      fontSize: '24px',
      color: '#fff'
    }).setScrollFactor(0);

    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('Title');
    });
  }

  update(time, delta) {
    this.player.update(time, delta);
  }
}
