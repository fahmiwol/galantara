#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Benteng — audit warna terukur
//
// Benteng dimainkan dengan membaca dua hal sekilas: warna tim (siapa
// lawan) dan terang-redupnya aura (siapa yang menang kalau bersentuhan).
// Kalau salah satu tidak terbaca, aturannya tidak terbaca.
//
// Alat ini mengukurnya, bukan menilainya dengan mata.
//
//   node tools/benteng-visual-audit.mjs
//
// ACUAN
// - Kontras: WCAG 2.2 rasio luminansi relatif. Teks biasa >= 4.5:1,
//   teks besar >= 3:1 (SC 1.4.3), komponen non-teks >= 3:1 (SC 1.4.11).
//   https://www.w3.org/TR/WCAG22/#contrast-minimum
// - Buta warna: matriks simulasi Machado, Oliveira & Fernandes (2009),
//   "A Physiologically-based Model for Simulation of Color Vision
//   Deficiency", IEEE TVCG 15(6). Severity 1.0 (dikromat penuh).
// - Jarak warna: CIE76 dE*ab di CIELAB (D65). Ambang yang dipakai di
//   sini: dE >= 20 untuk dua kategori yang harus dibedakan sekilas
//   saat bergerak. dE ~2.3 baru "beda kalau diperhatikan" (JND), jadi
//   untuk objek 20 px yang bergerak cepat, ambangnya sengaja jauh lebih
//   tinggi daripada JND.
// - Prevalensi: defisiensi merah-hijau ~8% pria keturunan Eropa utara,
//   deuteranomali paling umum. Itu sebabnya deuteranopia diuji lebih dulu.
// ═══════════════════════════════════════════════════════════════

import { BENTENG_CONFIG } from '../src/games/benteng/config.js';

// ── sRGB / CIELAB ─────────────────────────────────────────────

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(clamp255(v)).toString(16).padStart(2, '0')).join('')}`;
const clamp255 = (v) => Math.max(0, Math.min(255, v));

const linearise = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (rgb) => {
  const [r, g, b] = rgb.map(linearise);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** sRGB -> CIELAB, illuminant D65. */
function rgbToLab(rgb) {
  const [r, g, b] = rgb.map(linearise);
  // sRGB -> XYZ (D65)
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / 1.0;
  const z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116));
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [(116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIE76 dE*ab. Cukup untuk pertanyaan "dua kategori ini terpisah?". */
function deltaE(a, b) {
  const [l1, a1, b1] = rgbToLab(a);
  const [l2, a2, b2] = rgbToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

// ── Simulasi buta warna (Machado et al. 2009, severity 1.0) ────

const CVD = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.011820, 0.042940, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.303900],
  ],
};

function simulate(rgb, kind) {
  if (kind === 'normal') return rgb;
  const m = CVD[kind];
  return m.map((row) => clamp255(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]));
}

// ── Yang diuji ────────────────────────────────────────────────

const V = BENTENG_CONFIG.visual;
const GROUND = hexToRgb('#050817'); // latar arena tergelap

const TEAM_PAIR = {
  label: 'warna tim (biru vs merah)',
  a: ['biru', hexToRgb(V.teamColors.biru)],
  b: ['merah', hexToRgb(V.teamColors.merah)],
  ambang: 20,
};

// Aura adalah tangga: yang penting tiap anak tangga beda dari TETANGGANYA,
// karena itulah perbandingan yang dibaca pemain saat nyala meredup.
const AURA_STEPS = [
  ['penuh', hexToRgb(V.aura.high)],
  ['sedang', hexToRgb(V.aura.medium)],
  ['rendah', hexToRgb(V.aura.low)],
  ['habis', hexToRgb(V.aura.empty)],
];

const VISIONS = ['normal', 'deuteranopia', 'protanopia', 'tritanopia'];
const AMBANG_TANGGA = 20;

// ── Laporan ───────────────────────────────────────────────────

const pad = (t, n) => String(t).padEnd(n);
const padL = (t, n) => String(t).padStart(n);
let gagal = 0;

console.log('\nBENTENG — audit warna\n');
console.log('Acuan: WCAG 2.2 (kontras) · Machado dkk. 2009 (simulasi buta warna) · CIE76 dE*ab\n');

// 1. Kontras terhadap latar arena
console.log('1. Kontras terhadap latar arena  (SC 1.4.11 komponen non-teks, min 3:1)');
console.log(`   ${pad('warna', 22)}${padL('rasio', 8)}   status`);
const kontrasUji = [
  ['tim biru', hexToRgb(V.teamColors.biru)],
  ['tim merah', hexToRgb(V.teamColors.merah)],
  ...AURA_STEPS.map(([n, c]) => [`aura ${n}`, c]),
];
for (const [nama, warna] of kontrasUji) {
  const r = contrast(warna, GROUND);
  const ok = r >= 3;
  if (!ok) gagal += 1;
  console.log(`   ${pad(nama, 22)}${padL(r.toFixed(2), 8)}   ${ok ? 'lulus' : 'GAGAL'}`);
}

// 2. Warna tim tetap terpisah di semua jenis penglihatan
console.log(`\n2. Warna tim terpisah  (dE >= ${TEAM_PAIR.ambang})`);
console.log(`   ${pad('penglihatan', 22)}${padL('dE', 8)}   status`);
for (const vision of VISIONS) {
  const d = deltaE(simulate(TEAM_PAIR.a[1], vision), simulate(TEAM_PAIR.b[1], vision));
  const ok = d >= TEAM_PAIR.ambang;
  if (!ok) gagal += 1;
  console.log(`   ${pad(vision, 22)}${padL(d.toFixed(1), 8)}   ${ok ? 'lulus' : 'GAGAL'}`);
}

// 3. Tangga aura: tiap anak tangga vs tetangganya
console.log(`\n3. Tangga aura, anak tangga vs tetangga  (dE >= ${AMBANG_TANGGA})`);
const header = VISIONS.map((v) => padL(v.slice(0, 8), 10)).join('');
console.log(`   ${pad('pasangan', 22)}${header}`);
for (let i = 0; i < AURA_STEPS.length - 1; i += 1) {
  const [n1, c1] = AURA_STEPS[i];
  const [n2, c2] = AURA_STEPS[i + 1];
  const cells = VISIONS.map((vision) => {
    const d = deltaE(simulate(c1, vision), simulate(c2, vision));
    if (d < AMBANG_TANGGA) gagal += 1;
    return padL(`${d.toFixed(1)}${d < AMBANG_TANGGA ? '!' : ''}`, 10);
  }).join('');
  console.log(`   ${pad(`${n1} -> ${n2}`, 22)}${cells}`);
}

// 4. Bagaimana warna itu terlihat oleh mata deuteranopia
console.log('\n4. Rupa warna di mata deuteranopia (jenis paling umum)');
console.log(`   ${pad('warna', 22)}${pad('asli', 12)}terlihat sebagai`);
for (const [nama, warna] of kontrasUji) {
  console.log(`   ${pad(nama, 22)}${pad(rgbToHex(warna), 12)}${rgbToHex(simulate(warna, 'deuteranopia'))}`);
}

console.log(`\n${gagal === 0 ? 'Semua ambang lulus.' : `${gagal} ambang GAGAL — tanda ! menandai pasangan yang menyatu.`}`);
console.log('Aura juga dibedakan oleh ketebalan cincin, jadi warna bukan satu-satunya');
console.log('penanda (WCAG SC 1.4.1). Audit ini menguji apakah warnanya sendiri cukup.\n');

process.exitCode = gagal > 0 ? 1 : 0;
