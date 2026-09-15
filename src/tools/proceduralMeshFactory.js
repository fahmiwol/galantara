// ═══════════════════════════════════════════════════════
// proceduralMeshFactory.js — Mesh stylized dari parameter + seed
// Output: THREE.Group (Y-up), siap preview / export JSON meta
// ═══════════════════════════════════════════════════════

import { galantaraMat } from '../data/styleTokens.js';

// ── Collider: `g.userData.fisika` ──────────────────────────────────────
// Tiap builder menyatakan collider-nya SENDIRI, di sebelah mesh yang
// diwakilinya, dengan angka yang sama — bukan kotak batas yang dihitung dari
// mesh setelahnya. Kotak batas pohon selebar kanopinya (±2 m); pemain akan
// tertahan jauh sebelum batangnya. Kosakata dan ukuran PENUH mengikuti Rupa3D
// (src/fisika/bentuk.js). Semua angka SUDAH dikali `scale`, jadi pendaftarnya
// cukup memakai posisi dan rotation.y grup.
//
// Larik kosong itu keputusan, bukan lupa: bunga dan semak awan boleh ditembus.
// Prop yang tidak menyetel `userData.fisika` sama sekali dianggap belum
// ditinjau — World memperingatkannya di konsol.

/** Deterministik sederhana dari integer seed */
function rnd(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function paletteColor(palette, key, fallback) {
  return palette && Number.isFinite(palette[key]) ? palette[key] : fallback;
}

function addMesh(group, geometry, material, position = [0, 0, 0], castShadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

// Flat-sided roof tiers keep the landmark silhouette crisp at orbit distance.
function frustumRoofGeometry(width, depth, rise, topScale = 0.35) {
  const x = width * 0.5;
  const z = depth * 0.5;
  const tx = x * topScale;
  const tz = z * topScale;
  const positions = [
    -x, 0, -z,  x, 0, -z,  x, 0, z, -x, 0, z,
    -tx, rise, -tz,  tx, rise, -tz,  tx, rise, tz, -tx, rise, tz,
  ];
  const indices = [
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
    4, 7, 6, 4, 6, 5,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  return flat;
}

// ridgeZ allows Sulah Nyanda to retain an intentionally asymmetric profile.
function gableRoofGeometry(width, backDepth, frontDepth, rise, ridgeZ = 0) {
  const x = width * 0.5;
  const positions = [
    -x, 0, -backDepth,  x, 0, -backDepth,
    -x, 0, frontDepth,  x, 0, frontDepth,
    -x, rise, ridgeZ,    x, rise, ridgeZ,
  ];
  const indices = [
    0, 4, 5, 0, 5, 1,
    2, 3, 5, 2, 5, 4,
    0, 2, 4,
    1, 5, 3,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  return flat;
}

function trianglePanelGeometry(width, height) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -width * 0.5, 0, 0,
     width * 0.5, 0, 0,
     0, height, 0,
  ], 3));
  geometry.computeVertexNormals();
  return geometry;
}

function bananaLeafGeometry(length, width, droop) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0,
    length * 0.48, 0.04, width * 0.5,
    length, -droop, 0,
    length * 0.48, 0.04, -width * 0.5,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
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
  // Batang saja. Kanopi terendah turun sampai ±1,1 m dan akan menembus kepala
  // avatar yang lewat di bawahnya — itu dipilih, karena kanopi yang padat
  // mendorong pemain 1 m dari batangnya dan membuat pohon terasa seperti tembok.
  g.userData.fisika = [
    { bentuk: 'silinder', ukuran: [0.6 * scale, trunkH, 0.6 * scale], letak: [0, trunkH / 2, 0] },
  ];
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
  g.userData.fisika = [
    { bentuk: 'kotak', ukuran: [w, h, d], letak: [0, h / 2, 0] },
    // Tritisan setinggi dada, menjulur 0,44 m di depan dinding.
    { bentuk: 'kotak', ukuran: [w * 1.05, 0.08 * scale, d * 0.45], letak: [0, h * 0.55, d * 0.52] },
  ];
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
  // Dudukan 0,51 m sudah di atas batas naik tangga (0,35), tapi volumenya
  // tetap dimulai dari tanah supaya kolong antarkaki tidak jadi celah aneh.
  g.userData.fisika = [
    { bentuk: 'kotak', ukuran: [1.8 * scale, 0.9 * scale, 0.5 * scale], letak: [0, 0.45 * scale, -0.025 * scale] },
  ];
  return g;
}

/**
 * @param {{ cahaya?: boolean }} [opsi] `cahaya: false` → bohlam emissive saja,
 *   tanpa PointLight. Dipakai supaya satu Spot tetap ≤ 3 PointLight: three r128
 *   menghitung setiap PointLight di shader walau intensitasnya 0.
 */
function buildLampPost(palette, seed, scale, opsi = {}) {
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
  // Ditandai supaya DayNight bisa menemukannya tanpa referensi dijalin
  // turun lewat World -> Game. Lihat DayNight.daftarkanLampu().
  bulb.userData.isLampu = true;
  g.add(bulb);

  // Kolam cahaya di tanah. Emissive saja hanya membuat bohlamnya terang;
  // yang bikin malam terasa syahdu justru tanah di bawahnya ikut hangat.
  // Tanpa bayangan — sepuluh lampu bershadow akan menghabiskan HP kelas menengah.
  if (opsi.cahaya !== false) {
    const nyala = new THREE.PointLight(0xffb35c, 0, 6.5 * scale, 2);
    nyala.position.y = 2.25 * scale;
    nyala.userData.isLampu = true;
    g.add(nyala);
  }
  // Sedikit lebih gemuk dari tiangnya (0,16 → 0,20): tiang setipis mesh
  // membuat pemain tersangkut di tepinya.
  g.userData.fisika = [
    { bentuk: 'silinder', ukuran: [0.2 * scale, 2.2 * scale, 0.2 * scale], letak: [0, 1.1 * scale, 0] },
  ];
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
  g.userData.fisika = [
    { bentuk: 'kotak', ukuran: [1.4 * scale, 1.1 * scale, 0.7 * scale], letak: [0, 0.55 * scale, 0] },
  ];
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
  // Lantai 0,175 m bisa dinaiki; celah antartiang 1,44 m cukup untuk masuk.
  g.userData.fisika = [
    { bentuk: 'kotak', ukuran: [2 * scale, 0.175 * scale, 2 * scale], letak: [0, 0.0875 * scale, 0] },
    ...[[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]].map(([x, z]) => (
      { bentuk: 'silinder', ukuran: [0.16 * scale, 1.8 * scale, 0.16 * scale], letak: [x * scale, 0.9 * scale, z * scale] }
    )),
  ];
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
  // Satu papan utuh, lebih tebal dari bilahnya — pagar bilah tidak boleh
  // bisa diselipi.
  g.userData.fisika = [
    { bentuk: 'kotak', ukuran: [2 * scale, 1 * scale, 0.12 * scale], letak: [0, 0.5 * scale, 0] },
  ];
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
  // Batang bersegmen bergoyang ±0,1 m; satu silinder 0,34 menutupnya.
  g.userData.fisika = [
    { bentuk: 'silinder', ukuran: [0.34 * scale, currY, 0.34 * scale], letak: [0, currY / 2, 0] },
  ];
  return g;
}

function buildJoglo(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const wood = galantaraMat(paletteColor(palette, 'trunk', 0x654321), 0.86);
  const wall = galantaraMat(paletteColor(palette, 'wall', 0xf4dfb7), 0.88);
  const roof = galantaraMat(paletteColor(palette, 'roof', 0xa94f2b), 0.9);
  const roofAlt = galantaraMat(paletteColor(palette, 'roofAlt', 0xc56a3d), 0.88);
  const stone = galantaraMat(paletteColor(palette, 'stone', 0xc7b79e), 0.92);

  addMesh(g, new THREE.BoxGeometry(4.15 * scale, 0.22 * scale, 3.75 * scale), stone, [0, 0.11 * scale, 0]);
  addMesh(g, new THREE.BoxGeometry(2.25 * scale, 1.1 * scale, 1.85 * scale), wall, [0, 0.85 * scale, -0.15 * scale]);

  const postGeo = new THREE.BoxGeometry(0.16 * scale, 1.6 * scale, 0.16 * scale);
  [[-0.95, -0.8], [0.95, -0.8], [-0.95, 0.8], [0.95, 0.8]].forEach(([x, z]) => {
    addMesh(g, postGeo, wood, [x * scale, 1.05 * scale, z * scale]);
  });

  addMesh(g, new THREE.BoxGeometry(0.72 * scale, 0.92 * scale, 0.07 * scale), wood, [0, 0.82 * scale, 0.79 * scale]);

  const panitih = addMesh(
    g,
    frustumRoofGeometry(4.25 * scale, 3.85 * scale, 0.52 * scale, 0.64),
    roofAlt,
    [0, 1.7 * scale, 0],
  );
  panitih.name = 'joglo_roof_panitih';

  const penanggap = addMesh(
    g,
    frustumRoofGeometry(2.72 * scale, 2.45 * scale, 0.62 * scale, 0.54),
    roof,
    [0, 2.2 * scale, 0],
  );
  penanggap.name = 'joglo_roof_penanggap';

  const brunjung = addMesh(
    g,
    frustumRoofGeometry(1.52 * scale, 1.34 * scale, (0.84 + rand() * 0.12) * scale, 0.12),
    roofAlt,
    [0, 2.8 * scale, 0],
  );
  brunjung.name = 'joglo_roof_brunjung';

  // Umpak batu 0,22 m bisa dinaiki; dalem tertutup; saka di keempat sudut.
  // Atap mulai 1,70 m — di atas kepala, tanpa collider.
  g.userData.fisika = [
    { bentuk: 'kotak', ukuran: [4.15 * scale, 0.22 * scale, 3.75 * scale], letak: [0, 0.11 * scale, 0] },
    { bentuk: 'kotak', ukuran: [2.25 * scale, 1.1 * scale, 1.85 * scale], letak: [0, 0.85 * scale, -0.15 * scale] },
    ...[[-0.95, -0.8], [0.95, -0.8], [-0.95, 0.8], [0.95, 0.8]].map(([x, z]) => (
      { bentuk: 'kotak', ukuran: [0.16 * scale, 1.6 * scale, 0.16 * scale], letak: [x * scale, 1.05 * scale, z * scale] }
    )),
  ];
  g.userData.archetype = 'joglo';
  g.userData.region = 'jawa';
  return g;
}

function buildSulahNyanda(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const wood = galantaraMat(paletteColor(palette, 'trunk', 0x5f4630), 0.9);
  const bamboo = galantaraMat(paletteColor(palette, 'wall', 0xc9b887), 0.92);
  const bambooDark = galantaraMat(paletteColor(palette, 'accent', 0x8f7a4f), 0.9);
  const thatch = galantaraMat(paletteColor(palette, 'roof', 0x51462d), 0.95);
  const stone = galantaraMat(paletteColor(palette, 'stone', 0x777168), 0.96);

  const posts = [[-1.25, -0.72], [0, -0.72], [1.25, -0.72], [-1.25, 0.72], [0, 0.72], [1.25, 0.72]];
  posts.forEach(([x, z], i) => {
    const contour = (rand() - 0.5) * 0.12 * scale;
    addMesh(g, new THREE.CylinderGeometry(0.18 * scale, 0.22 * scale, 0.16 * scale, 6), stone, [x * scale, 0.08 * scale + contour, z * scale]);
    addMesh(g, new THREE.BoxGeometry(0.13 * scale, (0.62 + contour) * scale, 0.13 * scale), wood, [x * scale, (0.37 + contour * 0.5) * scale, z * scale]);
    if (i === 0) g.children[g.children.length - 1].name = 'sulah_contour_post';
  });

  addMesh(g, new THREE.BoxGeometry(3.25 * scale, 0.14 * scale, 2.18 * scale), wood, [0, 0.68 * scale, 0]);
  addMesh(g, new THREE.BoxGeometry(2.95 * scale, 1.28 * scale, 1.92 * scale), bamboo, [0, 1.38 * scale, -0.05 * scale]);
  addMesh(g, new THREE.BoxGeometry(0.62 * scale, 1.05 * scale, 0.06 * scale), wood, [0.68 * scale, 1.3 * scale, 0.92 * scale]);

  [-0.9, -0.45, 0, 0.45].forEach((x) => {
    addMesh(g, new THREE.BoxGeometry(0.035 * scale, 0.92 * scale, 0.025 * scale), bambooDark, [x * scale, 1.38 * scale, 0.965 * scale], false);
  });

  const mainRoof = addMesh(
    g,
    gableRoofGeometry(3.65 * scale, 1.45 * scale, 1.12 * scale, 1.25 * scale, -0.22 * scale),
    thatch,
    [0, 2.02 * scale, 0],
  );
  mainRoof.name = 'sulah_nyanda_asymmetric_roof';

  const sorondoy = addMesh(
    g,
    new THREE.BoxGeometry(3.55 * scale, 0.09 * scale, 1.05 * scale),
    thatch,
    [0, 1.98 * scale, 1.38 * scale],
  );
  sorondoy.rotation.x = 0.24;
  sorondoy.name = 'sulah_nyanda_sorondoy';

  // Rumah panggung tanpa tangga: kolong 0,61 m tidak bisa dilewati avatar
  // 1,30 m, jadi kolong dan dinding satu volume dari tanah.
  g.userData.fisika = [
    { bentuk: 'kotak', ukuran: [3.25 * scale, 0.75 * scale, 2.18 * scale], letak: [0, 0.375 * scale, 0] },
    { bentuk: 'kotak', ukuran: [2.95 * scale, 1.28 * scale, 1.92 * scale], letak: [0, 1.38 * scale, -0.05 * scale] },
  ];
  g.userData.archetype = 'sulah_nyanda';
  g.userData.region = 'baduy_banten';
  return g;
}

function buildRumahPanggungPesisir(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const wood = galantaraMat(paletteColor(palette, 'trunk', 0x70452e), 0.87);
  const wall = galantaraMat(paletteColor(palette, 'wall', 0xe7c995), 0.86);
  const roof = galantaraMat(paletteColor(palette, 'roof', 0x233454), 0.9);
  const accent = galantaraMat(paletteColor(palette, 'accent', 0xd9643a), 0.84);
  accent.side = THREE.DoubleSide;

  const posts = [[-1.25, -0.8], [0, -0.8], [1.25, -0.8], [-1.25, 0.8], [0, 0.8], [1.25, 0.8]];
  posts.forEach(([x, z]) => {
    const h = (0.86 + rand() * 0.08) * scale;
    addMesh(g, new THREE.BoxGeometry(0.15 * scale, h, 0.15 * scale), wood, [x * scale, h * 0.5, z * scale]);
  });

  addMesh(g, new THREE.BoxGeometry(3.35 * scale, 0.16 * scale, 2.45 * scale), wood, [0, 0.91 * scale, 0]);
  addMesh(g, new THREE.BoxGeometry(3.05 * scale, 1.18 * scale, 2.15 * scale), wall, [0, 1.55 * scale, 0]);
  addMesh(g, new THREE.BoxGeometry(0.63 * scale, 0.96 * scale, 0.06 * scale), wood, [0, 1.45 * scale, 1.08 * scale]);

  for (let i = 0; i < 3; i++) {
    addMesh(g, new THREE.BoxGeometry(0.85 * scale, 0.16 * scale, 0.48 * scale), wood, [0, (0.12 + i * 0.17) * scale, (1.55 - i * 0.36) * scale]);
  }

  const roofMesh = addMesh(
    g,
    gableRoofGeometry(3.75 * scale, 1.48 * scale, 1.48 * scale, 1.12 * scale),
    roof,
    [0, 2.2 * scale, 0],
  );
  roofMesh.name = 'rumah_panggung_pelana';

  const timpalaja = addMesh(
    g,
    trianglePanelGeometry(2.55 * scale, 0.9 * scale),
    accent,
    [0, 2.23 * scale, 1.49 * scale],
    false,
  );
  timpalaja.name = 'timpalaja_neutral';
  addMesh(g, new THREE.BoxGeometry(2.25 * scale, 0.08 * scale, 0.04 * scale), wood, [0, 2.55 * scale, 1.515 * scale], false);

  // Dua anak tangga pertama bisa dinaiki (0,20 lalu +0,17). Anak tangga ketiga
  // ada di bawah lantai rumah, dan lantai 0,99 m tidak terjangkau — tangga ke
  // pintu yang tertutup, persis seperti yang digambar.
  g.userData.fisika = [
    { bentuk: 'kotak', ukuran: [3.35 * scale, 0.99 * scale, 2.45 * scale], letak: [0, 0.495 * scale, 0] },
    { bentuk: 'kotak', ukuran: [3.05 * scale, 1.18 * scale, 2.15 * scale], letak: [0, 1.55 * scale, 0] },
    { bentuk: 'kotak', ukuran: [0.85 * scale, 0.2 * scale, 0.48 * scale], letak: [0, 0.1 * scale, 1.55 * scale] },
    { bentuk: 'kotak', ukuran: [0.85 * scale, 0.37 * scale, 0.48 * scale], letak: [0, 0.185 * scale, 1.19 * scale] },
  ];
  g.userData.archetype = 'rumah_panggung_pesisir';
  g.userData.region = 'bugis_makassar';
  return g;
}

function buildPohonPisang(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const stemMat = galantaraMat(paletteColor(palette, 'stem', 0x8ea85d), 0.9);
  const leafMat = galantaraMat(paletteColor(palette, 'leaf', palette?.foliage?.[0] ?? 0x4f9b53), 0.88);
  leafMat.side = THREE.DoubleSide;
  const count = 2 + Math.floor(rand() * 2);
  const fisika = [];

  for (let p = 0; p < count; p++) {
    const h = (1.85 + rand() * 0.75) * scale;
    const px = (rand() - 0.5) * 0.75 * scale;
    const pz = (rand() - 0.5) * 0.6 * scale;
    addMesh(g, new THREE.CylinderGeometry(0.11 * scale, 0.17 * scale, h, 7), stemMat, [px, h * 0.5, pz]);
    fisika.push({ bentuk: 'silinder', ukuran: [0.34 * scale, h, 0.34 * scale], letak: [px, h / 2, pz] });
    const leaves = 5 + Math.floor(rand() * 3);
    for (let i = 0; i < leaves; i++) {
      const length = (0.85 + rand() * 0.35) * scale;
      const leaf = addMesh(
        g,
        bananaLeafGeometry(length, 0.38 * scale, (0.12 + rand() * 0.12) * scale),
        leafMat,
        [px, h, pz],
      );
      leaf.rotation.y = (i / leaves) * Math.PI * 2 + rand() * 0.28;
      leaf.rotation.z = 0.14 + rand() * 0.2;
    }
  }

  g.userData.fisika = fisika;
  g.userData.archetype = 'pohon_pisang';
  return g;
}

function buildRumpunBambu(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const culmMat = galantaraMat(paletteColor(palette, 'stem', 0x91a650), 0.88);
  const nodeMat = galantaraMat(paletteColor(palette, 'stemDark', 0x65783b), 0.9);
  const leafMat = galantaraMat(paletteColor(palette, 'leaf', palette?.foliage?.[1] ?? 0x4d7c3d), 0.9);
  const culms = 7 + Math.floor(rand() * 5);
  const tops = [];

  for (let i = 0; i < culms; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * 0.62 * scale;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const h = (2.8 + rand() * 1.35) * scale;
    const culm = addMesh(g, new THREE.CylinderGeometry(0.045 * scale, 0.065 * scale, h, 6), culmMat, [x, h * 0.5, z]);
    culm.rotation.z = (rand() - 0.5) * 0.07;
    culm.rotation.x = (rand() - 0.5) * 0.05;
    [0.34, 0.66].forEach((at) => {
      addMesh(g, new THREE.CylinderGeometry(0.071 * scale, 0.071 * scale, 0.035 * scale, 6), nodeMat, [x, h * at, z]);
    });
    tops.push([x, h, z]);
  }

  tops.filter((_, i) => i % 2 === 0).forEach(([x, y, z], i) => {
    const crown = addMesh(g, new THREE.SphereGeometry(0.38 * scale, 7, 5), leafMat, [x, y - 0.18 * scale, z]);
    crown.scale.set(0.7, 1.25, 0.7);
    crown.rotation.y = i * 0.7;
  });
  // Satu rumpun, bukan per batang: celah antarbatang tidak muat dilewati, dan
  // 7–11 silinder tipis hanya membuat pemain bergetar di sela-selanya.
  g.userData.fisika = [
    { bentuk: 'silinder', ukuran: [1.4 * scale, 2.8 * scale, 1.4 * scale], letak: [0, 1.4 * scale, 0] },
  ];
  g.userData.archetype = 'rumpun_bambu';
  return g;
}

function buildTeraseringPadi(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const soil = galantaraMat(paletteColor(palette, 'soil', 0x8a6845), 0.96);
  const bank = galantaraMat(paletteColor(palette, 'ground', 0x719550), 0.92);
  const water = galantaraMat(paletteColor(palette, 'water', 0x69b7b3), 0.45);
  water.transparent = true;
  water.opacity = 0.68;
  const rice = galantaraMat(paletteColor(palette, 'rice', 0x9cad4f), 0.9);
  const levels = [
    { z: 1.18, h: 0.28, w: 4.0 },
    { z: 0.0, h: 0.55, w: 3.7 },
    { z: -1.18, h: 0.82, w: 3.38 },
  ];

  levels.forEach((level, li) => {
    addMesh(g, new THREE.BoxGeometry(level.w * scale, level.h * scale, 1.45 * scale), soil, [0, level.h * 0.5 * scale, level.z * scale]);
    addMesh(g, new THREE.BoxGeometry(level.w * 0.96 * scale, 0.07 * scale, 1.34 * scale), bank, [0, (level.h + 0.035) * scale, level.z * scale]);
    addMesh(g, new THREE.BoxGeometry(level.w * 0.8 * scale, 0.025 * scale, 1.02 * scale), water, [0, (level.h + 0.078) * scale, level.z * scale], false);
    for (let i = 0; i < 4; i++) {
      const x = (-0.9 + i * 0.6 + (rand() - 0.5) * 0.12) * scale;
      const z = (level.z + (rand() - 0.5) * 0.5) * scale;
      addMesh(g, new THREE.ConeGeometry(0.11 * scale, 0.36 * scale, 4), rice, [x, (level.h + 0.27) * scale, z]);
    }
    if (li === 0) g.children[g.children.length - 1].name = 'rice_tuft';
  });
  // Tiap undak naik ±0,27 m — di bawah batas 0,35, jadi terasering bisa
  // didaki undak demi undak. Rumpun padi dekoratif tidak menghalangi.
  g.userData.fisika = levels.map((level) => ({
    bentuk: 'kotak',
    ukuran: [level.w * scale, (level.h + 0.07) * scale, 1.45 * scale],
    letak: [0, ((level.h + 0.07) / 2) * scale, level.z * scale],
  }));
  g.userData.archetype = 'terasering_padi';
  return g;
}

/**
 * Petak bunga: DUA draw call, bukan delapan.
 *
 * Versi lama membuat 4 batang + 4 kepala bunga sebagai mesh terpisah — 8 draw
 * call untuk benda sebesar telapak tangan, dan lima petak di Oola saja memakan
 * 40 dari 153 draw call pulau itu (tools/anggaran-spot.mjs, 16 Sep 2026;
 * anggaran ≤ 150 di docs/brief/suasana/KEPUTUSAN.md). Sekarang batang satu
 * InstancedMesh (tinggi lewat skala Y per instans) dan kepala bunga satu
 * InstancedMesh putih dengan warna PER INSTANS (r128 instanceColor).
 * Urutan rand() tidak berubah, jadi letak dan warna setiap petak sama persis.
 */
function buildFlowerPatch(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const stem = galantaraMat(paletteColor(palette, 'stem', 0x6f9b63), 0.92);
  const colors = [paletteColor(palette, 'accent', 0xe9c86a), ...(palette?.foliage || [0xc4b5fd])];
  const JUMLAH = 4;
  const batang = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.018 * scale, 0.024 * scale, 1, 5), stem, JUMLAH,
  );
  // Putih: warna per instans dikalikan ke warna bahan.
  const kepala = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.11 * scale, 6, 4), galantaraMat(0xffffff, 0.88), JUMLAH,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const sk = new THREE.Vector3();
  const warna = new THREE.Color();
  for (let i = 0; i < JUMLAH; i++) {
    const x = (rand() - 0.5) * 0.9 * scale;
    const z = (rand() - 0.5) * 0.7 * scale;
    const h = (0.18 + rand() * 0.18) * scale;
    batang.setMatrixAt(i, m.compose(p.set(x, h * 0.5, z), q, sk.set(1, h, 1)));
    kepala.setMatrixAt(i, m.compose(p.set(x, h, z), q, sk.set(1, 1, 1)));
    kepala.setColorAt(i, warna.setHex(colors[i % colors.length]));
  }
  for (const im of [batang, kepala]) {
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = false;
    im.receiveShadow = true;
    // Frustum r128 memakai bola batas geometri DASAR, bukan sebaran instans —
    // tanpa ini bunga di tepi petak bisa hilang di tepi layar.
    im.frustumCulled = false;
    g.add(im);
  }
  kepala.instanceColor.needsUpdate = true;
  g.userData.fisika = []; // boleh ditembus
  g.userData.archetype = 'flower_patch';
  return g;
}

function buildCloudShrub(palette, seed, scale) {
  const rand = rnd(seed);
  const g = new THREE.Group();
  const cloud = galantaraMat(paletteColor(palette, 'cloud', 0xf7f2ff), 0.86);
  for (let i = 0; i < 3; i++) {
    const r = (0.36 + rand() * 0.22) * scale;
    const puff = addMesh(g, new THREE.SphereGeometry(r, 7, 5), cloud, [(i - 1) * 0.36 * scale, r * 0.72, (rand() - 0.5) * 0.22 * scale], false);
    puff.scale.y = 0.72 + rand() * 0.18;
  }
  g.userData.fisika = []; // boleh ditembus
  g.userData.archetype = 'cloud_shrub';
  return g;
}

/**
 * @param {string} archetypeId
 * @param {object} palette — dari PALETTE_SLOTS.*
 * @param {number} seed
 * @param {number} scale — 0.6 .. 1.4
 * @returns {THREE.Group}
 */
export function buildProceduralGroup(archetypeId, palette, seed, scale, opsi = {}) {
  const s = Math.max(0.5, Math.min(1.6, scale));
  switch (archetypeId) {
    case 'tree_round':
      return buildTreeRound(palette, seed, s);
    case 'warung_block':
      return buildWarungBlock(palette, seed, s);
    case 'bench_park':
      return buildBenchPark(palette, seed, s);
    case 'lamp_post':
      return buildLampPost(palette, seed, s, opsi);
    case 'gerobak_bakso':
      return buildGerobakBakso(palette, seed, s);
    case 'gazebo_bambu':
      return buildGazeboBambu(palette, seed, s);
    case 'pagar_kayu':
      return buildPagarKayu(palette, seed, s);
    case 'pohon_kelapa':
      return buildPohonKelapa(palette, seed, s);
    case 'joglo':
    case 'rumah_joglo':
      return buildJoglo(palette, seed, s);
    case 'sulah_nyanda':
      return buildSulahNyanda(palette, seed, s);
    case 'rumah_panggung_pesisir':
      return buildRumahPanggungPesisir(palette, seed, s);
    case 'pohon_pisang':
      return buildPohonPisang(palette, seed, s);
    case 'rumpun_bambu':
      return buildRumpunBambu(palette, seed, s);
    case 'terasering_padi':
      return buildTeraseringPadi(palette, seed, s);
    case 'flower_patch':
      return buildFlowerPatch(palette, seed, s);
    case 'cloud_shrub':
      return buildCloudShrub(palette, seed, s);
    default:
      return buildTreeRound(palette, seed, s);
  }
}

/** Hitung triangle kasar untuk indikator */
export function countTrianglesInObject(root) {
  let tri = 0;
  const stack = root ? [root] : [];
  while (stack.length) {
    const o = stack.pop();
    if (o.isMesh && o.geometry) {
      const g = o.geometry;
      const vertices = g.index?.count || g.attributes?.position?.count || 0;
      tri += (vertices / 3) * (o.isInstancedMesh ? o.count : 1);
    }
    if (o.children?.length) stack.push(...o.children);
  }
  return Math.floor(tri);
}
