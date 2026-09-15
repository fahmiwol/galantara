// ═══════════════════════════════════════════════════════
// tools/fisika/ukur-jam.mjs — jumlah langkah dan jarak di 30/60/120/144 fps,
// dan bingkai mana yang menggambar posisi yang sama (interpolasi).
//
// Bukti untuk docs/adr/0015 keputusan 4. Jalankan dengan
// node --experimental-default-type=module tools/fisika/ukur-jam.mjs
// ═══════════════════════════════════════════════════════
import { Fisika } from '../../src/fisika/Fisika.js';
import { buatKarakter, majukanKarakter, kakiKarakter, KECEPATAN } from '../../src/fisika/Karakter.js';
const muatRapier = () => import(new URL('../../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);

async function dunia() {
  const f = new Fisika({ muatRapier });
  await f.muat();
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [80, 1, 80] }], { x: 0, y: -0.5, z: 0 });
  return f;
}

for (const fps of [30, 60, 120, 144]) {
  const f = await dunia();
  const k = buatKarakter(f, { x: -15, y: 0, z: 0 });
  let langkah = 0;
  const perLangkah = [];
  let xLalu = kakiKarakter(k).x;
  for (let i = 0; i < fps * 2; i++) {
    const h = majukanKarakter(k, 1 / fps, [1, 0]);
    langkah += h.langkah;
    if (h.langkah) { const x = kakiKarakter(k).x; perLangkah.push(+(x - xLalu).toFixed(4)); xLalu = x; }
  }
  const d = kakiKarakter(k).x + 15;
  console.log(fps, 'fps: langkah', langkah, '| jarak', d.toFixed(4), '| harapan per langkah', (KECEPATAN / 60).toFixed(4),
    '| 5 gerak pertama', perLangkah.slice(0, 5).join(','), '| sisa', k.sisa.toExponential(3));
}

// Interpolasi 120 Hz: di bingkai mana posisi gambar tidak maju?
const f = await dunia();
const k = buatKarakter(f, { x: 0, y: 0, z: 0 });
for (let i = 0; i < 10; i++) majukanKarakter(k, 1 / 120, [1, 0]);
let lalu = majukanKarakter(k, 1 / 120, [1, 0]).kaki.x;
for (let i = 0; i < 120; i++) {
  const sisaSebelum = k.sisa;
  const h = majukanKarakter(k, 1 / 120, [1, 0]);
  if (h.kaki.x - lalu < 1e-6) {
    console.log('bingkai', i, 'tidak maju: dx', (h.kaki.x - lalu).toExponential(2), 'langkah', h.langkah,
      'sisa sebelum', sisaSebelum.toExponential(4), 'sesudah', k.sisa.toExponential(4),
      'gerak fisika', (k.sekarang.x - k.sebelum.x).toFixed(5));
  }
  lalu = h.kaki.x;
}
