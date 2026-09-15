// ═══════════════════════════════════════════════════════
// tests/fisika.test.mjs — kolisi yang tidak boleh berbohong
//
// Memakai Rapier SUNGGUHAN (vendor/rapier3d-compat.0.20.0.js), bukan tiruan.
// Tiruan mesin fisika hanya menguji tiruannya — dan ADR-0012 sudah mencatat
// bagaimana stub yang terlalu ramah membuat uji hijau yang tidak menguji apa pun.
//
// Empat kegagalan khas mesin fisika (dicatat Rupa3D/docs/FISIKA.md), dan
// yang menjaga masing-masing di sini:
//   TEMBUS   — "tidak tembus bahkan di dt terburuk"
//   GETAR    — "diam 10 detik tidak bergetar"
//   HANYUT   — "diam 10 detik tidak bergeser"
//   MASSA    — tidak relevan: Galantara belum punya badan dinamis
// Ditambah yang membuat pengendali ini terasa seperti Godot/Unity:
//   MELUNCUR — menabrak dinding miring tetap bergerak sepanjang dinding
//   JAM      — jarak per detik sama di 30, 60, 120, 144 fps (tinjauan Codex)
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fisika, cincinTepi, dindingPersegi } from '../src/fisika/Fisika.js';
import {
  paramCollider, pusatDunia, periksaDaftar, kuaternionDunia, TITIK_HULL_MAKS,
} from '../src/fisika/bentuk.js';
import {
  buatKarakter, langkahKarakter, jalanKarakter, kakiKarakter, teleportKarakter,
  majukanKarakter, nonaktifkanKarakter, aktifkanKarakter, ruangBebas,
  cariTempatBerdiri, calonMelingkar, UKURAN_KAPSUL, KECEPATAN, PARAM,
} from '../src/fisika/Karakter.js';

const URL_RAPIER = new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url);
const muatRapier = () => import(URL_RAPIER.href).then((m) => m.default);
const JARI = UKURAN_KAPSUL[0] / 2;

/** Dunia dengan lantai datar di y = 0. */
async function duniaDatar() {
  const f = new Fisika({ muatRapier });
  await f.muat();
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [80, 1, 80] }], { x: 0, y: -0.5, z: 0 });
  return f;
}

// ── Kosakata: harus SAMA PERSIS dengan Rupa3D/fisika.mjs:66-69 ─────────
test('pemetaan bentuk identik dengan rumus Rupa3D', () => {
  assert.deepEqual(paramCollider({ bentuk: 'kotak', ukuran: [2, 4, 6] }), { pembuat: 'cuboid', args: [1, 2, 3] });
  assert.deepEqual(paramCollider({ bentuk: 'bola', ukuran: [2, 2, 2] }), { pembuat: 'ball', args: [1] });
  assert.deepEqual(paramCollider({ bentuk: 'silinder', ukuran: [0.6, 4, 0.6] }), { pembuat: 'cylinder', args: [2, 0.3] });
  // kapsul: batang = max(y/2 − x/2, ε), jari = x/2
  const k = paramCollider({ bentuk: 'kapsul', ukuran: [0.8, 1.3, 0.8] });
  assert.equal(k.pembuat, 'capsule');
  assert.ok(Math.abs(k.args[0] - 0.25) < 1e-12 && Math.abs(k.args[1] - 0.4) < 1e-12);
});

test('deskriptor rusak ditolak di depan, dengan nama prop-nya', () => {
  assert.throws(() => periksaDaftar([{ bentuk: 'segitiga' }], 'pohon_7'), /bentuk tabrakan tidak dikenal/);
  assert.throws(() => periksaDaftar([{ bentuk: 'kotak', ukuran: [1, 0, 1] }], 'meja'), /ukuran tidak sah/);
  assert.throws(() => periksaDaftar([{ bentuk: 'kotak', ukuran: 1, putarX: 0.3 }], 'x'), /Euler selain Y ditolak/);
  assert.throws(() => periksaDaftar([{ bentuk: 'kotak', ukuran: 1, putar: [0, 0, 0, 1], putarY: 1 }], 'x'), /pilih satu/);
  assert.throws(() => periksaDaftar([{ bentuk: 'kotak', ukuran: 1, putar: [0, 0, 0, 0] }], 'x'), /norma nol/);
  assert.throws(() => periksaDaftar([{ bentuk: 'kotak', ukuran: 1, letak: [0, NaN, 0] }], 'x'), /letak harus/);
  assert.throws(() => periksaDaftar([{ bentuk: 'kotak', ukuran: 1, jenis: 'dinamis' }], 'x'), /belum didukung/);
});

test('hull: batas 4.096 titik sama dengan Rupa3D, titik rusak dan datar ditolak', () => {
  // Batas lama 8.000 ada TEPAT di ambang convexHull Rapier rusak diam-diam.
  assert.equal(TITIK_HULL_MAKS, 4096);
  const acak = (n) => Array.from({ length: n * 3 }, (_, i) => Math.sin(i * 12.9898) * 43758.5453 % 1);
  assert.throws(() => periksaDaftar([{ bentuk: 'cembung', titik: acak(4097) }], 'rumah'), /4\.096/);
  assert.doesNotThrow(() => periksaDaftar([{ bentuk: 'cembung', titik: acak(4096) }], 'rumah'));
  assert.throws(() => periksaDaftar([{ bentuk: 'cembung', titik: [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, Infinity] }], 'x'), /tidak finite/);
  // Empat titik sebidang (y = 0): hull bervolume nol yang tidak menabrak apa pun.
  assert.throws(() => periksaDaftar([{ bentuk: 'cembung', titik: [0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1] }], 'x'), /sebidang/);
  assert.doesNotThrow(() => periksaDaftar([{ bentuk: 'cembung', titik: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0] }], 'x'));
});

test('arah putar letak lokal sama dengan THREE.Object3D', () => {
  // Rotasi 90°: (lx, lz) → (lz, −lx). Kebalikannya pernah mendudukkan pemain
  // di sebelah bangku — lihat tests/mejaNongkrong.test.mjs.
  const p = pusatDunia({ x: 0, y: 0, z: 0 }, Math.PI / 2, [1, 0, 0]);
  assert.ok(Math.abs(p.x - 0) < 1e-9 && Math.abs(p.z - -1) < 1e-9, JSON.stringify(p));
});

test('putaran bagian dikomposisikan dengan putaran induk', () => {
  // putarY induk 30° + putarY bagian 60° = 90° di sumbu Y.
  const q = kuaternionDunia(Math.PI / 6, { putarY: Math.PI / 3 });
  assert.ok(Math.abs(q.y - Math.sin(Math.PI / 4)) < 1e-12 && Math.abs(q.w - Math.cos(Math.PI / 4)) < 1e-12, JSON.stringify(q));
  // Kuaternion bagian (90° di X) setelah induk 90° di Y — urutannya penting.
  const s = Math.SQRT1_2;
  const r = kuaternionDunia(Math.PI / 2, { putar: [s, 0, 0, s] });
  assert.ok(Math.abs(r.x - 0.5) < 1e-12 && Math.abs(r.y - 0.5) < 1e-12 && Math.abs(r.z + 0.5) < 1e-12 && Math.abs(r.w - 0.5) < 1e-12, JSON.stringify(r));
});

// ── Diam ─────────────────────────────────────────────────────────────
test('diam 10 detik: tidak tenggelam, tidak hanyut, tidak bergetar', async () => {
  const f = await duniaDatar();
  const k = buatKarakter(f, { x: 1, y: 0, z: 2 });
  const posisi = [];
  for (let i = 0; i < 600; i++) posisi.push(langkahKarakter(k, { dt: 1 / 60 }).kaki);
  const akhir = posisi.at(-1);
  assert.ok(Math.abs(akhir.x - 1) < 1e-3 && Math.abs(akhir.z - 2) < 1e-3, `hanyut: ${JSON.stringify(akhir)}`);
  assert.ok(Math.abs(akhir.y) < 0.05, `tidak di tanah: y=${akhir.y}`);
  // Getar: pada detik terakhir, y tidak boleh naik-turun lebih dari 1 mm.
  const ys = posisi.slice(-60).map((p) => p.y);
  assert.ok(Math.max(...ys) - Math.min(...ys) < 1e-3, `bergetar: rentang y ${Math.max(...ys) - Math.min(...ys)}`);
});

// ── Tertahan ─────────────────────────────────────────────────────────
test('berjalan ke dinding: tertahan di permukaannya, bukan menembus', async () => {
  const f = await duniaDatar();
  // Dinding tebal 0,4 dengan permukaan di x = 3.
  f.daftarkan('uji', [{ bentuk: 'kotak', ukuran: [0.4, 3, 10] }], { x: 3.2, y: 1.5, z: 0 });
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  const h = jalanKarakter(k, { detik: 3, arah: [1, 0] });
  const batas = 3 - JARI;
  assert.ok(h.kaki.x <= batas + 0.05, `menembus: x=${h.kaki.x}, batas ${batas}`);
  assert.ok(h.kaki.x > batas - 0.1, `berhenti terlalu jauh dari dinding: x=${h.kaki.x}`);
});

test('collider yang BARU didaftarkan langsung terlihat, tanpa menunggu step', async () => {
  // Rapier 0.20: collider baru tidak terlihat query sampai world.step()
  // berikutnya. Tanpa Fisika.segarkan(), uji ruang di titik yang baru saja
  // diberi dinding menjawab "bebas" — dan pemain didirikan di dalam dinding.
  const f = await duniaDatar();
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  jalanKarakter(k, { detik: 0.1 });
  assert.equal(ruangBebas(k, { x: 5, z: 0 }).bebas, true);
  f.daftarkan('baru', [{ bentuk: 'kotak', ukuran: [1, 2, 1] }], { x: 5, y: 1, z: 0 });
  assert.equal(ruangBebas(k, { x: 5, z: 0 }).bebas, false, 'dinding baru tidak terlihat oleh uji ruang');
});

test('tidak tembus di dt TERBURUK — bingkai 2 detik dan langkah 2 detik', async () => {
  const f = await duniaDatar();
  // Dinding tipis 0,1 m. Tanpa penjepit, satu bingkai 2 detik memindahkan
  // pemain 10,8 m dalam satu langkah.
  f.daftarkan('uji', [{ bentuk: 'kotak', ukuran: [0.1, 3, 10] }], { x: 2, y: 1.5, z: 0 });
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  for (let i = 0; i < 20; i++) langkahKarakter(k, { dt: 2, arah: [1, 0] });
  assert.ok(kakiKarakter(k).x < 2, `tembus dinding tipis (langkah): x=${kakiKarakter(k).x}`);

  const k2 = buatKarakter(f, { x: 0, y: 0, z: 3 });
  const h = majukanKarakter(k2, 2, [1, 0]);
  // Bingkai macet 2 detik = paling banyak 5 langkah, sisanya DIBUANG.
  assert.ok(h.langkah <= 5, `bingkai macet menjalankan ${h.langkah} langkah`);
  assert.ok(kakiKarakter(k2).x <= 5 * KECEPATAN / 60 + 1e-3, // Rapier float32
    `bingkai macet memindahkan terlalu jauh: x=${kakiKarakter(k2).x}`);
  for (let i = 0; i < 30; i++) majukanKarakter(k2, 2, [1, 0]);
  assert.ok(kakiKarakter(k2).x < 2, `tembus dinding tipis (bingkai): x=${kakiKarakter(k2).x}`);
});

// ── Jam: laju bingkai tidak boleh mengubah kecepatan ─────────────────
test('jarak per detik sama di 30, 60, 120, dan 144 fps', async () => {
  const jarak = {};
  for (const fps of [30, 60, 120, 144]) {
    const f = await duniaDatar();
    const k = buatKarakter(f, { x: -15, y: 0, z: 0 });
    for (let i = 0; i < fps * 2; i++) majukanKarakter(k, 1 / fps, [1, 0]);
    jarak[fps] = kakiKarakter(k).x + 15;
  }
  const harapan = 2 * KECEPATAN;
  for (const [fps, d] of Object.entries(jarak)) {
    // Toleransi SATU langkah: akumulasi pecahan float boleh bergeser satu langkah.
    assert.ok(Math.abs(d - harapan) <= KECEPATAN / 60 + 1e-6, `${fps} fps menempuh ${d.toFixed(3)} m, harapan ${harapan}`);
  }
});

test('di layar 120 Hz, posisi yang DIGAMBAR maju tiap bingkai (interpolasi)', async () => {
  // Tanpa interpolasi, fisika 60 Hz di layar 120 Hz membuat separuh bingkai
  // menggambar posisi yang sama — terasa tersendat walau kecepatannya benar.
  const f = await duniaDatar();
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  for (let i = 0; i < 10; i++) majukanKarakter(k, 1 / 120, [1, 0]);
  let diam = 0;
  let lalu = majukanKarakter(k, 1 / 120, [1, 0]).kaki.x;
  for (let i = 0; i < 120; i++) {
    const x = majukanKarakter(k, 1 / 120, [1, 0]).kaki.x;
    if (x - lalu < 1e-6) diam++;
    lalu = x;
  }
  assert.equal(diam, 0, `${diam} dari 120 bingkai menggambar posisi yang sama`);
});

// ── Celah: ukuran kapsul yang dirasakan pemain ────────────────────────
test('celah 0,80 m tertahan, celah 0,90 m lolos (kapsul 0,80 + offset 0,02)', async () => {
  const lewat = async (celah) => {
    const f = await duniaDatar();
    // Dua blok mengapit lorong selebar `celah` di z = 0, sejajar sumbu X.
    const tebal = 2;
    f.daftarkan('lorong', [
      { bentuk: 'kotak', ukuran: [1, 2, tebal], letak: [0, 1, celah / 2 + tebal / 2] },
      { bentuk: 'kotak', ukuran: [1, 2, tebal], letak: [0, 1, -(celah / 2 + tebal / 2)] },
    ], { x: 3, y: 0, z: 0 });
    const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
    return jalanKarakter(k, { detik: 2, arah: [1, 0] }).kaki.x > 4;
  };
  assert.equal(await lewat(0.80), false, 'lolos celah 0,80 m — kapsulnya lebih kecil dari yang diklaim');
  assert.equal(await lewat(0.90), true, 'tertahan di celah 0,90 m — kapsulnya lebih besar dari yang diklaim');
});

// ── Meluncur (move_and_slide) ────────────────────────────────────────
test('menabrak dinding secara miring tetap MELUNCUR sepanjang dinding', async () => {
  const f = await duniaDatar();
  // Dinding sejajar sumbu Z, permukaan di x = 2.
  f.daftarkan('uji', [{ bentuk: 'kotak', ukuran: [0.4, 3, 40] }], { x: 2.2, y: 1.5, z: 0 });
  const k = buatKarakter(f, { x: 1.5, y: 0, z: 0 });
  const awal = kakiKarakter(k);
  const h = jalanKarakter(k, { detik: 1, arah: [1, 1] });
  // Komponen menuju dinding tertahan, komponen sepanjang dinding tetap jalan.
  assert.ok(h.kaki.x <= 2 - JARI + 0.05, `menembus: x=${h.kaki.x}`);
  const majuZ = h.kaki.z - awal.z;
  // Arah [1,1] dinormalkan → komponen z = kecepatan/√2 per detik.
  const harapan = KECEPATAN / Math.SQRT2;
  assert.ok(majuZ > harapan * 0.8, `lengket, bukan meluncur: maju z ${majuZ.toFixed(2)} m, harapan ≈ ${harapan.toFixed(2)}`);
});

// ── Pohon: batang menahan, kanopi tidak ──────────────────────────────
test('batang pohon tidak pernah ditembus, dan kanopinya tidak menabrak', async () => {
  const f = await duniaDatar();
  // Silinder batang diameter 0,6 — BUKAN kotak batas kanopi selebar 5 m.
  f.daftarkan('uji', [{ bentuk: 'silinder', ukuran: [0.6, 4, 0.6] }], { x: 0, y: 2, z: 0 });
  const k = buatKarakter(f, { x: -3, y: 0, z: 0 });

  // Uji versi pertama mengharapkan pemain BERHENTI di depan batang, dan gagal:
  // pemain menabrak di x = −0,72 lalu MELUNCUR MEMUTARI batang dan jalan terus.
  // Itu perilaku move_and_slide yang BENAR untuk rintangan bundar — ujinya
  // yang salah. Yang harus dijaga adalah TIDAK PERNAH MENEMBUS, sepanjang
  // seluruh lintasan, bukan di mana ia berhenti.
  let jarakMin = Infinity;
  for (let i = 0; i < 120; i++) {
    const { kaki } = langkahKarakter(k, { dt: 1 / 60, arah: [1, 0] });
    jarakMin = Math.min(jarakMin, Math.hypot(kaki.x, kaki.z));
  }
  const batas = 0.3 + JARI;
  assert.ok(jarakMin >= batas - 0.03, `menembus batang: jarak minimum ${jarakMin.toFixed(3)} < ${batas}`);
  // Kanopi (jari-jari 2,8) TIDAK didaftarkan sebagai collider: pemain sampai
  // sedekat batas batang, jauh di dalam jari-jari kanopi.
  assert.ok(jarakMin < 1.0, `tertahan jauh dari batang — kanopi ikut menabrak? jarak ${jarakMin.toFixed(3)}`);
  // Dan ia lolos ke sisi lain: rintangan bundar dilewati, bukan jalan buntu.
  assert.ok(kakiKarakter(k).x > 1, `tersangkut di depan batang, tidak meluncur memutarinya: x=${kakiKarakter(k).x}`);
});

// ── Tangga ───────────────────────────────────────────────────────────
test('naik anak tangga rendah, tapi tidak memanjat balok tinggi', async () => {
  const f = await duniaDatar();
  f.daftarkan('uji', [
    { bentuk: 'kotak', ukuran: [4, 0.2, 4] },              // anak tangga 0,20 m di x∈[2,6]
  ], { x: 4, y: 0.1, z: 0 });
  f.daftarkan('uji', [
    { bentuk: 'kotak', ukuran: [4, 0.6, 4] },              // balok 0,60 m di x∈[2,6], z digeser
  ], { x: 4, y: 0.3, z: 10 });

  // Uji versi pertama membaca y SETELAH berjalan 8 m — pemain sudah naik,
  // menyeberang, dan TURUN di ujung jauh anak tangga. Mesinnya benar; yang
  // salah titik bacanya. Sekarang y dibaca SELAMA pemain di atas anak tangga.
  const naik = buatKarakter(f, { x: 0, y: 0, z: 0 });
  let yDiAtas = null;
  for (let i = 0; i < 90; i++) {
    const { kaki } = langkahKarakter(naik, { dt: 1 / 60, arah: [1, 0] });
    if (kaki.x > 3 && kaki.x < 5) yDiAtas = kaki.y;
  }
  assert.ok(yDiAtas !== null, 'tidak pernah sampai ke tengah anak tangga — tersangkut di tepinya');
  assert.ok(Math.abs(yDiAtas - 0.2) < 0.03, `tidak berdiri di atas anak tangga 0,2 m: y=${yDiAtas}`);

  const tahan = buatKarakter(f, { x: 0, y: 0, z: 10 });
  const h2 = jalanKarakter(tahan, { detik: 1.5, arah: [1, 0] });
  assert.ok(h2.kaki.x < 2, `memanjat balok 0,6 m (melebihi naikTangga ${PARAM.naikTangga}): x=${h2.kaki.x}`);
});

// ── Tepi ─────────────────────────────────────────────────────────────
test('cincin tepi menjaga pemain di pulau dan membiarkannya menyusuri tepi', async () => {
  const f = await duniaDatar();
  const JARI_PULAU = 8;
  f.daftarkan('tepi', cincinTepi(JARI_PULAU), { x: 0, y: 0, z: 0 });
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  jalanKarakter(k, { detik: 4, arah: [1, 0] });
  const di = kakiKarakter(k);
  assert.ok(Math.hypot(di.x, di.z) < JARI_PULAU, `lolos dari pulau: r=${Math.hypot(di.x, di.z)}`);
  assert.ok(Math.hypot(di.x, di.z) > JARI_PULAU - JARI - 0.1, `berhenti jauh sebelum tepi: r=${Math.hypot(di.x, di.z)}`);

  // Menyusuri: dorong ke luar + ke samping — harus tetap bergerak di sepanjang tepi.
  const sebelum = kakiKarakter(k);
  jalanKarakter(k, { detik: 1, arah: [1, 1] });
  const sesudah = kakiKarakter(k);
  assert.ok(Math.hypot(sesudah.x - sebelum.x, sesudah.z - sebelum.z) > 1.5, 'lengket di tepi, tidak menyusur');
  assert.ok(Math.hypot(sesudah.x, sesudah.z) < JARI_PULAU, 'lolos dari pulau saat menyusur');

  // Tidak ada celah di sambungan potongan: dorong lurus ke tiap sambungan.
  for (let i = 0; i < 32; i++) {
    const a = ((i + 0.5) / 32) * Math.PI * 2;
    teleportKarakter(k, { x: 0, y: 0, z: 0 });
    jalanKarakter(k, { detik: 2, arah: [Math.sin(a), Math.cos(a)] });
    const p = kakiKarakter(k);
    assert.ok(Math.hypot(p.x, p.z) < JARI_PULAU, `lolos lewat sambungan ${i}: r=${Math.hypot(p.x, p.z).toFixed(3)}`);
  }
});

test('dinding persegi menahan pemain di area jalan Spot', async () => {
  const f = await duniaDatar();
  f.daftarkan('spot', dindingPersegi(6, 20), { x: 0, y: 0, z: 0 });
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  for (const arah of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) {
    teleportKarakter(k, { x: 0, y: 0, z: 0 });
    jalanKarakter(k, { detik: 4, arah });
    const p = kakiKarakter(k);
    assert.ok(Math.abs(p.x) < 3 && Math.abs(p.z) < 10, `lolos dari area ${JSON.stringify(arah)}: ${JSON.stringify(p)}`);
  }
});

// ── Duduk, berdiri, dan ruang bebas ─────────────────────────────────
test('duduk mematikan kapsul; berdiri memilih calon PERTAMA yang muat', async () => {
  const f = await duniaDatar();
  // Dingklik di (0,0); tembok tepat di belakang calon pertama.
  f.daftarkan('meja', [{ bentuk: 'kotak', ukuran: [0.3, 0.4, 0.3], letak: [0, 0.2, 0] }], { x: 0, y: 0, z: 0 });
  f.daftarkan('tembok', [{ bentuk: 'kotak', ukuran: [3, 2, 0.4], letak: [0, 1, 0.9] }], { x: 0, y: 0, z: 0 });
  const k = buatKarakter(f, { x: 0, y: 0, z: -3 });
  nonaktifkanKarakter(k);
  assert.equal(k.collider.isEnabled(), false);
  // Selama duduk langkah tidak menggerakkan apa pun.
  const sebelum = kakiKarakter(k);
  jalanKarakter(k, { detik: 1, arah: [1, 0] });
  assert.deepEqual(kakiKarakter(k), sebelum);

  const calon = [{ x: 0, z: 0 }, { x: 0, z: 0.62 }, { x: 0.62, z: 0 }];
  const titik = cariTempatBerdiri(k, calon);
  // (0,0) di dalam dingklik, (0,0.62) menembus tembok → yang dipakai (0.62,0).
  assert.ok(titik && Math.abs(titik.x - 0.62) < 1e-9 && titik.z === 0, JSON.stringify(titik));
  aktifkanKarakter(k, titik);
  assert.equal(k.collider.isEnabled(), true);
  langkahKarakter(k, { dt: 1 / 60 });
  assert.ok(Math.abs(kakiKarakter(k).x - 0.62) < 1e-3);
});

test('berdiri: kalau semua calon terhalang, jawabannya null — bukan titik di dalam tembok', async () => {
  const f = await duniaDatar();
  // Kotak tertutup 1,2 × 1,2 mengurung kursi.
  f.daftarkan('kurung', dindingPersegi(1.0, 1.0, { tebal: 0.4 }), { x: 0, y: 0, z: 0 });
  const k = buatKarakter(f, { x: 5, y: 0, z: 5 });
  const calon = [0.62, 0.92].flatMap((d) => [[d, 0], [-d, 0], [0, d], [0, -d]].map(([x, z]) => ({ x, z })));
  assert.equal(cariTempatBerdiri(k, calon), null);
});

test('ruang bebas menolak titik tanpa tanah (tepi pulau, jurang)', async () => {
  const f = new Fisika({ muatRapier });
  await f.muat();
  f.daftarkan('pulau', [{ bentuk: 'silinder', ukuran: [10, 1, 10] }], { x: 0, y: -0.5, z: 0 });
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  assert.equal(ruangBebas(k, { x: 2, z: 0 }).bebas, true);
  const luar = ruangBebas(k, { x: 8, z: 0 });
  assert.equal(luar.bebas, false);
  assert.equal(luar.sebab, 'tanpa-tanah');
});

test('menyambung saat pemain berdiri DI DALAM batang: titik bebas terdekat ditemukan', async () => {
  // Gerak lama menembus apa saja; fisika bisa menyambung saat pemain ada di
  // dalam pohon. Pengendali Rapier tidak mendepenetrasi sendiri.
  const f = await duniaDatar();
  f.daftarkan('pohon', [{ bentuk: 'silinder', ukuran: [0.95, 4, 0.95], letak: [0, 2, 0] }], { x: 0, y: 0, z: 0 });
  const k = buatKarakter(f, { x: 0.1, y: 0, z: 0 });
  assert.equal(ruangBebas(k, { x: 0.1, z: 0 }).bebas, false);
  const titik = cariTempatBerdiri(k, calonMelingkar({ x: 0.1, z: 0 }));
  assert.ok(titik, 'tidak ada titik bebas di sekitar batang');
  const r = Math.hypot(titik.x, titik.z);
  assert.ok(r >= 0.475 + JARI - 0.03 && r < 0.475 + JARI + 0.35, `titik bebas terlalu jauh / terlalu dekat: r=${r.toFixed(3)}`);
});

// ── Antrean & kepemilikan ────────────────────────────────────────────
test('collider yang didaftarkan SEBELUM mesin siap tetap terpasang', async () => {
  const f = new Fisika({ muatRapier });
  // Didaftarkan dulu — seperti prop yang dibangun sebelum fisika selesai dimuat.
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [80, 1, 80] }], { x: 0, y: -0.5, z: 0 });
  f.daftarkan('uji', [{ bentuk: 'kotak', ukuran: [0.4, 3, 10] }], { x: 3.2, y: 1.5, z: 0 });
  assert.equal(f.siap, false);
  await f.muat();
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  const h = jalanKarakter(k, { detik: 3, arah: [1, 0] });
  assert.ok(h.kaki.x <= 3 - JARI + 0.05, `collider antrean tidak terpasang: x=${h.kaki.x}`);
});

test('melepas satu kelompok hanya melepas milik kelompok itu, dan dunia kembali ke garis dasar', async () => {
  const f = await duniaDatar();
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  const dasar = f.jumlahDiDunia();
  // Tiga kali pindah Spot: jumlah collider harus kembali ke garis dasar.
  for (let putaran = 0; putaran < 3; putaran++) {
    f.daftarkan('spot', [{ bentuk: 'kotak', ukuran: [0.4, 3, 10] }], { x: 3.2, y: 1.5, z: 0 });
    f.daftarkan('spot', cincinTepi(12), { x: 0, y: 0, z: 0 });
    assert.equal(f.jumlahDiDunia(), dasar + 33);
    assert.equal(f.lepasKelompok('spot'), 33);
    assert.equal(f.jumlahDiDunia(), dasar, `collider sisa setelah pindah Spot ke-${putaran + 1}`);
  }
  f.daftarkan('oola', [{ bentuk: 'kotak', ukuran: [0.4, 3, 10] }], { x: -3.2, y: 1.5, z: 0 });
  assert.deepEqual(Object.keys(f.hitung()).sort(), ['lantai', 'oola']);

  // Dinding Spot sudah hilang: berjalan ke +x lewat.
  assert.ok(jalanKarakter(k, { detik: 1.5, arah: [1, 0] }).kaki.x > 4, 'collider Spot lama masih ada');
  // Dinding Oola masih ada: berjalan ke −x tertahan.
  teleportKarakter(k, { x: 0, y: 0, z: 0 });
  assert.ok(jalanKarakter(k, { detik: 3, arah: [-1, 0] }).kaki.x >= -3 + JARI - 0.05, 'collider kelompok lain ikut terlepas');
});

test('teleport memindahkan kaki dan membuang momentum jatuh', async () => {
  const f = await duniaDatar();
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  k.vY = -30;
  teleportKarakter(k, { x: 5, y: 0, z: -4 });
  assert.equal(k.vY, 0);
  langkahKarakter(k, { dt: 1 / 60 });
  const kaki = kakiKarakter(k);
  assert.ok(Math.abs(kaki.x - 5) < 1e-3 && Math.abs(kaki.z + 4) < 1e-3, JSON.stringify(kaki));
});

test('muat yang gagal tercatat, dan tidak meninggalkan dunia setengah jadi', async () => {
  const f = new Fisika({ muatRapier: () => Promise.reject(new Error('jaringan putus')) });
  f.daftarkan('oola', [{ bentuk: 'kotak', ukuran: 1 }], { x: 0, y: 0, z: 0 });
  await assert.rejects(f.muat(), /jaringan putus/);
  assert.equal(f.siap, false);
  assert.match(String(f.gagal), /jaringan putus/);
  assert.equal(f.tanahDi(0, 0), null);
  assert.equal(f.jumlahDiDunia(), 0);
});
