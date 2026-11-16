class Player extends Phaser.Physics.Arcade.Sprite {
  static preload(scene) {
    ['Body', 'Jump', 'Drive1', 'Drive2', 'Hurt'].forEach(n =>
      scene.load.image('robot' + n, 'assets/sprites/robot/robot_red' + n + '.png'));
  }

  constructor(scene, x, y, options = {}) {
    super(scene, x, y, 'robotDrive1');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.cfg = Object.assign({
      scale: 0.3,
      maxSpeed: 240,
      groundAccel: 1500,
      airAccel: 900,
      turnBoost: 2,
      groundDrag: 1800,
      airDrag: 250,
      jumpVelocity: 430,
      jumpCutMultiplier: 0.45,
      coyoteMs: 100,
      jumpBufferMs: 120,
      maxFallSpeed: 700,
      dropThroughMs: 250,
      bodyWidth: 150,
      bodyHeight: 120,
      invulnerableMs: 1200,
      hurtControlMs: 250,
    }, options);

    const c = this.cfg;
    this.setOrigin(0.5, 1);
    this.setScale(c.scale);
    this.setDepth(50);
    this.setCollideWorldBounds(true);
    this.body.setMaxVelocity(c.maxSpeed, c.maxFallSpeed);
    this.body.setSize(c.bodyWidth, c.bodyHeight, false);
    this.fitBody();

    this.keys = scene.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S', space: 'SPACE',
    });

    this.spawnPoint = { x, y };
    this.controlsEnabled = true;
    this.lastGroundedAt = -Infinity;
    this.lastJumpPressAt = -Infinity;
    this.jumpHeld = false;
    this.wasOnGround = false;
    this.dropUntil = 0;
    this.driveTimer = 0;
    this.driveFrame = 0;
    this.invulnerableUntil = 0;
    this.stunnedUntil = 0;
  }

  fitBody() {
    const c = this.cfg;
    this.body.setOffset((this.frame.width - c.bodyWidth) / 2, this.frame.height - c.bodyHeight);
  }

  get onGround() {
    return this.body.blocked.down || this.body.touching.down;
  }

  isDropping(time) {
    return time < this.dropUntil;
  }

  isInvulnerable(time) {
    return time < this.invulnerableUntil;
  }

  update(time, delta) {
    const k = this.keys, b = this.body, c = this.cfg;
    const onGround = this.onGround;
    const canControl = this.controlsEnabled && time >= this.stunnedUntil;

    if (onGround) {
      this.lastGroundedAt = time;
      if (!this.wasOnGround) this.emit('land');
    }
    this.wasOnGround = onGround;

    const left = canControl && (k.left.isDown || k.a.isDown);
    const right = canControl && (k.right.isDown || k.d.isDown);
    const jumpDown = canControl && (k.up.isDown || k.w.isDown || k.space.isDown);
    const jumpPressed = canControl && (
      Phaser.Input.Keyboard.JustDown(k.up) ||
      Phaser.Input.Keyboard.JustDown(k.w) ||
      Phaser.Input.Keyboard.JustDown(k.space));
    const downPressed = canControl && (
      Phaser.Input.Keyboard.JustDown(k.down) || Phaser.Input.Keyboard.JustDown(k.s));

    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0) {
      const reversing = Math.sign(b.velocity.x) === -dir;
      const accel = (onGround ? c.groundAccel : c.airAccel) * (reversing ? c.turnBoost : 1);
      b.setAccelerationX(dir * accel);
      this.setFlipX(dir < 0);
    } else {
      b.setAccelerationX(0);
    }
    b.setDragX(onGround ? c.groundDrag : c.airDrag);

    if (jumpPressed) this.lastJumpPressAt = time;
    const buffered = time - this.lastJumpPressAt <= c.jumpBufferMs;
    const coyote = time - this.lastGroundedAt <= c.coyoteMs;
    if (buffered && coyote) {
      b.setVelocityY(-c.jumpVelocity);
      this.lastJumpPressAt = -Infinity;
      this.lastGroundedAt = -Infinity;
      this.jumpHeld = true;
      this.emit('jump');
    }

    if (this.jumpHeld && (!jumpDown || b.velocity.y >= 0)) {
      if (b.velocity.y < 0) b.setVelocityY(b.velocity.y * c.jumpCutMultiplier);
      this.jumpHeld = false;
    }

    if (downPressed && onGround) this.dropUntil = time + c.dropThroughMs;

    this.setAlpha(this.isInvulnerable(time) && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);
    this.updateTexture(time, onGround, delta);
  }

  updateTexture(time, onGround, delta) {
    let key;
    if (time < this.stunnedUntil) {
      key = 'robotHurt';
    } else if (!onGround) {
      key = 'robotJump';
    } else if (Math.abs(this.body.velocity.x) > 20) {
      this.driveTimer += delta * (Math.abs(this.body.velocity.x) / this.cfg.maxSpeed);
      if (this.driveTimer > 90) { this.driveTimer = 0; this.driveFrame ^= 1; }
      key = this.driveFrame ? 'robotDrive2' : 'robotDrive1';
    } else {
      key = 'robotDrive1';
    }
    if (this.texture.key !== key) {
      this.setTexture(key);
      this.fitBody();
    }
  }

  hurt(time, fromX) {
    const c = this.cfg;
    const away = this.x < fromX ? -1 : 1;
    this.body.setAccelerationX(0);
    this.body.setVelocity(away * 200, -280);
    this.jumpHeld = false;
    this.invulnerableUntil = time + c.invulnerableMs;
    this.stunnedUntil = time + c.hurtControlMs;
    this.emit('hurt');
  }

  respawn(time = 0) {
    this.setPosition(this.spawnPoint.x, this.spawnPoint.y);
    this.body.reset(this.spawnPoint.x, this.spawnPoint.y);
    this.jumpHeld = false;
    this.invulnerableUntil = time + this.cfg.invulnerableMs;
    this.emit('respawn');
  }
}
