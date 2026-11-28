// Game data: rarities, creatures, hybrids, enemies, cards, run upgrades and permanent (meta) upgrades.

export const RARITIES = [
  { id: 'common', name: 'Sıradan', mult: 1, color: '#b9b4c8', hex: 0xb9b4c8, weight: 60 },
  { id: 'rare', name: 'Nadir', mult: 1.3, color: '#4aa8ff', hex: 0x4aa8ff, weight: 27 },
  { id: 'epic', name: 'Epik', mult: 1.7, color: '#c25cff', hex: 0xc25cff, weight: 10 },
  { id: 'legendary', name: 'Efsanevi', mult: 2.2, color: '#ffc23a', hex: 0xffc23a, weight: 3 },
];

export const MAX_LEVEL = 5;
export const levelMult = (l) => 1 + 0.4 * (l - 1);

export const ROLES = {
  tank: { name: 'Tank', col: 2 },
  attacker: { name: 'Saldırgan', col: 1 },
  ranger: { name: 'Menzilli', col: 0 },
  healer: { name: 'Şifacı', col: 0 },
};

export const CREATURES = {
  guard: { name: 'Kemik Muhafız', role: 'tank', hp: 230, atk: 12, cd: 1.1, range: 34, speed: 45, taunt: true, desc: 'Düşmanları üzerine çeker.' },
  golem: { name: 'Ceset Golemi', role: 'tank', hp: 310, atk: 18, cd: 1.8, range: 40, speed: 28, aoe: 55, desc: 'Yavaş ama yumruğu alan hasarı verir.' },
  butcher: { name: 'Zombi Kasap', role: 'attacker', hp: 150, atk: 26, cd: 1.0, range: 32, speed: 50, desc: 'Yüksek yakın dövüş hasarı.' },
  wolf: { name: 'Hayalet Kurt', role: 'attacker', hp: 105, atk: 15, cd: 0.6, range: 30, speed: 95, crit: 0.3, desc: 'Çok hızlı, %30 kritik vuruş.' },
  archer: { name: 'Kemik Okçu', role: 'ranger', hp: 85, atk: 15, cd: 1.2, range: 310, speed: 0, proj: 'arrow', desc: 'Uzaktan kemik ok atar.' },
  banshee: { name: "Ruh Banshee'si", role: 'healer', hp: 95, atk: 7, cd: 1.5, range: 230, speed: 0, proj: 'wisp', heal: 20, healCd: 2.5, desc: 'Yaralı dostlarını iyileştirir.' },
  // hybrids (only via Kemik Füzyonu)
  cavalry: { name: 'Kemik Süvarisi', role: 'tank', hp: 330, atk: 22, cd: 1.0, range: 34, speed: 85, taunt: true, charge: true, hybrid: true, desc: 'Hızlı tank. Her dalgadaki ilk saldırısı 2 kat hasar verir.' },
  giant: { name: 'Et Devi', role: 'tank', hp: 480, atk: 28, cd: 1.5, range: 40, speed: 30, aoe: 45, reflect: 0.3, hybrid: true, desc: 'Aldığı yakın dövüş hasarının %30\'unu saldırana yansıtır.' },
  screamer: { name: 'Çığlık Okçusu', role: 'ranger', hp: 130, atk: 22, cd: 1.1, range: 300, speed: 0, proj: 'arrow', healArrow: 0.4, hybrid: true, desc: 'Okları, verdiği hasarın %40\'ı kadar en yaralı dostu iyileştirir.' },
  hound: { name: 'Ruh Tazısı', role: 'attacker', hp: 160, atk: 22, cd: 0.55, range: 30, speed: 100, crit: 0.25, feast: 15, hybrid: true, desc: 'Öldürdüğü her düşman tüm dostlarına can verir.' },
  catapult: { name: 'Mancınık Golem', role: 'ranger', hp: 280, atk: 26, cd: 2.2, range: 330, speed: 0, proj: 'boulder', aoe: 55, hybrid: true, desc: 'Uzaktan alan hasarı veren kemik gülleler fırlatır.' },
};
export const BASE_CREATURES = Object.keys(CREATURES).filter((k) => !CREATURES[k].hybrid);

export const RECIPES = {
  'guard|wolf': 'cavalry',
  'butcher|golem': 'giant',
  'archer|banshee': 'screamer',
  'banshee|wolf': 'hound',
  'archer|golem': 'catapult',
};
export function recipeFor(a, b) { return RECIPES[[a, b].sort().join('|')] || null; }
export const FUSION_MIN_LEVEL = 2;

export const NECRO = { name: 'Necromancer', hp: 420, atk: 22, cd: 1.4, range: 360, speed: 0, proj: 'bolt' };

export const ENEMIES = {
  knight: { name: 'Kutsal Şövalye', hp: 200, atk: 13, cd: 1.2, range: 34, speed: 38, souls: 3, cost: 3, desc: 'Dayanıklı yakın dövüşçü.' },
  crusader: { name: 'Haçlı Kılıççı', hp: 120, atk: 18, cd: 0.9, range: 32, speed: 58, souls: 3, cost: 2, desc: 'Hızlı ve sert vuran kılıççı.' },
  priest: { name: 'Rahip', hp: 90, atk: 10, cd: 1.6, range: 230, speed: 36, proj: 'holy', heal: 16, healCd: 3, souls: 4, cost: 3, desc: 'Uzaktan saldırır ve yaralı dostlarını iyileştirir.' },
  paladin: { name: 'Kutsal Paladin', hp: 280, atk: 14, cd: 1.3, range: 36, speed: 32, souls: 5, cost: 4, guardAura: 95, desc: 'Yakınındaki dostları %25 daha az hasar alır.' },
  hunter: { name: 'Avcı Okçu', hp: 100, atk: 16, cd: 1.4, range: 300, speed: 40, proj: 'huntarrow', backline: true, souls: 4, cost: 3, desc: 'Arka hattaki yaratıkları hedef alır; düşmanı üzerine çeken tanklar onu kendine yöneltir.' },
  firepriest: { name: 'Ateş Rahibi', hp: 110, atk: 15, cd: 2.0, range: 240, speed: 34, proj: 'fire', aoe: 50, souls: 5, cost: 4, desc: 'Alan hasarı veren ateş topları atar.' },
  archangel: { name: 'Başmelek', hp: 1400, atk: 34, cd: 1.3, range: 42, speed: 34, aoe: 65, souls: 40, boss: true, smiteCd: 7, scale: 2.6, cost: 15, desc: 'Düzenli olarak en güçlü yaratığına ilahi ceza indirir ve dostlarını iyileştirir.' },
  inquisitor: { name: 'Engizisyoncu', hp: 820, atk: 28, cd: 1.5, range: 40, speed: 30, aoe: 60, souls: 25, boss: true, cost: 12, desc: 'Boss. Yumruğu alan hasarı verir.' },
};

export const RITUALS = {
  blood: { name: 'Kan Ayini', desc: 'Elindeki bir sonraki yaratık kartı +1 nadirlik kazanır.', glyph: 'drop', w: 3 },
  rise: { name: 'Mezar Yükselişi', desc: 'Sahadaki rastgele bir yaratık +1 seviye atlar.', glyph: 'ghost', w: 3 },
  deathrain: { name: 'Ölüm Yağmuru', desc: 'Bu dalgada gelen tüm düşmanlar canlarının %25\'ini kaybederek başlar.', glyph: 'crack', w: 3 },
  bonearmor: { name: 'Kemik Zırhı', desc: 'Bu dalga tüm yaratıklara canlarının %30\'u kadar kalkan.', glyph: 'shield', w: 3 },
  harvest: { name: 'Ruh Hasadı', desc: '+20 ruh kazan.', glyph: 'soul', w: 3 },
  frenzy: { name: 'Ölü Öfkesi', desc: 'Bu dalga tüm yaratıklar +%25 hasar verir.', glyph: 'fang', w: 3 },
  fusion: { name: 'Kemik Füzyonu', desc: 'Farklı türden iki yaratığı (en az 2. seviye) üst üste sürükleyerek hibrit yarat.', glyph: 'fuse', w: 1.6 },
};

export const CURSES = {
  restless: { name: 'Huzursuz Ruh', desc: 'Dalga başında kontrolden çıkmış bir yaratık sana saldırır.', glyph: 'ghost' },
  rot: { name: 'Kemik Çürümesi', desc: 'Dalga başında rastgele bir yaratığın canı %40 azalır.', glyph: 'crack' },
  thief: { name: 'Ruh Hırsızı', desc: 'Dalga başında 15 ruh kaybedersin.', glyph: 'hand' },
  holy: { name: 'Kutsal Mühür', desc: 'Bu dalgada düşmanlar +%25 güçlü.', glyph: 'sun' },
};

export const CONFIG = {
  maxUnits: 6,
  handSize: 3,
  maxHand: 6,
  startSouls: 25,
  drawCost: 10,
  drawCostStep: 5,
  rerollCost: 8,
  purgeCost: 12,
  waveHealPct: 0.2,
  bansheeWaveHealPct: 0.1,
  upgradeCost: [20, 40, 75], // soul cost to raise a hand card's rarity (by current rarity)
  necroHealCost: 15, necroHealPct: 0.3,
  soulsPerDarkSoul: 25,
};

export function rarityWeights(luck = 0) {
  return RARITIES.map((r, i) => Math.max(5, r.weight + [-6, 3, 2, 1][i] * luck));
}
export function rollRarity(luck = 0) {
  const ws = rarityWeights(luck), total = ws.reduce((a, b) => a + b, 0);
  let x = Math.random() * total, i = 0;
  for (; i < ws.length; i++) { x -= ws[i]; if (x <= 0) break; }
  return Math.min(RARITIES.length - 1, i);
}

function weightedKey(obj) {
  const keys = Object.keys(obj), tot = keys.reduce((s, k) => s + (obj[k].w || 1), 0);
  let x = Math.random() * tot;
  for (const k of keys) { x -= obj[k].w || 1; if (x <= 0) return k; }
  return keys[keys.length - 1];
}

export function randomCard(wave, { luck = 0, curseMult = 1 } = {}) {
  const curseChance = Math.min(0.2, 0.08 + wave * 0.006) * curseMult;
  const x = Math.random();
  if (x < curseChance) return { kind: 'curse', id: weightedKey(CURSES) };
  if (x < curseChance + 0.22) return { kind: 'ritual', id: weightedKey(RITUALS) };
  return { kind: 'creature', id: BASE_CREATURES[(Math.random() * BASE_CREATURES.length) | 0], rarity: rollRarity(luck) };
}

export function waveComposition(w) {
  const list = [];
  const boss = w % 5 === 0;
  if (boss) list.push(w >= 20 && w % 10 === 0 ? 'archangel' : 'inquisitor');
  if (boss && w >= 15 && w !== 20) list.push('inquisitor');
  let budget = 4 + w * 2.0 - (boss ? 9 : 0);
  const caps = {
    priest: w >= 2 ? 1 + Math.floor(w / 6) : 0,
    hunter: w >= 4 ? 1 + Math.floor(w / 7) : 0,
    paladin: w >= 6 ? 1 + Math.floor(w / 8) : 0,
    firepriest: w >= 8 ? 1 + Math.floor(w / 12) : 0,
  };
  const count = {};
  while (budget >= 2) {
    const opts = ['crusader', 'knight', ...Object.keys(caps).filter((k) => (count[k] || 0) < caps[k])];
    const k = opts[(Math.random() * opts.length) | 0];
    if (ENEMIES[k].cost > budget) { list.push('crusader'); budget -= 2; continue; }
    count[k] = (count[k] || 0) + 1;
    list.push(k); budget -= ENEMIES[k].cost;
  }
  return list;
}

// ---- run upgrades ("Lütuf"), offered 3 at a time after each wave ----
export const BOONS = {
  sharp: { name: 'Keskin Kemikler', desc: 'Menzilli yaratıklar +%20 hasar.', icon: 'ranger', apply: (m) => { m.roleAtk.ranger += 0.2; } },
  thick: { name: 'Kalın Kemik', desc: 'Tanklar +%20 can.', icon: 'tank', apply: (m) => { m.roleHp.tank += 0.2; } },
  thirst: { name: 'Kana Susamışlık', desc: 'Saldırganlar +%20 hasar.', icon: 'attacker', apply: (m) => { m.roleAtk.attacker += 0.2; } },
  bond: { name: 'Ruh Bağı', desc: 'Şifacıların iyileştirmesi +%30.', icon: 'healer', apply: (m) => { m.heal += 0.3; } },
  dark: { name: 'Kara Büyü', desc: 'Necromancer +%30 hasar.', icon: 'staff', apply: (m) => { m.necroAtk += 0.3; } },
  will: { name: 'Ölümsüz İrade', desc: 'Necromancer +%25 azami can ve tam iyileşme.', icon: 'heart', apply: (m) => { m.necroHp += 0.25; } },
  magnet: { name: 'Ruh Mıknatısı', desc: 'Her düşman +1 ruh bırakır.', icon: 'soul', apply: (m) => { m.soulBonus += 1; } },
  grave: { name: 'Şanslı Mezar', desc: 'Nadir yaratık çıkma şansı artar.', icon: 'gem', apply: (m) => { m.luck += 2; } },
  hand: { name: 'Geniş Avuç', desc: 'Her hazırlıkta +1 kart çekersin.', icon: 'card', apply: (m) => { m.extraDraw += 1; } },
  cheap: { name: 'Ucuz Ritüel', desc: 'Kart çekme ve yeniden çekme 3 ruh ucuzlar.', icon: 'coin', apply: (m) => { m.discount += 3; } },
  ward: { name: 'Lanet Kalkanı', desc: 'Lanetli kart çıkma şansı yarıya iner.', icon: 'ward', apply: (m) => { m.curseMult *= 0.5; } },
  horde: { name: 'Ölüler Ordusu', desc: 'Tüm yaratıklar +%10 can ve +%10 hasar.', icon: 'skull', apply: (m) => { for (const r in m.roleHp) { m.roleHp[r] += 0.1; m.roleAtk[r] += 0.1; } } },
};
export function newRunMods() {
  return { roleAtk: { tank: 0, attacker: 0, ranger: 0, healer: 0 }, roleHp: { tank: 0, attacker: 0, ranger: 0, healer: 0 }, heal: 0, necroAtk: 0, necroHp: 0, soulBonus: 0, luck: 0, extraDraw: 0, discount: 0, curseMult: 1 };
}

// ---- permanent upgrades bought with Kara Ruh ----
export const META = {
  unlock_blood: { name: 'Kan Ayini Kartı', desc: 'Kan Ayini ödüllerde çıkmaya başlar', max: 1, cost: () => 40 },
  unlock_frenzy: { name: 'Ölü Öfkesi Kartı', desc: 'Ölü Öfkesi ödüllerde çıkmaya başlar', max: 1, cost: () => 50 },
  unlock_fusion: { name: 'Kemik Füzyonu Kartı', desc: 'Kemik Füzyonu ödüllerde çıkmaya başlar', max: 1, cost: () => 80 },
  body: { name: 'Kadim Beden', desc: 'Necromancer başlangıç canı +%10', max: 5, cost: (l) => 15 + l * 15 },
  purse: { name: 'Ruh Kesesi', desc: 'Başlangıç ruhu +10', max: 5, cost: (l) => 10 + l * 12 },
  bone: { name: 'Kutsanmış Kemik', desc: 'Tüm yaratıklar +%6 can', max: 5, cost: (l) => 15 + l * 15 },
  rage: { name: 'Mezar Öfkesi', desc: 'Tüm yaratıklar +%6 hasar', max: 5, cost: (l) => 15 + l * 15 },
  lore: { name: 'Mezar Bilgisi', desc: 'İlk elde +1 kart', max: 2, cost: (l) => 30 + l * 30 },
  luck: { name: 'Şans Ritüeli', desc: 'Nadir yaratık şansı artar', max: 3, cost: (l) => 25 + l * 25 },
};

// ---------------- deck ----------------
let CARD_UID = 1;
export function makeCard(kind, id, rarity = 0, level = 1) { return { uid: CARD_UID++, kind, id, rarity, level }; }

export const STARTER_DECK = [
  ['creature', 'guard'], ['creature', 'guard'], ['creature', 'guard'], ['creature', 'butcher'], ['creature', 'butcher'],
  ['creature', 'archer'], ['creature', 'archer'], ['creature', 'golem'], ['creature', 'golem'], ['creature', 'wolf'], ['creature', 'wolf'],
  ['creature', 'banshee'], ['ritual', 'harvest'], ['ritual', 'bonearmor'], ['ritual', 'rise'],
];
export const BASE_RITUALS = ['harvest', 'bonearmor', 'rise', 'deathrain'];
export const LOCKED_RITUALS = { blood: 'unlock_blood', frenzy: 'unlock_frenzy', fusion: 'unlock_fusion' };

// level-dependent ritual numbers (level 2 = merged "II" version)
export const RITUAL_VALUES = {
  blood: [1, 2], rise: [1, 2], deathrain: [0.25, 0.4], bonearmor: [0.4, 0.65], harvest: [30, 65], frenzy: [0.3, 0.6], fusion: [1, 2],
};
export function ritualDesc(id, level = 1) {
  const v = RITUAL_VALUES[id][level - 1];
  switch (id) {
    case 'blood': return v === 1 ? 'Elindeki bir yaratık kartı +1 nadirlik kazanır.' : 'Elindeki iki yaratık kartı +1 nadirlik kazanır.';
    case 'rise': return v === 1 ? 'Sahadaki rastgele bir yaratık +1 seviye atlar.' : 'Sahadaki iki rastgele yaratık +1 seviye atlar.';
    case 'deathrain': return `Bu dalgada gelen tüm düşmanlar canlarının %${Math.round(v * 100)}'ini kaybederek başlar (boss yarısını).`;
    case 'bonearmor': return `Bu dalga tüm yaratıklara canlarının %${Math.round(v * 100)}'i kadar kalkan.`;
    case 'harvest': return `+${v} ruh kazan.`;
    case 'frenzy': return `Bu dalga tüm yaratıklar +%${Math.round(v * 100)} hasar verir.`;
    case 'fusion': return `${v} füzyon hakkı: farklı türden iki yaratığı (en az Sv.2) üst üste sürükle.`;
  }
  return RITUALS[id].desc;
}

export function rewardChoices(wave, unlocked, luck = 0) {
  const pool = [...BASE_RITUALS, ...Object.keys(LOCKED_RITUALS).filter((k) => unlocked.includes(k))];
  const out = [];
  while (out.length < 3) {
    // at least two creature choices; the third slot may be a ritual
    const c = (out.length < 2 || Math.random() < 0.6)
      ? makeCard('creature', BASE_CREATURES[(Math.random() * BASE_CREATURES.length) | 0], rollRarity(luck + Math.min(4, wave * 0.3)))
      : makeCard('ritual', pool[(Math.random() * pool.length) | 0]);
    if (!out.some((o) => o.kind === c.kind && o.id === c.id && o.rarity === c.rarity)) out.push(c);
  }
  return out;
}

// ---------------- items ----------------
export const ITEMS = {
  ring: { name: 'Kemik Yüzük', desc: '+%{v} hasar', atk: 0.2, icon: 'ring' },
  amulet: { name: 'Mezar Muskası', desc: '+%{v} can', hp: 0.25, icon: 'amulet' },
  fang: { name: 'Vampir Dişi', desc: 'Verdiği hasarın %{v}\'i kadar iyileşir', lifesteal: 0.15, icon: 'fang' },
  cloak: { name: 'Kara Pelerin', desc: '%{v} ihtimalle saldırıdan kaçar', dodge: 0.15, icon: 'cloak' },
  lantern: { name: 'Ruh Feneri', desc: '+%{v} saldırı hızı', haste: 0.2, icon: 'lantern' },
  thorns: { name: 'Dikenli Zırh', desc: 'Yakın hasarın %{v}\'ini yansıtır', reflect: 0.2, icon: 'thorns' },
  claw: { name: 'Kurt Pençesi', desc: '+%{v} kritik vuruş şansı', crit: 0.15, icon: 'claw' },
  heart: { name: 'Taş Kalp', desc: 'Dalga başında %{v} kalkan', shield: 0.2, icon: 'heart' },
  staff: { name: 'Kadim Asa', desc: 'Necromancer: +%{v} büyü hasarı', atk: 0.35, necro: true, icon: 'staff' },
  necklace: { name: 'Ruh Kolyesi', desc: 'Necromancer: +%{v} can', hp: 0.3, necro: true, icon: 'necklace' },
};
const ITEM_STATS = ['atk', 'hp', 'lifesteal', 'dodge', 'haste', 'reflect', 'crit', 'shield'];
export const ITEM_RARITY_MULT = [1, 1.35, 1.75, 2.3];
export const BAG_SIZE = 8;
let ITEM_UID = 1;
export function makeItem(id, rarity = 0) { return { uid: ITEM_UID++, id, rarity }; }
export function rollItem(luck = 0, boss = false) {
  const keys = Object.keys(ITEMS);
  return makeItem(keys[(Math.random() * keys.length) | 0], Math.min(3, rollRarity(luck + (boss ? 6 : 0)) + (boss ? 1 : 0)));
}
// effective stat values of an item (scaled by its rarity)
export function itemStats(item) {
  const I = ITEMS[item.id], m = ITEM_RARITY_MULT[item.rarity], out = {};
  for (const k of ITEM_STATS) if (I[k]) out[k] = Math.round(I[k] * m * 100) / 100;
  return out;
}
export function itemDesc(item) {
  const st = itemStats(item), v = Object.values(st)[0];
  return ITEMS[item.id].desc.replace('{v}', Math.round(v * 100));
}
export function itemValue(item) { return 6 + item.rarity * 8; }

// ---------------- synergies ----------------
export const TAGS = {
  guard: ['skeleton'], archer: ['skeleton'], golem: ['flesh'], butcher: ['flesh'], wolf: ['ghost'], banshee: ['ghost'],
  cavalry: ['skeleton', 'ghost'], giant: ['flesh'], screamer: ['skeleton', 'ghost'], hound: ['ghost'], catapult: ['flesh', 'skeleton'],
};
export const TAG_NAMES = { skeleton: 'İskelet', ghost: 'Hayalet', flesh: 'Et' };
export const SYNERGIES = {
  legion: { name: 'Kemik Lejyonu', tag: 'skeleton', need: 3, desc: 'İskeletler +%20 hasar', color: '#e8dfc6', bonus: { atk: 0.2 } },
  swarm: { name: 'Hayalet Sürüsü', tag: 'ghost', need: 2, desc: 'Hayaletler %15 kaçınma', color: '#8ee8ff', bonus: { dodge: 0.15 } },
  flesh: { name: 'Et Yığını', tag: 'flesh', need: 2, desc: 'Et yaratıkları +%20 can', color: '#c8a0a8', bonus: { hp: 0.2 } },
  wall: { name: 'Kalkan Duvarı', role: 'tank', need: 2, desc: 'Tanklar %15 daha az hasar alır', color: '#9fb8ff', bonus: { dr: 0.15 } },
  cult: { name: 'Ölüm Tarikatı', allRoles: true, desc: 'Her rolden bir yaratık: Necromancer +%30 hasar', color: '#c88aff', necro: { atk: 0.3 } },
};
// returns { active: [keys], progress: {key: [have, need]} }
export function computeSynergies(units) {
  const tagCount = {}, roleCount = {};
  for (const u of units) {
    for (const t of TAGS[u.key] || []) tagCount[t] = (tagCount[t] || 0) + 1;
    roleCount[u.base.role] = (roleCount[u.base.role] || 0) + 1;
  }
  const active = [], progress = {};
  for (const [k, S] of Object.entries(SYNERGIES)) {
    let have, need;
    if (S.tag) { have = tagCount[S.tag] || 0; need = S.need; }
    else if (S.role) { have = roleCount[S.role] || 0; need = S.need; }
    else { have = ['tank', 'attacker', 'ranger', 'healer'].filter((r) => roleCount[r]).length; need = 4; }
    progress[k] = [have, need];
    if (have >= need) active.push(k);
  }
  return { active, progress };
}
export function synergyBonus(u, active) {
  const out = {};
  for (const k of active) {
    const S = SYNERGIES[k];
    let ok = false;
    if (u.isNecro) { if (S.necro) for (const [s2, v] of Object.entries(S.necro)) out[s2] = (out[s2] || 0) + v; continue; }
    if (S.tag) ok = (TAGS[u.key] || []).includes(S.tag);
    else if (S.role) ok = u.base.role === S.role;
    if (ok && S.bonus) for (const [s2, v] of Object.entries(S.bonus)) out[s2] = (out[s2] || 0) + v;
  }
  return out;
}

// ---------------- between-wave events ----------------
export const EVENTS = {
  merchant: { name: 'Gizemli Tüccar', text: 'Sisin içinden fenerli, yüzü görünmeyen bir tüccar çıkıyor. "Ruhların karşılığında her şey bulunur..."' },
  chest: { name: 'Lanetli Sandık', text: 'Bir mezarın dibinde zincirlerle bağlı bir sandık duruyor. Kilit, dokununca fısıldıyor.' },
  altar: { name: 'Kan Sunağı', text: 'Eski bir sunak, kan karşılığında güç vaat ediyor.' },
  grave: { name: 'Unutulmuş Mezar', text: 'Adı silinmiş bir mezar taşı. Altında tanıdık bir ruh yatıyor olabilir.' },
  spring: { name: 'Ruh Pınarı', text: 'Yeşil ışıkla parlayan bir pınar. Suyu ölüleri bile canlandırıyor.' },
};
