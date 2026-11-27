// Living backdrop: drifting clouds, bats, candle flames, rain and lightning storms.
import { W, BF, PANEL_Y } from './layout.js';
import { sfx } from './audio.js';

export function installAtmosphere(proto) {
  proto.buildAtmosphere = function () {
    // clouds sliding past the moon (parallax: higher = slower)
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      const y = 70 + i * 34 - BF + Math.random() * 20;
      const c = this.add.image(Math.random() * W, y, 'cloud').setDepth(2).setAlpha(0.55 + Math.random() * 0.3).setScale(1 + Math.random() * 0.8, 0.8 + Math.random() * 0.5);
      c.vx = 4 + i * 2.2 + Math.random() * 3;
      this.clouds.push(c);
    }
    // candle flames on some graves
    for (const cd of this.registry.get('candles') || []) {
      const y = cd.y - BF;
      if (y > PANEL_Y - 10) continue;
      const f = this.add.image(cd.x, y, 'flame').setOrigin(0.5, 1).setDepth(4).setScale(1.2);
      const h = this.add.image(cd.x, y - 6, 'soft').setTint(0xffa040).setBlendMode(Phaser.BlendModes.ADD).setDepth(4).setScale(1.3).setAlpha(0.6);
      this.tweens.add({ targets: f, scaleY: { from: 1.05, to: 1.35 }, scaleX: { from: 1.3, to: 1.1 }, duration: 160 + Math.random() * 120, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: h, alpha: { from: 0.4, to: 0.8 }, scale: { from: 1.1, to: 1.5 }, duration: 220 + Math.random() * 160, yoyo: true, repeat: -1 });
    }
    // occasional bats
    const batLoop = () => { this.spawnBats(); this.time.delayedCall(9000 + Math.random() * 9000, batLoop); };
    this.time.delayedCall(4000, batLoop);
    // weather layers
    this.rainFx = this.add.particles(0, 0, 'rain', {
      x: { min: -80, max: W + 40 }, y: -10, lifespan: 1100, speedY: { min: 520, max: 640 }, speedX: { min: 80, max: 110 },
      rotate: -10, alpha: { start: 0.7, end: 0.3 }, scale: { min: 0.8, max: 1.3 }, frequency: 12, quantity: 2, emitting: false,
    }).setDepth(870);
    this.rainSplash = this.add.particles(0, 0, 'px', {
      x: { min: 0, max: W }, y: { min: 330 - BF, max: PANEL_Y - 6 }, lifespan: 260, speedY: { min: -40, max: -10 }, speedX: { min: -20, max: 20 },
      scale: { start: 0.6, end: 0 }, tint: 0xb8c8ff, alpha: { start: 0.7, end: 0 }, frequency: 25, emitting: false,
    }).setDepth(871);
    this.rainShade = this.add.rectangle(W / 2, PANEL_Y / 2, W, PANEL_Y, 0x101830, 0).setDepth(865);
    this.weather = 'clear';
  };

  proto.spawnBats = function () {
    if (!this.scene.isActive()) return;
    const n = 3 + ((Math.random() * 4) | 0), dir = Math.random() < 0.5 ? 1 : -1;
    const y0 = 40 + Math.random() * 110;
    for (let i = 0; i < n; i++) {
      const b = this.add.sprite(dir > 0 ? -20 - i * 18 : W + 20 + i * 18, y0 + (Math.random() - 0.5) * 30, 'bat').setDepth(3).setScale(0.8 + Math.random() * 0.6).play('bat_fly');
      b.setFlipX(dir < 0);
      const dur = 4200 + Math.random() * 2000;
      this.tweens.add({ targets: b, x: dir > 0 ? W + 40 : -40, duration: dur, delay: i * 120, onComplete: () => b.destroy() });
      this.tweens.add({ targets: b, y: b.y - 20 - Math.random() * 20, duration: 600 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  };

  // pick the weather for the next wave (purely atmospheric)
  proto.rollWeather = function () {
    const x = Math.random();
    const w = this.wave < 3 ? 'clear' : x < 0.18 ? 'storm' : x < 0.42 ? 'rain' : 'clear';
    this.setWeather(w);
  };

  proto.setWeather = function (w) {
    this.weather = w;
    const wet = w !== 'clear';
    this.rainFx.emitting = wet; this.rainSplash.emitting = wet;
    this.tweens.add({ targets: this.rainShade, fillAlpha: w === 'storm' ? 0.2 : wet ? 0.1 : 0, duration: 1500 });
    this.lightningT = 4 + Math.random() * 6;
  };

  proto.updateAtmosphere = function (dt) {
    for (const c of this.clouds) { c.x += c.vx * dt; if (c.x - c.displayWidth / 2 > W) c.x = -c.displayWidth / 2; }
    if (this.weather === 'storm') {
      this.lightningT -= dt;
      if (this.lightningT <= 0) { this.lightningT = 6 + Math.random() * 9; this.lightning(); }
    }
  };

  proto.lightning = function () {
    const x = 60 + Math.random() * (W - 120);
    const g = this.add.graphics().setDepth(866).setBlendMode(Phaser.BlendModes.ADD);
    let px = x, py = -10;
    const segs = [];
    while (py < 230 - BF + Math.random() * 60) { const nx = px + (Math.random() - 0.5) * 34, ny = py + 14 + Math.random() * 18; segs.push([px, py, nx, ny]); if (Math.random() < 0.25) segs.push([nx, ny, nx + (Math.random() - 0.5) * 50, ny + 20 + Math.random() * 20]); px = nx; py = ny; }
    for (const [w, a] of [[6, 0.25], [2.5, 1]]) { g.lineStyle(w, 0xd8e0ff, a); for (const s of segs) g.lineBetween(...s); }
    const flash = this.add.rectangle(W / 2, PANEL_Y / 2, W, PANEL_Y, 0xd8e0ff, 0.55).setDepth(867).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: [flash, g], alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => { flash.destroy(); g.destroy(); } });
    if (this.lightsOn) {
      const L = this.lights.addLight(x, 120 - BF, 900, 0xc8d0ff, 2.2);
      this.tweens.add({ targets: L, intensity: 0, duration: 450, onComplete: () => this.lights.removeLight(L) });
    }
    this.time.delayedCall(250 + Math.random() * 700, () => sfx.thunder());
  };
}
