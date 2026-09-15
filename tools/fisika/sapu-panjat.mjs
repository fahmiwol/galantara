// ═══════════════════════════════════════════════════════
// tools/fisika/sapu-panjat.mjs — benda mana yang BISA DIPANJAT pemain,
// didekati dari SEMUA arah, bukan hanya lurus.
//
// Kenapa ada: ukur-ambang-naik.mjs hanya mendekat lurus ke pusat benda dan
// menyimpulkan ambang 0,40 m. Agen Spot Braga (15 Sep 2026) menyapu sudut
// pendekatan dan menemukan pendekatan SERONG memanjat lebih tinggi: silinder
// 0,45 m dipanjat 66 dari 96 pendekatan, dingklik 0,40 dipanjat 111/160.
// Instrumen yang hanya melihat satu arah memberi ambang yang terlalu rendah.
//
// Metode (dari agen Braga): 32 arah × 5 geser samping, 90 langkah menuju pusat
// benda. "Dipanjat" = kaki naik ≥ 5 cm di atas lantai.
//
// Jalankan: node --experimental-default-type=module tools/fisika/sapu-panjat.mjs [sapu|daftar|semua]
// ═══════════════════════════════════════════════════════
import { pathToFileURL } from 'node:url';
import { Fisika } from '../../src/fisika/Fisika.js';
import { buatKarakter, langkahKarakter, teleportKarakter, LANGKAH } from '../../src/fisika/Karakter.js';

const muatRapier = () => import(new URL('../../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);
// Dijalankan langsung → sapuan; di-import (uji, agen) → hanya fungsi sapu().
const langsung = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const mode = langsung ? (process.argv[2] ?? 'semua') : 'tidak';

/** @returns {Promise<{dipanjat:number,total:number,kakiMaks:number}>} */
export async function sapu(deskriptor, { jauh = 2.2, arah = 32, geser = [0, 0.15, 0.3, 0.45, 0.6] } = {}) {
  const f = new Fisika({ muatRapier });
  await f.muat();
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [40, 1, 40] }], { x: 0, y: -0.5, z: 0 });
  f.daftarkan('benda', [deskriptor], { x: 0, y: 0, z: 0 });
  const k = buatKarakter(f, { x: 15, y: 0, z: 15 });
  let dipanjat = 0; let total = 0; let kakiMaks = 0;
  for (let i = 0; i < arah; i++) {
    const a = (i / arah) * Math.PI * 2;
    const ax = Math.sin(a); const az = Math.cos(a);
    for (const g of geser) {
      teleportKarakter(k, { x: ax * jauh + az * g, y: 0, z: az * jauh - ax * g });
      let y = 0;
      for (let s = 0; s < 90; s++) y = Math.max(y, langkahKarakter(k, { dt: LANGKAH, arah: [-ax, -az] }).kaki.y);
      total++;
      if (y >= 0.05) dipanjat++;
      kakiMaks = Math.max(kakiMaks, y);
    }
  }
  return { dipanjat, total, kakiMaks };
}

const baris = (nama, h) => `${nama.padEnd(52)} dipanjat ${String(h.dipanjat).padStart(3)}/${h.total} · kaki maks ${h.kakiMaks.toFixed(3)}`;

if (mode === 'sapu' || mode === 'semua') {
  console.log('── Sapuan tinggi: ambang panjat per bentuk dan lebar ──');
  for (const [bentuk, lebar] of [['kotak', 0.3], ['kotak', 1.3], ['silinder', 0.56], ['silinder', 1.4]]) {
    const hasil = [];
    for (const t of [0.4, 0.45, 0.5, 0.54, 0.58, 0.6, 0.65]) {
      const h = await sapu({ bentuk, ukuran: [lebar, t, lebar], letak: [0, t / 2, 0] }, { jauh: lebar / 2 + 1.4 });
      hasil.push(`${t.toFixed(2)}:${h.dipanjat}`);
    }
    console.log(`  ${bentuk} lebar ${lebar} → ${hasil.join('  ')}`);
  }
}

if (mode === 'daftar' || mode === 'semua') {
  console.log('\n── Collider yang TIDAK boleh dipanjat (harus 0) ──');
  const tidakBoleh = [
    ['dingklik warung (MejaNongkrong)', { bentuk: 'kotak', ukuran: [0.3, 0.6, 0.3], letak: [0, 0.3, 0] }, 1.6],
    ['bangku (MejaNongkrong)', { bentuk: 'kotak', ukuran: [1.35, 0.6, 0.42], letak: [0, 0.3, 0] }, 2.1],
    ['dulang lesehan (MejaNongkrong)', { bentuk: 'silinder', ukuran: [0.56, 0.6, 0.56], letak: [0, 0.3, 0] }, 1.7],
    ['alas portal Oola (World.js)', { bentuk: 'silinder', ukuran: [1.4, 0.6, 1.4], letak: [0, 0.3, 0] }, 2.2],
    ['alas portal Spot 0,60', { bentuk: 'silinder', ukuran: [1.3, 0.6, 1.3], letak: [0, 0.3, 0] }, 2.1],
    ['alas portal Spot 0,45 (setinggi mesh)', { bentuk: 'silinder', ukuran: [1.3, 0.45, 1.3], letak: [0, 0.225, 0] }, 2.1],
    ['kotak saran Oola', { bentuk: 'kotak', ukuran: [0.7, 0.7, 0.5], letak: [0, 0.35, 0] }, 1.8],
    ['bench_park skala 0,76', { bentuk: 'kotak', ukuran: [1.37, 0.68, 0.38], letak: [0, 0.34, 0] }, 2.0],
  ];
  for (const [nama, d, jauh] of tidakBoleh) console.log(`  ${baris(nama, await sapu(d, { jauh }))}`);

  console.log('\n── Undak yang MEMANG untuk didaki (harus > 0) ──');
  const boleh = [
    ['undak 0,16 (teras Monas)', { bentuk: 'kotak', ukuran: [2, 0.16, 2], letak: [0, 0.08, 0] }, 2.6],
    ['undak 0,20 (anak tangga rumah panggung)', { bentuk: 'kotak', ukuran: [2, 0.2, 2], letak: [0, 0.1, 0] }, 2.6],
    ['undak 0,27 (terasering)', { bentuk: 'kotak', ukuran: [2, 0.27, 2], letak: [0, 0.135, 0] }, 2.6],
    ['undak 0,35 (batas desain)', { bentuk: 'kotak', ukuran: [2, 0.35, 2], letak: [0, 0.175, 0] }, 2.6],
  ];
  for (const [nama, d, jauh] of boleh) console.log(`  ${baris(nama, await sapu(d, { jauh }))}`);
}
