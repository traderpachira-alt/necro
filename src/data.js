// Game data: rarities, creatures, enemies, ritual and cursed cards.

export const RARITIES = [
  { id: 'common', name: 'Sıradan', mult: 1, color: '#b9b4c8', hex: 0xb9b4c8, weight: 60 },
  { id: 'rare', name: 'Nadir', mult: 1.3, color: '#4aa8ff', hex: 0x4aa8ff, weight: 27 },
  { id: 'epic', name: 'Epik', mult: 1.7, color: '#c25cff', hex: 0xc25cff, weight: 10 },
  { id: 'legendary', name: 'Efsanevi', mult: 2.2, color: '#ffc23a', hex: 0xffc23a, weight: 3 },
];

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
};

export const NECRO = { name: 'Necromancer', hp: 420, atk: 22, cd: 1.4, range: 360, speed: 0, proj: 'bolt' };

export const ENEMIES = {
  knight: { name: 'Kutsal Şövalye', hp: 200, atk: 13, cd: 1.2, range: 34, speed: 38, souls: 3, cost: 3 },
  crusader: { name: 'Haçlı Kılıççı', hp: 120, atk: 18, cd: 0.9, range: 32, speed: 58, souls: 3, cost: 2 },
  priest: { name: 'Rahip', hp: 90, atk: 10, cd: 1.6, range: 230, speed: 36, proj: 'holy', heal: 16, healCd: 3, souls: 4, cost: 3 },
  inquisitor: { name: 'Engizisyoncu', hp: 820, atk: 28, cd: 1.5, range: 40, speed: 30, aoe: 60, souls: 25, boss: true, cost: 12 },
};

export const RITUALS = {
  blood: { name: 'Kan Ayini', desc: 'Elindeki bir sonraki yaratık kartı +1 nadirlik kazanır.', glyph: 'drop' },
  whisper: { name: 'Mezar Fısıltısı', desc: '2 kapalı kart çek.', glyph: 'eye' },
  bonearmor: { name: 'Kemik Zırhı', desc: 'Bu dalga tüm yaratıklara canlarının %30\'u kadar kalkan.', glyph: 'shield' },
  harvest: { name: 'Ruh Hasadı', desc: '+20 ruh kazan.', glyph: 'soul' },
  frenzy: { name: 'Ölü Öfkesi', desc: 'Bu dalga tüm yaratıklar +%25 hasar verir.', glyph: 'fang' },
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

export function rollRarity(rand = Math.random, bonus = 0) {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let x = rand() * total, i = 0;
  for (; i < RARITIES.length; i++) { x -= RARITIES[i].weight; if (x <= 0) break; }
  return Math.min(RARITIES.length - 1, i + bonus);
}

export function randomCard(wave) {
  const curseChance = Math.min(0.2, 0.08 + wave * 0.006);
  const x = Math.random();
  const pick = (o) => { const k = Object.keys(o); return k[(Math.random() * k.length) | 0]; };
  if (x < curseChance) return { kind: 'curse', id: pick(CURSES) };
  if (x < curseChance + 0.22) return { kind: 'ritual', id: pick(RITUALS) };
  return { kind: 'creature', id: pick(CREATURES), rarity: rollRarity() };
}

export function waveComposition(w) {
  const list = [];
  if (w % 5 === 0) list.push('inquisitor');
  let budget = 4 + w * 2.4 - (w % 5 === 0 ? 6 : 0);
  const opts = ['crusader', 'knight'];
  if (w >= 2) opts.push('priest');
  while (budget >= 2) {
    const k = opts[(Math.random() * opts.length) | 0];
    if (ENEMIES[k].cost > budget) { if (budget >= 2) { list.push('crusader'); budget -= 2; } continue; }
    list.push(k); budget -= ENEMIES[k].cost;
  }
  return list;
}
