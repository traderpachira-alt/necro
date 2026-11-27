// Tiny synthesized sound effects (Web Audio).
let ctx = null, master = null, muted = false, unlocked = false;
try { muted = localStorage.getItem('necro_muted') === '1'; } catch (e) { /* ignore */ }

function ac() {
  if (!unlocked) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function unlockAudio() { unlocked = true; ac(); }
export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; try { localStorage.setItem('necro_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ } return muted; }

function tone({ type = 'square', f0 = 440, f1 = f0, dur = 0.1, vol = 0.3, delay = 0, attack = 0.005 }) {
  const a = ac(); if (!a || muted) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise({ dur = 0.15, vol = 0.3, freq = 1200, q = 1, type = 'bandpass', delay = 0, f1 }) {
  const a = ac(); if (!a || muted) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = a.currentTime + delay;
  const s = a.createBufferSource(); s.buffer = noiseBuf;
  const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur); fl.Q.value = q;
  const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}

const last = {};
function throttle(k, ms) { const n = performance.now(); if (last[k] && n - last[k] < ms) return true; last[k] = n; return false; }

export const sfx = {
  click() { tone({ type: 'square', f0: 660, f1: 880, dur: 0.05, vol: 0.12 }); },
  hit() { if (throttle('hit', 45)) return; noise({ dur: 0.08, vol: 0.25, freq: 900, q: 0.8 }); tone({ type: 'square', f0: 180, f1: 80, dur: 0.07, vol: 0.12 }); },
  crit() { noise({ dur: 0.12, vol: 0.35, freq: 1600, q: 0.6 }); tone({ type: 'sawtooth', f0: 520, f1: 120, dur: 0.12, vol: 0.15 }); },
  slam() { noise({ dur: 0.3, vol: 0.4, freq: 300, type: 'lowpass', f1: 80 }); tone({ type: 'sine', f0: 90, f1: 40, dur: 0.3, vol: 0.4 }); },
  arrow() { if (throttle('arrow', 60)) return; noise({ dur: 0.12, vol: 0.12, freq: 3000, q: 2, f1: 900 }); },
  bolt() { if (throttle('bolt', 60)) return; tone({ type: 'sawtooth', f0: 220, f1: 660, dur: 0.18, vol: 0.08 }); tone({ type: 'sine', f0: 440, f1: 990, dur: 0.18, vol: 0.08 }); },
  holy() { if (throttle('holy', 80)) return; tone({ type: 'triangle', f0: 880, f1: 1320, dur: 0.15, vol: 0.08 }); },
  heal() { if (throttle('heal', 120)) return; [523, 659, 784].forEach((f, i) => tone({ type: 'sine', f0: f, dur: 0.18, vol: 0.07, delay: i * 0.05 })); },
  death() { if (throttle('death', 80)) return; noise({ dur: 0.35, vol: 0.2, freq: 600, type: 'lowpass', f1: 100 }); tone({ type: 'square', f0: 200, f1: 50, dur: 0.3, vol: 0.08 }); },
  bones() { if (throttle('bones', 80)) return; for (let i = 0; i < 4; i++) noise({ dur: 0.04, vol: 0.2, freq: 2000 + Math.random() * 1500, q: 4, delay: i * 0.05 }); },
  summon() { noise({ dur: 0.9, vol: 0.3, freq: 150, type: 'lowpass', f1: 600 }); tone({ type: 'sawtooth', f0: 55, f1: 110, dur: 0.9, vol: 0.12 }); [392, 466, 587].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.06, delay: 0.5 + i * 0.08 })); },
  flip() { noise({ dur: 0.12, vol: 0.18, freq: 2500, q: 1, f1: 5000 }); },
  deal() { noise({ dur: 0.07, vol: 0.12, freq: 3500, q: 1.5 }); },
  rare() { [660, 880].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.2, vol: 0.1, delay: i * 0.07 })); },
  epic() { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.25, vol: 0.1, delay: i * 0.07 })); },
  legendary() { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => { tone({ type: 'triangle', f0: f, dur: 0.5, vol: 0.12, delay: i * 0.08 }); tone({ type: 'sine', f0: f * 2, dur: 0.4, vol: 0.04, delay: i * 0.08 }); }); noise({ dur: 1.2, vol: 0.1, freq: 6000, q: 0.5, delay: 0.3 }); },
  curse() { tone({ type: 'sawtooth', f0: 110, f1: 55, dur: 0.6, vol: 0.12 }); tone({ type: 'sawtooth', f0: 116, f1: 58, dur: 0.6, vol: 0.12 }); },
  waveStart() { [0, 0.25, 0.5].forEach((d, i) => { noise({ dur: 0.2, vol: 0.4, freq: 120, type: 'lowpass', delay: d }); tone({ type: 'sine', f0: 70 - i * 5, f1: 40, dur: 0.25, vol: 0.4, delay: d }); }); tone({ type: 'sawtooth', f0: 220, dur: 0.6, vol: 0.06, delay: 0.75 }); tone({ type: 'sawtooth', f0: 330, dur: 0.6, vol: 0.05, delay: 0.75 }); },
  waveClear() { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.15, vol: 0.07, delay: i * 0.1 })); },
  gameOver() { [392, 349, 311, 262].forEach((f, i) => tone({ type: 'sawtooth', f0: f, f1: f * 0.98, dur: 0.4, vol: 0.1, delay: i * 0.3 })); },
  soul() { if (throttle('soul', 50)) return; tone({ type: 'sine', f0: 1200, f1: 1800, dur: 0.08, vol: 0.05 }); },
  error() { tone({ type: 'square', f0: 160, f1: 120, dur: 0.15, vol: 0.1 }); },
};

// short vibration on supported phones (silent when muted)
export function buzz(ms = 30) { try { if (!muted && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ } }
