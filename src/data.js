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
  archer: { name: 'Kemik Okçu', role: 'ranger', hp: 85, atk: 15, cd: 1.2, range: 290, speed: 0, proj: 'arrow', desc: 'Uzaktan kemik ok atar.' },
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
  knight: { name: 'Kutsal Şövalye', hp: 200, atk: 13, cd: 1.2, range: 34, speed: 38, souls: 3, cost: 3 },
  crusader: { name: 'Haçlı Kılıççı', hp: 120, atk: 18, cd: 0.9, range: 32, speed: 58, souls: 3, cost: 2 },
  priest: { name: 'Rahip', hp: 90, atk: 10, cd: 1.6, range: 230, speed: 36, proj: 'holy', heal: 16, healCd: 3, souls: 4, cost: 3 },
  inquisitor: { name: 'Engizisyoncu', hp: 820, atk: 28, cd: 1.5, range: 40, speed: 30, aoe: 60, souls: 25, boss: true, cost: 12 },
};

export const RITUALS = {
  blood: { name: 'Kan Ayini', desc: 'Elindeki bir sonraki yaratık kartı +1 nadirlik kazanır.', glyph: 'drop', w: 3 },
  whisper: { name: 'Mezar Fısıltısı', desc: '2 kapalı kart çek.', glyph: 'eye', w: 3 },
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
  if (w % 5 === 0) list.push('inquisitor');
  if (w >= 10 && w % 5 === 0) list.push('inquisitor');
  let budget = 4 + w * 2.7 - (w % 5 === 0 ? 6 : 0);
  const opts = ['crusader', 'knight'];
  if (w >= 2) opts.push('priest');
  while (budget >= 2) {
    const k = opts[(Math.random() * opts.length) | 0];
    if (ENEMIES[k].cost > budget) { list.push('crusader'); budget -= 2; continue; }
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
  body: { name: 'Kadim Beden', desc: 'Necromancer başlangıç canı +%10', max: 5, cost: (l) => 15 + l * 15 },
  purse: { name: 'Ruh Kesesi', desc: 'Başlangıç ruhu +10', max: 5, cost: (l) => 10 + l * 12 },
  bone: { name: 'Kutsanmış Kemik', desc: 'Tüm yaratıklar +%6 can', max: 5, cost: (l) => 15 + l * 15 },
  rage: { name: 'Mezar Öfkesi', desc: 'Tüm yaratıklar +%6 hasar', max: 5, cost: (l) => 15 + l * 15 },
  lore: { name: 'Mezar Bilgisi', desc: 'İlk elde +1 kart', max: 2, cost: (l) => 30 + l * 30 },
  luck: { name: 'Şans Ritüeli', desc: 'Nadir yaratık şansı artar', max: 3, cost: (l) => 25 + l * 25 },
};
