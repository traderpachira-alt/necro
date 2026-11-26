// A battlefield combatant (necromancer, summoned creature or holy enemy).
import { RARITIES } from './data.js';
import { sfx } from './audio.js';

const ORIGIN_Y = 44 / 48;
const ENEMY_MAX_X = 490; // right-most x an enemy may attack from (fully on screen)
let UID = 1;

export class Unit {
  constructor(scene, opts) {
    this.id = UID++;
    this.scene = scene;
    this.key = opts.key;
    this.team = opts.team; // 'ally' | 'enemy'
    this.isNecro = !!opts.isNecro;
    this.rarity = opts.rarity || 0;
    this.level = opts.level || 1;
    this.base = opts.stats;
    this.name = opts.name || opts.stats.name;
    const mult = opts.mult ?? RARITIES[this.rarity].mult;
    this.maxHp = Math.round(this.base.hp * mult);
    this.hp = this.maxHp;
    this.atk = this.base.atk * mult;
    this.heal = (this.base.heal || 0) * mult;
    this.range = this.base.range;
    this.speed = this.base.speed;
    this.shield = 0;
    this.x = opts.x; this.y = opts.y;
    this.kx = 0; // knockback offset
    this.cd = Math.random() * 0.5;
    this.healT = 1;
    this.dead = false;
    this.attacking = false;
    this.radius = this.key === 'golem' || this.key === 'inquisitor' ? 18 : 12;
    this.tex = opts.texKey || this.key;
    this.slot = null;

    const lit = scene.lightsOn;
    this.shadow = scene.add.image(this.x, this.y, 'shadow').setScale(this.radius / 14, 1.4).setAlpha(0.8).setDepth(5);
    if (this.rarity > 0 && this.team === 'ally' && !this.isNecro) {
      this.aura = scene.add.image(this.x, this.y, 'aura').setTint(RARITIES[this.rarity].hex).setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setScale(this.radius / 14, 1);
      scene.tweens.add({ targets: this.aura, alpha: { from: 0.35, to: 0.9 }, duration: 900, yoyo: true, repeat: -1 });
    }
    this.sprite = scene.add.sprite(this.x, this.y, this.tex, 0).setOrigin(0.5, ORIGIN_Y).setScale(2);
    if (lit) this.sprite.setPipeline('Light2D');
    if (opts.tint) this.sprite.setTint(opts.tint);
    this.glow = scene.add.sprite(this.x, this.y, this.tex + '_g', 0).setOrigin(0.5, ORIGIN_Y).setScale(2).setBlendMode(Phaser.BlendModes.ADD);
    this.flash = scene.add.sprite(this.x, this.y, this.tex, 0).setOrigin(0.5, ORIGIN_Y).setScale(2).setTintFill(0xffffff).setVisible(false);
    this.bar = scene.add.graphics().setDepth(900);
    this.playAnim('idle');
    this.sprite.on('animationcomplete', (a) => { if (a.key.endsWith('_attack')) { this.attacking = false; this.playAnim('idle'); } });
    this.sync();
  }

  get alive() { return !this.dead; }
  get cx() { return this.x; }
  get topY() { return this.y - 70; }

  playAnim(name) {
    const k = `${this.tex}_${name}`;
    if (this.sprite.anims.currentAnim?.key === k && this.sprite.anims.isPlaying) return;
    this.sprite.play(k, true);
    if (name === 'idle') this.sprite.anims.setProgress(Math.random());
  }

  sync() {
    const s = this.sprite;
    const x = this.x + this.kx, y = this.y + (this.rise || 0);
    s.setPosition(x, y).setDepth(this.y);
    if (this.rise > 0) {
      const vis = Math.max(1, Math.round(44 - this.rise / 2));
      s.setCrop(0, 0, 48, vis); this.glow.setCrop(0, 0, 48, vis);
    } else if (s.isCropped) { s.setCrop(); this.glow.setCrop(); }
    const fr = s.frame.name;
    this.glow.setPosition(x, y).setDepth(this.y + 0.1).setFrame(fr).setAlpha(s.alpha * 0.75);
    this.glow.setScale(s.scaleX, s.scaleY);
    if (this.flash.visible) this.flash.setPosition(x, y).setDepth(this.y + 0.2).setFrame(fr).setScale(s.scaleX, s.scaleY);
    this.shadow.setPosition(this.x, this.y + 1);
    if (this.aura) this.aura.setPosition(this.x, this.y + 1);
    this.drawBar();
  }

  drawBar() {
    const g = this.bar; g.clear();
    if (this.dead || this.hidden) return;
    const w = this.isNecro ? 56 : this.base.boss ? 60 : 38, h = this.isNecro ? 6 : 5;
    const x = Math.round(this.x - w / 2), y = Math.round(this.y - (this.isNecro ? 98 : this.key === 'golem' || this.key === 'inquisitor' ? 86 : 80));
    g.fillStyle(0x05030a, 0.85).fillRect(x - 1, y - 1, w + 2, h + 2);
    const pct = Math.max(0, this.hp / this.maxHp);
    const col = this.team === 'ally' ? (this.isNecro ? 0x9b6bff : 0x5ee06a) : 0xe8434f;
    g.fillStyle(0x2a1a2a, 1).fillRect(x, y, w, h);
    g.fillStyle(col, 1).fillRect(x, y, Math.round(w * pct), h);
    g.fillStyle(0xffffff, 0.25).fillRect(x, y, Math.round(w * pct), 1);
    if (this.shield > 0) g.fillStyle(0x9fdcff, 0.9).fillRect(x, y - 3, Math.round(w * Math.min(1, this.shield / this.maxHp)), 2);
    if (this.team === 'ally' && !this.isNecro && this.rarity > 0) g.fillStyle(RARITIES[this.rarity].hex, 1).fillRect(x - 4, y, 2, h);
  }

  update(dt, game) {
    if (this.dead) return;
    this.cd -= dt; this.healT -= dt;
    if (this.attacking) return;
    // healers
    if (this.heal && this.healT <= 0) {
      const t = game.healTarget(this);
      if (t) { this.healT = this.base.healCd; this.doAttack(t, true); return; }
      this.healT = 0.4;
    }
    const target = game.findTarget(this);
    if (!target) {
      if (this.homeX != null && this.speed > 0 && game.state !== 'battle') this.walkTo(this.homeX, this.homeY, dt);
      else this.playAnim('idle');
      return;
    }
    const dx = target.x - this.x, dy = target.y - this.y;
    const d = Math.hypot(dx, dy * 1.6);
    const reach = this.range + target.radius;
    // enemies must step fully onto the visible battlefield before they may stop and attack
    const offscreen = this.team === 'enemy' && this.x > ENEMY_MAX_X;
    if ((d > reach || offscreen) && this.speed > 0) {
      const step = this.speed * dt;
      let vx = (dx / d) * step, vy = (dy / Math.max(1, Math.hypot(dx, dy))) * step * 0.8;
      if (Math.abs(dx) < reach * 0.5 && Math.abs(dy) > 10) vx *= 0.3;
      if (offscreen && d <= reach) { vx = -step; vy = 0; }
      // separation
      for (const o of game.units) {
        if (o === this || o.dead || o.team !== this.team) continue;
        const ox = this.x - o.x, oy = this.y - o.y, od = Math.hypot(ox, oy);
        if (od < 26 && od > 0.01) { vx += (ox / od) * step * 0.4; vy += (oy / od) * step * 0.6; }
      }
      this.x += vx; this.y = Phaser.Math.Clamp(this.y + vy, 405, 540);
      if (this.team === 'ally') this.x = Math.min(this.x, 520);
      this.playAnim('walk');
    } else if (d <= reach) {
      if (this.cd <= 0) { this.cd = this.base.cd * (0.9 + Math.random() * 0.2); this.doAttack(target, false); }
      else this.playAnim('idle');
    } else this.playAnim('idle');
  }

  walkTo(x, y, dt) {
    const dx = x - this.x, dy = y - this.y, d = Math.hypot(dx, dy);
    if (d < 2) { this.x = x; this.y = y; this.playAnim('idle'); return true; }
    const step = Math.min(d, Math.max(60, this.speed) * dt);
    this.x += (dx / d) * step; this.y += (dy / d) * step;
    this.playAnim('walk');
    return false;
  }

  doAttack(target, isHeal) {
    this.attacking = true;
    this.sprite.play(`${this.tex}_attack`, true);
    const game = this.scene;
    game.time.delayedCall(160, () => {
      if (this.dead) return;
      if (isHeal) { game.spawnProjectile(this, target, this.team === 'ally' ? 'wisp' : 'holyheal', this.heal, true); return; }
      if (target.dead) return;
      const proj = this.base.proj;
      let dmg = this.atk * game.atkMult(this);
      let crit = false;
      if (this.base.crit && Math.random() < this.base.crit) { dmg *= 2; crit = true; }
      if (proj) game.spawnProjectile(this, target, proj, dmg, false, crit);
      else game.meleeHit(this, target, dmg, crit);
    });
  }

  takeDamage(dmg, crit, src) {
    if (this.dead) return;
    dmg = Math.round(dmg);
    if (this.shield > 0) { const a = Math.min(this.shield, dmg); this.shield -= a; dmg -= a; }
    this.hp -= dmg;
    const game = this.scene;
    game.floatText(this.x + Phaser.Math.Between(-8, 8), this.y - 72, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffcf4a' : this.team === 'ally' ? '#ff6b6b' : '#ffffff', crit ? 22 : 16);
    // hurt flash + knockback
    this.flash.setVisible(true).setAlpha(0.6);
    game.time.delayedCall(60, () => this.flash.setVisible(false));
    const dir = src && src.x > this.x ? -1 : 1;
    game.tweens.add({ targets: this, kx: dir * (crit ? 8 : 4), duration: 60, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { this.kx = 0; } });
    game.hitSparks(this.x, this.y - 40, this.team === 'ally' ? 0xc8ffb8 : 0xfff2c0, crit ? 14 : 6);
    if (crit) sfx.crit(); else sfx.hit();
    if (this.hp <= 0) this.die();
  }

  receiveHeal(v) {
    if (this.dead) return;
    const amt = Math.min(Math.round(v), this.maxHp - this.hp);
    this.hp += amt;
    if (amt > 0) this.scene.floatText(this.x, this.y - 74, `+${amt}`, '#6dff9a', 15);
  }

  die() {
    if (this.dead) return;
    this.dead = true; this.hp = 0;
    const game = this.scene;
    this.bar.clear();
    game.onUnitDeath(this);
    this.sprite.anims.stop();
    const parts = [this.sprite, this.glow, this.shadow, this.aura].filter(Boolean);
    if (this.team === 'ally') {
      sfx.bones();
      game.deathBurst(this, this.key === 'wolf' || this.key === 'banshee' ? [0x6ac8e0, 0xc4f2ff] : [0xd6ccb0, 0x8a7d66, 0x6a5a4a]);
      game.tweens.add({ targets: [this.sprite, this.glow], scaleY: 0.2, scaleX: 2.6, alpha: 0, duration: 420, ease: 'Quad.easeIn' });
    } else {
      sfx.death();
      game.deathBurst(this, [0xfff2c0, 0xffd36a, 0xffffff]);
      this.sprite.setTint(0xffe8a0);
      game.tweens.add({ targets: [this.sprite, this.glow], y: this.y - 30, alpha: 0, duration: 650, ease: 'Sine.easeIn' });
    }
    game.tweens.add({ targets: [this.shadow, this.aura].filter(Boolean), alpha: 0, duration: 400 });
    game.time.delayedCall(800, () => { parts.forEach((p) => p.destroy()); this.flash.destroy(); this.bar.destroy(); });
  }

  destroy() {
    [this.sprite, this.glow, this.flash, this.shadow, this.aura, this.bar].forEach((p) => p && p.destroy());
  }
}
