import { BootScene } from './boot.js';
import { GameScene } from './game.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 540,
  height: 960,
  backgroundColor: '#0b0712',
  pixelArt: true,
  maxLights: 16,
  render: { maxLights: 16, antialias: false, pixelArt: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 2 },
  scene: [BootScene, GameScene],
};

async function start() {
  try {
    await Promise.all([document.fonts.load("700 16px 'Pixelify'"), document.fonts.load("400 16px 'Pixelify'"), document.fonts.load("700 16px 'Pixelify'", 'ğüşıöçİĞÜŞÖÇ')]);
  } catch (e) { /* fall back to system font */ }
  document.getElementById('loading')?.remove();
  window.game = new Phaser.Game(config);
}
start();
