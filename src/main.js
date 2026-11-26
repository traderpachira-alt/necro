import { BootScene } from './boot.js';
import { GameScene } from './game.js';
import { ZOOM } from './fonts.js';
import { W, H } from './layout.js';
import { MenuScene } from './menu.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W * ZOOM,
  height: H * ZOOM,
  backgroundColor: '#0b0712',
  pixelArt: true,
  maxLights: 10,
  render: { maxLights: 10, antialias: false, pixelArt: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  scene: [BootScene, MenuScene, GameScene],
};

async function start() {
  try {
    const T = 'ğüşıöçİĞÜŞÖÇ Aa1';
    await Promise.all(["700 16px 'Cinzel'", "900 16px 'Cinzel'", "700 16px 'Nunito'", "800 16px 'Nunito'"].map((f) => document.fonts.load(f, T)));
  } catch (e) { /* fall back to system font */ }
  document.getElementById('loading')?.remove();
  window.game = new Phaser.Game(config);
}
start();
