// Procedural pixel-art graveyard backdrop (painted at half resolution, scaled x2 in game).
import { rgb, shade, mix } from './pixel.js';

export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const BG_W = 540, BG_H = 570;

// smooth value noise + fbm for natural textures
function makeNoise(seed) {
  const r = rng(seed), N = 256, perm = new Uint8Array(N * 2), val = new Float32Array(N);
  for (let i = 0; i < N; i++) { perm[i] = i; val[i] = r(); }
  for (let i = N - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < N; i++) perm[N + i] = perm[i];
  const lat = (x, y) => val[perm[(perm[x & 255] + y) & 255]];
  const sm = (t) => t * t * (3 - 2 * t);
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = lat(xi, yi), b = lat(xi + 1, yi), c = lat(xi, yi + 1), d = lat(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x, y, oct = 4) => { let s = 0, amp = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += n2(x * f, y * f) * amp; n += amp; amp *= 0.5; f *= 2; } return s / n; };
}

export function paintBackground() {
  const W = BG_W, H = BG_H, r = rng(1337), fbm = makeNoise(7), fbm2 = makeNoise(99);
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
  const glow = (x, y, c, a = 255, solid = true) => {
    if (solid) put(x, y, c);
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4, v = rgb(c);
    if (gd[i + 3] > a) return;
    gd[i] = v[0]; gd[i + 1] = v[1]; gd[i + 2] = v[2]; gd[i + 3] = a;
  };
  const bayer = (x, y) => [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][(y & 3) * 4 + (x & 3)] / 16 - 0.5;
  const HOR = 286;
  const candles = [];

  // --- sky: smooth gradient + faint nebula
  for (let y = 0; y < HOR + 40; y++) for (let x = 0; x < W; x++) {
    const t = y / (HOR + 40) + bayer(x, y) * 0.03;
    let c = t < 0.55 ? mix('#06030e', '#1c1038', t / 0.55) : mix('#1c1038', '#43264f', (t - 0.55) / 0.45);
    const neb = fbm(x / 90, y / 60) - 0.45;
    if (neb > 0) c = mix(c, (x + y) % 2 ? '#3a2a6a' : '#284a6a', Math.min(0.35, neb * 1.4) * (1 - t * 0.6));
    put(x, y, c);
  }
  // stars
  for (let k = 0; k < 380; k++) {
    const x = r() * W, y = r() * (HOR - 40), b = r();
    if (b > 0.97) { glow(x, y, '#ffffff', 230); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) glow(x + dx, y + dy, '#a898e8', 120); for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) glow(x + dx, y + dy, '#6858b8', 60, false); }
    else if (b > 0.8) glow(x, y, b > 0.9 ? '#e8e0ff' : '#b8a8e8', 170);
    else put(x, y, '#8070b0', 60 + b * 120);
  }
  // moon with smooth shading, craters and halo
  const mx = 410, my = 172, mr = 34;
  for (let y = -mr * 4; y <= mr * 4; y++) for (let x = -mr * 4; x <= mr * 4; x++) {
    const dd = Math.hypot(x, y);
    if (dd > mr && dd < mr * 4) put(mx + x, my + y, '#b8a0e8', Math.max(0, 46 * Math.pow(1 - (dd - mr) / (mr * 3), 2)));
  }
  const craters = [[-10, -8, 8], [12, 6, 6], [-4, 16, 5], [16, -14, 4], [-18, 8, 3.5], [4, -2, 3]];
  for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
    const dd = Math.hypot(x, y); if (dd > mr) continue;
    const nz = Math.sqrt(1 - (dd / mr) ** 2), l = Math.max(0, (-x * 0.45 - y * 0.45) / mr + nz * 0.75);
    let c = mix('#8e7ea8', '#fff8ee', Math.min(1, l));
    for (const [cx2, cy2, cr] of craters) { const q = Math.hypot(x - cx2, y - cy2); if (q < cr) c = mix(c, '#9a8ab0', 0.45 * (1 - q / cr) + 0.15); }
    c = mix(c, '#d8c8e8', (fbm2(x / 8, y / 8) - 0.5) * 0.4 + 0.05);
    glow(mx + x, my + y, c, 150);
  }
  // painted cloud streaks
  for (let y = 60; y < 250; y++) for (let x = 0; x < W; x++) {
    const n = fbm(x / 140 + 10, y / 18) - 0.58;
    if (n > 0) put(x, y, n > 0.08 ? '#3a2a58' : '#2a1d44', Math.min(200, n * 1200));
  }
  // --- mountains (3 layers, atmospheric haze)
  const ridge = (base, amp, sc, col, seed) => {
    for (let x = 0; x < W; x++) {
      const h = base - (fbm(x / sc + seed, seed) - 0.5) * amp * 2 - Math.abs(Math.sin(x / (sc * 0.8) + seed)) * amp * 0.4;
      for (let y = Math.floor(h); y < HOR + 60; y++) put(x, y, mix(col, '#43264f', Math.max(0, 1 - (y - h) / 40) * 0.25));
    }
  };
  ridge(HOR - 62, 34, 70, '#261a40', 3);
  ridge(HOR - 34, 24, 50, '#1b1230', 9);
  // horizon haze
  for (let y = HOR - 80; y < HOR + 10; y++) for (let x = 0; x < W; x++) put(x, y, '#6a4a8a', Math.max(0, 40 * (1 - Math.abs(y - (HOR - 30)) / 50)));
  // --- cathedral (right)
  const cath = (x0, base) => {
    const col = '#0f0a1c', hi = '#1c1430';
    const rect = (x, y, w, h, c = col) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
    const spire = (cx, top, w, h) => { for (let j = 0; j < h; j++) { const hw = Math.max(0.5, (j / h) * w / 2); for (let i = -hw; i <= hw; i++) put(cx + i, top + j, i < 0 ? hi : col); } };
    rect(x0, base - 56, 76, 56); rect(x0 + 6, base - 96, 20, 42); rect(x0 + 50, base - 86, 18, 32);
    spire(x0 + 16, base - 150, 20, 56); spire(x0 + 59, base - 124, 18, 40); spire(x0 + 38, base - 92, 10, 36);
    rect(x0 + 15, base - 162, 2, 14); rect(x0 + 11, base - 157, 10, 2);
    for (let i = 0; i < 4; i++) { rect(x0 - 4 + i * 26, base - 40 + (i % 2) * 6, 4, 40 - (i % 2) * 6, hi); }
    // windows
    const win = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const top = j < w / 2 && Math.hypot(i - w / 2 + 0.5, j - w / 2) > w / 2; if (!top) glow(x0 + x + i, base + y + j, j < 2 ? '#ffe9a0' : mix('#ffb84a', '#d8702a', j / h), 220); } };
    win(13, -84, 6, 14); win(55, -76, 5, 12); win(30, -46, 6, 16); win(44, -46, 6, 16); win(20, -36, 4, 10); win(64, -34, 4, 10);
    // rose window
    for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const q = Math.hypot(x, y); if (q <= 7) glow(x0 + 38 + x, base - 64 + y, q < 2 ? '#fff0b0' : (Math.atan2(y, x) * 4 / Math.PI + 8 | 0) % 2 ? '#ff9a3a' : '#d84a2a', 230); }
  };
  cath(438, HOR - 6);
  // dead forest silhouettes on the far ridge
  const tree = (x, y, h, dir, col) => {
    let cx = x;
    for (let j = 0; j < h; j++) { const w = Math.max(1, Math.round((h - j) / h * 4)); for (let i = 0; i < w; i++) put(cx + i, y - j, col); if (j % 8 === 7) cx += dir * (r() > 0.5 ? 1 : 0); }
    const br = (bx, by, len, ang, dep) => {
      for (let k = 0; k < len; k++) { put(bx + Math.cos(ang) * k, by + Math.sin(ang) * k, col); if (dep > 1) put(bx + Math.cos(ang) * k + 1, by + Math.sin(ang) * k, col); }
      if (dep > 0) { br(bx + Math.cos(ang) * len, by + Math.sin(ang) * len, len * 0.66, ang - 0.45 - r() * 0.2, dep - 1); br(bx + Math.cos(ang) * len, by + Math.sin(ang) * len, len * 0.6, ang + 0.4 + r() * 0.2, dep - 1); }
    };
    br(cx, y - h, 18, -1.6 + dir * 0.4, 4); br(cx, y - h * 0.6, 16, -2.5, 3); br(cx + 2, y - h * 0.7, 15, -0.6, 3);
  };
  for (let k = 0; k < 9; k++) tree(120 + k * 34 + r() * 10, HOR - 26 + r() * 6, 14 + r() * 10, r() > 0.5 ? 1 : -1, '#160f26');
  // near hills
  ridge(HOR + 4, 10, 40, '#120c1e', 17);
  // --- ground with texture
  for (let y = HOR - 4; y < H; y++) {
    const t = (y - HOR) / (H - HOR);
    for (let x = 0; x < W; x++) {
      const n = fbm(x / 30, y / 14) * 0.7 + fbm2(x / 6, y / 4) * 0.3;
      let c = mix('#1a1224', '#2c1e2c', Math.max(0, Math.min(1, t * 1.3)));
      c = mix(c, n > 0.55 ? '#3a2a34' : '#120a16', Math.abs(n - 0.5) * 1.2);
      if (n > 0.62 && fbm2(x / 3 + 50, y / 3) > 0.6) c = mix(c, '#34402a', 0.5); // moss
      put(x, y, c);
    }
  }
  // battle path (lighter trodden earth)
  for (let y = 360; y < 546; y++) for (let x = 0; x < W; x++) {
    const edge = Math.min(y - 360, 546 - y) + (fbm(x / 20, y / 8) - 0.5) * 30;
    if (edge <= 0) continue;
    const a = Math.min(1, edge / 22) * 0.5;
    put(x, y, mix('#3e2c34', '#54404a', fbm2(x / 5, y / 3)), a * 255);
  }
  // stones, bones and skulls
  for (let k = 0; k < 160; k++) {
    const x = r() * W, y = 350 + r() * 210, rr = 1 + r() * 3;
    for (let j = -rr; j <= rr; j++) for (let i = -rr * 1.4; i <= rr * 1.4; i++) if ((i / 1.4) ** 2 + j * j <= rr * rr) put(x + i, y + j, j < -rr * 0.3 ? '#6a5868' : j > rr * 0.4 ? '#2a1e28' : '#4a3a48');
  }
  for (let k = 0; k < 18; k++) {
    const x = 20 + r() * 480, y = 370 + r() * 170, a = r() * Math.PI;
    for (let i = -5; i <= 5; i++) put(x + Math.cos(a) * i, y + Math.sin(a) * i * 0.5, i % 5 === 0 ? '#e8dcc0' : '#c8bc9e');
  }
  for (let k = 0; k < 7; k++) {
    const x = 20 + r() * 500, y = 380 + r() * 160;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 10) put(x + i, y + j, j < 0 ? '#e8dcc0' : '#b8ac90');
    put(x - 1, y, '#120a14'); put(x + 1, y, '#120a14'); put(x, y + 2, '#2a1e28');
  }
  // grass tufts
  for (let k = 0; k < 420; k++) {
    const x = r() * W, y = HOR + r() * (H - HOR);
    if (y > 380 && y < 530 && r() < 0.75) continue;
    const g = r() > 0.5 ? '#2e3a2a' : '#3e4a30', hgt = 2 + r() * 4;
    for (let j = 0; j < hgt; j++) { put(x + j * 0.3, y - j, g); put(x - j * 0.4 + 1, y - j * 0.8, g); }
    put(x, y - hgt, '#5a6a42');
  }
  // --- tombstones with stone texture, cracks, moss (+ candle spots)
  const tomb = (x, y, w, h, kind, candle) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const top = kind === 0 && j < w / 2 && Math.hypot(i - w / 2 + 0.5, j - w / 2) > w / 2;
      if (top) continue;
      const n = fbm2((x + i) / 3, (y + j) / 3);
      let c = i < 2 ? '#7a728a' : i >= w - 2 ? '#2c2638' : mix('#3e3650', '#5e5670', n);
      if (j < 2 && kind !== 0) c = '#7a728a';
      if (n > 0.68 && j > h * 0.5) c = mix(c, '#3a5a2a', 0.6);
      put(x + i, y + j, c);
    }
    if (kind === 1) { for (let j = -12; j < 0; j++) { put(x + w / 2, y + j, '#5e5670'); put(x + w / 2 + 1, y + j, '#3e3650'); } for (let i = -5; i <= 5; i++) { put(x + w / 2 + i, y - 8, '#5e5670'); put(x + w / 2 + i, y - 7, '#3e3650'); } }
    for (let i = -2; i <= w + 1; i++) put(x + i, y + h, '#0a0610');
    let cx = x + w * 0.6, cy = y + 4; for (let k = 0; k < h * 0.5; k++) { put(cx, cy, '#1e1828'); cx += r() > 0.5 ? 1 : -1; cy++; }
    if (candle) candles.push({ x: x + w + 4, y: y + h - 2 });
  };
  for (const [x, y, w, h, k, cdl] of [[10, 296, 18, 26, 0, true], [54, 308, 14, 20, 1], [98, 296, 16, 24, 0], [146, 314, 12, 18, 0, true], [190, 304, 14, 22, 1], [236, 292, 12, 18, 0], [8, 350, 22, 30, 1], [78, 336, 18, 24, 0, true], [300, 300, 12, 16, 0], [24, 540, 24, 28, 0], [130, 548, 16, 20, 1, true]]) tomb(x, y, w, h, k, cdl);
  // mausoleum (left, back)
  (() => {
    const x0 = 140, base = 300, col = '#2a2438';
    for (let j = 0; j < 46; j++) for (let i = 0; i < 64; i++) put(x0 + i, base - 46 + j, mix(col, '#3e3650', fbm2((x0 + i) / 4, j / 4) * 0.8));
    for (let j = 0; j < 16; j++) for (let i = -4; i < 68; i++) if (j > (Math.abs(i - 32) / 36) * 16) put(x0 + i, base - 62 + j, j < 3 ? '#5e5670' : '#34304a');
    for (const px2 of [4, 16, 44, 56]) for (let j = 0; j < 40; j++) { put(x0 + px2, base - 42 + j, '#6a627a'); put(x0 + px2 + 1, base - 42 + j, '#4a4258'); put(x0 + px2 + 2, base - 42 + j, '#2c2638'); }
    for (let j = 0; j < 26; j++) for (let i = 0; i < 14; i++) { const arch = j < 7 && Math.hypot(i - 7, j - 7) > 7; if (!arch) glow(x0 + 25 + i, base - 26 + j, mix('#1a4a2a', '#4cff6a', Math.max(0, 1 - j / 26) * 0.6), 120); }
  })();
  // iron fence (right)
  for (let x = 300; x < W; x += 9) { for (let j = 0; j < 20; j++) put(x, 306 - j, '#120c1c'); put(x - 1, 286, '#120c1c'); put(x + 1, 286, '#120c1c'); put(x, 285, '#3a3448'); }
  for (let x = 300; x < W; x++) { put(x, 292, '#120c1c'); put(x, 300, '#120c1c'); }
  // foreground: big dead trees framing the scene
  tree(36, 300, 92, 1, '#0c0812'); tree(508, 318, 80, -1, '#0c0812');
  // ground fog band near horizon
  for (let y = HOR - 10; y < HOR + 50; y++) for (let x = 0; x < W; x++) put(x, y, '#8a78b0', Math.max(0, 34 * (1 - Math.abs(y - (HOR + 18)) / 32)) * (0.5 + fbm(x / 60, y / 10)));
  // bottom vignette
  for (let y = H - 30; y < H; y++) for (let x = 0; x < W; x++) put(x, y, '#06040a', ((y - (H - 30)) / 30) * 210);

  ctx.putImageData(img, 0, 0);
  gctx.putImageData(gimg, 0, 0);
  return { color: cv, glow: glowCv, horizon: HOR, candles };
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
