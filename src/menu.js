// Main menu: play, permanent upgrades (Kara Ruh), Grimoire of hybrids, high scores, settings / cloud save.
import { txt, Button } from './game.js';
import { W, H, BF, PANEL_Y } from './layout.js';
import { ZOOM, setLowRes } from './fonts.js';
import { SS } from './pixel.js';
import { META, CREATURES, RECIPES } from './data.js';
import { save, persist, metaLevel, cloud, onCloudChange, getToken, setToken, pullCloud, pushCloud } from './save.js';
import { sfx, unlockAudio, toggleMute, isMuted } from './audio.js';

const T = { title: true };

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.setZoom(ZOOM).centerOn(W / 2, H / 2);
    this.lightsOn = this.sys.renderer.type === Phaser.WEBGL;
    const bg = this.add.image(0, -BF, 'bg').setOrigin(0);
    if (this.lightsOn) {
      bg.setPipeline('Light2D');
      this.lights.enable().setAmbientColor(0x3a3450);
      this.lights.addLight(420, 172 - BF, 700, 0x9aa8ff, 0.8);
      this.staff = this.lights.addLight(282, 330 - BF, 300, 0x6dff6a, 2);
    }
    this.add.image(0, -BF, 'bg_g').setOrigin(0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
    this.add.image(0, PANEL_Y, 'panel').setOrigin(0);
    this.add.particles(0, 0, 'soft', {
      x: { min: 0, max: W }, y: { min: 250 - BF, max: 560 - BF }, lifespan: 5000, speedY: { min: -18, max: -6 }, speedX: { min: -6, max: 6 },
      scale: { start: 0.22, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0x7dff6a, 0x9b7bd8, 0x6ff7ff], blendMode: 'ADD', frequency: 140,
    });
    const necro = this.add.sprite(270, 520 - BF, 'necro', 0).setOrigin(0.5, 44 / 48).setScale(4 / SS).play('necro_idle');
    if (this.lightsOn) necro.setPipeline('Light2D');
    this.necroGlow = this.add.sprite(270, 520 - BF, 'necro_g', 0).setOrigin(0.5, 44 / 48).setScale(4 / SS).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
    this.necro = necro;
    this.add.image(270, 522 - BF, 'shadow').setScale(2.4, 2).setAlpha(0.8).setDepth(-1);

    this.layer = [];
    this.input.once('pointerdown', () => unlockAudio());
    this.unsub = onCloudChange(() => { if (this.screen === 'settings' || this.screen === 'main') this.show(this.screen); });
    this.events.once('shutdown', () => this.unsub && this.unsub());
    this.show('main');
    if (getToken()) pullCloud().then(() => { if (this.scene.isActive()) this.show(this.screen); });
  }

  update(time) {
    this.necroGlow.setFrame(this.necro.frame.name);
    if (this.staff) this.staff.intensity = 1.8 + Math.sin(time / 350) * 0.4;
  }

  clear() { this.layer.forEach((o) => (o.destroy ? o.destroy() : o.c.destroy())); this.layer = []; }
  add_(o) { this.layer.push(o); return o; }

  title(text, y = 110, size = 40, color = '#d8c8ff') {
    return this.add_(txt(this, W / 2, y, text, size, color, T).setOrigin(0.5).setDepth(10));
  }
  btn(x, y, w, h, label, color, fn, sub) {
    const b = new Button(this, x, y, w, h, label, color, fn).setDepth(20);
    if (sub) b.set(label, sub);
    return this.add_(b);
  }
  backBtn() { return this.btn(W / 2, H - 60, 260, 62, 'GERİ', 0x4a4258, () => this.show('main')); }
  dim(y0 = 0) { return this.add_(this.add.rectangle(W / 2, (H + y0) / 2, W, H - y0, 0x05030a, 0.78).setDepth(5)); }

  show(screen) {
    this.screen = screen;
    this.clear();
    this[screen]();
  }

  // ------------------------------------------------------------ main
  main() {
    const t = this.title('NECROMANCER', 120, 52, '#c8b0ff');
    t.setShadow(0, 0, '#7d5bd8', 18, true, true);
    this.add_(txt(this, W / 2, 168, 'Ölülerin Efendisi', 20, '#9dff8a').setOrigin(0.5).setDepth(10));
    const y0 = PANEL_Y + 70, gap = Math.min(84, (H - 150 - y0) / 4.5);
    this.btn(W / 2, y0, 320, 72, 'OYNA', 0x2f8a4a, () => { this.cameras.main.fadeOut(300, 5, 3, 10); this.time.delayedCall(320, () => this.scene.start('Game')); });
    this.btn(W / 2, y0 + gap * 1.15, 320, 62, 'YÜKSELTMELER', 0x5a3a9a, () => this.show('upgrades'), `${save.darkSouls} Kara Ruh`);
    this.btn(W / 2 - 82, y0 + gap * 2.1, 156, 60, 'GRİMUAR', 0x6a3a7a, () => this.show('grimoire'));
    this.btn(W / 2 + 82, y0 + gap * 2.1, 156, 60, 'SKORLAR', 0x6a4a2a, () => this.show('scores'));
    this.btn(W / 2, y0 + gap * 3.05, 320, 60, 'AYARLAR', 0x3a4a5a, () => this.show('settings'));
    const cl = getToken() ? ({ ok: 'Bulut: eşitlendi', sync: 'Bulut: eşitleniyor...', error: 'Bulut hatası: ' + cloud.message, off: 'Bulut: bağlı' }[cloud.status] || '') : 'Kayıt: bu cihazda';
    this.add_(txt(this, W / 2, H - 52, `En iyi skor: ${save.best}  •  En uzak dalga: ${save.bestWave || 0}`, 17, '#ddd0f4').setOrigin(0.5).setDepth(10));
    this.add_(txt(this, W / 2, H - 26, cl, 14, cloud.status === 'error' ? '#ff8a80' : '#9b8bc8').setOrigin(0.5).setDepth(10));
  }

  // ------------------------------------------------------------ upgrades
  upgrades() {
    this.dim();
    this.title('YÜKSELTMELER', 96, 34);
    const bal = this.add_(txt(this, W / 2, 140, `${save.darkSouls} Kara Ruh`, 24, '#c88aff', T).setOrigin(0.5).setDepth(10));
    const keys = Object.keys(META);
    const top = 178, rowH = Math.min(104, (H - 140 - top) / keys.length);
    keys.forEach((k, i) => {
      const M = META[k], lvl = metaLevel(k), y = top + i * rowH + rowH / 2;
      const g = this.add_(this.add.graphics().setDepth(8));
      g.fillStyle(0x140c20, 0.95).fillRoundedRect(16, y - rowH / 2 + 4, W - 32, rowH - 8, 10);
      g.lineStyle(2, 0x3a2a50, 1).strokeRoundedRect(16, y - rowH / 2 + 4, W - 32, rowH - 8, 10);
      this.add_(txt(this, 32, y - rowH / 2 + 12, M.name, 19, '#fff2d0', T).setDepth(10));
      this.add_(txt(this, 32, y - rowH / 2 + 40, M.desc, 15, '#ddd0f4').setDepth(10));
      for (let p = 0; p < M.max; p++) {
        g.fillStyle(0x05030a, 1).fillRect(32 + p * 20, y + rowH / 2 - 26, 16, 10);
        g.fillStyle(p < lvl ? 0xc88aff : 0x3a3346, 1).fillRect(34 + p * 20, y + rowH / 2 - 24, 12, 6);
      }
      if (lvl >= M.max) this.add_(txt(this, W - 92, y, 'TAMAM', 18, '#9dff8a', T).setOrigin(0.5).setDepth(10));
      else {
        const cost = M.cost(lvl);
        const b = this.btn(W - 92, y, 128, Math.min(56, rowH - 22), `${cost}`, 0x5a3a9a, () => {
          if (save.darkSouls < cost) return;
          save.darkSouls -= cost; save.meta[k] = lvl + 1; persist();
          sfx.epic(); this.show('upgrades');
        }, 'Kara Ruh');
        b.setEnabled(save.darkSouls >= cost);
      }
    });
    bal.setDepth(10);
    this.backBtn();
  }

  // ------------------------------------------------------------ grimoire
  grimoire() {
    this.dim();
    this.title('GRİMUAR', 96, 36);
    this.add_(txt(this, W / 2, 138, 'Kemik Füzyonu ile keşfedilen hibrit yaratıklar', 16, '#ddd0f4').setOrigin(0.5).setDepth(10));
    const list = Object.entries(RECIPES);
    const top = 170, rowH = Math.min(132, (H - 140 - top) / list.length);
    list.forEach(([pair, key], i) => {
      const y = top + i * rowH + rowH / 2, found = save.grimoire.includes(key), C = CREATURES[key];
      const g = this.add_(this.add.graphics().setDepth(8));
      g.fillStyle(found ? 0x1c1030 : 0x100a18, 0.95).fillRoundedRect(16, y - rowH / 2 + 4, W - 32, rowH - 8, 10);
      g.lineStyle(2, found ? 0x9b6bff : 0x2a2036, 1).strokeRoundedRect(16, y - rowH / 2 + 4, W - 32, rowH - 8, 10);
      const spr = this.add_(this.add.sprite(76, y + rowH / 2 - 14, key, 0).setOrigin(0.5, 44 / 48).setScale(Math.min(2, (rowH - 16) / 44) / SS).setDepth(10));
      if (found) { spr.play(key + '_idle'); } else spr.setTintFill(0x05030a).setAlpha(0.85);
      const [a, b] = pair.split('|');
      this.add_(txt(this, 140, y - 28, found ? C.name : '??? ', 21, found ? '#e8a8ff' : '#6a5a7a', T).setDepth(10));
      this.add_(txt(this, 140, y + 2, found ? `${CREATURES[a].name} + ${CREATURES[b].name}` : 'Gizli tarif', 15, found ? '#fff2d0' : '#6a5a7a').setDepth(10));
      this.add_(txt(this, 140, y + 24, found ? C.desc : 'Farklı türden iki yaratığı füzyonla birleştir.', 13, '#b8a8d8', { wordWrap: { width: W - 170 }, strokeThickness: 2 }).setDepth(10));
    });
    this.add_(txt(this, W / 2, H - 112, `${save.grimoire.length}/${list.length} keşfedildi`, 18, '#c88aff').setOrigin(0.5).setDepth(10));
    this.backBtn();
  }

  // ------------------------------------------------------------ scores
  scores() {
    this.dim();
    this.title('SKORLAR', 96, 36);
    const rows = save.scores.slice(0, 10);
    if (!rows.length) this.add_(txt(this, W / 2, 300, 'Henüz kayıtlı oyun yok.\nToprağın altında ordunu kur!', 20, '#ddd0f4', { align: 'center' }).setOrigin(0.5).setDepth(10));
    const top = 150, rowH = Math.min(62, (H - 160 - top) / 10);
    rows.forEach((r, i) => {
      const y = top + i * rowH + rowH / 2;
      const g = this.add_(this.add.graphics().setDepth(8));
      g.fillStyle(i === 0 ? 0x2a1c08 : 0x140c20, 0.95).fillRoundedRect(20, y - rowH / 2 + 3, W - 40, rowH - 6, 8);
      const col = ['#ffd36a', '#d8d8e8', '#d89a5a'][i] || '#ddd0f4';
      const d = new Date(r.date);
      this.add_(txt(this, 40, y, `${i + 1}.`, 20, col, T).setOrigin(0, 0.5).setDepth(10));
      this.add_(txt(this, 90, y, String(r.score), 22, col).setOrigin(0, 0.5).setDepth(10));
      this.add_(txt(this, 250, y, `Dalga ${r.wave}`, 17, '#c8b8e8').setOrigin(0, 0.5).setDepth(10));
      this.add_(txt(this, W - 36, y, `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`, 15, '#9b8bc8').setOrigin(1, 0.5).setDepth(10));
    });
    this.backBtn();
  }

  // ------------------------------------------------------------ settings + cloud save
  settings() {
    this.dim();
    this.title('AYARLAR', 96, 36);
    const snd = this.btn(W / 2 - 128, 180, 240, 60, isMuted() ? 'SES: KAPALI' : 'SES: AÇIK', 0x3a4a5a, () => { toggleMute(); this.show('settings'); });
    snd.setColor(isMuted() ? 0x4a4258 : 0x2f6a8a);
    this.btn(W / 2 + 128, 180, 240, 60, ZOOM === 2 ? 'GRAFİK: YÜKSEK' : 'GRAFİK: DÜŞÜK', 0x3a4a5a, () => { setLowRes(ZOOM === 2); window.location.reload(); }, 'takılırsa düşür');
    const g = this.add_(this.add.graphics().setDepth(8));
    g.fillStyle(0x140c20, 0.95).fillRoundedRect(16, 236, W - 32, 330, 12);
    g.lineStyle(2, 0x3a2a50, 1).strokeRoundedRect(16, 236, W - 32, 330, 12);
    this.add_(txt(this, 32, 248, 'Bulut Kaydı (GitHub Gist)', 21, '#fff2d0', T).setDepth(10));
    const has = !!getToken();
    const status = !has ? 'Bağlı değil — kayıtlar yalnızca bu cihazda.'
      : cloud.status === 'error' ? 'Hata: ' + cloud.message
        : cloud.status === 'sync' ? 'Eşitleniyor...'
          : cloud.status === 'ok' ? 'Bağlı ve eşitlendi' + (save.gistId ? ` (gist ${save.gistId.slice(0, 7)}…)` : '') : 'Bağlı';
    this.add_(txt(this, 32, 284, status, 16, cloud.status === 'error' ? '#ff8a80' : has ? '#9dff8a' : '#ddd0f4', { wordWrap: { width: W - 64 } }).setDepth(10));
    this.add_(txt(this, 32, 318,
      'Kayıtların kendi GitHub hesabındaki gizli bir gist\'te saklanır; başka cihazdan aynı token ile devam edebilirsin.\n\nToken oluşturma: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → yalnızca "gist" iznini seç.\n\nToken sadece bu cihazda saklanır ve yalnızca api.github.com\'a gönderilir.',
      14, '#c8b8e8', { wordWrap: { width: W - 64 }, strokeThickness: 2 }).setDepth(10));
    if (!has) {
      this.btn(W / 2, 616, 320, 60, 'TOKEN GİR', 0x2f8a4a, () => {
        const t = window.prompt('GitHub token (gist izinli):', '');
        if (t && t.trim()) { setToken(t.trim()); this.show('settings'); pullCloud().then(() => this.show('settings')); }
      });
    } else {
      this.btn(W / 2 - 82, 616, 156, 60, 'EŞİTLE', 0x2f8a4a, () => { pullCloud().then(() => this.show('settings')); });
      this.btn(W / 2 + 82, 616, 156, 60, 'ÇIKIŞ', 0x8a2a3a, () => { if (window.confirm('Bulut bağlantısı kesilsin mi? (Gist silinmez)')) { setToken(''); this.show('settings'); } }, 'bağlantıyı kes');
      this.btn(W / 2, 690, 320, 56, 'ŞİMDİ YEDEKLE', 0x5a3a9a, () => { pushCloud().then(() => this.show('settings')); });
    }
    this.backBtn();
  }
}
