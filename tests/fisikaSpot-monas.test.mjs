// ═══════════════════════════════════════════════════════
// tests/fisikaSpot-monas.test.mjs — collider Spot Monas, THREE dan Rapier asli
//
// Monas menyatakan tanah, batas, dan collider tiap benda padatnya sendiri
// (ADR-0016). Angka pembanding dibaca dari MESH yang benar-benar dibangun
// runtime, bukan dari konstanta runtime — kalau collider menyimpang dari
// mesh-nya, uji ini yang tahu, bukan pemain.
//
// Tanpa stub DOM: MonasSpotRuntime, InteractionVolume, dan spotWarpPortal
// tidak menyentuh document/window.
// ═══════════════════════════════════════════════════════

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// THREE r128 dari vendor — build UMD yang sama dengan yang dimuat index.html.
const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { Fisika } = await import('../src/fisika/Fisika.js');
const {
  buatKarakter, langkahKarakter, jalanKarakter, teleportKarakter, ruangBebas,
  cariTempatBerdiri, calonMelingkar, lepasKarakter, LANGKAH, UKURAN_KAPSUL,
} = await import('../src/fisika/Karakter.js');
const { MonasSpotRuntime, JARI_TEPI, SEGMEN_TEPI } = await import('../src/world/spots/MonasSpotRuntime.js');

const muatRapier = () => import(new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);
const JARI = UKURAN_KAPSUL[0] / 2;
/** Sama dengan KELOMPOK_SPOT di Game.js. */
const KELOMPOK = 'spot';
/** Syarat, bukan angka runtime: pusat pemain ≥ 0,1 m di dalam tepi plaza yang terlihat. */
const SISA_TEPI_MIN = 0.1;
/** 1 tanah + 32 cincin tepi + 1 tugu + 2 ondel-ondel + 1 badan rumah kebaya
 *  + 1 teras + 2 tiang teras + 1 pedestal portal. */
const JUMLAH_COLLIDER = 41;

/** ctx yang sama bentuknya dengan yang dikirim Game._syncSpotVisuals. */
const ctxGame = (fisika) => ({ toast: { show() {} }, openPanel() {}, fisika, kelompokFisika: KELOMPOK });

/** Monas seperti di browser: mount SEBELUM fisika siap (antrean), baru muat. */
async function monas() {
  const peringatan = [];
  const asli = console.warn;
  console.warn = (...a) => { peringatan.push(a.join(' ')); };
  try {
    const f = new Fisika({ muatRapier });
    const scene = new THREE.Scene();
    const rt = new MonasSpotRuntime().mount(scene, ctxGame(f));
    await f.muat();
    scene.updateMatrixWorld(true);
    return { f, rt, peringatan };
  } finally {
    console.warn = asli;
  }
}

/** Plaza dibaca dari mesh-nya. */
function ukurPlaza(rt) {
  const plaza = rt.getRaycastTargets()[0];
  assert.equal(plaza.geometry.type, 'CylinderGeometry');
  const { radiusTop, height, radialSegments } = plaza.geometry.parameters;
  return {
    jari: radiusTop,
    permukaan: plaza.position.y + height / 2,
    // Tepi atas plaza itu poligon: paling dekat ke pusat di tengah sisinya.
    tepiTerdekat: radiusTop * Math.cos(Math.PI / radialSegments),
  };
}

let M;
before(async () => { M = await monas(); });

test('Monas: menyatakan tanahnya sendiri, dan tidak ada collider yang diam-diam tembus', () => {
  assert.equal(M.rt.fisikaTanah, true, 'tanpa fisikaTanah, Game memasang lantai y 0 + cincin 17 m bawaan');
  assert.deepEqual(M.peringatan.filter((p) => p.includes('[fisika]')), []);
  assert.equal(M.f.hitung()[KELOMPOK], JUMLAH_COLLIDER);
  assert.equal(M.f.jumlahDiDunia(), JUMLAH_COLLIDER);
});

test('Monas: tanah fisika = permukaan plaza yang terlihat, sampai tepi atasnya', () => {
  const { jari, permukaan } = ukurPlaza(M.rt);
  for (const [x, z] of [[0, 2], [-6, 4], [3, -12], [jari - 0.05, 0], [0, -(jari - 0.05)]]) {
    const y = M.f.tanahDi(x, z);
    assert.ok(y != null && Math.abs(y - permukaan) < 0.005, `tanah di (${x}, ${z}) y=${y}, plaza ${permukaan}`);
  }
  assert.equal(M.f.tanahDi(jari + 0.05, 0), null, 'tanah fisika melebar melewati tepi atas plaza');
});

test('Monas: titik muncul (0, 2) bebas — atau ada titik berdiri ≤ 3 m — dan menapak di plaza', () => {
  const { permukaan } = ukurPlaza(M.rt);
  // Game: avatar.teleport(0, 2) → kaki y 0, lalu pastikanBebas().
  const k = buatKarakter(M.f, { x: 0, y: 0, z: 2 });
  try {
    const r = ruangBebas(k, { x: 0, z: 2, y: 0 });
    const titik = r.bebas ? { x: 0, y: r.tanahY, z: 2 } : cariTempatBerdiri(k, calonMelingkar({ x: 0, z: 2 }));
    assert.ok(titik, `titik muncul terhalang (${r.sebab}) dan tidak ada titik bebas dalam 3 m`);
    assert.ok(Math.hypot(titik.x, titik.z - 2) <= 3 + 1e-9, `titik berdiri terlalu jauh: ${JSON.stringify(titik)}`);
    assert.ok(Math.abs(titik.y - permukaan) < 0.01, `titik berdiri bukan di plaza: y=${titik.y}`);
    teleportKarakter(k, titik);
    const h = jalanKarakter(k, { detik: 1 });
    assert.ok(h.menapak && Math.abs(h.kaki.y - permukaan) < 0.03, `tidak menapak di plaza: ${JSON.stringify(h.kaki)}`);
  } finally { lepasKarakter(k); }
});

test('Monas: 16 arah × 6 detik — tidak pernah jatuh, tidak keluar cincin, pusat ≥ 0,1 m di dalam tepi plaza', () => {
  const { permukaan, tepiTerdekat } = ukurPlaza(M.rt);
  // Cincin 32 potongan itu POLIGON. Di tengah potongan pusat kapsul berhenti di
  // JARI_TEPI − 0,40; di sambungan, pusat yang berjarak 0,40 dari KEDUA bidang
  // dalam ada di (JARI_TEPI − 0,40) / cos(π/32) — titik terjauh yang mungkin.
  const batasCincin = (JARI_TEPI - JARI) / Math.cos(Math.PI / SEGMEN_TEPI);
  assert.ok(batasCincin <= tepiTerdekat - SISA_TEPI_MIN + 1e-9,
    `cincin membiarkan pusat sampai ${batasCincin.toFixed(3)}, tepi plaza terdekat ${tepiTerdekat.toFixed(3)}`);

  const k = buatKarakter(M.f, { x: 0, y: permukaan, z: 2 });
  try {
    for (let i = 0; i < 16; i++) {
      // +0,1 rad: arah yang tepat tegak lurus sisi tugu berhenti mati di sana.
      const a = (i / 16) * Math.PI * 2 + 0.1;
      teleportKarakter(k, { x: 0, y: permukaan, z: 2 });
      // 6 detik × 5,4 m/s = 32 m, diperiksa PER LANGKAH — "tidak pernah" jatuh
      // tidak bisa dibuktikan dari posisi akhir saja.
      let yMin = Infinity; let rMaks = 0; let kaki = null;
      for (let s = 0; s < 6 * 60; s++) {
        kaki = langkahKarakter(k, { dt: LANGKAH, arah: [Math.sin(a), Math.cos(a)] }).kaki;
        yMin = Math.min(yMin, kaki.y);
        rMaks = Math.max(rMaks, Math.hypot(kaki.x, kaki.z));
      }
      const rAkhir = Math.hypot(kaki.x, kaki.z);
      assert.ok(yMin > -0.5, `arah ${i}: jatuh menembus plaza, y min ${yMin.toFixed(3)}`);
      assert.ok(rAkhir <= batasCincin + 0.01, `arah ${i}: lolos sampai r=${rAkhir.toFixed(3)} (batas ${batasCincin.toFixed(3)})`);
      assert.ok(rMaks <= batasCincin + 0.01, `arah ${i}: sempat sampai r=${rMaks.toFixed(3)} (batas ${batasCincin.toFixed(3)})`);
      // Batasnya hanya teruji kalau lintasan benar-benar sampai ke sana, bukan
      // tersangkut di prop.
      assert.ok(rAkhir > batasCincin - 0.5, `arah ${i}: tidak sampai tepi, berhenti di r=${rAkhir.toFixed(3)}`);
    }
  } finally { lepasKarakter(k); }
});

test('Monas: tugu tidak bisa ditembus dari arah mana pun, dan menahan di badannya', () => {
  const { permukaan } = ukurPlaza(M.rt);
  const tugu = M.rt.root.getObjectByName('monas_tugu');
  const setengahLebar = tugu.geometry.parameters.width / 2;
  const sumbu = tugu.getWorldPosition(new THREE.Vector3());
  const k = buatKarakter(M.f, { x: sumbu.x, y: permukaan, z: sumbu.z + 3 });
  try {
    for (let i = 0; i < 8; i++) {
      // Dari 3 m lurus ke sumbu, digeser 0,1 rad supaya kapsul MELUNCUR di sisi
      // tugu dan melewati tengah sisinya — titik terdekat yang sah.
      const a = (i / 8) * Math.PI * 2 + 0.1;
      teleportKarakter(k, { x: sumbu.x + Math.sin(a) * 3, y: permukaan, z: sumbu.z + Math.cos(a) * 3 });
      let jarakMin = Infinity;
      for (let s = 0; s < 2 * 60; s++) {
        const { kaki } = langkahKarakter(k, { dt: LANGKAH, arah: [-Math.sin(a), -Math.cos(a)] });
        jarakMin = Math.min(jarakMin, Math.hypot(kaki.x - sumbu.x, kaki.z - sumbu.z));
      }
      assert.ok(jarakMin >= setengahLebar + JARI - 0.03, `arah ${i}: menembus tugu, jarak ke sumbu ${jarakMin.toFixed(3)}`);
      // Lebih jauh dari ini = yang menahan bukan badan tugu (atap emas Ø1,7
      // atau cincin rebah Ø5,6 ikut padat).
      assert.ok(jarakMin < setengahLebar + JARI + 0.15, `arah ${i}: tertahan jauh dari tugu, jarak ${jarakMin.toFixed(3)}`);
    }
  } finally { lepasKarakter(k); }
});

test('Monas: collider tiap benda padat setinggi dan setapak mesh-nya; hiasan dan benda di atas kepala tembus', () => {
  const rk = M.rt.root.getObjectByName('monas_rumah_kebaya');
  const anakRk = (tipe, cocok) => rk.children.filter((m) => m.geometry.type === tipe && cocok(m.geometry.parameters));
  const padat = [
    M.rt.root.getObjectByName('monas_tugu'),
    ...M.rt._ondel.map((o) => o.badan),
    ...anakRk('BoxGeometry', (p) => p.height === 2.25),           // badan rumah
    ...anakRk('BoxGeometry', (p) => p.height === 0.18),           // teras
    ...anakRk('CylinderGeometry', (p) => p.radiusTop === 0.09),   // tiang teras
    ...M.rt.root.getObjectByName('spot:warp_portal_anchor').children
      .filter((m) => m.geometry.type === 'CylinderGeometry'),      // pedestal portal
  ];
  assert.equal(padat.length, 8);

  // Sinar dari y 10 — di atas atap, kepala ondel-ondel, dan atap emas. Kalau
  // salah satunya diberi collider, sinar berhenti di sana, bukan di puncak mesh.
  const tanahDari = (x, z) => M.f.tanahDi(x, z, { dari: 10, jarak: 12 });
  for (const m of padat) {
    const p = m.geometry.parameters;
    const nama = `${m.geometry.type}(${Object.values(p).slice(0, 3).join(', ')})`;
    const puncak = new THREE.Vector3(0, p.height / 2, 0).applyMatrix4(m.matrixWorld).y;
    const kotak = m.geometry.type === 'BoxGeometry';
    // Titik di ruang LOKAL mesh, jadi putaran rumah kebaya ikut teruji.
    const dalam = kotak
      ? [[0, 0], [0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]].map(([u, v]) => [u * p.width, v * p.depth])
      : [[0, 0], [0.5 * p.radiusTop, 0], [0, -0.5 * p.radiusTop]];
    const hx = kotak ? p.width / 2 : p.radiusBottom;
    const hz = kotak ? p.depth / 2 : p.radiusBottom;
    const luar = [[hx + 0.12, 0], [-hx - 0.12, 0], [0, hz + 0.12], [0, -hz - 0.12]];
    const keDunia = ([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(m.matrixWorld);

    for (const t of dalam) {
      const w = keDunia(t);
      const y = tanahDari(w.x, w.z);
      assert.ok(y != null && Math.abs(y - puncak) < 0.01,
        `${nama} di (${w.x.toFixed(2)}, ${w.z.toFixed(2)}): collider setinggi ${y?.toFixed(3)}, mesh ${puncak.toFixed(3)}`);
    }
    for (const t of luar) {
      const w = keDunia(t);
      const y = tanahDari(w.x, w.z);
      // Di luar tapak, sinar mengenai lantai atau benda tetangga — asal bukan
      // puncak benda ini (teras bersebelahan dengan badan rumah).
      assert.ok(y == null || Math.abs(y - puncak) > 0.1,
        `${nama}: collider melebar sampai (${w.x.toFixed(2)}, ${w.z.toFixed(2)})`);
    }
  }

  // Cincin rebah di sekeliling tugu (Ø5,6, tinggi 0,12) dan rumput: hiasan lantai.
  const { permukaan } = ukurPlaza(M.rt);
  for (const [x, z] of [[0, 2.8], [2.8, 0], [0, -4]]) {
    const y = tanahDari(x, z);
    assert.ok(Math.abs(y - permukaan) < 0.005, `hiasan lantai di (${x}, ${z}) padat: y=${y}`);
  }
});

test('Monas: teras rumah kebaya bisa dinaiki satu undakan, dan badan rumahnya menahan', () => {
  const { permukaan } = ukurPlaza(M.rt);
  const rk = M.rt.root.getObjectByName('monas_rumah_kebaya');
  const badan = rk.children.find((m) => m.geometry.type === 'BoxGeometry' && m.geometry.parameters.height === 2.25);
  const teras = rk.children.find((m) => m.geometry.type === 'BoxGeometry' && m.geometry.parameters.height === 0.18);
  const puncakTeras = new THREE.Vector3(0, teras.geometry.parameters.height / 2, 0).applyMatrix4(teras.matrixWorld).y;
  const depanTeras = teras.position.z - teras.geometry.parameters.depth / 2;
  const dindingDepan = badan.position.z - badan.geometry.parameters.depth / 2;
  assert.ok(puncakTeras - permukaan <= 0.35, 'teras lebih tinggi dari batas naik tangga — ini bukan undakan lagi');

  // Di sumbu rumah (di antara dua tiang), 1,4 m di depan teras, berjalan lurus
  // ke dinding depan. Arah dan posisi diturunkan dari matriks grup rumah.
  const mulai = new THREE.Vector3(0, 0, depanTeras - 1.4).applyMatrix4(rk.matrixWorld);
  const arah = new THREE.Vector3(0, 0, 1).transformDirection(rk.matrixWorld);
  const k = buatKarakter(M.f, { x: mulai.x, y: permukaan, z: mulai.z });
  try {
    let yMaks = -Infinity; let zLokalMaks = -Infinity; let kaki = null;
    for (let s = 0; s < 2 * 60; s++) {
      kaki = langkahKarakter(k, { dt: LANGKAH, arah: [arah.x, arah.z] }).kaki;
      yMaks = Math.max(yMaks, kaki.y);
      zLokalMaks = Math.max(zLokalMaks, rk.worldToLocal(new THREE.Vector3(kaki.x, 0, kaki.z)).z);
    }
    assert.ok(Math.abs(kaki.y - puncakTeras) < 0.03, `tidak berdiri di teras: y=${kaki.y.toFixed(3)}, teras ${puncakTeras.toFixed(3)}`);
    assert.ok(yMaks < puncakTeras + 0.05, `naik melebihi teras: y maks ${yMaks.toFixed(3)}`);
    assert.ok(zLokalMaks <= dindingDepan - JARI + 0.03, `menembus dinding rumah: z lokal ${zLokalMaks.toFixed(3)}`);
    assert.ok(zLokalMaks > dindingDepan - JARI - 0.1, `tertahan sebelum dinding: z lokal ${zLokalMaks.toFixed(3)}`);
  } finally { lepasKarakter(k); }
});

test('Monas: warp keluar melepas semua collidernya — jumlah kembali ke garis dasar', async () => {
  const f = new Fisika({ muatRapier });
  await f.muat();
  // Kapsul pemain ikut pindah Spot, jadi termasuk garis dasar.
  const k = buatKarakter(f, { x: 0, y: 0, z: 2 });
  try {
    const dasar = f.jumlahDiDunia();
    // Masuk–keluar dua kali: tidak ada sisa dari kunjungan pertama, tidak ada dobel.
    for (let putaran = 0; putaran < 2; putaran++) {
      const scene = new THREE.Scene();
      const rt = new MonasSpotRuntime().mount(scene, ctxGame(f));
      assert.equal(f.jumlahDiDunia(), dasar + JUMLAH_COLLIDER, `putaran ${putaran}: sesudah mount`);
      // Urutan Game._syncSpotVisuals: lepas kelompok dulu, baru dispose.
      assert.equal(f.lepasKelompok(KELOMPOK), JUMLAH_COLLIDER);
      rt.dispose(scene);
      assert.equal(f.jumlahDiDunia(), dasar, `putaran ${putaran}: ${f.jumlahDiDunia()} collider, garis dasar ${dasar}`);
    }
  } finally { lepasKarakter(k); }
});
