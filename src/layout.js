// Screen layout. World width is fixed (540); height adapts to the device aspect ratio so tall
// phones get a bigger card area instead of empty letterbox bars.
export const W = 540;
const aspect = (window.innerHeight || 960) / (window.innerWidth || 540);
export const H = Math.round(Math.min(1240, Math.max(960, W * aspect)));
export const EXTRA = H - 960;
export const PANEL_Y = 570;
export const INFO_Y = 584;
export const INFO_H = 88 + Math.round(Math.min(40, EXTRA * 0.2));
export const CARD_SCALE = 1 + Math.min(0.42, EXTRA / 480);
export const BTN_Y = H - 48;
export const HAND_Y = Math.round((INFO_Y + INFO_H + BTN_Y - 31) / 2 + 6);
export const DECK = { x: 52, y: BTN_Y - 4 };
