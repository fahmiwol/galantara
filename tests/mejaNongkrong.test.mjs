// ═══════════════════════════════════════════════════════
// tests/mejaNongkrong.test.mjs
//
// Yang diuji di sini adalah bagian yang TIDAK boleh salah walau tidak ada
// server yang mewasiti: pemetaan pemain ke kursi.
//
// Keterisian meja sengaja tidak memakai state server — ia diturunkan tiap
// klien dari posisi yang memang sudah tersinkron. Itu hanya aman kalau
// aturannya deterministik: masukan yang sama, dalam urutan apa pun, harus
// menghasilkan peta kursi yang sama. Kalau tidak, dua pemain akan melihat
// orang yang sama duduk di kursi berbeda dan tidak akan pernah ada pesan
// error yang memberitahu.
//
// Geometrinya butuh THREE; sisanya murni. Berkas ini sengaja hanya menguji
// yang murni supaya bisa jalan tanpa browser.
// ═══════════════════════════════════════════════════════

import test from 'node:test';
import assert from 'node:assert/strict';
import { MejaNongkrong } from '../src/world/MejaNongkrong.js';

const buat = (opsi = {}) => new MejaNongkrong({ id: 'uji', x: 0, z: 0, ...opsi });
const orang = (kunci, x, z) => ({ kunci, nama: kunci, x, z });

// ── Letak kursi ──────────────────────────────────────
test('kursi mengelilingi daun persegi panjang dan semuanya menghadap pusat', () => {
  const m = buat({ kursi: 4 });
  assert.equal(m.kursi.length, 4);

  for (const k of m.kursi) {
    // facing harus menunjuk dari kursi ke pusat meja — itu yang membuat orang
    // di satu meja berhadapan, bukan sekadar berdiri berdekatan.
    const seharusnya = Math.atan2(m.x - k.x, m.z - k.z);
    assert.ok(Math.abs(k.facing - seharusnya) < 1e-9);

    // Tiap kursi harus di LUAR jejak daun, kalau tidak dingkliknya menembus meja.
    const luarPanjang = Math.abs(k.x - m.x) > 1.10 / 2;
    const luarLebar = Math.abs(k.z - m.z) > 0.72 / 2;
    assert.ok(luarPanjang || luarLebar, `kursi ${k.i} menembus daun meja`);
  }

  // Sengaja TIDAK melingkar rata: dua kursi digeser supaya tidak berbaris
  // presisi. Meja warung tidak pernah rapi.
  const jari = m.kursi.map((k) => Math.hypot(k.x - m.x, k.z - m.z));
  assert.ok(Math.max(...jari) - Math.min(...jari) > 0.05, 'harus tidak rata');
});

test('letak kursi deterministik — dua meja dengan spek sama menghasilkan letak identik', () => {
  // Kalau pergeseran "supaya tidak kaku" memakai angka acak, dua klien akan
  // menempatkan kursi di titik berbeda dan pemetaan duduk ikut berbeda,
  // tanpa satu pun pesan error.
  const a = buat({ kursi: 4, rotasi: 0.7 });
  const b = buat({ kursi: 4, rotasi: 0.7 });
  assert.equal(JSON.stringify(a.kursi), JSON.stringify(b.kursi));
});

test('jumlah kursi dijepit di rentang yang masuk akal', () => {
  assert.equal(buat({ kursi: 0 }).jumlahKursi, 2);
  assert.equal(buat({ kursi: 99 }).jumlahKursi, 8);
});

test('koordinat lokal kursi TIDAK ikut diputar, koordinat dunia ikut', () => {
  // Bug nyata yang pernah terjadi: mesh dingklik ditempatkan memakai koordinat
  // yang sudah diputar, PADAHAL grup mesh-nya sendiri juga sudah diputar —
  // jadi dingkliknya kena rotasi dua kali dan berdiri di tempat yang bukan
  // kursinya. Meja tanpa rotasi tidak akan pernah memperlihatkan ini.
  const lurus = buat({ kursi: 4, rotasi: 0 });
  const miring = buat({ kursi: 4, rotasi: Math.PI / 2 });

  // Lokal harus SAMA — rotasi dibawa oleh grup mesh, bukan oleh angkanya.
  for (let i = 0; i < 4; i++) {
    assert.ok(Math.abs(lurus.kursi[i].lx - miring.kursi[i].lx) < 1e-9, `lx kursi ${i}`);
    assert.ok(Math.abs(lurus.kursi[i].lz - miring.kursi[i].lz) < 1e-9, `lz kursi ${i}`);
  }

  // Dunia harus BERBEDA — di situlah pemain benar-benar didudukkan — dan
  // arahnya harus sama dengan rotasi Three.js, bukan kebalikannya. Rotasi-Y
  // Three: x' = x·cos + z·sin, z' = -x·sin + z·cos. Pada 90°: (lx, lz) → (lz, -lx).
  // Rumus yang terbalik pernah dipakai di sini dan akibatnya letak kursi
  // tercermin terhadap dingklik yang digambar — pemain duduk di SEBELAH bangku.
  const k = miring.kursi[0];
  assert.ok(Math.abs(k.x - lurus.kursi[0].lz) < 1e-9, `x dunia ${k.x} vs ${lurus.kursi[0].lz}`);
  assert.ok(Math.abs(k.z + lurus.kursi[0].lx) < 1e-9, `z dunia ${k.z} vs ${-lurus.kursi[0].lx}`);
});

test('invarian jangkauan kursi berlaku di SEMUA gaya, bukan cuma warung', () => {
  // Ini menangkap bug nyata: pola 2+1+1 meja warung dipakai ulang untuk
  // lesehan membuat dua orang berjarak 0,33 m — lebih sempit daripada badan
  // orang, dan melanggar invarian. Uji yang hanya memeriksa gaya bawaan akan
  // meloloskannya diam-diam, dan akibatnya baru terlihat sebagai "kadang
  // orangnya duduk di kursi yang salah" di layar orang lain.
  for (const [gaya, jumlah] of [['warung', 4], ['lesehan', 3], ['kafe', 2]]) {
    const m = buat({ gaya, kursi: jumlah });
    assert.equal(m.kursi.length, jumlah, `${gaya} harus punya ${jumlah} kursi`);
    assert.ok(
      m.jarakKursiTerdekat > m.toleransiKursi * 2,
      `${gaya}: kursi terdekat ${m.jarakKursiTerdekat.toFixed(3)} m harus > ${(m.toleransiKursi * 2).toFixed(2)} m`,
    );
  }
});

test('badan tidak saling tembus — ambang KEDUA, bukan toleransi kursi', () => {
  // Dua pertanyaan yang berbeda, dan menjaga yang pertama saja tidak cukup:
  //   toleransiKursi * 2  → penetapan kursi tidak ambigu (kebenaran)
  //   lebarBadan          → orangnya tidak saling tembus (tampilan)
  // Bug nyata: tikar lesehan 4 kursi lolos ambang pertama (0,73 > 0,68) tapi
  // gagal yang kedua (0,73 < 0,90), dan tiga avatar chibi tumpang tindih.
  // Tidak ada uji yang menangkapnya sampai terlihat di render.
  for (const [gaya, jumlah] of [['warung', 4], ['lesehan', 3], ['kafe', 2]]) {
    const m = buat({ gaya, kursi: jumlah });
    assert.ok(
      m.jarakKursiTerdekat >= m.lebarBadan,
      `${gaya}: kursi terdekat ${m.jarakKursiTerdekat.toFixed(3)} m harus >= lebar badan ${m.lebarBadan} m`,
    );
  }
});

test('gaya lesehan menaruh semua kursi DI ATAS tikar', () => {
  // Tikar 1,60 x 1,20. Kursi di luar tepinya berarti orang duduk di tanah
  // sebelah tikar, dan tidak ada yang akan melaporkannya sebagai bug.
  const m = buat({ gaya: 'lesehan', kursi: 3 });
  for (const k of m.kursi) {
    assert.ok(Math.abs(k.x - m.x) <= 1.60 / 2, `kursi ${k.i} keluar tepi panjang tikar`);
    assert.ok(Math.abs(k.z - m.z) <= 1.20 / 2, `kursi ${k.i} keluar tepi lebar tikar`);
  }
});

test('tinggi duduk ikut gayanya, bukan satu angka untuk semua', () => {
  // Orang lesehan duduk di lantai; orang di kursi kafe duduk lebih tinggi
  // daripada di dingklik. Satu konstanta global akan salah di dua tempat.
  const tinggi = (gaya, n) => buat({ gaya, kursi: n }).kursi[0].tinggiDuduk;
  const warung = tinggi('warung', 4);
  const lesehan = tinggi('lesehan', 3);
  const kafe = tinggi('kafe', 2);
  assert.ok(lesehan < warung, 'lesehan harus paling rendah');
  assert.ok(kafe > warung, 'kursi kafe harus paling tinggi');
});

// ── Pemetaan kursi ───────────────────────────────────
test('pemain yang berdiri di kursi terhitung menempatinya', () => {
  const m = buat();
  const k = m.kursi[2];
  const peta = m.hitungKursi([orang('a', k.x, k.z)]);
  assert.equal(peta[2]?.kunci, 'a');
  assert.equal(peta.filter(Boolean).length, 1);
});

test('pemain yang cuma lewat di dekat meja tidak terhitung duduk', () => {
  const m = buat();
  // 1,3 m dari pusat: di dalam radius interaksi (2,37) tapi jauh dari kursi
  // mana pun, karena kursi ada di 1,02 dan toleransinya 0,62.
  const peta = m.hitungKursi([orang('a', 0, 1.9)]);
  assert.equal(peta.filter(Boolean).length, 0);
});

test('meja 4 kursi: jangkauan kursi tidak saling tumpang tindih', () => {
  // Invarian yang membuat "duduk di mana" tidak pernah ambigu pada meja
  // bawaan. Sengaja memakai angka yang DIHITUNG modulnya, bukan angka yang
  // ditulis ulang di sini: kalau ukuran meja atau toleransi kursi diubah lagi
  // nanti, uji ini ikut menilai bentuk yang baru, bukan bentuk yang lama.
  const m = buat({ kursi: 4 });
  assert.ok(
    m.jarakKursiTerdekat > m.toleransiKursi * 2,
    `kursi terdekat ${m.jarakKursiTerdekat.toFixed(3)} m harus > ${(m.toleransiKursi * 2).toFixed(2)} m`,
  );

  // Konsekuensinya: titik tengah antara dua kursi bukan milik siapa-siapa.
  const a = m.kursi[0], b = m.kursi[1];
  const peta = m.hitungKursi([orang('x', (a.x + b.x) / 2, (a.z + b.z) / 2)]);
  assert.equal(peta.filter(Boolean).length, 0);
});

test('kalau jangkauan MEMANG tumpang tindih, satu orang tetap hanya dapat satu kursi', () => {
  // Butuh konfigurasi yang jangkauannya benar-benar beririsan. Meja warung
  // 8 kursi TIDAK lagi begitu setelah kursinya direnggangkan demi lebar badan;
  // tikar lesehan 8 kursi masih, karena lingkarnya kecil. Prasyaratnya
  // diperiksa di bawah, jadi uji ini tidak akan pernah lulus secara hampa.
  const m = buat({ gaya: 'lesehan', kursi: 8 });
  const a = m.kursi[0], b = m.kursi[1];
  const antar = Math.hypot(a.x - b.x, a.z - b.z);
  assert.ok(antar < m.toleransiKursi * 2, 'prasyarat uji: jangkauannya memang tumpang tindih');

  const peta = m.hitungKursi([orang('x', (a.x + b.x) / 2, (a.z + b.z) / 2)]);
  assert.equal(peta.filter(Boolean).length, 1, 'hanya satu kursi yang boleh terisi');
});

test('dua orang memperebutkan satu kursi: yang paling dekat menang', () => {
  const m = buat();
  const k = m.kursi[0];
  const peta = m.hitungKursi([
    orang('jauh', k.x + 0.5, k.z),
    orang('dekat', k.x + 0.02, k.z),
  ]);
  assert.equal(peta[0]?.kunci, 'dekat');
  // Yang kalah boleh dapat kursi lain kalau memang cukup dekat, tapi tidak
  // boleh ikut menempati kursi 0.
  assert.notEqual(peta[0]?.kunci, 'jauh');
});

test('urutan masukan tidak mengubah hasil — inilah yang membuat tanpa-server aman', () => {
  const m = buat();
  const pemain = m.kursi.map((k, i) => orang(`p${i}`, k.x + 0.05, k.z - 0.03));
  const lurus = JSON.stringify(m.hitungKursi(pemain));
  const balik = JSON.stringify(m.hitungKursi([...pemain].reverse()));
  const acak = JSON.stringify(m.hitungKursi([pemain[2], pemain[0], pemain[3], pemain[1]]));
  assert.equal(lurus, balik);
  assert.equal(lurus, acak);
});

test('daftar pemain kosong menghasilkan meja kosong, bukan error', () => {
  const m = buat();
  assert.equal(m.hitungKursi([]).filter(Boolean).length, 0);
  assert.equal(m.hitungKursi(null).filter(Boolean).length, 0);
});

// ── Memilih kursi ────────────────────────────────────
test('kursi kosong terdekat dipilih, bukan sembarang yang kosong', () => {
  const m = buat();
  const terisi = [null, null, null, null];
  const dekatKursi3 = { x: m.kursi[3].x + 0.1, z: m.kursi[3].z + 0.1 };
  assert.equal(m.kursiKosongTerdekat(dekatKursi3, terisi).i, 3);
});

test('kursi yang sudah terisi dilewati, dan yang terdekat berikutnya dipilih', () => {
  const m = buat();
  const terisi = [null, null, null, { kunci: 'lain' }];
  const dekatKursi3 = { x: m.kursi[3].x + 0.1, z: m.kursi[3].z + 0.1 };
  const pilih = m.kursiKosongTerdekat(dekatKursi3, terisi);

  assert.notEqual(pilih.i, 3, 'kursi yang ada orangnya tidak boleh dipilih');

  // Indeks yang benar dihitung, bukan dihafal: kalau tata letak kursi diubah
  // lagi, uji ini tetap menilai perilakunya, bukan bentuk yang lama.
  const kosongTerdekat = m.kursi
    .filter((k) => !terisi[k.i])
    .sort((a, b) => Math.hypot(a.x - dekatKursi3.x, a.z - dekatKursi3.z)
                  - Math.hypot(b.x - dekatKursi3.x, b.z - dekatKursi3.z))[0];
  assert.equal(pilih.i, kosongTerdekat.i, `dapat kursi ${pilih.i}, harusnya ${kosongTerdekat.i}`);
});

test('meja penuh mengembalikan null, bukan kursi yang sudah ada orangnya', () => {
  const m = buat();
  const penuh = m.kursi.map((k) => ({ kunci: `p${k.i}` }));
  assert.equal(m.kursiKosongTerdekat({ x: 0, z: 2 }, penuh), null);
});

// ── Radius interaksi ─────────────────────────────────
test('radius interaksi melingkupi seluruh kursi dengan ruang mendekat', () => {
  const m = buat();
  const kursiTerjauh = Math.max(...m.kursi.map((k) => Math.hypot(k.x - m.x, k.z - m.z)));
  // Hint yang baru muncul saat orang sudah berdiri di antara dingklik
  // terlambat untuk jadi ajakan.
  assert.ok(
    m.jariInteraksi > kursiTerjauh + 0.6,
    `jari ${m.jariInteraksi.toFixed(2)} vs kursi terjauh ${kursiTerjauh.toFixed(2)}`,
  );
});
