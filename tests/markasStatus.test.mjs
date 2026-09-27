// ═══════════════════════════════════════════════════════
// tests/markasStatus.test.mjs — status_kerja → place, pose, beacon, desk lamp
//
// Layer 1 of the three-layer status (laporan 3D §6.5): the world shows an
// agent's runtime status by WHERE it is and HOW it stands, plus a beacon on the
// tower that reads from across the island without a PointLight. Every status of
// the runtime contract (SPRINT-01) must map to exactly one place.
// ═══════════════════════════════════════════════════════

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { ukurPohon } = await import('../tools/anggaran-spot.mjs');
const { pusatDunia } = await import('../src/fisika/bentuk.js');
const M = await import('../src/world/markas/index.js');
const { POSE } = await import('../src/world/agen/index.js');

let markas;
beforeEach(() => {
  markas = new M.MarkasPenjelajah();
  markas.bangun();
  M.pasangMarkasAktif(markas);
  M._resetKeadaanMarkas();
});

/** World point → Markas local frame (inverse of pusatDunia). */
function keLokal(t) {
  const { x, z, rotasiY: r } = markas.letak;
  const dx = t.x - x; const dz = t.z - z;
  return { x: dx * Math.cos(r) - dz * Math.sin(r), z: dx * Math.sin(r) + dz * Math.cos(r) };
}

const hex = (c) => c.getHex();
const warnaSuar = () => hex(markas.suar.material.color);
function warnaLampu(i) { const c = new THREE.Color(); markas.lampuMeja.getColorAt(i, c); return c.getHexString(); }
const kodeWarna = (token) => new THREE.Color(M.WARNA_STATUS[token]).getHexString();

test('setiap status_kerja kontrak runtime punya tepat satu tampilan', () => {
  assert.deepEqual(M.STATUS_KERJA, ['siap', 'antre', 'bekerja', 'hasil_siap', 'menunggu_otak', 'gagal']);
  for (const s of M.STATUS_KERJA) {
    const t = M.TAMPILAN_STATUS[s];
    assert.ok(t, `${s} tanpa tampilan`);
    assert.ok(POSE[t.pose], `${s}: pose "${t.pose}" tidak ada di agen/pose.js`);
  }
  assert.equal(M.tampilkanStatus, M.tampilkanStatus3D, 'nama SPRINT-01 harus fungsi yang sama');
});

test('bekerja → di titik kerja mejanya, pose bekerja; antre → meja yang sama, pose menunggu', () => {
  const kerja = M.titikKerja();
  const a = M.tampilkanStatus3D('sari', 'antre');
  assert.equal(a.slot, 0);
  assert.deepEqual(a.titik, kerja[0]);
  assert.equal(a.pose, 'menunggu');
  const b = M.tampilkanStatus3D('sari', 'bekerja');
  assert.deepEqual(b.titik, kerja[0], 'agen pindah meja di tengah misi');
  assert.equal(b.pose, 'bekerja');
});

test('hasil_siap → berdiri di Papan Hasil menghadap pelataran', () => {
  const r = M.tampilkanStatus3D('sari', 'hasil_siap');
  assert.equal(r.pose, 'lapor');
  const l = keLokal(r.titik);
  const P = M.PAPAN_HASIL;
  for (let i = 1; i <= 4; i++) {
    const t = M.TITIK[`hasil_${i}`];
    assert.ok(Math.hypot(t.x - P.x, t.z - P.z) <= 2.5, `hasil_${i} terlalu jauh dari Papan Hasil`);
  }
  assert.ok(Math.abs(l.x - M.TITIK.hasil_1.x) < 1e-9 && Math.abs(l.z - M.TITIK.hasil_1.z) < 1e-9);
  assert.ok(Math.abs(r.titik.arah - markas.letak.rotasiY) < 1e-9, 'tidak menghadap pelataran');
});

test('gagal → duduk di bangku (dua pertama), lalu di undak; tiap kursi punya titik dekat', () => {
  const nama = ['sari', 'budi', 'maya', 'dewi'];
  const hasil = nama.map((n) => M.tampilkanStatus3D(n, 'gagal'));
  hasil.forEach((r) => {
    assert.equal(r.pose, 'lesu');
    assert.equal(r.titik.duduk, true);
    assert.ok(r.titik.dekat && Number.isFinite(r.titik.dekat.x), 'kursi tanpa titik dekat (dunia)');
  });
  const B = M.BANGKU;
  for (const r of hasil.slice(0, 2)) {
    const l = keLokal(r.titik);
    assert.ok(Math.abs(l.x - B.x) <= B.panjang / 2 && Math.abs(l.z - B.z) <= B.dalam / 2, `bukan di bangku: ${JSON.stringify(l)}`);
    assert.ok(Math.abs(r.titik.y - (M.Y_ALAS + 0.42)) < 1e-9, 'tidak setinggi dudukan bangku');
  }
  // Empat agen gagal = empat tempat duduk berbeda.
  const kunci = new Set(hasil.map((r) => `${r.titik.x.toFixed(3)},${r.titik.z.toFixed(3)}`));
  assert.equal(kunci.size, 4);
});

test('menunggu_otak → keluar ke depan Markas, di tanah, menghadap pemain', () => {
  const r = M.tampilkanStatus3D('sari', 'menunggu_otak');
  assert.equal(r.pose, 'tanya');
  const l = keLokal(r.titik);
  assert.ok(l.z > 5.0, `masih di pelataran (z lokal ${l.z.toFixed(2)})`);
  assert.equal(r.titik.y, 0);
});

test('siap → tidak ada titik Markas (mengikuti pemain / berkeliling), dan mejanya dilepas', () => {
  M.tampilkanStatus3D('sari', 'bekerja');
  const r = M.tampilkanStatus3D('sari', 'siap');
  assert.equal(r.titik, null);
  assert.equal(r.slot, null);
  assert.equal(r.pose, 'bebas');
  assert.equal(M.tampilkanStatus3D('budi', 'bekerja').slot, 0, 'meja Sari tidak dilepas');
});

test('meja tetap per agen: minta perbaiki kembali ke meja yang sama; dua agen dua meja; slot bisa dipatok', () => {
  assert.equal(M.tampilkanStatus3D('sari', 'bekerja').slot, 0);
  assert.equal(M.tampilkanStatus3D('budi', 'bekerja').slot, 1);
  assert.equal(M.tampilkanStatus3D('sari', 'hasil_siap').slot, 0);
  assert.equal(M.tampilkanStatus3D('sari', 'bekerja').slot, 0);
  assert.equal(M.tampilkanStatus3D('maya', 'antre', { slot: 3 }).slot, 3);
  assert.equal(M.tampilkanStatus3D('dewi', 'antre', { slot: 1 }).slot, 2, 'slot yang dipakai agen lain diambil alih');
  const peringatan = console.warn; const pesan = [];
  console.warn = (m) => pesan.push(m);
  try {
    const r = M.tampilkanStatus3D('dev', 'bekerja');
    assert.equal(r.titik, null, 'agen ke-5 diberi meja yang tidak ada');
    assert.match(pesan.join(' '), /meja terpakai/);
  } finally { console.warn = peringatan; }
});

test('status tak dikenal ditolak dengan pesan yang menyebut pilihannya', () => {
  assert.throws(() => M.tampilkanStatus3D('sari', 'selesai'), /status_kerja tidak dikenal: "selesai".*siap, antre, bekerja/);
  assert.throws(() => M.tampilkanStatus3D('', 'bekerja'), /npcId/);
});

test('suar menara: prioritas "perlu tindakanmu" di atas yang lain, gelap tanpa agen', () => {
  assert.equal(warnaSuar(), M.WARNA_STATUS.mati);
  M.tampilkanStatus3D('budi', 'antre');
  assert.equal(warnaSuar(), M.WARNA_STATUS.siaga);
  M.tampilkanStatus3D('sari', 'bekerja');
  assert.equal(warnaSuar(), M.WARNA_STATUS.kerja);
  M.tampilkanStatus3D('maya', 'gagal');
  assert.equal(warnaSuar(), M.WARNA_STATUS.gagal);
  M.tampilkanStatus3D('dewi', 'menunggu_otak');
  assert.equal(warnaSuar(), M.WARNA_STATUS.perlu);
  M.tampilkanStatus3D('sari', 'hasil_siap');
  assert.equal(warnaSuar(), M.WARNA_STATUS.perlu);
  assert.equal(M.keadaanMarkas().statusSuar(), 'hasil_siap');
  for (const n of ['sari', 'budi', 'maya', 'dewi']) M.tampilkanStatus3D(n, 'siap');
  assert.equal(warnaSuar(), M.WARNA_STATUS.mati);
});

test('lampu meja: tiap meja menyala warna status agennya, padam bila kosong', () => {
  M.tampilkanStatus3D('sari', 'bekerja');
  M.tampilkanStatus3D('budi', 'hasil_siap');
  assert.equal(warnaLampu(0), kodeWarna('kerja'));
  assert.equal(warnaLampu(1), kodeWarna('perlu'));
  assert.equal(warnaLampu(2), kodeWarna('mati'));
  assert.equal(warnaLampu(3), kodeWarna('mati'));
  M.lepasAgenMarkas('sari');
  assert.equal(warnaLampu(0), kodeWarna('mati'));
});

test('suar berdenyut SEKALI saat berganti keadaan, lalu diam; tanpa gerak bila prefers-reduced-motion', () => {
  markas.animate(10);
  M.tampilkanStatus3D('sari', 'bekerja');
  markas.animate(10.2);
  assert.ok(markas.suar.scale.x > 1.05, 'tidak ada denyut saat berganti keadaan');
  markas.animate(12);
  assert.equal(markas.suar.scale.x, 1);
  markas.animate(30);
  assert.equal(markas.suar.scale.x, 1, 'denyut tanpa henti (Desain §9.4 melarangnya)');
  // Keadaan suar sama → tidak berdenyut lagi.
  M.tampilkanStatus3D('budi', 'bekerja');
  markas.animate(30.2);
  assert.equal(markas.suar.scale.x, 1);
  const asli = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: true });
  try {
    M.tampilkanStatus3D('sari', 'gagal');
    markas.animate(40.2);
    assert.equal(markas.suar.scale.x, 1, 'bergerak walau pengguna meminta gerak dikurangi');
  } finally { globalThis.matchMedia = asli; }
});

test('status tidak pernah menambah PointLight, draw call, atau kaster', () => {
  const awal = ukurPohon(markas.root);
  for (const [n, s] of [['sari', 'bekerja'], ['budi', 'gagal'], ['maya', 'hasil_siap'], ['dewi', 'menunggu_otak']]) M.tampilkanStatus3D(n, s);
  const akhir = ukurPohon(markas.root);
  assert.equal(akhir.lampu, 0);
  assert.equal(akhir.drawCall, awal.drawCall);
  assert.equal(akhir.kaster, awal.kaster);
});

test('keadaan bertahan saat Markas dibangun ulang (pindah Spot lalu kembali)', () => {
  M.tampilkanStatus3D('sari', 'hasil_siap');
  M.lepasMarkas(markas);
  assert.equal(M.markasAktif(), null);
  // Status tetap bisa ditampilkan saat Markas tidak terpasang; titiknya dari letak peta.
  const r = M.tampilkanStatus3D('budi', 'bekerja');
  const harap = pusatDunia(M.LETAK_MARKAS, M.LETAK_MARKAS.rotasiY, [M.TITIK.meja_2.x, M.Y_ALAS, M.TITIK.meja_2.z]);
  assert.ok(Math.abs(r.titik.x - harap.x) < 1e-9 && Math.abs(r.titik.z - harap.z) < 1e-9);
  const baru = new M.MarkasPenjelajah();
  baru.bangun();
  M.pasangMarkasAktif(baru);
  assert.equal(hex(baru.suar.material.color), M.WARNA_STATUS.perlu);
  const c = new THREE.Color(); baru.lampuMeja.getColorAt(1, c);
  assert.equal(c.getHexString(), kodeWarna('kerja'));
});
