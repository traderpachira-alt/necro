// Card face rendering (Canvas2D, rendered at 2x for crisp text).
import { RARITIES, CREATURES, RITUALS, CURSES, ROLES } from './data.js';

export const CARD_W = 200, CARD_H = 290; // texture size; displayed at 0.5
import { TITLE, BODY } from './fonts.js';
const FONT = BODY;

function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function newCanvas(w = CARD_W, h = CARD_H) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }

function metalFrame(c, col, dark) {
  const g = c.createLinearGradient(0, 0, CARD_W, CARD_H);
  g.addColorStop(0, lighten(col, 0.5)); g.addColorStop(0.25, col); g.addColorStop(0.5, lighten(col, 0.25));
  g.addColorStop(0.75, darken(col, 0.4)); g.addColorStop(1, lighten(col, 0.1));
  rr(c, 2, 2, CARD_W - 4, CARD_H - 4, 16); c.fillStyle = g; c.fill();
  c.lineWidth = 3; c.strokeStyle = '#05030a'; c.stroke();
  rr(c, 11, 11, CARD_W - 22, CARD_H - 22, 10); c.fillStyle = dark; c.fill();
  c.lineWidth = 2; c.strokeStyle = darken(col, 0.55); c.stroke();
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lighten(h, f) { const [r, g, b] = hexToRgb(h); return `rgb(${r + (255 - r) * f | 0},${g + (255 - g) * f | 0},${b + (255 - b) * f | 0})`; }
function darken(h, f) { const [r, g, b] = hexToRgb(h); return `rgb(${r * (1 - f) | 0},${g * (1 - f) | 0},${b * (1 - f) | 0})`; }
function rgba(h, a) { const [r, g, b] = hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }

function cornerSkulls(c, col) {
  const pos = [[22, 22], [CARD_W - 22, 22], [22, CARD_H - 22], [CARD_W - 22, CARD_H - 22]];
  for (const [x, y] of pos) {
    c.fillStyle = '#05030a'; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#e8dfc6'; c.beginPath(); c.arc(x, y - 1, 6, 0, Math.PI * 2); c.fill(); c.fillRect(x - 3, y + 3, 6, 3);
    c.fillStyle = '#1a1018'; c.fillRect(x - 4, y - 2, 3, 3); c.fillRect(x + 1, y - 2, 3, 3);
    c.fillStyle = col; c.fillRect(x - 3, y - 1, 1, 1); c.fillRect(x + 2, y - 1, 1, 1);
  }
}
function title(c, text, y, col, size = 20) {
  c.save();
  // banner ribbon
  const w = CARD_W - 30;
  c.fillStyle = '#05030a'; c.beginPath();
  c.moveTo(10, y - 15); c.lineTo(15 + w, y - 15); c.lineTo(CARD_W - 6, y); c.lineTo(15 + w, y + 15); c.lineTo(10, y + 15); c.lineTo(6, y); c.closePath(); c.fill();
  const g = c.createLinearGradient(0, y - 13, 0, y + 13);
  g.addColorStop(0, lighten(col, 0.15)); g.addColorStop(0.5, darken(col, 0.35)); g.addColorStop(1, darken(col, 0.65));
  c.fillStyle = g; c.beginPath();
  c.moveTo(13, y - 12); c.lineTo(12 + w, y - 12); c.lineTo(CARD_W - 10, y); c.lineTo(12 + w, y + 12); c.lineTo(13, y + 12); c.lineTo(10, y); c.closePath(); c.fill();
  c.font = `900 ${size}px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  let s = size; while (c.measureText(text).width > w - 12 && s > 11) { s--; c.font = `900 ${s}px ${TITLE}`; }
  c.fillStyle = '#05030a'; c.fillText(text, CARD_W / 2 + 1, y + 2);
  c.fillStyle = '#fff8e8'; c.fillText(text, CARD_W / 2, y);
  c.restore();
}
function wrap(c, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { c.fillText(line, x, yy); line = w; yy += lh; } else line = t;
  }
  if (line) c.fillText(line, x, yy);
}

// --- role icons ---
function roleIcon(c, role, x, y, col) {
  c.save();
  c.fillStyle = '#05030a'; c.beginPath(); c.arc(x, y, 17, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(x - 4, y - 4, 2, x, y, 15); g.addColorStop(0, lighten(col, 0.4)); g.addColorStop(1, darken(col, 0.5));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, 14, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff8e8'; c.strokeStyle = '#fff8e8'; c.lineWidth = 2.5; c.lineCap = 'round';
  if (role === 'tank') { c.beginPath(); c.moveTo(x - 7, y - 7); c.lineTo(x + 7, y - 7); c.lineTo(x + 7, y + 1); c.lineTo(x, y + 8); c.lineTo(x - 7, y + 1); c.closePath(); c.fill(); c.fillStyle = darken(col, 0.4); c.fillRect(x - 1, y - 5, 2, 10); }
  if (role === 'attacker') { c.beginPath(); c.moveTo(x - 7, y + 7); c.lineTo(x + 7, y - 7); c.stroke(); c.beginPath(); c.moveTo(x + 7, y + 7); c.lineTo(x - 7, y - 7); c.stroke(); }
  if (role === 'ranger') { c.beginPath(); c.arc(x - 3, y, 8, -1.2, 1.2); c.stroke(); c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 8, y); c.stroke(); c.beginPath(); c.moveTo(x + 8, y); c.lineTo(x + 4, y - 3); c.lineTo(x + 4, y + 3); c.fill(); }
  if (role === 'healer') { c.fillRect(x - 2, y - 8, 4, 16); c.fillRect(x - 8, y - 2, 16, 4); }
  c.restore();
}
function gem(c, x, y, col) {
  c.save();
  c.fillStyle = '#05030a'; c.beginPath(); c.moveTo(x, y - 15); c.lineTo(x + 12, y); c.lineTo(x, y + 15); c.lineTo(x - 12, y); c.closePath(); c.fill();
  const g = c.createLinearGradient(x - 9, y - 11, x + 9, y + 11); g.addColorStop(0, lighten(col, 0.7)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.5));
  c.fillStyle = g; c.beginPath(); c.moveTo(x, y - 11); c.lineTo(x + 9, y); c.lineTo(x, y + 11); c.lineTo(x - 9, y); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.moveTo(x - 2, y - 7); c.lineTo(x + 2, y - 3); c.lineTo(x - 3, y - 1); c.closePath(); c.fill();
  c.restore();
}
function statBox(c, x, y, icon, val, col) {
  c.save();
  rr(c, x, y, 78, 28, 8); c.fillStyle = '#05030a'; c.fill();
  rr(c, x + 2, y + 2, 74, 24, 6); c.fillStyle = darken(col, 0.6); c.fill();
  c.fillStyle = col;
  if (icon === 'hp') { const cx = x + 15, cy = y + 13; c.beginPath(); c.arc(cx - 4, cy - 2, 5, 0, Math.PI * 2); c.arc(cx + 4, cy - 2, 5, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(cx - 9, cy); c.lineTo(cx + 9, cy); c.lineTo(cx, cy + 9); c.fill(); }
  else { const cx = x + 15, cy = y + 14; c.save(); c.translate(cx, cy); c.rotate(-0.78); c.fillRect(-2, -10, 4, 15); c.fillRect(-6, 4, 12, 3); c.fillRect(-1.5, 7, 3, 4); c.restore(); }
  c.font = `800 21px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff8e8';
  c.fillText(String(val), x + 50, y + 15);
  c.restore();
}

// --- glyphs for rituals / curses ---
function glyph(c, kind, x, y, col) {
  c.save(); c.translate(x, y); c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = col; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 18;
  switch (kind) {
    case 'drop': c.beginPath(); c.moveTo(0, -26); c.bezierCurveTo(16, -4, 18, 8, 0, 20); c.bezierCurveTo(-18, 8, -16, -4, 0, -26); c.fill(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(-6, 4, 4, 0, Math.PI * 2); c.fill(); break;
    case 'eye': c.beginPath(); c.moveTo(-28, 0); c.quadraticCurveTo(0, -24, 28, 0); c.quadraticCurveTo(0, 24, -28, 0); c.stroke(); c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#05030a'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill(); break;
    case 'shield': c.beginPath(); c.moveTo(-20, -22); c.lineTo(20, -22); c.lineTo(20, 2); c.lineTo(0, 24); c.lineTo(-20, 2); c.closePath(); c.stroke(); for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 9, -14); c.lineTo(i * 9, 8 - Math.abs(i) * 4); c.stroke(); } break;
    case 'soul': c.beginPath(); c.arc(0, 6, 14, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(-12, 0); c.quadraticCurveTo(-6, -20, 4, -28); c.quadraticCurveTo(0, -12, 12, 0); c.fill(); c.fillStyle = '#05030a'; c.fillRect(-7, 2, 4, 5); c.fillRect(3, 2, 4, 5); break;
    case 'fang': for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 18, -18); c.quadraticCurveTo(s * 6, 0, s * 4, 22); c.quadraticCurveTo(s * 16, 4, s * 22, -16); c.fill(); } break;
    case 'ghost': c.beginPath(); c.arc(0, -6, 16, Math.PI, 0); c.lineTo(16, 18); for (let i = 0; i < 4; i++) c.lineTo(16 - (i + 0.5) * 8, 12 + (i % 2) * 8); c.lineTo(-16, 18); c.closePath(); c.fill(); c.fillStyle = '#05030a'; c.beginPath(); c.arc(-6, -6, 4, 0, Math.PI * 2); c.arc(6, -6, 4, 0, Math.PI * 2); c.fill(); break;
    case 'crack': c.beginPath(); c.moveTo(-4, -28); c.lineTo(6, -10); c.lineTo(-6, 0); c.lineTo(8, 12); c.lineTo(0, 28); c.stroke(); c.beginPath(); c.moveTo(-6, 0); c.lineTo(-18, 8); c.stroke(); c.beginPath(); c.moveTo(6, -10); c.lineTo(18, -16); c.stroke(); break;
    case 'hand': c.beginPath(); c.moveTo(-14, 24); c.lineTo(-14, -2); for (let i = 0; i < 4; i++) { c.lineTo(-14 + i * 8, -22 + (i === 0 || i === 3 ? 6 : 0)); c.lineTo(-10 + i * 8, -22 + (i === 0 || i === 3 ? 6 : 0)); c.lineTo(-8 + i * 8, -4); } c.lineTo(16, 24); c.closePath(); c.fill(); break;
    case 'fuse': c.beginPath(); c.arc(-9, 0, 15, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(9, 0, 15, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fill(); for (const s2 of [-1, 1]) { c.beginPath(); c.moveTo(s2 * 30, -22); c.lineTo(s2 * 20, -14); c.stroke(); c.beginPath(); c.moveTo(s2 * 30, 22); c.lineTo(s2 * 20, 14); c.stroke(); } break;
    case 'sun': c.beginPath(); c.arc(0, 0, 11, 0, Math.PI * 2); c.fill(); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * 15, Math.sin(a) * 15); c.lineTo(Math.cos(a) * (i % 2 ? 22 : 28), Math.sin(a) * (i % 2 ? 22 : 28)); c.stroke(); } break;
  }
  c.restore();
}
function runeCircle(c, x, y, r, col, a = 1) {
  c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 2; c.shadowColor = col; c.shadowBlur = 10;
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(x, y, r - 7, 0, Math.PI * 2); c.stroke();
  c.beginPath();
  for (let i = 0; i <= 5; i++) { const a2 = -Math.PI / 2 + (i * 4 * Math.PI) / 5; const px = x + Math.cos(a2) * (r - 7), py = y + Math.sin(a2) * (r - 7); i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.stroke();
  c.font = `12px ${FONT}`; c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle';
  const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ';
  for (let i = 0; i < 12; i++) { const a2 = (i / 12) * Math.PI * 2; c.fillText(runes[i], x + Math.cos(a2) * (r - 3.5), y + Math.sin(a2) * (r - 3.5)); }
  c.restore();
}

function artWindow(c, col, bgTop, bgBot) {
  const x = 18, y = 42, w = CARD_W - 36, h = 132;
  c.save();
  rr(c, x - 3, y - 3, w + 6, h + 6, 8); c.fillStyle = '#05030a'; c.fill();
  rr(c, x, y, w, h, 6); c.clip();
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, bgTop); g.addColorStop(1, bgBot);
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const rg = c.createRadialGradient(CARD_W / 2, y + h * 0.62, 4, CARD_W / 2, y + h * 0.62, w * 0.7);
  rg.addColorStop(0, rgba(col, 0.55)); rg.addColorStop(1, rgba(col, 0));
  c.fillStyle = rg; c.fillRect(x, y, w, h);
  // light rays
  c.globalAlpha = 0.12; c.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(CARD_W / 2 - 4 + i * 10 - 20, y); c.lineTo(CARD_W / 2 + 4 + i * 10 - 20, y); c.lineTo(CARD_W / 2 + i * 34 - 68 + 10, y + h); c.lineTo(CARD_W / 2 + i * 34 - 68 - 10, y + h); c.fill(); }
  c.globalAlpha = 1;
  c.restore();
  return { x, y, w, h };
}

export function drawCreatureCard(id, rarity, portrait, level = 1) {
  const cv = newCanvas(), c = cv.getContext('2d');
  const R = RARITIES[rarity], C = CREATURES[id];
  metalFrame(c, R.color, '#120c1c');
  const win = artWindow(c, R.color, '#1a1030', '#06040c');
  // ground ellipse + portrait
  c.save(); rr(c, win.x, win.y, win.w, win.h, 6); c.clip();
  c.fillStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.ellipse(CARD_W / 2, win.y + win.h - 14, 46, 9, 0, 0, Math.PI * 2); c.fill();
  runeCircle(c, CARD_W / 2, win.y + win.h - 14, 40, R.color, 0.0);
  c.imageSmoothingEnabled = false;
  const s = 3.1;
  c.shadowColor = R.color; c.shadowBlur = rarity >= 2 ? 16 : 6;
  c.drawImage(portrait, 0, 0, 48, 48, CARD_W / 2 - 24 * s + 4, win.y + win.h - 44 * s - 8, 48 * s, 48 * s);
  c.restore();
  roleIcon(c, C.role, 32, 40, R.color);
  gem(c, CARD_W - 32, 40, R.color);
  title(c, C.name, 190, R.color, 20);
  c.font = `800 15px ${BODY}`; c.textAlign = 'center'; c.fillStyle = R.color;
  c.fillText(`${R.name} • ${ROLES[C.role].name}`, CARD_W / 2, 217);
  const hp = Math.round(C.hp * R.mult), atk = Math.round(C.atk * R.mult);
  statBox(c, 18, 232, 'hp', hp, '#e2445a');
  statBox(c, CARD_W - 96, 232, 'atk', atk, '#f0b44a');
  cornerSkulls(c, R.color);
  return cv;
}

export function drawSpellCard(kind, id) {
  const cv = newCanvas(), c = cv.getContext('2d');
  const isCurse = kind === 'curse';
  const D = isCurse ? CURSES[id] : RITUALS[id];
  const col = isCurse ? '#e0303a' : '#9b6bff';
  metalFrame(c, isCurse ? '#8a1a22' : '#6a46c8', isCurse ? '#1a0608' : '#0e0a1e');
  const win = artWindow(c, col, isCurse ? '#2a060a' : '#160c30', '#040208');
  c.save(); rr(c, win.x, win.y, win.w, win.h, 6); c.clip();
  runeCircle(c, CARD_W / 2, win.y + win.h / 2, 54, col, 0.75);
  glyph(c, D.glyph, CARD_W / 2, win.y + win.h / 2, isCurse ? '#ff6a5a' : '#d8b8ff');
  if (isCurse) {
    c.strokeStyle = 'rgba(0,0,0,0.7)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(win.x, win.y + 20); c.lineTo(win.x + 30, win.y + 40); c.lineTo(win.x + 26, win.y + 70); c.stroke();
    c.beginPath(); c.moveTo(win.x + win.w, win.y + 90); c.lineTo(win.x + win.w - 34, win.y + 100); c.lineTo(win.x + win.w - 40, win.y + 132); c.stroke();
    // blood drips from top
    c.fillStyle = '#7a0a12';
    for (const [dx, len] of [[20, 18], [46, 30], [100, 14], [130, 24]]) { c.fillRect(win.x + dx, win.y, 4, len); c.beginPath(); c.arc(win.x + dx + 2, win.y + len, 3.5, 0, Math.PI * 2); c.fill(); }
  }
  c.restore();
  title(c, D.name, 190, col, 20);
  c.save();
  c.font = `900 22px ${TITLE}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = col; c.shadowBlur = 12; c.fillStyle = isCurse ? '#ff9a90' : '#d8c4ff';
  c.fillText(isCurse ? 'LANET' : 'RİTÜEL', CARD_W / 2, 238);
  c.restore();
  c.fillStyle = col;
  for (const dx of [-52, 52]) { c.beginPath(); c.moveTo(CARD_W / 2 + dx, 232); c.lineTo(CARD_W / 2 + dx + 6, 238); c.lineTo(CARD_W / 2 + dx, 244); c.lineTo(CARD_W / 2 + dx - 6, 238); c.fill(); }
  cornerSkulls(c, col);
  return cv;
}

export function drawCardBack() {
  const cv = newCanvas(), c = cv.getContext('2d');
  metalFrame(c, '#5a4a70', '#0c0816');
  c.save(); rr(c, 14, 14, CARD_W - 28, CARD_H - 28, 9); c.clip();
  const g = c.createRadialGradient(CARD_W / 2, CARD_H / 2, 10, CARD_W / 2, CARD_H / 2, 160);
  g.addColorStop(0, '#3a1e64'); g.addColorStop(1, '#07040e');
  c.fillStyle = g; c.fillRect(0, 0, CARD_W, CARD_H);
  // diagonal pattern
  c.strokeStyle = 'rgba(155,123,216,0.12)'; c.lineWidth = 1;
  for (let i = -CARD_H; i < CARD_W + CARD_H; i += 12) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + CARD_H, CARD_H); c.stroke(); c.beginPath(); c.moveTo(i, CARD_H); c.lineTo(i + CARD_H, 0); c.stroke(); }
  runeCircle(c, CARD_W / 2, CARD_H / 2, 70, '#9b7bd8', 0.9);
  // skull
  const x = CARD_W / 2, y = CARD_H / 2;
  c.shadowColor = '#7dff6a'; c.shadowBlur = 20;
  c.fillStyle = '#e8dfc6'; c.beginPath(); c.arc(x, y - 6, 22, 0, Math.PI * 2); c.fill();
  c.fillRect(x - 12, y + 10, 24, 12);
  c.shadowBlur = 0;
  c.fillStyle = '#120a18'; c.beginPath(); c.ellipse(x - 9, y - 4, 6, 7, 0, 0, Math.PI * 2); c.ellipse(x + 9, y - 4, 6, 7, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x - 3, y + 9); c.lineTo(x + 3, y + 9); c.fill();
  for (let i = -2; i <= 2; i++) c.fillRect(x + i * 5 - 1, y + 14, 2, 8);
  c.shadowColor = '#7dff6a'; c.shadowBlur = 12; c.fillStyle = '#9dff8a';
  c.beginPath(); c.arc(x - 9, y - 3, 2.5, 0, Math.PI * 2); c.arc(x + 9, y - 3, 2.5, 0, Math.PI * 2); c.fill();
  c.restore();
  cornerSkulls(c, '#7dff6a');
  return cv;
}

// Soft glow behind card, tinted at runtime
export function drawCardGlow() {
  const pad = 30, cv = newCanvas(CARD_W + pad * 2, CARD_H + pad * 2), c = cv.getContext('2d');
  c.shadowColor = '#ffffff'; c.shadowBlur = 26; c.fillStyle = '#ffffff';
  rr(c, pad, pad, CARD_W, CARD_H, 16); c.fill(); c.fill();
  return cv;
}

// Sheen sweep frames clipped to card shape
export function drawSheenFrames(n = 16) {
  const cv = newCanvas(CARD_W * n, CARD_H), c = cv.getContext('2d');
  for (let k = 0; k < n; k++) {
    c.save(); c.translate(k * CARD_W, 0);
    rr(c, 2, 2, CARD_W - 4, CARD_H - 4, 16); c.clip();
    const p = (k / (n - 1)) * 1.6 - 0.3;
    const cx = p * (CARD_W + CARD_H);
    const g = c.createLinearGradient(cx - 70, 0, cx + 70, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, 'rgba(255,255,255,0.10)'); g.addColorStop(0.5, 'rgba(255,255,255,0.42)'); g.addColorStop(0.55, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.setTransform(1, 0, -0.6, 1, k * CARD_W, 0);
    c.fillStyle = g; c.fillRect(-CARD_W, 0, CARD_W * 4, CARD_H);
    c.restore();
  }
  return cv;
}

// Frame + icon for a run-upgrade ("Lütuf") choice. Text is drawn by the game on top.
export const BOON_W = 240, BOON_H = 380;
export function drawBoonFrame(icon, colHex) {
  const cv = newCanvas(BOON_W, BOON_H), c = cv.getContext('2d');
  const col = colHex;
  // frame
  const g = c.createLinearGradient(0, 0, BOON_W, BOON_H);
  g.addColorStop(0, lighten(col, 0.45)); g.addColorStop(0.3, col); g.addColorStop(0.6, darken(col, 0.4)); g.addColorStop(1, lighten(col, 0.15));
  rr(c, 2, 2, BOON_W - 4, BOON_H - 4, 18); c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = '#05030a'; c.stroke();
  rr(c, 12, 12, BOON_W - 24, BOON_H - 24, 12);
  const bg = c.createLinearGradient(0, 12, 0, BOON_H - 12); bg.addColorStop(0, '#1c1230'); bg.addColorStop(1, '#07040c');
  c.fillStyle = bg; c.fill();
  // icon halo
  const cx = BOON_W / 2, cy = 104;
  const rg = c.createRadialGradient(cx, cy, 4, cx, cy, 90); rg.addColorStop(0, rgba(col, 0.55)); rg.addColorStop(1, rgba(col, 0));
  c.fillStyle = rg; c.fillRect(12, 12, BOON_W - 24, 190);
  runeCircle(c, cx, cy, 62, col, 0.8);
  const roles = ['tank', 'attacker', 'ranger', 'healer'];
  if (roles.includes(icon)) { c.save(); c.translate(cx, cy); c.scale(2.2, 2.2); roleIcon(c, icon, 0, 0, col); c.restore(); }
  else if (icon === 'gem') { c.save(); c.translate(cx, cy); c.scale(2.2, 2.2); gem(c, 0, 0, col); c.restore(); }
  else glyph(c, { staff: 'eye', heart: 'drop', soul: 'soul', card: 'hand', coin: 'sun', ward: 'shield', skull: 'ghost' }[icon] || 'soul', cx, cy, '#ffffff');
  // divider under icon
  c.fillStyle = col; c.fillRect(30, 186, BOON_W - 60, 2);
  return cv;
}
