// Ruh Pazarı: the soul sink hub. Tabs: Dükkân (shop stock), Hizmetler (draw / summon / remove / level), Ordu (run-long powers).
import { CREATURES, RITUALS, RARITIES, ITEMS, BASE_CREATURES, BAG_SIZE, MAX_LEVEL, CONFIG, LOCKED_RITUALS, BASE_RITUALS, makeCard, rollRarity, rollItem, itemDesc } from './data.js';
import { faceKey } from './hand.js';
import { cardLabel } from './deckui.js';
import { sfx } from './audio.js';
import { W, H, PANEL_Y } from './layout.js';
import { CARD_W, CARD_H } from './cardart.js';

const D = 1770;
const ARMY = {
  hp: { name: 'Kemik Bedeni', desc: 'Tüm yaratıklar +%6 can', step: 0.06, base: 30, max: 10 },
  atk: { name: 'Ölü Gücü', desc: 'Tüm yaratıklar +%6 hasar', step: 0.06, base: 30, max: 10 },
  magic: { name: 'Kara Büyü', desc: 'Necromancer +%15 hasar', step: 0.15, base: 25, max: 8 },
  slots: { name: 'Mezar Genişliği', desc: '+1 yaratık yuvası (en fazla 8)', step: 1, base: 90, max: 2 },
};

export function installShop(proto, txt, Button) {
  const T = { title: true };

  proto.restockShop = function () {
    const luck = this.meta.luck + this.mods.luck + Math.min(4, this.wave * 0.25);
    const pool = [...BASE_RITUALS, ...Object.keys(LOCKED_RITUALS).filter((k) => this.unlockedRituals[k])];
    this.stock = [
      ...[0, 1, 2].map(() => ({ type: 'card', card: makeCard('creature', BASE_CREATURES[(Math.random() * BASE_CREATURES.length) | 0], rollRarity(luck)) })),
      { type: 'card', card: makeCard('ritual', pool[(Math.random() * pool.length) | 0]) },
      { type: 'item', item: rollItem(luck) },
    ];
    this.shopRerolls = 0; this.summons = 0;
    this.removals = this.removals || 0;
  };

  proto.priceOf = function (o) {
    const w = this.wave;
    if (o.type === 'item') return 30 + o.item.rarity * 15 + w * 2;
    if (o.card.kind === 'ritual') return 18 + w;
    return 18 + o.card.rarity * 18 + Math.round(w * 1.5);
  };
  proto.rerollPrice = function () { return 8 + this.shopRerolls * 6; };
  proto.summonPrice = function () { return 30 + this.wave * 2 + this.summons * 15; };
  proto.removePrice = function () { return 15 + this.removals * 5; };
  proto.levelPrice = function (c) { return 25 * (c.level || 1) + c.rarity * 10; };
  proto.armyPrice = function (k) { return Math.round(ARMY[k].base * Math.pow(1.55, this.army[k])); };

  proto.giveCard = function (card) {
    if (this.hand.size < CONFIG.maxHand) { const v = this.hand.add(card); return 'eline eklendi'; }
    this.deck.push(card); return 'el dolu olduğu için destenin üstüne kondu';
  };

  proto.openShop = function (tab = this.shopTab || 'shop') {
    if (this.state !== 'prep') return;
    this.closeShop(); this.closeBag?.();
    this.select(null);
    this.shopTab = tab;
    const L = this.shopLayer = [];
    const top = PANEL_Y + 2;
    const bg = this.add.rectangle(W / 2, (top + H) / 2, W, H - top, 0x0c0814, 0.98).setDepth(D).setInteractive();
    const border = this.add.graphics().setDepth(D + 1);
    border.fillStyle(0xd8a032, 0.9).fillRect(0, top, W, 3);
    L.push(bg, border);
    L.push(txt(this, 18, top + 10, 'RUH PAZARI', 24, '#ffd36a', T).setDepth(D + 2));
    L.push(txt(this, W - 18, top + 14, `${this.souls} ruh`, 20, '#9dff8a').setOrigin(1, 0).setDepth(D + 2));
    // tabs
    const tabs = [['shop', 'DÜKKÂN'], ['service', 'HİZMET'], ['army', 'ORDU']];
    tabs.forEach(([k, label], i) => {
      const b = new Button(this, 92 + i * 178, top + 66, 168, 44, label, k === tab ? 0x8a5a1a : 0x3a3346, () => this.openShop(k)).setDepth(D + 3);
      b.t.setFontSize(17);
      L.push(b);
    });
    const y0 = top + 104;
    if (tab === 'shop') this.shopTabShop(L, y0);
    if (tab === 'service') this.shopTabService(L, y0);
    if (tab === 'army') this.shopTabArmy(L, y0);
    L.push(new Button(this, W / 2, H - 46, 260, 58, 'KAPAT', 0x4a4258, () => this.closeShop()).setDepth(D + 3));
  };

  proto.closeShop = function () {
    if (!this.shopLayer) return;
    this.shopLayer.forEach((o) => (o.c ? o.c.destroy() : o.destroy()));
    this.shopLayer = null;
    this.updateHUD();
  };

  proto.shopBuy = function (price, fn) {
    if (this.souls < price) { sfx.error(); return; }
    this.souls -= price; sfx.soul(); sfx.rare();
    const msg = fn();
    if (msg) this.notify(msg, '#ffd36a');
    this.updateHUD();
    if (this.shopLayer) this.openShop(this.shopTab); // some actions (summon) close the market on purpose
  };

  proto.shopTabShop = function (L, y0) {
    const avail = H - 60 - y0 - 70;
    const s = Math.min(0.5, (avail / 2 - 40) / CARD_H);
    const cw = CARD_W * s, ch = CARD_H * s;
    const slotW = (W - 20) / 5;
    this.stock.forEach((o, i) => {
      const x = 10 + slotW * i + slotW / 2, y = y0 + 8 + ch / 2;
      if (o.sold) { L.push(txt(this, x, y, 'SATILDI', 15, '#6a5a7a', T).setOrigin(0.5).setDepth(D + 2)); return; }
      let img;
      if (o.type === 'card') img = this.add.image(x, y, faceKey(this, o.card)).setScale(s).setDepth(D + 2);
      else {
        const col = RARITIES[o.item.rarity].hex;
        const g = this.add.graphics().setDepth(D + 2);
        g.fillStyle(0x05030a, 1).fillRoundedRect(x - cw / 2, y - ch / 2, cw, ch, 8);
        g.lineStyle(3, col, 1).strokeRoundedRect(x - cw / 2 + 2, y - ch / 2 + 2, cw - 4, ch - 4, 8);
        L.push(g);
        img = this.add.image(x, y - 12, 'item_' + o.item.id).setScale(0.7).setDepth(D + 2);
        L.push(txt(this, x, y + ch / 2 - 22, ITEMS[o.item.id].name, 12, RARITIES[o.item.rarity].color, { align: 'center', wordWrap: { width: cw - 6 }, strokeThickness: 2 }).setOrigin(0.5).setDepth(D + 2));
      }
      img.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        const desc = o.type === 'item' ? `${ITEMS[o.item.id].name} (${RARITIES[o.item.rarity].name}): ${itemDesc(o.item)}`
          : o.card.kind === 'ritual' ? `${RITUALS[o.card.id].name}: ${this.ritualText(o.card)}` : `${cardLabel(o.card)} — ${CREATURES[o.card.id].desc}`;
        this.notify(desc, '#ddd0f4');
      });
      L.push(img);
      const price = this.priceOf(o);
      const full = o.type === 'item' && this.bag.length >= BAG_SIZE;
      const b = new Button(this, x, y + ch / 2 + 22, slotW - 8, 38, `${price}`, 0x2f8a4a, () => this.shopBuy(price, () => {
        o.sold = true;
        if (o.type === 'item') { this.bag.push(o.item); this.updatePiles(); return `${ITEMS[o.item.id].name} çantaya kondu.`; }
        return `${o.card.kind === 'ritual' ? RITUALS[o.card.id].name : CREATURES[o.card.id].name} ${this.giveCard(o.card)}.`;
      })).setDepth(D + 3);
      b.t.setFontSize(16); b.setEnabled(this.souls >= price && !full);
      L.push(b);
    });
    const ry = y0 + ch + 92;
    const rr = this.rerollPrice();
    const rb = new Button(this, W / 2, ry, 300, 54, 'VİTRİNİ YENİLE', 0x5a3a9a, () => this.shopBuy(rr, () => {
      const keep = this.shopRerolls, s2 = this.summons; // counters persist within the same prep
      this.restockShop(); this.shopRerolls = keep + 1; this.summons = s2;
      return 'Vitrin yenilendi.';
    })).setDepth(D + 3);
    rb.set('VİTRİNİ YENİLE', `${rr} ruh`).setEnabled(this.souls >= rr);
    L.push(rb);
    L.push(txt(this, W / 2, ry + 40, 'Karta dokunarak ayrıntısını gör. Vitrin her dalga yenilenir.', 13, '#9b8bc8', { strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(D + 2));
  };

  proto.serviceRow = function (L, y, title, desc, label, price, enabled, fn, color = 0x2f8a4a) {
    const g = this.add.graphics().setDepth(D + 1);
    g.fillStyle(0x140c20, 0.95).fillRoundedRect(12, y, W - 24, 74, 10);
    g.lineStyle(2, 0x3a2a50, 1).strokeRoundedRect(12, y, W - 24, 74, 10);
    L.push(g);
    L.push(txt(this, 26, y + 8, title, 18, '#fff2d0', T).setDepth(D + 2));
    L.push(txt(this, 26, y + 36, desc, 14, '#c8b8e8', { wordWrap: { width: W - 210 }, strokeThickness: 2 }).setDepth(D + 2));
    const b = new Button(this, W - 90, y + 37, 140, 52, label, color, () => this.shopBuy(price, fn)).setDepth(D + 3);
    b.set(label, `${price} ruh`); b.t.setFontSize(16); b.setEnabled(enabled && this.souls >= price);
    L.push(b);
  };

  proto.shopTabService = function (L, y0) {
    const gap = Math.min(84, (H - 70 - y0) / 4);
    const dc = this.drawCost();
    this.serviceRow(L, y0, 'Kart Çek', 'Destenden bir kart çek. Her çekişte pahalanır.', 'ÇEK', dc,
      this.hand.size < CONFIG.maxHand && this.deck.length + this.grave.length > 0, () => { this.drawsThisPrep++; this.dealCards(1); return null; });
    const sp = this.summonPrice();
    this.serviceRow(L, y0 + gap, 'Ruhla Çağır', 'Rastgele bir yaratığı doğrudan sahaya çağır (kartı destene katılır).', 'ÇAĞIR', sp,
      this.findSlot('tank') != null, () => {
        const card = makeCard('creature', BASE_CREATURES[(Math.random() * BASE_CREATURES.length) | 0], rollRarity(this.meta.luck + this.mods.luck));
        const slot = this.findSlot(CREATURES[card.id].role); slot.reserved = true;
        this.summons++;
        this.closeShop();
        this.summon(card, slot);
        return `${RARITIES[card.rarity].name} ${CREATURES[card.id].name} topraktan çıkıyor!`;
      }, 0x6a3a7a);
    const rp = this.removePrice();
    const removable = [...this.deck, ...this.grave];
    this.serviceRow(L, y0 + gap * 2, 'Kart Sil', 'Destenden ya da mezarlıktan bir kartı kalıcı olarak çıkar.', 'SİL', rp,
      removable.length > 0, () => { this.souls += rp; this.pickCard(removable, 'SİLİNECEK KARTI SEÇ', (c) => {
        if (this.souls < rp) return;
        this.souls -= rp; this.removals++;
        this.deck = this.deck.filter((x) => x !== c); this.grave = this.grave.filter((x) => x !== c);
        this.notify(`${cardLabel(c)} desteden silindi.`, '#ff8a80'); this.updateHUD();
      }); return null; }, 0x8a2a3a);
    const upg = [...this.deck, ...this.grave, ...this.hand.cards.map((v) => v.card)].filter((c) => c.kind === 'creature' && (c.level || 1) < MAX_LEVEL);
    const minP = upg.length ? Math.min(...upg.map((c) => this.levelPrice(c))) : 25;
    this.serviceRow(L, y0 + gap * 3, 'Kart Yükselt', 'Bir yaratık kartını +1 seviyeye çıkar (birleştirme gerektirmez).', 'YÜKSELT', minP,
      upg.length > 0, () => { this.souls += minP; this.pickCard(upg, 'YÜKSELTİLECEK KARTI SEÇ', (c) => {
        const p = this.levelPrice(c);
        if (this.souls < p) { sfx.error(); this.notify(`Yeterli ruh yok (${p})`, '#ff8a80'); return; }
        this.souls -= p; c.level = (c.level || 1) + 1;
        const v = this.hand.cards.find((x) => x.card === c); if (v) v.refresh();
        this.notify(`${CREATURES[c.id].name} Sv.${c.level} oldu.`, '#ffd36a'); sfx.epic(); this.updateHUD();
      }, (c) => `${this.levelPrice(c)} ruh`); return null; }, 0xb8862a);
  };

  proto.shopTabArmy = function (L, y0) {
    const gap = Math.min(84, (H - 70 - y0) / 4);
    Object.entries(ARMY).forEach(([k, A], i) => {
      const lvl = this.army[k], maxed = lvl >= A.max, price = this.armyPrice(k);
      this.serviceRow(L, y0 + gap * i, `${A.name}  ${'◆'.repeat(Math.min(lvl, 10))}`, `${A.desc}. Bu oyun boyunca geçerli.${maxed ? ' (Azami)' : ''}`, maxed ? 'TAMAM' : 'AL', price, !maxed, () => {
        this.army[k] += 1;
        if (k === 'slots') { this.maxUnits = CONFIG.maxUnits + this.army.slots; }
        for (const u of this.units) if (u.team === 'ally' && !u.dead) u.recalc(false);
        sfx.epic();
        return `${A.name} güçlendi.`;
      }, 0x5a3a9a);
    });
  };

  // generic list picker used by the remove / upgrade services
  proto.pickCard = function (list, title, onPick, extra) {
    const L = [];
    const D2 = D + 20;
    L.push(this.add.rectangle(W / 2, H / 2, W, H, 0x05030a, 0.92).setDepth(D2).setInteractive());
    L.push(txt(this, W / 2, 96, title, 26, '#ffd36a', T).setOrigin(0.5).setDepth(D2 + 1));
    const close = () => { L.forEach((o) => (o.c ? o.c.destroy() : o.destroy())); this.openShop(this.shopTab); };
    const groups = new Map();
    for (const c of list) { const k = cardLabel(c); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(c); }
    const rows = [...groups.entries()];
    const top = 140, rowH = Math.min(52, (H - 230) / Math.max(1, rows.length));
    rows.forEach(([label, cards], i) => {
      const y = top + i * rowH;
      const b = new Button(this, W / 2, y + rowH / 2, W - 40, rowH - 6, '', 0x2a2036, () => { onPick(cards[0]); close(); }).setDepth(D2 + 2);
      b.t.setText(`${cards.length}× ${label}${extra ? '  •  ' + extra(cards[0]) : ''}`).setFontSize(15).setColor(cards[0].kind === 'creature' ? RARITIES[cards[0].rarity].color : '#c8b0ff');
      L.push(b);
    });
    L.push(new Button(this, W / 2, H - 60, 260, 58, 'VAZGEÇ', 0x4a4258, close).setDepth(D2 + 2));
  };
}
