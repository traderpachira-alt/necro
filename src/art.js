// Character sprite definitions. Every character = 12 frames of 48x48:
// 0-3 idle, 4-7 walk, 8-11 attack. Characters are drawn facing right.
import { Painter } from './pixel.js';

export const PAL = {
  bone: ['#8a7d66', '#d6ccb0', '#f7f1de'],
  boneDark: ['#5e5444', '#a89c80', '#d6ccb0'],
  steel: ['#454d5e', '#8c97aa', '#d6dde8'],
  darkSteel: ['#2a2e3a', '#535a6c', '#8a92a6'],
  gold: ['#8a5a14', '#d8a032', '#ffe48a'],
  robe: ['#170c28', '#33195a', '#56338a'],
  robeTrim: ['#3a2a10', '#9a7428', '#e0b85a'],
  zskin: ['#3b5528', '#6a8c43', '#9cbb6a'],
  apron: ['#4a3426', '#7d5a42', '#a8846a'],
  blood: ['#4a0a10', '#8a1420', '#c02838'],
  skin: ['#93573f', '#d59874', '#f3c6a2'],
  white: ['#8a879c', '#d6d2e2', '#ffffff'],
  red: ['#540e16', '#9e1c28', '#d8404a'],
  wood: ['#45291a', '#74492c', '#a57446'],
  flesh: ['#463646', '#7a6270', '#a68a92'],
  ghost: ['#24506e', '#5fb8d8', '#c4f2ff'],
  leather: ['#2e1e16', '#57392a', '#80583f'],
  black: ['#0c0a12', '#1e1a28', '#3a3448'],
};
const DARK = '#100a14';

const FRAMES = 12;
function posesHumanoid(anim, f) {
  const base = { bob: 0, lean: 0, ff: 2, fb: -2, lf: 0, lb: 0, aF: 1.2, aB: 1.85, wA: -0.95, cast: 0, draw: 0, cape: f % 4 };
  if (anim === 'idle') {
    const b = [0, 0, 1, 1][f];
    return { ...base, bob: b, aF: 1.2 + b * 0.06, aB: 1.85 - b * 0.05, wA: -0.95 + b * 0.06 };
  }
  if (anim === 'walk') {
    return {
      ...base, bob: [0, -1, 0, -1][f], ff: [4, 1, -2, 1][f], fb: [-3, 0, 3, 0][f], lf: [0, 1, 0, 0][f], lb: [0, 0, 0, 1][f],
      aF: [1.0, 1.2, 1.4, 1.2][f], aB: [2.1, 1.85, 1.6, 1.85][f], wA: [-1.05, -0.95, -0.85, -0.95][f],
    };
  }
  // attack
  return [
    { ...base, lean: -1, aF: -1.9, wA: -2.7, aB: 2.15, ff: 3, fb: -3, cast: 0.4, draw: 0.4 },
    { ...base, lean: 1, aF: -0.9, wA: -1.4, aB: 1.9, ff: 3, fb: -3, cast: 0.8, draw: 1 },
    { ...base, lean: 2, bob: 1, aF: 0.35, wA: 0.55, aB: 1.6, ff: 4, fb: -3, cast: 1, draw: 0 },
    { ...base, lean: 1, aF: 0.9, wA: 0.1, aB: 1.75, ff: 3, fb: -2, cast: 0.5, draw: 0 },
  ][f];
}
function animOf(i) { return i < 4 ? ['idle', i] : i < 8 ? ['walk', i - 4] : ['attack', i - 8]; }

// ---------- parts ----------
function leg(p, hx, hy, fx, lift, pal, boot) {
  const gy = 44 - lift;
  const kx = (hx + fx) / 2 + 1, ky = (hy + gy) / 2;
  p.line(hx, hy, kx, ky, pal[1], 3);
  p.line(kx, ky, fx, gy - 1, pal[1], 3);
  p.rect(fx - 1, gy - 2, 4, 2, boot[1]);
  p.px(fx + 3, gy - 1, boot[1]);
  p.px(fx - 1, gy - 2, boot[2]);
}
function torso(p, cx, top, bot, wTop, wBot, pal) {
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / Math.max(1, bot - top);
    const w = Math.round(wTop + (wBot - wTop) * t);
    const x0 = cx - Math.floor(w / 2);
    for (let x = x0; x < x0 + w; x++) {
      const nx = (x - x0) / Math.max(1, w - 1);
      p.px(x, y, nx < 0.28 ? pal[2] : nx > 0.78 ? pal[0] : pal[1]);
    }
  }
}
function robeSkirt(p, cx, top, pal, f, trim) {
  for (let y = top; y <= 44; y++) {
    const t = (y - top) / (44 - top);
    const w = Math.round(9 + t * 7);
    const sway = Math.round(Math.sin(f * 1.57 + t * 2) * t * 1.2);
    const x0 = cx - Math.floor(w / 2) + sway;
    for (let x = x0; x < x0 + w; x++) {
      const nx = (x - x0) / (w - 1);
      const fold = (x - x0 + Math.round(t * 2)) % 4 === 0;
      p.px(x, y, fold ? pal[0] : nx < 0.3 ? pal[2] : nx > 0.75 ? pal[0] : pal[1]);
    }
    if (trim && y >= 42) for (let x = x0; x < x0 + w; x++) p.px(x, y, trim[(x + y) % 3 === 0 ? 2 : 1]);
  }
}
function arm(p, sx, sy, ang, len, pal, hand) {
  const hx = sx + Math.cos(ang) * len, hy = sy + Math.sin(ang) * len;
  const ex = sx + Math.cos(ang) * len * 0.5, ey = sy + Math.sin(ang) * len * 0.5 + 0.5;
  p.line(sx, sy, ex, ey, pal[1], 3);
  p.line(ex, ey, hx, hy, pal[1], 2.6);
  p.disc(Math.round(hx), Math.round(hy), 1, hand[1]);
  return [Math.round(hx), Math.round(hy)];
}
function cape(p, sx, sy, pal, f, len = 18) {
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const wave = Math.sin(f * 1.57 + t * 4) * (1 + t * 2);
    const x = sx - 2 - t * 5 + wave;
    const w = 3 + t * 4;
    p.line(x, sy + i, x - w, sy + i, i % 5 === 0 ? pal[0] : pal[1]);
  }
}
function sword(p, hx, hy, a, len, blade, guard, hilt) {
  const dx = Math.cos(a), dy = Math.sin(a);
  p.line(hx - dx * 2, hy - dy * 2, hx, hy, hilt[1], 1);
  p.line(hx - dy * 2, hy + dx * 2, hx + dy * 2, hy - dx * 2, guard[1], 1);
  p.line(hx + dx, hy + dy, hx + dx * len, hy + dy * len, blade[1], 2);
  p.line(hx + dx * 2 - dy * 0.5, hy + dy * 2 + dx * 0.5, hx + dx * (len - 1), hy + dy * (len - 1), blade[2], 1);
}
function shield(p, cx, cy, pal, emblem, kite) {
  if (kite) {
    p.poly([[cx - 5, cy - 6], [cx + 5, cy - 6], [cx + 5, cy + 2], [cx, cy + 8], [cx - 5, cy + 2]], pal[1]);
    p.poly([[cx - 5, cy - 6], [cx - 1, cy - 6], [cx - 1, cy + 6], [cx - 5, cy + 2]], pal[2]);
    p.line(cx - 5, cy - 6, cx + 5, cy - 6, PAL.gold[1]);
    if (emblem) { p.line(cx, cy - 4, cx, cy + 4, emblem[1], 2); p.line(cx - 3, cy - 1, cx + 3, cy - 1, emblem[1], 2); p.px(cx - 1, cy - 2, emblem[2]); }
  } else {
    p.ball(cx, cy, 5, 6, pal);
    p.ellipse(cx, cy, 2, 2, emblem ? emblem[1] : pal[0]);
    p.px(cx - 1, cy - 1, emblem ? emblem[2] : pal[2]);
    for (let k = 0; k < 6; k++) { const a = k * 1.05; p.px(cx + Math.cos(a) * 4.4, cy + Math.sin(a) * 5.2, PAL.darkSteel[1]); }
  }
}

// ---------- heads ----------
const HEADS = {
  skull(p, x, y, f, glow = '#6ff7ff') {
    p.ball(x, y, 4, 4, PAL.bone);
    p.rect(x - 1, y + 3, 5, 2, PAL.bone[1]);
    p.px(x, y + 4, DARK); p.px(x + 2, y + 4, DARK);
    p.rect(x + 1, y - 1, 2, 2, DARK); p.glow(x + 2, y - 1, glow); p.halo(x + 2, y - 1, 2, glow, 90);
    p.px(x + 4, y + 1, DARK); p.px(x - 2, y - 2, PAL.bone[2]);
  },
  hood(p, x, y, f) {
    p.ball(x, y, 5, 5, PAL.robe);
    p.px(x - 5, y - 3, PAL.robe[1]); p.px(x - 6, y - 2, PAL.robe[0]);
    p.ellipse(x + 2, y + 1, 2.2, 3, '#05030a');
    p.glow(x + 2, y, '#8dff7a'); p.glow(x + 4, y, '#8dff7a');
    p.halo(x + 3, y, 3, '#5cff5a', 80);
    p.line(x - 3, y + 4, x + 4, y + 5, PAL.robeTrim[1]);
  },
  zombie(p, x, y) {
    p.ball(x, y, 4, 4, PAL.zskin);
    p.rect(x - 4, y - 5, 6, 2, '#2a2218'); p.px(x - 5, y - 3, '#2a2218'); p.px(x + 1, y - 5, '#2a2218');
    p.px(x + 2, y - 1, '#e8e0c8'); p.glow(x + 3, y - 1, '#ff3030'); p.halo(x + 3, y - 1, 2, '#ff2020', 70);
    p.rect(x + 2, y + 2, 3, 2, '#200c0c'); p.px(x + 3, y + 2, '#e8e0c8');
    p.line(x - 2, y - 2, x - 2, y + 2, '#2a3418');
  },
  helmet(p, x, y, f, plume = PAL.white) {
    p.ball(x, y, 4, 4.5, PAL.steel);
    p.rect(x, y - 1, 5, 1, DARK); p.px(x + 2, y + 1, DARK); p.px(x + 3, y + 1, DARK);
    p.line(x + 1, y - 4, x + 1, y + 4, PAL.gold[1]);
    const s = [0, 1, 1, 0][f % 4];
    p.line(x - 1, y - 5, x - 5 - s, y - 7, plume[1], 2); p.line(x - 4, y - 6, x - 7 - s, y - 4, plume[0], 2);
  },
  greathelm(p, x, y) {
    p.rect(x - 4, y - 4, 9, 9, PAL.steel[1]);
    p.rect(x - 4, y - 4, 3, 9, PAL.steel[2]); p.rect(x + 3, y - 4, 2, 9, PAL.steel[0]);
    p.rect(x - 4, y - 5, 9, 1, PAL.steel[2]);
    p.rect(x + 1, y - 1, 4, 1, DARK); p.rect(x + 2, y - 3, 1, 5, DARK);
    p.px(x - 3, y + 3, PAL.steel[0]); p.px(x - 1, y + 3, PAL.steel[0]);
  },
  priest(p, x, y) {
    p.ball(x, y + 1, 4, 3.5, PAL.skin);
    p.px(x + 2, y, '#2a1810'); p.px(x + 4, y + 2, PAL.skin[0]);
    p.poly([[x - 4, y - 2], [x + 4, y - 2], [x + 2, y - 9], [x, y - 10], [x - 2, y - 9]], PAL.white[1]);
    p.poly([[x - 4, y - 2], [x - 1, y - 2], [x - 1, y - 9], [x - 2, y - 9]], PAL.white[2]);
    p.line(x - 4, y - 2, x + 4, y - 2, PAL.gold[1]);
    p.line(x, y - 8, x, y - 4, PAL.gold[1]); p.line(x - 1, y - 6, x + 1, y - 6, PAL.gold[1]);
  },
  hunthood(p, x, y) {
    p.ball(x, y, 4.5, 4.5, ['#1a2a14', '#34502a', '#4e7040']);
    p.px(x - 5, y - 3, '#34502a'); p.px(x - 6, y - 1, '#1a2a14');
    p.ellipse(x + 2, y + 1, 2.2, 2.8, PAL.skin[1]);
    p.px(x + 3, y, '#1a1008'); p.px(x + 2, y + 3, PAL.skin[0]);
    p.line(x - 3, y + 4, x + 3, y + 5, '#6a4a2a');
  },
  firehood(p, x, y, f) {
    p.ball(x, y + 1, 4, 3.5, PAL.skin);
    p.px(x + 2, y, '#2a1810');
    p.poly([[x - 5, y - 1], [x + 4, y - 1], [x + 1, y - 9], [x - 2, y - 10]], '#9e2a1a');
    p.poly([[x - 5, y - 1], [x - 2, y - 1], [x - 2, y - 10]], '#e0602a');
    p.line(x - 5, y - 1, x + 4, y - 1, PAL.gold[1]);
    p.glow(x, y - 5, '#ffb030'); p.glow(x, y - 6, '#ffe080'); p.halo(x, y - 5, 2, '#ff8020', 90);
  },
  angel(p, x, y, f) {
    p.ball(x, y + 1, 4, 4, PAL.skin);
    p.rect(x - 4, y - 4, 7, 3, '#f0d070'); p.px(x - 5, y - 2, '#f0d070'); p.px(x - 5, y, '#d8b050'); p.px(x - 4, y + 2, '#d8b050');
    p.px(x + 2, y, '#3a6ad8'); p.glow(x + 2, y, '#bfe0ff');
    const hy = y - 8 + (f % 2 ? 0 : 0);
    for (let k = -4; k <= 4; k++) { p.glow(x + k, hy - (Math.abs(k) > 3 ? 0 : 1) + (Math.abs(k) === 4 ? 1 : 0), '#ffe890'); }
    p.halo(x, hy, 4, '#ffd85a', 110);
  },
  inquisitor(p, x, y) {
    p.ball(x, y + 1, 4, 4, PAL.skin);
    p.rect(x - 7, y - 3, 15, 2, PAL.black[1]); p.rect(x - 7, y - 3, 15, 1, PAL.black[2]);
    p.rect(x - 4, y - 8, 9, 5, PAL.black[1]); p.rect(x - 4, y - 8, 3, 5, PAL.black[2]);
    p.rect(x - 4, y - 4, 9, 1, PAL.red[1]);
    p.rect(x + 1, y - 1, 4, 1, '#3a2010'); p.glow(x + 3, y, '#ffcf4a');
    p.rect(x, y + 3, 5, 2, '#5a3a2a');
  },
};

// ---------- humanoid ----------
function humanoid(p, c, ps, f) {
  const cx = 21 + ps.lean, hip = 32 + ps.bob, sh = 21 + ps.bob;
  const legs = c.legs || PAL.leather, boots = c.boots || PAL.leather;
  if (c.wings) {
    const flap = [0, 1, 2, 1][f % 4];
    for (let k = 0; k < 7; k++) {
      const a = -2.3 - k * 0.12 + flap * 0.08, len = 16 - k;
      const x0 = cx - 3, y0 = sh + 2 + k * 1.5;
      p.line(x0, y0, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len - flap, k % 2 ? c.wings[1] : c.wings[2], 2.5);
    }
    for (let k = 0; k < 4; k++) p.softGlow(cx - 10 - k * 2, sh - 6 + k, '#fff2c0', 60);
  }
  if (c.cape) cape(p, cx - 1, sh + 1, c.cape, ps.cape, c.robe ? 20 : 16);
  // back arm
  const backHand = arm(p, cx - 2, sh + 2, ps.aB, c.armLen || 8, c.sleeve || c.body, c.hand || PAL.skin);
  if (c.robe) {
    robeSkirt(p, cx, hip - 3, c.body, f, c.trim);
  } else {
    leg(p, cx - 2, hip, cx + ps.fb, ps.lb, legs, boots);
    leg(p, cx + 1, hip, cx + ps.ff, ps.lf, legs, boots);
  }
  torso(p, cx, sh, hip, c.wide ? 12 : 10, c.wide ? 11 : 8, c.body);
  if (c.belly) p.ball(cx + 3, hip - 4, 4, 4, c.belly);
  if (c.tabard) {
    for (let y = sh + 2; y <= hip + 5; y++) p.line(cx - 2, y, cx + 2, y, c.tabard[y % 5 === 0 ? 0 : 1]);
    p.line(cx, sh + 4, cx, sh + 11, PAL.white[2]); p.line(cx - 2, sh + 6, cx + 2, sh + 6, PAL.white[2]);
  }
  if (c.ribs) for (let y = sh + 3; y < hip - 1; y += 2) p.line(cx - 3, y, cx + 3, y, PAL.bone[1]);
  if (c.belt) { p.line(cx - 5, hip - 1, cx + 4, hip - 1, c.belt[1]); p.px(cx + 1, hip - 1, PAL.gold[2]); }
  if (c.trim && c.robe) { p.line(cx + 1, sh + 1, cx + 1, 44, c.trim[1]); }
  if (c.pauldron) { p.ball(cx - 3, sh + 1, 3, 2.5, c.pauldron); p.ball(cx + 3, sh + 1, 3, 2.5, c.pauldron); }
  // shield (held on back arm, drawn in front of body)
  if (c.shield) shield(p, cx + 6, sh + 8 + ps.bob * 0, c.shield, c.emblem, c.kite);
  HEADS[c.head](p, cx + 1, sh - 5, f, c.eye);
  // front arm + weapon
  if (c.weapon === 'bow') {
    const hand = arm(p, cx + 3, sh + 2, -0.05, 9, c.sleeve || c.body, c.hand || PAL.skin);
    const [hx, hy] = hand;
    const pull = ps.draw * 5;
    // bow arc
    for (let k = -8; k <= 8; k++) { const bx = hx + Math.round(2.5 * Math.cos((k / 8) * 1.4)); p.px(bx, hy + k, k % 3 === 0 ? PAL.bone[2] : PAL.wood[1]); p.px(bx + 1, hy + k, PAL.wood[0]); }
    p.line(hx, hy - 8, hx - pull, hy, '#e8e4d8'); p.line(hx - pull, hy, hx, hy + 8, '#e8e4d8');
    if (ps.draw > 0) { p.line(hx - pull, hy, hx + 6, hy, PAL.bone[1]); p.glow(hx + 6, hy, '#9ff7ff'); p.halo(hx + 6, hy, 2, '#6ff7ff', 90); }
    arm(p, cx - 1, sh + 3, -0.1 + ps.draw * 0.2, 6 - pull * 0.6 + 4, c.sleeve || c.body, c.hand || PAL.skin);
    return;
  }
  const aF = c.weapon === 'staff' ? 1.15 - ps.cast * 1.0 : ps.aF;
  const hand = arm(p, cx + 3, sh + 2, aF, c.armLen || 8, c.sleeve || c.body, c.hand || PAL.skin);
  const [hx, hy] = hand;
  if (c.weapon === 'sword') sword(p, hx, hy, ps.wA, 11, PAL.steel, PAL.gold, PAL.leather);
  if (c.weapon === 'rustsword') sword(p, hx, hy, ps.wA, 10, PAL.boneDark, PAL.darkSteel, PAL.wood);
  if (c.weapon === 'greatsword') { sword(p, hx, hy, ps.wA, 15, PAL.steel, PAL.gold, PAL.red); if (ps.cast > 0.7) p.halo(hx + Math.cos(ps.wA) * 10, hy + Math.sin(ps.wA) * 10, 3, '#ffd36a', 70); }
  if (c.weapon === 'cleaver') {
    const dx = Math.cos(ps.wA), dy = Math.sin(ps.wA);
    p.line(hx - dx * 2, hy - dy * 2, hx + dx * 3, hy + dy * 3, PAL.wood[1], 2);
    const bx = hx + dx * 3, by = hy + dy * 3;
    p.poly([[bx, by], [bx + dx * 8, by + dy * 8], [bx + dx * 8 + dy * 4, by + dy * 8 - dx * 4], [bx + dy * 4, by - dx * 4]], PAL.steel[1]);
    p.line(bx + dx * 8, by + dy * 8, bx, by, PAL.steel[2]);
    p.px(bx + dx * 5 + dy * 2, by + dy * 5 - dx * 2, PAL.blood[1]); p.px(bx + dx * 6 + dy * 3, by + dy * 6 - dx * 3, PAL.blood[2]);
  }
  if (c.weapon === 'staff') {
    const tilt = ps.cast * 0.35;
    const tx = hx + Math.sin(tilt) * 13, ty = Math.max(9, hy - Math.cos(tilt) * 13);
    const bx = hx - Math.sin(tilt) * 9, by = Math.min(44, hy + Math.cos(tilt) * 9);
    p.line(bx, by, tx, ty, c.staffWood || PAL.wood[1], 2);
    p.line(bx + 0.5, by, tx + 0.5, ty, (c.staffWoodHi || PAL.wood[2]), 1);
    if (c.staffTop === 'skull') {
      p.ball(tx, ty - 2, 3, 3, PAL.bone);
      p.px(tx + 1, ty - 2, DARK); p.px(tx + 2, ty - 1, DARK);
      const gc = '#7dff6a';
      p.glow(tx, ty - 6, gc); p.glow(tx + 1, ty - 6, gc); p.glow(tx, ty - 7, '#d4ffc8'); p.glow(tx - 1, ty - 6, gc); p.glow(tx, ty - 5, gc);
      p.halo(tx, ty - 6, 3 + Math.round(ps.cast * 3), '#4cff4a', 100 + ps.cast * 80);
      p.line(tx - 3, ty, tx - 4, ty + 3, PAL.bone[1]); p.line(tx + 3, ty, tx + 4, ty + 3, PAL.bone[1]);
    } else if (c.staffTop === 'fire') {
      p.ball(tx, ty - 1, 2.5, 2, PAL.gold);
      const fl = [0, 1, 0, -1][f % 4];
      p.glow(tx, ty - 4, '#ff8020'); p.glow(tx + fl, ty - 5, '#ffb030'); p.glow(tx, ty - 6, '#ffe080'); p.glow(tx - 1, ty - 4, '#ff6010'); p.glow(tx + 1, ty - 4, '#ff6010');
      p.halo(tx, ty - 5, 3 + Math.round(ps.cast * 3), '#ff7020', 110 + ps.cast * 80);
    } else {
      p.line(tx, ty - 6, tx, ty, PAL.gold[1], 2); p.line(tx - 3, ty - 4, tx + 3, ty - 4, PAL.gold[1], 2);
      p.px(tx - 1, ty - 6, PAL.gold[2]);
      p.glow(tx, ty - 4, '#fff6c8'); p.halo(tx, ty - 4, 3 + Math.round(ps.cast * 3), '#ffd85a', 90 + ps.cast * 80);
    }
  }
}

// ---------- custom bodies ----------
function golem(p, i, o = {}) {
  const [anim, f] = animOf(i);
  let bob = 0, ff = 2, fb = -3, lf = 0, lb = 0, aF = 1.4, raise = 0, lean = 0;
  if (anim === 'idle') bob = [0, 0, 1, 1][f];
  if (anim === 'walk') { bob = [0, -1, 0, -1][f]; ff = [4, 1, -2, 1][f]; fb = [-4, -1, 2, -1][f]; lf = [0, 1, 0, 0][f]; lb = [0, 0, 0, 1][f]; }
  if (anim === 'attack') { raise = [1, 1.2, 0, 0.2][f]; lean = [-1, -2, 3, 1][f]; bob = [0, -1, 2, 1][f]; }
  const cx = 21 + lean, hip = 33 + bob, sh = 17 + bob;
  const F = o.pal || PAL.flesh;
  if (o.catapult) {
    // bone catapult strapped to the back; arm swings forward on attack
    const sw = anim === 'attack' ? [-0.2, -0.5, 1.2, 0.8][f] : 0;
    const ax = cx - 8, ay = sh + 4, len = 16, a = -1.9 + sw;
    p.line(ax, ay + 6, ax - 4, ay - 2, PAL.wood[1], 2);
    p.line(ax, ay, ax + Math.cos(a) * len, ay + Math.sin(a) * len, PAL.bone[1], 2);
    const bx = ax + Math.cos(a) * len, by = ay + Math.sin(a) * len;
    p.ball(bx, by, 3, 2.5, PAL.wood);
    if (anim !== 'attack' || f < 2) p.ball(bx, by - 2, 2.5, 2.5, PAL.bone);
  }
  leg(p, cx - 4, hip, cx - 4 + fb, lb, F, PAL.leather);
  leg(p, cx + 3, hip, cx + 4 + ff, lf, F, PAL.leather);
  // back arm
  const bA = raise ? -1.6 : 1.7;
  const bh = arm(p, cx - 6, sh + 3, bA, 11, F, F); p.ball(bh[0], bh[1], 3, 3, F);
  // body
  p.ball(cx, sh + 8, 10, 9, F);
  p.ball(cx + 3, hip - 4, 7, 5, F);
  // stitches
  for (const [a, b, c2, d] of [[cx - 6, sh + 3, cx + 2, sh + 13], [cx + 4, sh + 2, cx + 8, sh + 10]]) {
    p.line(a, b, c2, d, '#2a1a22');
    for (let k = 0; k <= 4; k++) { const x = a + ((c2 - a) * k) / 4, y = b + ((d - b) * k) / 4; p.px(x - 1, y + 1, '#c8b0b4'); p.px(x + 1, y - 1, '#c8b0b4'); }
  }
  // bone spikes
  p.line(cx - 7, sh - 1, cx - 9, sh - 5, PAL.bone[1], 2); p.line(cx - 3, sh - 2, cx - 4, sh - 6, PAL.bone[2], 2);
  p.rect(cx - 2, hip - 2, 9, 2, PAL.leather[1]);
  // head sunk into shoulders
  p.ball(cx + 5, sh - 1, 3.5, 3, F);
  const eye = o.eye || '#ffb340';
  p.glow(cx + 7, sh - 1, eye); p.halo(cx + 7, sh - 1, 2, eye, 80);
  if (o.blood) { p.px(cx - 2, sh + 6, PAL.blood[1]); p.px(cx - 1, sh + 7, PAL.blood[2]); p.px(cx + 6, sh + 12, PAL.blood[1]); p.rect(cx - 5, hip - 3, 3, 2, PAL.blood[0]); }
  p.line(cx + 4, sh + 1, cx + 8, sh + 1, '#2a1a22');
  // front arm with big fist
  const fA = raise > 0.9 ? -1.4 : raise > 0 ? -0.8 : anim === 'attack' && f === 2 ? 0.9 : aF;
  const h = arm(p, cx + 7, sh + 3, fA, 11, F, F);
  p.ball(h[0], h[1], 3.5, 3.5, F);
  p.px(h[0] + 1, h[1] - 2, PAL.bone[2]);
  if (anim === 'attack' && f === 2) { for (let k = 0; k < 7; k++) p.halo(h[0] + 2, 44, 4, '#c8a070', 60); }
}

function wolf(p, i, o = {}) {
  const [anim, f] = animOf(i);
  const G = o.pal || PAL.ghost;
  const EYE = o.eye || '#9ff7ff';
  let bob = 0, lunge = 0, jaw = 0, run = 0;
  if (anim === 'idle') bob = [0, 0, 1, 1][f];
  if (anim === 'walk') { run = f; bob = [0, -2, 0, -1][f]; }
  if (anim === 'attack') { lunge = [-2, 4, 7, 2][f]; jaw = [0, 2, 3, 1][f]; bob = [1, -2, 0, 0][f]; }
  const cx = 20 + lunge, by = 32 + bob;
  // wisp tail
  for (let k = 0; k < 9; k++) {
    const x = cx - 10 - k, y = by - 3 - Math.sin(k * 0.7 + f * 1.5) * 2 - k * 0.3;
    p.disc(x, y, Math.max(0, 2 - k * 0.2), k < 4 ? G[1] : G[0], 255 - k * 22);
  }
  // legs (4)
  const ph = [[3, -3, -2, 2], [1, -1, 0, 0], [-3, 3, 2, -2], [-1, 1, 0, 0]][anim === 'walk' ? run : 1];
  const legsX = [cx - 7, cx - 4, cx + 5, cx + 8];
  legsX.forEach((lx, k) => {
    const off = anim === 'walk' ? ph[k] : anim === 'attack' ? [-2, -1, 2, 3][k] * (f === 2 ? 1 : 0) : 0;
    const back = k < 2;
    p.line(lx, by + 2, lx + off, 44 - (anim === 'walk' && Math.abs(off) < 1 ? 1 : 0), back ? G[0] : G[1], 2.5);
    p.px(lx + off + 1, 44, G[2]);
  });
  // body
  p.ball(cx, by - 1, 10, 5, G);
  p.ball(cx + 6, by - 3, 5, 5, G);
  // ribs (spectral)
  for (let k = 0; k < 4; k++) p.line(cx - 4 + k * 3, by - 4, cx - 5 + k * 3, by + 1, G[0]);
  // head
  const hx = cx + 12, hy = by - 6;
  p.ball(hx, hy, 4, 3.5, G);
  p.poly([[hx + 2, hy - 1], [hx + 8, hy + 1], [hx + 7, hy + 2], [hx + 2, hy + 2]], G[1]);
  if (jaw) { p.poly([[hx + 1, hy + 2], [hx + 7, hy + 2 + jaw], [hx + 1, hy + 4]], G[0]); p.px(hx + 4, hy + 2, '#ffffff'); p.px(hx + 6, hy + 2 + jaw - 1, '#ffffff'); }
  else p.line(hx + 2, hy + 2, hx + 7, hy + 2, G[0]);
  p.poly([[hx - 3, hy - 2], [hx - 1, hy - 8], [hx + 1, hy - 3]], G[1]);
  p.poly([[hx - 1, hy - 2], [hx + 2, hy - 7], [hx + 3, hy - 2]], G[2]);
  p.px(hx + 8, hy, '#1a2a3a');
  p.glow(hx + 2, hy - 1, '#ffffff'); p.glow(hx + 3, hy - 1, EYE); p.halo(hx + 3, hy - 1, 3, EYE, 100);
  // ghost glow on body edge
  for (let k = 0; k < 6; k++) p.softGlow(cx - 6 + k * 3, by - 7, o.aura || '#5fd8ff', 60);
}

function banshee(p, i) {
  const [anim, f] = animOf(i);
  const G = ['#3a5a74', '#8ec8dc', '#e6fbff'];
  let bob = [0, -1, -2, -1][f], arms = 0;
  if (anim === 'attack') { arms = [0.5, 1, 1, 0.4][f]; }
  const cx = 22, top = 12 + bob;
  // hair flowing back
  for (let k = 0; k < 14; k++) {
    const t = k / 14;
    const x = cx - 2 - t * 9 + Math.sin(f * 1.57 + t * 5) * 1.5, y = top + 2 + t * 14;
    p.disc(x, y, 2 - t, k % 3 === 0 ? '#c6d8e8' : '#e8f4ff', 255 - k * 8);
  }
  // dress fading into wisps
  for (let y = top + 9; y <= 44; y++) {
    const t = (y - top - 9) / (44 - top - 9);
    const w = Math.round(7 + t * 8);
    const sway = Math.sin(f * 1.57 + t * 4) * t * 2;
    const x0 = Math.round(cx - w / 2 + sway - t * 2);
    const a = Math.round(255 * (1 - Math.pow(t, 1.6) * 0.85));
    for (let x = x0; x < x0 + w; x++) {
      if (t > 0.6 && (x + y + f) % 3 === 0) continue;
      const nx = (x - x0) / (w - 1);
      p.px(x, y, nx < 0.3 ? G[2] : nx > 0.75 ? G[0] : G[1], a);
    }
  }
  // torso
  torso(p, cx, top + 7, top + 13, 7, 6, G);
  // arms
  const aA = 1.2 - arms * 2.2, aB = 1.7 - arms * 1.6;
  arm(p, cx - 2, top + 8, aB, 8, G, G);
  const h = arm(p, cx + 2, top + 8, aA, 8, G, G);
  if (arms > 0.5) { p.glow(h[0], h[1], '#b8fff0'); p.halo(h[0], h[1], 4, '#5cffc8', 130); }
  // head
  p.ball(cx + 1, top + 3, 3.5, 4, ['#9fb8c8', '#dceef6', '#ffffff']);
  p.rect(cx - 3, top - 1, 6, 2, '#e8f4ff');
  p.glow(cx + 3, top + 3, '#7affd8'); p.px(cx + 3, top + 5, '#2a3a4a'); p.px(cx + 2, top + 6, '#2a3a4a');
  p.halo(cx + 3, top + 3, 2, '#4affd0', 90);
  for (let k = 0; k < 5; k++) p.softGlow(cx - 4 + k * 2, 40 + (k % 2), '#7ff8ff', 50);
}

// ---------- configs ----------
const HUMANOIDS = {
  necro: { head: 'hood', body: PAL.robe, robe: true, trim: PAL.robeTrim, cape: ['#120820', '#24103e', '#3a1e5e'], weapon: 'staff', staffTop: 'skull', hand: PAL.bone, sleeve: PAL.robe, staffWood: '#3a2a3a', staffWoodHi: '#6a5470' },
  guard: { head: 'skull', body: PAL.darkSteel, legs: PAL.bone, boots: PAL.darkSteel, hand: PAL.bone, sleeve: PAL.bone, weapon: 'rustsword', shield: PAL.wood, emblem: PAL.bone, pauldron: PAL.darkSteel, belt: PAL.leather },
  butcher: { head: 'zombie', body: PAL.apron, legs: PAL.zskin, boots: PAL.leather, hand: PAL.zskin, sleeve: PAL.zskin, weapon: 'cleaver', wide: true, belly: ['#5a3a2a', '#86604a', '#a88468'], belt: PAL.blood, armLen: 9 },
  archer: { head: 'skull', body: PAL.leather, legs: PAL.bone, boots: PAL.leather, hand: PAL.bone, sleeve: PAL.bone, weapon: 'bow', ribs: true, cape: ['#1e2a1a', '#34452a', '#4a603a'] },
  knight: { head: 'helmet', body: PAL.steel, legs: PAL.darkSteel, boots: PAL.steel, hand: PAL.steel, sleeve: PAL.steel, weapon: 'sword', shield: PAL.white, emblem: PAL.gold, kite: true, pauldron: PAL.steel, belt: PAL.gold, cape: PAL.white },
  crusader: { head: 'greathelm', body: PAL.darkSteel, legs: PAL.darkSteel, boots: PAL.steel, hand: PAL.steel, sleeve: PAL.steel, weapon: 'sword', tabard: PAL.red, belt: PAL.leather, cape: PAL.red },
  priest: { head: 'priest', body: PAL.white, robe: true, trim: PAL.gold, weapon: 'staff', staffTop: 'cross', hand: PAL.skin, sleeve: PAL.white, staffWood: '#c8a040', staffWoodHi: '#ffe48a' },
  screamer: { head: 'skull', eye: '#7affd8', body: ['#24506e', '#5fb8d8', '#c4f2ff'], legs: PAL.ghost, boots: PAL.ghost, hand: PAL.bone, sleeve: PAL.ghost, weapon: 'bow', ribs: true, cape: ['#1a3a4a', '#4a90a8', '#9ae0f0'] },
  paladin: { head: 'helmet', body: ['#6a5420', '#c8a040', '#f0d890'], legs: PAL.steel, boots: PAL.gold, hand: PAL.steel, sleeve: PAL.steel, weapon: 'sword', shield: PAL.gold, emblem: PAL.white, kite: true, pauldron: PAL.gold, belt: PAL.white, cape: ['#6a6a8a', '#c8c8e8', '#ffffff'], wide: true },
  hunter: { head: 'hunthood', body: ['#1e3a1e', '#3e6a32', '#6a9a4a'], legs: PAL.leather, boots: PAL.leather, hand: PAL.skin, sleeve: ['#1e3a1e', '#3e6a32', '#6a9a4a'], weapon: 'bow', cape: ['#1a2a14', '#34502a', '#4e7040'], belt: PAL.leather },
  firepriest: { head: 'firehood', body: ['#4a0e0e', '#9e2a1a', '#e0602a'], robe: true, trim: PAL.gold, weapon: 'staff', staffTop: 'fire', hand: PAL.skin, sleeve: ['#4a0e0e', '#9e2a1a', '#e0602a'], staffWood: '#6a3a1a', staffWoodHi: '#a8683a' },
  archangel: { head: 'angel', body: ['#8a6a20', '#e0b848', '#fff0a8'], legs: PAL.gold, boots: PAL.gold, hand: PAL.skin, sleeve: PAL.gold, weapon: 'greatsword', wings: ['#a8a8c8', '#e8e8f8', '#ffffff'], cape: PAL.white, pauldron: PAL.gold, belt: PAL.white, wide: true },
  inquisitor: { head: 'inquisitor', body: PAL.black, robe: true, trim: PAL.red, cape: PAL.red, weapon: 'greatsword', hand: PAL.leather, sleeve: PAL.black, pauldron: PAL.steel, wide: true },
};

export const SPRITE_KEYS = ['necro', 'guard', 'golem', 'butcher', 'wolf', 'archer', 'banshee', 'cavalry', 'giant', 'screamer', 'hound', 'catapult', 'knight', 'crusader', 'priest', 'inquisitor', 'paladin', 'hunter', 'firepriest', 'archangel'];

// copy the opaque pixels of `src` (rows < maxRow) onto `dst`, shifted by (dx, dy)
function overlay(dst, src, dx, dy, maxRow) {
  for (let y = 0; y < Math.min(maxRow, src.h); y++) for (let x = 0; x < src.w; x++) {
    const i = (y * src.w + x) * 4;
    const tx = x + dx, ty = y + dy;
    if (tx < 0 || ty < 0 || tx >= dst.w || ty >= dst.h) continue;
    const j = (ty * dst.w + tx) * 4;
    if (src.c[i + 3] > 0) { for (let k = 0; k < 4; k++) dst.c[j + k] = src.c[i + k]; dst.flat[ty * dst.w + tx] = src.flat[y * src.w + x]; }
    if (src.g[i + 3] > 0) for (let k = 0; k < 4; k++) dst.g[j + k] = src.g[i + k];
  }
}

export function buildFrames(key) {
  const out = [];
  for (let i = 0; i < FRAMES; i++) {
    out.push(rawFrame(key, i).finalize());
  }
  return out;
}

function rawFrame(key, i) {
  const p = new Painter(48, 48);
  if (key === 'golem') golem(p, i);
  else if (key === 'giant') golem(p, i, { pal: ['#3a4a2a', '#6a7d48', '#9aac74'], eye: '#ff4030', blood: true });
  else if (key === 'catapult') golem(p, i, { pal: ['#4a4440', '#8a8070', '#b8ac98'], eye: '#6ff7ff', catapult: true });
  else if (key === 'wolf') wolf(p, i);
  else if (key === 'hound') wolf(p, i, { pal: ['#1e4a3a', '#3fd8a0', '#c0ffe8'], eye: '#b8ffd0', aura: '#4affb0' });
  else if (key === 'cavalry') {
    wolf(p, i, { pal: ['#3a3446', '#8a8098', '#cfc6dc'], eye: '#6ff7ff' });
    const rider = rawFrame('guard', i < 8 ? i % 4 : i);
    overlay(p, rider, -4, -10, 32);
  } else if (key === 'banshee') banshee(p, i);
  else { const [anim, f] = animOf(i); humanoid(p, HUMANOIDS[key], posesHumanoid(anim, f), f); }
  return p;
}
