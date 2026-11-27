// Screen layout. World width is fixed (540); height adapts to the device aspect ratio so tall
// phones get a bigger card area instead of empty letterbox bars.
export const W = 540;
const aspect = (window.innerHeight || 960) / (window.innerWidth || 540);
export const H = Math.round(Math.min(1240, Math.max(960, W * aspect)));
// The top BF px of the painted backdrop (empty sky) are cropped off to give the card area more room.
export const BF = 100;
export const PANEL_Y = 570 - BF;
export const EXTRA = H - PANEL_Y - 390;
export const INFO_Y = PANEL_Y + 14;
export const INFO_H = 88 + Math.round(Math.min(36, EXTRA * 0.15));
export const CARD_SCALE = 1 + Math.min(0.62, EXTRA / 400);
export const BTN_Y = H - 48;
export const HAND_Y = Math.round((INFO_Y + INFO_H + BTN_Y - 31) / 2 + 6);
export const DECK = { x: 52, y: BTN_Y - 4 };
