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
test('kursi melingkar rata dan semuanya menghadap pusat meja', () => {
  const m = buat({ kursi: 4 });
  assert.equal(m.kursi.length, 4);

  for (const k of m.kursi) {
    const jarak = Math.hypot(k.x - m.x, k.z - m.z);
    assert.ok(Math.abs(jarak - 1.02) < 1e-6, `jarak ${jarak}`);

    // facing harus menunjuk dari kursi ke pusat.
    const seharusnya = Math.atan2(m.x - k.x, m.z - k.z);
    assert.ok(Math.abs(k.facing - seharusnya) < 1e-9);
  }

  // Jarak antar kursi bersebelahan sama besar.
  const d01 = Math.hypot(m.kursi[0].x - m.kursi[1].x, m.kursi[0].z - m.kursi[1].z);
  const d12 = Math.hypot(m.kursi[1].x - m.kursi[2].x, m.kursi[1].z - m.kursi[2].z);
  assert.ok(Math.abs(d01 - d12) < 1e-9);
});

test('jumlah kursi dijepit di rentang yang masuk akal', () => {
  assert.equal(buat({ kursi: 0 }).jumlahKursi, 2);
  assert.equal(buat({ kursi: 99 }).jumlahKursi, 8);
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
  // bawaan: jarak antar kursi bersebelahan (1,44 m) lebih besar daripada dua
  // kali toleransi kursi (2 x 0,62 = 1,24 m). Kalau suatu saat jariLingkar
  // dikecilkan atau jariKursi dilebarkan tanpa memeriksa ini, satu posisi bisa
  // masuk jangkauan dua kursi dan pemetaannya mulai bergantung pada urutan.
  const m = buat({ kursi: 4 });
  const antar = Math.hypot(m.kursi[0].x - m.kursi[1].x, m.kursi[0].z - m.kursi[1].z);
  assert.ok(antar > 0.62 * 2, `jarak antar kursi ${antar.toFixed(2)} m harus > 1,24`);

  // Konsekuensinya: titik tengah antara dua kursi bukan milik siapa-siapa.
  const a = m.kursi[0], b = m.kursi[1];
  const peta = m.hitungKursi([orang('x', (a.x + b.x) / 2, (a.z + b.z) / 2)]);
  assert.equal(peta.filter(Boolean).length, 0);
});

test('kalau jangkauan MEMANG tumpang tindih, satu orang tetap hanya dapat satu kursi', () => {
  // Meja 8 kursi: jaraknya 0,78 m, lebih kecil dari 2 x 0,62 — jadi ada posisi
  // yang masuk jangkauan dua kursi sekaligus. Di situlah aturan "satu pemain
  // sekali pakai" harus bekerja.
  const m = buat({ kursi: 8 });
  const a = m.kursi[0], b = m.kursi[1];
  const antar = Math.hypot(a.x - b.x, a.z - b.z);
  assert.ok(antar < 0.62 * 2, 'prasyarat uji: jangkauannya memang tumpang tindih');

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

test('kursi yang sudah terisi dilewati', () => {
  const m = buat();
  const terisi = [null, null, null, { kunci: 'lain' }];
  const dekatKursi3 = { x: m.kursi[3].x + 0.1, z: m.kursi[3].z + 0.1 };
  const pilih = m.kursiKosongTerdekat(dekatKursi3, terisi);
  assert.notEqual(pilih.i, 3);
  assert.ok(pilih.i === 0 || pilih.i === 2, `dapat kursi ${pilih.i}`);
});

test('meja penuh mengembalikan null, bukan kursi yang sudah ada orangnya', () => {
  const m = buat();
  const penuh = m.kursi.map((k) => ({ kunci: `p${k.i}` }));
  assert.equal(m.kursiKosongTerdekat({ x: 0, z: 2 }, penuh), null);
});

// ── Radius interaksi ─────────────────────────────────
test('radius interaksi memberi ruang mendekat, tidak hanya menutupi dingklik', () => {
  const m = buat();
  // Harus lebih besar dari lingkar kursi ditambah lebar dingklik, supaya hint
  // sempat terbaca sebagai ajakan sebelum orangnya sampai.
  assert.ok(m.jariInteraksi > 1.02 + 0.19 + 0.5, `jari ${m.jariInteraksi}`);
});
