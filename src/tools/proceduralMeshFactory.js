// ═══════════════════════════════════════════════════════
// proceduralMeshFactory.js — Mesh stylized dari parameter + seed
// Output: THREE.Group (Y-up), siap preview / export JSON meta
// ═══════════════════════════════════════════════════════

import { galantaraMat } from '../data/styleTokens.js';

/** Deterministik sederhana dari integer seed */
function rnd(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildTreeRound(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const trunkH = 2.2 * scale * (0.9 + rand() * 0.25);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, trunkH, 10),
    galantaraMat(palette.trunk),
  );
  trunk.position.y = trunkH * 0.5;
  trunk.castShadow = true;
  g.add(trunk);

  const cols = palette.foliage;
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const r = (1.1 - i * 0.22) * scale * (0.85 + rand() * 0.2);
    const y = trunkH + 0.3 + i * 0.55 * scale;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 8),
      galantaraMat(cols[i % cols.length], 0.82),
    );
    mesh.position.set((rand() - 0.5) * 0.4 * scale, y, (rand() - 0.5) * 0.4 * scale);
    mesh.castShadow = true;
    g.add(mesh);
  }
  return g;
}

function buildWarungBlock(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const w = 2.4 * scale;
  const d = 1.8 * scale;
  const h = 1.5 * scale;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    galantaraMat(palette.wall, 0.72),
  );
  body.position.y = h * 0.5;
  body.castShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0, w * 0.72, 0.9 * scale, 4, 1),
    galantaraMat(palette.roof, 0.68),
  );
  roof.position.y = h + 0.35 * scale;
  roof.rotation.y = Math.PI * 0.25;
  roof.castShadow = true;
  g.add(roof);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.05, 0.08 * scale, d * 0.45),
    galantaraMat(palette.accent, 0.55, 0.12),
  );
  awning.position.set(0, h * 0.55, d * 0.52);
  g.add(awning);

  // counter window strip
  if (rand() > 0.3) {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.35, 0.4 * scale, 0.06 * scale),
      galantaraMat(0x38bdf8, 0.35, 0.05),
    );
    win.position.set(0, h * 0.45, d * 0.51);
    g.add(win);
  }
  return g;
}

function buildBenchPark(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const wood = galantaraMat(palette.trunk, 0.76);
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(1.8 * scale, 0.12 * scale, 0.45 * scale),
    wood,
  );
  seat.position.y = 0.45 * scale;
  seat.castShadow = true;
  g.add(seat);
  const legGeo = new THREE.BoxGeometry(0.12 * scale, 0.45 * scale, 0.4 * scale);
  [-0.75, 0.75].forEach((x) => {
    const leg = new THREE.Mesh(legGeo, wood);
    leg.position.set(x * scale, 0.22 * scale, 0);
    leg.castShadow = true;
    g.add(leg);
  });
  if (rand() > 0.5) {
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(1.8 * scale, 0.35 * scale, 0.1 * scale),
      wood,
    );
    back.position.set(0, 0.65 * scale, -0.2 * scale);
    back.castShadow = true;
    g.add(back);
  }
  return g;
}

function buildLampPost(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 2.2 * scale, 8),
    galantaraMat(0x57534e, 0.7),
  );
  pole.position.y = 1.1 * scale;
  pole.castShadow = true;
  g.add(pole);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18 * scale * (0.9 + rand() * 0.2), 12, 10),
    galantaraMat(palette.accent, 0.35, 0.15),
  );
  bulb.position.y = 2.25 * scale;
  bulb.material.emissive = new THREE.Color(palette.accent);
  bulb.material.emissiveIntensity = 0.35;
  bulb.castShadow = true;
  g.add(bulb);
  return g;
}

function buildGerobakBakso(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.4 * scale, 0.9 * scale, 0.7 * scale),
    galantaraMat(0x10b981), // Green gerobak
  );
  body.position.y = 0.65 * scale;
  g.add(body);
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.5 * scale, 0.05 * scale, 0.8 * scale),
    galantaraMat(0xffffff),
  );
  roof.position.y = 1.3 * scale;
  g.add(roof);
  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 0.1 * scale, 8);
  const wheelMat = galantaraMat(0x3f3f46);
  [[-0.4, 0.2], [0.4, 0.2]].forEach(([x, y]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x * scale, y * scale, 0);
    g.add(w);
  });
  return g;
}

function buildGazeboBambu(palette, seed, scale) {
  const g = new THREE.Group();
  const wood = galantaraMat(0x78350f);
  // Posts
  const postGeo = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 1.8 * scale, 6);
  [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]].forEach(([x, z]) => {
    const p = new THREE.Mesh(postGeo, wood);
    p.position.set(x * scale, 0.9 * scale, z * scale);
    g.add(p);
  });
  // Floor
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(2 * scale, 0.15 * scale, 2 * scale),
    wood,
  );
  floor.position.y = 0.1 * scale;
  g.add(floor);
  // Roof
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 1.4 * scale, 0.8 * scale, 4),
    galantaraMat(0x451a03),
  );
  roof.position.y = 2.2 * scale;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  return g;
}

function buildPagarKayu(palette, seed, scale) {
  const g = new THREE.Group();
  const wood = galantaraMat(0x92400e);
  // Horizontal rails
  const railGeo = new THREE.BoxGeometry(2 * scale, 0.08 * scale, 0.05 * scale);
  [0.4, 0.8].forEach(y => {
    const r = new THREE.Mesh(railGeo, wood);
    r.position.y = y * scale;
    g.add(r);
  });
  // Vertical slats
  const slatGeo = new THREE.BoxGeometry(0.1 * scale, 1 * scale, 0.04 * scale);
  for (let i = -0.9; i <= 0.9; i += 0.3) {
    const s = new THREE.Mesh(slatGeo, wood);
    s.position.set(i * scale, 0.5 * scale, 0);
    g.add(s);
  }
  return g;
}

function buildPohonKelapa(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const segments = 8;
  let currY = 0;
  // Trunk segments
  for (let i = 0; i < segments; i++) {
    const h = 0.5 * scale;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, h, 6),
      galantaraMat(0x78350f),
    );
    mesh.position.y = currY + h / 2;
    mesh.position.x = Math.sin(i * 0.3) * 0.1 * scale;
    g.add(mesh);
    currY += h;
  }
  // Leaves
  const leafMat = galantaraMat(0x16a34a);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(
      new THREE.BoxGeometry(1.5 * scale, 0.02 * scale, 0.3 * scale),
      leafMat,
    );
    leaf.position.y = currY;
    leaf.rotation.y = (i / 6) * Math.PI * 2;
    leaf.rotation.z = 0.4;
    g.add(leaf);
  }
  return g;
}

/**
 * @param {string} archetypeId
 * @param {object} palette — dari PALETTE_SLOTS.*
 * @param {number} seed
 * @param {number} scale — 0.6 .. 1.4
 * @returns {THREE.Group}
 */
export function buildProceduralGroup(archetypeId, palette, seed, scale) {
  const s = Math.max(0.5, Math.min(1.6, scale));
  switch (archetypeId) {
    case 'tree_round':
      return buildTreeRound(palette, seed, s);
    case 'warung_block':
      return buildWarungBlock(palette, seed, s);
    case 'bench_park':
      return buildBenchPark(palette, seed, s);
    case 'lamp_post':
      return buildLampPost(palette, seed, s);
    case 'gerobak_bakso':
      return buildGerobakBakso(palette, seed, s);
    case 'gazebo_bambu':
      return buildGazeboBambu(palette, seed, s);
    case 'pagar_kayu':
      return buildPagarKayu(palette, seed, s);
    case 'pohon_kelapa':
      return buildPohonKelapa(palette, seed, s);
    default:
      return buildTreeRound(palette, seed, s);
  }
}

/** Hitung triangle kasar untuk indikator */
export function countTrianglesInObject(root) {
  let tri = 0;
  root.traverse((o) => {
    if (o.isMesh && o.geometry) {
      const g = o.geometry;
      const pos = g.attributes?.position;
      if (pos) tri += pos.count / 3;
    }
  });
  return Math.floor(tri);
}
