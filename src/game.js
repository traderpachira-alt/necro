// Main scene: battlefield, waves, card hand, merging/fusion, boons and UI.
import { Unit } from './unit.js';
import { Hand, cardColor } from './hand.js';
import {
  CREATURES, ENEMIES, NECRO, RITUALS, CURSES, RARITIES, ROLES, CONFIG, BOONS, MAX_LEVEL, FUSION_MIN_LEVEL,
  randomCard, waveComposition, levelMult, recipeFor, newRunMods,
} from './data.js';
import { sfx, unlockAudio, toggleMute, isMuted } from './audio.js';
import { TITLE, BODY, ZOOM } from './fonts.js';
import { W, H, PANEL_Y, INFO_Y, INFO_H, BTN_Y, DECK } from './layout.js';
import { save, metaLevel, recordRun, discover } from './save.js';
import { drawBoonFrame, BOON_W, BOON_H } from './cardart.js';

const SLOT_COLS = [150, 218, 286];
const SLOT_ROWS = [438, 510];
const NECRO_POS = { x: 70, y: 476 };

export function txt(scene, x, y, s, size, color = '#f2e8ff', extra = {}) {
  const { title, ...rest } = extra;
  return scene.add.text(x, y, s, {
    fontFamily: title ? TITLE : BODY, fontStyle: title ? '900' : '800', fontSize: size + 'px', color,
    stroke: '#05030a', strokeThickness: Math.max(3, Math.round(size / 6)), resolution: ZOOM, ...rest,
  });
}
const T = { title: true };
const hexStr = (c) => '#' + c.toString(16).padStart(6, '0');

export class Button {
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
    this.draw(); this.set(label);
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
  setDepth(d) { this.c.setDepth(d); return this; }
  destroy() { this.c.destroy(); }
}

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.lightsOn = this.sys.renderer.type === Phaser.WEBGL;
    this.units = []; this.projectiles = []; this.spawnQueue = [];
    this.state = 'init'; this.wave = 0; this.score = 0; this.kills = 0;
    this.mods = newRunMods();
    this.meta = { body: metaLevel('body'), purse: metaLevel('purse'), bone: metaLevel('bone'), rage: metaLevel('rage'), lore: metaLevel('lore'), luck: metaLevel('luck') };
    this.souls = CONFIG.startSouls + this.meta.purse * 10;
    this.buff = { shield: 0, atk: 1 }; this.enemyMult = 1; this.pendingRarity = 0; this.drawsThisPrep = 0;
    this.fusionCharges = 0;
    this.speedMul = 1;
    this.tweens.timeScale = 1; this.time.timeScale = 1; this.anims.globalTimeScale = 1;
    this._slots = null; this.quitLayer = null; this.dropZone = null; this.dragLabel = null; this.hlUnit = null;

    this.cameras.main.setZoom(ZOOM).centerOn(W / 2, H / 2);
    this.buildWorld();
    this.buildFx();
    this.buildUI();
    this.hand = new Hand(this);
    this.bindInput();

    this.necro = new Unit(this, { key: 'necro', team: 'ally', stats: NECRO, isNecro: true, x: NECRO_POS.x, y: NECRO_POS.y });
    this.necro.sprite.setInteractive({ useHandCursor: true });
    this.units.push(this.necro);

    this.input.once('pointerdown', () => unlockAudio());
    this.time.delayedCall(300, () => this.startPrep());
  }

  // ---------------------------------------------------------------- stats
  allyMult(u) {
    if (u.isNecro) return { hp: (1 + 0.1 * this.meta.body) * (1 + this.mods.necroHp), atk: 1 + this.mods.necroAtk, heal: 1 };
    const role = u.base.role, rm = RARITIES[u.rarity].mult * levelMult(u.level);
    return {
      hp: rm * (1 + this.mods.roleHp[role] + 0.06 * this.meta.bone),
      atk: rm * (1 + this.mods.roleAtk[role] + 0.06 * this.meta.rage),
      heal: rm * (1 + this.mods.heal),
    };
  }
  previewStats(id, rarity, level = 1) {
    const C = CREATURES[id], m = this.allyMult({ base: C, rarity, level });
    return { hp: Math.round(C.hp * m.hp), atk: Math.round(C.atk * m.atk), heal: Math.round((C.heal || 0) * m.heal) };
  }
  cardLuck() { return { luck: this.meta.luck + this.mods.luck, curseMult: this.mods.curseMult }; }

  // ---------------------------------------------------------------- world
  buildWorld() {
    const bg = this.add.image(0, 0, 'bg').setOrigin(0).setScale(2).setDepth(0);
    if (this.lightsOn) {
      bg.setPipeline('Light2D');
      this.lights.enable().setAmbientColor(0x48405e);
      this.lights.addLight(420, 60, 700, 0x9aa8ff, 0.9);
      this.staffLight = this.lights.addLight(NECRO_POS.x, NECRO_POS.y - 70, 230, 0x6dff6a, 1.6);
      this.holyLight = this.lights.addLight(540, 420, 260, 0xffd88a, 0.7);
    }
    this.add.image(0, 0, 'bg_g').setOrigin(0).setScale(2).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
    const mg = this.add.image(410, 80, 'big_soft').setScale(2.2).setTint(0xb8a8ff).setAlpha(0.28).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
    this.tweens.add({ targets: mg, alpha: 0.18, duration: 3000, yoyo: true, repeat: -1 });
    this.fogs = [];
    for (let i = 0; i < 7; i++) {
      const front = i >= 4;
      const f = this.add.image(Math.random() * W, front ? 530 + Math.random() * 30 : 330 + Math.random() * 120, 'fog')
        .setScale(2 + Math.random(), 1.2 + Math.random() * 0.6).setAlpha(front ? 0.1 : 0.16).setTint(0xb8a8e0).setDepth(front ? 800 : 3).setBlendMode(Phaser.BlendModes.SCREEN);
      f.vx = (front ? 10 : 5) + Math.random() * 8;
      this.fogs.push(f);
    }
    this.add.particles(0, 0, 'soft', {
      x: { min: 0, max: W }, y: { min: 300, max: 560 }, lifespan: 5000, speedY: { min: -14, max: -4 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.18, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [0x7dff6a, 0x9b7bd8, 0x6ff7ff], blendMode: 'ADD', frequency: 260,
    }).setDepth(850);
    const v = this.add.graphics().setDepth(860);
    for (let i = 0; i < 24; i++) { v.fillStyle(0x000000, 0.03); v.fillRect(0, PANEL_Y - 24 + i, W, 24 - i); }
    this.slotG = this.add.graphics().setDepth(7);
  }

  buildFx() {
    const base = { emitting: false, blendMode: 'ADD' };
    this.fxSpark = this.add.particles(0, 0, 'soft', { ...base, lifespan: 380, speed: { min: 60, max: 180 }, scale: { start: 0.45, end: 0 }, alpha: { start: 1, end: 0 } }).setDepth(950);
    this.fxDebris = this.add.particles(0, 0, 'px', { emitting: false, lifespan: 900, speed: { min: 60, max: 200 }, angle: { min: 200, max: 340 }, gravityY: 500, scale: { start: 1, end: 0.6 }, alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 } }).setDepth(950);
    this.fxSoul = this.add.particles(0, 0, 'soft', { ...base, lifespan: 900, speedY: { min: -90, max: -30 }, speedX: { min: -30, max: 30 }, scale: { start: 0.6, end: 0 }, alpha: { start: 1, end: 0 } }).setDepth(950);
    this.fxDirt = this.add.particles(0, 0, 'px', { emitting: false, lifespan: 700, speed: { min: 80, max: 220 }, angle: { min: 220, max: 320 }, gravityY: 600, scale: { start: 1.2, end: 0.5 }, tint: [0x3a2a30, 0x5a4650, 0x2a1c22, 0x8a7d66] }).setDepth(951);
    this.fxTrail = this.add.particles(0, 0, 'soft', { ...base, lifespan: 300, speed: 8, scale: { start: 0.4, end: 0 }, alpha: { start: 0.9, end: 0 } }).setDepth(940);
    this.fxUI = this.add.particles(0, 0, 'soft', { ...base, lifespan: 700, speed: { min: 80, max: 260 }, scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 } }).setDepth(1750);
    this.fxSwirl = this.add.particles(0, 0, 'soft', { ...base, lifespan: 700, speed: { min: 20, max: 60 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 } }).setDepth(1150);
  }

  // ---------------------------------------------------------------- UI
  buildUI() {
    this.add.image(0, PANEL_Y, 'panel').setOrigin(0).setDepth(1000);
    const hud = this.add.graphics().setDepth(1400);
    hud.fillStyle(0x05030a, 0.75).fillRect(0, 0, W, 64);
    hud.fillStyle(0x9b7bd8, 0.6).fillRect(0, 64, W, 2);
    this.waveText = txt(this, 14, 4, 'DALGA 1', 26, '#f2e8ff', T).setDepth(1401);
    this.phaseText = txt(this, 15, 37, 'Hazırlık', 16, '#c8b8e8').setDepth(1401);
    this.add.image(196, 32, 'skull_icon').setDepth(1401).setScale(1.5);
    this.scoreText = txt(this, 214, 15, '0', 26, '#f2e8ff').setDepth(1401);
    this.soulIcon = this.add.image(330, 32, 'soul_icon').setDepth(1401).setScale(1.5);
    this.soulText = txt(this, 350, 15, String(this.souls), 26, '#9dff8a').setDepth(1401);
    this.menuBtn = txt(this, 462, 32, '☰', 28).setOrigin(0.5).setDepth(1401).setInteractive({ useHandCursor: true });
    this.menuBtn.on('pointerup', () => this.confirmQuit());
    this.muteBtn = txt(this, 512, 32, isMuted() ? '🔇' : '🔊', 24).setOrigin(0.5).setDepth(1401).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerup', () => { this.muteBtn.setText(toggleMute() ? '🔇' : '🔊'); });

    this.infoG = this.add.graphics().setDepth(1001);
    this.infoG.fillStyle(0x05030a, 0.7).fillRoundedRect(10, INFO_Y, W - 20, INFO_H, 10);
    this.infoG.lineStyle(2, 0x3a2a50, 1).strokeRoundedRect(10, INFO_Y, W - 20, INFO_H, 10);
    this.infoTitle = txt(this, 22, INFO_Y + 6, '', 21, '#fff2d0', T).setDepth(1002);
    this.infoBody = txt(this, 22, INFO_Y + 35, '', 17, '#ddd0f4', { wordWrap: { width: W - 44 }, lineSpacing: -2 }).setDepth(1002);

    for (let i = 3; i >= 0; i--) this.add.image(DECK.x - 2 + i * 2, DECK.y - i * 2, 'card_back').setScale(0.3).setDepth(1001).setAlpha(1 - i * 0.15);
    txt(this, DECK.x, DECK.y + 44, 'Deste', 13, '#b89be8').setOrigin(0.5).setDepth(1002);

    this.btnDraw = new Button(this, 212, BTN_Y, 172, 62, 'KART ÇEK', 0x5a3a9a, () => this.buyCard());
    this.btnStart = new Button(this, 408, BTN_Y, 200, 62, 'SAVAŞA BAŞLA', 0x2f8a4a, () => this.startBattle());
    this.btnA = new Button(this, 212, BTN_Y, 172, 62, '', 0x5a3a9a, () => this.cardActionA()).show(false);
    this.btnB = new Button(this, 408, BTN_Y, 200, 62, '', 0x2f8a4a, () => this.cardActionB()).show(false);
    this.btnSpeed = new Button(this, 408, BTN_Y, 200, 62, 'HIZ x1', 0x6a4a2a, () => this.toggleSpeed()).show(false);

    this.unitCountText = txt(this, W - 14, PANEL_Y - 30, '', 17, '#ddd0f4').setOrigin(1, 0).setDepth(1001);
    this.fusionText = txt(this, 14, PANEL_Y - 30, '', 17, '#e8a8ff').setDepth(1001);
    this.input.on('pointerdown', (p, objs) => { if (!objs.length && this.hand.selected) this.select(null); });
  }

  setInfo(title, body, color = '#fff2d0') { this.infoTitle.setText(title).setColor(color); this.infoBody.setText(body); }

  updateHUD() {
    this.waveText.setText(`DALGA ${this.wave}`);
    this.scoreText.setText(String(this.score));
    this.soulText.setText(String(this.souls));
    this.unitCountText.setText(`Yaratık ${this.allyCreatures().length}/${CONFIG.maxUnits}`);
    this.fusionText.setText(this.fusionCharges > 0 ? `Füzyon hakkı: ${this.fusionCharges}` : '');
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
        targets: o, x: { value: 330, ease: 'Sine.easeIn' }, y: { value: 32, ease: 'Back.easeIn' }, scale: 0.3, delay: i * 60, duration: 650,
        onComplete: () => { o.destroy(); this.souls += share; sfx.soul(); this.updateHUD(); this.tweens.add({ targets: this.soulIcon, scale: { from: 2, to: 1.5 }, duration: 150 }); },
      });
    }
  }

  // ---------------------------------------------------------------- input (cards + units)
  bindInput() {
    this.input.dragDistanceThreshold = 10;
    const viewOf = (obj) => this.hand.cards.find((v) => v.c === obj);
    const unitOf = (obj) => this.units.find((u) => u.sprite === obj && !u.dead);
    this.input.on('dragstart', (p, obj) => {
      const u = unitOf(obj);
      if (u) { this.unitDragStart(u); return; }
      const v = viewOf(obj); if (!v) return;
      if (this.state !== 'prep' || !v.revealed || v.busy) { v.noDrag = true; return; }
      v.noDrag = false; v.dragging = true; v.c.setDepth(1350);
      this.tweens.killTweensOf(v.c);
      this.select(v, true);
    });
    this.input.on('drag', (p, obj, dx, dy) => {
      const u = unitOf(obj);
      if (u) { this.unitDrag(u, dx, dy); return; }
      const v = viewOf(obj); if (!v || v.noDrag) return;
      obj.x = dx; obj.y = dy;
      obj.angle = Phaser.Math.Clamp((p.velocity.x || 0) * 0.2, -14, 14);
      const over = dy < PANEL_Y;
      obj.setScale(over ? 0.7 : v.tscale);
      this.dropHint(over, v, dx, dy);
    });
    this.input.on('dragend', (p, obj) => {
      const u = unitOf(obj);
      if (u) { this.unitDrop(u); return; }
      const v = viewOf(obj); if (!v || v.noDrag) return;
      v.dragging = false; v.wasDragged = true;
      this.dropHint(false);
      if (obj.y < PANEL_Y) {
        const target = this.cardMergeTarget(v.card, obj.x, obj.y + 50);
        if (target) this.mergeCardInto(v, target); else this.playCard(v);
      } else this.hand.layout();
    });
    this.input.on('gameobjectup', (p, obj) => {
      const u = unitOf(obj);
      if (u) { if (u.wasDragged) { u.wasDragged = false; return; } this.showUnitInfo(u); return; }
      const v = viewOf(obj); if (!v) return;
      if (v.wasDragged) { v.wasDragged = false; return; }
      if (this.state !== 'prep' || v.busy) return;
      if (!v.revealed) { v.reveal(); this.select(null); return; }
      this.select(this.hand.selected === v ? null : v);
    });
    this.input.on('gameobjectmove', (p, obj) => { const v = viewOf(obj); if (v && v.revealed && !v.dragging && !v.busy && this.state === 'prep') v.tilt(p.worldX); });
    this.input.on('gameobjectout', (p, obj) => { const v = viewOf(obj); if (v && !v.dragging && !v.busy) { obj.angle = v.trot; obj.scaleX = v.tscale; } });
  }

  dropHint(on, v, x, y) {
    if (!this.dropZone) {
      this.dropZone = this.add.graphics().setDepth(1340);
      this.dropText = txt(this, W / 2, 330, '', 24, '#fff2d0', T).setOrigin(0.5).setDepth(1341);
    }
    this.dropZone.clear(); this.dropText.setText('');
    this.highlightUnit(null);
    if (!on) return;
    const col = cardColor(v.card);
    this.dropZone.fillStyle(col, 0.1).fillRect(0, 66, W, PANEL_Y - 66);
    this.dropZone.lineStyle(3, col, 0.7).strokeRect(4, 70, W - 8, PANEL_Y - 78);
    const target = this.cardMergeTarget(v.card, x, y + 50);
    if (target) { this.highlightUnit(target, 0xffd36a); this.dropText.setText(`Birleştir → Seviye ${target.level + 1}`); }
    else if (v.card.kind === 'curse') this.dropText.setText('Lanet oynanamaz');
    else if (v.card.kind === 'creature' && this.allyCreatures().length >= CONFIG.maxUnits) this.dropText.setText('Alan dolu! Aynı yaratığın üstüne bırak');
    else this.dropText.setText(v.card.kind === 'ritual' ? 'Bırak ve ritüeli başlat!' : 'Bırak ve çağır!');
  }

  highlightUnit(u, color) {
    if (this.hlUnit && this.hlUnit !== u && !this.hlUnit.dead) this.hlUnit.sprite.clearTint();
    this.hlUnit = u;
    if (u) u.sprite.setTint(color);
  }

  // ---------------------------------------------------------------- unit drag / merge / fusion
  unitDragStart(u) {
    if (this.state !== 'prep' || u.hidden || u.isNecro || u.team !== 'ally') { u.noDrag = true; return; }
    u.noDrag = false; u.dragging = true;
    this.select(null);
    sfx.click();
    this.drawSlots(true);
  }
  unitDrag(u, dx, dy) {
    if (u.noDrag) return;
    u.x = Phaser.Math.Clamp(dx, 20, W - 20); u.y = Phaser.Math.Clamp(dy + 14, 380, 548);
    const t = this.unitAt(u.x, u.y, u);
    let label = '', col = 0xffffff;
    if (t) {
      const act = this.dropAction(u, t);
      if (act.type === 'merge') { label = `Seviye ${t.level + 1}!`; col = 0xffd36a; }
      else if (act.type === 'fuse') { label = `Füzyon → ${CREATURES[act.hybrid].name}`; col = 0xe8a8ff; }
      else if (act.type === 'fuse-low') { label = `Füzyon için ikisi de en az Sv.${FUSION_MIN_LEVEL} olmalı`; col = 0xff8a80; }
      else { label = 'Yer değiştir'; col = 0xb8b8ff; }
    }
    this.highlightUnit(t, col);
    if (!this.dragLabel) this.dragLabel = txt(this, 0, 0, '', 19, '#fff2d0', T).setOrigin(0.5).setDepth(1360);
    this.dragLabel.setText(label).setPosition(Phaser.Math.Clamp(u.x, 150, W - 150), u.y - 124).setColor(hexStr(col));
  }
  unitDrop(u) {
    if (u.noDrag) return;
    u.dragging = false; u.wasDragged = true;
    this.dragLabel?.setText('');
    this.drawSlots(false);
    const t = this.unitAt(u.x, u.y, u);
    this.highlightUnit(null);
    if (t) {
      const act = this.dropAction(u, t);
      if (act.type === 'merge') { this.mergeUnits(u, t); return; }
      if (act.type === 'fuse') { this.fuseUnits(u, t, act.hybrid); return; }
      if (act.type === 'swap') { this.swapSlots(u, t); return; }
    } else {
      const slot = this.slots().find((s) => !s.reserved && (!s.unit || s.unit.dead) && Math.hypot(s.x - u.x, s.y - u.y) < 46);
      if (slot) { u.slot.unit = null; slot.unit = u; u.slot = slot; u.homeX = slot.x; u.homeY = slot.y; }
    }
    u.x = u.homeX; u.y = u.homeY;
    this.fxDirt.explode(6, u.x, u.y);
  }
  unitAt(x, y, except) {
    let best = null, bd = 44;
    for (const o of this.allyCreatures()) {
      if (o === except || o.hidden) continue;
      const d = Math.hypot(o.homeX - x, (o.homeY - y) * 1.2);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }
  dropAction(a, b) {
    if (a.key === b.key) return a.level === b.level && b.level < MAX_LEVEL ? { type: 'merge' } : { type: 'swap' };
    const hybrid = recipeFor(a.key, b.key);
    if (hybrid && this.fusionCharges > 0) return a.level >= FUSION_MIN_LEVEL && b.level >= FUSION_MIN_LEVEL ? { type: 'fuse', hybrid } : { type: 'fuse-low' };
    return { type: 'swap' };
  }
  drawSlots(on) {
    this.slotG.clear();
    if (!on) return;
    for (const s of this.slots()) this.slotG.lineStyle(2, 0x9b7bd8, 0.5).strokeEllipse(s.x, s.y, 56, 18);
  }
  swapSlots(a, b) {
    const sa = a.slot, sb = b.slot;
    sa.unit = b; sb.unit = a; a.slot = sb; b.slot = sa;
    a.homeX = sb.x; a.homeY = sb.y; b.homeX = sa.x; b.homeY = sa.y;
    a.x = a.homeX; a.y = a.homeY;
    sfx.click();
  }
  levelUpFx(t, text, color = 0xffd36a) {
    sfx.epic();
    this.cameras.main.flash(120, 255, 230, 160);
    this.fxSwirl.setParticleTint(color); this.fxSwirl.explode(30, t.x, t.y - 40);
    this.fxSoul.setParticleTint(color); this.fxSoul.explode(24, t.x, t.y - 30);
    const ring = this.add.image(t.x, t.y, 'ring').setScale(0.2, 0.08).setTint(color).setBlendMode(Phaser.BlendModes.ADD).setDepth(7);
    this.tweens.add({ targets: ring, scaleX: 0.8, scaleY: 0.28, alpha: 0, angle: 120, duration: 800, onComplete: () => ring.destroy() });
    this.tweens.add({ targets: t.sprite, scaleX: { from: 2.5, to: 2 }, scaleY: { from: 1.6, to: 2 }, duration: 350, ease: 'Back.easeOut' });
    this.floatText(t.x, t.y - 108, text, hexStr(color), 20);
  }
  mergeUnits(a, b) {
    a.slot.unit = null; a.slot = null; a.hidden = true; a.noSync = true; a.bar.clear();
    this.tweens.add({
      targets: [a.sprite, a.glow], x: b.x, y: b.y - 20, scaleX: 0.5, scaleY: 0.5, alpha: 0.3, duration: 260, ease: 'Cubic.easeIn',
      onComplete: () => {
        a.vanish();
        b.setLevel(b.level + 1, Math.max(a.rarity, b.rarity));
        b.hp = b.maxHp;
        this.levelUpFx(b, `SEVİYE ${b.level}!`);
        this.showUnitInfo(b);
        this.updateHUD();
      },
    });
  }
  cardMergeTarget(card, x, y) {
    if (card.kind !== 'creature') return null;
    const t = this.unitAt(x, y);
    return t && t.key === card.id && t.level === 1 ? t : null;
  }
  mergeCardInto(v, t) {
    this.hand.remove(v); this.select(null);
    v.busy = true;
    this.tweens.add({
      targets: v.c, x: t.x, y: t.y - 40, scale: 0.2, alpha: 0.2, duration: 320, ease: 'Cubic.easeIn',
      onComplete: () => {
        v.destroy();
        if (t.dead) return;
        t.setLevel(t.level + 1, Math.max(v.card.rarity, t.rarity));
        t.hp = t.maxHp;
        this.levelUpFx(t, `SEVİYE ${t.level}!`);
        this.showUnitInfo(t);
        this.updateHUD();
      },
    });
    this.hand.layout();
  }
  fuseUnits(a, b, hybrid) {
    this.fusionCharges--;
    const slot = b.slot;
    a.slot.unit = null; a.slot = null;
    a.hidden = true; b.hidden = true; a.noSync = true; b.noSync = true; a.bar.clear(); b.bar.clear();
    const level = Math.max(1, Math.min(a.level, b.level) - 1), rarity = Math.max(a.rarity, b.rarity);
    sfx.legendary();
    this.cameras.main.shake(400, 0.008);
    const cx = slot.x, cy = slot.y;
    for (const u of [a, b]) this.tweens.add({ targets: [u.sprite, u.glow], x: cx, y: cy - 30, angle: 360, scaleX: 0.3, scaleY: 0.3, alpha: 0, duration: 650, ease: 'Cubic.easeIn' });
    const pillar = this.add.image(cx, cy, 'beam').setOrigin(0.5, 1).setScale(4, 0).setTint(0xe8a8ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(cy + 1);
    this.tweens.add({ targets: pillar, scaleY: 3.5, duration: 500, yoyo: true, hold: 500, onComplete: () => pillar.destroy() });
    this.time.delayedCall(680, () => {
      a.vanish(); b.vanish(); slot.unit = null;
      const u = this.createAlly(hybrid, rarity, slot, level);
      this.cameras.main.flash(300, 230, 170, 255);
      this.levelUpFx(u, CREATURES[hybrid].name.toUpperCase(), 0xe8a8ff);
      if (discover(hybrid)) {
        const t = txt(this, W / 2, 180, 'YENİ HİBRİT KEŞFEDİLDİ!', 30, '#e8a8ff', T).setOrigin(0.5).setDepth(1460).setScale(0.3);
        const t2 = txt(this, W / 2, 220, `${CREATURES[hybrid].name} Grimuar'a eklendi`, 19, '#f2e8ff').setOrigin(0.5).setDepth(1460).setAlpha(0);
        this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.easeOut' });
        this.tweens.add({ targets: t2, alpha: 1, delay: 200, duration: 300 });
        this.tweens.add({ targets: [t, t2], alpha: 0, delay: 2400, duration: 400, onComplete: () => { t.destroy(); t2.destroy(); } });
      }
      this.showUnitInfo(u);
      this.updateHUD();
    });
  }

  showUnitInfo(u) {
    if (u.isNecro) {
      this.setInfo('Necromancer', `Can ${Math.round(u.hp)}/${u.maxHp}  •  Hasar ${Math.round(u.atk)}  —  Ölüm büyüsüyle uzaktan saldırır. Ölürse oyun biter.`, '#c8b0ff');
      return;
    }
    if (u.team !== 'ally') {
      this.setInfo(u.name, `Can ${Math.round(u.hp)}/${u.maxHp}  •  Hasar ${Math.round(u.atk)}`, '#ff8a80');
      return;
    }
    const R = RARITIES[u.rarity];
    let hint = u.level < MAX_LEVEL ? `Aynı türden Sv.${u.level} bir yaratığa sürükle → Sv.${u.level + 1}.` : 'Azami seviye.';
    if (this.fusionCharges > 0 && !u.base.hybrid) hint += ' Füzyon hakkın var: farklı türe sürükle.';
    this.setInfo(`${u.name}  •  Sv.${u.level} ${R.name}`,
      `Can ${Math.round(u.hp)}/${u.maxHp}  Hasar ${Math.round(u.atk)}${u.heal ? `  İyileştirme ${Math.round(u.heal)}` : ''} — ${u.base.desc} ${this.state === 'prep' ? hint : ''}`, R.color);
  }

  // ---------------------------------------------------------------- card selection & actions
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
      this.setInfo(`☠ ${D.name}  (Lanet)`, D.desc + ' Arındırılmazsa dalga başında tetiklenir.', '#ff8a80');
      this.btnA.set('ARINDIR', `${CONFIG.purgeCost} ruh`).setColor(0x8a2a3a).setEnabled(this.souls >= CONFIG.purgeCost);
      this.btnB.set('KAPAT').setColor(0x4a4258).setEnabled(true);
      return;
    }
    const reroll = this.rerollCost();
    this.btnA.set('YENİDEN ÇEK', `${reroll} ruh`).setColor(0x5a3a9a).setEnabled(this.souls >= reroll);
    if (card.kind === 'creature') {
      const C = CREATURES[card.id], R = RARITIES[card.rarity], st = this.previewStats(card.id, card.rarity);
      this.setInfo(`${C.name}  •  ${R.name} ${ROLES[C.role].name}`,
        `Can ${st.hp}  Hasar ${st.atk}${st.heal ? `  İyileştirme ${st.heal}` : ''}  —  ${C.desc}`, R.color);
      const full = this.allyCreatures().length >= CONFIG.maxUnits;
      const mergeT = this.allyCreatures().find((u) => u.key === card.id && u.level === 1);
      if (!full) this.btnB.set('OYNA').setColor(0x2f8a4a).setEnabled(true);
      else if (mergeT) this.btnB.set('BİRLEŞTİR', 'Sv.1 → Sv.2').setColor(0xb8862a).setEnabled(true);
      else this.btnB.set('FEDA ET', `+${this.sacrificeValue(card)} ruh`).setColor(0x8a2a3a).setEnabled(true);
    } else {
      const D = RITUALS[card.id];
      this.setInfo(`✦ ${D.name}  (Ritüel)`, D.desc, '#c8b0ff');
      this.btnB.set('OYNA').setColor(0x2f8a4a).setEnabled(true);
    }
  }
  sacrificeValue(card) { return 5 + card.rarity * 6; }
  rerollCost() { return Math.max(2, CONFIG.rerollCost - this.mods.discount); }
  drawCost() { return Math.max(3, CONFIG.drawCost + CONFIG.drawCostStep * this.drawsThisPrep - this.mods.discount); }

  cardActionA() {
    const v = this.hand.selected; if (!v) return;
    if (v.card.kind === 'curse') {
      if (this.souls < CONFIG.purgeCost) return;
      this.souls -= CONFIG.purgeCost;
      this.burnCard(v, 0x9b6bff);
      this.floatText(270, 520, 'Lanet arındırıldı', '#c8b0ff', 18);
    } else {
      const cost = this.rerollCost();
      if (this.souls < cost) return;
      this.souls -= cost;
      this.burnCard(v, 0x7dff6a);
      this.time.delayedCall(250, () => this.dealCards(1));
    }
    this.select(null);
  }
  cardActionB() {
    const v = this.hand.selected; if (!v) return;
    const card = v.card;
    if (card.kind === 'curse') { this.select(null); return; }
    if (card.kind === 'creature' && this.allyCreatures().length >= CONFIG.maxUnits) {
      const t = this.allyCreatures().find((u) => u.key === card.id && u.level === 1);
      if (t) { this.mergeCardInto(v, t); return; }
      const val = this.sacrificeValue(card);
      this.burnCard(v, 0x7dff6a);
      this.addSouls(val, v.c.x, v.c.y);
      this.select(null);
      return;
    }
    this.playCard(v);
  }

  burnCard(v, color) {
    this.hand.remove(v);
    v.busy = true;
    sfx.curse();
    this.fxUI.setParticleTint(color);
    this.fxUI.explode(24, v.c.x, v.c.y);
    this.tweens.add({ targets: v.c, scaleX: 0.2, scaleY: v.c.scaleY * 1.3, alpha: 0, angle: 10, duration: 350, ease: 'Quad.easeIn', onComplete: () => v.destroy() });
    this.hand.layout();
    this.updateHUD();
  }

  // ---------------------------------------------------------------- cards
  newCard() {
    const card = randomCard(this.wave, this.cardLuck());
    if (card.kind === 'creature' && this.pendingRarity > 0) { card.rarity = Math.min(3, card.rarity + this.pendingRarity); this.pendingRarity = 0; }
    return card;
  }

  dealCards(n) {
    n = Math.min(n, CONFIG.maxHand - this.hand.size);
    for (let i = 0; i < n; i++) this.hand.add(this.newCard(), i * 140);
    if (n > 0) this.time.delayedCall(n * 140 + 300, () => { this.updateHUD(); this.prepInfo(); });
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
      sfx.rare(); this.fxUI.setParticleTint(0x9b6bff); this.fxUI.explode(card.id === 'fusion' ? 40 : 18, x, y);
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
      if (!slot) { sfx.error(); this.floatText(270, 520, 'Alan dolu! Birleştir ya da feda et', '#ff8a80', 18); this.select(v); return; }
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
    this.hand.remove(v); this.select(null);
    v.busy = true;
    this.tweens.add({ targets: v.c, x: W / 2, y: 300, scale: 1.35, angle: 0, duration: 320, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: v.c, alpha: 0, scale: 1.8, delay: 520, duration: 300, onComplete: () => v.destroy() });
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
        if (target.revealed) { target.revealed = false; target.sheen.setVisible(false); target.reveal(); }
        else { this.fxUI.setParticleTint(0xff3040); this.fxUI.explode(20, target.c.x, target.c.y); }
      } else this.pendingRarity++;
    }
    if (id === 'whisper') this.dealCards(2);
    if (id === 'bonearmor') { this.buff.shield = 0.3; this.floatText(W / 2, 260, 'Bu dalga: kemik kalkanı', '#9fdcff', 16); }
    if (id === 'harvest') this.addSouls(20, W / 2, 300);
    if (id === 'frenzy') { this.buff.atk = 1.25; this.floatText(W / 2, 260, 'Bu dalga: +%25 hasar', '#ff9a6a', 16); }
    if (id === 'fusion') {
      this.fusionCharges++;
      this.floatText(W / 2, 260, 'Füzyon hakkı kazandın', '#e8a8ff', 18);
      this.time.delayedCall(600, () => this.setInfo('Kemik Füzyonu', `Farklı türden iki yaratığı (ikisi de en az Sv.${FUSION_MIN_LEVEL}) savaş alanında üst üste sürükle. Keşfettiğin tarifler Grimuar'a yazılır.`, '#e8a8ff'));
    }
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

  createAlly(key, rarity, slot, level = 1) {
    const u = new Unit(this, { key, team: 'ally', stats: CREATURES[key], rarity, level, x: slot.x, y: slot.y });
    u.homeX = slot.x; u.homeY = slot.y; u.slot = slot;
    slot.unit = u; slot.reserved = false;
    u.sprite.setInteractive({ draggable: true, useHandCursor: true });
    this.units.push(u);
    return u;
  }

  summon(card, slot) {
    sfx.summon();
    const col = RARITIES[card.rarity].hex;
    const ring = this.add.image(slot.x, slot.y, 'ring').setScale(0.2, 0.08).setTint(card.rarity ? col : 0x7dff6a).setBlendMode(Phaser.BlendModes.ADD).setDepth(7).setAlpha(0);
    this.tweens.add({ targets: ring, scaleX: 0.75, scaleY: 0.26, alpha: 1, duration: 350, ease: 'Back.easeOut' });
    this.tweens.add({ targets: ring, angle: 180, duration: 1600 });
    this.tweens.add({ targets: ring, alpha: 0, delay: 1200, duration: 400, onComplete: () => ring.destroy() });
    const pillar = this.add.image(slot.x, slot.y, 'beam').setOrigin(0.5, 1).setScale(3, 0).setTint(card.rarity ? col : 0x7dff6a).setBlendMode(Phaser.BlendModes.ADD).setDepth(slot.y + 1).setAlpha(0.8);
    this.tweens.add({ targets: pillar, scaleY: 2.6, duration: 300, ease: 'Cubic.easeOut', yoyo: true, hold: 400, onComplete: () => pillar.destroy() });
    if (this.lightsOn && this.lights.lights.length < 9) {
      const light = this.lights.addLight(slot.x, slot.y - 30, 200, card.rarity ? col : 0x6dff6a, 0);
      this.tweens.add({ targets: light, intensity: 2.6, duration: 300, yoyo: true, hold: 700, onComplete: () => this.lights.removeLight(light) });
    }
    this.cameras.main.shake(250, 0.004);
    this.time.delayedCall(300, () => {
      const u = this.createAlly(card.id, card.rarity, slot);
      u.hidden = true; u.rise = 88;
      u.sprite.anims.stop(); u.sprite.setFrame(9);
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
    if (hidden) this.setInfo('Ruh Kartları', `Kapalı kartlara dokunarak aç (${hidden} kapalı). Açık kartı seç ya da yukarı sürükleyip savaş alanına bırak.`);
    else this.setInfo(`Dalga ${this.wave} yaklaşıyor`, 'Aynı türden ve seviyeden yaratıkları üst üste sürükleyerek seviye atlat. Hazırsan savaşa başla.');
  }

  startPrep() {
    this.state = 'prep';
    this.wave++;
    this.drawsThisPrep = 0;
    this.phaseText.setText('Hazırlık');
    this.banner(`DALGA ${this.wave}`, '#d8c8ff', this.wave % 5 === 0 ? 'Engizisyoncu geliyor!' : 'Hazırlık evresi');
    this.btnSpeed.show(false); this.btnDraw.show(true); this.btnStart.show(true).setEnabled(true);
    this.hand.cards.forEach((v) => v.c.setAlpha(1));
    const first = this.wave === 1 ? 1 + this.meta.lore : 0;
    this.dealCards(CONFIG.handSize + first + this.mods.extraDraw);
    this.updateHUD();
    this.prepInfo();
  }

  startBattle() {
    if (this.state !== 'prep') return;
    this.select(null);
    this.state = 'curses';
    this.btnDraw.show(false); this.btnStart.show(false);
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
    if (id === 'thief') { const n = Math.min(15, this.souls); this.souls -= n; this.floatText(350, 80, `-${n}`, '#ff6a5a', 18); }
    if (id === 'holy') this.enemyMult *= 1.25;
    if (id === 'rot') {
      const al = this.allyCreatures();
      if (al.length) { const u = Phaser.Utils.Array.GetRandom(al); u.takeDamage(Math.max(1, u.hp * 0.4), false, null); }
    }
    if (id === 'restless') this.spawnEnemy(Phaser.Utils.Array.GetRandom(['guard', 'golem', 'butcher', 'wolf', 'archer']), true);
    this.updateHUD();
  }

  beginWave() {
    this.state = 'battle';
    this.phaseText.setText('Savaş');
    sfx.waveStart();
    this.banner('SAVAŞ!', '#ff8a6a');
    this.btnSpeed.show(true);
    this.hand.cards.forEach((v) => v.c.setAlpha(0.45));
    this.setInfo(`Dalga ${this.wave}`, 'Ölüler senin için savaşıyor... Düşen düşmanlar ruh bırakır. Bir yaratığa dokunarak bilgisini gör.', '#ff8a6a');
    this.allyCreatures().forEach((u) => {
      u.charged = false;
      if (this.buff.shield > 0) { u.shield = Math.round(u.maxHp * this.buff.shield); this.fxSoul.setParticleTint(0x9fdcff); this.fxSoul.explode(8, u.x, u.y - 40); }
    });
    this.spawnQueue = waveComposition(this.wave);
    this.spawnTimer = 0.4;
    if (this.lightsOn) this.tweens.add({ targets: this.holyLight, intensity: 1.4, duration: 600, yoyo: true });
  }

  spawnEnemy(key, hostileCreature = false) {
    const y = Phaser.Math.Between(420, 530);
    let u;
    if (hostileCreature) {
      const C = CREATURES[key];
      u = new Unit(this, { key, texKey: key + '_L', team: 'enemy', stats: { ...C, name: 'Huzursuz ' + C.name, souls: 4 }, mult: 1 + this.wave * 0.08, x: 470, y, tint: 0xff8080 });
      this.fxSoul.setParticleTint(0xff3040); this.fxSoul.explode(20, 470, y - 40);
      this.fxDirt.explode(20, 470, y);
    } else {
      const E = ENEMIES[key];
      const w = this.wave - 1;
      const m = (1 + w * 0.15 + w * w * 0.006) * this.enemyMult;
      const am = (1 + w * 0.1 + w * w * 0.003) * this.enemyMult;
      u = new Unit(this, { key, texKey: key + '_L', team: 'enemy', stats: { ...E, atk: E.atk * am / m }, mult: m, x: W + 30, y });
    }
    u.sprite.setInteractive();
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
    const healers = this.allyCreatures().filter((u) => u.key === 'banshee' || u.key === 'screamer');
    const pct = CONFIG.waveHealPct + healers.reduce((s, b) => s + CONFIG.bansheeWaveHealPct * RARITIES[b.rarity].mult * levelMult(b.level), 0);
    this.units.filter((u) => u.team === 'ally' && !u.dead).forEach((u, i) => {
      this.time.delayedCall(300 + i * 80, () => {
        u.receiveHeal(u.maxHp * pct); u.shield = 0;
        this.fxSoul.setParticleTint(0x6dff9a); this.fxSoul.explode(10, u.x, u.y - 30);
      });
    });
    this.time.delayedCall(300, () => sfx.heal());
    this.buff = { shield: 0, atk: 1 }; this.enemyMult = 1;
    this.projectiles.forEach((p) => this.killProjectile(p)); this.projectiles = [];
    this.updateHUD();
    this.time.delayedCall(2100, () => { if (this.state === 'waveEnd') this.showBoons(); });
  }

  // ---------------------------------------------------------------- boons (run upgrades)
  showBoons() {
    this.state = 'boon';
    this.select(null);
    const keys = Phaser.Utils.Array.Shuffle(Object.keys(BOONS).slice()).slice(0, 3);
    const layer = [];
    const dark = this.add.rectangle(W / 2, H / 2, W, H, 0x05030a, 0).setDepth(1700).setInteractive();
    this.tweens.add({ targets: dark, fillAlpha: 0.82, duration: 300 });
    layer.push(dark);
    const title = txt(this, W / 2, 150, 'BİR LÜTUF SEÇ', 36, '#ffd36a', T).setOrigin(0.5).setDepth(1701).setAlpha(0);
    const sub = txt(this, W / 2, 192, 'Bu oyunun sonuna kadar geçerli', 18, '#ddd0f4').setOrigin(0.5).setDepth(1701).setAlpha(0);
    this.tweens.add({ targets: [title, sub], alpha: 1, duration: 300 });
    layer.push(title, sub);
    const colors = [0x9b6bff, 0x4aa8ff, 0x2fbf7a, 0xd8a032, 0xe0603a];
    const s = 0.68, pw = BOON_W * s, ph = BOON_H * s;
    keys.forEach((k, i) => {
      const B = BOONS[k];
      const colHex = colors[Object.keys(BOONS).indexOf(k) % colors.length];
      const tk = 'boon_' + k;
      if (!this.textures.exists(tk)) this.textures.addCanvas(tk, drawBoonFrame(B.icon, hexStr(colHex))).setFilter(Phaser.Textures.FilterMode.LINEAR);
      const x = W / 2 + (i - 1) * (pw + 12), y = 400;
      const c = this.add.container(x, y + 40).setDepth(1702).setAlpha(0);
      const glow = this.add.image(0, 0, 'card_glow').setScale((pw + 40) / 260, (ph + 40) / 350).setTint(colHex).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.6);
      const img = this.add.image(0, 0, tk).setScale(s);
      const name = txt(this, 0, -ph / 2 + 132, B.name, 17, '#fff2d0', { ...T, align: 'center', wordWrap: { width: pw - 18 } }).setOrigin(0.5, 0);
      const desc = txt(this, 0, -ph / 2 + 178, B.desc, 15, '#ddd0f4', { align: 'center', wordWrap: { width: pw - 20 }, strokeThickness: 2 }).setOrigin(0.5, 0);
      c.add([glow, img, name, desc]);
      c.setSize(pw, ph).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: c, y, alpha: 1, delay: 200 + i * 120, duration: 350, ease: 'Back.easeOut' });
      this.tweens.add({ targets: glow, alpha: 0.25, duration: 900, yoyo: true, repeat: -1 });
      c.on('pointerdown', () => c.setScale(0.95));
      c.on('pointerout', () => c.setScale(1));
      c.on('pointerup', () => {
        if (this.state !== 'boon') return;
        this.state = 'boonChosen';
        sfx.epic();
        this.fxUI.setParticleTint(colHex); this.fxUI.explode(40, c.x, c.y);
        this.applyBoon(k);
        this.floatText(W / 2, 560, `${B.name} kazanıldı`, '#ffd36a', 20);
        this.tweens.add({ targets: c, scale: 1.12, duration: 200, yoyo: true });
        layer.filter((o) => o !== c).forEach((o) => this.tweens.add({ targets: o, alpha: 0, duration: 300 }));
        this.tweens.add({ targets: c, alpha: 0, delay: 600, duration: 300, onComplete: () => { layer.forEach((o) => o.destroy()); this.startPrep(); } });
      });
      layer.push(c);
    });
  }

  applyBoon(k) {
    BOONS[k].apply(this.mods);
    for (const u of this.units) if (u.team === 'ally' && !u.dead) u.recalc(false);
    if (k === 'will') this.necro.hp = this.necro.maxHp;
    this.updateHUD();
  }

  // ---------------------------------------------------------------- end of run
  endRunRewards() {
    if (this.rewarded) return this.rewarded;
    const earned = Math.floor(this.score / 80) + this.wave * 2;
    save.darkSouls += earned;
    recordRun(this.score, this.wave, this.kills);
    this.rewarded = earned;
    return earned;
  }

  confirmQuit() {
    if (this.state === 'over' || this.quitLayer) return;
    sfx.click();
    const L = this.quitLayer = [];
    L.push(this.add.rectangle(W / 2, H / 2, W, H, 0x05030a, 0.82).setDepth(1900).setInteractive());
    L.push(txt(this, W / 2, H / 2 - 110, 'Ana menüye dön?', 30, '#f2e8ff', T).setOrigin(0.5).setDepth(1901));
    L.push(txt(this, W / 2, H / 2 - 60, 'Bu oyun sona erer; skorun ve Kara Ruh ödülün kaydedilir.', 17, '#ddd0f4', { align: 'center', wordWrap: { width: 420 } }).setOrigin(0.5).setDepth(1901));
    const yes = new Button(this, W / 2 - 108, H / 2 + 20, 190, 60, 'EVET', 0x8a2a3a, () => { this.endRunRewards(); this.state = 'over'; this.leave('Menu'); }).setDepth(1902);
    const no = new Button(this, W / 2 + 108, H / 2 + 20, 190, 60, 'DEVAM ET', 0x2f8a4a, () => { L.forEach((o) => o.destroy()); yes.destroy(); no.destroy(); this.quitLayer = null; }).setDepth(1902);
  }

  leave(scene) {
    this.tweens.timeScale = 1; this.time.timeScale = 1; this.anims.globalTimeScale = 1;
    this.scene.start(scene);
  }

  gameOver() {
    if (this.state === 'over') return;
    this.state = 'over';
    sfx.gameOver();
    const prevBest = save.best;
    const earned = this.endRunRewards();
    this.time.delayedCall(900, () => {
      const o = this.add.rectangle(W / 2, H / 2, W, H, 0x05030a, 0).setDepth(2000).setInteractive();
      this.tweens.add({ targets: o, fillAlpha: 0.86, duration: 600 });
      const cy = H / 2 - 200;
      const els = [
        txt(this, W / 2, cy, 'NECROMANCER', 42, '#9b7bd8', T).setOrigin(0.5),
        txt(this, W / 2, cy + 52, 'TOPRAĞA DÖNDÜ', 32, '#ff6a6a', T).setOrigin(0.5),
        txt(this, W / 2, cy + 130, `Ulaşılan dalga: ${this.wave}`, 26).setOrigin(0.5),
        txt(this, W / 2, cy + 168, `Skor: ${this.score}${this.score > prevBest ? '  (YENİ REKOR!)' : ''}`, 26, '#ffd36a').setOrigin(0.5),
        txt(this, W / 2, cy + 206, `En iyi skor: ${save.best}  •  Öldürülen: ${this.kills}`, 19, '#c8b8e8').setOrigin(0.5),
        txt(this, W / 2, cy + 254, `+${earned} Kara Ruh`, 28, '#c88aff', T).setOrigin(0.5),
        txt(this, W / 2, cy + 290, 'Ana menüde kalıcı yükseltmelere harca', 17, '#b8a8d8').setOrigin(0.5),
      ];
      els.forEach((e, i) => { e.setDepth(2001).setAlpha(0); this.tweens.add({ targets: e, alpha: 1, delay: 300 + i * 120, duration: 400 }); });
      const b1 = new Button(this, W / 2, cy + 372, 280, 64, 'YENİDEN DİRİL', 0x5a3a9a, () => this.leave('Game')).setDepth(2002);
      const b2 = new Button(this, W / 2, cy + 450, 280, 64, 'ANA MENÜ', 0x4a4258, () => this.leave('Menu')).setDepth(2002);
      for (const b of [b1, b2]) { b.c.setAlpha(0); this.tweens.add({ targets: b.c, alpha: 1, delay: 1200, duration: 400 }); }
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
    return best;
  }

  lowestAlly(team) {
    let best = null, br = 1;
    for (const o of this.units) { if (o.dead || o.hidden || o.team !== team) continue; const r = o.hp / o.maxHp; if (r < br) { br = r; best = o; } }
    return best;
  }

  atkMult(u) { return u.team === 'ally' && !u.isNecro ? this.buff.atk : 1; }

  areaHit(src, x, y, dmg, radius, crit, primary) {
    const ring = this.add.image(x, y, 'aura').setTint(0xd8b080).setBlendMode(Phaser.BlendModes.ADD).setDepth(8).setScale(0.6);
    this.tweens.add({ targets: ring, scaleX: (radius / 28) * 1.2, scaleY: (radius / 28) * 1.2, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    this.fxDirt.explode(14, x, y);
    this.units.filter((o) => !o.dead && !o.hidden && o.team !== src.team && Math.hypot(o.x - x, (o.y - y) * 1.5) <= radius)
      .forEach((o) => o.takeDamage(o === primary ? dmg : dmg * 0.6, crit, src, !src.base.proj));
  }

  meleeHit(src, target, dmg, crit) {
    if (src.base.aoe) {
      sfx.slam();
      this.cameras.main.shake(120, 0.005);
      this.areaHit(src, target.x, target.y, dmg, src.base.aoe, crit, target);
    } else target.takeDamage(dmg, crit, src, true);
  }

  onKill(src) {
    if (src.base.feast && src.team === 'ally') {
      const amt = src.base.feast * RARITIES[src.rarity].mult * levelMult(src.level);
      for (const u of this.units) if (u.team === 'ally' && !u.dead && !u.hidden) { u.receiveHeal(amt); this.fxSoul.setParticleTint(0x4affb0); this.fxSoul.explode(4, u.x, u.y - 30); }
    }
  }

  hitSparks(x, y, tint, n) { this.fxSpark.setParticleTint(tint); this.fxSpark.explode(n, x, y); }

  deathBurst(u, tints) {
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
      this.addSouls((u.base.souls || 3) + this.mods.soulBonus, u.x, u.y - 40);
    } else if (u.slot) { u.slot.unit = null; u.slot = null; }
    this.updateHUD();
  }

  spawnProjectile(src, target, type, val, isHeal, crit) {
    const dir = src.team === 'ally' ? 1 : -1;
    const off = { necro: [8, -74], archer: [26, -50], screamer: [26, -50], banshee: [16, -60], priest: [8, -76], catapult: [-10, -80] }[src.key] || [18, -50];
    const x = src.x + off[0] * dir, y = src.y + off[1];
    const conf = {
      arrow: { tex: 'arrow', tint: src.key === 'screamer' ? 0x9ffff0 : null, scale: 2, speed: 620, light: null },
      boulder: { tex: 'boulder', tint: null, scale: 2.2, speed: 380, light: null, arc: true },
      bolt: { tex: 'orb', tint: 0x7dff6a, scale: 1.6, speed: 460, light: 0x6dff6a, trail: 0x5cff5a },
      holy: { tex: 'orb', tint: 0xffe08a, scale: 1.4, speed: 440, light: 0xffd88a, trail: 0xffd36a },
      wisp: { tex: 'orb', tint: 0x9ffff0, scale: 1.3, speed: 360, light: 0x5cffc8, trail: 0x5cffc8 },
      holyheal: { tex: 'orb', tint: 0xfff2c0, scale: 1.1, speed: 360, light: null, trail: 0xffe8a0 },
    }[type];
    const img = this.add.image(x, y, conf.tex).setScale(conf.scale).setDepth(945);
    if (conf.tint) img.setTint(conf.tint);
    if (conf.tex === 'orb') img.setBlendMode(Phaser.BlendModes.ADD);
    let light = null;
    if (conf.light && this.lightsOn && this.lights.lights.length < 8) light = this.lights.addLight(x, y, 110, conf.light, 1.3);
    if (type === 'arrow' || type === 'boulder') sfx.arrow(); else if (type === 'bolt') sfx.bolt(); else if (type === 'holy') sfx.holy();
    this.projectiles.push({ img, light, target, val, isHeal, crit, src, speed: conf.speed, trail: conf.trail, type, tx: target.x, ty: target.y - 40, sx: x, sy: y, arc: conf.arc, t: 0 });
  }

  killProjectile(p) { p.img.destroy(); if (p.light) this.lights.removeLight(p.light); p.dead = true; }

  updateProjectiles(dt) {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      if (!p.target.dead) { p.tx = p.target.x; p.ty = p.target.y - (p.arc ? 10 : 40); }
      if (p.arc) {
        const dist = Math.hypot(p.tx - p.sx, p.ty - p.sy);
        p.t = Math.min(1, p.t + (p.speed * dt) / Math.max(60, dist));
        p.img.x = p.sx + (p.tx - p.sx) * p.t;
        p.img.y = p.sy + (p.ty - p.sy) * p.t - Math.sin(p.t * Math.PI) * 90;
        p.img.rotation += dt * 8;
        if (p.t >= 1) {
          this.killProjectile(p); sfx.slam();
          if (!p.src.dead) this.areaHit(p.src, p.tx, p.ty, p.val, p.src.base.aoe || 50, p.crit, p.target.dead ? null : p.target);
        }
        continue;
      }
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
          p.target.takeDamage(p.val, p.crit, p.src, false);
          if (p.src.base.healArrow) {
            const al = this.lowestAlly(p.src.team);
            if (al) { al.receiveHeal(p.val * p.src.base.healArrow); this.fxSoul.setParticleTint(0x7affd8); this.fxSoul.explode(6, al.x, al.y - 30); }
          }
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
    const active = this.state !== 'over' && this.state !== 'init';
    for (const u of this.units) {
      if (u.dead) continue;
      if (!u.hidden && active) u.update(dt, this);
      if (!u.dead && !u.noSync) u.sync();
    }
    this.units = this.units.filter((u) => !u.dead);
    this.updateProjectiles(dt);
    if (this.state === 'battle' && !this.spawnQueue.length && !this.units.some((u) => u.team === 'enemy')) this.endWave();
  }
}
