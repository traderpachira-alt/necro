// Procedural pixel-art graveyard backdrop (painted at half resolution, scaled x2 in game).
import { rgb, shade, mix } from './pixel.js';

export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const BG_W = 270, BG_H = 285;

export function paintBackground() {
  const W = BG_W, H = BG_H, r = rng(1337);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H), d = img.data;
  const glowCv = document.createElement('canvas'); glowCv.width = W; glowCv.height = H;
  const gctx = glowCv.getContext('2d'); const gimg = gctx.createImageData(W, H), gd = gimg.data;
  const put = (x, y, c, a = 255) => {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, v = rgb(c), t = a / 255;
    d[i] = d[i] * (1 - t) + v[0] * t; d[i + 1] = d[i + 1] * (1 - t) + v[1] * t; d[i + 2] = d[i + 2] * (1 - t) + v[2] * t; d[i + 3] = 255;
  };
  const glow = (x, y, c, a = 255) => {
    put(x, y, c);
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, v = rgb(c);
    gd[i] = v[0]; gd[i + 1] = v[1]; gd[i + 2] = v[2]; gd[i + 3] = Math.max(gd[i + 3], a);
  };
  const HOR = 142;
  // sky gradient with dithering
  const skyTop = '#0a0616', skyMid = '#22143e', skyLow = '#3c2350';
  for (let y = 0; y < HOR + 30; y++) for (let x = 0; x < W; x++) {
    const t = y / (HOR + 30);
    const dither = ((x + y) % 2) * 0.03;
    const c = t < 0.6 ? mix(skyTop, skyMid, t / 0.6 + dither) : mix(skyMid, skyLow, (t - 0.6) / 0.4 + dither);
    put(x, y, c);
  }
  // stars
  for (let k = 0; k < 90; k++) {
    const x = r() * W, y = r() * (HOR - 30);
    const b = r();
    if (b > 0.9) { glow(x, y, '#ffffff', 200); glow(x + 1, y, '#8c7cc8', 90); glow(x - 1, y, '#8c7cc8', 90); glow(x, y + 1, '#8c7cc8', 90); glow(x, y - 1, '#8c7cc8', 90); }
    else put(x, y, b > 0.5 ? '#b8a8e8' : '#6c5c98', 160 + b * 90);
  }
  // moon with halo
  const mx = 205, my = 86, mr = 17;
  for (let y = -mr * 3; y <= mr * 3; y++) for (let x = -mr * 3; x <= mr * 3; x++) {
    const dd = Math.sqrt(x * x + y * y);
    if (dd > mr && dd < mr * 3) put(mx + x, my + y, '#b8a0e8', Math.max(0, 40 * (1 - (dd - mr) / (mr * 2))));
  }
  for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
    const dd = Math.sqrt(x * x + y * y);
    if (dd > mr) continue;
    const l = -(x * 0.5 + y * 0.5) / mr;
    let c = l > 0.3 ? '#fff8ec' : l > -0.35 ? '#e8dcd0' : '#bcaac0';
    glow(mx + x, my + y, c, 150);
  }
  for (const [cx, cy, cr] of [[-5, -4, 4], [6, 3, 3], [-2, 8, 2.5], [8, -7, 2], [-9, 5, 1.6]]) {
    for (let y = -cr; y <= cr; y++) for (let x = -cr; x <= cr; x++) if (x * x + y * y <= cr * cr) put(mx + cx + x, my + cy + y, '#b0a0b4', 150);
  }
  // clouds over moon
  for (let k = 0; k < 5; k++) {
    const cy = 66 + k * 9 + r() * 6, cx0 = r() * W, len = 40 + r() * 60;
    for (let x = 0; x < len; x++) {
      const th = Math.sin((x / len) * Math.PI) * (3 + r() * 0.5);
      for (let y = 0; y < th; y++) put(cx0 + x, cy - y, y < 1 ? '#5a4478' : '#3a2858', 170);
    }
  }
  // far mountains
  const ridge = (base, amp, freq, col, seedOff) => {
    for (let x = 0; x < W; x++) {
      const h = base - (Math.sin(x * freq + seedOff) * amp + Math.sin(x * freq * 2.7 + seedOff * 2) * amp * 0.45 + Math.sin(x * freq * 6.1) * amp * 0.15);
      for (let y = Math.floor(h); y < HOR + 40; y++) put(x, y, col);
    }
  };
  ridge(HOR - 34, 12, 0.025, '#1e1436', 1);
  ridge(HOR - 18, 9, 0.04, '#170f2a', 4);
  // cathedral silhouette on the right (where the holy army comes from)
  const cath = (x0, base) => {
    const col = '#100a1e';
    const rect = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, col); };
    rect(x0, base - 26, 34, 26); rect(x0 + 4, base - 44, 8, 18); rect(x0 + 22, base - 40, 8, 14);
    for (let i = 0; i < 6; i++) { rect(x0 + 8 - i, base - 44 - i * 3, 1 + i * 0, 3); }
    for (let i = 0; i < 9; i++) rect(x0 + 8 - Math.floor(i / 2.2), base - 44 - i * 2, 1 + Math.floor(i / 1.1) * 0 + 1, 2);
    for (let i = 0; i < 12; i++) rect(x0 + 6 + Math.floor(i / 3), base - 56 + i, 6 - Math.floor(i / 3) * 2 > 0 ? 6 - Math.floor(i / 3) * 2 : 1, 1);
    rect(x0 + 7, base - 64, 1, 8); rect(x0 + 5, base - 61, 5, 1);
    rect(x0 + 24, base - 50, 4, 10); rect(x0 + 25, base - 55, 2, 5);
    rect(x0 + 14, base - 32, 6, 6);
    // lit windows
    const win = (x, y, h) => { for (let j = 0; j < h; j++) glow(x0 + x, base + y + j, j === 0 ? '#ffe9a0' : '#ffb84a', 200); };
    win(7, -38, 4); win(25, -34, 3); win(16, -22, 5); win(10, -18, 4); win(22, -18, 4); win(29, -14, 3);
    for (let i = 0; i < 3; i++) glow(x0 + 16 + (i % 2), base - 30 + i, '#ffd060', 220);
  };
  cath(214, HOR - 6);
  // near hills
  ridge(HOR + 2, 5, 0.05, '#120c1e', 7);
  // ground
  for (let y = HOR - 2; y < H; y++) {
    const t = (y - HOR) / (H - HOR);
    for (let x = 0; x < W; x++) {
      const n = r();
      let c = mix('#1c1426', '#2a1c2a', Math.max(0, Math.min(1, t * 1.4)));
      if (n > 0.86) c = shade(c, 0.12); else if (n < 0.1) c = shade(c, -0.25);
      put(x, y, c);
    }
  }
  // path (lighter dirt band where battle happens)
  for (let y = 180; y < 272; y++) for (let x = 0; x < W; x++) {
    const edge = Math.min(y - 180, 272 - y);
    const a = Math.min(1, edge / 10) * 0.55;
    if (r() < 0.85) put(x, y, (x * 7 + y * 13) % 11 === 0 ? '#4a3438' : '#3a2a30', a * 255);
  }
  // pebbles and bones on path
  for (let k = 0; k < 70; k++) {
    const x = r() * W, y = 175 + r() * 100;
    const big = r() > 0.7;
    put(x, y, big ? '#5a4650' : '#4a3a44'); if (big) { put(x + 1, y, '#6a5660'); put(x, y + 1, '#2a1e26'); }
  }
  for (let k = 0; k < 10; k++) {
    const x = 20 + r() * 200, y = 185 + r() * 85;
    put(x, y, '#9a907a'); put(x + 1, y, '#c8bc9e'); put(x + 2, y, '#c8bc9e'); put(x + 3, y, '#9a907a'); put(x, y - 1, '#9a907a'); put(x + 3, y + 1, '#9a907a');
  }
  // grass tufts
  for (let k = 0; k < 160; k++) {
    const x = r() * W, y = HOR + r() * (H - HOR);
    if (y > 182 && y < 268 && r() < 0.8) continue;
    const g = r() > 0.5 ? '#2e3a2a' : '#3e4a30';
    put(x, y, g); put(x, y - 1, g); if (r() > 0.5) put(x + 1, y - 2, '#56603e');
  }
  // tombstones (left/back = necromancer side)
  const tomb = (x, y, w, h, kind) => {
    const S = ['#2c2638', '#4a4258', '#6a627a'];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const top = kind === 0 && j < w / 2 && Math.hypot(i - w / 2 + 0.5, j - w / 2) > w / 2;
      if (top) continue;
      put(x + i, y + j, i === 0 || j === 0 ? S[2] : i === w - 1 ? S[0] : S[1]);
    }
    if (kind === 1) { for (let j = -5; j < 0; j++) put(x + w / 2, y + j, S[1]); for (let i = -2; i <= 2; i++) put(x + w / 2 + i, y - 3, S[1]); }
    for (let i = -1; i <= w; i++) put(x + i, y + h, '#120a14');
    put(x + 2, y + 4, S[0]); put(x + 3, y + 4, S[0]); put(x + 2, y + 6, S[0]);
    if (r() > 0.5) { put(x + w - 2, y + 2, '#3a4a2a'); put(x + w - 2, y + 3, '#3a4a2a'); }
  };
  for (const [x, y, w, h, k] of [[6, 150, 9, 13, 0], [28, 156, 7, 10, 1], [50, 149, 8, 12, 0], [74, 158, 6, 9, 0], [96, 152, 7, 11, 1], [118, 147, 6, 9, 0], [4, 176, 10, 15, 1], [40, 168, 9, 12, 0], [12, 270, 12, 14, 0], [64, 274, 8, 10, 1], [150, 152, 6, 8, 0]]) tomb(x, y, w, h, k);
  // dead trees
  const tree = (x, y, h, dir) => {
    const col = '#0e0a14';
    let cx = x;
    for (let j = 0; j < h; j++) { const w = Math.max(1, Math.round((h - j) / h * 3)); for (let i = 0; i < w; i++) put(cx + i, y - j, col); if (j % 6 === 5) cx += dir * (r() > 0.5 ? 1 : 0); }
    const br = (bx, by, len, ang, dep) => {
      for (let k = 0; k < len; k++) put(bx + Math.cos(ang) * k, by + Math.sin(ang) * k, col);
      if (dep > 0) { br(bx + Math.cos(ang) * len, by + Math.sin(ang) * len, len * 0.65, ang - 0.5, dep - 1); br(bx + Math.cos(ang) * len, by + Math.sin(ang) * len, len * 0.6, ang + 0.45, dep - 1); }
    };
    br(cx, y - h, 10, -1.6 + dir * 0.4, 3); br(cx, y - h * 0.6, 9, -2.4, 2); br(cx + 1, y - h * 0.7, 9, -0.6, 2);
  };
  tree(20, 150, 46, 1); tree(140, 146, 30, -1); tree(254, 160, 40, -1);
  // fence
  for (let x = 160; x < 270; x += 6) { for (let j = 0; j < 9; j++) put(x, 152 - j, '#16101e'); put(x - 1, 143, '#16101e'); put(x + 1, 143, '#16101e'); }
  for (let x = 160; x < 270; x++) { put(x, 146, '#16101e'); put(x, 150, '#16101e'); }
  // foreground mist darkening at bottom edge
  for (let y = H - 14; y < H; y++) for (let x = 0; x < W; x++) put(x, y, '#08050c', ((y - (H - 14)) / 14) * 200);

  ctx.putImageData(img, 0, 0);
  gctx.putImageData(gimg, 0, 0);
  return { color: cv, glow: glowCv, horizon: HOR };
}

// Bottom UI panel (stone + bone filigree)
export function paintPanel(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1d1428'); g.addColorStop(0.5, '#140e1e'); g.addColorStop(1, '#0c0812');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const r = rng(77);
  // stone blocks
  c.globalAlpha = 0.35;
  for (let y = 18; y < h; y += 26) {
    const off = ((y / 26) | 0) % 2 ? 0 : 40;
    for (let x = -off; x < w; x += 80) {
      c.strokeStyle = '#2a2036'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, 78, 24);
      c.fillStyle = r() > 0.5 ? '#1a1224' : '#221830'; c.fillRect(x + 3, y + 3, 74, 20);
    }
  }
  c.globalAlpha = 1;
  // top border
  const bg = c.createLinearGradient(0, 0, 0, 18);
  bg.addColorStop(0, '#6a5a7a'); bg.addColorStop(0.4, '#3a2c4a'); bg.addColorStop(1, '#120c1a');
  c.fillStyle = bg; c.fillRect(0, 0, w, 16);
  c.fillStyle = '#9b7bd8'; c.fillRect(0, 15, w, 2);
  c.fillStyle = '#c8b89a';
  for (let x = 14; x < w; x += 36) { c.beginPath(); c.arc(x, 8, 3, 0, Math.PI * 2); c.fill(); c.fillRect(x - 1, 8, 2, 6); }
  // vignette
  const v = c.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = v; c.fillRect(0, 0, w, h);
  return cv;
}
