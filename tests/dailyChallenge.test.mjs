import test from 'node:test';
import assert from 'node:assert/strict';

// localStorage tidak ada di Node. Kelasnya sengaja menelan kegagalan storage
// (tab privat, storage penuh), jadi ia harus tetap jalan tanpa itu — dan
// justru itu yang diuji di sini.
const { DailyChallenge, TANTANGAN, tantanganHariIni, hariIni } =
  await import('../src/data/dailyChallenge.js');

test('tantangan ditentukan tanggal, bukan acak — semua orang dapat yang sama', () => {
  // Tanggal sama -> tantangan sama, dipanggil berapa kali pun.
  const a = tantanganHariIni('2026-09-10');
  const b = tantanganHariIni('2026-09-10');
  assert.equal(a.id, b.id);
  // Tanggal berbeda dalam satu putaran -> tantangan berbeda.
  const seminggu = ['2026-09-10','2026-09-11','2026-09-12','2026-09-13','2026-09-14']
    .map((d) => tantanganHariIni(d).id);
  assert.equal(new Set(seminggu).size, TANTANGAN.length,
    'lima hari berturut harus melewati kelima tantangan');
});

test('hariIni memakai waktu LOKAL, bukan UTC', () => {
  // Jam 23:30 lokal harus tetap tanggal hari itu, bukan besok.
  const malam = new Date(2026, 8, 10, 23, 30);
  assert.equal(hariIni(malam), '2026-09-10');
  const pagi = new Date(2026, 8, 10, 0, 15);
  assert.equal(hariIni(pagi), '2026-09-10');
});

test('kemajuan hanya dihitung untuk tantangan yang sedang aktif', () => {
  const dc = new DailyChallenge();
  const aktif = dc.status().tantangan.id;
  const lain = TANTANGAN.find((t) => t.id !== aktif).id;

  dc.catat(lain, 99);
  assert.equal(dc.status().kemajuan, 0, 'tantangan lain tidak boleh menambah');

  dc.catat(aktif, 1);
  assert.equal(dc.status().kemajuan, 1);
});

test('kunci unik mencegah hal yang sama dihitung dua kali', () => {
  const dc = new DailyChallenge();
  const aktif = dc.status().tantangan.id;

  dc.catat(aktif, 1, 'spot:monas');
  dc.catat(aktif, 1, 'spot:monas');   // Spot yang sama, tidak boleh nambah
  assert.equal(dc.status().kemajuan, 1);

  dc.catat(aktif, 1, 'spot:kuta');
  assert.equal(dc.status().kemajuan, 2);
});

test('runtutan naik sekali saja, walau selesai dilewati berkali-kali', () => {
  const dc = new DailyChallenge();
  const s0 = dc.status();
  for (let i = 0; i < s0.target + 5; i += 1) dc.catat(s0.tantangan.id, 1, `u${i}`);
  const s1 = dc.status();
  assert.equal(s1.selesai, true);
  assert.equal(s1.runtutan, 1, 'kelebihan kemajuan tidak boleh menaikkan runtutan lagi');
  assert.equal(s1.kemajuan, s1.target, 'kemajuan dijepit di target');
});

test('runtutan PUTUS kalau kemarin tidak selesai — itu yang bikin berarti', () => {
  const dc = new DailyChallenge();
  // Selesai hari ini
  const s = dc.status();
  for (let i = 0; i < s.target; i += 1) dc.catat(s.tantangan.id, 1, `a${i}`);
  assert.equal(dc.status().runtutan, 1);

  // Lompat DUA hari: terakhirSelesai bukan kemarin -> runtutan reset.
  const lusa = new Date(Date.now() + 2 * 86400000);
  const p = (n) => String(n).padStart(2, '0');
  dc.data.tanggal = `${lusa.getFullYear()}-${p(lusa.getMonth() + 1)}-${p(lusa.getDate() - 2)}`;
  dc.data.terakhirSelesai = dc.data.tanggal;
  dc.data.tanggal = 'sudah-lewat';
  dc._gulirHari();
  assert.equal(dc.status().runtutan, 0, 'bolong sehari harus mengembalikan runtutan ke nol');
});

test('jalan tanpa localStorage sama sekali (tab privat / Node)', () => {
  // Tidak ada localStorage di Node; kalau kelasnya melempar, test ini gagal.
  const dc = new DailyChallenge();
  assert.ok(dc.status().tantangan.id, 'harus tetap memberi tantangan');
  dc.catat(dc.status().tantangan.id, 1);
  dc.hapus();
  assert.equal(dc.status().kemajuan, 0);
});
