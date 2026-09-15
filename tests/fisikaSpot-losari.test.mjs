// ═══════════════════════════════════════════════════════
// tests/fisikaSpot-losari.test.mjs — Losari yang dirasakan pemain
//
// Anjungan tepi laut 30 × 13 m, lis 0,34 m di bibir air, dan dermaga yang
// menjorok 9 m ke laut. LosariSpotRuntime dibangun dengan THREE r128 asli
// (vendor/) dan Rapier asli, lalu pemain BERJALAN — bukan membaca daftar
// collider.
//
// Area yang boleh diinjak diturunkan dari konstanta yang diekspor runtime,
// yaitu angka yang juga membangun mesh-nya. Tanpa stub DOM: mount() hanya
// menyentuh THREE, InteractionVolume, dan spotWarpPortal. `toast` diberi
// show() kosong — hanya dipanggil onUse volume, yang tidak dipicu di sini.
//
// Dua uji KONTROL memeriksa instrumennya sendiri: tanpa batas, jalan 16 arah
// memang terbaca jatuh; dengan lis setinggi mesh-nya, "tertahan di lis" memang
// terbaca naik lalu jatuh. Uji yang tidak bisa merah tidak membuktikan apa-apa.
// ═══════════════════════════════════════════════════════

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// THREE r128 dari vendor — build UMD yang sama dengan yang dimuat index.html.
const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { Fisika } = await import('../src/fisika/Fisika.js');
const {
  buatKarakter, langkahKarakter, jalanKarakter, kakiKarakter, teleportKarakter,
  ruangBebas, cariTempatBerdiri, calonMelingkar, lepasKarakter, UKURAN_KAPSUL, PARAM,
} = await import('../src/fisika/Karakter.js');
const {
  LosariSpotRuntime, ANJUNGAN_LEBAR, ANJUNGAN_DALAM, BIBIR_Z, LIS_TINGGI, LIS_DALAM,
  DERMAGA_X, DERMAGA_LEBAR, DERMAGA_PANJANG, DERMAGA_ATAS,
} = await import('../src/world/spots/LosariSpotRuntime.js');
const { FISIKA_ALAS_PORTAL } = await import('../src/world/spotWarpPortal.js');

const muatRapier = () => import(new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);

/** Sama dengan KELOMPOK_SPOT di Game.js (tidak diekspor, dan Game.js butuh DOM). */
const KELOMPOK = 'spot';
const JARI = UKURAN_KAPSUL[0] / 2;
/** Pusat pemain berhenti sejauh ini dari muka penghalang. */
const HENTI = JARI + PARAM.offset;
/** Game memanggil avatar.teleport(0, 2) saat warp, lalu pastikanBebas(). */
const MUNCUL = { x: 0, y: 0, z: 2 };
const LANGKAH = 1 / 60;

// ── Area yang boleh diinjak, dari konstanta runtime ─────────────────
const TEPI_KIRI = -ANJUNGAN_LEBAR / 2;
const TEPI_KANAN = ANJUNGAN_LEBAR / 2;
const TEPI_DARAT = ANJUNGAN_DALAM / 2;
const BIBIR_DALAM = BIBIR_Z + LIS_DALAM / 2;   // lis tidak untuk diinjak
const DERMAGA_KIRI = DERMAGA_X - DERMAGA_LEBAR / 2;
const DERMAGA_KANAN = DERMAGA_X + DERMAGA_LEBAR / 2;
const DERMAGA_UJUNG = BIBIR_Z - DERMAGA_PANJANG;

/** Anjungan tanpa lis, digabung dengan dermaga dan mulutnya; titik keliling berurutan. */
const AREA = [
  [TEPI_KIRI, TEPI_DARAT], [TEPI_KANAN, TEPI_DARAT], [TEPI_KANAN, BIBIR_DALAM],
  [DERMAGA_KANAN, BIBIR_DALAM], [DERMAGA_KANAN, DERMAGA_UJUNG],
  [DERMAGA_KIRI, DERMAGA_UJUNG], [DERMAGA_KIRI, BIBIR_DALAM], [TEPI_KIRI, BIBIR_DALAM],
];

/**
 * Seberapa jauh titik XZ di DALAM area: jarak ke tepi terdekat, negatif kalau
 * di luar. Dalam/luar dari aturan ganjil-genap, besarnya dari jarak ke ruas —
 * jadi sudut mulut dermaga dihitung ke TITIK sudutnya, tidak seperti gabungan
 * dua persegi yang disusutkan (yang menolak posisi sah saat pemain membelok).
 */
function kedalaman({ x, z }) {
  let dalam = false;
  let jarak = Infinity;
  for (let i = 0, j = AREA.length - 1; i < AREA.length; j = i++) {
    const [ax, az] = AREA[j];
    const [bx, bz] = AREA[i];
    if ((az > z) !== (bz > z) && x < ax + ((z - az) * (bx - ax)) / (bz - az)) dalam = !dalam;
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    jarak = Math.min(jarak, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return dalam ? jarak : -jarak;
}

const titik = (p) => `(${p.x.toFixed(2)}, ${p.y?.toFixed(2) ?? '–'}, ${p.z.toFixed(2)})`;

// ── Dunia ──────────────────────────────────────────────────────────

/** Losari seperti di browser: mount SEBELUM Rapier siap (antrean), baru dimuat. */
async function losari() {
  const peringatan = [];
  const asli = console.warn;
  console.warn = (...a) => { peringatan.push(a.join(' ')); };
  try {
    const f = new Fisika({ muatRapier });
    const scene = new THREE.Scene();
    const runtime = new LosariSpotRuntime();
    runtime.mount(scene, { toast: { show() {} }, fisika: f, kelompokFisika: KELOMPOK });
    await f.muat();
    return { f, scene, runtime, peringatan };
  } finally {
    console.warn = asli;
  }
}

/**
 * Pendaftaran collider Losari sebagai DATA, untuk uji kontrol: mount dengan
 * perekam, lalu putar ulang ke Fisika asli tanpa sebagian collider. Perekam
 * hanya mencatat argumen; yang menilai tabrakan tetap Rapier.
 */
function rekamPendaftaran() {
  const panggilan = [];
  new LosariSpotRuntime().mount(new THREE.Scene(), {
    fisika: { daftarkan: (...a) => { panggilan.push(a); return a[1].length; } },
    kelompokFisika: KELOMPOK,
  });
  return panggilan;
}

async function duniaDari(panggilan, { buang = () => false, tambah = [] } = {}) {
  const f = new Fisika({ muatRapier });
  await f.muat();
  for (const a of panggilan) if (!buang(a[4])) f.daftarkan(...a);
  for (const [deskriptor, induk, pemilik] of tambah) f.daftarkan(KELOMPOK, deskriptor, induk, 0, pemilik);
  return f;
}

const ARAH = 16;

/**
 * Jalan `detik` ke 16 arah dari titik muncul. Dibaca TIAP langkah, bukan hanya
 * di akhir: pemain yang keluar lalu terpental kembali tetap tertangkap.
 * Arah digeser 0,1 rad (sama dengan uji Oola) supaya tidak ada yang tepat
 * tegak lurus dinding — yang diuji juga meluncurnya.
 */
function jalanSegalaArah(f, detik = 6) {
  const k = buatKarakter(f, MUNCUL);
  try {
    const hasil = [];
    for (let i = 0; i < ARAH; i++) {
      const a = (i / ARAH) * Math.PI * 2 + 0.1;
      const arah = [Math.sin(a), Math.cos(a)];
      teleportKarakter(k, MUNCUL);
      const r = { i, yMin: Infinity, yMaks: -Infinity, dalamMin: Infinity, di: null };
      for (let s = 0; s < Math.round(detik * 60); s++) {
        const { kaki } = langkahKarakter(k, { dt: LANGKAH, arah });
        r.yMin = Math.min(r.yMin, kaki.y);
        r.yMaks = Math.max(r.yMaks, kaki.y);
        const d = kedalaman(kaki);
        if (d < r.dalamMin) { r.dalamMin = d; r.di = { ...kaki, langkah: s }; }
      }
      r.akhir = kakiKarakter(k);
      hasil.push(r);
    }
    return hasil;
  } finally {
    lepasKarakter(k);
  }
}

let W;
before(async () => { W = await losari(); });

// ── Instrumen ──────────────────────────────────────────────────────

test('instrumen: kedalaman titik terhadap area yang boleh diinjak', () => {
  // Tengah anjungan: tepi terdekat adalah muka darat lis, bukan tepi darat.
  assert.ok(Math.abs(kedalaman({ x: 0, z: 0 }) - Math.min(-BIBIR_DALAM, TEPI_DARAT)) < 1e-9);
  // Tengah dermaga: setengah lebar papan.
  assert.ok(Math.abs(kedalaman({ x: DERMAGA_X, z: BIBIR_Z - DERMAGA_PANJANG / 2 }) - DERMAGA_LEBAR / 2) < 1e-9);
  // Di atas lis dan di laut: di luar.
  assert.ok(kedalaman({ x: 0, z: BIBIR_Z }) < 0);
  assert.ok(kedalaman({ x: 0, z: BIBIR_Z - 3 }) < 0);
  assert.ok(kedalaman({ x: DERMAGA_KIRI - 0.5, z: BIBIR_Z - 3 }) < 0, 'samping dermaga harus di luar');
  // Di depan sudut mulut dermaga: jaraknya ke titik sudut (0,3·√2), bukan 0,3.
  const dekatSudut = kedalaman({ x: DERMAGA_KIRI + 0.3, z: BIBIR_DALAM + 0.3 });
  assert.ok(Math.abs(dekatSudut - 0.3 * Math.SQRT2) < 1e-9, `sudut mulut dermaga: ${dekatSudut}`);
});

// ── Losari ─────────────────────────────────────────────────────────

test('Losari: fisikaTanah disetel, semua collider terpasang, tanpa peringatan [fisika]', () => {
  assert.equal(W.runtime.fisikaTanah, true, 'tanpa ini Game menambah lantai 120 m yang menutupi laut');
  assert.deepEqual(W.peringatan.filter((p) => p.includes('[fisika]')), []);
  // Tanah 3 (anjungan, dermaga, ambang mulut dermaga) + batas 8 (3 tepi darat,
  // 2 potong lis, 2 sisi + 1 ujung dermaga) + prop 6 (gerobak, 4 tiang lampu,
  // alas portal).
  assert.equal(W.f.hitung()[KELOMPOK], 17);
  assert.equal(W.f.jumlahDiDunia(), 17, 'ada deskriptor terdaftar yang tidak menjadi collider');
  // ctx null: pendaftaran dilewati tanpa galat, pernyataan tanahnya tetap.
  assert.equal(new LosariSpotRuntime().mount(new THREE.Scene(), null).fisikaTanah, true);
});

test('Losari: titik muncul (0, 2) bebas dan berdiri di paving', (t) => {
  const k = buatKarakter(W.f, MUNCUL);
  try {
    const r = ruangBebas(k, MUNCUL);
    const berdiri = r.bebas
      ? { x: MUNCUL.x, y: r.tanahY, z: MUNCUL.z }
      : cariTempatBerdiri(k, calonMelingkar(MUNCUL));
    assert.ok(berdiri, `tidak ada titik berdiri dalam 3 m dari titik muncul (${r.sebab})`);
    assert.ok(Math.hypot(berdiri.x - MUNCUL.x, berdiri.z - MUNCUL.z) <= 3);
    assert.ok(Math.abs(berdiri.y) < 0.01, `tanah titik muncul y=${berdiri.y}, bukan paving anjungan`);
    t.diagnostic(r.bebas ? 'titik muncul (0, 2) bebas' : `terhalang (${r.sebab}), dipindah ke ${titik(berdiri)}`);
    teleportKarakter(k, berdiri);
    const h = jalanKarakter(k, { detik: 1 });
    assert.ok(h.menapak && Math.abs(h.kaki.y) < 0.03, `tidak menapak di paving: ${JSON.stringify(h)}`);
  } finally {
    lepasKarakter(k);
  }
});

test('Losari: 6 detik ke 16 arah dari titik muncul — tidak jatuh, tidak naik, tidak keluar area', (t) => {
  // 6 detik × 5,4 m/s = 32 m, lebih jauh dari tepi mana pun dari titik muncul
  // (terjauh ujung dermaga, ±19 m). Uji kontrol di bawah membuktikan tiap arah
  // memang sampai ke suatu tepi.
  const hasil = jalanSegalaArah(W.f);
  for (const r of hasil) {
    assert.ok(r.yMin > -0.5, `arah ${r.i}: jatuh, y min ${r.yMin.toFixed(3)}`);
    // Permukaan tertinggi yang boleh diinjak adalah dermaga; di atasnya berarti
    // naik ke lis, gerobak, atau alas portal.
    assert.ok(r.yMaks < DERMAGA_ATAS + 0.05, `arah ${r.i}: naik ke atas sesuatu, y maks ${r.yMaks.toFixed(3)}`);
    assert.ok(r.dalamMin >= 0.1, `arah ${r.i}: pusat pemain ${r.dalamMin.toFixed(3)} m dari tepi di ${titik(r.di)}, langkah ${r.di.langkah}`);
  }
  const terdangkal = hasil.reduce((a, b) => (b.dalamMin < a.dalamMin ? b : a));
  const terendah = hasil.reduce((a, b) => (b.yMin < a.yMin ? b : a));
  const diDermaga = hasil.filter((r) => r.akhir.z < BIBIR_Z).length;
  t.diagnostic(`pusat paling dekat ke tepi: ${terdangkal.dalamMin.toFixed(3)} m (arah ${terdangkal.i}) · berakhir di dermaga: ${diDermaga} arah`);
  // Dicetak, tidak diasersi di sini: kapsul bisa terbenam beberapa cm di lantai
  // datar saat berjalan serong — perilaku snap-to-ground pengendali, bukan
  // collider Losari. Batas −0,5 di atas hanya menangkap JATUH.
  t.diagnostic(`y terendah: ${terendah.yMin.toFixed(3)} (arah ${terendah.i})`);
});

test('Losari: alas portal bersama terpasang tepat di portal', () => {
  // Dapat-tidaknya alas ini dipanjat dijaga tests/panjat.test.mjs untuk
  // deskriptor bersamanya (160 pendekatan serong). Yang khusus Losari hanya
  // letaknya: sinar dari atas pusat portal harus mengenai puncak alas, dan
  // sejengkal di luar jarinya harus mengenai paving lagi.
  const portal = W.runtime.interactionVolumes.find((v) => v.id === 'spot_warp_portal');
  const [alas] = FISIKA_ALAS_PORTAL;
  const puncak = alas.letak[1] + alas.ukuran[1] / 2;
  const diPusat = W.f.tanahDi(portal.cx, portal.cz, { dari: 2, jarak: 3 });
  assert.ok(diPusat != null && Math.abs(diPusat - puncak) < 1e-3, `di pusat portal tanah y=${diPusat}, harapan puncak alas ${puncak}`);
  const diLuar = W.f.tanahDi(portal.cx + alas.ukuran[0] / 2 + 0.05, portal.cz, { dari: 2, jarak: 3 });
  assert.ok(diLuar != null && Math.abs(diLuar) < 1e-3, `sejengkal di luar alas tanah y=${diLuar}, harapan paving 0`);
});

test('Losari: jalan ke laut dari tepi anjungan — tertahan di lis, tidak naik ke atasnya, tidak jatuh', (t) => {
  // Lurus di enam x yang menjauhi tiang lampu dan mulut dermaga, lalu dua
  // serong 60° dari tegak lurus lis. Di sudut itu balok rendah paling mudah
  // dinaiki (diukur 15 Sep 2026 dengan skrip sekali pakai, tidak di repo:
  // balok 0,5 m dalam dinaiki sampai 0,42 m tegak lurus, sampai 0,50 m di
  // 60°). Yang serong meluncur menyusuri lis sampai sudut anjungan.
  const serong = [Math.sin(Math.PI / 3), -Math.cos(Math.PI / 3)];
  const kasus = [
    ...[-13.5, -9.5, -1.5, 1.5, 7.5, 13.5].map((x) => ({ dari: { x, z: BIBIR_Z + 2 }, arah: [0, -1], detik: 1.5 })),
    { dari: { x: 5, z: BIBIR_Z + 2 }, arah: serong, detik: 2.5 },
    { dari: { x: -12, z: BIBIR_Z + 2 }, arah: [-serong[0], serong[1]], detik: 2.5 },
  ];
  const berhentiDi = BIBIR_DALAM + HENTI;
  const k = buatKarakter(W.f, { ...kasus[0].dari, y: 0 });
  const terukur = { zMin: Infinity, zMaks: -Infinity, yAbs: 0 };
  try {
    for (const { dari, arah, detik } of kasus) {
      teleportKarakter(k, { ...dari, y: 0 });
      let yMin = Infinity;
      let yMaks = -Infinity;
      for (let s = 0; s < Math.round(detik * 60); s++) {
        const { kaki } = langkahKarakter(k, { dt: LANGKAH, arah });
        yMin = Math.min(yMin, kaki.y);
        yMaks = Math.max(yMaks, kaki.y);
      }
      const akhir = kakiKarakter(k);
      const nama = `dari ${titik(dari)} arah [${arah.map((v) => v.toFixed(2))}]`;
      assert.ok(yMaks < 0.03, `${nama}: naik ke lis, y maks ${yMaks.toFixed(3)} (lis ${LIS_TINGGI})`);
      assert.ok(yMin > -0.03, `${nama}: turun dari paving, y min ${yMin.toFixed(3)}`);
      // Berhenti MENEMPEL lis: tidak menembus, dan tidak tertahan jauh sebelumnya.
      assert.ok(Math.abs(akhir.z - berhentiDi) < 0.03, `${nama}: berhenti di z=${akhir.z.toFixed(3)}, harapan ${berhentiDi.toFixed(3)}`);
      terukur.zMin = Math.min(terukur.zMin, akhir.z);
      terukur.zMaks = Math.max(terukur.zMaks, akhir.z);
      terukur.yAbs = Math.max(terukur.yAbs, Math.abs(yMin), Math.abs(yMaks));
    }
    t.diagnostic(`${kasus.length} kasus berhenti di z ${terukur.zMin.toFixed(4)}…${terukur.zMaks.toFixed(4)} (harapan ${berhentiDi.toFixed(4)}) · |y| terbesar ${terukur.yAbs.toFixed(4)}`);
  } finally {
    lepasKarakter(k);
  }
});

test('Losari: dermaga bisa dijalani sampai ujungnya, tanpa tersangkut di mulutnya', (t) => {
  const k = buatKarakter(W.f, { x: DERMAGA_X, y: 0, z: BIBIR_Z + 2.5 });
  try {
    const volume = W.runtime.interactionVolumes.find((v) => v.id === 'losari_dermaga');
    assert.ok(volume, 'volume interaksi dermaga tidak dibangun');
    let pernahDiVolume = false;
    let yMin = Infinity;
    let simpangPapan = 0;
    let geraknyaTerkecil = Infinity;
    let melambat = 0;
    for (let s = 0; s < 3 * 60; s++) {
      const { kaki, gerak } = langkahKarakter(k, { dt: LANGKAH, arah: [0, -1] });
      yMin = Math.min(yMin, kaki.y);
      if (volume.containsXZ(kaki)) pernahDiVolume = true;
      // Sudah seluruhnya di atas papan: tingginya harus tinggi papan.
      if (kaki.z < BIBIR_Z - LIS_DALAM - JARI) simpangPapan = Math.max(simpangPapan, Math.abs(kaki.y - DERMAGA_ATAS));
      // Sebelum ditahan dinding ujung: tidak pernah berhenti. Gerak normal
      // 0,09 m per langkah; memanjat ambang 0,20 memang melambat (terukur
      // 0,040–0,082 m datar, 4–6 langkah) — tersangkut berarti ±0.
      if (kaki.z > DERMAGA_UJUNG + HENTI + 0.1) {
        const datar = Math.hypot(gerak[0], gerak[2]);
        geraknyaTerkecil = Math.min(geraknyaTerkecil, datar);
        if (datar < 0.08) melambat++;
      }
    }
    const akhir = kakiKarakter(k);
    assert.ok(yMin > -0.03, `jatuh dari dermaga, y min ${yMin.toFixed(3)}`);
    assert.ok(geraknyaTerkecil >= 0.02, `tersangkut: gerak datar terkecil ${geraknyaTerkecil.toFixed(3)} m per langkah`);
    assert.ok(simpangPapan < 0.03, `tidak berdiri di papan dermaga: simpangan y ${simpangPapan.toFixed(3)} dari ${DERMAGA_ATAS}`);
    assert.ok(Math.abs(akhir.z - (DERMAGA_UJUNG + HENTI)) < 0.03, `berhenti di z=${akhir.z.toFixed(3)}, bukan di ujung dermaga`);
    assert.ok(Math.abs(akhir.x - DERMAGA_X) < 0.05, `terdorong ke samping di dermaga: x=${akhir.x.toFixed(3)}`);
    assert.ok(pernahDiVolume, 'volume "lihat matahari terbenam" tidak pernah dimasuki');
    t.diagnostic(`ujung dermaga ${titik(akhir)} · gerak datar terkecil ${geraknyaTerkecil.toFixed(3)} m · ${melambat} langkah melambat`);
  } finally {
    lepasKarakter(k);
  }
});

test('kontrol: tanpa batas tak terlihat, 16 arah yang sama terbaca jatuh', async (t) => {
  // Kalau ada arah yang tetap "lolos" di dunia tanpa dinding, arah itu tidak
  // pernah sampai ke tepi mana pun — dan uji 16 arah di atas tidak menguji
  // apa-apa lewat arah itu.
  const f = await duniaDari(rekamPendaftaran(), { buang: (pemilik) => pemilik.includes(':batas-') });
  const hasil = jalanSegalaArah(f);
  const bocor = hasil.filter((r) => r.yMin <= -0.5 || r.dalamMin < 0.1);
  assert.equal(bocor.length, ARAH, `arah yang tidak sampai ke tepi: ${hasil.filter((r) => !bocor.includes(r)).map((r) => r.i)}`);
  t.diagnostic(`${bocor.length}/${ARAH} arah jatuh tanpa batas`);
});

test('kontrol: lis setinggi mesh-nya (0,34 m) dinaiki, lalu pemain jatuh ke laut', async () => {
  // Alasan batas lis dibuat dinding penuh, dan bukti uji "tertahan di lis"
  // bisa merah: y-nya memang terbaca naik saat lis bisa dinaiki.
  const f = await duniaDari(rekamPendaftaran(), {
    buang: (pemilik) => pemilik === 'losari:batas-bibir',
    tambah: [[[{ bentuk: 'kotak', ukuran: [ANJUNGAN_LEBAR, LIS_TINGGI, LIS_DALAM] }], { x: 0, y: LIS_TINGGI / 2, z: BIBIR_Z }, 'kontrol:lis-setinggi-mesh']],
  });
  const k = buatKarakter(f, { x: 1.5, y: 0, z: BIBIR_Z + 2 });
  let yMaks = -Infinity;
  for (let s = 0; s < 2 * 60; s++) yMaks = Math.max(yMaks, langkahKarakter(k, { dt: LANGKAH, arah: [0, -1] }).kaki.y);
  const akhir = kakiKarakter(k);
  assert.ok(yMaks > LIS_TINGGI - 0.03, `lis 0,34 m tidak dinaiki (y maks ${yMaks.toFixed(3)}) — premis batas lis salah`);
  assert.ok(akhir.y < -0.5, `tidak jatuh ke laut setelah naik lis: ${titik(akhir)}`);
});

test('Losari: lepasKelompok("spot") mengembalikan jumlah collider ke garis dasar, juga saat kembali lagi', async () => {
  const f = new Fisika({ muatRapier });
  await f.muat();
  // Kapsul pemain ikut dihitung di garis dasar — jadi kembali ke `dasar`
  // juga membuktikan kapsulnya tidak ikut terlepas bersama Spot.
  const k = buatKarakter(f, MUNCUL);
  const dasar = f.jumlahDiDunia();
  assert.equal(dasar, 1, 'garis dasar harus berisi kapsul pemain saja');
  const scene = new THREE.Scene();
  for (let kunjungan = 1; kunjungan <= 2; kunjungan++) {
    const runtime = new LosariSpotRuntime();
    runtime.mount(scene, { fisika: f, kelompokFisika: KELOMPOK });
    const terpasang = f.jumlahDiDunia() - dasar;
    assert.ok(terpasang > 0, `kunjungan ${kunjungan}: tidak ada collider terpasang`);
    assert.equal(terpasang, f.hitung()[KELOMPOK]);
    // Urutan Game._syncSpotVisuals saat meninggalkan Spot.
    assert.equal(f.lepasKelompok(KELOMPOK), terpasang);
    runtime.dispose(scene);
    assert.equal(f.jumlahDiDunia(), dasar, `kunjungan ${kunjungan}: collider Spot tertinggal setelah dilepas`);
  }
  lepasKarakter(k);
});

test('Losari: paling banyak tiga PointLight — bara gerobak dan promenade tengah tetap terang', async () => {
  // Menelusuri scene SEKALI di uji — kode produk tidak boleh (ADR-0002).
  const { LosariSpotRuntime } = await import('../src/world/spots/LosariSpotRuntime.js');
  const rt = new LosariSpotRuntime();
  rt.mount(new THREE.Scene(), null);
  const cahaya = [];
  const bohlam = [];
  const tumpuk = [rt.root];
  while (tumpuk.length) {
    const o = tumpuk.pop();
    if (o.isPointLight) cahaya.push(o);
    else if (o.isMesh && o.userData.isLampu) bohlam.push(o);
    tumpuk.push(...o.children);
  }
  assert.ok(cahaya.length >= 1 && cahaya.length <= 3, `${cahaya.length} PointLight di Losari`);
  assert.ok(bohlam.length > cahaya.length, 'bohlam tanpa PointLight ikut hilang?');
  const daftar = rt.getLampu ? rt.getLampu() : rt._lampu;
  for (const l of [...cahaya, ...bohlam]) assert.ok(daftar.includes(l), `${l.type} di luar daftar lampu DayNight`);
  // Tempat orang berhenti: gerobak pisang epe (8; 2,5) dan pusat promenade (0; bibir).
  const dekat = (x, z) => Math.min(...cahaya.map((c) => Math.hypot(c.position.x - x, c.position.z - z)));
  assert.ok(dekat(8, 2.5) <= 2, `gerobak pisang epe gelap: lampu terdekat ${dekat(8, 2.5).toFixed(2)} m`);
  const zPromenade = Math.max(...cahaya.map((c) => -c.position.z)) * -1;
  assert.ok(dekat(0, zPromenade) <= 4.5, `promenade tengah gelap: lampu terdekat ${dekat(0, zPromenade).toFixed(2)} m`);
});
