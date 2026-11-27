// Generates every texture procedurally, then starts the game.
import { buildFrames, SPRITE_KEYS } from './art.js';
import { registerSheet, lumNormal } from './pixel.js';
import { paintBackground, paintPanel } from './background.js';
import { H, PANEL_Y } from './layout.js';
import { drawItemIcon } from './cardart.js';
import { ITEMS } from './data.js';
import { drawCardBack, drawCardGlow, drawSheenFrames, CARD_W, CARD_H } from './cardart.js';

export const PORTRAITS = {};
const ENEMY_KEYS = ['knight', 'crusader', 'priest', 'inquisitor'];
const CREATURE_KEYS = ['guard', 'golem', 'butcher', 'wolf', 'archer', 'banshee'];
const HYBRID_KEYS = ['cavalry', 'giant', 'screamer', 'hound', 'catapult'];

function canvas(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), c); return c; }

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const T = this.textures;
    // characters
    for (const key of SPRITE_KEYS) {
      const frames = buildFrames(key);
      const enemy = ENEMY_KEYS.includes(key);
      const { color } = registerSheet(this, enemy ? key + '_L' : key, frames, { mirror: enemy });
      PORTRAITS[key] = enemy ? null : color;
      if (CREATURE_KEYS.includes(key)) registerSheet(this, key + '_L', frames, { mirror: true });
    }
    for (const key of SPRITE_KEYS) {
      for (const suffix of ['', '_L']) {
        const k = key + suffix;
        if (!T.exists(k)) continue;
        const fr = (a) => a.map((f) => ({ key: k, frame: f }));
        this.anims.create({ key: k + '_idle', frames: fr([0, 1, 2, 3]), frameRate: 5, repeat: -1 });
        this.anims.create({ key: k + '_walk', frames: fr([4, 5, 6, 7]), frameRate: 9, repeat: -1 });
        this.anims.create({ key: k + '_attack', frames: fr([8, 9, 10, 11]), frameRate: 12, repeat: 0 });
      }
    }
    // background
    const bg = paintBackground();
    const bgTex = T.addCanvas('bg', bg.color);
    bgTex.setDataSource(lumNormal(bg.color, 3));
    T.addCanvas('bg_g', bg.glow);
    T.addCanvas('panel', paintPanel(540, H - PANEL_Y));

    // generic particle / fx textures
    T.addCanvas('px', canvas(4, 4, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 4, 4); }));
    T.addCanvas('soft', canvas(32, 32, (c) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 32); }));
    T.addCanvas('big_soft', canvas(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); }));
    T.addCanvas('shadow', canvas(64, 20, (c) => { const g = c.createRadialGradient(32, 10, 0, 32, 10, 32); g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.setTransform(1, 0, 0, 0.32, 0, 6.8); c.fillStyle = g; c.beginPath(); c.arc(32, 10, 32, 0, Math.PI * 2); c.fill(); }));
    T.addCanvas('fog', canvas(256, 96, (c) => {
      for (let i = 0; i < 14; i++) { const x = 30 + Math.random() * 196, y = 30 + Math.random() * 36, r = 20 + Math.random() * 26; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(200,190,230,0.35)'); g.addColorStop(1, 'rgba(200,190,230,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 96); }
    }));
    T.addCanvas('ring', canvas(128, 128, (c) => {
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.arc(64, 64, 50, 0, Math.PI * 2); c.stroke();
      c.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5; const x = 64 + Math.cos(a) * 50, y = 64 + Math.sin(a) * 50; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      c.fillStyle = '#fff'; c.font = "12px 'Pixelify', monospace"; c.textAlign = 'center'; c.textBaseline = 'middle';
      const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈ'; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; c.fillText(runes[i], 64 + Math.cos(a) * 55, 64 + Math.sin(a) * 55); }
    }));
    T.addCanvas('aura', canvas(64, 24, (c) => { c.strokeStyle = '#fff'; c.lineWidth = 2; c.globalAlpha = 0.9; c.beginPath(); c.ellipse(32, 12, 28, 9, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 0.35; c.lineWidth = 5; c.beginPath(); c.ellipse(32, 12, 26, 8, 0, 0, Math.PI * 2); c.stroke(); }));
    T.addCanvas('rays', canvas(256, 256, (c) => {
      c.translate(128, 128);
      for (let i = 0; i < 16; i++) { c.rotate(Math.PI / 8); const g = c.createLinearGradient(0, 0, 0, -128); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-3, 0); c.lineTo(-14, -128); c.lineTo(14, -128); c.lineTo(3, 0); c.fill(); }
    }));
    T.addCanvas('beam', canvas(16, 64, (c) => { const g = c.createLinearGradient(0, 0, 16, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 16, 64); }));
    // projectiles (pixel art)
    T.addCanvas('arrow', canvas(14, 5, (c) => { c.fillStyle = '#d6ccb0'; c.fillRect(1, 2, 10, 1); c.fillStyle = '#f7f1de'; c.fillRect(10, 1, 2, 3); c.fillRect(12, 2, 2, 1); c.fillStyle = '#6ff7ff'; c.fillRect(0, 1, 2, 1); c.fillRect(0, 3, 2, 1); }));
    T.addCanvas('boulder', canvas(10, 10, (c) => { c.fillStyle = '#5e5444'; c.beginPath(); c.arc(5, 5, 4.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#d6ccb0'; c.beginPath(); c.arc(4, 4, 3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f7f1de'; c.fillRect(3, 3, 1, 1); }));
    T.addCanvas('orb', canvas(12, 12, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(6, 6, 4, 0, Math.PI * 2); c.fill(); c.globalAlpha = 0.5; c.beginPath(); c.arc(6, 6, 6, 0, Math.PI * 2); c.fill(); }));
    T.addCanvas('soul_icon', canvas(20, 22, (c) => {
      c.fillStyle = '#7dff6a'; c.beginPath(); c.arc(10, 14, 7, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(4, 12); c.quadraticCurveTo(7, 2, 12, 0); c.quadraticCurveTo(10, 7, 16, 11); c.fill();
      c.fillStyle = '#0b0712'; c.fillRect(6, 12, 3, 3); c.fillRect(11, 12, 3, 3);
    }));
    T.addCanvas('skull_icon', canvas(18, 18, (c) => { c.fillStyle = '#e8dfc6'; c.beginPath(); c.arc(9, 8, 7, 0, Math.PI * 2); c.fill(); c.fillRect(5, 12, 8, 5); c.fillStyle = '#0b0712'; c.fillRect(5, 7, 3, 3); c.fillRect(10, 7, 3, 3); c.fillRect(7, 14, 1, 3); c.fillRect(10, 14, 1, 3); }));

    // cards
    const back = T.addCanvas('card_back', drawCardBack()); back.setFilter(Phaser.Textures.FilterMode.LINEAR);
    T.addCanvas('card_glow', drawCardGlow()).setFilter(Phaser.Textures.FilterMode.LINEAR);
    const sheen = T.addCanvas('card_sheen', drawSheenFrames(16)); sheen.setFilter(Phaser.Textures.FilterMode.LINEAR);
    for (let k = 0; k < 16; k++) sheen.add(k, 0, k * CARD_W, 0, CARD_W, CARD_H);
    this.anims.create({ key: 'sheen', frames: Array.from({ length: 16 }, (_, k) => ({ key: 'card_sheen', frame: k })), frameRate: 22, repeat: -1, repeatDelay: 1800 });
    for (const k of ['rays', 'big_soft', 'soft', 'fog', 'ring']) T.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);

    for (const id of Object.keys(ITEMS)) T.addCanvas('item_' + id, drawItemIcon(id)).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.scene.start('Menu');
  }
}
