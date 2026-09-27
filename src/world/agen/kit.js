// ═══════════════════════════════════════════════════════
// agen/kit.js — class kit v0: read the class from the silhouette
//
// Laporan 3D §6.4: one base body for players and agents; the class is read from
// three big slots — head, back, hand — with a mark in at least two of them, and
// every item ≥ 0,3 m so it survives 36 px. Kit v0 (SPRINT-01, aliran C):
//
//   Penjejak Intelijen (Sari)   topi rimba (wide droopy brim)   + kaca pembesar (hand)
//   Operator Lapangan (Budi)    caping (cone Ø1,04)             + papan klip (hand)
//   Pemandu Ekspedisi (Maya)    ransel + rolled mat (back)      + tongkat 1,15 m with a guide's pennant (hand)
//
// Class marks are working tools, not regional or religious dress (§6.4 rule 4):
// the caping is a field hat worn across the archipelago, not an ethnic marker.
//
// Colour (identity per Desain §9.5 — Sari ungu senja, Budi nila, Maya bata —
// measured, not guessed): the design token senja_ungu #4A3B63 sits only ΔE 19,9
// from nila under protanopia, so Sari's class colour is its darker, redder
// sibling #4D2F55 (min ΔE 24,9 to nila, 52,4 to bata across four visions).
// The class colour goes on the LARGEST piece (hat or pack) so it is what the eye
// catches; natural materials (wood, paper, brass, bamboo) are shared.
//
// Cost: the whole kit is ONE vertex-coloured geometry per class, shared by every
// agent of that class, with ONE material shared by all classes → 1 draw call per
// agent, 0 new materials per agent, no shadow pass (laporan 3D §6.8).
// ═══════════════════════════════════════════════════════

import { bakeGeometri, gabungGeometri, cat, bidangPoligon } from '../geometri.js';

/** Proportions of the NPC chibi the kit is fitted to (NPC.js: body r 0,38 × 1,15, head r 0,32 at 0,72). */
export const RANGKA_NPC = Object.freeze({ kepalaY: 0.72, kepalaR: 0.32, badanR: 0.38, badanSkalaY: 1.15 });

export const WARNA_KIT = Object.freeze({
  ungu_senja_tua: 0x4D2F55, // Penjejak — class colour
  nila: 0x3D6B9E,           // Operator — class colour (senja token)
  bata: 0xC05E3C,           // Pemandu — class colour (senja_bata)
  kertas: 0xF4EAD6,         // senja kapur / brief Oola gading
  anyaman: 0xD7C39B,        // brief Oola papan
  bambu: 0x8A9455,          // senja bambu
  kayu: 0x8A6B4F,           // brief Oola kayu / senja tanah
  kuningan: 0xE9C86A,       // brief Oola emas
  kaca: 0xCFE3EA,           // pale lens
});

export const KELAS = Object.freeze({
  penjejak: Object.freeze({ nama: 'Penjejak Intelijen', warnaKelas: WARNA_KIT.ungu_senja_tua, slot: ['kepala', 'tangan'] }),
  operator: Object.freeze({ nama: 'Operator Lapangan', warnaKelas: WARNA_KIT.nila, slot: ['kepala', 'tangan'] }),
  pemandu: Object.freeze({ nama: 'Pemandu Ekspedisi', warnaKelas: WARNA_KIT.bata, slot: ['punggung', 'tangan'] }),
});

/** 'penjejak', 'Penjejak Intelijen', 'PENJEJAK' … → 'penjejak'. */
export function kunciKelas(kelas) {
  const k = String(kelas ?? '').trim().toLowerCase().split(/\s+/)[0];
  if (!KELAS[k]) {
    throw new Error(`kelas agen tidak dikenal: "${kelas}". Kit v0 ada untuk: ${Object.values(KELAS).map((x) => x.nama).join(', ')}`);
  }
  return k;
}

const B = (geo, o) => bakeGeometri(geo, o);
const silinder = (rA, rB, t, sisi, letak, putar, { terbuka = false } = {}) => B(new THREE.CylinderGeometry(rA, rB, t, sisi, 1, terbuka), { letak, putar });
const kotak = (u, letak, putar) => B(new THREE.BoxGeometry(u[0], u[1], u[2]), { letak, putar });

/**
 * Pieces of each kit, fitted to `r` (the body proportions). Every piece is
 * { geo, warna, benda } — `benda` names the item so the ≥ 0,3 m rule can be
 * checked per item, not per triangle soup.
 */
function bagianKit(k, r) {
  const { kepalaY: ky, kepalaR: kr, badanR: br } = r;
  const W = WARNA_KIT;
  const sisi = br + 0.12; // hand position: outside the body ball
  switch (k) {
    case 'penjejak': {
      // Topi rimba: droopy brim (open frustum) + crown that clears the head.
      const alas = ky + kr * 0.45;
      const jariKepalaDiAlas = Math.sqrt(kr * kr - (kr * 0.45) ** 2);
      const mahkotaBawah = jariKepalaDiAlas + 0.02;
      return [
        { benda: 'topi', warna: W.ungu_senja_tua, geo: silinder(mahkotaBawah - 0.01, 0.47, 0.08, 12, [0, alas - 0.02, 0], null, { terbuka: true }) },
        // Crown: open side + top only. A bottom cap would be a disc cutting through
        // the head — never seen, only counted (and caught by the head-clearance test).
        { benda: 'topi', warna: W.ungu_senja_tua, geo: silinder(mahkotaBawah - 0.05, mahkotaBawah, 0.22, 12, [0, alas + 0.11, 0], null, { terbuka: true }) },
        // thetaStart −π/2 puts the lid's vertices exactly on the cylinder's top ring
        // (CylinderGeometry starts at +Z, CircleGeometry at +X): no seam to see through.
        { benda: 'topi', warna: W.ungu_senja_tua, geo: B(new THREE.CircleGeometry(mahkotaBawah - 0.05, 12, -Math.PI / 2), { letak: [0, alas + 0.22, 0], putar: [-Math.PI / 2, 0, 0] }) },
        { benda: 'topi', warna: W.kertas, geo: silinder(mahkotaBawah + 0.008, mahkotaBawah + 0.008, 0.05, 12, [0, alas + 0.035, 0], null, { terbuka: true }) },
        // Kaca pembesar held up at the side, lens facing forward: a circle in front
        // view, an ellipse at ¾ — the "lingkaran di depan" mark of §6.4.
        { benda: 'kaca_pembesar', warna: W.kuningan, geo: silinder(0.165, 0.165, 0.035, 12, [sisi + 0.06, 0.46, 0.08], [Math.PI / 2, 0, -0.5]) },
        { benda: 'kaca_pembesar', warna: W.kaca, geo: silinder(0.13, 0.13, 0.045, 12, [sisi + 0.06, 0.46, 0.08], [Math.PI / 2, 0, -0.5]) },
        { benda: 'kaca_pembesar', warna: W.kayu, geo: kotak([0.05, 0.22, 0.05], [sisi + 0.06, 0.46 - 0.165 - 0.11, 0.08]) },
      ];
    }
    case 'operator': {
      // Caping: cone Ø1,04 × 0,30, 12 sides, open underneath — the orbit camera is
      // always above the brim (φ ≤ 76°), and a base disc would cut through the head.
      const alas = ky + kr * 0.55;
      return [
        { benda: 'caping', warna: W.nila, geo: silinder(0.02, 0.52, 0.30, 12, [0, alas + 0.15, 0], null, { terbuka: true }) },
        { benda: 'caping', warna: W.anyaman, geo: silinder(0.045, 0.045, 0.06, 6, [0, alas + 0.31, 0]) },
        { benda: 'caping', warna: W.anyaman, geo: silinder(0.525, 0.525, 0.025, 12, [0, alas + 0.005, 0], null, { terbuka: true }) },
        // Papan klip held at the other side, facing forward.
        { benda: 'papan_klip', warna: W.kayu, geo: kotak([0.27, 0.35, 0.025], [-(sisi + 0.05), 0.36, 0.08], [0, 0, 0.12]) },
        { benda: 'papan_klip', warna: W.kertas, geo: kotak([0.22, 0.26, 0.012], [-(sisi + 0.05) - 0.003, 0.34, 0.1], [0, 0, 0.12]) },
        { benda: 'papan_klip', warna: W.kuningan, geo: kotak([0.11, 0.045, 0.03], [-(sisi + 0.05) + 0.02, 0.52, 0.1], [0, 0, 0.12]) },
      ];
    }
    case 'pemandu': {
      // Ransel: a hump on the back (reads at ¾ and from the side) + a rolled mat
      // across its top, longer than the head is wide (reads from the front).
      const z = -(br * 0.78 + 0.16);
      const puncak = 0.94;
      return [
        { benda: 'ransel', warna: W.bata, geo: kotak([0.46, 0.64, 0.3], [0, puncak - 0.32, z]) },
        { benda: 'ransel', warna: W.bambu, geo: kotak([0.47, 0.2, 0.31], [0, puncak - 0.1, z - 0.005]) },
        { benda: 'ransel', warna: W.kertas, geo: silinder(0.075, 0.075, 1.0, 8, [0, puncak + 0.075, z], [0, 0, Math.PI / 2]) },
        { benda: 'ransel', warna: W.bata, geo: kotak([0.06, 0.5, 0.05], [-0.16, puncak - 0.3, z + 0.17]) },
        { benda: 'ransel', warna: W.bata, geo: kotak([0.06, 0.5, 0.05], [0.16, puncak - 0.3, z + 0.17]) },
        // Tongkat 1,15 m planted beside the body — taller than the head — with a
        // guide's pennant: the "garis tegak" mark, readable from every side.
        { benda: 'tongkat', warna: W.bambu, geo: silinder(0.035, 0.035, 1.15, 6, [sisi + 0.04, 0.575, 0.06]) },
        { benda: 'tongkat', warna: W.bata, geo: silinder(0.045, 0.045, 0.08, 6, [sisi + 0.04, 0.72, 0.06], null, { terbuka: true }) },
        { benda: 'tongkat', warna: W.bata, geo: B(bidangPoligon([[0, 0], [0.26, -0.08], [0, -0.17]]), { letak: [sisi + 0.075, 1.14, 0.06] }) },
      ];
    }
    default: throw new Error(`kit ${k} belum dibuat`);
  }
}

const _geo = new Map();
let _mat = null;

function kunciRangka(r) {
  return [r.kepalaY, r.kepalaR, r.badanR, r.badanSkalaY].join('/');
}

/** Merged, vertex-coloured kit geometry for a class — built once per (class, body). */
export function geometriKit(kelas, rangka = RANGKA_NPC) {
  const k = kunciKelas(kelas);
  const kunci = `${k}@${kunciRangka(rangka)}`;
  if (_geo.has(kunci)) return _geo.get(kunci);
  const bagian = bagianKit(k, rangka);
  const g = gabungGeometri(bagian.map((b) => cat(b.geo, b.warna)));
  g.name = `kit_${k}`;
  g.userData.benda = [...new Set(bagian.map((b) => b.benda))];
  _geo.set(kunci, g);
  return g;
}

/** Per-item bounding sizes (m), for the ≥ 0,3 m readability rule. */
export function ukuranBenda(kelas, rangka = RANGKA_NPC) {
  const out = {};
  for (const b of bagianKit(kunciKelas(kelas), rangka)) {
    b.geo.computeBoundingBox();
    const bb = out[b.benda] ?? new THREE.Box3();
    bb.union(b.geo.boundingBox);
    out[b.benda] = bb;
    b.geo.dispose();
  }
  return Object.fromEntries(Object.entries(out).map(([k, bb]) => {
    const s = new THREE.Vector3(); bb.getSize(s);
    return [k, { ukuran: [s.x, s.y, s.z], terpanjang: Math.max(s.x, s.y, s.z) }];
  }));
}

/** ONE material for every kit of every class (matte PBR, style contract §1). */
export function bahanKit() {
  if (_mat) return _mat;
  _mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.82, metalness: 0.04 });
  _mat.name = 'kit_kelas';
  return _mat;
}

/**
 * Dress one agent in its class kit. Replaces any kit it already wears.
 * @param {THREE.Object3D} mesh the NPC root group (origin at the feet, facing +Z)
 * @param {string} kelas 'penjejak' | 'operator' | 'pemandu' or the full class name
 * @param {{ rangka?: typeof RANGKA_NPC }} [opsi] body proportions if not NPC.js's
 * @returns {{ kelas:string, mesh:THREE.Mesh, lepas:() => void }}
 */
export function pasangKitKelas(mesh, kelas, { rangka = RANGKA_NPC } = {}) {
  if (!mesh?.isObject3D) throw new Error('pasangKitKelas butuh THREE.Object3D (grup NPC)');
  const k = kunciKelas(kelas);
  mesh.userData.kitKelas?.lepas();
  const kit = new THREE.Mesh(geometriKit(k, rangka), bahanKit());
  kit.name = `kit_${k}`;
  kit.castShadow = false;
  kit.receiveShadow = true;
  mesh.add(kit);
  const pegangan = {
    kelas: k,
    mesh: kit,
    lepas() {
      mesh.remove(kit);
      if (mesh.userData.kitKelas === pegangan) delete mesh.userData.kitKelas;
    },
  };
  mesh.userData.kitKelas = pegangan;
  return pegangan;
}
