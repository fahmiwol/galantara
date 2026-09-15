// ═══════════════════════════════════════════════════════
// tools/fisika/ukur-benaman.mjs — apakah kaki karakter TERBENAM ke lantai
// datar, per varian pengendali, di banyak arah jalan.
//
// Kenapa ada: agen Spot Losari (16 Sep 2026) melaporkan satu langkah kadang
// turun 3–25 cm ke lantai datar (paling sering di jalur serong), pulih hanya
// saat berjalan, dan tertinggal −1,2 cm saat diam. Avatar digambar di tinggi
// kaki, jadi benamannya terlihat. Resep agen: lantai kotak 30×1×30, karakter
// di (5, 0, 5), arah 225° → langkah ke-4 gerak y −0,25.
//
// Jalankan: node --experimental-default-type=module tools/fisika/ukur-benaman.mjs
// ═══════════════════════════════════════════════════════
import { Fisika } from '../../src/fisika/Fisika.js';
import { buatKarakter, langkahKarakter, kakiKarakter, teleportKarakter, LANGKAH } from '../../src/fisika/Karakter.js';

const muatRapier = () => import(new URL('../../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);

async function ukur(nama, siapkan) {
  const f = new Fisika({ muatRapier });
  await f.muat();
  // 80 m, bukan 30: versi pertama alat ini memakai lantai 30 m, dan jalan 150
  // langkah (13,5 m) dari dekat pusat melewati tepinya — "benaman" yang terukur
  // ternyata jatuh dari tepi. Resep agen tetap di lantai 30 m (lihat bawah).
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [80, 1, 80] }], { x: 0, y: -0.5, z: 0 });
  const k = buatKarakter(f, { x: 5, y: 0, z: 5 });
  siapkan?.(k);
  let yMin = 0; let langkahBenam = 0; let total = 0; let diamAkhir = 0;
  const contoh = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2 + 0.013;
    teleportKarakter(k, { x: (i % 5) - 2, y: 0, z: ((i * 7) % 5) - 2 });
    for (let s = 0; s < 150; s++) {
      const { kaki, gerak } = langkahKarakter(k, { dt: LANGKAH, arah: [Math.sin(a), Math.cos(a)] });
      total++;
      if (kaki.y < -0.02) { langkahBenam++; if (contoh.length < 3) contoh.push(`arah ${(a * 180 / Math.PI).toFixed(0)}° langkah ${s}: y ${kaki.y.toFixed(3)} (gerak y ${gerak[1].toFixed(3)})`); }
      yMin = Math.min(yMin, kaki.y);
    }
    for (let s = 0; s < 60; s++) langkahKarakter(k, { dt: LANGKAH });
    diamAkhir = Math.min(diamAkhir, kakiKarakter(k).y);
  }
  // Resep persis agen Losari (lantai 30 m; di dunia 80 m ini posisinya sama-sama jauh dari tepi).
  teleportKarakter(k, { x: 5, y: 0, z: 5 });
  const a = (225 * Math.PI) / 180;
  const resep = [];
  for (let s = 0; s < 8; s++) resep.push(langkahKarakter(k, { dt: LANGKAH, arah: [Math.sin(a), Math.cos(a)] }).gerak[1].toFixed(3));
  console.log(`${nama.padEnd(34)} y min ${yMin.toFixed(3)} · langkah < −2 cm ${langkahBenam}/${total} · diam terendah ${diamAkhir.toFixed(3)} · resep 225° gerak y [${resep.join(', ')}]`);
  for (const c of contoh) console.log(`${' '.repeat(36)}${c}`);
}

await ukur('sekarang (snap 0,35)');
await ukur('tanpa snap-to-ground', (k) => k.kendali.disableSnapToGround());
await ukur('snap 0,1', (k) => k.kendali.enableSnapToGround(0.1));
await ukur('snap 0,35 + nudge bawaan 1e-4', (k) => k.kendali.setNormalNudgeFactor(1e-4));
