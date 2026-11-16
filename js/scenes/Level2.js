class Level2 extends BaseLevel {
  constructor() {
    super('Level2', {
      name: 'Mystical Mountains',
      mapKey: 'mountainsMap',
      mapPath: 'assets/tilemaps/level2_mountains.json',
      crystalsRequired: 5,
      backgroundColor: '#7fa6d9',
      platformStyle: { tileset: 'mountains', left: 10, mid: [11, 12, 13, 14], right: 15, single: 18 },
    });
  }
}
