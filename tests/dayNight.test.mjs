// ═══════════════════════════════════════════════════════
// tests/dayNight.test.mjs — cahaya yang tidak boleh membakar pulau jadi putih
//
// 15 Sep 2026: tanah #a8d5a2 dirender #ffffff sepanjang siang karena
// AmbientLight 0,6 yang tidak pernah disentuh siklus hari. Keputusan warna
// sebelumnya diukur dari MATERIAL, dan instrumen itu tidak melihat masalahnya.
//
// Uji ini tidak bisa merender (tanpa WebGL), jadi ia memakai model cahaya
// Lambert r128 tanpa physicallyCorrectLights — dan model itu DIJANGKARKAN ke
// piksel yang benar-benar diukur di browser. Kalau jangkarnya meleset, model
// ini tidak boleh dipercaya untuk uji lainnya (periksa instrumen dulu).
// ═══════════════════════════════════════════════════════

import test from 'node:test';
import assert from 'node:assert/strict';
import { KEYFRAME, keadaanCahaya } from '../src/world/DayNight.js';

const TANAH = 0xa8d5a2;
const kanal = (hex) => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff].map((c) => c / 255);

/**
 * Warna tanah menghadap atas yang terkena matahari, menurut model r128:
 *   albedo × (matahari · max(0, N·L) · warnaMatahari + hemi · warnaLangit + ambien · warnaAmbien)
 * (tanpa physicallyCorrectLights, faktor π dari irradiance dan BRDF Lambert saling hapus).
 * @returns {number[]} 0..255 per kanal, TIDAK dipotong — supaya pemotongan terlihat.
 */
function tanahTerlihat(jam) {
  const k = keadaanCahaya(jam);
  const [lx, ly, lz] = [k.matahari.x, k.matahari.y, 10];
  const nDotL = Math.max(0, ly / Math.hypot(lx, ly, lz));
  const albedo = kanal(TANAH);
  const matahari = kanal(k.matahari.warna);
  const langit = kanal(k.langit);
  const ambien = kanal(k.ambien.warna);
  return albedo.map((a, i) => 255 * a * (
    k.matahari.kuat * nDotL * matahari[i] + k.hemi * langit[i] + k.ambien.kuat * ambien[i]
  ));
}

test('jangkar: model cocok dengan piksel yang diukur di browser (±6 %)', () => {
  // Median 10 titik tanah pulau, Chrome, 15 Sep 2026 (lihat DayNight.js).
  const terukur = {
    10: [0xa5, 0xd3, 0x9c],
    12.5: [0xad, 0xdc, 0xa6],
    15: [0xa9, 0xd2, 0x96],
    17.25: [0xb7, 0xaf, 0x57],
    0: [0x28, 0x3b, 0x4b],
  };
  for (const [jam, piksel] of Object.entries(terukur)) {
    const model = tanahTerlihat(Number(jam));
    piksel.forEach((p, i) => {
      // Malam: nilai kecil, jadi pakai selisih mutlak; siang: relatif.
      const toleransi = Math.max(p * 0.06, 8);
      assert.ok(Math.abs(model[i] - p) <= toleransi,
        `jam ${jam} kanal ${'RGB'[i]}: model ${model[i].toFixed(0)} vs terukur ${p} — model tidak bisa dipercaya`);
    });
  }
});

test('tidak ada jam yang membakar tanah jadi putih (tiap kanal < 250)', () => {
  for (let m = 0; m < 24 * 60; m += 10) {
    const jam = m / 60;
    const w = tanahTerlihat(jam);
    assert.ok(Math.max(...w) < 250, `jam ${jam.toFixed(2)}: tanah terpotong ${w.map((c) => c.toFixed(0)).join(',')}`);
  }
});

test('siang tetap terang dan HIJAU; malam biru tinta, bukan hitam', () => {
  for (let jam = 9; jam <= 16; jam += 0.25) {
    const [r, g, b] = tanahTerlihat(jam);
    assert.ok(g >= 185, `jam ${jam}: siang terlalu redup, hijau ${g.toFixed(0)}`);
    assert.ok(g > r && g > b, `jam ${jam}: tanah siang tidak lagi hijau (${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)})`);
  }
  for (const jam of [20.5, 22, 0, 2, 4]) {
    const [r, g, b] = tanahTerlihat(jam);
    assert.ok(b >= g && b > r, `jam ${jam}: malam tidak biru (${r.toFixed(0)},${g.toFixed(0)},${b.toFixed(0)})`);
    assert.ok(g >= 35, `jam ${jam}: malam terlalu hitam, hijau ${g.toFixed(0)}`);
  }
});

test('jam emas lebih hangat daripada tengah hari', () => {
  const [r1, g1] = tanahTerlihat(12.5);
  const [r2, g2] = tanahTerlihat(17.25);
  assert.ok(r2 / g2 > 1.0 && r1 / g1 < 0.85, `rasio merah/hijau: siang ${(r1 / g1).toFixed(2)}, jam emas ${(r2 / g2).toFixed(2)}`);
});

test('keyframe urut, lengkap 0–24, dan jam 24 sama dengan jam 0', () => {
  for (let i = 1; i < KEYFRAME.length; i++) assert.ok(KEYFRAME[i].jam > KEYFRAME[i - 1].jam);
  assert.equal(KEYFRAME[0].jam, 0);
  assert.equal(KEYFRAME.at(-1).jam, 24);
  const { jam: _a, catatan: _c, ...awal } = KEYFRAME[0];
  const { jam: _b, catatan: _d, ...akhir } = KEYFRAME.at(-1);
  assert.deepEqual(akhir, awal);
});

test('kontinu: tidak ada lompatan cahaya antar menit', () => {
  let lalu = keadaanCahaya(0);
  for (let m = 1; m <= 24 * 60; m++) {
    const k = keadaanCahaya(m / 60);
    assert.ok(Math.abs(k.matahari.kuat - lalu.matahari.kuat) < 0.02, `menit ${m}: matahari melompat`);
    assert.ok(Math.abs(k.hemi - lalu.hemi) < 0.02, `menit ${m}: hemi melompat`);
    assert.ok(Math.abs(k.ambien.kuat - lalu.ambien.kuat) < 0.02, `menit ${m}: ambien melompat`);
    assert.ok(Math.abs(k.lampu - lalu.lampu) < 0.02, `menit ${m}: lampu melompat`);
    lalu = k;
  }
});
