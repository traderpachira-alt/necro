// Ruh Kartları: card views, hand layout, flip/reveal and drag-to-play interactions.
import { RARITIES, CREATURES, RITUALS, CURSES } from './data.js';
import { drawCreatureCard, drawSpellCard, CARD_W, CARD_H } from './cardart.js';
import { PORTRAITS } from './boot.js';
import { sfx } from './audio.js';

const S = 0.5; // texture -> display scale
export const HAND_Y = 790;
const DECK = { x: 52, y: 908 };

function faceKey(scene, card) {
  const key = card.kind === 'creature' ? `cf_${card.id}_${card.rarity}` : `cf_${card.kind}_${card.id}`;
  if (!scene.textures.exists(key)) {
    const cv = card.kind === 'creature' ? drawCreatureCard(card.id, card.rarity, PORTRAITS[card.id]) : drawSpellCard(card.kind, card.id);
    scene.textures.addCanvas(key, cv).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  return key;
}
export function cardColor(card) {
  if (card.kind === 'curse') return 0xe0303a;
  if (card.kind === 'ritual') return 0x9b6bff;
  return RARITIES[card.rarity].hex;
}
export function cardTitle(card) {
  if (card.kind === 'creature') return CREATURES[card.id].name;
  return (card.kind === 'curse' ? CURSES : RITUALS)[card.id].name;
}

export class CardView {
  constructor(scene, hand, card) {
    this.scene = scene; this.hand = hand; this.card = card;
    this.revealed = false; this.busy = false;
    const c = this.c = scene.add.container(DECK.x, DECK.y).setDepth(1200).setScale(0.6);
    this.glowImg = scene.add.image(0, 0, 'card_glow').setScale(S).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.face = scene.add.image(0, 0, 'card_back').setScale(S);
    this.sheen = scene.add.sprite(0, 0, 'card_sheen', 0).setScale(S).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    c.add([this.glowImg, this.face, this.sheen]);
    c.setSize(CARD_W * S, CARD_H * S);
    c.setInteractive({ useHandCursor: true, draggable: true });
    this.tx = DECK.x; this.ty = DECK.y; this.trot = 0; this.tscale = 1;
    this.backGlow();
  }

  backGlow() {
    this.glowImg.setTint(0x7d5bd8);
    this.glowTween?.remove();
    this.glowTween = this.scene.tweens.add({ targets: this.glowImg, alpha: { from: 0.15, to: 0.5 }, duration: 1100, yoyo: true, repeat: -1 });
  }

  reveal(instant = false) {
    if (this.revealed) return;
    this.revealed = true;
    const sc = this.scene, card = this.card;
    const key = faceKey(sc, card);
    const finish = () => {
      this.face.setTexture(key);
      const col = cardColor(card);
      this.glowImg.setTint(col);
      this.glowTween?.remove();
      const strong = card.kind !== 'creature' || card.rarity >= 1;
      this.glowTween = sc.tweens.add({ targets: this.glowImg, alpha: { from: strong ? 0.45 : 0.12, to: strong ? 0.95 : 0.3 }, duration: card.rarity === 3 ? 600 : 1000, yoyo: true, repeat: -1 });
      if (card.kind !== 'creature' || card.rarity >= 1) { this.sheen.setVisible(true).play('sheen'); this.sheen.anims.setProgress(Math.random()); }
      if (card.kind === 'creature' && card.rarity === 3) this.legendaryAura();
    };
    if (instant) { finish(); return; }
    this.busy = true;
    sfx.flip();
    sc.tweens.add({
      targets: this.c, scaleX: 0, y: this.c.y - 26, duration: 140, ease: 'Quad.easeIn',
      onComplete: () => {
        finish();
        sc.tweens.add({
          targets: this.c, scaleX: this.tscale, y: this.ty, duration: 220, ease: 'Back.easeOut',
          onComplete: () => { this.busy = false; },
        });
        sc.onCardRevealed(this);
      },
    });
  }

  legendaryAura() {
    const sc = this.scene;
    this.rays = sc.add.image(0, 0, 'rays').setTint(0xffd36a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.35).setScale(0.9);
    this.c.addAt(this.rays, 0);
    sc.tweens.add({ targets: this.rays, angle: 360, duration: 9000, repeat: -1 });
    this.sparkle = sc.add.particles(0, 0, 'soft', {
      x: { min: -50, max: 50 }, y: { min: -72, max: 72 }, lifespan: 900, speedY: { min: -30, max: -10 },
      scale: { start: 0.35, end: 0 }, alpha: { start: 1, end: 0 }, tint: [0xffd36a, 0xfff2c0], blendMode: 'ADD', frequency: 90,
    }).setDepth(1201);
    this.sparkle.startFollow(this.c);
  }

  // Squash/tilt toward the pointer to fake a 3D card
  tilt(px) {
    const t = Phaser.Math.Clamp((px - this.c.x) / 50, -1, 1);
    this.c.scaleX = this.tscale * (1 - Math.abs(t) * 0.1);
    this.c.angle = this.trot + t * 5;
    if (this.sheen.visible) this.sheen.setFrame(Math.round(((t + 1) / 2) * 15));
  }

  moveTo(x, y, rot, scale, dur = 260) {
    this.tx = x; this.ty = y; this.trot = rot; this.tscale = scale;
    if (this.busy) return;
    this.scene.tweens.add({ targets: this.c, x, y, angle: rot, scaleX: scale, scaleY: scale, duration: dur, ease: 'Cubic.easeOut' });
  }

  destroy() {
    this.glowTween?.remove();
    this.sparkle?.destroy();
    this.c.destroy();
  }
}

export class Hand {
  constructor(scene) {
    this.scene = scene;
    this.cards = [];
    this.selected = null;
  }
  get size() { return this.cards.length; }

  add(card, delay = 0) {
    const v = new CardView(this.scene, this, card);
    v.c.setAlpha(0);
    this.cards.push(v);
    this.scene.time.delayedCall(delay, () => { if (!v.c.active) return; v.dealt = true; v.c.setAlpha(1); sfx.deal(); this.layout(); });
    return v;
  }

  remove(v) {
    this.cards = this.cards.filter((x) => x !== v);
    if (this.selected === v) this.selected = null;
  }

  layout() {
    const n = this.cards.length;
    if (!n) return;
    const spacing = n > 1 ? Math.min(104, 420 / (n - 1)) : 0;
    const x0 = 270 - (spacing * (n - 1)) / 2;
    this.cards.forEach((v, i) => {
      if (!v.dealt) return;
      const mid = i - (n - 1) / 2;
      const sel = this.selected === v;
      const x = x0 + i * spacing;
      const y = HAND_Y + mid * mid * 3.5 + (sel ? -38 : 0);
      v.c.setDepth(sel ? 1300 : 1200 + i);
      v.moveTo(x, y, sel ? 0 : mid * 3.2, sel ? 1.18 : 1);
      v.c.setAlpha(this.selected && !sel ? 0.75 : 1);
    });
  }
}
