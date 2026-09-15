// ═══════════════════════════════════════════════════════
// spotWarpPortal.js — Visual + anchor konsisten untuk warp di tiap Spot POC
// Pakai global THREE (three.min.js dari index.html), bukan import npm — sama World.js.
// ═══════════════════════════════════════════════════════

/**
 * Collider alas portal, SATU untuk semua Spot — dulu enam runtime menyalin
 * angkanya sendiri-sendiri, dan dua di antaranya (Monas, Malioboro) menyalin
 * tinggi mesh 0,45 yang ternyata bisa dipanjat.
 *
 * Tinggi 0,70, bukan 0,45 seperti mesh-nya. Disapu dari 32 arah × 5 geser
 * (tools/fisika/sapu-panjat.mjs, 15 Sep 2026): silinder Ø1,3 setinggi 0,45
 * dipanjat 129 dari 160 pendekatan; 0,50 masih 109; mulai 0,54 nol — tetapi
 * silinder sempit sekali terpanjat di 0,60. 0,70 memberi margin. Hanya alas
 * yang padat: cincinnya berputar dan memang untuk dimasuki; piringan (1,45 m)
 * dan label (2,75 m) di atas kepala. Diameter = pangkal mesh (jari 0,65).
 *
 * Didaftarkan dengan induk = posisi portal (x, 0, z).
 */
export const FISIKA_ALAS_PORTAL = Object.freeze([
  Object.freeze({ bentuk: 'silinder', ukuran: [1.3, 0.7, 1.3], letak: [0, 0.35, 0] }),
]);

const MS = (color, roughness = 0.72) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.05,
  });

/**
 * Bangun warp portal di koordinat lokal Spot (XZ), diparent ke `spotRoot`.
 * @param {THREE.Group} spotRoot
 * @param {number} x
 * @param {number} z
 * @returns {{ anchor: THREE.Group, warpRing: THREE.Mesh }}
 */
export function createSpotWarpPortal(spotRoot, x, z) {
  const anchor = new THREE.Group();
  anchor.name = 'spot:warp_portal_anchor';
  anchor.position.set(x, 0, z);
  spotRoot.add(anchor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.12, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0x7c3aed }),
  );
  ring.position.set(0, 1.45, 0);
  anchor.add(ring);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 28),
    new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, 1.45, 0.02);
  anchor.add(disc);

  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.65, 0.45, 8),
    MS(0x4b5563, 0.78),
  );
  ped.position.set(0, 0.22, 0);
  ped.receiveShadow = true;
  ped.castShadow = true;
  anchor.add(ped);

  const tag = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x4f46e5 }),
  );
  tag.position.set(0, 2.75, 0);
  anchor.add(tag);

  return { anchor, warpRing: ring };
}

/** @param {THREE.Mesh | null | undefined} warpRing */
export function animateSpotWarpPortal(warpRing, t) {
  if (!warpRing?.rotation) return;
  warpRing.rotation.y = t * 0.85;
  if (warpRing.material?.color?.setHSL) {
    warpRing.material.color.setHSL(0.75 + Math.sin(t) * 0.05, 0.8, 0.52);
  }
}
