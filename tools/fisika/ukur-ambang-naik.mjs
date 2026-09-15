// ═══════════════════════════════════════════════════════
// tools/fisika/ukur-ambang-naik.mjs — setinggi apa benda yang BENAR-BENAR
// bisa dinaiki pengendali karakter, dan apa yang terjadi setelah teleport.
//
// Kenapa ada: parameter naikTangga 0,35 m tidak sama dengan ambang nyata.
// Ujung kapsul bundar menyentuh tepi benda lebih tinggi dari titik terendah
// kapsul, jadi benda sedikit di atas 0,35 masih bisa "didaki". Temuan agen
// Spot Bogor, 15 Sep 2026; alat ini mengukurnya ulang untuk kotak dan silinder
// dan untuk lebar benda yang berbeda.
//
// Jalankan: node --experimental-default-type=module tools/fisika/ukur-ambang-naik.mjs
// ═══════════════════════════════════════════════════════
import { Fisika } from '../../src/fisika/Fisika.js';
import { buatKarakter, langkahKarakter, kakiKarakter, teleportKarakter } from '../../src/fisika/Karakter.js';

const muatRapier = () => import(new URL('../../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);

async function dunia() {
  const f = new Fisika({ muatRapier });
  await f.muat();
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [40, 1, 40] }], { x: 0, y: -0.5, z: 0 });
  return f;
}

async function naik(bentuk, tinggi, lebar) {
  const f = await dunia();
  const ukuran = bentuk === 'kotak' ? [lebar, tinggi, lebar] : [lebar, tinggi, lebar];
  f.daftarkan('benda', [{ bentuk, ukuran }], { x: 2, y: tinggi / 2, z: 0 });
  const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
  let yMaks = -1;
  for (let i = 0; i < 120; i++) yMaks = Math.max(yMaks, langkahKarakter(k, { dt: 1 / 60, arah: [1, 0] }).kaki.y);
  return yMaks > tinggi * 0.8;
}

console.log('AMBANG NAIK (kaki melewati 80 % tinggi benda = dinaiki)');
for (const bentuk of ['kotak', 'silinder']) {
  for (const lebar of [0.3, 1.3]) {
    const baris = [];
    for (let t = 0.3; t <= 0.651; t += 0.05) baris.push(`${t.toFixed(2)}:${(await naik(bentuk, t, lebar)) ? 'NAIK' : 'tahan'}`);
    console.log(`  ${bentuk.padEnd(8)} lebar ${lebar} → ${baris.join('  ')}`);
  }
}

console.log('\nTELEPORT KELUAR DARI DALAM BENDA');
for (const propagasi of [false, true]) {
  const f = await dunia();
  f.daftarkan('warung', [{ bentuk: 'kotak', ukuran: [2.2, 1.35, 1.6] }], { x: 3, y: 0.675, z: 0 });
  const k = buatKarakter(f, { x: 3, y: 0, z: 0 });            // lahir DI DALAM warung
  // Beberapa langkah dulu: dunia tidak lagi "kotor", jadi langkah berikutnya
  // TIDAK didahului world.step() dari segarkan(). Inilah urutan yang terjadi
  // saat fisika menyambung atau warp setelah pemain sempat berdiri di sana.
  for (let i = 0; i < 5; i++) langkahKarakter(k, { dt: 1 / 60 });
  teleportKarakter(k, { x: 0, y: 0, z: 0 });
  if (propagasi) f.w.propagateModifiedBodyPositionsToColliders();
  const jejak = [];
  for (let i = 0; i < 90; i++) jejak.push(langkahKarakter(k, { dt: 1 / 60 }).kaki.y);
  const akhir = kakiKarakter(k);
  console.log(`  propagasi=${propagasi}: y maks ${Math.max(...jejak).toFixed(3)}, y akhir ${akhir.y.toFixed(3)}, x ${akhir.x.toFixed(3)}`);
}
