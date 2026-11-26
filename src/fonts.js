// Font stacks: Cinzel for gothic headings, Nunito for readable body text and numbers.
export const TITLE = "'Cinzel', Georgia, 'Times New Roman', serif";
export const BODY = "'Nunito', 'Segoe UI', Roboto, Arial, sans-serif";
// Canvas renders at 2x the world size for crisp text on phones; players on slow devices can pick 1x.
let low = false;
try { low = localStorage.getItem('necro_lowres') === '1'; } catch (e) { /* ignore */ }
export const ZOOM = low ? 1 : 2;
export function setLowRes(v) { try { localStorage.setItem('necro_lowres', v ? '1' : '0'); } catch (e) { /* ignore */ } }
