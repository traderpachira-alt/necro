// Main scene: battlefield, waves, card hand and UI.
import { Unit } from './unit.js';
import { Hand, cardColor, cardTitle, HAND_Y } from './hand.js';
import { CREATURES, ENEMIES, NECRO, RITUALS, CURSES, RARITIES, ROLES, CONFIG, randomCard, waveComposition, rollRarity } from './data.js';
import { sfx, unlockAudio, toggleMute, isMuted } from './audio.js';
import { TITLE, BODY, ZOOM } from './fonts.js';

const W = 540, H = 960, PANEL_Y = 570;

const SLOT_COLS = [150, 218, 286];
const SLOT_ROWS = [438, 510];
const NECRO_POS = { x: 70, y: 476 };

function txt(scene, x, y, s, size, color = '#f2e8ff', extra = {}) {
  const { title, ...rest } = extra;
  return scene.add.text(x, y, s, {
    fontFamily: title ? TITLE : BODY, fontStyle: title ? '900' : '800', fontSize: size + 'px', color,
    stroke: '#05030a', strokeThickness: Math.max(3, Math.round(size / 6)), resolution: ZOOM, ...rest,
  });
}
const T = { title: true };

class Button {
  constructor(scene, x, y, w, h, label, color, onClick) {
    this.scene = scene; this.w = w; this.h = h; this.color = color; this.enabled = true;
    this.c = scene.add.container(x, y).setDepth(1500);
    this.g = scene.add.graphics();
    this.t = txt(scene, 0, 0, label, 21, '#fff8e8', T).setOrigin(0.5);
    this.sub = txt(scene, 0, 14, '', 15, '#e8dcff').setOrigin(0.5).setVisible(false);
    this.c.add([this.g, this.t, this.sub]);
    this.c.setSize(w, h).setInteractive({ useHandCursor: true });
    this.c.on('pointerdown', () => { if (!this.enabled) { sfx.error(); return; } this.c.setScale(0.94); });
    this.c.on('pointerup', () => { this.c.setScale(1); if (this.enabled) { sfx.click(); onClick(); } });
    this.c.on('pointerout', () => this.c.setScale(1));
    this.draw();
  }
  draw() {
    const { g, w, h } = this, col = this.enabled ? this.color : 0x3a3346;
    g.clear();
    g.fillStyle(0x05030a, 1).fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 12);
    g.fillStyle(Phaser.Display.Color.ValueToColor(col).darken(45).color, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.fillStyle(col, 1).fillRoundedRect(-w / 2, -h / 2, w, h - 6, 10);
    g.fillStyle(0xffffff, this.enabled ? 0.22 : 0.06).fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h / 2 - 6, 7);
    this.t.setAlpha(this.enabled ? 1 : 0.5);
  }
  set(label, sub) {
    this.t.setText(label);
    if (sub) { this.sub.setText(sub).setVisible(true); this.t.setY(-9); } else { this.sub.setVisible(false); this.t.setY(-2); }
    return this;
  }
  setEnabled(v) { this.enabled = v; this.draw(); return this; }
  setColor(c) { this.color = c; this.draw(); return this; }
  show(v) { this.c.setVisible(v); return this; }
}

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.lightsOn = this.sys.renderer.type === Phaser.WEBGL;
    this.units = []; this.projectiles = []; this.spawnQueue = [];
    this.state = 'init'; this.wave = 0; this.souls = CONFIG.startSouls; this.score = 0; this.kills = 0;
    this.buff = { shield: 0, atk: 1 }; this.enemyMult = 1; this.pendingRarity = 0; this.drawsThisPrep = 0;
    this.speedMul = 1;
    this.tweens.timeScale = 1; this.time.timeScale = 1; this.anims.globalTimeScale = 1;

    this.cameras.main.setZoom(ZOOM).centerOn(W / 2, H / 2);
    this.buildWorld();
    this.buildFx();
    this.buildUI();
    this.hand = new Hand(this);
    this.bindCardInput();

    this.necro = new Unit(this, { key: 'necro', team: 'ally', stats: NECRO, isNecro: true, x: NECRO_POS.x, y: NECRO_POS.y });
    this.units.push(this.necro);

    this.input.once('pointerdown', () => unlockAudio());
    this.time.delayedCall(300, () => this.startPrep());
  }

  // ---------------------------------------------------------------- world
  buildWorld() {
    const bg = this.add.image(0, 0, 'bg').setOrigin(0).setScale(2).setDepth(0);
    if (this.lightsOn) {
      bg.setPipeline('Light2D');
      this.lights.enable().setAmbientColor(0x48405e);
      this.moon = this.lights.addLight(420, 60, 700, 0x9aa8ff, 0.9);
      this.staffLight = this.lights.addLight(NECRO_POS.x, NECRO_POS.y - 70, 230, 0x6dff6a, 1.6);
      this.holyLight = this.lights.addLight(540, 420, 260, 0xffd88a, 0.7);
    }
    this.add.image(0, 0, 'bg_g').setOrigin(0).setScale(2).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
    // moon glow
    const mg = this.add.image(410, 80, 'big_soft').setScale(2.2).setTint(0xb8a8ff).setAlpha(0.28).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    this.tweens.add({ targets: mg, alpha: 0.18, duration: 3000, yoyo: true, repeat: -1 });
    // drifting fog (behind and in front of units)
    this.fogs = [];
    for (let i = 0; i < 7; i++) {
      const front = i >= 4;
      const f = this.add.image(Math.random() * W, front ? 530 + Math.random() * 30 : 330 + Math.random() * 120, 'fog')
        .setScale(2 + Math.random(), 1.2 + Math.random() * 0.6).setAlpha(front ? 0.1 : 0.16).setTint(0xb8a8e0).setDepth(front ? 800 : 3).setBlendMode(Phaser.BlendModes.SCREEN);
      f.vx = (front ? 10 : 5) + Math.random() * 8;
      this.fogs.push(f);
    }
    // floating souls
    this.add.particles(0, 0, 'soft', {
      x: { min: 0, max: W }, y: { min: 300, max: 560 }, lifespan: 5000, speedY: { min: -14, max: -4 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.18, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [0x7dff6a, 0x9b7bd8, 0x6ff7ff], blendMode: 'ADD', frequency: 260,
    }).setDepth(850);
    // vignette on battlefield
    const v = this.add.graphics().setDepth(860);
    for (let i = 0; i < 24; i++) { v.fillStyle(0x000000, 0.03); v.fillRect(0, PANEL_Y - 24 + i, W, 24 - i); }
  }

  buildFx() {
    const base = { emitting: false, blendMode: 'ADD' };
    this.fxSpark = this.add.particles(0, 0, 'soft', { ...base, lifespan: 380, speed: { min: 60, max: 180 }, scale: { start: 0.45, end: 0 }, alpha: { start: 1, end: 0 } }).setDepth(950);
    this.fxDebris = this.add.particles(0, 0, 'px', { emitting: false, lifespan: 900, speed: { min: 60, max: 200 }, angle: { min: 200, max: 340 }, gravityY: 500, scale: { start: 1, end: 0.6 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 } }).setDepth(950);
    this.fxSoul = this.add.particles(0, 0, 'soft', { ...base, lifespan: 900, speedY: { min: -90, max: -30 }, speedX: { min: -30, max: 30 }, scale: { start: 0.6, end: 0 }, alpha: { start: 1, end: 0 } }).setDepth(950);
    this.fxDirt = this.add.particles(0, 0, 'px', { emitting: false, lifespan: 700, speed: { min: 80, max: 220 }, angle: { min: 220, max: 320 }, gravityY: 600, scale: { start: 1.2, end: 0.5 }, tint: [0x3a2a30, 0x5a4650, 0x2a1c22, 0x8a7d66] }).setDepth(951);
    this.fxTrail = this.add.particles(0, 0, 'soft', { ...base, lifespan: 300, speed: 8, scale: { start: 0.4, end: 0 }, alpha: { start: 0.9, end: 0 } }).setDepth(940);
    this.fxUI = this.add.particles(0, 0, 'soft', { ...base, lifespan: 700, speed: { min: 80, max: 260 }, scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 } }).setDepth(1600);
  }

  // ---------------------------------------------------------------- UI
  buildUI() {
    this.add.image(0, PANEL_Y, 'panel').setOrigin(0).setDepth(1000);
    // top HUD
    const hud = this.add.graphics().setDepth(1400);
    hud.fillStyle(0x05030a, 0.75).fillRect(0, 0, W, 64);
    hud.fillStyle(0x9b7bd8, 0.6).fillRect(0, 64, W, 2);
    this.waveText = txt(this, 14, 4, 'DALGA 1', 26, '#f2e8ff', T).setDepth(1401);
    this.phaseText = txt(this, 15, 37, 'Hazırlık', 16, '#c8b8e8').setDepth(1401);
    this.add.image(214, 32, 'skull_icon').setDepth(1401).setScale(1.5);
    this.scoreText = txt(this, 232, 15, '0', 26, '#f2e8ff').setDepth(1401);
    this.soulIcon = this.add.image(364, 32, 'soul_icon').setDepth(1401).setScale(1.5);
    this.soulText = txt(this, 384, 15, String(this.souls), 26, '#9dff8a').setDepth(1401);
    this.muteBtn = txt(this, 510, 32, isMuted() ? '🔇' : '🔊', 24).setOrigin(0.5).setDepth(1401).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerup', () => { this.muteBtn.setText(toggleMute() ? '🔇' : '🔊'); });

    // info box
    this.infoG = this.add.graphics().setDepth(1001);
    this.infoG.fillStyle(0x05030a, 0.7).fillRoundedRect(10, 584, W - 20, 88, 10);
    this.infoG.lineStyle(2, 0x3a2a50, 1).strokeRoundedRect(10, 584, W - 20, 88, 10);
    this.infoTitle = txt(this, 22, 590, '', 21, '#fff2d0', T).setDepth(1002);
    this.infoBody = txt(this, 22, 619, '', 17, '#ddd0f4', { wordWrap: { width: W - 44 }, lineSpacing: -2 }).setDepth(1002);

    // deck pile
    for (let i = 3; i >= 0; i--) this.add.image(50 + i * 2, 908 - i * 2, 'card_back').setScale(0.3).setDepth(1001).setAlpha(1 - i * 0.15);
    this.deckText = txt(this, 52, 952, 'Deste', 13, '#b89be8').setOrigin(0.5).setDepth(1002);

    this.btnDraw = new Button(this, 212, 912, 172, 62, 'KART ÇEK', 0x5a3a9a, () => this.buyCard());
    this.btnStart = new Button(this, 408, 912, 200, 62, 'SAVAŞA BAŞLA', 0x2f8a4a, () => this.startBattle());
    this.btnA = new Button(this, 212, 912, 172, 62, '', 0x5a3a9a, () => this.cardActionA()).show(false);
    this.btnB = new Button(this, 408, 912, 200, 62, '', 0x2f8a4a, () => this.cardActionB()).show(false);
    this.btnSpeed = new Button(this, 408, 912, 200, 62, 'HIZ x1', 0x6a4a2a, () => this.toggleSpeed()).show(false);

    this.unitCountText = txt(this, W - 14, PANEL_Y - 30, '', 17, '#ddd0f4').setOrigin(1, 0).setDepth(1001);

    // tapping empty panel space deselects
    this.input.on('pointerdown', (p, objs) => { if (!objs.length && this.hand.selected) this.select(null); });
  }

  setInfo(title, body) { this.infoTitle.setText(title); this.infoBody.setText(body); }

  updateHUD() {
    this.waveText.setText(`DALGA ${this.wave}`);
    this.scoreText.setText(String(this.score));
    this.soulText.setText(String(this.souls));
    const n = this.allyCreatures().length;
    this.unitCountText.setText(`Yaratık ${n}/${CONFIG.maxUnits}`);
    if (this.state === 'prep' && !this.hand.selected) {
      const cost = this.drawCost();
      this.btnDraw.set('KART ÇEK', `${cost} ruh`).setEnabled(this.souls >= cost && this.hand.size < CONFIG.maxHand);
    }
  }

  banner(text, color = '#f2e8ff', sub = '') {
    const t = txt(this, W / 2, 205, text, 42, color, T).setOrigin(0.5).setDepth(1450).setScale(0.4).setAlpha(0);
    const s = sub ? txt(this, W / 2, 252, sub, 20, '#ddd0f4').setOrigin(0.5).setDepth(1450).setAlpha(0) : null;
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
    if (s) this.tweens.add({ targets: s, alpha: 1, duration: 300, delay: 150 });
    this.tweens.add({ targets: [t, s].filter(Boolean), alpha: 0, y: '-=20', delay: 1500, duration: 400, onComplete: () => { t.destroy(); s?.destroy(); } });
  }

  floatText(x, y, s, color, size = 16) {
    const t = txt(this, x, y, s, Math.round(size * 1.25), color).setOrigin(0.5).setDepth(1350);
    this.tweens.add({ targets: t, y: y - 34, duration: 750, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 450, duration: 300, onComplete: () => t.destroy() });
  }

  addSouls(n, fromX, fromY) {
    if (fromX == null) { this.souls += n; this.updateHUD(); return; }
    const orbs = Math.min(6, Math.max(1, Math.round(n / 3)));
    for (let i = 0; i < orbs; i++) {
      const o = this.add.image(fromX, fromY, 'soft').setTint(0x7dff6a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.7).setDepth(1420);
      const share = i === orbs - 1 ? n - Math.floor(n / orbs) * (orbs - 1) : Math.floor(n / orbs);
      this.tweens.add({
        targets: o, x: { value: 364, ease: 'Sine.easeIn' }, y: { value: 32, ease: 'Back.easeIn' }, scale: 0.3, delay: i * 60, duration: 650,
        onComplete: () => { o.destroy(); this.souls += share; sfx.soul(); this.updateHUD(); this.tweens.add({ targets: this.soulIcon, scale: { from: 2, to: 1.5 }, duration: 150 }); },
      });
    }
  }

  // ---------------------------------------------------------------- card input
  bindCardInput() {
    this.input.dragDistanceThreshold = 10;
    const viewOf = (obj) => this.hand.cards.find((v) => v.c === obj);
    this.input.on('dragstart', (p, obj) => {
      const v = viewOf(obj); if (!v) return;
      if (this.state !== 'prep' || !v.revealed || v.busy) { v.noDrag = true; return; }
      v.noDrag = false; v.dragging = true; v.c.setDepth(1350);
      this.tweens.killTweensOf(v.c);
      this.select(v, true);
    });
    this.input.on('drag', (p, obj, dx, dy) => {
      const v = viewOf(obj); if (!v || v.noDrag) return;
      obj.x = dx; obj.y = dy;
      obj.angle = Phaser.Math.Clamp((p.velocity.x || 0) * 0.4, -14, 14);
      const over = dy < PANEL_Y;
      obj.setScale(over ? 0.8 : 1.15);
      this.dropHint(over, v);
    });
    this.input.on('dragend', (p, obj) => {
      const v = viewOf(obj); if (!v || v.noDrag) return;
      v.dragging = false; v.wasDragged = true;
      this.dropHint(false);
      if (obj.y < PANEL_Y) this.playCard(v); else this.hand.layout();
    });
    this.input.on('gameobjectup', (p, obj) => {
      const v = viewOf(obj); if (!v) return;
      if (v.wasDragged) { v.wasDragged = false; return; }
      if (this.state !== 'prep' || v.busy) return;
      if (!v.revealed) { v.reveal(); this.select(null); return; }
      this.select(this.hand.selected === v ? null : v);
    });
    this.input.on('gameobjectmove', (p, obj) => { const v = viewOf(obj); if (v && v.revealed && !v.dragging && !v.busy && this.state === 'prep') v.tilt(p.worldX); });
    this.input.on('gameobjectout', (p, obj) => { const v = viewOf(obj); if (v && !v.dragging && !v.busy) { obj.angle = v.trot; obj.scaleX = v.tscale; } });
  }

  dropHint(on, v) {
    if (!this.dropZone) {
      this.dropZone = this.add.graphics().setDepth(1340);
      this.dropText = txt(this, W / 2, 330, '', 24, '#fff2d0', T).setOrigin(0.5).setDepth(1341);
    }
    this.dropZone.clear(); this.dropText.setText('');
    if (!on) return;
    const col = cardColor(v.card);
    this.dropZone.fillStyle(col, 0.12).fillRect(0, 60, W, PANEL_Y - 60);
    this.dropZone.lineStyle(3, col, 0.7).strokeRect(4, 64, W - 8, PANEL_Y - 72);
    this.dropText.setText(v.card.kind === 'curse' ? 'Lanet oynanamaz' : 'Bırak ve çağır!');
  }

  select(v, silent) {
    this.hand.selected = v;
    if (!silent) this.hand.layout();
    if (!v) {
      this.btnA.show(false); this.btnB.show(false);
      if (this.state === 'prep') { this.btnDraw.show(true); this.btnStart.show(true); }
      this.prepInfo();
      this.updateHUD();
      return;
    }
    const card = v.card;
    this.btnDraw.show(false); this.btnStart.show(false);
    this.btnA.show(true); this.btnB.show(true);
    if (card.kind === 'curse') {
      const D = CURSES[card.id];
      this.setInfo(`☠ ${D.name}  (Lanet)`, D.desc + ' Arındırılmazsa dalga başında tetiklenir.');
      this.btnA.set('ARINDIR', `${CONFIG.purgeCost} ruh`).setColor(0x8a2a3a).setEnabled(this.souls >= CONFIG.purgeCost);
      this.btnB.set('KAPAT').setColor(0x4a4258).setEnabled(true);
    } else {
      if (card.kind === 'creature') {
        const C = CREATURES[card.id], R = RARITIES[card.rarity];
        this.setInfo(`${C.name}  •  ${R.name} ${ROLES[C.role].name}`,
          `Can ${Math.round(C.hp * R.mult)}  Hasar ${Math.round(C.atk * R.mult)}${C.heal ? `  İyileştirme ${Math.round(C.heal * R.mult)}` : ''}  —  ${C.desc}`);
        this.infoTitle.setColor(R.color);
      } else {
        const D = RITUALS[card.id];
        this.setInfo(`✦ ${D.name}  (Ritüel)`, D.desc);
      }
      this.btnA.set('YENİDEN ÇEK', `${CONFIG.rerollCost} ruh`).setColor(0x5a3a9a).setEnabled(this.souls >= CONFIG.rerollCost);
      const full = card.kind === 'creature' && this.allyCreatures().length >= CONFIG.maxUnits;
      this.btnB.set(full ? 'ALAN DOLU' : 'OYNA').setColor(0x2f8a4a).setEnabled(!full);
    }
    if (card.kind !== 'creature') this.infoTitle.setColor(card.kind === 'curse' ? '#ff8a80' : '#c8b0ff');
  }

  cardActionA() {
    const v = this.hand.selected; if (!v) return;
    if (v.card.kind === 'curse') {
      if (this.souls < CONFIG.purgeCost) return;
      this.souls -= CONFIG.purgeCost;
      this.burnCard(v, 0x9b6bff);
      this.floatText(270, 520, 'Lanet arındırıldı', '#c8b0ff', 18);
    } else {
      if (this.souls < CONFIG.rerollCost) return;
      this.souls -= CONFIG.rerollCost;
      this.burnCard(v, 0x7dff6a);
      this.time.delayedCall(250, () => this.dealCards(1));
    }
    this.select(null);
  }
  cardActionB() {
    const v = this.hand.selected; if (!v) return;
    if (v.card.kind === 'curse') { this.select(null); return; }
    this.playCard(v);
  }

  burnCard(v, color) {
    this.hand.remove(v);
    v.busy = true;
    sfx.curse();
    this.fxUI.explode(24, v.c.x, v.c.y);
    this.fxUI.setParticleTint(color);
    this.tweens.add({ targets: v.c, scaleX: 0.2, scaleY: 1.3, alpha: 0, angle: 10, duration: 350, ease: 'Quad.easeIn', onComplete: () => v.destroy() });
    this.hand.layout();
    this.updateHUD();
  }

  // ---------------------------------------------------------------- cards
  drawCost() { return CONFIG.drawCost + CONFIG.drawCostStep * this.drawsThisPrep; }

  newCard() {
    const card = randomCard(this.wave);
    if (card.kind === 'creature' && this.pendingRarity > 0) { card.rarity = Math.min(3, card.rarity + this.pendingRarity); this.pendingRarity = 0; }
    return card;
  }

  dealCards(n) {
    const room = CONFIG.maxHand - this.hand.size;
    n = Math.min(n, room);
    for (let i = 0; i < n; i++) this.hand.add(this.newCard(), i * 140);
    if (n > 0) this.time.delayedCall(n * 140 + 300, () => this.updateHUD());
    return n;
  }

  buyCard() {
    const cost = this.drawCost();
    if (this.souls < cost || this.hand.size >= CONFIG.maxHand) return;
    this.souls -= cost; this.drawsThisPrep++;
    this.dealCards(1);
    this.updateHUD();
  }

  onCardRevealed(v) {
    const card = v.card, x = v.c.x, y = v.c.y;
    if (card.kind === 'curse') {
      sfx.curse();
      this.cameras.main.shake(180, 0.006);
      this.fxUI.setParticleTint(0xe0303a); this.fxUI.explode(30, x, y);
    } else if (card.kind === 'ritual') {
      sfx.rare(); this.fxUI.setParticleTint(0x9b6bff); this.fxUI.explode(18, x, y);
    } else if (card.rarity === 1) { sfx.rare(); this.fxUI.setParticleTint(0x4aa8ff); this.fxUI.explode(16, x, y); }
    else if (card.rarity === 2) { sfx.epic(); this.fxUI.setParticleTint(0xc25cff); this.fxUI.explode(34, x, y); this.cameras.main.shake(150, 0.004); }
    else if (card.rarity === 3) this.legendaryReveal(v);
    this.updateHUD();
    this.prepInfo();
  }

  legendaryReveal(v) {
    sfx.legendary();
    const dark = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(1290);
    const rays = this.add.image(v.c.x, v.c.y, 'rays').setTint(0xffd36a).setBlendMode(Phaser.BlendModes.ADD).setDepth(1291).setScale(0.2).setAlpha(0.9);
    const t = txt(this, W / 2, 520, 'EFSANEVİ!', 50, '#ffd36a', T).setOrigin(0.5).setDepth(1460).setScale(0.2);
    this.tweens.add({ targets: dark, fillAlpha: 0.55, duration: 200, yoyo: true, hold: 900 });
    this.tweens.add({ targets: rays, scale: 2.4, angle: 90, alpha: 0, duration: 1600, ease: 'Cubic.easeOut', onComplete: () => rays.destroy() });
    this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, y: 490, delay: 1100, duration: 400, onComplete: () => { t.destroy(); dark.destroy(); } });
    this.cameras.main.flash(250, 255, 220, 140);
    this.cameras.main.shake(300, 0.008);
    this.fxUI.setParticleTint(0xffd36a); this.fxUI.explode(60, v.c.x, v.c.y);
  }

  playCard(v) {
    if (this.state !== 'prep') { this.hand.layout(); return; }
    const card = v.card;
    if (card.kind === 'curse') { sfx.error(); this.floatText(270, 520, 'Lanetler dalga başında tetiklenir', '#ff8a80', 16); this.hand.layout(); return; }
    if (card.kind === 'creature') {
      const slot = this.findSlot(CREATURES[card.id].role);
      if (!slot) { sfx.error(); this.floatText(270, 520, 'Alan dolu!', '#ff8a80', 20); this.select(null); return; }
      slot.reserved = true;
      this.hand.remove(v); this.select(null);
      v.busy = true;
      this.tweens.add({
        targets: v.c, x: slot.x, y: slot.y - 40, scale: 0.25, angle: 0, alpha: 0.2, duration: 380, ease: 'Cubic.easeIn',
        onComplete: () => { v.destroy(); this.summon(card, slot); },
      });
      this.hand.layout();
      return;
    }
    // ritual
    this.hand.remove(v); this.select(null);
    v.busy = true;
    this.tweens.add({ targets: v.c, x: W / 2, y: 300, scale: 1.35, angle: 0, duration: 320, ease: 'Cubic.easeOut' });
    this.tweens.add({
      targets: v.c, alpha: 0, scale: 1.8, delay: 520, duration: 300,
      onComplete: () => { v.destroy(); },
    });
    this.time.delayedCall(420, () => { this.fxUI.setParticleTint(0x9b6bff); this.fxUI.explode(40, W / 2, 300); this.applyRitual(card.id); });
    this.hand.layout();
  }

  applyRitual(id) {
    sfx.epic();
    const D = RITUALS[id];
    this.floatText(W / 2, 230, D.name, '#c8b0ff', 24);
    if (id === 'blood') {
      const target = this.hand.cards.find((c) => c.card.kind === 'creature' && c.card.rarity < 3);
      if (target) {
        target.card.rarity++;
        if (target.revealed) {
          target.revealed = false; target.sheen.setVisible(false);
          target.reveal();
        } else { this.fxUI.setParticleTint(0xff3040); this.fxUI.explode(20, target.c.x, target.c.y); }
      } else this.pendingRarity++;
    }
    if (id === 'whisper') this.dealCards(2);
    if (id === 'bonearmor') { this.buff.shield = 0.3; this.floatText(W / 2, 260, 'Bu dalga: kemik kalkanı', '#9fdcff', 16); }
    if (id === 'harvest') this.addSouls(20, W / 2, 300);
    if (id === 'frenzy') { this.buff.atk = 1.25; this.floatText(W / 2, 260, 'Bu dalga: +%25 hasar', '#ff9a6a', 16); }
    this.updateHUD();
  }

  // ---------------------------------------------------------------- formation & summoning
  allyCreatures() { return this.units.filter((u) => u.team === 'ally' && !u.isNecro && !u.dead); }

  slots() {
    if (!this._slots) {
      this._slots = [];
      SLOT_COLS.forEach((x, ci) => SLOT_ROWS.forEach((y, ri) => this._slots.push({ x: x + (ri ? -14 : 0), y, col: ci, unit: null, reserved: false })));
    }
    return this._slots;
  }

  findSlot(role) {
    const want = ROLES[role].col;
    const free = this.slots().filter((s) => !s.reserved && (!s.unit || s.unit.dead));
    if (!free.length) return null;
    free.sort((a, b) => Math.abs(a.col - want) - Math.abs(b.col - want) || a.y - b.y);
    return free[0];
  }

  summon(card, slot) {
    const C = CREATURES[card.id];
    sfx.summon();
    const col = RARITIES[card.rarity].hex;
    const ring = this.add.image(slot.x, slot.y, 'ring').setScale(0.2, 0.08).setTint(card.rarity ? col : 0x7dff6a).setBlendMode(Phaser.BlendModes.ADD).setDepth(7).setAlpha(0);
    this.tweens.add({ targets: ring, scaleX: 0.75, scaleY: 0.26, alpha: 1, duration: 350, ease: 'Back.easeOut' });
    this.tweens.add({ targets: ring, angle: 180, duration: 1600 });
    this.tweens.add({ targets: ring, alpha: 0, delay: 1200, duration: 400, onComplete: () => ring.destroy() });
    const pillar = this.add.image(slot.x, slot.y, 'beam').setOrigin(0.5, 1).setScale(3, 0).setTint(card.rarity ? col : 0x7dff6a).setBlendMode(Phaser.BlendModes.ADD).setDepth(slot.y + 1).setAlpha(0.8);
    this.tweens.add({ targets: pillar, scaleY: 2.6, duration: 300, ease: 'Cubic.easeOut', yoyo: true, hold: 400, onComplete: () => pillar.destroy() });
    let light = null;
    if (this.lightsOn) {
      light = this.lights.addLight(slot.x, slot.y - 30, 200, card.rarity ? col : 0x6dff6a, 0);
      this.tweens.add({ targets: light, intensity: 2.6, duration: 300, yoyo: true, hold: 700, onComplete: () => this.lights.removeLight(light) });
    }
    this.cameras.main.shake(250, 0.004);
    this.time.delayedCall(300, () => {
      const u = new Unit(this, { key: card.id, team: 'ally', stats: { ...C, name: C.name }, rarity: card.rarity, x: slot.x, y: slot.y });
      u.homeX = slot.x; u.homeY = slot.y; u.slot = slot;
      slot.unit = u; slot.reserved = false;
      u.hidden = true; u.rise = 88;
      u.sprite.anims.stop(); u.sprite.setFrame(9);
      this.units.push(u);
      this.fxDirt.explode(26, slot.x, slot.y);
      this.tweens.add({
        targets: u, rise: 0, duration: 800, ease: 'Cubic.easeOut',
        onUpdate: () => { if (Math.random() < 0.5) this.fxDirt.explode(2, slot.x + Phaser.Math.Between(-14, 14), slot.y); },
        onComplete: () => {
          u.hidden = false; u.playAnim('idle');
          this.fxSoul.setParticleTint(card.rarity ? col : 0x7dff6a); this.fxSoul.explode(card.rarity >= 2 ? 30 : 14, slot.x, slot.y - 40);
          this.updateHUD();
        },
      });
      this.updateHUD();
    });
  }

  // ---------------------------------------------------------------- flow
  prepInfo() {
    if (this.state !== 'prep' || this.hand.selected) return;
    const hidden = this.hand.cards.filter((c) => !c.revealed).length;
    if (hidden) this.setInfo('Ruh Kartları', `Kapalı kartlara dokunarak aç (${hidden} kapalı). Açık kartı seç veya yukarı sürükleyerek savaş alanına bırak.`);
    else this.setInfo(`Dalga ${this.wave} yaklaşıyor`, 'Kartlarını oyna, ruh harcayarak yeni kart çek ya da hazırsan savaşa başla.');
    this.infoTitle.setColor('#fff2d0');
  }

  startPrep() {
    this.state = 'prep';
    this.wave++;
    this.drawsThisPrep = 0;
    this.phaseText.setText('Hazırlık');
    this.banner(`DALGA ${this.wave}`, '#d8c8ff', 'Hazırlık evresi');
    this.btnSpeed.show(false); this.btnDraw.show(true); this.btnStart.show(true).setEnabled(true);
    this.hand.cards.forEach((v) => v.c.setAlpha(1));
    this.dealCards(this.wave === 1 ? CONFIG.handSize + 1 : CONFIG.handSize);
    this.updateHUD();
    this.prepInfo();
  }

  startBattle() {
    if (this.state !== 'prep') return;
    this.select(null);
    this.state = 'curses';
    this.btnDraw.show(false); this.btnStart.show(false);
    // unrevealed cards stay in hand; curses that are revealed or not all trigger
    const curses = this.hand.cards.filter((v) => v.card.kind === 'curse');
    let delay = 0;
    curses.forEach((v) => {
      this.time.delayedCall(delay, () => {
        if (!v.revealed) v.reveal(true);
        this.hand.remove(v); v.busy = true;
        this.tweens.add({ targets: v.c, x: W / 2, y: 300, scale: 1.3, angle: 0, alpha: 1, duration: 320, ease: 'Cubic.easeOut' });
        this.time.delayedCall(450, () => { this.cameras.main.flash(200, 180, 20, 30); sfx.curse(); this.applyCurse(v.card.id); this.fxUI.setParticleTint(0xe0303a); this.fxUI.explode(40, W / 2, 300); });
        this.tweens.add({ targets: v.c, alpha: 0, scale: 1.7, delay: 650, duration: 280, onComplete: () => v.destroy() });
        this.hand.layout();
      });
      delay += 900;
    });
    this.time.delayedCall(delay + (curses.length ? 200 : 0), () => this.beginWave());
  }

  applyCurse(id) {
    const D = CURSES[id];
    this.floatText(W / 2, 230, D.name, '#ff6a5a', 24);
    if (id === 'thief') { const n = Math.min(15, this.souls); this.souls -= n; this.floatText(390, 70, `-${n}`, '#ff6a5a', 18); }
    if (id === 'holy') this.enemyMult *= 1.25;
    if (id === 'rot') {
      const al = this.allyCreatures();
      if (al.length) { const u = Phaser.Utils.Array.GetRandom(al); u.takeDamage(Math.max(1, u.hp * 0.4), false, null); }
    }
    if (id === 'restless') {
      const k = Phaser.Utils.Array.GetRandom(Object.keys(CREATURES));
      this.spawnEnemy(k, true);
    }
    this.updateHUD();
  }

  beginWave() {
    this.state = 'battle';
    this.phaseText.setText('Savaş');
    sfx.waveStart();
    this.banner('SAVAŞ!', '#ff8a6a');
    this.btnSpeed.show(true);
    this.hand.cards.forEach((v) => v.c.setAlpha(0.45));
    this.setInfo(`Dalga ${this.wave}`, 'Ölüler senin için savaşıyor... Düşen düşmanlar ruh bırakır.');
    this.infoTitle.setColor('#ff8a6a');
    if (this.buff.shield > 0) this.allyCreatures().forEach((u) => { u.shield = Math.round(u.maxHp * this.buff.shield); this.fxSoul.setParticleTint(0x9fdcff); this.fxSoul.explode(8, u.x, u.y - 40); });
    this.spawnQueue = waveComposition(this.wave);
    this.spawnTimer = 0.4;
    if (this.lightsOn) this.tweens.add({ targets: this.holyLight, intensity: 1.4, duration: 600, yoyo: true });
  }

  spawnEnemy(key, hostileCreature = false) {
    const y = Phaser.Math.Between(420, 530);
    let u;
    if (hostileCreature) {
      const C = CREATURES[key];
      u = new Unit(this, { key, texKey: key + '_L', team: 'enemy', stats: { ...C, name: 'Huzursuz ' + C.name, souls: 4 }, rarity: 0, mult: 1 + this.wave * 0.08, x: 470, y, tint: 0xff8080 });
      this.fxSoul.setParticleTint(0xff3040); this.fxSoul.explode(20, 470, y - 40);
      this.fxDirt.explode(20, 470, y);
    } else {
      const E = ENEMIES[key];
      const m = (1 + (this.wave - 1) * 0.13) * this.enemyMult;
      u = new Unit(this, { key, texKey: key + '_L', team: 'enemy', stats: { ...E, atk: E.atk * (1 + (this.wave - 1) * 0.08) * this.enemyMult / m }, mult: m, x: W + 30, y });
    }
    this.units.push(u);
    return u;
  }

  endWave() {
    this.state = 'waveEnd';
    sfx.waveClear();
    const bonus = 10 + this.wave * 2;
    this.score += this.wave * 100;
    this.banner('DALGA TEMİZLENDİ', '#9dff8a', `+${bonus} ruh`);
    this.addSouls(bonus, W / 2, 230);
    // wave-end healing (stronger with banshees)
    const banshees = this.allyCreatures().filter((u) => u.key === 'banshee');
    const pct = CONFIG.waveHealPct + banshees.reduce((s, b) => s + CONFIG.bansheeWaveHealPct * RARITIES[b.rarity].mult, 0);
    this.units.filter((u) => u.team === 'ally' && !u.dead).forEach((u, i) => {
      this.time.delayedCall(300 + i * 80, () => {
        u.receiveHeal(u.maxHp * pct); u.shield = 0;
        this.fxSoul.setParticleTint(0x6dff9a); this.fxSoul.explode(10, u.x, u.y - 30);
      });
    });
    if (pct > 0) this.time.delayedCall(300, () => sfx.heal());
    this.buff = { shield: 0, atk: 1 }; this.enemyMult = 1;
    this.projectiles.forEach((p) => this.killProjectile(p)); this.projectiles = [];
    this.updateHUD();
    this.time.delayedCall(2000, () => { if (this.state === 'waveEnd') this.startPrep(); });
  }

  gameOver() {
    if (this.state === 'over') return;
    this.state = 'over';
    sfx.gameOver();
    let best = 0;
    try { best = Math.max(this.score, +(localStorage.getItem('necro_best') || 0)); localStorage.setItem('necro_best', String(best)); } catch (e) { best = this.score; }
    this.time.delayedCall(900, () => {
      const o = this.add.rectangle(W / 2, H / 2, W, H, 0x05030a, 0).setDepth(2000).setInteractive();
      this.tweens.add({ targets: o, fillAlpha: 0.85, duration: 600 });
      const els = [
        txt(this, W / 2, 300, 'NECROMANCER', 42, '#9b7bd8', T).setOrigin(0.5),
        txt(this, W / 2, 352, 'TOPRAĞA DÖNDÜ', 32, '#ff6a6a', T).setOrigin(0.5),
        txt(this, W / 2, 430, `Ulaşılan dalga: ${this.wave}`, 26).setOrigin(0.5),
        txt(this, W / 2, 468, `Skor: ${this.score}`, 26, '#ffd36a').setOrigin(0.5),
        txt(this, W / 2, 508, `En iyi skor: ${best}`, 21, '#b8a8d8').setOrigin(0.5),
        txt(this, W / 2, 542, `Öldürülen: ${this.kills}`, 21, '#b8a8d8').setOrigin(0.5),
      ];
      els.forEach((e, i) => { e.setDepth(2001).setAlpha(0); this.tweens.add({ targets: e, alpha: 1, delay: 300 + i * 120, duration: 400 }); });
      const b = new Button(this, W / 2, 630, 260, 64, 'YENİDEN DİRİL', 0x5a3a9a, () => this.scene.restart());
      b.c.setDepth(2002).setAlpha(0);
      this.tweens.add({ targets: b.c, alpha: 1, delay: 1100, duration: 400 });
    });
  }

  toggleSpeed() {
    this.speedMul = this.speedMul === 1 ? 2 : 1;
    this.tweens.timeScale = this.speedMul; this.time.timeScale = this.speedMul; this.anims.globalTimeScale = this.speedMul;
    this.btnSpeed.set(`HIZ x${this.speedMul}`);
  }

  // ---------------------------------------------------------------- combat helpers
  findTarget(u) {
    let best = null, bd = Infinity;
    const foes = this.units.filter((o) => !o.dead && !o.hidden && o.team !== u.team);
    if (u.team === 'enemy') {
      const taunts = foes.filter((o) => o.base.taunt && Math.abs(o.x - u.x) < 200);
      if (taunts.length) return taunts.reduce((a, b) => (Math.hypot(a.x - u.x, a.y - u.y) < Math.hypot(b.x - u.x, b.y - u.y) ? a : b));
    }
    for (const o of foes) {
      if (o.x > W - 10 && u.team === 'ally') continue;
      // stationary shooters prefer anything already inside their range
      const inRange = Math.hypot(o.x - u.x, (o.y - u.y) * 1.6) <= u.range + o.radius;
      const d = Math.abs(o.x - u.x) + Math.abs(o.y - u.y) * 1.5 - (u.speed === 0 && inRange ? 10000 : 0);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  healTarget(u) {
    let best = null, br = 0.85;
    for (const o of this.units) {
      if (o.dead || o.hidden || o.team !== u.team || o === u) continue;
      if (Math.hypot(o.x - u.x, o.y - u.y) > u.range * 1.3) continue;
      const r = o.hp / o.maxHp;
      if (r < br) { br = r; best = o; }
    }
    if (!best && u.hp / u.maxHp < 0.7) best = null;
    return best;
  }

  atkMult(u) { return u.team === 'ally' && !u.isNecro ? this.buff.atk : 1; }

  meleeHit(src, target, dmg, crit) {
    if (src.base.aoe) {
      sfx.slam();
      this.cameras.main.shake(120, 0.005);
      const ring = this.add.image(target.x, target.y, 'aura').setTint(0xd8b080).setBlendMode(Phaser.BlendModes.ADD).setDepth(8).setScale(0.6);
      this.tweens.add({ targets: ring, scaleX: (src.base.aoe / 28) * 1.2, scaleY: (src.base.aoe / 28) * 1.2, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
      this.fxDirt.explode(14, target.x, target.y);
      this.units.filter((o) => !o.dead && !o.hidden && o.team !== src.team && Math.hypot(o.x - target.x, (o.y - target.y) * 1.5) <= src.base.aoe)
        .forEach((o) => o.takeDamage(o === target ? dmg : dmg * 0.6, crit, src));
    } else target.takeDamage(dmg, crit, src);
  }

  hitSparks(x, y, tint, n) { this.fxSpark.setParticleTint(tint); this.fxSpark.explode(n, x, y); }

  deathBurst(u, tints) {
    this.fxDebris.setParticleTint(Phaser.Utils.Array.GetRandom(tints));
    for (const t of tints) { this.fxDebris.setParticleTint(t); this.fxDebris.explode(8, u.x, u.y - 30); }
    if (u.team === 'enemy') {
      const beam = this.add.image(u.x, u.y, 'beam').setOrigin(0.5, 1).setScale(2.5, 0).setTint(0xffe8a0).setBlendMode(Phaser.BlendModes.ADD).setDepth(u.y + 1);
      this.tweens.add({ targets: beam, scaleY: 3, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => beam.destroy() });
    } else {
      this.fxSoul.setParticleTint(0x7dff6a); this.fxSoul.explode(10, u.x, u.y - 30);
    }
  }

  onUnitDeath(u) {
    if (u.isNecro) { this.gameOver(); return; }
    if (u.team === 'enemy') {
      this.kills++;
      this.score += u.base.boss ? 250 : 10 + this.wave;
      this.addSouls(u.base.souls || 3, u.x, u.y - 40);
    } else if (u.slot) { u.slot.unit = null; u.slot = null; }
    this.updateHUD();
  }

  spawnProjectile(src, target, type, val, isHeal, crit) {
    const dir = src.team === 'ally' ? 1 : -1;
    const off = { necro: [8, -74], archer: [26, -50], banshee: [16, -60], priest: [8, -76] }[src.key] || [18, -50];
    const x = src.x + off[0] * dir, y = src.y + off[1];
    const conf = {
      arrow: { tex: 'arrow', tint: null, scale: 2, speed: 620, light: null },
      bolt: { tex: 'orb', tint: 0x7dff6a, scale: 1.6, speed: 460, light: 0x6dff6a, trail: 0x5cff5a },
      holy: { tex: 'orb', tint: 0xffe08a, scale: 1.4, speed: 440, light: 0xffd88a, trail: 0xffd36a },
      wisp: { tex: 'orb', tint: 0x9ffff0, scale: 1.3, speed: 360, light: 0x5cffc8, trail: 0x5cffc8 },
      holyheal: { tex: 'orb', tint: 0xfff2c0, scale: 1.1, speed: 360, light: null, trail: 0xffe8a0 },
    }[type];
    const img = this.add.image(x, y, conf.tex).setScale(conf.scale).setDepth(945);
    if (conf.tint) img.setTint(conf.tint).setBlendMode(Phaser.BlendModes.ADD);
    let light = null;
    if (conf.light && this.lightsOn && this.lights.lights.length < 8) light = this.lights.addLight(x, y, 110, conf.light, 1.3);
    if (type === 'arrow') sfx.arrow(); else if (type === 'bolt') sfx.bolt(); else if (type === 'holy') sfx.holy();
    this.projectiles.push({ img, light, target, val, isHeal, crit, src, speed: conf.speed, trail: conf.trail, type, tx: target.x, ty: target.y - 40 });
  }

  killProjectile(p) { p.img.destroy(); if (p.light) this.lights.removeLight(p.light); p.dead = true; }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      if (!p.target.dead) { p.tx = p.target.x; p.ty = p.target.y - 40; }
      const dx = p.tx - p.img.x, dy = p.ty - p.img.y, d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      p.img.rotation = Math.atan2(dy, dx);
      if (p.trail) { this.fxTrail.setParticleTint(p.trail); this.fxTrail.emitParticleAt(p.img.x, p.img.y, 1); }
      if (d <= step + 4) {
        this.killProjectile(p);
        if (p.target.dead) continue;
        if (p.isHeal) {
          p.target.receiveHeal(p.val); sfx.heal();
          this.fxSoul.setParticleTint(p.type === 'wisp' ? 0x6dff9a : 0xffe8a0); this.fxSoul.explode(10, p.target.x, p.target.y - 30);
        } else {
          p.target.takeDamage(p.val, p.crit, p.src);
          if (p.type !== 'arrow') { this.fxSpark.setParticleTint(p.trail); this.fxSpark.explode(10, p.tx, p.ty); }
        }
        continue;
      }
      p.img.x += (dx / d) * step; p.img.y += (dy / d) * step;
      if (p.light) { p.light.x = p.img.x; p.light.y = p.img.y; }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  // ---------------------------------------------------------------- loop
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000) * this.speedMul;
    for (const f of this.fogs) { f.x += f.vx * dt * 0.5; if (f.x - f.displayWidth / 2 > W) f.x = -f.displayWidth / 2; }
    if (this.staffLight && !this.necro.dead) {
      this.staffLight.x = this.necro.x + 8; this.staffLight.y = this.necro.y - 76;
      this.staffLight.intensity = 1.5 + Math.sin(time / 300) * 0.25 + (this.necro.attacking ? 0.8 : 0);
    }
    if (this.state === 'battle') {
      this.spawnTimer -= dt;
      if (this.spawnQueue.length && this.spawnTimer <= 0) {
        this.spawnEnemy(this.spawnQueue.shift());
        this.spawnTimer = 0.7 + Math.random() * 0.8;
      }
    }
    const active = this.state === 'battle' || this.state === 'waveEnd' || this.state === 'prep' || this.state === 'curses';
    for (const u of this.units) {
      if (u.dead) continue;
      if (!u.hidden && active && this.state !== 'over') u.update(dt, this);
      u.sync();
    }
    this.units = this.units.filter((u) => !u.dead);
    this.updateProjectiles(dt);
    if (this.state === 'battle' && !this.spawnQueue.length && !this.units.some((u) => u.team === 'enemy')) this.endWave();
  }
}
