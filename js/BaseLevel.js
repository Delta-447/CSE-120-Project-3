class BaseLevel extends Phaser.Scene {
  constructor(key, levelConfig) {
    super(key);
    this.levelConfig = Object.assign({
      renderScale: 2,
      crystalsRequired: 5,
      maxHealth: 3,
      platformStyle: null,
      backgroundColor: '#1d2330',
    }, levelConfig);
  }

  static resolvePath(base, relative) {
    return decodeURIComponent(new URL(relative, 'http://local/' + base).pathname.slice(1));
  }

  static propsOf(item) {
    const out = {};
    (item && item.properties || []).forEach(p => { out[p.name] = p.value; });
    return out;
  }

  preload() {
    Player.preload(this);
    ['jump', 'land', 'collect', 'hurt', 'checkpoint', 'locked', 'complete'].forEach(n => {
      if (!this.cache.audio.exists('sfx_' + n)) this.load.audio('sfx_' + n, 'assets/audio/' + n + '.wav');
    });
    this.queueTiledMap(this.levelConfig.mapKey, this.levelConfig.mapPath);
  }

  queueTiledMap(key, path) {
    const prepare = () => {
      const data = this.cache.tilemap.get(key).data;
      data.tilesets.forEach(ts => this.queueTileset(ts, path));
      data.layers.filter(l => l.type === 'imagelayer' && l.image).forEach(l => {
        l.__imagePath = l.__imagePath || BaseLevel.resolvePath(path, l.image);
        this.queueImage('img:' + l.__imagePath, l.__imagePath);
      });
    };
    if (this.cache.tilemap.exists(key)) {
      prepare();
    } else {
      this.load.tilemapTiledJSON(key, path);
      this.load.once('filecomplete-tilemapJSON-' + key, prepare);
    }
  }

  queueImage(key, path) {
    if (!this.textures.exists(key)) this.load.image(key, path);
  }

  queueTileset(ts, mapPath) {
    if (ts.source) {
      const tsxPath = BaseLevel.resolvePath(mapPath, ts.source);
      const xmlKey = 'tsx:' + tsxPath;
      const embed = () => {
        this.embedTsx(ts, this.cache.xml.get(xmlKey), tsxPath);
        this.queueTilesetImages(ts);
      };
      if (this.cache.xml.exists(xmlKey)) {
        embed();
      } else {
        this.load.xml(xmlKey, tsxPath);
        this.load.once('filecomplete-xml-' + xmlKey, embed);
      }
      return;
    }
    if (ts.image && !ts.__imagePath) ts.__imagePath = BaseLevel.resolvePath(mapPath, ts.image);
    (ts.tiles || []).forEach(t => {
      if (t.image && !t.__imagePath) t.__imagePath = BaseLevel.resolvePath(mapPath, t.image);
    });
    this.queueTilesetImages(ts);
  }

  embedTsx(ts, xml, tsxPath) {
    const root = xml.documentElement;
    const num = (el, name) => parseFloat(el.getAttribute(name) || '0');
    ts.name = root.getAttribute('name');
    ts.tilewidth = num(root, 'tilewidth');
    ts.tileheight = num(root, 'tileheight');
    ts.tilecount = num(root, 'tilecount');
    ts.columns = num(root, 'columns');
    ts.margin = num(root, 'margin');
    ts.spacing = num(root, 'spacing');
    const image = Array.from(root.children).find(n => n.tagName === 'image');
    if (image) {
      ts.image = image.getAttribute('source');
      ts.__imagePath = BaseLevel.resolvePath(tsxPath, ts.image);
      ts.imagewidth = num(image, 'width');
      ts.imageheight = num(image, 'height');
    }
    ts.tiles = Array.from(root.children).filter(n => n.tagName === 'tile').map(tileEl => {
      const tile = { id: num(tileEl, 'id') };
      const type = tileEl.getAttribute('type') || tileEl.getAttribute('class');
      if (type) tile.type = type;
      const tileImage = Array.from(tileEl.children).find(n => n.tagName === 'image');
      if (tileImage) {
        tile.image = tileImage.getAttribute('source');
        tile.__imagePath = BaseLevel.resolvePath(tsxPath, tile.image);
        tile.imagewidth = num(tileImage, 'width');
        tile.imageheight = num(tileImage, 'height');
      }
      const props = Array.from(tileEl.getElementsByTagName('property')).map(p => ({
        name: p.getAttribute('name'),
        type: p.getAttribute('type') || 'string',
        value: p.getAttribute('type') === 'bool' ? p.getAttribute('value') === 'true' : p.getAttribute('value'),
      }));
      if (props.length) tile.properties = props;
      return tile;
    });
    delete ts.source;
  }

  queueTilesetImages(ts) {
    if (ts.__imagePath) {
      this.queueImage('tsimg:' + ts.__imagePath, ts.__imagePath);
      const sheetKey = 'tssheet:' + ts.__imagePath;
      if (!this.textures.exists(sheetKey)) {
        this.load.spritesheet(sheetKey, ts.__imagePath, {
          frameWidth: ts.tilewidth, frameHeight: ts.tileheight,
          margin: ts.margin || 0, spacing: ts.spacing || 0,
        });
      }
    }
    (ts.tiles || []).forEach(t => {
      if (t.__imagePath) this.queueImage('img:' + t.__imagePath, t.__imagePath);
    });
  }

  create() {
    const cfg = this.levelConfig;
    const data = this.cache.tilemap.get(cfg.mapKey).data;
    const mapProps = BaseLevel.propsOf(data);
    const S = this.S = mapProps.renderScale || cfg.renderScale;
    this.mapData = data;
    this.tilesetsByGid = data.tilesets.slice().sort((a, b) => a.firstgid - b.firstgid);

    const map = this.map = this.make.tilemap({ key: cfg.mapKey });
    const tilesets = data.tilesets
      .filter(ts => ts.__imagePath)
      .map(ts => map.addTilesetImage(ts.name, 'tsimg:' + ts.__imagePath));

    this.mapWidth = map.widthInPixels * S;
    this.mapHeight = map.heightInPixels * S;
    this.cameras.main.setBackgroundColor(data.backgroundcolor || cfg.backgroundColor);

    this.levelName = mapProps.levelName || cfg.name;
    this.crystalsRequired = cfg.crystalsRequired;
    this.maxHealth = cfg.maxHealth;
    this.health = this.maxHealth;
    this.score = 0;
    this.collected = 0;
    this.completed = false;
    this.startTime = this.time.now;
    this.lockedMessageAt = -Infinity;

    this.solidLayers = [];
    this.hazardLayers = [];
    this.parallax = [];
    this.crystals = [];
    this.checkpoints = [];
    this.platforms = [];
    this.exits = [];
    let spawnObject = null;

    data.layers.forEach((layerData, index) => {
      const props = BaseLevel.propsOf(layerData);
      const lname = layerData.name.toLowerCase();
      if (layerData.type === 'imagelayer') {
        this.createParallax(layerData, index);
      } else if (layerData.type === 'tilelayer') {
        const layer = map.createLayer(layerData.name, tilesets, 0, 0).setScale(S).setDepth(index);
        if (props.hazard || /hazard|spike/.test(lname)) {
          this.hazardLayers.push(layer);
        } else if (props.collides || /^(ground|platform|platforms|solid|walls?)$/.test(lname)) {
          layer.setCollisionByExclusion([-1]);
          this.solidLayers.push(layer);
        }
      } else if (layerData.type === 'objectgroup') {
        layerData.objects.forEach(o => {
          const type = (o.type || o.class || '').toLowerCase();
          const name = (o.name || '').toLowerCase();
          if (name === 'spawn' || lname === 'spawn') spawnObject = o;
          else if (type === 'crystal' || lname.includes('crystal')) this.createCrystal(o, index);
          else if (type === 'checkpoint' || lname.includes('checkpoint')) this.createCheckpoint(o, index);
          else if (type === 'movingplatform' || lname.includes('moving')) this.createPlatform(o);
          else if (type === 'exit' || lname.includes('exit')) this.createExit(o, index);
          else if (type === 'killzone' || lname.includes('kill')) return;
          else if (o.gid) this.createTileObject(o, index);
        });
      }
    });

    this.crystalsRequired = Math.min(this.crystalsRequired, this.crystals.length || this.crystalsRequired);
    const spawn = spawnObject ? { x: spawnObject.x * S, y: spawnObject.y * S } : this.findDefaultSpawn();
    this.player = new Player(this, spawn.x, spawn.y);

    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight + 400);
    this.physics.world.checkCollision.down = false;
    this.solidLayers.forEach(layer => this.physics.add.collider(this.player, layer));
    if (this.platforms.length) this.physics.add.collider(this.player, this.platforms);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapWidth, this.mapHeight);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(160, 160);

    this.createEffects();
    this.createHud();
    this.bindPlayerEvents();
    this.bindKeys();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  findDefaultSpawn() {
    const layer = this.solidLayers[0];
    if (layer) {
      for (let tx = 1; tx < this.map.width; tx++) {
        for (let ty = 0; ty < this.map.height; ty++) {
          if (layer.getTileAt(tx, ty)) {
            const p = layer.tileToWorldXY(tx, ty);
            return { x: p.x + (this.map.tileWidth * this.S) / 2, y: p.y };
          }
        }
      }
    }
    return { x: 64, y: 64 };
  }

  tilesetForGid(gid) {
    let found = null;
    this.tilesetsByGid.forEach(ts => { if (gid >= ts.firstgid) found = ts; });
    return found;
  }

  createTileObject(o, depth) {
    const S = this.S;
    const gid = o.gid & 0x1fffffff;
    const ts = this.tilesetForGid(gid);
    if (!ts) return null;
    const localId = gid - ts.firstgid;
    let sprite;
    if (ts.__imagePath) {
      sprite = this.add.sprite(o.x * S, o.y * S, 'tssheet:' + ts.__imagePath, localId);
    } else {
      const tile = (ts.tiles || []).find(t => t.id === localId);
      if (!tile || !tile.__imagePath) return null;
      sprite = this.add.image(o.x * S, o.y * S, 'img:' + tile.__imagePath);
    }
    sprite.setOrigin(0, 1).setDisplaySize(o.width * S, o.height * S).setDepth(depth);
    if (o.gid & 0x80000000) sprite.setFlipX(true);
    if (o.gid & 0x40000000) sprite.setFlipY(true);
    return sprite;
  }

  createCrystal(o, depth) {
    const sprite = this.createTileObject(o, depth + 30);
    if (!sprite) return;
    const props = BaseLevel.propsOf(o);
    sprite.points = props.points || 100;
    this.tweens.add({ targets: sprite, y: sprite.y - 4 * this.S, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Math.random() * 600 });
    this.crystals.push(sprite);
  }

  createCheckpoint(o, depth) {
    const sprite = this.createTileObject(o, depth);
    if (!sprite) return;
    sprite.reached = false;
    this.checkpoints.push(sprite);
  }

  createExit(o, depth) {
    const S = this.S;
    let rect;
    if (o.gid) {
      const sprite = this.createTileObject(o, depth);
      rect = new Phaser.Geom.Rectangle(o.x * S - 8, (o.y - o.height) * S - 8, o.width * S + 16, o.height * S * 2 + 16);
      if (sprite) rect.sprite = sprite;
    } else {
      rect = new Phaser.Geom.Rectangle(o.x * S, o.y * S, o.width * S, o.height * S);
    }
    const props = BaseLevel.propsOf(o);
    if (props.crystalsRequired) this.levelConfig.crystalsRequired = props.crystalsRequired;
    this.crystalsRequired = this.levelConfig.crystalsRequired;
    this.exits.push(rect);
  }

  platformTexture(widthTiles) {
    const style = this.levelConfig.platformStyle;
    const key = 'platform:' + this.scene.key + ':' + widthTiles;
    if (this.textures.exists(key)) return key;
    const ts = style && this.mapData.tilesets.find(t => t.name === style.tileset);
    if (!ts) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x8a8f99).fillRect(0, 0, widthTiles * 16, 8);
      g.fillStyle(0x5c6270).fillRect(0, 6, widthTiles * 16, 2);
      g.generateTexture(key, widthTiles * 16, 8);
      g.destroy();
      return key;
    }
    const tw = ts.tilewidth, th = ts.tileheight;
    const source = this.textures.get('tsimg:' + ts.__imagePath).getSourceImage();
    const canvas = this.textures.createCanvas(key, widthTiles * tw, th);
    for (let i = 0; i < widthTiles; i++) {
      let frame;
      if (widthTiles === 1) frame = style.single !== undefined ? style.single : style.mid[0];
      else if (i === 0) frame = style.left;
      else if (i === widthTiles - 1) frame = style.right;
      else frame = style.mid[(i - 1) % style.mid.length];
      const col = frame % ts.columns, row = Math.floor(frame / ts.columns);
      const sx = (ts.margin || 0) + col * (tw + (ts.spacing || 0));
      const sy = (ts.margin || 0) + row * (th + (ts.spacing || 0));
      canvas.context.drawImage(source, sx, sy, tw, th, i * tw, 0, tw, th);
    }
    canvas.refresh();
    return key;
  }

  createPlatform(o) {
    const S = this.S;
    const props = BaseLevel.propsOf(o);
    const tw = this.map.tileWidth;
    const widthTiles = Math.max(1, Math.round(o.width / tw));
    const platform = this.physics.add.image(o.x * S, o.y * S, this.platformTexture(widthTiles)).setOrigin(0, 0).setScale(S).setDepth(40);
    platform.setImmovable(true);
    platform.body.setAllowGravity(false);
    const distance = (props.distance || 0) * tw * S;
    platform.start = { x: platform.x, y: platform.y };
    platform.end = props.axis === 'y'
      ? { x: platform.x, y: platform.y + distance }
      : { x: platform.x + distance, y: platform.y };
    platform.speed = props.speed || 60;
    platform.triggered = !!props.triggered;
    platform.state = platform.triggered ? 'idle' : 'out';
    platform.waitUntil = 0;
    this.platforms.push(platform);
  }

  isRiding(platform) {
    const pb = this.player.body, b = platform.body;
    return Math.abs(pb.bottom - b.top) < 6 && pb.right > b.left + 2 && pb.left < b.right - 2 && pb.velocity.y >= -1;
  }

  updatePlatform(platform, time, delta) {
    if (time < platform.waitUntil) { platform.setVelocity(0, 0); return; }
    if (platform.state === 'idle') {
      platform.setVelocity(0, 0);
      if (this.isRiding(platform)) { platform.state = 'out'; platform.waitUntil = time + 250; }
      return;
    }
    const target = platform.state === 'out' ? platform.end : platform.start;
    const dx = target.x - platform.x, dy = target.y - platform.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.75) {
      platform.setVelocity(0, 0);
      if (platform.triggered) {
        platform.state = platform.state === 'out' ? 'back' : 'idle';
        platform.waitUntil = time + (platform.state === 'back' ? 1500 : 300);
      } else {
        platform.state = platform.state === 'out' ? 'back' : 'out';
        platform.waitUntil = time + 500;
      }
      return;
    }
    const v = Math.min(platform.speed, dist / Math.max(delta / 1000, 0.001));
    platform.setVelocity((dx / dist) * v, (dy / dist) * v);
  }

  createParallax(layerData, index) {
    const S = this.S;
    const key = 'img:' + layerData.__imagePath;
    if (!this.textures.exists(key)) return;
    const height = Math.min(layerData.imageheight, this.map.heightInPixels - (layerData.offsety || 0) + 40) * S;
    const sprite = this.add.tileSprite(0, (layerData.offsety || 0) * S, this.scale.width, height, key)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-100 + index);
    sprite.setTileScale(S, S);
    sprite.baseY = (layerData.offsety || 0) * S;
    sprite.factor = layerData.parallaxx === undefined ? 1 : layerData.parallaxx;
    this.parallax.push(sprite);
  }

  createEffects() {
    if (!this.textures.exists('fx_spark')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xffffff).fillCircle(4, 4, 4);
      g.generateTexture('fx_spark', 8, 8);
      g.clear().fillStyle(0xffffff).fillRect(0, 0, 6, 6);
      g.generateTexture('fx_dust', 6, 6);
      g.destroy();
    }
    this.sparkFx = this.add.particles(0, 0, 'fx_spark', {
      speed: { min: 80, max: 220 }, lifespan: 550, scale: { start: 1, end: 0 },
      tint: [0x7fe9ff, 0xffffff, 0xb6f4ff], emitting: false,
    }).setDepth(60);
    this.dustFx = this.add.particles(0, 0, 'fx_dust', {
      speed: { min: 20, max: 70 }, angle: { min: 200, max: 340 }, lifespan: 380,
      scale: { start: 1, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: 0xd8cbb5, gravityY: 120, emitting: false,
    }).setDepth(49);
    this.hurtFx = this.add.particles(0, 0, 'fx_spark', {
      speed: { min: 60, max: 200 }, lifespan: 400, scale: { start: 0.8, end: 0 },
      tint: [0xff5050, 0xffb040], emitting: false,
    }).setDepth(60);
  }

  sfx(name, volume = 0.5) {
    if (this.cache.audio.exists('sfx_' + name)) this.sound.play('sfx_' + name, { volume });
  }

  createHud() {
    const style = { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 };
    this.hudCrystals = this.add.text(16, 12, '', style).setScrollFactor(0).setDepth(1000);
    this.hudScore = this.add.text(16, 40, '', style).setScrollFactor(0).setDepth(1000);
    this.hudHealth = this.add.text(this.scale.width - 16, 12, '', Object.assign({}, style, { color: '#ff6b6b' }))
      .setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
    this.add.text(this.scale.width - 16, this.scale.height - 10, 'R respawn   Esc menu', Object.assign({}, style, { fontSize: '13px', strokeThickness: 3 }))
      .setOrigin(1, 1).setScrollFactor(0).setDepth(1000).setAlpha(0.8);
    const title = this.add.text(this.scale.width / 2, this.scale.height / 3, this.levelName,
      Object.assign({}, style, { fontSize: '40px', strokeThickness: 6 })).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.tweens.add({ targets: title, alpha: 0, delay: 1500, duration: 800, onComplete: () => title.destroy() });
    this.updateHud();
  }

  updateHud() {
    this.hudCrystals.setText('Crystals ' + this.collected + '/' + this.crystalsRequired);
    this.hudCrystals.setColor(this.collected >= this.crystalsRequired ? '#7fffa0' : '#7fe9ff');
    this.hudScore.setText('Score ' + this.score);
    this.hudHealth.setText('♥'.repeat(this.health) + '♡'.repeat(this.maxHealth - this.health));
  }

  flashMessage(text, color = '#ffffff') {
    const msg = this.add.text(this.scale.width / 2, 90, text, {
      fontFamily: 'monospace', fontSize: '22px', color, stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    this.tweens.add({ targets: msg, y: 70, alpha: 0, delay: 900, duration: 500, onComplete: () => msg.destroy() });
  }

  bindPlayerEvents() {
    const p = this.player;
    p.on('jump', () => { this.sfx('jump', 0.35); this.dustFx.explode(6, p.x, p.y); });
    p.on('land', () => { this.sfx('land', 0.25); this.dustFx.explode(5, p.x, p.y); });
  }

  bindKeys() {
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));
    this.input.keyboard.on('keydown-R', () => { if (!this.completed) this.player.respawn(this.time.now); });
    this.input.keyboard.on('keydown-G', () => {
      const w = this.physics.world;
      if (!w.debugGraphic) w.createDebugGraphic();
      w.drawDebug = !w.drawDebug;
      w.debugGraphic.clear();
    });
  }

  playerRect() {
    const b = this.player.body;
    return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
  }

  checkCrystals(rect) {
    this.crystals.forEach(c => {
      if (!c.active || !Phaser.Geom.Intersects.RectangleToRectangle(rect, c.getBounds())) return;
      c.setActive(false);
      this.tweens.killTweensOf(c);
      this.collected++;
      this.score += c.points;
      this.sfx('collect', 0.45);
      this.sparkFx.explode(16, c.getCenter().x, c.getCenter().y);
      this.tweens.add({ targets: c, scale: c.scale * 1.8, alpha: 0, duration: 250, onComplete: () => c.destroy() });
      if (this.collected === this.crystalsRequired) this.flashMessage('Exit unlocked!', '#7fffa0');
      this.updateHud();
    });
  }

  checkCheckpoints(rect) {
    this.checkpoints.forEach(cp => {
      if (cp.reached || !Phaser.Geom.Intersects.RectangleToRectangle(rect, cp.getBounds())) return;
      cp.reached = true;
      this.player.spawnPoint = { x: cp.x + cp.displayWidth / 2, y: cp.y };
      this.health = this.maxHealth;
      this.sfx('checkpoint', 0.4);
      this.sparkFx.explode(12, cp.getCenter().x, cp.getCenter().y);
      cp.setTint(0x9dff9d);
      this.tweens.add({ targets: cp, scaleY: cp.scaleY * 1.25, duration: 120, yoyo: true });
      this.flashMessage('Checkpoint!', '#9dff9d');
      this.updateHud();
    });
  }

  checkHazards(time) {
    if (this.player.isInvulnerable(time) || !this.hazardLayers.length) return;
    const b = this.player.body;
    const insetX = b.width * 0.25, insetY = b.height * 0.2;
    for (const layer of this.hazardLayers) {
      const tiles = layer.getTilesWithinWorldXY(b.x + insetX, b.y + insetY, b.width - insetX * 2, b.height - insetY * 1.5, { isNotEmpty: true });
      if (tiles.length) {
        const t = tiles[0];
        this.damage(time, (t.pixelX + t.width / 2) * this.S);
        return;
      }
    }
  }

  damage(time, fromX) {
    this.health--;
    this.sfx('hurt', 0.45);
    this.hurtFx.explode(14, this.player.x, this.player.y - 20);
    this.cameras.main.shake(150, 0.006);
    if (this.health <= 0) {
      this.health = this.maxHealth;
      this.player.respawn(time);
      this.flashMessage('Out of health!', '#ff6b6b');
    } else {
      this.player.hurt(time, fromX);
    }
    this.updateHud();
  }

  checkFall(time) {
    if (this.player.y < this.mapHeight + 60) return;
    this.health--;
    this.sfx('hurt', 0.45);
    this.cameras.main.shake(150, 0.006);
    if (this.health <= 0) {
      this.health = this.maxHealth;
      this.flashMessage('Out of health!', '#ff6b6b');
    }
    this.player.respawn(time);
    this.updateHud();
  }

  checkExit(rect, time) {
    const atExit = this.exits.some(e => Phaser.Geom.Intersects.RectangleToRectangle(rect, e));
    if (!atExit) return;
    if (this.collected >= this.crystalsRequired) {
      this.completeLevel();
    } else if (time - this.lockedMessageAt > 1500) {
      this.lockedMessageAt = time;
      const need = this.crystalsRequired - this.collected;
      this.sfx('locked', 0.4);
      this.flashMessage('Need ' + need + ' more crystal' + (need === 1 ? '' : 's'), '#ffd166');
    }
  }

  completeLevel() {
    this.completed = true;
    const p = this.player;
    p.controlsEnabled = false;
    p.body.setAcceleration(0, 0);
    p.body.setVelocityX(0);
    this.sfx('complete', 0.5);
    this.sparkFx.explode(40, p.x, p.y - 20);
    const seconds = Math.round((this.time.now - this.startTime) / 1000);
    this.time.delayedCall(1200, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('LevelComplete', {
          levelKey: this.scene.key, levelName: this.levelName, score: this.score,
          crystals: this.collected, totalCrystals: this.crystals.length, seconds,
        });
      });
    });
  }

  update(time, delta) {
    this.player.update(time, delta);
    this.platforms.forEach(p => this.updatePlatform(p, time, delta));
    const cam = this.cameras.main;
    this.parallax.forEach(s => {
      s.tilePositionX = (cam.scrollX * s.factor) / this.S;
      s.y = s.baseY - cam.scrollY;
    });
    if (this.completed) return;
    const rect = this.playerRect();
    this.checkCrystals(rect);
    this.checkCheckpoints(rect);
    this.checkHazards(time);
    this.checkFall(time);
    this.checkExit(rect, time);
  }
}
