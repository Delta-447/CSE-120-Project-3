// Player.js - reusable robot movement for Robot Escape.
// Both levels can use it:
//   preload():  Player.preload(this);
//   create():   this.player = new Player(this, x, y);
//   update():   this.player.update(time, delta);
//
// Feel features: acceleration + drag (not instant speed), faster turnaround,
// variable jump height (release jump early = shorter hop), coyote time
// (jump shortly after walking off a ledge), jump buffering (press jump
// slightly before landing), drop-through for one-way platforms (Down key).
//
// Events emitted (hook sounds/particles onto these later):
//   'jump', 'land', 'respawn'

class Player extends Phaser.Physics.Arcade.Sprite {
  static preload(scene) {
    ['Body', 'Jump', 'Drive1', 'Drive2', 'Hurt'].forEach(n =>
      scene.load.image('robot' + n, 'assets/robot_red' + n + '.png'));
  }

  constructor(scene, x, y, options = {}) {
    super(scene, x, y, 'robotDrive1');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Tuning values - tweak these to change how the robot feels.
    this.cfg = Object.assign({
      scale: 0.3,            // robot art is ~180px, so 0.3 -> ~54px on screen
      maxSpeed: 240,         // px/s horizontal
      groundAccel: 1500,     // px/s^2 when on the ground
      airAccel: 900,         // less control in the air
      turnBoost: 2,          // accel multiplier when reversing direction
      groundDrag: 1800,      // how fast you stop when no key is held
      airDrag: 250,
      jumpVelocity: 430,     // ~3 tiles high with gravity 900
      jumpCutMultiplier: 0.45, // upward speed kept when jump is released early
      coyoteMs: 100,
      jumpBufferMs: 120,
      maxFallSpeed: 700,
      dropThroughMs: 250,    // how long one-way platforms ignore you after pressing Down
      bodyWidth: 150,        // collision box in unscaled texture pixels
      bodyHeight: 120,
    }, options);

    const c = this.cfg;
    this.setOrigin(0.5, 1);  // x/y = the robot's feet, so spawn points sit on the ground
    this.setScale(c.scale);
    this.setDepth(10);
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
    this.jumpHeld = false;     // true while rising from a jump the player is still holding
    this.wasOnGround = false;
    this.dropUntil = 0;
    this.driveTimer = 0;
    this.driveFrame = 0;
  }

  // Keep the collision box centered horizontally and resting on the treads,
  // even though each robot image is a different size.
  fitBody() {
    const c = this.cfg;
    this.body.setOffset((this.frame.width - c.bodyWidth) / 2, this.frame.height - c.bodyHeight);
  }

  get onGround() {
    return this.body.blocked.down || this.body.touching.down;
  }

  // Used by one-way platform colliders: true while the player is dropping through.
  isDropping(time) {
    return time < this.dropUntil;
  }

  update(time, delta) {
    const k = this.keys, b = this.body, c = this.cfg;
    const onGround = this.onGround;

    if (onGround) {
      this.lastGroundedAt = time;
      if (!this.wasOnGround) this.emit('land');
    }
    this.wasOnGround = onGround;

    const left = this.controlsEnabled && (k.left.isDown || k.a.isDown);
    const right = this.controlsEnabled && (k.right.isDown || k.d.isDown);
    const jumpDown = this.controlsEnabled && (k.up.isDown || k.w.isDown || k.space.isDown);
    const jumpPressed = this.controlsEnabled && (
      Phaser.Input.Keyboard.JustDown(k.up) ||
      Phaser.Input.Keyboard.JustDown(k.w) ||
      Phaser.Input.Keyboard.JustDown(k.space));
    const downPressed = this.controlsEnabled && (
      Phaser.Input.Keyboard.JustDown(k.down) || Phaser.Input.Keyboard.JustDown(k.s));

    // --- Horizontal movement ---
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0) {
      const reversing = Math.sign(b.velocity.x) === -dir;
      const accel = (onGround ? c.groundAccel : c.airAccel) * (reversing ? c.turnBoost : 1);
      b.setAccelerationX(dir * accel);
      this.setFlipX(dir < 0); // art faces right
    } else {
      b.setAccelerationX(0);
    }
    b.setDragX(onGround ? c.groundDrag : c.airDrag);

    // --- Jumping (buffer + coyote time) ---
    if (jumpPressed) this.lastJumpPressAt = time;
    const buffered = time - this.lastJumpPressAt <= c.jumpBufferMs;
    const coyote = time - this.lastGroundedAt <= c.coyoteMs;
    if (buffered && coyote) {
      b.setVelocityY(-c.jumpVelocity);
      this.lastJumpPressAt = -Infinity;
      this.lastGroundedAt = -Infinity; // no second jump from the same coyote window
      this.jumpHeld = true;
      this.emit('jump');
    }

    // Variable jump height: letting go early cuts the rise short.
    if (this.jumpHeld && (!jumpDown || b.velocity.y >= 0)) {
      if (b.velocity.y < 0) b.setVelocityY(b.velocity.y * c.jumpCutMultiplier);
      this.jumpHeld = false;
    }

    // Drop through one-way platforms.
    if (downPressed && onGround) this.dropUntil = time + c.dropThroughMs;

    this.updateTexture(onGround, delta);
  }

  updateTexture(onGround, delta) {
    let key;
    if (!onGround) {
      key = 'robotJump';
    } else if (Math.abs(this.body.velocity.x) > 20) {
      // Alternate the two drive frames; faster movement = faster treads.
      this.driveTimer += delta * (Math.abs(this.body.velocity.x) / this.cfg.maxSpeed);
      if (this.driveTimer > 90) { this.driveTimer = 0; this.driveFrame ^= 1; }
      key = this.driveFrame ? 'robotDrive2' : 'robotDrive1';
    } else {
      key = 'robotDrive1'; // idle (robot_redBody has no treads, so it would look like it's floating)
    }
    if (this.texture.key !== key) {
      this.setTexture(key);
      this.fitBody();
    }
  }

  respawn() {
    this.setPosition(this.spawnPoint.x, this.spawnPoint.y);
    this.body.reset(this.spawnPoint.x, this.spawnPoint.y);
    this.setTexture('robotHurt');
    this.fitBody();
    this.jumpHeld = false;
    this.scene.tweens.add({ targets: this, alpha: 0.3, yoyo: true, repeat: 3, duration: 80,
      onComplete: () => this.setAlpha(1) });
    this.emit('respawn');
  }
}
