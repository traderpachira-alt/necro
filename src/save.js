// Persistent save: always in localStorage, optionally synced to the player's own private GitHub Gist.
// The GitHub token is stored only in this browser's localStorage and only sent to api.github.com.

const KEY = 'necro_save_v1';
const TOKEN_KEY = 'necro_gist_token';
const GIST_FILE = 'necromancer-save.json';
const API = 'https://api.github.com';

function defaults() {
  return { v: 1, updatedAt: 0, best: 0, bestWave: 0, darkSouls: 0, meta: {}, grimoire: [], scores: [], gistId: null, runs: 0 };
}

function read() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return defaults(); }
}

export const save = read();
export const cloud = { status: 'off', message: '', lastSync: 0 };
const listeners = new Set();
export function onCloudChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function setCloud(status, message = '') { cloud.status = status; cloud.message = message; listeners.forEach((f) => f(cloud)); }

function writeLocal() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ } }

let pushTimer = null;
export function persist() {
  save.updatedAt = Date.now();
  writeLocal();
  if (getToken()) { clearTimeout(pushTimer); pushTimer = setTimeout(() => pushCloud().catch(() => {}), 1500); }
}

export function metaLevel(k) { return save.meta[k] || 0; }

export function recordRun(score, wave, kills) {
  save.runs = (save.runs || 0) + 1;
  save.best = Math.max(save.best, score);
  save.bestWave = Math.max(save.bestWave || 0, wave);
  save.scores.push({ score, wave, kills, date: Date.now() });
  save.scores.sort((a, b) => b.score - a.score);
  save.scores = save.scores.slice(0, 20);
  persist();
}

export function discover(hybridKey) {
  if (save.grimoire.includes(hybridKey)) return false;
  save.grimoire.push(hybridKey); persist(); return true;
}

// ---------------- cloud (GitHub Gist) ----------------
export function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
export function setToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t.trim()); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
  if (!t) { save.gistId = null; writeLocal(); setCloud('off'); }
}

async function gh(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (res.status === 401) throw new Error('Token geçersiz');
  if (res.status === 403) throw new Error('Token\'ın gist izni yok');
  if (!res.ok) throw new Error('GitHub hatası ' + res.status);
  return res.json();
}

function payload() { const { gistId, ...rest } = save; return JSON.stringify(rest, null, 1); }

function merge(remote) {
  if (!remote || typeof remote !== 'object') return;
  const newer = (remote.updatedAt || 0) > (save.updatedAt || 0);
  save.best = Math.max(save.best || 0, remote.best || 0);
  save.bestWave = Math.max(save.bestWave || 0, remote.bestWave || 0);
  save.grimoire = [...new Set([...(save.grimoire || []), ...(remote.grimoire || [])])];
  const seen = new Set();
  save.scores = [...(save.scores || []), ...(remote.scores || [])]
    .filter((s) => { const k = s.date + ':' + s.score; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => b.score - a.score).slice(0, 20);
  if (newer) {
    save.darkSouls = remote.darkSouls || 0;
    save.meta = remote.meta || {};
    save.runs = Math.max(save.runs || 0, remote.runs || 0);
    save.updatedAt = remote.updatedAt;
  }
}

async function findGist() {
  if (save.gistId) return save.gistId;
  const list = await gh('/gists?per_page=100');
  const g = list.find((x) => x.files && x.files[GIST_FILE]);
  if (g) { save.gistId = g.id; writeLocal(); }
  return save.gistId;
}

export async function pullCloud() {
  if (!getToken()) return false;
  setCloud('sync', 'Eşitleniyor...');
  try {
    const id = await findGist();
    if (id) {
      const g = await gh('/gists/' + id);
      const f = g.files && g.files[GIST_FILE];
      let content = f && f.content;
      if (f && f.truncated && f.raw_url) content = await (await fetch(f.raw_url)).text();
      if (content) merge(JSON.parse(content));
      writeLocal();
    }
    await pushCloud(true);
    return true;
  } catch (e) { setCloud('error', e.message); return false; }
}

export async function pushCloud(silentStatus) {
  if (!getToken()) return false;
  if (!silentStatus) setCloud('sync', 'Kaydediliyor...');
  try {
    const id = await findGist();
    const body = { description: 'Necromancer oyun kaydı', files: { [GIST_FILE]: { content: payload() } } };
    if (id) await gh('/gists/' + id, { method: 'PATCH', body: JSON.stringify(body) });
    else { const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ ...body, public: false }) }); save.gistId = g.id; writeLocal(); }
    cloud.lastSync = Date.now();
    setCloud('ok', 'Bulutta kayıtlı');
    return true;
  } catch (e) { setCloud('error', e.message); return false; }
}
