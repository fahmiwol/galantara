// ═══════════════════════════════════════════════════════
// tests/fisikaSpot-bogor.test.mjs — Spot Bogor (alun-alun) dengan fisikanya sendiri
//
// BogorSpotRuntime menyatakan tanah, batas, dan collider bendanya sendiri
// (`fisikaTanah = true`), jadi Game tidak memasang lantai 120×120 + cincin 17 m
// bawaannya. Berkas ini menguji yang dirasakan pemain di Spot itu, dengan
// THREE r128 asli (vendor/) dan Rapier asli: titik muncul, tidak jatuh, tidak
// keluar dari tanah yang TERLIHAT, bangku bisa ditinggalkan, dan warp keluar
// tidak meninggalkan collider.
//
// Tanpa stub DOM: runtime ini hanya membutuhkan THREE (mesh, material, grup).
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
  buatKarakter, langkahKarakter, jalanKarakter, kakiKarakter, teleportKarakter, ruangBebas,
  cariTempatBerdiri, calonMelingkar, lepasKarakter, UKURAN_KAPSUL, LANGKAH, PARAM,
} = await import('../src/fisika/Karakter.js');
const {
  BogorSpotRuntime, SISA_TEPI, JARI_TEPI, SEGMEN_TEPI,
} = await import('../src/world/spots/BogorSpotRuntime.js');

const muatRapier = () => import(new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);
const JARI = UKURAN_KAPSUL[0] / 2;
/** = KELOMPOK_SPOT di Game.js (tidak diekspor; Game.js tidak bisa dimuat di Node). */
const KELOMPOK = 'spot';

/**
 * Pasang Spot seperti Game._syncSpotVisuals. `toast` hanya dipakai saat [F]
 * ditekan; di sini ia ada supaya mount menempuh jalur yang sama dengan Game.
 */
function pasang(f) {
  const rt = new BogorSpotRuntime();
  const scene = new THREE.Scene();
  rt.mount(scene, { toast: { show() {} }, fisika: f, kelompokFisika: KELOMPOK });
  return { rt, scene };
}

/** Mesh tanah alun-alun: target raycast Spot ini (dipakai MapBuilder). */
function meshTanah(rt) {
  const tanah = rt.getRaycastTargets().find((m) => m.geometry?.type === 'CylinderGeometry');
  assert.ok(tanah, 'mesh tanah alun-alun tidak ditemukan di target raycast');
  return tanah;
}

/** Aturan permainan yang sama dengan Game._bolehBerdiriDi. */
const bolehUntuk = (daftarMeja) => (p) => daftarMeja.every((m) => m.kursi.every(
  (k) => Math.hypot(p.x - k.x, p.z - k.z) > m.toleransiKursi + 0.08,
));

let B;
before(async () => {
  // Dipasang SEBELUM fisika siap — urutan muat pertama dengan ?spot=bogor
  // (Game memanggil _syncSpotVisuals sebelum _muatFisika).
  const peringatan = [];
  const asli = console.warn;
  console.warn = (...a) => { peringatan.push(a.join(' ')); };
  try {
    const f = new Fisika({ muatRapier });
    const { rt } = pasang(f);
    await f.muat();
    B = { f, rt, peringatan };
  } finally {
    console.warn = asli;
  }
});

test('Bogor: runtime menyatakan tanahnya sendiri, tanpa peringatan [fisika]', () => {
  assert.equal(B.rt.fisikaTanah, true, 'tanpa ini Game memasang lantai 120×120 + cincin 17 m bawaan');
  assert.deepEqual(B.peringatan.filter((p) => p.includes('[fisika]')), []);
  // 1 tanah + cincin + badan warung + batang pohon + alas portal + collider
  // bangku (didaftarkan MejaNongkrong sendiri — tidak boleh tergandakan).
  const bangku = B.rt.meja.reduce((n, m) => n + m.deskriptorFisika().length, 0);
  assert.equal(B.f.hitung()[KELOMPOK], 1 + SEGMEN_TEPI + 3 + bangku);
  // Semua yang diantrekan sebelum fisika siap benar-benar terpasang.
  assert.equal(B.f.jumlahDiDunia(), B.f.hitung()[KELOMPOK]);
});

test('Bogor: titik muncul (0, 2) bebas dan berdiri di permukaan alun-alun yang terlihat', () => {
  const tanah = meshTanah(B.rt);
  const permukaan = tanah.position.y + tanah.geometry.parameters.height / 2;
  const k = buatKarakter(B.f, { x: 0, y: 0, z: 2 });
  try {
    const r = ruangBebas(k, { x: 0, z: 2, y: 0 });
    const titik = r.bebas
      ? { x: 0, y: r.tanahY, z: 2 }
      : cariTempatBerdiri(k, calonMelingkar({ x: 0, z: 2 }));
    assert.ok(titik, `titik muncul terhalang (${r.sebab}) dan tidak ada titik bebas dalam 3 m`);
    assert.ok(Math.hypot(titik.x, titik.z - 2) <= 3 + 1e-9, `titik bebas terlalu jauh: ${JSON.stringify(titik)}`);
    // Tanah fisika = permukaan mesh. Toleransi 1 mm untuk float32 Rapier.
    assert.ok(Math.abs(titik.y - permukaan) < 1e-3, `tanah fisika y=${titik.y}, mesh y=${permukaan}`);

    teleportKarakter(k, titik);
    const h = jalanKarakter(k, { detik: 1 });
    assert.ok(h.menapak && Math.abs(h.kaki.y - permukaan) < 0.03, `tidak menapak di alun-alun: ${JSON.stringify(h)}`);
  } finally { lepasKarakter(k); }
});

test('Bogor: 6 detik ke 16 arah — tidak pernah jatuh, tidak keluar dari tanah yang terlihat', () => {
  const { radiusTop, radialSegments } = meshTanah(B.rt).geometry.parameters;
  // Tepi atas tanah paling dekat ada di TENGAH SISI poligon mesh-nya, bukan di jari 14.
  const tepiTerlihat = radiusTop * Math.cos(Math.PI / radialSegments);
  // Cincin juga POLIGON: di sambungan, pusat kapsul bisa sampai (jari − 0,40)/cos(π/32),
  // lebih jauh daripada di tengah potongan. Offset pengendali (0,02) tidak dikurangkan.
  const batas = (JARI_TEPI - JARI) / Math.cos(Math.PI / SEGMEN_TEPI);
  assert.ok(batas <= tepiTerlihat - SISA_TEPI + 1e-9,
    `cincin terlalu lebar: pusat pemain bisa sampai ${batas.toFixed(3)}, tepi terlihat ${tepiTerlihat.toFixed(3)}`);

  const k = buatKarakter(B.f, { x: 0, y: 0, z: 2 });
  try {
    let rTerjauh = 0;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      teleportKarakter(k, { x: 0, y: 0, z: 2 });
      // 6 detik × 5,4 m/s = 32 m: cukup untuk mencapai tepi dari arah mana pun,
      // termasuk yang harus meluncur memutari warung, bangku, pohon, dan portal.
      let yMin = Infinity;
      let rMaks = 0;
      for (let s = 0; s < 6 * 60; s++) {
        const { kaki } = langkahKarakter(k, { dt: LANGKAH, arah: [Math.sin(a), Math.cos(a)] });
        yMin = Math.min(yMin, kaki.y);
        rMaks = Math.max(rMaks, Math.hypot(kaki.x, kaki.z));
      }
      const p = kakiKarakter(k);
      const r = Math.hypot(p.x, p.z);
      assert.ok(yMin > -0.5, `arah ${i}: jatuh menembus alun-alun, y min ${yMin}`);
      assert.ok(r <= batas, `arah ${i}: berakhir di r=${r.toFixed(3)} (batas ${batas.toFixed(3)})`);
      assert.ok(rMaks <= batas, `arah ${i}: sempat lolos sampai r=${rMaks.toFixed(3)} (batas ${batas.toFixed(3)})`);
      rTerjauh = Math.max(rTerjauh, rMaks);
    }
    // Periksa alatnya: kalau tak satu arah pun sampai ke cincin, "tidak keluar"
    // lolos karena pemain tertahan di tempat lain, bukan karena batasnya benar.
    const tengahPotongan = JARI_TEPI - JARI - PARAM.offset;
    assert.ok(rTerjauh >= tengahPotongan - 0.01,
      `tidak ada arah yang sampai ke cincin: terjauh r=${rTerjauh.toFixed(3)}, cincin menahan di ${tengahPotongan.toFixed(3)}`);
  } finally { lepasKarakter(k); }
});

test('Bogor: alas portal tidak bisa dinaiki walau lebih tinggi dari batas naik tangga', () => {
  // Ujung kapsul bundar: terukur ia memanjat tepi silinder 0,45 m (kaki naik
  // sampai 0,40) walau batas naik tangga 0,35. Collider alasnya karena itu 0,60 m.
  const tanah = meshTanah(B.rt);
  const permukaan = tanah.position.y + tanah.geometry.parameters.height / 2;
  const portal = B.rt.interactionVolumes.find((v) => v.id === 'spot_warp_portal');
  assert.ok(portal, 'volume interaksi portal tidak ada');
  const k = buatKarakter(B.f, { x: 0, y: 0, z: 2 });
  try {
    let yMaks = -Infinity;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.1;
      teleportKarakter(k, { x: portal.cx + Math.sin(a) * 2.5, y: permukaan, z: portal.cz + Math.cos(a) * 2.5 });
      for (let s = 0; s < 90; s++) {
        yMaks = Math.max(yMaks, langkahKarakter(k, { dt: LANGKAH, arah: [-Math.sin(a), -Math.cos(a)] }).kaki.y);
      }
    }
    assert.ok(yMaks < permukaan + 0.05, `pemain naik ke alas portal: y maks ${yMaks.toFixed(3)}`);
  } finally { lepasKarakter(k); }
});

test('Bogor: tiap kursi bangku punya titik berdiri yang muat', () => {
  const tanah = meshTanah(B.rt);
  const permukaan = tanah.position.y + tanah.geometry.parameters.height / 2;
  const k = buatKarakter(B.f, { x: 0, y: 0, z: 2 });
  const boleh = bolehUntuk(B.rt.meja);
  try {
    let jumlah = 0;
    for (const m of B.rt.meja) {
      for (const kur of m.kursi) {
        const titik = cariTempatBerdiri(k, kur.keluar);
        assert.ok(titik, `${m.id} kursi ${kur.i}: tidak ada titik berdiri yang muat`);
        assert.ok(Math.abs(titik.y - permukaan) < 0.02, `${m.id} kursi ${kur.i}: berdiri di atas sesuatu, y=${titik.y}`);
        // Dengan aturan Game: titiknya juga harus di luar radius kursi mana pun,
        // kalau tidak klien lain tetap menghitung pemain itu duduk.
        assert.ok(cariTempatBerdiri(k, kur.keluar, { boleh }),
          `${m.id} kursi ${kur.i}: semua titik berdiri yang muat masih di radius kursi`);
        jumlah++;
      }
    }
    assert.ok(jumlah > 0, 'Spot Bogor tanpa kursi — uji ini tidak menguji apa pun');
  } finally { lepasKarakter(k); }
});

test('Bogor: warp keluar — lepasKelompok("spot") mengembalikan jumlah collider ke garis dasar', async () => {
  // Warp: fisika SUDAH siap dan kapsul pemain sudah ada saat Spot dipasang.
  const f = new Fisika({ muatRapier });
  await f.muat();
  const k = buatKarakter(f, { x: 0, y: 0, z: 2 });
  try {
    const dasar = f.jumlahDiDunia();
    const { rt, scene } = pasang(f);
    const dipasang = f.hitung()[KELOMPOK];
    assert.ok(dipasang > 0, 'mount tidak mendaftarkan collider apa pun');
    assert.equal(f.jumlahDiDunia(), dasar + dipasang);

    // Urutan Game._syncSpotVisuals: lepas kelompok, lalu dispose runtime.
    assert.equal(f.lepasKelompok(KELOMPOK), dipasang);
    rt.dispose(scene);
    assert.equal(f.jumlahDiDunia(), dasar);
    assert.equal(f.hitung()[KELOMPOK], undefined);
  } finally { lepasKarakter(k); }
});
