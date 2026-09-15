// ═══════════════════════════════════════════════════════
// tests/fisikaSpot-malioboro.test.mjs — Spot Malioboro dengan collider sungguhan
//
// MalioboroSpotRuntime dibangun dengan THREE r128 asli (vendor/) dan Rapier
// asli, lalu dijalani seperti pemain: muncul di (0, 2), berjalan ke enam belas
// arah, berdiri dari tiap tikar lesehan, dan Spot dilepas seperti saat warp.
//
// Semua batas dihitung dari konstanta runtime (JALAN_LEBAR, JALAN_PANJANG) dan
// ukuran kapsul, bukan angka yang diketik ulang — kalau jalannya diubah,
// ujinya ikut.
//
// Tanpa stub DOM, karena memang tidak perlu: runtime ini tidak menyentuh
// document atau canvas. THREE.GLTFLoader tidak ada di build inti, jadi
// MejaNongkrong memakai tikar sementaranya — jalur yang sama dengan GLB yang
// gagal dimuat di browser, dan tikar tidak punya collider di kedua jalur.
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
  buatKarakter, jalanKarakter, langkahKarakter, lepasKarakter, teleportKarakter,
  ruangBebas, cariTempatBerdiri, calonMelingkar, UKURAN_KAPSUL, LANGKAH, PARAM, KECEPATAN,
} = await import('../src/fisika/Karakter.js');
const { MalioboroSpotRuntime, JALAN_LEBAR, JALAN_PANJANG } = await import('../src/world/spots/MalioboroSpotRuntime.js');
const { DayNight } = await import('../src/world/DayNight.js');

const muatRapier = () => import(new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);

/** Sama dengan KELOMPOK_SPOT di src/core/Game.js (tidak diekspor; Game butuh DOM). */
const KELOMPOK = 'spot';
/** Titik muncul setelah warp: Game memanggil avatar.teleport(0, 2, 0). */
const MUNCUL = { x: 0, y: 0, z: 2 };
const JARI = UKURAN_KAPSUL[0] / 2;

/**
 * 1 tanah + 4 dinding batas + 10 tiang lampu + 2 meja kios + 1 alas portal
 * + 3 dulang lesehan (didaftarkan MejaNongkrong, sekali per tikar).
 */
const COLLIDER_SPOT = 21;

/** Spot Malioboro terpasang di dunia fisika yang sudah siap — jalur warp. */
let S;
before(async () => {
  const peringatan = [];
  const asli = console.warn;
  console.warn = (...a) => { peringatan.push(a.join(' ')); };
  try {
    const f = new Fisika({ muatRapier });
    await f.muat();
    const garisDasar = f.jumlahDiDunia();
    const scene = new THREE.Scene();
    const rt = new MalioboroSpotRuntime();
    // ctx sama bentuknya dengan yang dikirim Game._syncSpotVisuals.
    rt.mount(scene, {
      toast: { show() {} },
      openPanel() {},
      fisika: f,
      kelompokFisika: KELOMPOK,
    });
    S = { f, rt, scene, garisDasar, peringatan };
  } finally {
    console.warn = asli;
  }
});

test('Malioboro: menyatakan tanahnya sendiri, tanpa peringatan [fisika]', () => {
  assert.equal(S.rt.fisikaTanah, true,
    'tanpa fisikaTanah Game menambah lantai 120 × 120 + cincin 17 m di atas collider Spot');
  assert.deepEqual(S.peringatan.filter((p) => p.includes('[fisika]')), []);
  assert.equal(S.f.hitung()[KELOMPOK], COLLIDER_SPOT);
  assert.equal(S.f.jumlahDiDunia(), S.garisDasar + COLLIDER_SPOT);
});

test('Malioboro: titik muncul (0, 2) punya tempat berdiri di permukaan jalan', (t) => {
  const k = buatKarakter(S.f, MUNCUL);
  try {
    const r = ruangBebas(k, MUNCUL);
    const titik = r.bebas
      ? { x: MUNCUL.x, y: r.tanahY, z: MUNCUL.z }
      : cariTempatBerdiri(k, calonMelingkar(MUNCUL));
    assert.ok(titik, `tidak ada titik berdiri dalam 3 m dari titik muncul (${r.sebab})`);
    const geser = Math.hypot(titik.x - MUNCUL.x, titik.z - MUNCUL.z);
    assert.ok(geser <= 3 + 1e-9, `titik berdiri terdekat ${geser.toFixed(2)} m dari titik muncul`);
    // Balok jalan berpusat di y = −0,45 dengan tebal 0,9: permukaannya y = 0.
    assert.ok(Math.abs(titik.y) < 0.01, `tanah di titik muncul y=${titik.y}`);

    teleportKarakter(k, titik);
    const h = jalanKarakter(k, { detik: 1 });
    assert.ok(h.menapak && Math.abs(h.kaki.y) < 0.03, `tidak menapak di jalan: ${JSON.stringify(h)}`);
    t.diagnostic(`titik muncul ${r.bebas ? 'bebas' : `terhalang (${r.sebab}), dipindah ${geser.toFixed(2)} m`}`);
  } finally { lepasKarakter(k); }
});

test('Malioboro: enam belas arah, enam detik — tidak pernah jatuh, tidak keluar jalan', (t) => {
  // Syarat: pusat pemain berhenti ≥ 0,1 m di dalam tepi permukaan yang terlihat.
  const batasX = JALAN_LEBAR / 2 - 0.1;
  const batasZ = JALAN_PANJANG / 2 - 0.1;
  // Rancangan runtime lebih ketat: dinding tepat di tepi balok, jadi pusat
  // pemain diam di jari kapsul + offset dari tepi. Ini yang menangkap dinding
  // yang digeser keluar, yang masih lolos syarat 0,1 m di atas.
  //
  // Toleransinya SATU LANGKAH GERAK, dengan alasan terukur (15 Sep 2026):
  // saat kapsul menyentuh tanah dan dinding sekaligus, pengendali Rapier 0.20
  // kadang menyelesaikan kontak tanah lebih dulu dan menerapkan sisa langkah
  // menembus kulit dinding (lintasan: toi tanah 0,0338 = geser x −0,0297 di
  // langkah itu). Terbesar 9,09 cm dari ±1,5 juta langkah, tidak menumpuk,
  // dan TIDAK bergantung kedalaman kaki dinding: diukur di delapan kedalaman,
  // urutan terbaik-terburuknya berbalik begitu titik awal digeser.
  const selip = KECEPATAN * LANGKAH + 0.005;
  const badanX = JALAN_LEBAR / 2 - JARI - PARAM.offset + selip;
  const badanZ = JALAN_PANJANG / 2 - JARI - PARAM.offset + selip;

  const k = buatKarakter(S.f, MUNCUL);
  const catatan = [];
  let maksX = 0;
  let maksZ = 0;
  let minY = Infinity;
  try {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      const arah = [Math.sin(a), Math.cos(a)];
      teleportKarakter(k, MUNCUL);
      // 6 detik × 5,4 m/s = 32 m: cukup mencapai tepi dari arah mana pun,
      // termasuk yang harus meluncur menyusuri dinding sampai ke sudut.
      let kaki = null;
      for (let n = 0; n < 6 * 60; n++) {
        ({ kaki } = langkahKarakter(k, { dt: LANGKAH, arah }));
        if (!(kaki.y > -0.5)) {
          assert.fail(`arah ${i}, langkah ${n}: jatuh, y=${kaki.y.toFixed(3)} di (${kaki.x.toFixed(3)}, ${kaki.z.toFixed(3)})`);
        }
        minY = Math.min(minY, kaki.y);
        maksX = Math.max(maksX, Math.abs(kaki.x));
        maksZ = Math.max(maksZ, Math.abs(kaki.z));
      }
      assert.ok(Math.abs(kaki.x) <= batasX && Math.abs(kaki.z) <= batasZ,
        `arah ${i}: berakhir di luar permukaan jalan (${kaki.x.toFixed(3)}, ${kaki.z.toFixed(3)}); batas ±${batasX} × ±${batasZ}`);
      catatan.push(`${i}:(${kaki.x.toFixed(2)},${kaki.z.toFixed(2)})`);
    }
    assert.ok(maksX <= badanX && maksZ <= badanZ,
      `pusat pemain melewati posisi diam di dinding lebih dari satu langkah: |x| maks ${maksX.toFixed(3)} (batas ${badanX.toFixed(3)}), |z| maks ${maksZ.toFixed(3)} (batas ${badanZ.toFixed(3)}) — dinding digeser keluar tepi?`);
    t.diagnostic(`|x| maks ${maksX.toFixed(3)} · |z| maks ${maksZ.toFixed(3)} · y min ${minY.toFixed(4)}`);
    t.diagnostic(`posisi akhir ${catatan.join(' ')}`);
  } finally { lepasKarakter(k); }
});

test('Malioboro: tiap mesh setinggi badan punya collider di tempatnya, tidak lebih gemuk dari mesh-nya', () => {
  // ADR-0016 mencatat belum ada uji yang membandingkan collider dengan mesh.
  // Ini versi murahnya untuk Spot ini: mesh yang MULAI di bawah kepala (< 1,4 m)
  // dan MENJULANG di atas batas naik tangga harus terhalang di pusat tapaknya,
  // dan titik tepat di luar tapaknya harus muat untuk kapsul. Yang lebih rendah
  // boleh dinaiki; yang lebih tinggi ada di atas kepala.
  // Satu-satunya pengecualian adalah keputusan tertulis di runtime: cincin portal
  // berputar, hanya alasnya yang padat.
  const k = buatKarakter(S.f, MUNCUL);
  const kotak = new THREE.Box3();
  const titikUji = new S.f.R.Ball(0.02);
  S.rt.root.updateMatrixWorld(true);
  S.f.segarkan();
  let diperiksa = 0;
  try {
    const tumpuk = [S.rt.root];
    while (tumpuk.length) {
      const o = tumpuk.pop();
      tumpuk.push(...o.children);
      if (!o.isMesh || o === S.rt._warpRing) continue;
      kotak.setFromObject(o);
      if (kotak.max.y <= PARAM.naikTangga || kotak.min.y >= 1.4) continue;
      diperiksa++;

      const cx = (kotak.min.x + kotak.max.x) / 2;
      const cz = (kotak.min.z + kotak.max.z) / 2;
      const cy = (Math.max(kotak.min.y, 0) + Math.min(kotak.max.y, 1.3)) / 2;
      const kena = S.f.w.intersectionWithShape(
        { x: cx, y: cy, z: cz }, { x: 0, y: 0, z: 0, w: 1 }, titikUji, undefined, undefined, k.collider,
      );
      assert.ok(kena, `mesh setinggi badan di (${cx.toFixed(2)}, ${cy.toFixed(2)}, ${cz.toFixed(2)}) bisa ditembus`);

      // Selangkah di luar tapak mesh, ke arah sumbu jalan.
      const arah = cx > 0 ? -1 : 1;
      const luar = { x: cx + arah * ((kotak.max.x - kotak.min.x) / 2 + JARI + 0.05), y: 0, z: cz };
      const r = ruangBebas(k, luar);
      assert.ok(r.bebas,
        `collider mesh di (${cx.toFixed(2)}, ${cz.toFixed(2)}) lebih gemuk dari mesh-nya: (${luar.x.toFixed(2)}, ${luar.z.toFixed(2)}) ${r.sebab}`);
    }
    // 10 tiang lampu + 2 meja kios + 1 alas portal. Kalau filternya rusak dan
    // tidak memeriksa apa pun, uji ini harus gagal, bukan hijau.
    assert.equal(diperiksa, 13);
  } finally { lepasKarakter(k); }
});

test('Malioboro: tiap kursi lesehan punya titik berdiri yang muat', () => {
  // Aturan permainan yang sama dengan Game._bolehBerdiriDi: titik di radius
  // kursi mana pun ditolak, karena keterisian diturunkan dari posisi.
  const boleh = (p) => S.rt.meja.every((m) => m.kursi.every(
    (kur) => Math.hypot(p.x - kur.x, p.z - kur.z) > m.toleransiKursi + 0.08,
  ));
  const k = buatKarakter(S.f, MUNCUL);
  try {
    assert.ok(S.rt.meja.length > 0, 'Spot tanpa meja — uji ini tidak menguji apa pun');
    for (const m of S.rt.meja) {
      for (const kur of m.kursi) {
        const titik = cariTempatBerdiri(k, kur.keluar);
        assert.ok(titik, `${m.id} kursi ${kur.i}: tidak ada titik berdiri yang muat`);
        assert.ok(Math.abs(titik.y) < 0.02, `${m.id} kursi ${kur.i}: berdiri di atas sesuatu, y=${titik.y}`);
        assert.ok(cariTempatBerdiri(k, kur.keluar, { boleh }),
          `${m.id} kursi ${kur.i}: titik yang muat semuanya masih di radius kursi — berdiri akan gagal di Game`);
      }
    }
  } finally { lepasKarakter(k); }
});

test('Malioboro: paling banyak tiga PointLight, bohlam lain tetap ikut siklus hari', () => {
  // Ditelusuri SEKALI di uji. Kode produk tidak boleh menyapu scene (PRD BAB 2.4).
  const cahaya = [];
  const bohlam = [];
  const tumpuk = [S.rt.root];
  while (tumpuk.length) {
    const o = tumpuk.pop();
    if (o.isPointLight) cahaya.push(o);
    else if (o.isMesh && o.userData.isLampu) bohlam.push(o);
    tumpuk.push(...o.children);
  }
  assert.ok(cahaya.length > 0 && cahaya.length <= 3, `${cahaya.length} PointLight di root Spot`);
  assert.ok(bohlam.length > cahaya.length, `hanya ${bohlam.length} bohlam — bohlam tanpa PointLight hilang?`);

  // Tiap TEMPAT ORANG BERHENTI (lesehan, kios) ada dalam 5 m dari satu
  // PointLight — jangkauannya 7 m dengan decay 2, jadi di 5 m kolamnya masih
  // terbaca. Versi pertama menjaga pola "bergantian sisi" dari brief, dan pola
  // itu membuat kedua kios gelap di malam hari (kios z 8,5 ≥ 8,1 m dari semua
  // lampu). Yang dijaga sekarang fungsinya, bukan polanya.
  const titikKumpul = [
    ...S.rt.meja.map((m) => ({ nama: m.id, x: m.x, z: m.z })),
    ...S.rt.interactionVolumes.filter((v) => /kios|batik|oleh/i.test(v.id)).map((v) => ({ nama: v.id, x: v.cx, z: v.cz })),
  ];
  assert.ok(titikKumpul.length >= 4, `titik kumpul yang ditemukan uji hanya ${titikKumpul.length}`);
  for (const t of titikKumpul) {
    const terdekat = Math.min(...cahaya.map((c) => Math.hypot(c.position.x - t.x, c.position.z - t.z)));
    assert.ok(terdekat <= 5, `${t.nama} (${t.x.toFixed(1)}, ${t.z.toFixed(1)}) gelap di malam hari: lampu terdekat ${terdekat.toFixed(2)} m`);
  }

  // Semua lampu yang ada di scene juga ada di daftar DayNight — kalau tidak,
  // ia menyala terus di siang hari atau padam terus di malam hari.
  const daftar = S.rt.getLampu();
  for (const l of [...cahaya, ...bohlam]) assert.ok(daftar.includes(l), `${l.type} di luar getLampu()`);

  // DayNight tanpa renderer hanya menyentuh lampu. _applyTime dipakai langsung
  // karena update() membaca jam dinding dan tidak deterministik.
  const dn = new DayNight({});
  dn.pakaiLampu(daftar);
  dn._applyTime(12);
  const siang = bohlam.map((b) => b.material.emissiveIntensity);
  for (const c of cahaya) assert.equal(c.intensity, 0, 'PointLight menyala di siang hari');
  dn._applyTime(21);
  bohlam.forEach((b, i) => {
    assert.ok(b.material.emissiveIntensity > siang[i] + 1,
      `bohlam ${i} tidak menyala di malam hari: ${siang[i]} → ${b.material.emissiveIntensity}`);
  });
  for (const c of cahaya) assert.ok(c.intensity > 1, `PointLight redup di malam hari: ${c.intensity}`);
});

test('Malioboro: melepas kelompok Spot mengembalikan dunia fisika ke garis dasar', () => {
  // Urutan yang sama dengan Game._syncSpotVisuals saat warp keluar.
  assert.equal(S.f.lepasKelompok(KELOMPOK), COLLIDER_SPOT);
  assert.equal(S.f.jumlahDiDunia(), S.garisDasar);
  S.rt.dispose(S.scene);
  assert.equal(S.rt.getLampu().length, 0);
});
