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

export class Painter {
  constructor(w = 48, h = 48) {
    this.w = w; this.h = h;
    this.c = new Uint8ClampedArray(w * h * 4);
    this.g = new Uint8ClampedArray(w * h * 4);
    this.flat = new Uint8Array(w * h); // pixels excluded from auto shading
  }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  alpha(x, y) { return this.inside(x, y) ? this.c[(y * this.w + x) * 4 + 3] : 0; }
  px(x, y, c, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4, v = rgb(c);
    if (a < 255 && this.c[i + 3] > 0) {
      const t = a / 255;
      this.c[i] = this.c[i] * (1 - t) + v[0] * t;
      this.c[i + 1] = this.c[i + 1] * (1 - t) + v[1] * t;
      this.c[i + 2] = this.c[i + 2] * (1 - t) + v[2] * t;
      this.c[i + 3] = Math.max(this.c[i + 3], a);
      return;
    }
    this.c[i] = v[0]; this.c[i + 1] = v[1]; this.c[i + 2] = v[2]; this.c[i + 3] = a;
    this.flat[y * this.w + x] = 0;
  }
  // Emissive pixel: drawn in colour layer and glow layer (rendered additively, unlit)
  glow(x, y, c, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return;
    this.px(x, y, c);
    this.flat[y * this.w + x] = 1;
    const i = (y * this.w + x) * 4, v = rgb(c);
    this.g[i] = v[0]; this.g[i + 1] = v[1]; this.g[i + 2] = v[2]; this.g[i + 3] = Math.max(this.g[i + 3], a);
  }
  softGlow(x, y, c, a) { // glow-only halo pixel (no colour pixel)
    x = Math.round(x); y = Math.round(y);
    if (!this.inside(x, y)) return;
    const i = (y * this.w + x) * 4, v = rgb(c);
    if (this.g[i + 3] >= a) return;
    this.g[i] = v[0]; this.g[i + 1] = v[1]; this.g[i + 2] = v[2]; this.g[i + 3] = a;
  }
  halo(cx, cy, r, c, a = 110) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d <= r) this.softGlow(cx + x, cy + y, c, Math.round(a * (1 - d / (r + 1))));
    }
  }
  rect(x, y, w, h, c, a) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c, a); }
  disc(cx, cy, r, c, a) {
    const rr = r * r + r * 0.8;
    for (let y = Math.floor(-r - 1); y <= r + 1; y++) for (let x = Math.floor(-r - 1); x <= r + 1; x++)
      if (x * x + y * y <= rr) this.px(cx + x, cy + y, c, a);
  }
  ellipse(cx, cy, rx, ry, c, a) {
    for (let y = Math.floor(-ry - 1); y <= ry + 1; y++) for (let x = Math.floor(-rx - 1); x <= rx + 1; x++) {
      const v = (x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3);
      if (v <= 1) this.px(cx + x, cy + y, c, a);
    }
  }
  // Shaded ellipse (pal: [dark, mid, light]) lit from upper-left
  ball(cx, cy, rx, ry, pal, a) {
    for (let y = Math.floor(-ry - 1); y <= ry + 1; y++) for (let x = Math.floor(-rx - 1); x <= rx + 1; x++) {
      const nx = x / (rx + 0.5), ny = y / (ry + 0.5);
      if (nx * nx + ny * ny > 1) continue;
      const l = -(nx * 0.6 + ny * 0.75);
      const col = l > 0.42 ? pal[2] : l > -0.3 ? pal[1] : pal[0];
      this.px(cx + x, cy + y, col, a);
    }
  }
  line(x0, y0, x1, y1, c, t = 1, a) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      if (t <= 1) this.px(x, y, c, a);
      else this.disc(Math.round(x), Math.round(y), (t - 1) / 2, c, a);
    }
  }
  glowLine(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let i = 0; i <= n; i++) this.glow(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
  poly(pts, c, a) {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
        if ((y0 <= y + 0.5 && y1 > y + 0.5) || (y1 <= y + 0.5 && y0 > y + 0.5)) xs.push(x0 + ((y + 0.5 - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c, a);
    }
  }

  finalize({ outline = true, rim = true } = {}) {
    const { w, h, c } = this;
    const src = new Uint8ClampedArray(c);
    const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
    if (rim) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (src[i + 3] < 128 || this.flat[y * w + x]) continue;
        let f = 0;
        if (A(x, y - 1) < 128) f += 0.22;
        if (A(x - 1, y) < 128) f += 0.1;
        if (A(x, y + 1) < 128) f -= 0.3;
        if (A(x + 1, y) < 128) f -= 0.12;
        if (f !== 0) { const v = shade([src[i], src[i + 1], src[i + 2]], f); c[i] = v[0]; c[i + 1] = v[1]; c[i + 2] = v[2]; }
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
          const v = shade([base[best], base[best + 1], base[best + 2]], -0.78);
          c[i] = v[0]; c[i + 1] = v[1]; c[i + 2] = v[2]; c[i + 3] = 255;
        }
      }
    }
    // normal map from (distance-to-edge + luminance) height field
    const dist = new Float32Array(w * h).fill(99);
    const q = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (c[(y * w + x) * 4 + 3] < 100) { dist[y * w + x] = 0; q.push(y * w + x); }
    for (let k = 0; k < q.length; k++) {
      const p = q[k], x = p % w, y = (p / w) | 0, d = dist[p] + 1;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (dist[j] > d) { dist[j] = d; q.push(j); }
      }
    }
    const H = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const lum = (c[i * 4] * 0.3 + c[i * 4 + 1] * 0.59 + c[i * 4 + 2] * 0.11) / 255;
      H[i] = c[i * 4 + 3] < 100 ? 0 : Math.min(dist[i], 5) / 5 * 0.75 + lum * 0.35;
    }
    const n = new Uint8ClampedArray(w * h * 4);
    const Hs = (x, y) => H[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let nx = -(Hs(x + 1, y) - Hs(x - 1, y)) * 2.2, ny = -(Hs(x, y + 1) - Hs(x, y - 1)) * 2.2, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      n[i] = (nx * 0.5 + 0.5) * 255;
      n[i + 1] = (-ny * 0.5 + 0.5) * 255; // green = up
      n[i + 2] = (nz * 0.5 + 0.5) * 255;
      n[i + 3] = 255;
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
