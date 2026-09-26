// ═══════════════════════════════════════════════════════
// agen/warna.js — colour distance the way this repo measures it (ADR-0011)
//
// CIE76 ΔE*ab in CIELAB (D65), checked under protanopia, deuteranopia and
// tritanopia with the Machado, Oliveira & Fernandes (2009) matrices at severity
// 1,0 — the SAME method as tools/benteng-visual-audit.mjs and the design
// report's ukur-warna.mjs (matrices applied to 8-bit sRGB, as there), so numbers
// from the three tools can be compared. Working threshold: ΔE ≥ 20.
//
// ADR-0017: decisions about what a player SEES are measured on rendered pixels.
// These helpers take whatever colours they are given — material colours in the
// unit tests (a necessary condition), pixels read back from Chromium in the
// measurement run (the decision).
// ═══════════════════════════════════════════════════════

export const PENGLIHATAN = Object.freeze(['normal', 'deuteranopia', 'protanopia', 'tritanopia']);

const CVD = Object.freeze({
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
});

const klem = (v) => Math.max(0, Math.min(255, v));

/** 0xRRGGBB, '#rrggbb' or [r,g,b] (0–255) → [r,g,b]. */
export function keRgb(w) {
  if (Array.isArray(w)) return w;
  if (typeof w === 'number') return [(w >> 16) & 255, (w >> 8) & 255, w & 255];
  const h = String(w).replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function simulasi(rgb, jenis) {
  if (jenis === 'normal') return rgb;
  const m = CVD[jenis];
  return m.map((r) => klem(r[0] * rgb[0] + r[1] * rgb[1] + r[2] * rgb[2]));
}

function linear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function keLab(rgb) {
  const [r, g, b] = rgb.map(linear);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 ΔE*ab between two colours (any form keRgb accepts). */
export function deltaE(a, b) {
  const [l1, a1, b1] = keLab(keRgb(a));
  const [l2, a2, b2] = keLab(keRgb(b));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** ΔE in each of the four visions: { normal, deuteranopia, protanopia, tritanopia, min }. */
export function deltaEPenglihatan(a, b) {
  const ra = keRgb(a); const rb = keRgb(b);
  const out = {};
  for (const v of PENGLIHATAN) out[v] = deltaE(simulasi(ra, v), simulasi(rb, v));
  out.min = Math.min(...PENGLIHATAN.map((v) => out[v]));
  return out;
}
