// ═══════════════════════════════════════════════════════
// markas/spek.js — Markas Penjelajah in numbers (metres, LOCAL frame, +Z = front)
//
// Source: docs/riset/2026-09-26-pivot/LAPORAN-3D-TECHNICAL-ARTIST.md §6.9 (prototype
// r128: 10 draw calls, ≤ 1.068 triangles, placement (−3,0; −12,5), rotY 0,227).
// Deviations from the prototype are deliberate and each one says why:
//
//  1. The single "Meja Misi" became FOUR work desks: one per party slot (party is
//     capped at 4). An empty desk reads as an empty slot, so "Markas 1/4" in the
//     sheet has a body in the world.
//  2. The suar (status beacon) sits ON the tower roof, not on the tower floor.
//     Measured on paper first: from the default camera (elevation ≈ 50°) a lamp
//     on the floor is hidden by the 1,6 m tower roof, and the gap between railing
//     (3,93 m) and roof (4,05 m) is 12 cm. Up top it is also the wayfinding mark.
//  3. The Papan Hasil is free-standing, slanted, at the front-LEFT corner, turned 45°
//     to face the front-right — where the orbit camera usually is (the Markas faces
//     the island centre, the default camera looks from the south-east). A board on
//     the front wall sits under a 0,6 m eave and loses its upper half from cameras
//     above ≈ 50°; a board square in front of the desks hid the agent at desk 1
//     from frontal cameras (seen in the first Chromium render, 26 Sep).
//  4. The terrace is 0,4 m deeper at the front (6,6 → 7,0) to fit desks, board and
//     bench with walkways the 0,80 m capsule can use. Clearance to every other Oola
//     collider and NPC patrol is checked in tests/markas.test.mjs, not assumed.
//  5. The Rak Temuan and the mission-card board are not built in M1: nothing in the
//     sprint writes to them, and an empty board is a promise with no data behind it.
//
// Style: Oola palette, no rumah adat (PRD §2.1, brief oola.md §7); hip roof 39 % of
// the hall's visual height (target 35–55 %, RISET_3D_NUSANTARA §2); sengkuap door
// canopy (ADR-0009); asymmetric silhouette (tower on one side), not a symmetric
// four-post gazebo (brief oola.md §7).
// ═══════════════════════════════════════════════════════

/** Where the Markas sits in Oola. The map entry must agree (tests/markas.test.mjs). */
export const LETAK_MARKAS = Object.freeze({ x: -3.0, y: 0, z: -12.5, rotasiY: 0.227 });

/** Top of the stone terrace. Everything that stands "on the Markas" stands here. */
export const Y_ALAS = 0.20;

/** Materials: one merged mesh each. Colours from brief oola.md §4 and RISET_VISUAL_SENJA §5. */
export const BAHAN = Object.freeze({
  batu:   { warna: 0xD8CFB5, kasar: 0.92, logam: 0.04, bayangan: false }, // pijakan (brief Oola)
  gading: { warna: 0xF4EAD6, kasar: 0.88, logam: 0.04, bayangan: true },  // badan Dev Hub
  kayu:   { warna: 0x8A6B4F, kasar: 0.86, logam: 0.04, bayangan: true },  // papan kayu (brief Oola)
  atap:   { warna: 0x8F7AB8, kasar: 0.90, logam: 0.04, bayangan: true },  // rumpun ungu (brief Oola)
  emas:   { warna: 0xE9C86A, kasar: 0.60, logam: 0.15, bayangan: false }, // halo (brief Oola)
  papan:  { warna: 0xD7C39B, kasar: 0.90, logam: 0.04, bayangan: false }, // papan (brief Oola)
  bata:   { warna: 0xC05E3C, kasar: 0.85, logam: 0.04, bayangan: false }, // senja_bata
});

// ── Parts (local frame) ──────────────────────────────────────────────
export const ALAS = Object.freeze({ ukuran: [7.0, Y_ALAS, 7.0], letak: [0.3, Y_ALAS / 2, 1.1] });
export const UNDAK = Object.freeze({ ukuran: [2.4, 0.10, 0.4], letak: [0.5, 0.05, 4.8] });

export const BALAI = Object.freeze({ lebar: 4.4, tinggi: 2.2, dalam: 3.0, x: 0.3, z: -0.7 });
/** Front wall of the hall, local z. */
export const Z_DINDING_DEPAN = BALAI.z + BALAI.dalam / 2; // 0,8
/** East (+X) side wall of the hall, local x. */
export const X_DINDING_TIMUR = BALAI.x + BALAI.lebar / 2; // 2,5

export const ATAP = Object.freeze({ lebar: 5.6, dalam: 4.2, naik: 1.45, puncak: 0.28, dasarY: Y_ALAS + 2.28 });
/** Front edge of the roof overhang (teritis 0,6 m), local z. */
export const Z_TERITIS_DEPAN = BALAI.z + ATAP.dalam / 2; // 1,4

export const MENARA = Object.freeze({ x: -2.5, z: -1.7, tiang: 3.3, setengah: 0.42, lantai: 1.25 });
export const PUNCAK_MENARA = Y_ALAS + 3.85 + 0.7; // apex of the tower roof, 4,75 m

/** Status beacon: an 8-sided lantern on the tower apex, emissive only (no PointLight, ADR-0008). */
export const SUAR = Object.freeze({ jari: 0.21, tinggi: 0.38, sisi: 8, y: PUNCAK_MENARA + 0.19 });

/**
 * Four work desks — one per party slot. Top 0,62 m above the terrace. Pairs sit
 * symmetrically about the door (x 0,3) with a 1,2 m walkway between them.
 */
export const MEJA = Object.freeze({
  ukuran: [1.0, 0.62, 0.6],
  z: 2.3,
  x: Object.freeze([-1.9, -0.8, 1.4, 2.5]),
});

/**
 * Free-standing results board. `rotasi` turns its face from +Z towards the
 * front-right (+X +Z); `miring` leans the board back so an elevated camera sees
 * its face; `bawah` = height of its lower edge above the terrace.
 */
export const PAPAN_HASIL = Object.freeze({
  x: -2.55, z: 3.7, rotasi: Math.PI / 4, lebar: 1.3, tinggi: 0.9, bawah: 0.45, miring: 0.3,
  /** Scroll slots: 6 columns × 3 rows = the capacity of the InstancedMesh. */
  kolom: 6, baris: 3,
});
export const KAPASITAS_GULUNGAN = PAPAN_HASIL.kolom * PAPAN_HASIL.baris;

export const BANGKU = Object.freeze({ x: 2.3, z: 3.6, panjang: 1.8, dalam: 0.45, tinggi: 0.42 });

/**
 * Office props (perabot.js), SPRINT-02 C butir 4. `y` = the surface the prop stands
 * on; `arah` turns its +Z face. Chosen so nothing stands where an agent stands:
 *  - cup + flask at the back-right corner of each desk, away from the lamp post
 *    (back-left) and the sheet of paper (centre-right);
 *  - typewriter on desk 2, turned to face the agent who types from behind (arah π);
 *  - archive shelf against the hall's east (side) wall, facing out, with the radio on
 *    top of it. Not on the front wall: there it narrowed the 1,2 m walkway behind
 *    the desks to 0,95 m and the desk work points stopped being reachable on foot
 *    (tests/markas.test.mjs BFS) — the players' path wins over the prop;
 *  - calendar in the wall gap between the door and the right window;
 *  - pandan mat under the "hasil siap" gathering points: the agents that report
 *    stand ON it, lesehan — the mat is a floor decal (8 mm), not a collider.
 */
export const PERABOT = Object.freeze({
  gelas_termos: Object.freeze(MEJA.x.map((x) => Object.freeze({ x: x + 0.3, y: Y_ALAS + MEJA.ukuran[1], z: MEJA.z - 0.16, arah: 0 }))),
  mesin_ketik: Object.freeze({ x: MEJA.x[1] + 0.1, y: Y_ALAS + MEJA.ukuran[1], z: MEJA.z + 0.02, arah: Math.PI }),
  rak_arsip: Object.freeze({ x: X_DINDING_TIMUR + 0.125, y: Y_ALAS, z: -0.25, arah: Math.PI / 2 }),
  radio: Object.freeze({ x: X_DINDING_TIMUR + 0.14, y: Y_ALAS + 1.1, z: -0.3, arah: Math.PI / 2 + 0.12 }),
  kalender: Object.freeze({ x: 1.05, y: Y_ALAS + 1.72, z: Z_DINDING_DEPAN + 0.006, arah: 0 }),
  tikar_pandan: Object.freeze({ x: -1.0, y: Y_ALAS, z: 3.95, arah: 0 }),
});

// ── Colliders (ADR-0016: game volumes, FULL size, local `letak`) ──────
// Anything the player must not climb is ≥ 0,70 m above the surface it stands
// on; the terrace and step are ≤ 0,35 m on purpose (walkable).
export const FISIKA = Object.freeze([
  { bentuk: 'kotak', ukuran: [...ALAS.ukuran], letak: [...ALAS.letak], nama: 'alas' },
  { bentuk: 'kotak', ukuran: [...UNDAK.ukuran], letak: [...UNDAK.letak], nama: 'undak' },
  // The hall starts at the ground: the board, door and window touch it (< 0,1 m).
  { bentuk: 'kotak', ukuran: [BALAI.lebar, 2.4, BALAI.dalam], letak: [BALAI.x, 1.2, BALAI.z], nama: 'balai' },
  // Gap between the tower legs is 0,72 m < capsule 0,80: one volume.
  { bentuk: 'kotak', ukuran: [1.0, 3.5, 1.0], letak: [MENARA.x, 1.75, MENARA.z], nama: 'menara' },
  // Desks stand in pairs 0,2 m apart — a gap no 0,80 m capsule fits through, so each
  // pair is ONE volume (ADR-0016: close-set things become one volume; a 0,2 m slot
  // between two boxes only snags the capsule).
  ...[[0, 1], [2, 3]].map(([a, b], i) => {
    const kiri = MEJA.x[a] - MEJA.ukuran[0] / 2;
    const kanan = MEJA.x[b] + MEJA.ukuran[0] / 2;
    return {
      bentuk: 'kotak', ukuran: [kanan - kiri, 0.72, MEJA.ukuran[2]],
      letak: [(kiri + kanan) / 2, Y_ALAS + 0.36, MEJA.z], nama: i === 0 ? 'meja_kiri' : 'meja_kanan',
    };
  }),
  {
    bentuk: 'kotak', ukuran: [PAPAN_HASIL.lebar + 0.14, 1.4, 0.4], letak: [PAPAN_HASIL.x, Y_ALAS + 0.7, PAPAN_HASIL.z],
    putarY: PAPAN_HASIL.rotasi, nama: 'papan_hasil',
  },
  { bentuk: 'kotak', ukuran: [BANGKU.panjang, 0.72, BANGKU.dalam], letak: [BANGKU.x, Y_ALAS + 0.36, BANGKU.z], nama: 'bangku' },
  // Archive shelf (1,1 m + radio): a blocker against the east wall; 1,05 m of terrace
  // stays free beside it.
  { bentuk: 'kotak', ukuran: [0.25, 1.3, 0.5], letak: [X_DINDING_TIMUR + 0.125, Y_ALAS + 0.65, -0.25], nama: 'rak_arsip' },
  // Roof, canopy, flag and beacon are above head height (≥ 2,05 m > 1,30): none.
]);

// ── Points (local). `arah` = rotation.y that faces local +Z (the plaza). ──
// `duduk: true` points are seats: they sit INSIDE the seat's collider on purpose
// (NPC agents have no capsule, ADR-0015 §8). Each seat names the free point in
// front of it that a walker approaches first (`dekat`).
const DEPAN = 0;
export const TITIK = Object.freeze({
  // Work: behind each desk, facing out over it. Outside the eave (z > 1,4).
  meja_1: { x: MEJA.x[0], z: 1.52, lantai: 'alas', arah: DEPAN },
  meja_2: { x: MEJA.x[1], z: 1.52, lantai: 'alas', arah: DEPAN },
  meja_3: { x: MEJA.x[2], z: 1.52, lantai: 'alas', arah: DEPAN },
  meja_4: { x: MEJA.x[3], z: 1.52, lantai: 'alas', arah: DEPAN },
  // Result ready: gathered around the Papan Hasil, facing the plaza.
  hasil_1: { x: -1.75, z: 4.3, lantai: 'alas', arah: DEPAN },
  hasil_2: { x: -1.2, z: 3.55, lantai: 'alas', arah: DEPAN },
  hasil_3: { x: -0.75, z: 4.35, lantai: 'alas', arah: DEPAN },
  hasil_4: { x: -0.25, z: 3.55, lantai: 'alas', arah: DEPAN },
  // Brain waiting: out in front, on the ground, facing the plaza (needs the player).
  tanya_1: { x: -0.75, z: 5.75, lantai: 'tanah', arah: DEPAN },
  tanya_2: { x: 1.35, z: 5.75, lantai: 'tanah', arah: DEPAN },
  tanya_3: { x: -1.75, z: 5.75, lantai: 'tanah', arah: DEPAN },
  tanya_4: { x: 2.35, z: 5.75, lantai: 'tanah', arah: DEPAN },
  // Failed: on the bench, then on the right half of the step.
  gagal_1: { x: BANGKU.x - 0.45, z: BANGKU.z, lantai: 'kursi', arah: DEPAN, duduk: true, dekat: 'bangku_depan_1' },
  gagal_2: { x: BANGKU.x + 0.45, z: BANGKU.z, lantai: 'kursi', arah: DEPAN, duduk: true, dekat: 'bangku_depan_2' },
  gagal_3: { x: 0.35, z: 4.8, lantai: 'undak', arah: DEPAN, duduk: true, dekat: 'undak_depan_1' },
  gagal_4: { x: 1.25, z: 4.8, lantai: 'undak', arah: DEPAN, duduk: true, dekat: 'undak_depan_2' },
  // Approach points for the seats (free, reachable).
  bangku_depan_1: { x: BANGKU.x - 0.45, z: 4.3, lantai: 'alas', arah: DEPAN },
  bangku_depan_2: { x: BANGKU.x + 0.45, z: 4.3, lantai: 'alas', arah: DEPAN },
  undak_depan_1: { x: 0.35, z: 5.6, lantai: 'tanah', arah: DEPAN },
  undak_depan_2: { x: 1.25, z: 5.6, lantai: 'tanah', arah: DEPAN },
});

/** Height of each floor kind, local y. */
export const TINGGI_LANTAI = Object.freeze({ tanah: 0, alas: Y_ALAS, undak: 0.10, kursi: Y_ALAS + BANGKU.tinggi });

/** Interaction volume: sphere on the terrace (hint "✦ Markas Penjelajah"). */
export const INTERAKSI = Object.freeze({ x: 0.3, z: 2.6, jari: 3.4 });
