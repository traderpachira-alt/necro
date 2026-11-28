// Procedural pixel-art painter + automatic rim shading, outline and normal-map generation.

const cache = new Map();
export function rgb(c) {
  if (Array.isArray(c)) return c;
  let v = cache.get(c);
  if (!v) {
    const n = parseInt(c.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(c, v);
  }
  return v;
}
export function shade(c, f) {
  const [r, g, b] = rgb(c);
  if (f >= 0) return [r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f].map(Math.round);
  return [r * (1 + f), g * (1 + f), b * (1 + f)].map(Math.round);
}
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return [0, 1, 2].map((i) => Math.round(A[i] + (B[i] - A[i]) * t));
}

// Super-sampled painter: drawing code uses a 48x48 "logical" grid, but every primitive is
// rasterised at K x the resolution, so curves, outlines and shading come out finer and smoother.
export const SS = 2;
const BAYER = [0, 2, 3, 1];

export class Painter {
  constructor(w = 48, h = 48, k = SS) {
    this.k = k; this.lw = w; this.lh = h;
    this.w = w * k; this.h = h * k;
    this.c = new Uint8ClampedArray(this.w * this.h * 4);
    this.g = new Uint8ClampedArray(this.w * this.h * 4);
    this.flat = new Uint8Array(this.w * this.h); // pixels excluded from auto shading
  }
  inside(X, Y) { return X >= 0 && Y >= 0 && X < this.w && Y < this.h; }
  // ---- hi-res pixel primitives
  hp(X, Y, c, a = 255) {
    if (!this.inside(X, Y)) return;
    const i = (Y * this.w + X) * 4, v = rgb(c);
    if (a < 255 && this.c[i + 3] > 0) {
      const t = a / 255;
      this.c[i] = this.c[i] * (1 - t) + v[0] * t; this.c[i + 1] = this.c[i + 1] * (1 - t) + v[1] * t; this.c[i + 2] = this.c[i + 2] * (1 - t) + v[2] * t;
      this.c[i + 3] = Math.max(this.c[i + 3], a);
      return;
    }
    this.c[i] = v[0]; this.c[i + 1] = v[1]; this.c[i + 2] = v[2]; this.c[i + 3] = a;
    this.flat[Y * this.w + X] = 0;
  }
  hglow(X, Y, c, a = 255) {
    if (!this.inside(X, Y)) return;
    this.hp(X, Y, c); this.flat[Y * this.w + X] = 1;
    const i = (Y * this.w + X) * 4, v = rgb(c);
    this.g[i] = v[0]; this.g[i + 1] = v[1]; this.g[i + 2] = v[2]; this.g[i + 3] = Math.max(this.g[i + 3], a);
  }
  hsoft(X, Y, c, a) {
    if (!this.inside(X, Y)) return;
    const i = (Y * this.w + X) * 4, v = rgb(c);
    if (this.g[i + 3] >= a) return;
    this.g[i] = v[0]; this.g[i + 1] = v[1]; this.g[i + 2] = v[2]; this.g[i + 3] = a;
  }
  // iterate hi-res pixels inside a logical bounding box; fn gets logical pixel-centre coords
  area(x0, y0, x1, y1, fn) {
    const k = this.k;
    const X0 = Math.max(0, Math.floor(x0 * k)), Y0 = Math.max(0, Math.floor(y0 * k));
    const X1 = Math.min(this.w - 1, Math.ceil(x1 * k)), Y1 = Math.min(this.h - 1, Math.ceil(y1 * k));
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) fn(X, Y, (X + 0.5) / k, (Y + 0.5) / k);
  }
  // ---- logical API (same as before)
  alpha(x, y) { const X = Math.round(x) * this.k, Y = Math.round(y) * this.k; return this.inside(X, Y) ? this.c[(Y * this.w + X) * 4 + 3] : 0; }
  px(x, y, c, a = 255) { // a deliberate chunky pixel (eyes, rivets...)
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < this.k; j++) for (let i = 0; i < this.k; i++) this.hp(x * this.k + i, y * this.k + j, c, a);
  }
  fpx(x, y, c, a = 255) { this.hp(Math.floor(x * this.k), Math.floor(y * this.k), c, a); } // fine detail pixel
  glow(x, y, c, a = 255) {
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < this.k; j++) for (let i = 0; i < this.k; i++) this.hglow(x * this.k + i, y * this.k + j, c, a);
  }
  fglow(x, y, c, a = 255) { this.hglow(Math.floor(x * this.k), Math.floor(y * this.k), c, a); }
  softGlow(x, y, c, a) {
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < this.k; j++) for (let i = 0; i < this.k; i++) this.hsoft(x * this.k + i, y * this.k + j, c, a);
  }
  halo(cx, cy, r, c, a = 110) {
    const ox = cx + 0.5, oy = cy + 0.5;
    this.area(ox - r - 1, oy - r - 1, ox + r + 1, oy + r + 1, (X, Y, x, y) => {
      const d = Math.hypot(x - ox, y - oy);
      if (d <= r + 0.5) this.hsoft(X, Y, c, Math.round(a * Math.max(0, 1 - d / (r + 1))));
    });
  }
  rect(x, y, w, h, c, a) {
    const k = this.k;
    for (let Y = Math.round(y) * k; Y < Math.round(y + h) * k; Y++) for (let X = Math.round(x) * k; X < Math.round(x + w) * k; X++) this.hp(X, Y, c, a);
  }
  disc(cx, cy, r, c, a) {
    const ox = Math.round(cx) + 0.5, oy = Math.round(cy) + 0.5, R = r + 0.55;
    this.area(ox - R, oy - R, ox + R, oy + R, (X, Y, x, y) => { if ((x - ox) ** 2 + (y - oy) ** 2 <= R * R) this.hp(X, Y, c, a); });
  }
  ellipse(cx, cy, rx, ry, c, a) {
    const ox = cx + 0.5, oy = cy + 0.5, RX = rx + 0.55, RY = ry + 0.55;
    this.area(ox - RX, oy - RY, ox + RX, oy + RY, (X, Y, x, y) => { if (((x - ox) / RX) ** 2 + ((y - oy) / RY) ** 2 <= 1) this.hp(X, Y, c, a); });
  }
  // Shaded ellipse lit from upper-left: smooth 5-tone ramp with ordered dithering and a specular glint
  ball(cx, cy, rx, ry, pal, a) {
    const ox = cx + 0.5, oy = cy + 0.5, RX = rx + 0.55, RY = ry + 0.55;
    const ramp = [pal[0], mix(pal[0], pal[1], 0.55), pal[1], mix(pal[1], pal[2], 0.6), pal[2]];
    this.area(ox - RX, oy - RY, ox + RX, oy + RY, (X, Y, x, y) => {
      const nx = (x - ox) / RX, ny = (y - oy) / RY;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) return;
      const nz = Math.sqrt(1 - r2);
      let l = -nx * 0.5 - ny * 0.62 + nz * 0.6; // lambert-ish
      l = (l + 0.35) / 1.35;
      const f = Math.max(0, Math.min(0.999, l)) * 4 + (BAYER[(X & 1) + (Y & 1) * 2] / 4 - 0.375) * 0.6;
      let col = ramp[Math.max(0, Math.min(4, Math.floor(f)))];
      if (l > 0.93 && nz > 0.6) col = shade(pal[2], 0.35);
      this.hp(X, Y, col, a);
    });
  }
  line(x0, y0, x1, y1, c, t = 1, a) {
    const rad = Math.max(0.5, t / 2) + 0.05;
    const ax = x0 + 0.5, ay = y0 + 0.5, bx = x1 + 0.5, by = y1 + 0.5;
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    this.area(Math.min(ax, bx) - rad, Math.min(ay, by) - rad, Math.max(ax, bx) + rad, Math.max(ay, by) + rad, (X, Y, x, y) => {
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
      const ex = ax + dx * u - x, ey = ay + dy * u - y;
      if (ex * ex + ey * ey <= rad * rad) this.hp(X, Y, c, a);
    });
  }
  glowLine(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * this.k * 2 + 1;
    for (let i = 0; i <= n; i++) this.fglow(x0 + 0.5 + ((x1 - x0) * i) / n, y0 + 0.5 + ((y1 - y0) * i) / n, c);
  }
  poly(pts, c, a) {
    const k = this.k;
    const P = pts.map(([x, y]) => [x * k, y * k]);
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of P) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let Y = Math.floor(minY); Y <= Math.ceil(maxY); Y++) {
      const xs = [];
      for (let i = 0; i < P.length; i++) {
        const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length];
        if ((y0 <= Y + 0.5 && y1 > Y + 0.5) || (y1 <= Y + 0.5 && y0 > Y + 0.5)) xs.push(x0 + ((Y + 0.5 - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((p1, p2) => p1 - p2);
      for (let q = 0; q + 1 < xs.length; q += 2) for (let X = Math.round(xs[q]); X < Math.round(xs[q + 1]); X++) this.hp(X, Y, c, a);
    }
  }

  finalize({ outline = true, rim = true, grain = 0.06 } = {}) {
    const { w, h, c, k } = this;
    const src = new Uint8ClampedArray(c);
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
    if (rim) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] < 128 || this.flat[y * w + x]) continue;
        let f = 0;
        if (A(x, y - 1) < 128) f += 0.2;
        else if (A(x, y - k) < 128) f += 0.08;
        if (A(x - 1, y) < 128) f += 0.08;
        if (A(x, y + 1) < 128) f -= 0.26;
        else if (A(x, y + k) < 128) f -= 0.1;
        if (A(x + 1, y) < 128) f -= 0.1;
        // material grain: stable hash noise
        if (grain) { const hsh = ((x * 73856093) ^ (y * 19349663)) >>> 0; f += ((hsh % 1000) / 1000 - 0.5) * grain; }
        if (f !== 0) { const v = shade([src[i], src[i + 1], src[i + 2]], f); c[i] = v[0]; c[i + 1] = v[1]; c[i + 2] = v[2]; }
      }
    }
    // inner lines: where two clearly different colour regions meet, darken the darker side
    {
      const base = new Uint8ClampedArray(c);
      const lum = (j) => base[j] * 0.3 + base[j + 1] * 0.59 + base[j + 2] * 0.11;
      for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        if (base[i + 3] < 200 || this.flat[y * w + x]) continue;
        for (const j of [i + 4, i + w * 4]) {
          if (base[j + 3] < 200) continue;
          const dr = base[i] - base[j], dg = base[i + 1] - base[j + 1], db = base[i + 2] - base[j + 2];
          if (dr * dr + dg * dg + db * db < 70 * 70) continue;
          const t = lum(i) < lum(j) ? i : j;
          const v = shade([base[t], base[t + 1], base[t + 2]], -0.32);
          c[t] = v[0]; c[t + 1] = v[1]; c[t + 2] = v[2];
        }
      }
    }
    if (outline) {
      const base = new Uint8ClampedArray(c);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (base[i + 3] > 40) continue;
        let best = -1;
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = (yy * w + xx) * 4;
          if (base[j + 3] > 160) { best = j; break; }
        }
        if (best >= 0) {
          const v = shade([base[best], base[best + 1], base[best + 2]], -0.8);
          c[i] = v[0]; c[i + 1] = v[1]; c[i + 2] = v[2]; c[i + 3] = 255;
        }
      }
    }
    // normal map from (distance-to-edge + luminance) height field
    const dist = new Float32Array(w * h).fill(999);
    const q = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (c[(y * w + x) * 4 + 3] < 100) { dist[y * w + x] = 0; q.push(y * w + x); }
    for (let n = 0; n < q.length; n++) {
      const p = q[n], x = p % w, y = (p / w) | 0, d = dist[p] + 1;
      if (x + 1 < w && dist[p + 1] > d) { dist[p + 1] = d; q.push(p + 1); }
      if (x > 0 && dist[p - 1] > d) { dist[p - 1] = d; q.push(p - 1); }
      if (y + 1 < h && dist[p + w] > d) { dist[p + w] = d; q.push(p + w); }
      if (y > 0 && dist[p - w] > d) { dist[p - w] = d; q.push(p - w); }
    }
    const cap = 5 * k;
    const H = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const lum = (c[i * 4] * 0.3 + c[i * 4 + 1] * 0.59 + c[i * 4 + 2] * 0.11) / 255;
      const dd = Math.min(dist[i], cap) / cap;
      H[i] = c[i * 4 + 3] < 100 ? 0 : Math.sqrt(dd) * 0.8 + lum * 0.3;
    }
    const n = new Uint8ClampedArray(w * h * 4);
    const Hs = (x, y) => H[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
    const st = 2.2 * k * 0.5;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let nx = -(Hs(x + 1, y) - Hs(x - 1, y)) * st, ny = -(Hs(x, y + 1) - Hs(x, y - 1)) * st, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      n[i] = (nx * 0.5 + 0.5) * 255; n[i + 1] = (-ny * 0.5 + 0.5) * 255; n[i + 2] = (nz * 0.5 + 0.5) * 255; n[i + 3] = 255;
    }
    return { w, h, color: c, normal: n, glow: this.g };
  }
}

function toCanvas(w, h, frames, layer, mirror) {
  const cv = document.createElement('canvas');
  cv.width = w * frames.length; cv.height = h;
  const ctx = cv.getContext('2d');
  frames.forEach((f, k) => {
    let data = f[layer];
    if (mirror) {
      const m = new Uint8ClampedArray(data.length);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const s = (y * w + x) * 4, d = (y * w + (w - 1 - x)) * 4;
        m[d] = layer === 'normal' ? 255 - data[s] : data[s];
        m[d + 1] = data[s + 1]; m[d + 2] = data[s + 2]; m[d + 3] = data[s + 3];
      }
      data = m;
    }
    ctx.putImageData(new ImageData(data, w, h), k * w, 0);
  });
  return cv;
}

// Register a spritesheet (colour + normal map + emissive glow layer) as Phaser textures.
export function registerSheet(scene, key, frames, { mirror = false, withNormal = true } = {}) {
  const { w, h } = frames[0];
  const color = toCanvas(w, h, frames, 'color', mirror);
  const tex = scene.textures.addCanvas(key, color);
  if (withNormal) tex.setDataSource(toCanvas(w, h, frames, 'normal', mirror));
  const g = scene.textures.addCanvas(key + '_g', toCanvas(w, h, frames, 'glow', mirror));
  frames.forEach((_, k) => { tex.add(k, 0, k * w, 0, w, h); g.add(k, 0, k * w, 0, w, h); });
  return { color };
}

// Single-image with optional normal map derived from luminance.
export function lumNormal(srcCanvas, strength = 2) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const d = srcCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const H = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) H[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const ctx = out.getContext('2d'); const img = ctx.createImageData(w, h);
  const Hs = (x, y) => H[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let nx = -(Hs(x + 1, y) - Hs(x - 1, y)) * strength, ny = -(Hs(x, y + 1) - Hs(x, y - 1)) * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); const i = (y * w + x) * 4;
    img.data[i] = (nx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-ny / l * 0.5 + 0.5) * 255; img.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}
