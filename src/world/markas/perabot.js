// ═══════════════════════════════════════════════════════
// markas/perabot.js — Nusantara office props for the Markas, "90-an syahdu"
//
// SPRINT-02 C butir 4 (laporan 3D §6b M2, RISET_VISUAL_SENJA_90AN): the things of an
// Indonesian office or pos ronda in the 90s — enamel cup + flask of tea, a manual
// typewriter, a transistor radio, the shop's wall calendar, an archive shelf of
// ordner, a pandan mat. Procedural, vertex-coloured from the Senja/Oola palette,
// each ≤ 300 triangles (tests/markasPerabot.test.mjs).
//
// Draw-call cost (+2 for the Markas):
//   gelas_termos   one per desk, drawn only on desks whose party slot is taken —
//                  a cup is "someone works here" (visual follows real state, VISI).
//                  Repeats 4× and changes with data → InstancedMesh, 1 DC.
//   the rest       each appears ONCE: merged into one static mesh, 1 DC. Instancing a
//                  thing that appears once buys nothing (KEPUTUSAN §1: instance what
//                  repeats ≥ 3×); one InstancedMesh per kind would have cost 5 DC.
// Every kind is still ONE cached geometry (`geometriPerabot`), so a later Spot or the
// private Markas (M3) can instance any of them without new modelling.
//
// Each kind is modelled in its own frame: origin at the centre of its footprint on
// the surface it stands on, +Z = the side that faces the viewer (or the typist).
// ═══════════════════════════════════════════════════════

import { bakeGeometri, gabungGeometri, cat, bidangPoligon } from '../geometri.js';

/** Palette: RISET_VISUAL_SENJA_90AN §5 + brief Oola §4, plus two object colours (kopi, tinta). */
export const WARNA_PERABOT = Object.freeze({
  kapur: 0xF4EAD6,       // enamel, paper, calendar (senja kapur)
  nila: 0x3D6B9E,        // enamel rim, ordner (senja nila)
  bata: 0xC05E3C,        // flask, calendar header, ordner (senja_bata)
  seng: 0x7D848C,        // flask cap, roller ends, antenna (senja seng)
  rumput: 0x6F7F4A,      // typewriter body, ordner, mat border (senja rumput)
  ufuk: 0xF2A65A,        // calendar picture sky, ordner (senja_ufuk)
  ungu: 0x4A3B63,        // calendar picture hills (senja_ungu)
  tanah_terang: 0xA98055,// radio leather case, darker pandan strand (senja tanah_terang)
  anyaman: 0xD7C39B,     // pandan, radio grille (brief Oola papan)
  pandan_tua: 0xC2AA7C,  // the second pandan strand: anyaman darkened ~8 L*, a weave not a chessboard
  kayu: 0x8A6B4F,        // shelf (brief Oola kayu / senja tanah)
  kuningan: 0xE9C86A,    // radio dial, typewriter keys' rims (brief Oola emas)
  kopi: 0x3B2A1E,        // tea/coffee in the cup
  tinta: 0x2A1F14,       // typewriter keys and platen (world UI ink --gw-tinta)
});

export const JENIS_PERABOT = Object.freeze(['gelas_termos', 'mesin_ketik', 'radio', 'kalender', 'rak_arsip', 'tikar_pandan']);

/** Sizes (m) the placements and tests read. */
export const UKURAN_PERABOT = Object.freeze({
  rak_arsip: Object.freeze({ lebar: 0.46, tinggi: 1.1, dalam: 0.24 }),
  tikar_pandan: Object.freeze({ panjang: 1.5, lebar: 0.95, tebal: 0.008 }),
  kalender: Object.freeze({ lebar: 0.32, tinggi: 0.46 }),
  mesin_ketik: Object.freeze({ lebar: 0.34, dalam: 0.28 }),
});

const W = WARNA_PERABOT;
const kotak = (u, letak, putar, warna) => cat(bakeGeometri(new THREE.BoxGeometry(u[0], u[1], u[2]), { letak, putar }), warna);
/**
 * Cylinder built upright at the origin, then turned and placed. `tutup: 'atas'` adds
 * the top cap only (the bottom always rests on something or is never seen);
 * 'tanpa' leaves both ends open (bands, a roller seen side-on, a rim).
 */
const tabung = (rA, rB, t, sisi, letak, warna, { tutup = 'atas', putar = null } = {}) => {
  const bagian = [bakeGeometri(new THREE.CylinderGeometry(rA, rB, t, sisi, 1, true))];
  // thetaStart −π/2 puts the cap's vertices on the tube's top ring (no seam).
  if (tutup === 'atas') bagian.push(bakeGeometri(new THREE.CircleGeometry(rA, sisi, -Math.PI / 2), { letak: [0, t / 2, 0], putar: [-Math.PI / 2, 0, 0] }));
  const g = bagian.length === 1 ? bagian[0] : gabungGeometri(bagian);
  const h = bakeGeometri(g, { letak, putar });
  for (const x of new Set([...bagian, g])) x.dispose();
  return cat(h, warna);
};
/** Flat one-sided quad facing +Z, centred at `letak`. */
const petak = (l, t, letak, warna, putar = null) => cat(bakeGeometri(bidangPoligon([[-l / 2, -t / 2], [l / 2, -t / 2], [l / 2, t / 2], [-l / 2, t / 2]], { duaSisi: false }), { letak, putar }), warna);
/** Box without its bottom face (it rests on something): 10 triangles. */
function kotakTanpaAlas(u, letak, warna, putar = null) {
  const g = bakeGeometri(new THREE.BoxGeometry(u[0], u[1], u[2]));
  const p = g.attributes.position;
  const simpan = [];
  const nSimpan = [];
  for (let t = 0; t < p.count; t += 3) {
    if (g.attributes.normal.getY(t) < -0.5) continue;
    for (let i = 0; i < 9; i++) { simpan.push(p.array[t * 3 + i]); nSimpan.push(g.attributes.normal.array[t * 3 + i]); }
  }
  g.dispose();
  const h = new THREE.BufferGeometry();
  h.setAttribute('position', new THREE.Float32BufferAttribute(simpan, 3));
  h.setAttribute('normal', new THREE.Float32BufferAttribute(nSimpan, 3));
  return cat(bakeGeometri(h, { letak, putar }), warna);
}

// ── The six kinds ───────────────────────────────────────────────────
function gelasTermos() {
  const b = [];
  // Termos: red body with a paper band, grey cup-cap — the flask of hot tea on every 90s desk.
  b.push(tabung(0.062, 0.062, 0.24, 8, [0.07, 0.12, -0.02], W.bata, { tutup: 'tanpa' }));
  b.push(tabung(0.064, 0.064, 0.05, 8, [0.07, 0.17, -0.02], W.kapur, { tutup: 'tanpa' }));
  b.push(tabung(0.048, 0.058, 0.07, 8, [0.07, 0.275, -0.02], W.seng));
  // Gelas enamel: white with a blue rim, tea inside, a handle.
  b.push(tabung(0.042, 0.038, 0.085, 8, [-0.07, 0.0425, 0.03], W.kapur, { tutup: 'tanpa' }));
  b.push(tabung(0.044, 0.044, 0.012, 8, [-0.07, 0.079, 0.03], W.nila, { tutup: 'tanpa' }));
  b.push(cat(bakeGeometri(new THREE.CircleGeometry(0.04, 8, -Math.PI / 2), { letak: [-0.07, 0.068, 0.03], putar: [-Math.PI / 2, 0, 0] }), W.kopi));
  b.push(kotak([0.012, 0.05, 0.035], [-0.07 - 0.05, 0.045, 0.03], null, W.kapur));
  return b;
}

function mesinKetik() {
  const b = [];
  // Body: a low olive box with a sloped keyboard deck in front (typist side = +Z).
  b.push(kotakTanpaAlas([0.34, 0.08, 0.2], [0, 0.04, -0.03], W.rumput));
  b.push(kotak([0.32, 0.03, 0.12], [0, 0.06, 0.1], [0.35, 0, 0], W.rumput));
  // Three rows of keys: dark strips with brass rims — one strip per row.
  for (let r = 0; r < 3; r++) b.push(kotak([0.26 - r * 0.02, 0.012, 0.022], [0, 0.085 - r * 0.012, 0.14 - r * 0.035], [0.35, 0, 0], r === 0 ? W.kuningan : W.tinta));
  // Platen roller with knobs, and the sheet standing up behind it.
  b.push(tabung(0.028, 0.028, 0.38, 8, [0, 0.105, -0.07], W.tinta, { tutup: 'tanpa', putar: [0, 0, Math.PI / 2] }));
  for (const x of [-0.2, 0.2]) b.push(tabung(0.035, 0.035, 0.02, 6, [x, 0.105, -0.07], W.seng, { tutup: 'tanpa', putar: [0, 0, Math.PI / 2] }));
  b.push(cat(bakeGeometri(bidangPoligon([[-0.1, 0], [0.1, 0], [0.1, 0.15], [-0.1, 0.15]], { duaSisi: true }), { letak: [0, 0.12, -0.09], putar: [-0.2, 0, 0] }), W.kapur));
  return b;
}

function radio() {
  const b = [];
  // Leather-cased transistor radio: case, grille, dial, knob, telescopic antenna, strap.
  b.push(kotakTanpaAlas([0.24, 0.15, 0.08], [0, 0.075, 0], W.tanah_terang));
  b.push(petak(0.12, 0.09, [-0.045, 0.075, 0.041], W.anyaman));
  b.push(cat(bakeGeometri(new THREE.CircleGeometry(0.03, 8), { letak: [0.065, 0.085, 0.041] }), W.kuningan));
  b.push(tabung(0.012, 0.012, 0.02, 6, [0.065, 0.04, 0.045], W.tinta, { tutup: 'tanpa', putar: [Math.PI / 2, 0, 0] }));
  b.push(kotak([0.008, 0.36, 0.008], [0.1 + 0.36 / 2 * Math.sin(0.5), 0.15 + 0.36 / 2 * Math.cos(0.5), -0.02], [0, 0, -0.5], W.seng));
  b.push(kotak([0.18, 0.012, 0.02], [0, 0.165, 0], null, W.tinta));
  return b;
}

function kalender() {
  const { lebar: L, tinggi: T } = UKURAN_PERABOT.kalender;
  const b = [];
  // Hangs from a nail by a string (the triangle), paper sheet, red shop header,
  // a senja picture (sky + two hills), and the date grid lines.
  b.push(petak(L, T, [0, -T / 2, 0], W.kapur));
  b.push(petak(L, 0.06, [0, -0.03, 0.002], W.bata));
  b.push(petak(L - 0.04, 0.14, [0, -0.06 - 0.075, 0.002], W.ufuk));
  b.push(cat(bakeGeometri(bidangPoligon([[-0.14, 0], [0.02, 0], [-0.06, 0.08]], { duaSisi: false }), { letak: [0, -0.2, 0.004] }), W.ungu));
  b.push(cat(bakeGeometri(bidangPoligon([[-0.04, 0], [0.14, 0], [0.06, 0.06]], { duaSisi: false }), { letak: [0, -0.2, 0.004] }), W.rumput));
  for (let i = 0; i < 4; i++) b.push(petak(L - 0.04, 0.006, [0, -0.25 - i * 0.05, 0.002], W.tanah_terang));
  for (let i = 0; i < 6; i++) b.push(petak(0.006, 0.15, [-0.13 + i * 0.052, -0.325, 0.002], W.tanah_terang));
  b.push(cat(bakeGeometri(bidangPoligon([[-0.1, 0], [0.1, 0], [0, 0.07]], { duaSisi: false }), { letak: [0, 0, -0.001] }), W.tinta));
  return b;
}

function rakArsip() {
  const { lebar: L, tinggi: T, dalam: D } = UKURAN_PERABOT.rak_arsip;
  const b = [];
  const tb = 0.025;
  // Frame: two sides, top, back panel, two shelves (the floor is the bottom shelf).
  for (const x of [-L / 2 + tb / 2, L / 2 - tb / 2]) b.push(kotakTanpaAlas([tb, T, D], [x, T / 2, 0], W.kayu));
  b.push(kotak([L, tb, D], [0, T - tb / 2, 0], null, W.kayu));
  b.push(petak(L - 2 * tb, T - tb, [0, (T - tb) / 2, -D / 2 + 0.005], W.kayu));
  const rak = [0.03, 0.39, 0.74];
  for (const y of rak.slice(1)) b.push(kotak([L - 2 * tb, tb, D], [0, y - tb / 2, 0], null, W.kayu));
  // Ordner on each level: spines facing out, a paper label on each, one leaning.
  const warna = [W.nila, W.bata, W.rumput, W.ufuk];
  rak.forEach((y, r) => {
    const n = r === 2 ? 3 : 4;
    for (let i = 0; i < n; i++) {
      const w = 0.075;
      const x = -L / 2 + tb + 0.02 + w / 2 + i * (w + 0.012);
      const tinggi = 0.3 - (i % 2) * 0.02;
      const miring = r === 2 && i === n - 1 ? -0.28 : 0;
      const dx = miring ? Math.sin(-miring) * tinggi / 2 : 0;
      b.push(kotakTanpaAlas([w, tinggi, D - 0.04], [x + dx, y + tinggi / 2, 0.005], warna[(i + r) % 4], [0, 0, miring]));
      if (!miring) b.push(petak(0.045, 0.09, [x, y + tinggi * 0.62, D / 2 - 0.015 + 0.0015], W.kapur));
    }
  });
  return b;
}

function tikarPandan() {
  const { panjang: P, lebar: L, tebal } = UKURAN_PERABOT.tikar_pandan;
  const b = [];
  // Woven checker (anyaman): 10 × 6 cells in two close pandan tones, a coloured border band
  // at both ends. Top faces only: the mat lies on the terrace.
  const nx = 10; const nz = 6;
  const bingkai = 0.08;
  const cx = (P - 2 * bingkai) / nx; const cz = L / nz;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = -P / 2 + bingkai + cx * (i + 0.5);
      const z = -L / 2 + cz * (j + 0.5);
      b.push(petak(cx, cz, [x, tebal, z], (i + j) % 2 ? W.anyaman : W.pandan_tua, [-Math.PI / 2, 0, 0]));
    }
  }
  for (const s of [-1, 1]) b.push(petak(bingkai, L, [s * (P / 2 - bingkai / 2), tebal, 0], s < 0 ? W.bata : W.rumput, [-Math.PI / 2, 0, 0]));
  return b;
}

const PEMBUAT = { gelas_termos: gelasTermos, mesin_ketik: mesinKetik, radio, kalender, rak_arsip: rakArsip, tikar_pandan: tikarPandan };
const _cache = new Map();

/** Merged vertex-coloured geometry of one kind, built once. */
export function geometriPerabot(jenis) {
  if (!PEMBUAT[jenis]) throw new Error(`perabot tidak dikenal: "${jenis}". Ada: ${JENIS_PERABOT.join(', ')}`);
  if (_cache.has(jenis)) return _cache.get(jenis);
  const bagian = PEMBUAT[jenis]();
  const g = gabungGeometri(bagian);
  for (const p of bagian) p.dispose();
  g.name = `perabot_${jenis}`;
  _cache.set(jenis, g);
  return g;
}

let _bahan = null;
/** ONE material for every prop (matte PBR, style contract §1: roughness 0,65–0,9, metalness ≤ 0,15). */
export function bahanPerabot() {
  if (_bahan) return _bahan;
  _bahan = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.84, metalness: 0.04 });
  _bahan.name = 'perabot_markas';
  return _bahan;
}
