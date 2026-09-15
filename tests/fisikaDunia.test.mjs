// ═══════════════════════════════════════════════════════
// tests/fisikaDunia.test.mjs — collider DUNIA SUNGGUHAN, bukan dunia uji
//
// tests/fisika.test.mjs menguji mesinnya dengan kotak-kotak buatan. Berkas ini
// menguji yang dirasakan pemain: pulau Oola yang dibangun World.js dengan
// THREE r128 asli (vendor/) dan Rapier asli, meja nongkrong di keempat gaya,
// dan Avatar yang duduk lalu berdiri.
//
// Tiga uji wajib dari tinjauan Codex (15 Sep 2026) yang bisa dijalankan tanpa
// browser ada di sini: duduk→berdiri di semua gaya termasuk saat terkurung,
// titik muncul yang bebas, dan jumlah collider yang kembali ke garis dasar
// setelah pindah Spot. Yang butuh browser (GLB nyata, ponsel) belum.
// ═══════════════════════════════════════════════════════

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// THREE r128 dari vendor — build UMD yang sama dengan yang dimuat index.html.
const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { Fisika, dindingPersegi } = await import('../src/fisika/Fisika.js');
const {
  buatKarakter, jalanKarakter, kakiKarakter, teleportKarakter, ruangBebas,
  cariTempatBerdiri, langkahKarakter, UKURAN_KAPSUL, KECEPATAN,
} = await import('../src/fisika/Karakter.js');
const { World, KELOMPOK_OOLA } = await import('../src/world/World.js');
const { MejaNongkrong } = await import('../src/world/MejaNongkrong.js');
const { Avatar } = await import('../src/entities/Avatar.js');
const { ISLAND_R } = await import('../src/data/config.js');

const muatRapier = () => import(new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);
const PETA = JSON.parse(readFileSync(new URL('../src/data/maps/default_oola.json', import.meta.url), 'utf8'));
const JARI = UKURAN_KAPSUL[0] / 2;

/** Pulau Oola lengkap, seperti yang dibangun Game. */
async function oola() {
  const peringatan = [];
  const asli = console.warn;
  console.warn = (...a) => { peringatan.push(a.join(' ')); };
  try {
    const f = new Fisika({ muatRapier });
    const world = new World(new THREE.Scene(), { fisika: f });
    world.mapData = structuredClone(PETA);
    world.build();                 // didaftarkan SEBELUM fisika siap — seperti di browser
    await f.muat();
    return { f, world, peringatan };
  } finally {
    console.warn = asli;
  }
}

let O;
before(async () => { O = await oola(); });

test('Oola: setiap prop menyatakan collider-nya, tidak ada yang diam-diam tembus', () => {
  const tembus = O.peringatan.filter((p) => p.includes('[fisika]'));
  assert.deepEqual(tembus, []);
  // 1 tanah + 32 cincin + 5 prop native + 14 prop prosedural + 7 meja warung.
  // (Tiga bangku lempeng native dihapus 15 Sep — lihat LIVING_LOG, suasana Oola.)
  assert.equal(O.f.hitung()[KELOMPOK_OOLA], 59);
  assert.equal(O.f.jumlahDiDunia(), 59);
});

test('Oola: titik muncul bebas dan berdiri di tanah', () => {
  const k = buatKarakter(O.f, { x: 0, y: 0, z: 2 });
  try {
    const r = ruangBebas(k, { x: 0, z: 2, y: 0 });
    assert.equal(r.bebas, true, `titik muncul terhalang: ${r.sebab}`);
    assert.ok(Math.abs(r.tanahY) < 0.01, `tanah di titik muncul y=${r.tanahY}`);
    const h = jalanKarakter(k, { detik: 1 });
    assert.ok(Math.abs(h.kaki.y) < 0.03 && h.menapak, `tidak menapak di tanah pulau: ${JSON.stringify(h)}`);
  } finally { lepas(k); }
});

test('Oola: tidak ada jalan keluar pulau, ke arah mana pun', () => {
  const k = buatKarakter(O.f, { x: 0, y: 0, z: 2 });
  try {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      teleportKarakter(k, { x: 0, y: 0, z: 2 });
      // 6 detik × 5,4 m/s = 32 m: cukup untuk mencapai tepi dari arah mana pun,
      // termasuk yang harus meluncur memutari prop.
      jalanKarakter(k, { detik: 6, arah: [Math.sin(a), Math.cos(a)] });
      const p = kakiKarakter(k);
      const r = Math.hypot(p.x, p.z);
      // Cincin 32 potongan itu POLIGON: di sambungan, permukaan dalamnya
      // 1/cos(π/32) lebih jauh daripada di tengah potongan (17,48 vs 17,40),
      // jadi pemain boleh sampai ±17,08 di sana. Lebih dari itu = bocor.
      const batas = (ISLAND_R - 1 + JARI) / Math.cos(Math.PI / 32) - JARI + 0.01;
      assert.ok(r <= batas, `arah ${i}: lolos sampai r=${r.toFixed(3)} (batas ${batas.toFixed(3)})`);
      assert.ok(p.y > -0.5, `arah ${i}: jatuh menembus pulau, y=${p.y}`);
    }
  } finally { lepas(k); }
});

test('Oola: pohon ungu menahan di batangnya, bukan di kanopinya', () => {
  const k = buatKarakter(O.f, { x: -3, y: 0, z: 0.05 });
  try {
    let jarakMin = Infinity;
    for (let i = 0; i < 90; i++) {
      const { kaki } = langkahKarakter(k, { dt: 1 / 60, arah: [1, 0] });
      jarakMin = Math.min(jarakMin, Math.hypot(kaki.x, kaki.z));
    }
    assert.ok(jarakMin >= 0.475 + JARI - 0.03, `menembus batang: ${jarakMin.toFixed(3)}`);
    assert.ok(jarakMin < 0.475 + JARI + 0.15, `tertahan jauh dari batang (kanopi padat?): ${jarakMin.toFixed(3)}`);
  } finally { lepas(k); }
});

test('benda rendah (bangku 0,30 m, dulang 0,16 m) tidak bisa dinaiki walau di bawah batas naik tangga', async () => {
  // Pengendali menaiki apa pun yang lebih rendah dari 0,35 m. Tanpa volume yang
  // lebih tinggi dari mesh-nya (ADR-0016), pemain berjalan di atas bangku dan
  // di atas dulang lesehan.
  const f = new Fisika({ muatRapier });
  await f.muat();
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [40, 1, 40] }], { x: 0, y: -0.5, z: 0 });
  const bangku = new MejaNongkrong({ id: 'bangku', x: 0, z: 0, gaya: 'bangku', kursi: 2 });
  const lesehan = new MejaNongkrong({ id: 'lesehan', x: 0, z: 6, gaya: 'lesehan', kursi: 3 });
  bangku.daftarkanFisika(f, 'meja');
  lesehan.daftarkanFisika(f, 'meja');
  for (const zAwal of [-2.5, 3.5]) {
    const k = buatKarakter(f, { x: 0.05, y: 0, z: zAwal });
    let yMaks = -1;
    for (let i = 0; i < 90; i++) yMaks = Math.max(yMaks, langkahKarakter(k, { dt: 1 / 60, arah: [0, 1] }).kaki.y);
    assert.ok(yMaks < 0.05, `dari z=${zAwal}: pemain naik ke atas benda rendah, y maks ${yMaks.toFixed(3)}`);
  }
});

// ── Duduk → berdiri ─────────────────────────────────────────────────
const GAYA = [
  { gaya: 'warung', kursi: 4 },
  { gaya: 'lesehan', kursi: 3 },
  { gaya: 'lesehan', kursi: 8 },
  { gaya: 'kafe', kursi: 2 },
  { gaya: 'bangku', kursi: 2 },
];

/** Aturan permainan yang sama dengan Game._bolehBerdiriDi. */
const bolehUntuk = (daftarMeja) => (p) => daftarMeja.every((m) => m.kursi.every(
  (k) => Math.hypot(p.x - k.x, p.z - k.z) > m.toleransiKursi + 0.08,
));

for (const { gaya, kursi } of GAYA) {
  for (const rotasi of [0, 0.7, Math.PI / 2]) {
    test(`meja ${gaya} ${kursi} kursi, rotasi ${rotasi}: tiap kursi bisa ditinggalkan ke titik yang muat`, async () => {
      const f = new Fisika({ muatRapier });
      await f.muat();
      f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [40, 1, 40] }], { x: 0, y: -0.5, z: 0 });
      const meja = new MejaNongkrong({ id: 'uji', x: 1.5, z: -2, gaya, kursi, rotasi });
      meja.daftarkanFisika(f, 'meja');
      const k = buatKarakter(f, { x: 10, y: 0, z: 10 });
      const boleh = bolehUntuk([meja]);
      for (const kur of meja.kursi) {
        assert.ok(kur.keluar?.length >= 5, `kursi ${kur.i} tanpa calon titik berdiri`);
        const titik = cariTempatBerdiri(k, kur.keluar, { boleh });
        assert.ok(titik, `kursi ${kur.i}: tidak ada titik berdiri yang muat di dunia datar`);
        // Titik PERTAMA harus sudah muat di dunia tanpa rintangan lain — calon
        // berikutnya untuk tembok dan pohon, bukan untuk menambal meja sendiri.
        assert.ok(Math.abs(titik.x - kur.keluar[0].x) < 1e-9 && Math.abs(titik.z - kur.keluar[0].z) < 1e-9,
          `kursi ${kur.i}: calon pertama ditolak oleh collider mejanya sendiri`);
        assert.ok(Math.abs(titik.y) < 0.02, `kursi ${kur.i}: berdiri di atas sesuatu, y=${titik.y}`);
        // Keluar dari radius kursi mana pun — kalau tidak, klien lain tetap
        // menghitungnya duduk.
        const terisi = meja.hitungKursi([{ kunci: 'aku', nama: 'aku', x: titik.x, z: titik.z }]);
        assert.ok(terisi.every((t) => t === null), `kursi ${kur.i}: setelah berdiri masih dihitung duduk`);
      }
    });
  }
}

test('Avatar: duduk lalu berdiri memindahkan posisi keluar kursi dan menghidupkan kapsul', async () => {
  const f = new Fisika({ muatRapier });
  await f.muat();
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [40, 1, 40] }], { x: 0, y: -0.5, z: 0 });
  const meja = new MejaNongkrong({ id: 'uji', x: 0, z: 0, gaya: 'warung', kursi: 4 });
  meja.daftarkanFisika(f, 'meja');

  const av = new Avatar(new THREE.Scene());
  av.pos = { x: 0, y: 0, z: 3 };
  av.bolehBerdiri = bolehUntuk([meja]);
  av.pakaiKarakter(buatKarakter(f, { x: 0, y: 0, z: 3 }));

  const kursi = meja.kursi[0];
  assert.equal(av.duduk({ ...kursi, mejaId: meja.id }), true);
  assert.equal(av._karakter.collider.isEnabled(), false, 'kapsul tetap hidup saat duduk');
  assert.equal(av.berdiri(), true);
  assert.equal(av._karakter.collider.isEnabled(), true);
  assert.ok(Math.hypot(av.pos.x - kursi.x, av.pos.z - kursi.z) > meja.toleransiKursi + 0.08,
    `berdiri di tempat: ${JSON.stringify(av.pos)}`);
  // Badan fisika ikut pindah, bukan cuma posisi gambar.
  const kaki = kakiKarakter(av._karakter);
  assert.ok(Math.abs(kaki.x - av.pos.x) < 1e-6 && Math.abs(kaki.z - av.pos.z) < 1e-6);
});

test('Avatar: kursi yang terkurung tembok — berdiri GAGAL dan pemain tetap duduk', async () => {
  const f = new Fisika({ muatRapier });
  await f.muat();
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [40, 1, 40] }], { x: 0, y: -0.5, z: 0 });
  const meja = new MejaNongkrong({ id: 'uji', x: 0, z: 0, gaya: 'bangku', kursi: 2 });
  meja.daftarkanFisika(f, 'meja');
  // Kurungan rapat 2,0 × 1,2 m di sekeliling bangku: tidak ada calon yang muat.
  f.daftarkan('kurung', dindingPersegi(2.0, 1.2, { tebal: 0.3 }), { x: 0, y: 0, z: 0 });

  const av = new Avatar(new THREE.Scene());
  av.pos = { x: 5, y: 0, z: 5 };
  av.pakaiKarakter(buatKarakter(f, { x: 5, y: 0, z: 5 }));
  const kursi = meja.kursi[0];
  av.duduk({ ...kursi, mejaId: meja.id });
  assert.equal(av.berdiri(), false);
  assert.equal(av.sedangDuduk, true, 'dilepas dari kursi padahal tidak ada tempat berdiri');
  assert.equal(av._karakter.collider.isEnabled(), false);
  assert.deepEqual({ x: av.pos.x, z: av.pos.z }, { x: kursi.x, z: kursi.z });
});

test('Avatar: fisika menyambung saat pemain berdiri di dalam pohon — dipindah ke titik bebas terdekat', async () => {
  const av = new Avatar(new THREE.Scene());
  // Gerak lama sempat membawa pemain masuk ke batang pohon ungu di (0,0).
  av.pos = { x: 0.2, y: 0, z: 0.1 };
  av.bolehBerdiri = bolehUntuk(O.world.meja);
  av.pakaiKarakter(buatKarakter(O.f, { x: 0.2, y: 0, z: 0.1 }));
  try {
    const r = Math.hypot(av.pos.x, av.pos.z);
    assert.ok(r >= 0.475 + JARI - 0.03, `masih di dalam batang: r=${r.toFixed(3)}`);
    assert.ok(r < 0.475 + JARI + 0.4, `dipindah terlalu jauh: r=${r.toFixed(3)}`);
    assert.equal(ruangBebas(av._karakter, av.pos).bebas, true);
  } finally { lepas(av._karakter); }
});

test('Avatar: gerak lama (fisika belum siap) memakai m/s, bukan unit per bingkai', () => {
  const av = new Avatar(new THREE.Scene());
  av.mesh = new THREE.Group();
  av.pos = { x: 0, y: 0, z: 0 };
  const kamera = { getMoveDelta: (d) => (d === 'right' ? { dx: 1, dz: 0 } : null) };
  av.keys.right = true;
  // 1 detik di 30 fps dan di 60 fps harus menempuh jarak yang sama.
  for (let i = 0; i < 30; i++) av.update(1 / 30, kamera);
  const di30 = av.pos.x;
  av.pos = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 60; i++) av.update(1 / 60, kamera);
  assert.ok(Math.abs(di30 - KECEPATAN) < 1e-6 && Math.abs(av.pos.x - KECEPATAN) < 1e-6,
    `30 fps: ${di30.toFixed(3)} m · 60 fps: ${av.pos.x.toFixed(3)} m · harapan ${KECEPATAN}`);
});

function lepas(k) {
  if (!k) return;
  k.fisika.w.removeCharacterController(k.kendali);
  k.fisika.w.removeRigidBody(k.badan);
}
