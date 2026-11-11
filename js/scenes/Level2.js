// Mystical Mountains (Delano) - currently a movement test level.
// The map is a Tiled file (assets/tilemaps/mountains_test.json) using
// placeholder tiles, so it can be opened and edited in Tiled.
class Level2 extends Phaser.Scene {
  constructor() { super('Level2'); }

  preload() {
    Player.preload(this);
    this.load.image('placeholderTiles', 'assets/images/placeholder_tiles.png');
    this.load.tilemapTiledJSON('mountainsMap', 'assets/tilemaps/mountains_test.json');
  }

  create() {
    this.cameras.main.setBackgroundColor('#7fa6d9');

    // --- Tilemap ---
    const map = this.make.tilemap({ key: 'mountainsMap' });
    const tiles = map.addTilesetImage('placeholder_tiles', 'placeholderTiles');
    this.groundLayer = map.createLayer('Ground', tiles, 0, 0);
    this.oneWayLayer = map.createLayer('OneWay', tiles, 0, 0);
    this.groundLayer.setCollisionByProperty({ collides: true });
    this.oneWayLayer.setCollisionByProperty({ collides: true });
    this.mapWidth = map.widthInPixels;
    this.mapHeight = map.heightInPixels;

    // --- Player ---
    const spawn = map.findObject('Objects', o => o.name === 'spawn');
    this.player = new Player(this, spawn.x, spawn.y);

    // World is open at the bottom so the robot can fall into pits.
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight + 200);
    this.physics.world.checkCollision.down = false;

    this.physics.add.collider(this.player, this.groundLayer);
    // One-way: only land on it when falling and the feet were above the tile last frame.
    this.physics.add.collider(this.player, this.oneWayLayer, null, (player, tile) => {
      const b = player.body;
      return b.velocity.y >= 0 &&
             b.prev.y + b.height <= tile.pixelY + 2 &&
             !player.isDropping(this.time.now);
    });

    // --- Camera: horizontal follow, clamped to the level ---
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapWidth, this.mapHeight);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(160, 220);

    // --- HUD ---
    this.add.text(12, 10, 'Mystical Mountains - movement test', { fontSize: '18px', color: '#fff' })
      .setScrollFactor(0).setDepth(100);
    this.add.text(12, 34,
      'A/D or ←/→ move   W/↑/Space jump (hold = higher)   S/↓ drop through clouds\n' +
      'R respawn   G toggle hitboxes   Esc menu',
      { fontSize: '13px', color: '#fff' }).setScrollFactor(0).setDepth(100);

    // --- Keys ---
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));
    this.input.keyboard.on('keydown-R', () => this.player.respawn());
    this.input.keyboard.on('keydown-G', () => {
      const w = this.physics.world;
      if (!w.debugGraphic) w.createDebugGraphic();
      w.drawDebug = !w.drawDebug;
      w.debugGraphic.clear();
    });
  }

  update(time, delta) {
    this.player.update(time, delta);
    if (this.player.y > this.mapHeight + 100) this.player.respawn();
  }
}
