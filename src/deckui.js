// Deck / graveyard piles, card reward screen and the item bag (Çanta). Installed onto GameScene.prototype.
import { CREATURES, RITUALS, CURSES, RARITIES, ITEMS, BAG_SIZE, itemDesc, itemValue, rollItem, rewardChoices } from './data.js';
import { faceKey } from './hand.js';
import { sfx } from './audio.js';
import { W, H, PANEL_Y, INFO_Y, INFO_H, BTN_Y } from './layout.js';
import { CARD_W, CARD_H } from './cardart.js';

const hexStr = (c) => '#' + c.toString(16).padStart(6, '0');

export function cardLabel(c) {
  if (c.kind === 'creature') return `${CREATURES[c.id].name}  Sv.${c.level || 1} ${RARITIES[c.rarity].name}`;
  if (c.kind === 'ritual') return `${RITUALS[c.id].name}${(c.level || 1) > 1 ? ' II' : ''}  (Ritüel)`;
  return `${CURSES[c.id].name}  (Lanet)`;
}
function cardLabelColor(c) {
  if (c.kind === 'creature') return RARITIES[c.rarity].color;
  return c.kind === 'ritual' ? '#c8b0ff' : '#ff8a80';
}

export function installDeckUI(proto, txt, Button) {
  const T = { title: true };

  // ------------------------------------------------------------ piles
  proto.buildPiles = function () {
    const mk = (x, tint, label, which) => {
      const imgs = [];
      for (let i = 2; i >= 0; i--) imgs.push(this.add.image(x - 2 + i * 2, BTN_Y - 6 - i * 2, 'card_back').setScale(0.3).setDepth(1001).setAlpha(1 - i * 0.2).setTint(tint));
      const top = imgs[imgs.length - 1].setInteractive({ useHandCursor: true });
      top.on('pointerup', () => this.showPile(which));
      const count = txt(this, x, BTN_Y - 8, '0', 22, '#fff2d0').setOrigin(0.5).setDepth(1003);
      txt(this, x, BTN_Y + 40, label, 13, '#b89be8').setOrigin(0.5).setDepth(1002);
      return count;
    };
    this.deckCount = mk(46, 0xffffff, 'Deste', 'deck');
    this.graveCount = mk(W - 46, 0x9a8aa8, 'Mezarlık', 'grave');
  };

  proto.updatePiles = function () {
    if (!this.deckCount) return;
    this.deckCount.setText(String(this.deck.length));
    this.graveCount.setText(String(this.grave.length + this.used.length));
    if (this.bagBtn) this.bagBtn.setText(`ÇANTA ${this.bag.length}/${BAG_SIZE}`);
  };

  proto.overlay = function (title, depth = 1800) {
    const L = [];
    L.push(this.add.rectangle(W / 2, H / 2, W, H, 0x05030a, 0.86).setDepth(depth).setInteractive());
    if (title) L.push(txt(this, W / 2, 96, title, 32, '#d8c8ff', T).setOrigin(0.5).setDepth(depth + 1));
    L.close = () => { L.forEach((o) => (o.c ? o.c.destroy() : o.destroy())); };
    return L;
  };

  proto.showPile = function (which) {
    if (this.pileLayer) return;
    sfx.click();
    const list = which === 'deck' ? this.deck : [...this.grave, ...this.used];
    const L = this.pileLayer = this.overlay(which === 'deck' ? `DESTE (${list.length})` : `MEZARLIK (${list.length})`);
    L.push(txt(this, W / 2, 132, which === 'deck' ? 'Çekilecek kartlar (sıra gizli)' : 'Oynanan kartlar ve ölen yaratıkların kartları. Deste bitince karıştırılıp geri döner (bu turda oynananlar dalga bitince katılır).', 15, '#b8a8d8', { align: 'center', wordWrap: { width: 460 } }).setOrigin(0.5, 0).setDepth(1801));
    const groups = new Map();
    for (const c of list) {
      const k = cardLabel(c);
      if (!groups.has(k)) groups.set(k, { c, n: 0 });
      groups.get(k).n++;
    }
    const rows = [...groups.values()].sort((a, b) => (a.c.kind > b.c.kind ? 1 : a.c.kind < b.c.kind ? -1 : b.c.rarity - a.c.rarity));
    const top = 186, rowH = Math.min(40, (H - 300) / Math.max(1, rows.length));
    if (!rows.length) L.push(txt(this, W / 2, 300, 'Boş', 22, '#9b8bc8').setOrigin(0.5).setDepth(1801));
    rows.forEach((r, i) => {
      const y = top + i * rowH;
      L.push(txt(this, 40, y, `${r.n}×`, 19, '#fff2d0').setDepth(1801));
      L.push(txt(this, 90, y, cardLabel(r.c), 18, cardLabelColor(r.c)).setDepth(1801));
    });
    const b = new Button(this, W / 2, H - 70, 260, 62, 'KAPAT', 0x4a4258, () => { L.close(); this.pileLayer = null; }).setDepth(1802);
    L.push(b);
  };

  // ------------------------------------------------------------ card reward after each wave
  proto.showCardReward = function (done) {
    this.state = 'reward';
    this.closeBag();
    this.select(null);
    const L = this.overlay('BİR KART SEÇ', 1700);
    L.push(txt(this, W / 2, 132, 'Seçtiğin kart destene eklenir', 18, '#ddd0f4').setOrigin(0.5).setDepth(1701));
    const unlocked = Object.keys(this.unlockedRituals);
    const choices = rewardChoices(this.wave, unlocked, this.meta.luck + this.mods.luck);
    const s = 0.78, cw = CARD_W * s, gap = 10;
    let picked = false;
    const finish = () => { L.close(); done(); };
    choices.forEach((card, i) => {
      const x = W / 2 + (i - 1) * (cw + gap), y = 330;
      const c = this.add.container(x, y + 40).setDepth(1702).setAlpha(0);
      const col = card.kind === 'ritual' ? 0x9b6bff : RARITIES[card.rarity].hex;
      const glow = this.add.image(0, 0, 'card_glow').setScale(s * 0.5 * 2).setTint(col).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
      const face = this.add.image(0, 0, faceKey(this, card)).setScale(s);
      c.add([glow, face]); c.setSize(CARD_W * s, CARD_H * s).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: c, y, alpha: 1, delay: 150 + i * 120, duration: 350, ease: 'Back.easeOut' });
      this.tweens.add({ targets: glow, alpha: 0.25, duration: 900, yoyo: true, repeat: -1 });
      const desc = card.kind === 'creature' ? CREATURES[card.id].desc : this.ritualText(card);
      const d = txt(this, x, y + CARD_H * s / 2 + 12, desc, 14, '#ddd0f4', { align: 'center', wordWrap: { width: cw - 4 }, strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(1702);
      L.push(c, d);
      c.on('pointerdown', () => c.setScale(0.95));
      c.on('pointerout', () => c.setScale(1));
      c.on('pointerup', () => {
        if (picked) return; picked = true;
        sfx.epic();
        this.fxUI.setParticleTint(col); this.fxUI.explode(36, c.x, c.y);
        this.deck.splice((Math.random() * (this.deck.length + 1)) | 0, 0, card);
        L.forEach((o) => { if (o !== c && o.setAlpha) this.tweens.add({ targets: o.c || o, alpha: 0, duration: 250 }); });
        this.tweens.add({ targets: c, x: 46, y: BTN_Y - 6, scale: 0.3, duration: 500, ease: 'Cubic.easeIn', onComplete: () => { this.updatePiles(); finish(); } });
      });
    });
    const skip = new Button(this, W / 2, H - 80, 280, 62, 'GEÇ', 0x4a4258, () => {
      if (picked) return; picked = true; this.addSouls(10); finish();
    }).setDepth(1702);
    skip.set('GEÇ', '+10 ruh');
    L.push(skip);
  };

  // ------------------------------------------------------------ item bag
  proto.buildBagButton = function () {
    const x = W - 76, y = INFO_Y + 22;
    const g = this.add.graphics().setDepth(1003);
    g.fillStyle(0x05030a, 1).fillRoundedRect(x - 60, y - 17, 120, 34, 9);
    g.fillStyle(0x6a4a2a, 1).fillRoundedRect(x - 58, y - 15, 116, 30, 8);
    g.fillStyle(0xffffff, 0.15).fillRoundedRect(x - 56, y - 13, 112, 12, 6);
    this.bagBtn = txt(this, x, y, `ÇANTA 0/${BAG_SIZE}`, 15, '#fff2d0', T).setOrigin(0.5).setDepth(1004);
    const hit = this.add.zone(x, y, 120, 36).setInteractive({ useHandCursor: true }).setDepth(1005);
    hit.on('pointerup', () => this.openBag());
    this.bagHit = hit;
  };

  proto.dropItem = function (x, y, boss) {
    const item = rollItem(this.meta.luck + this.mods.luck, boss);
    const I = ITEMS[item.id], col = RARITIES[item.rarity].hex;
    const icon = this.add.image(x, y, 'item_' + item.id).setScale(0.4).setDepth(1420);
    const ring = this.add.image(x, y, 'soft').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setScale(1.4).setDepth(1419);
    this.floatText(x, y - 30, I.name, RARITIES[item.rarity].color, 16);
    sfx.rare();
    this.tweens.add({ targets: [icon, ring], y: y - 30, duration: 400, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: [icon, ring], x: W - 76, y: INFO_Y + 22, scale: 0.2, delay: 700, duration: 600, ease: 'Cubic.easeIn',
      onComplete: () => {
        icon.destroy(); ring.destroy();
        if (this.bag.length >= BAG_SIZE) { const v = itemValue(item); this.addSouls(v); this.floatText(W - 76, INFO_Y + 50, `Çanta dolu: +${v} ruh`, '#9dff8a', 14); }
        else this.bag.push(item);
        this.updatePiles();
      },
    });
  };

  proto.returnItem = function (item) {
    if (!item) return;
    if (this.bag.length >= BAG_SIZE) { this.addSouls(itemValue(item)); return; }
    this.bag.push(item);
    this.updatePiles();
  };

  proto.equipItem = function (item, u) {
    const I = ITEMS[item.id];
    if (I.necro && !u.isNecro) { sfx.error(); this.floatText(u.x, u.y - 100, 'Sadece Necromancer takabilir', '#ff8a80', 15); return false; }
    if (!I.necro && u.isNecro) { sfx.error(); this.floatText(u.x, u.y - 100, 'Bu eşya yaratıklar için', '#ff8a80', 15); return false; }
    this.bag = this.bag.filter((b) => b !== item);
    if (u.item) this.bag.push(u.item);
    u.setItem(item);
    sfx.epic();
    this.fxSwirl.setParticleTint(RARITIES[item.rarity].hex); this.fxSwirl.explode(20, u.x, u.y - 40);
    this.floatText(u.x, u.y - 104, I.name, RARITIES[item.rarity].color, 16);
    this.updatePiles();
    return true;
  };

  proto.unequipItem = function (u) {
    if (!u.item) return;
    if (this.bag.length >= BAG_SIZE) { sfx.error(); this.floatText(u.x, u.y - 100, 'Çanta dolu', '#ff8a80', 15); return; }
    this.bag.push(u.item); u.setItem(null);
    sfx.click(); this.updatePiles();
  };

  proto.openBag = function () {
    if (this.bagLayer || this.state === 'over') return;
    sfx.click();
    this.select(null);
    const L = this.bagLayer = [];
    const top = PANEL_Y + 2;
    const bg = this.add.rectangle(W / 2, (top + H) / 2, W, H - top, 0x0c0814, 0.97).setDepth(1760).setInteractive();
    const border = this.add.graphics().setDepth(1761);
    border.fillStyle(0x9b7bd8, 0.8).fillRect(0, top, W, 3);
    L.push(bg, border);
    L.push(txt(this, 20, top + 12, 'ÇANTA', 26, '#ffd36a', T).setDepth(1762));
    const info = txt(this, 20, top + 48, this.state === 'prep'
      ? 'Eşyayı yukarı, bir yaratığın (ya da Necromancer\'ın) üstüne sürükle. Dokunarak ayrıntısını gör.'
      : 'Eşyalar yalnızca hazırlık evresinde takılabilir.', 15, '#ddd0f4', { wordWrap: { width: W - 40 }, strokeThickness: 2 }).setDepth(1762);
    L.push(info);
    const cols = 4, size = 112, gap = 8, gx = (W - (cols * size + (cols - 1) * gap)) / 2, gy = top + 100;
    let selected = null;
    const sellBtn = new Button(this, W / 2 - 108, H - 56, 196, 60, 'SAT', 0x8a2a3a, () => {
      if (!selected) return;
      const v = itemValue(selected);
      this.bag = this.bag.filter((b) => b !== selected);
      this.addSouls(v); sfx.soul();
      this.closeBag(); this.openBag();
    }).setDepth(1765);
    sellBtn.show(false);
    const closeBtn = new Button(this, W / 2 + 108, H - 56, 196, 60, 'KAPAT', 0x4a4258, () => this.closeBag()).setDepth(1765);
    L.push(sellBtn, closeBtn);
    if (!this.bag.length) L.push(txt(this, W / 2, gy + 80, 'Çanta boş. Düşmanlardan eşya düşer;\nboss her zaman eşya bırakır.', 18, '#9b8bc8', { align: 'center' }).setOrigin(0.5).setDepth(1762));
    this.bag.forEach((item, i) => {
      const x = gx + (i % cols) * (size + gap) + size / 2, y = gy + Math.floor(i / cols) * (size + gap) + size / 2;
      const col = RARITIES[item.rarity].hex;
      const c = this.add.container(x, y).setDepth(1763);
      const g = this.add.graphics();
      g.fillStyle(0x05030a, 1).fillRoundedRect(-size / 2, -size / 2, size, size, 10);
      g.fillStyle(Phaser.Display.Color.ValueToColor(col).darken(70).color, 1).fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size - 6, size - 6, 8);
      g.lineStyle(3, col, 1).strokeRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, 9);
      const icon = this.add.image(0, -12, 'item_' + item.id).setScale(0.8);
      const name = txt(this, 0, size / 2 - 22, ITEMS[item.id].name, 13, RARITIES[item.rarity].color, { align: 'center', wordWrap: { width: size - 8 }, strokeThickness: 2 }).setOrigin(0.5);
      c.add([g, icon, name]);
      c.setSize(size, size).setInteractive({ useHandCursor: true, draggable: this.state === 'prep' });
      c.item = item; c.homeX = x; c.homeY = y;
      L.push(c);
      c.on('pointerup', () => {
        if (c.wasDragged) { c.wasDragged = false; return; }
        selected = item;
        info.setText(`${ITEMS[item.id].name} (${RARITIES[item.rarity].name}): ${itemDesc(item)}${ITEMS[item.id].necro ? '' : ''}`).setColor(RARITIES[item.rarity].color);
        sellBtn.set('SAT', `+${itemValue(item)} ruh`).show(true);
      });
      c.on('dragstart', () => { c.setDepth(1790); bg.setAlpha(0.35); border.setAlpha(0.3); L.forEach((o) => { if (o !== c && o !== bg && o.setAlpha) (o.c || o).setAlpha?.(0.25); }); });
      c.on('drag', (p, dx, dy) => {
        c.x = dx; c.y = dy; c.setScale(dy < PANEL_Y ? 0.6 : 1);
        const t = this.itemTarget(dx, dy + 40);
        this.highlightUnit(t, 0xffd36a);
      });
      c.on('dragend', () => {
        c.wasDragged = true;
        this.highlightUnit(null);
        const t = c.y < PANEL_Y ? this.itemTarget(c.x, c.y + 40) : null;
        if (t && this.equipItem(item, t)) { this.closeBag(); this.showUnitInfo(t); return; }
        c.x = c.homeX; c.y = c.homeY; c.setScale(1).setDepth(1763);
        bg.setAlpha(1); border.setAlpha(1); L.forEach((o) => (o.c || o).setAlpha?.(1));
      });
    });
  };

  proto.itemTarget = function (x, y) {
    const n = this.necro;
    if (n && !n.dead && Math.hypot(n.x - x, (n.y - y) * 1.2) < 50) return n;
    return this.unitAt(x, y);
  };

  proto.closeBag = function () {
    if (!this.bagLayer) return;
    this.bagLayer.forEach((o) => (o.c ? o.c.destroy() : o.destroy()));
    this.bagLayer = null;
    this.highlightUnit(null);
  };

  proto.itemLine = function (u) {
    if (!u.item) return '';
    return `  •  Eşya: ${ITEMS[u.item.id].name} (${itemDesc(u.item)})`;
  };
  proto.hexStr = hexStr;
}
