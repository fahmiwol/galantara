// ═══════════════════════════════════════════════════════
// tests/fisikaSpot-kuta.test.mjs — pantai Kuta dengan collider sungguhan
//
// KutaSpotRuntime dibangun dengan THREE r128 asli (vendor/) dan Rapier asli,
// lalu kapsul pemain dijalankan LANGKAH DEMI LANGKAH. Yang diuji yang dirasakan
// pemain — jatuh, keluar pasir, tertahan, naik, tersendat — bukan daftar
// deskriptor.
//
// Tanpa stub DOM: mount hanya memakai THREE. `ctx.toast` diberi objek kosong
// supaya mount menempuh jalur yang sama dengan Game (membuat InteractionVolume);
// isinya tidak diuji di sini.
//
// Angka pembanding diambil dari konstanta runtime DAN dari mesh yang dibangun
// (Box3), bukan disalin ke berkas ini. Uji yang membandingkan collider dengan
// salinan angkanya sendiri tetap hijau walau mesh sudah pindah (ADR-0016,
// "Yang dibayar"). Karena itu uji penghalang memeriksa dua sisi: tidak
// menembus mesh, DAN tidak tertahan jauh sebelum mesh.
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
  buatKarakter, jalanKarakter, langkahKarakter, kakiKarakter, teleportKarakter, lepasKarakter,
  ruangBebas, cariTempatBerdiri, calonMelingkar, UKURAN_KAPSUL, KECEPATAN, LANGKAH,
} = await import('../src/fisika/Karakter.js');
const {
  KutaSpotRuntime, PANTAI_LEBAR, PANTAI_DALAM, BATAS_LAUT_Z,
} = await import('../src/world/spots/KutaSpotRuntime.js');
const { FISIKA_ALAS_PORTAL } = await import('../src/world/spotWarpPortal.js');
const { sapu } = await import('../tools/fisika/sapu-panjat.mjs');

const muatRapier = () => import(new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);

const KELOMPOK = 'spot';                 // Game: KELOMPOK_SPOT
const JARI = UKURAN_KAPSUL[0] / 2;
const MUNCUL = { x: 0, z: 2 };           // Game._warpToSpot: avatar.teleport(0, 2, 0)
/** Offset pengendali (0,02) menahan pusat sedikit SEBELUM batas; toleransi 1 cm seperti uji Oola. */
const TOL = 0.01;
/** Lantai Kuta: pasir di y 0, pita basah di y 0,04. Di atas ini berarti permukaan benda. */
const LANTAI_MAKS = 0.05;

/**
 * Area yang boleh ditempati PUSAT pemain, diturunkan dari konstanta runtime:
 * dinding darat dan samping menempel di tepi pasir, dinding laut di BATAS_LAUT_Z.
 */
const AREA = Object.freeze({
  xMaks: PANTAI_LEBAR / 2 - JARI,
  zMaks: PANTAI_DALAM / 2 - JARI,
  zMin: BATAS_LAUT_Z + JARI,
});

/** Semua collider Kuta — dirinci di uji pertama. */
const JUMLAH_COLLIDER = 27;

/** Kuta seperti halaman yang dibuka dengan ?spot=kuta: mount dulu, Rapier menyusul (antrean). */
async function kutaSebelumFisikaSiap() {
  const peringatan = [];
  const asli = console.warn;
  console.warn = (...a) => { peringatan.push(a.join(' ')); };
  try {
    const f = new Fisika({ muatRapier });
    const scene = new THREE.Scene();
    const rt = new KutaSpotRuntime();
    rt.mount(scene, { toast: { show() {} }, fisika: f, kelompokFisika: KELOMPOK });
    await f.muat();
    scene.updateMatrixWorld(true);
    return { f, rt, scene, peringatan };
  } finally {
    console.warn = asli;
  }
}

let K;
before(async () => { K = await kutaSebelumFisikaSiap(); });

/** Kotak batas DUNIA sebuah mesh — sumber angka pembanding. */
const kotakDunia = (obj) => new THREE.Box3().setFromObject(obj);

/** Mesh bernama di Spot; gagal keras kalau namanya hilang, bukan menguji kekosongan. */
function mesh(nama) {
  const o = K.rt.root.getObjectByName(nama);
  assert.ok(o, `mesh "${nama}" tidak ditemukan`);
  return o;
}

/** Deskriptor yang BENAR-BENAR didaftarkan runtime untuk satu pemilik — dibaca dari Fisika. */
function deskriptorMilik(pemilik) {
  return (K.f._kelompok.get(KELOMPOK) ?? []).filter((e) => e.pemilik === pemilik).map((e) => e.deskriptor);
}

/**
 * Tinggi lantai di sebuah titik, atau null kalau di situ berdiri benda. Sinar
 * yang mulai di dalam benda tinggi (tiang payung 2,2 m) mengembalikan tinggi
 * awal sinarnya — tanpa pemeriksaan ini titik awal uji diam-diam ditaruh di
 * atas tiang (tertangkap saat mengukur, 16 Sep 2026).
 */
function lantaiDi(k, x, z) {
  const y = k.fisika.tanahDi(x, z, { dari: 2, abaikan: k.collider });
  return y != null && y <= LANTAI_MAKS ? y : null;
}

/**
 * Taruh kaki di permukaan lantai yang sebenarnya. Kapsul yang mulai terbenam
 * (mis. y 0 di atas pita basah 4 cm) membuat uji palsu: pengendali Rapier
 * tidak mendepenetrasi.
 */
function taruh(k, { x, z }) {
  const y = lantaiDi(k, x, z);
  assert.notEqual(y, null, `titik awal (${x.toFixed(2)}, ${z.toFixed(2)}) bukan lantai`);
  teleportKarakter(k, { x, y, z });
  return y;
}

/** Setiap langkah dicatat: posisi akhir saja tidak menjawab "pernah jatuh" atau "pernah keluar". */
function lintasan(k, { detik, arah }) {
  const jejak = [];
  for (let i = 0; i < Math.round(detik / LANGKAH); i++) jejak.push(langkahKarakter(k, { dt: LANGKAH, arah }).kaki);
  return jejak;
}

/** Jarak datar (XZ) dari sebuah titik ke tapak kotak — 0 kalau titiknya di dalam. */
function jarakKeTapak(p, b) {
  const dx = Math.max(b.min.x - p.x, 0, p.x - b.max.x);
  const dz = Math.max(b.min.z - p.z, 0, p.z - b.max.z);
  return Math.hypot(dx, dz);
}

/** Geometri candi bentar dari MESH-nya: undakan terbawah tiap belahan dan anak tangga lorong. */
function geometriCandi() {
  const kotak = mesh('kuta_candi_bentar').children.filter((c) => c.geometry?.type === 'BoxGeometry').map(kotakDunia);
  const belahan = kotak.filter((b) => b.min.y < 0.01 && b.max.y > 0.5);
  const anak = kotak.filter((b) => b.max.y - b.min.y < 0.2);
  assert.equal(belahan.length, 2, 'undakan terbawah belahan');
  assert.equal(anak.length, 3, 'anak tangga lorong');
  return {
    belahan,
    anak,
    /** |x| muka dalam belahan = setengah lebar celah. */
    dalamCelah: Math.min(...belahan.map((b) => Math.min(Math.abs(b.min.x), Math.abs(b.max.x)))),
    zDepan: Math.min(...belahan.map((b) => b.min.z)),
    zBelakang: Math.max(...belahan.map((b) => b.max.z)),
    zUjungTangga: Math.min(...anak.map((b) => b.min.z)),
    yPuncakTangga: Math.max(...anak.map((b) => b.max.y)),
  };
}

test('Kuta: runtime menyatakan tanah dan batasnya sendiri, tanpa peringatan [fisika]', () => {
  // Tanpa penanda ini Game memasang lantai 120 × 120 + cincin 17 m di atasnya.
  assert.equal(K.rt.fisikaTanah, true);
  assert.deepEqual(K.peringatan.filter((p) => p.includes('[fisika]')), []);
  // 2 tanah (pasir, pita basah) + 4 dinding batas + candi bentar (2 belahan,
  // 3 anak tangga) + 4 kelapa × 2 ruas batang + 1 deret papan selancar
  // + 2 tiang payung + 2 kursi + 2 obor + 1 alas portal.
  assert.equal(K.f.hitung()[KELOMPOK], JUMLAH_COLLIDER);
  // Didaftarkan sebelum Rapier siap — semuanya benar-benar terpasang.
  assert.equal(K.f.jumlahDiDunia(), JUMLAH_COLLIDER);
});

test('Kuta: konstanta batas cocok dengan mesh, dan pusat pemain berhenti ≥ 0,1 m di dalam pasir', () => {
  // Geometri THREE menyimpan Float32: toleransi mikrometer, bukan sentimeter.
  const sama = (a, b) => Math.abs(a - b) < 1e-6;
  const pasir = kotakDunia(K.rt.getRaycastTargets()[0]);
  assert.ok(sama(pasir.max.y, 0), `permukaan pasir y ${pasir.max.y}`);
  assert.ok(sama(pasir.max.x, PANTAI_LEBAR / 2) && sama(pasir.min.x, -PANTAI_LEBAR / 2), 'lebar pasir ≠ PANTAI_LEBAR');
  assert.ok(sama(pasir.max.z, PANTAI_DALAM / 2) && sama(pasir.min.z, -PANTAI_DALAM / 2), 'dalam pasir ≠ PANTAI_DALAM');
  // Buih di posisi diamnya (animate belum dipanggil): tepi luarnya = batas laut.
  const buih = kotakDunia(K.rt._buih);
  assert.ok(sama(buih.min.z, BATAS_LAUT_Z), `tepi luar buih ${buih.min.z} ≠ BATAS_LAUT_Z ${BATAS_LAUT_Z}`);

  assert.ok(pasir.max.x - (AREA.xMaks + TOL) >= 0.1, 'sisi samping');
  assert.ok(pasir.max.z - (AREA.zMaks + TOL) >= 0.1, 'sisi darat');
  assert.ok((AREA.zMin - TOL) - pasir.min.z >= 0.1, 'sisi laut');
});

test('Kuta: tanah fisika setinggi permukaan yang TERLIHAT — pasir, pita basah, tiap anak tangga', () => {
  const sinar = (x, z) => K.f.tanahDi(x, z, { dari: 2 });
  const pasir = kotakDunia(K.rt.getRaycastTargets()[0]);
  const basah = kotakDunia(mesh('kuta_pasir_basah'));
  const zBasah = (basah.min.z + basah.max.z) / 2;
  // Titik yang jauh dari prop, supaya sinar mengenai tanah, bukan benda.
  for (const [x, z, harap, nama] of [
    [-10, 1, pasir.max.y, 'pasir kering'],
    [10, -1, pasir.max.y, 'pasir kering'],
    [-10, zBasah, basah.max.y, 'pita basah'],
    [12, basah.min.z + 0.1, basah.max.y, 'pita basah, dekat buih'],
    [12, basah.max.z - 0.1, basah.max.y, 'pita basah, dekat pasir kering'],
  ]) {
    const y = sinar(x, z);
    assert.ok(y != null && Math.abs(y - harap) < 1e-3, `${nama} (${x}, ${z.toFixed(2)}): tanah fisika ${y}, terlihat ${harap.toFixed(3)}`);
  }
  // "Undakan sesuai tingginya": permukaan collider tiap anak tangga = puncak mesh-nya.
  for (const b of geometriCandi().anak) {
    const y = sinar(0, (b.min.z + b.max.z) / 2);
    assert.ok(y != null && Math.abs(y - b.max.y) < 1e-3, `anak tangga ${b.max.y.toFixed(2)}: tanah fisika ${y}`);
  }
});

test('Kuta: titik muncul (0, 2) bebas dan menapak di pasir', () => {
  const k = buatKarakter(K.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    // Syarat minimum: titik bebas ≤ 3 m, dicari dengan calon yang sama dengan
    // Avatar.pastikanBebas.
    const titik = cariTempatBerdiri(k, calonMelingkar(MUNCUL));
    assert.ok(titik, 'tidak ada titik berdiri dalam 3 m dari titik muncul');
    assert.ok(Math.hypot(titik.x - MUNCUL.x, titik.z - MUNCUL.z) <= 3);
    // Yang berlaku sekarang lebih kuat: titik muncul itu sendiri bebas, jadi
    // pastikanBebas tidak memindah pemain. Prop baru di sini = keputusan sadar.
    const r = ruangBebas(k, { ...MUNCUL, y: 0 });
    assert.equal(r.bebas, true, `titik muncul terhalang: ${r.sebab}`);
    assert.ok(Math.abs(r.tanahY) < 0.01, `tanah di titik muncul y ${r.tanahY}`);
    teleportKarakter(k, { ...MUNCUL, y: r.tanahY });
    const h = jalanKarakter(k, { detik: 1 });
    assert.ok(h.menapak && Math.abs(h.kaki.y) < 0.01, `tidak menapak di pasir: ${JSON.stringify(h.kaki)}`);
  } finally { lepasKarakter(k); }
});

test('Kuta: 16 arah dari titik muncul, 6 detik — tidak pernah jatuh, tidak pernah keluar area', () => {
  const k = buatKarakter(K.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      taruh(k, MUNCUL);
      // 6 s × 5,4 m/s = 32 m: cukup untuk sampai ke dinding dari arah mana pun,
      // termasuk yang harus meluncur memutari tangga candi, kursi, dan pohon.
      const jejak = lintasan(k, { detik: 6, arah: [Math.sin(a), Math.cos(a)] });
      const yMin = Math.min(...jejak.map((p) => p.y));
      assert.ok(yMin > -0.5, `arah ${i}: jatuh, y min ${yMin.toFixed(3)}`);
      const keluar = jejak.find((p) => Math.abs(p.x) > AREA.xMaks + TOL || p.z > AREA.zMaks + TOL || p.z < AREA.zMin - TOL);
      assert.equal(keluar, undefined, `arah ${i}: keluar area di ${JSON.stringify(keluar)}`);
      const akhir = jejak.at(-1);
      assert.ok(Math.abs(akhir.x) <= AREA.xMaks + TOL && akhir.z <= AREA.zMaks + TOL && akhir.z >= AREA.zMin - TOL,
        `arah ${i}: berakhir di luar area ${JSON.stringify(akhir)}`);
    }
  } finally { lepasKarakter(k); }
});

test('Kuta: dinding batas berdiri di tempat yang diputuskan — area tidak menyusut diam-diam', () => {
  const k = buatKarakter(K.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    // Lintasan lurus yang bebas rintangan ke tiap dinding.
    const kasus = [
      { nama: 'laut', dari: { x: 0, z: 2 }, arah: [0, -1], sumbu: 'z', harap: AREA.zMin },
      { nama: 'darat', dari: { x: 10, z: 2 }, arah: [0, 1], sumbu: 'z', harap: AREA.zMaks },
      { nama: 'samping +X', dari: { x: 0, z: -0.9 }, arah: [1, 0], sumbu: 'x', harap: AREA.xMaks },
      { nama: 'samping −X', dari: { x: 0, z: -0.9 }, arah: [-1, 0], sumbu: 'x', harap: -AREA.xMaks },
    ];
    for (const c of kasus) {
      taruh(k, c.dari);
      jalanKarakter(k, { detik: 4, arah: c.arah });
      const p = kakiKarakter(k);
      // Offset menahan pusat 2 cm sebelum batas; lebih dari 5 cm = dinding salah tempat.
      assert.ok(Math.abs(p[c.sumbu] - c.harap) < 0.05, `${c.nama}: berhenti di ${p[c.sumbu].toFixed(3)}, harap ${c.harap.toFixed(3)}`);
    }
  } finally { lepasKarakter(k); }
});

test('Kuta: celah candi bentar dilalui — dari darat lewat celah, naik tangga, turun ke pantai', () => {
  const g = geometriCandi();
  // Keputusan: celah ≥ 0,9 m dibiarkan terbuka. Kapsul + offset butuh 0,84.
  assert.ok(2 * g.dalamCelah >= 0.9, `celah ${(2 * g.dalamCelah).toFixed(2)} m`);
  const k = buatKarakter(K.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    // Mulai di antara muka belakang gerbang dan dinding darat. Bukan hanya
    // lurus di sumbu: celah selebar ini harus lolos walau pemain agak menyerong.
    const zAwal = (g.zBelakang + JARI + AREA.zMaks) / 2;
    let jarakMinSemua = Infinity;
    for (const x of [-0.4, 0, 0.4]) {
      for (const derajat of [-10, 0, 10]) {
        const label = `x ${x}, ${derajat}°`;
        const a = Math.PI + (derajat * Math.PI) / 180;
        taruh(k, { x, z: zAwal });
        const jejak = lintasan(k, { detik: 2, arah: [Math.sin(a), Math.cos(a)] });
        // Benar-benar lewat CELAH: ada langkah di antara muka depan dan belakang belahan.
        const diCelah = jejak.filter((p) => p.z >= g.zDepan && p.z <= g.zBelakang);
        assert.ok(diCelah.length > 0 && diCelah.every((p) => Math.abs(p.x) < g.dalamCelah),
          `${label}: tidak lewat celah`);
        // Tidak pernah masuk ke belahan, di SEPANJANG lintasan. Diukur sebagai jarak
        // pusat ke tapak belahan, bukan |x| saja: kapsul bundar yang memutari pojok
        // belahan sah berada lebih dekat ke sumbu muka dalam (uji versi pertama
        // salah di sini — pojok diperlakukan seperti muka rata).
        const jarakMin = Math.min(...jejak.flatMap((p) => g.belahan.map((b) => jarakKeTapak(p, b))));
        assert.ok(jarakMin >= JARI - TOL, `${label}: menembus belahan, jarak ke tapak ${jarakMin.toFixed(3)}`);
        jarakMinSemua = Math.min(jarakMinSemua, jarakMin);
        // Anak tangga 0,16 per langkah dinaiki sampai puncaknya...
        const yMaks = Math.max(...jejak.map((p) => p.y));
        assert.ok(yMaks > g.yPuncakTangga - 0.03, `${label}: tangga tidak dinaiki, y maks ${yMaks.toFixed(3)}`);
        // ...lalu turun dari ujungnya dan terus ke pantai.
        const akhir = jejak.at(-1);
        assert.ok(akhir.z < g.zUjungTangga - JARI, `${label}: tertahan sebelum ujung tangga, z ${akhir.z.toFixed(3)}`);
        assert.ok(akhir.y < 0.06, `${label}: tidak kembali ke pasir, y ${akhir.y.toFixed(3)}`);
      }
    }
    // Pendekatan menyerong meluncur di muka dalam belahan, jadi jarak terdekatnya
    // ke tapak MESH ≈ jari + offset. Lebih jauh = collider belahan menyempitkan celah.
    assert.ok(jarakMinSemua < JARI + 0.05, `collider belahan tidak di muka mesh-nya: jarak terdekat ${jarakMinSemua.toFixed(3)}`);
  } finally { lepasKarakter(k); }
});

test('Kuta: kedua belahan candi padat dari tanah, tepat di muka mesh-nya', () => {
  const g = geometriCandi();
  const k = buatKarakter(K.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    for (const b of g.belahan) {
      const x = (b.min.x + b.max.x) / 2;
      taruh(k, { x, z: (g.zBelakang + JARI + AREA.zMaks) / 2 });
      jalanKarakter(k, { detik: 1, arah: [0, -1] });
      const p = kakiKarakter(k);
      assert.ok(p.z >= b.max.z + JARI - TOL, `belahan x ${x.toFixed(2)}: ditembus sampai z ${p.z.toFixed(3)}`);
      assert.ok(p.z < b.max.z + JARI + 0.05, `belahan x ${x.toFixed(2)}: tertahan jauh sebelum muka mesh, z ${p.z.toFixed(3)}`);
      assert.ok(Math.abs(p.x - x) < 0.01, `belahan x ${x.toFixed(2)}: tergelincir ke x ${p.x.toFixed(3)}`);
    }
  } finally { lepasKarakter(k); }
});

test('Kuta: kursi berjemur dan alas portal tidak bisa dipanjat — 160 pendekatan (sapu-panjat)', async () => {
  const kursi = deskriptorMilik('kuta_kursi_0');
  assert.equal(kursi.length, 1, 'kursi 0 terdaftar sebagai satu volume');
  assert.deepEqual(deskriptorMilik('kuta_kursi_1'), kursi, 'kedua kursi satu volume yang sama');
  const portal = deskriptorMilik('kuta_portal');
  assert.equal(portal.length, 1);
  const { bentuk, ukuran, letak } = portal[0];
  assert.deepEqual({ bentuk, ukuran, letak }, { ...FISIKA_ALAS_PORTAL[0] }, 'alas portal harus deskriptor bersama');

  for (const [nama, d, jauh] of [['kursi berjemur', kursi[0], 2.3], ['alas portal', portal[0], 2.1]]) {
    // Aturan kerja: benda yang tidak boleh dinaiki dan lebih rendah dari ±0,55 m
    // diberi volume ≥ 0,70 — 0,60 masih terpanjat pada silinder sempit.
    assert.ok(d.ukuran[1] >= 0.7, `${nama}: volume ${d.ukuran[1]} m, aturan ≥ 0,70`);
    const h = await sapu(d, { jauh });
    assert.equal(h.dipanjat, 0, `${nama}: dipanjat ${h.dipanjat}/${h.total}, kaki maks ${h.kakiMaks.toFixed(3)} m`);
  }
});

test('Kuta: deret papan selancar satu volume — celah antarpapan tidak bisa diselipi', () => {
  const kotak = [0, 1, 2, 3].map((i) => kotakDunia(mesh(`kuta_papan_${i}`)));
  const zLaut = Math.min(...kotak.map((b) => b.min.z));
  const zDarat = Math.max(...kotak.map((b) => b.max.z));
  // Tengah tiap papan DAN tengah tiap celah 0,45 m di antaranya (lebih sempit dari kapsul).
  const xUji = [
    ...kotak.map((b) => (b.min.x + b.max.x) / 2),
    ...kotak.slice(0, 3).map((b, i) => (b.max.x + kotak[i + 1].min.x) / 2),
  ];
  const k = buatKarakter(K.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    for (const x of xUji) {
      taruh(k, { x, z: zLaut - 1.2 });
      jalanKarakter(k, { detik: 1, arah: [0, 1] });
      const dariLaut = kakiKarakter(k).z;
      taruh(k, { x, z: zDarat + 1.2 });
      jalanKarakter(k, { detik: 1, arah: [0, -1] });
      const dariDarat = kakiKarakter(k).z;
      // Tertahan di muka papan: tidak menembus, dan tidak tertahan jauh sebelumnya.
      assert.ok(dariLaut <= zLaut - JARI + TOL && dariLaut > zLaut - JARI - 0.05,
        `x ${x.toFixed(2)} dari laut: berhenti di z ${dariLaut.toFixed(3)}, muka ${zLaut.toFixed(3)}`);
      assert.ok(dariDarat >= zDarat + JARI - TOL && dariDarat < zDarat + JARI + 0.05,
        `x ${x.toFixed(2)} dari darat: berhenti di z ${dariDarat.toFixed(3)}, muka ${zDarat.toFixed(3)}`);
    }
  } finally { lepasKarakter(k); }
});

test('Kuta: tiang payung dan batang obor menahan di tiangnya', () => {
  // Arah pendekatan i/8 putaran (0 = dari +Z). Sisi darat tiang payung ditempati
  // kursinya: dari 8 titik awal, dua jatuh DI ATAS kursi dan satu menempel kursi
  // (terukur). Tiang payung didekati dari lima arah sisanya; obor dari delapan.
  const kasus = [
    ['kuta_payung_0', [2, 3, 4, 5, 6]],
    ['kuta_payung_1', [2, 3, 4, 5, 6]],
    ['kuta_obor_-14', [0, 1, 2, 3, 4, 5, 6, 7]],
    ['kuta_obor_14', [0, 1, 2, 3, 4, 5, 6, 7]],
  ];
  const k = buatKarakter(K.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    for (const [nama, daftarArah] of kasus) {
      const t = mesh(nama);
      const jariMesh = t.geometry.parameters.radiusBottom;
      for (const i of daftarArah) {
        const a = (i / 8) * Math.PI * 2;
        const dari = { x: t.position.x + Math.sin(a) * 1.2, z: t.position.z + Math.cos(a) * 1.2 };
        const y = taruh(k, dari);
        assert.equal(ruangBebas(k, { ...dari, y }).bebas, true, `${nama} arah ${i}: titik awal terhalang`);
        let jarakMin = Infinity;
        for (const p of lintasan(k, { detik: 0.75, arah: [-Math.sin(a), -Math.cos(a)] })) {
          jarakMin = Math.min(jarakMin, Math.hypot(p.x - t.position.x, p.z - t.position.z));
        }
        assert.ok(jarakMin >= jariMesh + JARI - 0.03, `${nama} arah ${i}: menembus tiang, ${jarakMin.toFixed(3)}`);
        assert.ok(jarakMin < jariMesh + JARI + 0.15, `${nama} arah ${i}: tertahan jauh dari tiang, ${jarakMin.toFixed(3)}`);
      }
    }
  } finally { lepasKarakter(k); }
});

test('Kuta: kelapa menahan di batangnya, bukan di pelepahnya', () => {
  const pohon = K.rt.root.children.filter((c) => c.name.startsWith('kuta_kelapa_'));
  assert.equal(pohon.length, 4);
  const k = buatKarakter(K.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    for (const p of pohon) {
      // Ruas pertama tegak di pangkal. Kelapa condong ke +X, jadi dari −X yang
      // pertama tersentuh memang pangkalnya.
      const jariPangkal = p.children[0].geometry.parameters.radiusBottom;
      taruh(k, { x: p.position.x - 1.5, z: p.position.z });
      let jarakMin = Infinity;
      for (const q of lintasan(k, { detik: 1, arah: [1, 0] })) {
        jarakMin = Math.min(jarakMin, Math.hypot(q.x - p.position.x, q.z - p.position.z));
      }
      assert.ok(jarakMin >= jariPangkal + JARI - 0.03, `${p.name}: menembus batang, ${jarakMin.toFixed(3)}`);
      assert.ok(jarakMin < jariPangkal + JARI + 0.15, `${p.name}: tertahan jauh dari batang (pelepah padat?), ${jarakMin.toFixed(3)}`);
    }
  } finally { lepasKarakter(k); }
});

test('Kuta: jalan di pasir dan pita basah tidak tersendat; tepi 4 cm tidak memakan langkah', () => {
  const k = buatKarakter(K.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    // Lintasan lurus bebas rintangan: tiap langkah bergerak ≥ 0,08 m (dari 0,09).
    for (const [dari, arah, nama] of [
      [{ x: -15, z: -0.9 }, [1, 0], 'pasir kering'],
      [{ x: -15, z: -3.4 }, [1, 0], 'pita basah +X'],
      [{ x: 15, z: -3.4 }, [-1, 0], 'pita basah −X'],
    ]) {
      taruh(k, dari);
      let sebelum = kakiKarakter(k);
      let tersendat = 0;
      for (const p of lintasan(k, { detik: 5, arah })) {
        if (Math.hypot(p.x - sebelum.x, p.z - sebelum.z) < 0.08) tersendat++;
        sebelum = p;
      }
      assert.equal(tersendat, 0, `${nama}: ${tersendat} langkah tersendat`);
    }
    // Menyeberang tepi pita basah: langkah yang naik 4 cm membelokkan sebagian
    // geraknya ke atas (datar turun ke ±0,078 m) — itu naik, bukan tersendat.
    // Yang dijaga: jarak tempuh yang hilang kurang dari satu langkah.
    for (const [dari, arah, nama] of [
      [{ x: -10, z: -1.0 }, [0, -1], 'kering → basah'],
      [{ x: -10, z: -4.3 }, [0, 1], 'basah → kering'],
      [{ x: 10, z: -1.0 }, [0, -1], 'kering → basah, x 10'],
    ]) {
      taruh(k, dari);
      const detik = 0.6;
      const akhir = lintasan(k, { detik, arah }).at(-1);
      const tempuh = Math.hypot(akhir.x - dari.x, akhir.z - dari.z);
      assert.ok(KECEPATAN * detik - tempuh < KECEPATAN * LANGKAH,
        `${nama}: tempuh ${tempuh.toFixed(3)} m dari ${(KECEPATAN * detik).toFixed(3)} m`);
    }
  } finally { lepasKarakter(k); }
});

test('Kuta: pindah Spot melepas semua collider-nya — jumlah di dunia kembali ke garis dasar', async () => {
  // Skenario warp: Rapier sudah siap dan kapsul pemain sudah ada SEBELUM mount.
  const f = new Fisika({ muatRapier });
  await f.muat();
  const k = buatKarakter(f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    const garisDasar = f.jumlahDiDunia();
    const scene = new THREE.Scene();
    const rt = new KutaSpotRuntime();
    rt.mount(scene, { toast: { show() {} }, fisika: f, kelompokFisika: KELOMPOK });
    assert.equal(f.jumlahDiDunia(), garisDasar + JUMLAH_COLLIDER);
    // Urutan Game._syncSpotVisuals: lepasKelompok, lalu dispose.
    assert.equal(f.lepasKelompok(KELOMPOK), JUMLAH_COLLIDER);
    rt.dispose(scene);
    assert.equal(f.jumlahDiDunia(), garisDasar);
    assert.equal(f.hitung()[KELOMPOK], undefined);
  } finally { lepasKarakter(k); }
});
