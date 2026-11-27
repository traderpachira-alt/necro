// Between-wave events (Gizemli Tüccar, Lanetli Sandık, Kan Sunağı, Unutulmuş Mezar, Ruh Pınarı).
import { EVENTS, CREATURES, CURSES, RARITIES, ITEMS, MAX_LEVEL, BAG_SIZE, BASE_CREATURES, makeCard, rollRarity, rollItem, itemDesc } from './data.js';
import { sfx } from './audio.js';
import { W, H } from './layout.js';

export function installEvents(proto, txt, Button) {
  const T = { title: true };

  proto.maybeEvent = function (done) {
    if (this.wave < 2 || this.state === 'over' || Math.random() > 0.4) { done(); return; }
    const keys = Object.keys(EVENTS);
    this.showEvent(keys[(Math.random() * keys.length) | 0], done);
  };

  proto.showEvent = function (id, done) {
    this.state = 'event';
    this.closeBag?.();
    this.select(null);
    const E = EVENTS[id];
    const L = [];
    const D = 1700;
    L.push(this.add.rectangle(W / 2, H / 2, W, H, 0x05030a, 0.9).setDepth(D).setInteractive());
    L.push(txt(this, W / 2, 92, 'OLAY', 16, '#9b8bc8', T).setOrigin(0.5).setDepth(D + 1));
    L.push(txt(this, W / 2, 124, E.name, 34, '#ffd36a', T).setOrigin(0.5).setDepth(D + 1));
    const rays = this.add.image(W / 2, 260, 'rays').setTint(0x9b7bd8).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.25).setScale(1.1).setDepth(D + 1);
    this.tweens.add({ targets: rays, angle: 360, duration: 20000, repeat: -1 });
    L.push(rays);
    const art = this.add.image(W / 2, 260, 'ev_' + id).setDepth(D + 2).setScale(1.1);
    this.tweens.add({ targets: art, y: 252, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    L.push(art);
    L.push(txt(this, W / 2, 360, E.text, 18, '#ddd0f4', { align: 'center', wordWrap: { width: 460 } }).setOrigin(0.5, 0).setDepth(D + 1));
    const result = txt(this, W / 2, 440, '', 19, '#9dff8a', { align: 'center', wordWrap: { width: 470 } }).setOrigin(0.5, 0).setDepth(D + 1);
    L.push(result);
    const buttons = [];
    const close = () => { L.forEach((o) => (o.c ? o.c.destroy() : o.destroy())); buttons.forEach((b) => b.destroy()); this.updateHUD(); done(); };
    const finish = (text, color = '#9dff8a') => {
      buttons.forEach((b) => b.show(false));
      result.setText(text).setColor(color);
      const b = new Button(this, W / 2, H - 90, 280, 64, 'DEVAM', 0x2f8a4a, close).setDepth(D + 3);
      buttons.push(b);
    };
    const opts = this.eventOptions(id, finish);
    const top = Math.max(520, H - 120 - opts.length * 78);
    opts.forEach((o, i) => {
      const b = new Button(this, W / 2, top + i * 78, 420, 66, o.label, o.color || 0x5a3a9a, () => { if (o.enabled === false) return; sfx.click(); o.run(); }).setDepth(D + 3);
      if (o.sub) b.set(o.label, o.sub);
      if (o.enabled === false) b.setEnabled(false);
      buttons.push(b);
    });
    sfx.epic();
  };

  proto.allCards = function () { return [...this.deck, ...this.grave, ...this.used]; };

  proto.eventOptions = function (id, finish) {
    const leave = { label: 'AYRIL', color: 0x4a4258, run: () => finish('Sessizce yoluna devam ediyorsun.', '#c8b8e8') };
    if (id === 'merchant') {
      const card = makeCard('creature', BASE_CREATURES[(Math.random() * BASE_CREATURES.length) | 0], Math.min(3, rollRarity(this.meta.luck + this.mods.luck) + 1));
      const item = rollItem(this.meta.luck + this.mods.luck);
      const curses = this.allCards().filter((c) => c.kind === 'curse');
      const o = [
        { label: `KART: ${CREATURES[card.id].name}`, sub: `${RARITIES[card.rarity].name} • 30 ruh`, color: 0x3a5a9a, enabled: this.souls >= 30,
          run: () => { this.souls -= 30; this.deck.splice((Math.random() * (this.deck.length + 1)) | 0, 0, card); finish(`${RARITIES[card.rarity].name} ${CREATURES[card.id].name} destene eklendi.`); } },
        { label: `EŞYA: ${ITEMS[item.id].name}`, sub: `${RARITIES[item.rarity].name} • 35 ruh`, color: 0x6a4a2a, enabled: this.souls >= 35 && this.bag.length < BAG_SIZE,
          run: () => { this.souls -= 35; this.bag.push(item); finish(`${ITEMS[item.id].name} çantana kondu: ${itemDesc(item)}.`); } },
      ];
      if (curses.length) o.push({ label: 'LANETLERİ SAT', sub: `${curses.length} lanet kartı • 25 ruh`, color: 0x8a2a3a, enabled: this.souls >= 25,
        run: () => { this.souls -= 25; const ids = new Set(curses.map((c) => c.uid)); for (const k of ['deck', 'grave', 'used']) this[k] = this[k].filter((c) => !ids.has(c.uid)); finish('Tüccar lanetleri alıp sisin içinde kayboldu.'); } });
      o.push(leave);
      return o;
    }
    if (id === 'chest') {
      return [
        { label: 'SANDIĞI AÇ', sub: 'Değerli eşya... ya da lanet', color: 0x8a2a3a, run: () => {
          if (Math.random() < 0.65) {
            const item = rollItem(this.meta.luck + this.mods.luck, true);
            if (this.bag.length < BAG_SIZE) this.bag.push(item); else this.souls += 30;
            sfx.legendary();
            finish(`Sandıktan ${RARITIES[item.rarity].name} ${ITEMS[item.id].name} çıktı!`, RARITIES[item.rarity].color);
          } else {
            const cid = Object.keys(CURSES)[(Math.random() * 4) | 0];
            this.deck.splice((Math.random() * (this.deck.length + 1)) | 0, 0, makeCard('curse', cid));
            this.souls += 20; sfx.curse();
            finish(`Bir lanet serbest kaldı: ${CURSES[cid].name} destene karıştı. Dipte 20 ruh buldun.`, '#ff8a80');
          }
        } },
        leave,
      ];
    }
    if (id === 'altar') {
      const cands = this.allyCreatures().filter((u) => u.level < MAX_LEVEL);
      const cost = Math.round(this.necro.maxHp * 0.25);
      return [
        { label: 'KANINI VER', sub: `Necromancer ${cost} can kaybeder`, color: 0x8a1420, enabled: this.necro.hp > cost, run: () => {
          this.necro.hp = Math.max(1, this.necro.hp - cost);
          if (cands.length) {
            const u = cands[(Math.random() * cands.length) | 0];
            u.setLevel(u.level + 1); u.hp = u.maxHp; this.syncCard(u); this.levelUpFx(u, `SEVİYE ${u.level}!`, 0xff4050);
            finish(`Sunak kanını içti: ${u.name} Sv.${u.level} oldu!`, '#ff8a80');
          } else { this.souls += 40; finish('Sunak kanını içti ve 40 ruh verdi.', '#ff8a80'); }
        } },
        leave,
      ];
    }
    if (id === 'grave') {
      const creatures = this.allCards().filter((c) => c.kind === 'creature');
      return [
        { label: 'MEZARI KAZ', sub: 'Destendeki bir yaratık kartı kopyalanır', color: 0x5a3a9a, run: () => {
          if (creatures.length) {
            const src = creatures[(Math.random() * creatures.length) | 0];
            const copy = makeCard('creature', src.id, src.rarity, src.level || 1);
            this.deck.splice((Math.random() * (this.deck.length + 1)) | 0, 0, copy);
            finish(`Mezardan bir ${CREATURES[src.id].name} (Sv.${copy.level}) çıktı ve destene katıldı.`);
          } else { this.souls += 20; finish('Mezar boştu ama 20 ruh buldun.'); }
        } },
        { label: 'SAYGI GÖSTER', sub: '+15 ruh', color: 0x4a4258, run: () => { this.souls += 15; finish('Ruh huzur buldu ve sana 15 ruh bıraktı.', '#c8b8e8'); } },
      ];
    }
    // spring
    return [
      { label: 'SUDAN İÇ', sub: 'Tüm ordun tamamen iyileşir', color: 0x2f8a6a, run: () => {
        for (const u of this.units) if (u.team === 'ally' && !u.dead) u.hp = u.maxHp;
        sfx.heal(); finish('Ölüler yeniden güçlendi.');
      } },
      { label: 'ŞİŞELE', sub: '+25 ruh', color: 0x4a4258, run: () => { this.souls += 25; finish('Pınarın özünü şişeledin: +25 ruh.', '#c8b8e8'); } },
    ];
  };
}
