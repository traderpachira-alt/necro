// A battlefield combatant (necromancer, summoned creature or holy enemy).
import { RARITIES, MAX_LEVEL, itemStats } from './data.js';
import { sfx } from './audio.js';
import { BF } from './layout.js';
import { SS } from './pixel.js';
import { ensureTier, tierOf, texFor } from './boot.js';

const ORIGIN_Y = 44 / 48;
const ENEMY_MAX_X = 490; // right-most x a melee enemy may attack from (fully on screen)
const RANGED_ENEMY_MAX_X = 400; // ranged enemies step in far enough for our archers to answer
const LEASH_X = 440; // melee allies do not chase enemies further right than this line
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
    this.fixedMult = opts.mult;
    this.range = this.base.range;
    this.speed = this.base.speed;
    this.shield = 0;
    this.x = opts.x; this.y = opts.y;
    this.kx = 0; // knockback offset
    this.cd = Math.random() * 0.5;
    this.healT = 1;
    this.dead = false;
    this.attacking = false;
    this.radius = ['golem', 'giant', 'catapult', 'inquisitor', 'cavalry', 'paladin'].includes(this.key) ? 18 : this.key === 'archangel' ? 24 : 12;
    this.slot = null;
    this.item = null;
    this.syn = {};
    this.elite = !!opts.elite;
    this.tier = this.team === 'ally' && !this.isNecro ? tierOf(this.level) : 0;
    this.baseSc = (opts.scale || this.base.scale || 2) / SS;
    this.sc = this.baseSc * (this.tier === 2 ? 1.12 : 1);
    this.tex = opts.texKey || (this.tier ? ensureTier(scene, this.key, this.tier) : this.key);
    this.card = opts.card || null;
    this.recalc(true);

    const lit = scene.lightsOn;
    this.shadow = scene.add.image(this.x, this.y, 'shadow').setScale(this.radius / 14, 1.4).setAlpha(0.8).setDepth(5);
    this.sprite = scene.add.sprite(this.x, this.y, this.tex, 0).setOrigin(0.5, ORIGIN_Y).setScale(this.sc);
    if (lit) this.sprite.setPipeline('Light2D');
    if (opts.tint) this.sprite.setTint(opts.tint);
    this.glow = scene.add.sprite(this.x, this.y, this.tex + '_g', 0).setOrigin(0.5, ORIGIN_Y).setScale(this.sc).setBlendMode(Phaser.BlendModes.ADD);
    this.flash = scene.add.sprite(this.x, this.y, this.tex, 0).setOrigin(0.5, ORIGIN_Y).setScale(this.sc).setTintFill(0xffffff).setVisible(false);
    this.bar = scene.add.graphics().setDepth(900);
    this.updateAura();
    this.updateTierFx();
    this.playAnim('idle');
    this.sprite.on('animationcomplete', (a) => { if (a.key.endsWith('_attack')) { this.attacking = false; this.playAnim('idle'); } });
    this.sync();
  }

  // (Re)compute stats from rarity, level and the scene's run/meta modifiers.
  recalc(fresh) {
    const ratio = fresh ? 1 : this.hp / this.maxHp;
    let m;
    if (this.fixedMult != null) m = { hp: this.fixedMult, atk: this.fixedMult, heal: this.fixedMult };
    else m = this.scene.allyMult(this);
    this.maxHp = Math.round(this.base.hp * m.hp);
    this.atk = this.base.atk * m.atk;
    this.heal = (this.base.heal || 0) * m.heal;
    this.hp = Math.max(1, Math.round(this.maxHp * ratio));
  }

  updateAura() {
    if (this.team === 'enemy' && this.elite) {
      this.aura = this.scene.add.image(this.x, this.y, 'aura').setTint(0xffc23a).setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setScale(this.radius / 12, 1.2);
      this.auraTween = this.scene.tweens.add({ targets: this.aura, alpha: { from: 0.5, to: 1 }, duration: 500, yoyo: true, repeat: -1 });
      return;
    }
    if (this.team !== 'ally' || this.isNecro) return;
    this.auraTween?.remove();
    this.aura?.destroy();
    this.aura = null;
    if (this.rarity > 0) {
      this.aura = this.scene.add.image(this.x, this.y, 'aura').setTint(RARITIES[this.rarity].hex).setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setScale(this.radius / 14, 1);
      this.auraTween = this.scene.tweens.add({ targets: this.aura, alpha: { from: 0.35, to: 0.9 }, duration: 900, yoyo: true, repeat: -1 });
    }
  }

  setLevel(level, rarity) {
    this.level = Math.min(MAX_LEVEL, level);
    const t = tierOf(this.level);
    if (t !== this.tier && this.team === 'ally' && !this.isNecro) this.setTier(t);
    if (rarity != null && rarity !== this.rarity) { this.rarity = rarity; this.updateAura(); }
    this.recalc(true);
  }

  get alive() { return !this.dead; }

  // legendary-form creatures shed a constant trickle of glowing motes
  updateTierFx() {
    this.tierFx?.destroy(); this.tierFx = null;
    if (this.tier !== 2) return;
    const col = this.rarity ? RARITIES[this.rarity].hex : 0xffd36a;
    this.tierFx = this.scene.add.particles(0, 0, 'soft', {
      x: { min: -18, max: 18 }, y: { min: -70, max: -10 }, lifespan: 900, speedY: { min: -40, max: -15 }, speedX: { min: -8, max: 8 },
      scale: { start: 0.35, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [col, 0xffffff], blendMode: 'ADD', frequency: 110,
    }).setDepth(this.y + 0.3);
    this.tierFx.startFollow(this.sprite);
  }

  // swap to the evolved look
  setTier(t) {
    this.tier = t;
    this.tex = ensureTier(this.scene, this.key, t);
    this.sc = this.baseSc * (t === 2 ? 1.12 : 1);
    this.sprite.setTexture(this.tex, 0).setScale(this.sc);
    this.glow.setTexture(this.tex + '_g', 0).setScale(this.sc);
    this.flash.setTexture(this.tex, 0).setScale(this.sc);
    this.sprite.anims.stop(); this.playAnim('idle');
    this.evolved = true;
    this.updateTierFx();
  }

  // item stat helper
  ist(k) { return (this.item ? (itemStats(this.item)[k] || 0) : 0) + (this.syn[k] || 0); }

  setItem(item) {
    this.item = item;
    this.itemIcon?.destroy(); this.itemIcon = null;
    if (item) {
      this.itemIcon = this.scene.add.image(this.x, this.y, 'item_' + item.id).setScale(0.26).setDepth(901);
    }
    this.recalc(false);
  }

  playAnim(name) {
    const k = `${this.tex}_${name}`;
    if (this.sprite.anims.currentAnim?.key === k && this.sprite.anims.isPlaying) return;
    this.sprite.play(k, true);
    if (name === 'idle') this.sprite.anims.setProgress(Math.random());
  }

  sync() {
    const s = this.sprite;
    const lift = this.dragging ? -14 : 0;
    const x = this.x + this.kx, y = this.y + (this.rise || 0) + lift;
    s.setPosition(x, y).setDepth(this.dragging ? 1100 : this.y);
    if (this.rise > 0) {
      const vis = Math.max(1, Math.round((44 - this.rise / 2) * SS));
      s.setCrop(0, 0, 48 * SS, vis); this.glow.setCrop(0, 0, 48 * SS, vis);
    } else if (s.isCropped) { s.setCrop(); this.glow.setCrop(); }
    const fr = s.frame.name;
    this.glow.setPosition(x, y).setDepth(s.depth + 0.1).setFrame(fr).setAlpha(s.alpha * 0.75);
    this.glow.setScale(s.scaleX, s.scaleY);
    if (this.flash.visible) this.flash.setPosition(x, y).setDepth(s.depth + 0.2).setFrame(fr).setScale(s.scaleX, s.scaleY);
    this.shadow.setPosition(this.x, this.y + 1).setAlpha(this.dragging ? 0.4 : 0.8);
    if (this.aura) this.aura.setPosition(this.x, this.y + 1);
    this.drawBar();
  }

  drawBar() {
    const g = this.bar; g.clear();
    if (this.dead || this.hidden) { this.itemIcon?.setVisible(false); return; }
    const big = this.radius > 12;
    const w = this.isNecro ? 56 : this.base.boss ? 60 : big ? 46 : 38, h = this.isNecro ? 6 : 5;
    const x = Math.round(this.x - w / 2), y = Math.round(this.y - (this.isNecro ? 98 : this.key === 'archangel' ? 118 : big ? 88 : 80)) + (this.dragging ? -14 : 0);
    g.fillStyle(0x05030a, 0.85).fillRect(x - 1, y - 1, w + 2, h + 2);
    const pct = Math.max(0, this.hp / this.maxHp);
    const col = this.team === 'ally' ? (this.isNecro ? 0x9b6bff : 0x5ee06a) : this.elite ? 0xffa030 : 0xe8434f;
    g.fillStyle(0x2a1a2a, 1).fillRect(x, y, w, h);
    g.fillStyle(col, 1).fillRect(x, y, Math.round(w * pct), h);
    g.fillStyle(0xffffff, 0.25).fillRect(x, y, Math.round(w * pct), 1);
    if (this.itemIcon) {
      this.itemIcon.setPosition(x - 12, y + 2).setVisible(!this.hidden);
      g.fillStyle(0x05030a, 0.9).fillCircle(x - 12, y + 2, 10);
      g.lineStyle(2, RARITIES[this.item.rarity].hex, 1).strokeCircle(x - 12, y + 2, 10);
    }
    if (this.shield > 0) g.fillStyle(0x9fdcff, 0.9).fillRect(x, y - 3, Math.round(w * Math.min(1, this.shield / this.maxHp)), 2);
    if (this.team === 'ally' && !this.isNecro) {
      // level pips
      const rc = RARITIES[this.rarity].hex;
      for (let i = 0; i < this.level; i++) {
        const px = Math.round(this.x - (this.level * 7) / 2 + i * 7);
        g.fillStyle(0x05030a, 1).fillRect(px, y + h + 2, 6, 6);
        g.fillStyle(i < this.level ? rc : 0x3a3346, 1).fillRect(px + 1, y + h + 3, 4, 4);
      }
    }
  }

  update(dt, game) {
    if (this.dead || this.dragging) return;
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
    const offscreen = this.team === 'enemy' && this.x > (this.base.proj ? RANGED_ENEMY_MAX_X : ENEMY_MAX_X);
    // melee allies hold the line: they only engage enemies that came close, so archers can shoot
    if (this.team === 'ally' && this.homeX != null && this.speed > 0 && target.x > LEASH_X) {
      if (this.walkTo(this.homeX, this.homeY, dt)) this.playAnim('idle');
      return;
    }
    if ((d > reach || offscreen) && this.speed > 0) {
      const step = this.speed * dt;
      let vx = (dx / d) * step, vy = (dy / Math.max(1, Math.hypot(dx, dy))) * step * 0.8;
      if (Math.abs(dx) < reach * 0.5 && Math.abs(dy) > 10) vx *= 0.3;
      if (offscreen && d <= reach) { vx = -step; vy = 0; }
      for (const o of game.units) {
        if (o === this || o.dead || o.team !== this.team) continue;
        const ox = this.x - o.x, oy = this.y - o.y, od = Math.hypot(ox, oy);
        if (od < 32 && od > 0.01) { vx += (ox / od) * step * 0.4; vy += (oy / od) * step * 0.6; }
      }
      this.x += vx; this.y = Phaser.Math.Clamp(this.y + vy, 405 - BF, 540 - BF);
      if (this.team === 'ally') this.x = Math.min(this.x, 520);
      this.playAnim('walk');
    } else if (d <= reach) {
      if (this.cd <= 0) { this.cd = (this.base.cd * (0.9 + Math.random() * 0.2)) / (1 + this.ist('haste')); this.doAttack(target, false); }
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
      const critCh = (this.base.crit || 0) + this.ist('crit');
      if (critCh && Math.random() < critCh) { dmg *= 2; crit = true; }
      if (this.base.charge && !this.charged) { this.charged = true; dmg *= 2; crit = true; game.floatText(this.x, this.y - 96, 'HÜCUM!', '#ffd36a', 18); }
      if (proj) game.spawnProjectile(this, target, proj, dmg, false, crit);
      else game.meleeHit(this, target, dmg, crit);
    });
  }

  takeDamage(dmg, crit, src, melee) {
    if (this.dead) return;
    const dodge = this.ist('dodge');
    if (dodge && src && Math.random() < dodge) { this.scene.floatText(this.x, this.y - 72, 'KAÇTI', '#c8b0ff', 15); return; }
    let red = this.ist('dr') + (this.team === 'enemy' ? this.scene.paladinCover(this) : 0);
    dmg = Math.round(dmg * (1 - Math.min(0.6, red)));
    const ls = src && !src.dead ? src.ist('lifesteal') : 0;
    if (ls && dmg > 0) src.receiveHeal(dmg * ls, true);
    if (this.shield > 0) { const a = Math.min(this.shield, dmg); this.shield -= a; dmg -= a; }
    this.hp -= dmg;
    const game = this.scene;
    game.floatText(this.x + Phaser.Math.Between(-8, 8), this.y - 72, crit ? `${dmg}!` : `${dmg}`, crit ? '#ffcf4a' : this.team === 'ally' ? '#ff6b6b' : '#ffffff', crit ? 22 : 16);
    this.flash.setVisible(true).setAlpha(0.6);
    game.time.delayedCall(60, () => this.flash.setVisible(false));
    const dir = src && src.x > this.x ? -1 : 1;
    game.tweens.add({ targets: this, kx: dir * (crit ? 8 : 4), duration: 60, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { this.kx = 0; } });
    game.hitSparks(this.x, this.y - 40, this.team === 'ally' ? 0xc8ffb8 : 0xfff2c0, crit ? 14 : 6);
    if (crit) sfx.crit(); else sfx.hit();
    // thorns
    const refl = (this.base.reflect || 0) + this.ist('reflect');
    if (refl && melee && src && !src.dead && dmg > 0) src.takeDamage(dmg * refl, false, this, false);
    if (this.hp <= 0) { this.die(); if (src && !src.dead) game.onKill(src, this); }
  }

  receiveHeal(v, silent) {
    if (this.dead) return;
    const amt = Math.min(Math.round(v), this.maxHp - this.hp);
    this.hp += amt;
    if (amt > 0 && !silent) this.scene.floatText(this.x, this.y - 74, `+${amt}`, '#6dff9a', 15);
  }

  die() {
    if (this.dead) return;
    this.dead = true; this.hp = 0;
    const game = this.scene;
    this.bar.clear();
    game.onUnitDeath(this);
    this.sprite.anims.stop();
    const parts = [this.sprite, this.glow, this.shadow, this.aura].filter(Boolean);
    this.auraTween?.remove();
    if (this.team === 'ally') {
      sfx.bones();
      game.deathBurst(this, ['wolf', 'banshee', 'hound', 'screamer'].includes(this.key) ? [0x6ac8e0, 0xc4f2ff] : [0xd6ccb0, 0x8a7d66, 0x6a5a4a]);
      game.tweens.add({ targets: [this.sprite, this.glow], scaleY: 0.2 / SS, scaleX: this.sc * 1.3, alpha: 0, duration: 420, ease: 'Quad.easeIn' });
    } else {
      sfx.death();
      game.deathBurst(this, [0xfff2c0, 0xffd36a, 0xffffff]);
      this.sprite.setTint(0xffe8a0);
      game.tweens.add({ targets: [this.sprite, this.glow], y: this.y - 30, alpha: 0, duration: 650, ease: 'Sine.easeIn' });
    }
    game.tweens.add({ targets: [this.shadow, this.aura].filter(Boolean), alpha: 0, duration: 400 });
    this.itemIcon?.destroy(); this.itemRing?.destroy(); this.tierFx?.destroy();
    game.time.delayedCall(800, () => { parts.forEach((p) => p.destroy()); this.flash.destroy(); this.bar.destroy(); });
  }

  // Remove instantly without death effects (used when merged away)
  vanish() {
    this.dead = true;
    this.auraTween?.remove();
    [this.sprite, this.glow, this.flash, this.shadow, this.aura, this.bar, this.itemIcon, this.itemRing, this.tierFx].forEach((p) => p && p.destroy());
  }
}
