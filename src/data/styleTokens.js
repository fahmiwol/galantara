// ═══════════════════════════════════════════════════════
// styleTokens.js — Token gaya Galantara (SSoT ringkas untuk tools)
// Lihat juga: docs/GALANTARA_STYLE_CONTRACT_v0.md
// ═══════════════════════════════════════════════════════

/** Material default: matte PBR sesuai kontrak */
export function galantaraMat(colorHex, roughness = 0.78, metalness = 0.06) {
  return new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness,
    metalness,
  });
}

export const STYLE_CONTRACT_ID = 'v0';

/** Palet slot untuk generator (bukan semua warna dunia) */
export const PALETTE_SLOTS = {
  jakarta_warm: {
    id: 'jakarta_warm',
    label: 'Jakarta hangat',
    trunk: 0x6b3f1a,
    foliage: [0x7c3aed, 0x8b5cf6, 0x6d28d9],
    accent: 0xfde68a,
    roof: 0xc2410c,
    wall: 0xfef3c7,
  },
  kampung_green: {
    id: 'kampung_green',
    label: 'Kampung hijau',
    trunk: 0x5c3d1e,
    foliage: [0x22c55e, 0x4ade80, 0x16a34a],
    accent: 0xfacc15,
    roof: 0x92400e,
    wall: 0xfef9c3,
  },
  coastal_calm: {
    id: 'coastal_calm',
    label: 'Pantai toska',
    trunk: 0x78716c,
    foliage: [0x2dd4bf, 0x14b8a6, 0x0d9488],
    accent: 0xf472b6,
    roof: 0x0e7490,
    wall: 0xecfeff,
  },
};

/** Archetype yang didukung MVP procedural */
export const ARCHETYPES = [
  { id: 'tree_round', label: 'Pohon bulat (layer)' },
  { id: 'warung_block', label: 'Warung blok stylized' },
  { id: 'bench_park', label: 'Bangku taman' },
  { id: 'lamp_post', label: 'Tiang lampu' },
  { id: 'gerobak_bakso', label: 'Gerobak Bakso' },
  { id: 'gazebo_bambu', label: 'Gazebo Bambu' },
  { id: 'pagar_kayu', label: 'Pagar Kayu' },
  { id: 'pohon_kelapa', label: 'Pohon Kelapa' },
];
