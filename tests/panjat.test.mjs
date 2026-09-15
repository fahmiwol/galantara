// ═══════════════════════════════════════════════════════
// tests/panjat.test.mjs — benda yang tidak boleh dipanjat, didekati dari
// SEMUA arah; undak yang memang untuk didaki, tetap bisa didaki.
//
// Ambang panjat diukur dua kali pada 15 Sep 2026 dan dua kali salah ke arah
// yang sama: pendekatan lurus memberi 0,40 m, pendekatan serong (32 arah × 5
// geser samping) memberi 0,50 m, dan silinder sempit sekali terpanjat di 0,60.
// Uji ini memakai sapuan serong itu (tools/fisika/sapu-panjat.mjs), dan
// deskriptor diambil dari KODE PRODUKSI — bukan angka yang diketik ulang —
// supaya collider yang diubah tanpa sengaja ikut tertangkap.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sapu } from '../tools/fisika/sapu-panjat.mjs';
import { MejaNongkrong } from '../src/world/MejaNongkrong.js';
import { FISIKA_ALAS_PORTAL } from '../src/world/spotWarpPortal.js';

/** Satu bagian collider meja, dipindah ke pusat supaya sapuan mengelilinginya. */
function bagian(meja, cocok) {
  const d = meja.deskriptorFisika().find(cocok);
  assert.ok(d, 'bagian collider tidak ditemukan');
  return { ...d, letak: [0, d.letak[1], 0] };
}

const TIDAK_BOLEH = [
  ['dingklik warung', () => bagian(new MejaNongkrong({ id: 'u', x: 0, z: 0, gaya: 'warung', kursi: 4 }),
    (d) => d.bentuk === 'kotak' && d.ukuran[0] < 0.5), 1.6],
  ['bangku', () => bagian(new MejaNongkrong({ id: 'u', x: 0, z: 0, gaya: 'bangku', kursi: 2 }), () => true), 2.1],
  ['dulang lesehan', () => bagian(new MejaNongkrong({ id: 'u', x: 0, z: 0, gaya: 'lesehan', kursi: 3 }), () => true), 1.7],
  ['alas portal Spot', () => FISIKA_ALAS_PORTAL[0], 2.1],
];

for (const [nama, buat, jauh] of TIDAK_BOLEH) {
  test(`${nama}: tidak dipanjat dari 160 pendekatan serong`, async () => {
    const h = await sapu(buat(), { jauh });
    assert.equal(h.dipanjat, 0, `${nama} dipanjat ${h.dipanjat}/${h.total}, kaki sampai ${h.kakiMaks.toFixed(3)} m`);
  });
}

test('undak 0,35 m yang memang untuk didaki tetap bisa didaki dari semua arah', async () => {
  // Penjaga arah sebaliknya: perbaikan panjat tidak boleh membuat terasering,
  // teras, dan anak tangga rumah panggung jadi tembok.
  const h = await sapu({ bentuk: 'kotak', ukuran: [2, 0.35, 2], letak: [0, 0.175, 0] }, { jauh: 2.6 });
  assert.equal(h.dipanjat, h.total, `undak 0,35 hanya didaki ${h.dipanjat}/${h.total}`);
});
