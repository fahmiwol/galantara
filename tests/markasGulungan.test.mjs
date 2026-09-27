// ═══════════════════════════════════════════════════════
// tests/markasGulungan.test.mjs — 1 approved result = 1 scroll on the Papan Hasil
//
// "Hasil nyata terlihat di dunia" (laporan 3D §6.9) only means something if the
// scrolls are bound to data: never more scrolls than results, never a result
// without its scroll while there is room, and a board of fixed size (one
// InstancedMesh, capacity 18) that never overflows or silently overwrites.
// ═══════════════════════════════════════════════════════

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { ukurPohon } = await import('../tools/anggaran-spot.mjs');
const M = await import('../src/world/markas/index.js');

let markas;
beforeEach(() => {
  markas = new M.MarkasPenjelajah();
  markas.bangun();
  M.pasangMarkasAktif(markas);
  M._resetKeadaanMarkas();
});

const jumlahTampil = () => (markas.gulungan.visible ? markas.gulungan.count : 0);
function warnaSlot(k) { const c = new THREE.Color(); markas.gulungan.getColorAt(k, c); return c.getHex(); }
const idTampil = () => M.keadaanMarkas().gulunganTampil().map((g) => g.id);

test('papan kosong: tidak ada gulungan dan tidak ada draw call untuknya', () => {
  assert.equal(jumlahTampil(), 0);
  assert.equal(markas.gulungan.visible, false);
  const u = ukurPohon(markas.root);
  markas.root.remove(markas.gulungan);
  const tanpa = ukurPohon(markas.root);
  markas.root.add(markas.gulungan);
  assert.equal(u.drawCall, tanpa.drawCall, 'gulungan kosong masih memakan draw call');
});

test('satu hasil disetujui = satu gulungan; hasil yang sama dua kali tetap satu', () => {
  const r = M.tambahGulungan('misi_1');
  assert.deepEqual(r, { ok: true, baru: true, tampil: true, slot: 0, jumlah: 1 });
  assert.equal(jumlahTampil(), 1);
  // Polling mengirim hasil yang sama berulang kali.
  const lagi = M.tambahGulungan({ id: 'misi_1', ringkasan: 'objek misi juga diterima' });
  assert.equal(lagi.baru, false);
  assert.equal(jumlahTampil(), 1);
  M.tambahGulungan('misi_2');
  assert.equal(jumlahTampil(), 2);
});

test('buang: tepat satu gulungan hilang; id yang tidak ada tidak mengubah apa pun', () => {
  ['a', 'b', 'c'].forEach((id) => M.tambahGulungan(id));
  assert.deepEqual(M.buangGulungan('b'), { ok: true, jumlah: 2 });
  assert.equal(jumlahTampil(), 2);
  assert.deepEqual(idTampil().sort(), ['a', 'c']);
  assert.deepEqual(M.buangGulungan('tidak-ada'), { ok: false, jumlah: 2 });
  assert.equal(jumlahTampil(), 2);
});

test('kapasitas papan 18: lebih dari itu tidak meluap, yang tampil tetap terikat data', () => {
  assert.equal(M.KAPASITAS_GULUNGAN, 18);
  assert.equal(markas.gulungan.instanceMatrix.count, 18);
  for (let i = 0; i < 25; i++) M.tambahGulungan(`h${i}`);
  assert.equal(jumlahTampil(), 18);
  assert.equal(M.keadaanMarkas().gulungan.length, 25, 'data hasil hilang hanya karena papan penuh');
  // Yang terbaru yang tampil (semua belum dibaca).
  assert.deepEqual(idTampil(), Array.from({ length: 18 }, (_, i) => `h${24 - i}`));
  const r = M.tambahGulungan('h25');
  assert.equal(r.tampil, true);
  assert.equal(jumlahTampil(), 18);
  // Membuang yang tampil memunculkan yang lebih lama — bukan slot kosong.
  M.buangGulungan('h25');
  M.buangGulungan('h24');
  assert.equal(jumlahTampil(), 18);
  assert.ok(idTampil().includes('h6'));
  assert.ok(!idTampil().includes('h5'));
});

test('belum dibaca = emas di baris atas; sesudah dibaca = kertas dan turun', () => {
  M.tambahGulungan('lama');
  M.tambahGulungan('baru');
  assert.equal(warnaSlot(0), M.WARNA_GULUNGAN.baru);
  M.tandaiGulunganDibaca('baru');
  assert.deepEqual(idTampil(), ['lama', 'baru']);
  assert.equal(warnaSlot(0), M.WARNA_GULUNGAN.baru);
  assert.equal(warnaSlot(1), M.WARNA_GULUNGAN.dibaca);
  assert.equal(M.tandaiGulunganDibaca('tidak-ada'), false);
});

test('id hasil wajib, dengan pesan yang bisa ditindaklanjuti', () => {
  assert.throws(() => M.tambahGulungan(''), /id hasil/);
  assert.throws(() => M.tambahGulungan({}), /id hasil/);
  assert.throws(() => M.buangGulungan(null), /id hasil/);
});

test('setiap slot gulungan menempel di muka Papan Hasil, sejajar arah papan, tidak saling tumpuk', () => {
  const P = M.PAPAN_HASIL;
  const { pusat, normal, atas } = M.papanHasil();
  const samping = new THREE.Vector3().crossVectors(atas, normal).normalize();
  const m = new THREE.Matrix4(); const p = new THREE.Vector3(); const q = new THREE.Quaternion(); const s = new THREE.Vector3();
  const titik = [];
  for (let k = 0; k < M.KAPASITAS_GULUNGAN; k++) {
    M.matriksSlotGulungan(k, m).decompose(p, q, s);
    const d = p.clone().sub(pusat);
    const u = d.dot(samping); const v = d.dot(atas); const n = d.dot(normal);
    // Gulungan setinggi 0,22 harus utuh di dalam muka papan, sedikit di depannya.
    assert.ok(Math.abs(u) <= P.lebar / 2 - 0.05, `slot ${k} keluar dari lebar papan (u ${u.toFixed(2)})`);
    assert.ok(Math.abs(v) + 0.11 <= P.tinggi / 2, `slot ${k} keluar dari tinggi papan (v ${v.toFixed(2)})`);
    assert.ok(n > 0.02 && n < 0.1, `slot ${k} tidak menempel di muka papan (jarak ${n.toFixed(3)})`);
    const sumbu = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    assert.ok(sumbu.dot(atas) > 0.999, `slot ${k} tidak sejajar papan`);
    for (const t of titik) assert.ok(p.distanceTo(t) >= 0.18, `slot ${k} menumpuk slot lain`);
    titik.push(p.clone());
  }
  // Muka papan menghadap ke depan-kanan (arah kamera orbit yang paling sering), bukan ke tanah atau ke dinding.
  assert.ok(normal.z > 0.5 && normal.x > 0.5 && normal.y > 0.1, `normal papan ${normal.toArray().map((x) => x.toFixed(2))}`);
});

test('gulungan tidak memancarkan bayangan dan tidak hilang di tepi layar', () => {
  assert.equal(markas.gulungan.castShadow, false);
  assert.equal(markas.gulungan.frustumCulled, false);
  for (let i = 0; i < 18; i++) M.tambahGulungan(`h${i}`);
  const u = ukurPohon(markas.root);
  assert.ok(u.drawCall <= 12 && u.segitiga <= 1500, JSON.stringify(u));
});
