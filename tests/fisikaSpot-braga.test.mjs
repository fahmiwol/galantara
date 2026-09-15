// ═══════════════════════════════════════════════════════
// tests/fisikaSpot-braga.test.mjs — Spot Braga dengan collider sungguhan
//
// BragaSpotRuntime dibangun dengan THREE r128 asli (vendor/) dan didaftarkan ke
// Rapier asli, lalu dijalani kapsul pemain yang sama dengan di browser. Yang
// diuji adalah yang dirasakan pemain: tanah setinggi yang terlihat, titik
// muncul yang bebas, tidak ada jalan keluar alas ke arah mana pun, tepi aspal
// yang tidak tersendat, ruko/tiang/alas portal yang padat dan tidak bisa
// dipanjat, kursi kafe yang bisa ditinggalkan, anggaran PointLight, dan
// collider yang benar-benar hilang saat pindah Spot.
//
// Tanpa stub DOM: runtime ini tidak membuat canvas atau elemen apa pun. `toast`
// di ctx hanya penerima pesan, bentuknya sama dengan yang dikirim Game.
// Batas dan permukaan dihitung dari konstanta runtime dan kotak mesh yang
// dibangunnya, bukan angka yang diketik ulang (ADR-0012).
//
// Instrumennya diperiksa, bukan dipercaya: tiap uji dijalankan terhadap 19
// mutasi runtime (tanpa batas, batas 0,4 m kelebihan, tanpa collider aspal,
// tonjolan etalase hilang/terbalik, 10 PointLight, alas portal setinggi mesh,
// dll.) dan semuanya merah — 15 Sep 2026. Uji panjat punya kontrol di dalamnya.
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
  buatKarakter, jalanKarakter, langkahKarakter, kakiKarakter, teleportKarakter,
  ruangBebas, cariTempatBerdiri, calonMelingkar, lepasKarakter,
  UKURAN_KAPSUL, KECEPATAN, LANGKAH,
} = await import('../src/fisika/Karakter.js');
const {
  BragaSpotRuntime, TOTAL_LEBAR, JALAN_LEBAR, JALAN_PANJANG, TROTOAR_LEBAR,
} = await import('../src/world/spots/BragaSpotRuntime.js');
const { DayNight } = await import('../src/world/DayNight.js');

const muatRapier = () => import(new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);

/** Sama dengan KELOMPOK_SPOT di Game.js. */
const KELOMPOK = 'spot';
const JARI = UKURAN_KAPSUL[0] / 2;
/** Syarat batas: pusat pemain berhenti sekurangnya 0,1 m di dalam tepi alas. */
const TEPI_MIN = 0.1;
/** Titik muncul setelah warp — Avatar.teleport(0, 2) di Game._warpToSpot. */
const MUNCUL = { x: 0, z: 2 };
/** Sintesis suasana 15 Sep 2026, baris "Braga §3 butir 3". */
const ANGGARAN_POINTLIGHT = 3;
/**
 * Kaki ≥ 5 cm di atas lantai = naik ke atas sesuatu. Transien normal saat
 * melintasi tepi aspal 2 cm terukur ≤ 1,1 cm di atas aspal, dan bergeser
 * beberapa mm menurut riwayat simulasi dalam proses yang sama (hasilnya
 * deterministik untuk urutan yang sama). Benda terendah yang bisa diinjak
 * selain tanah ada di 0,60 m, jadi 5 cm tidak menyembunyikan pemanjatan.
 */
const TERANGKAT = 0.05;

/** Kotak dunia sebuah objek — permukaan yang TERLIHAT. */
const kotakDunia = (o) => new THREE.Box3().setFromObject(o);

/**
 * Spot Braga seperti yang dipasang Game._syncSpotVisuals. Collider didaftarkan
 * SEBELUM fisika siap: di browser Spot dari `?spot=` di-mount lewat
 * queueMicrotask, sedangkan Rapier baru dimuat di Game._muatFisika (setTimeout).
 * Semua `daftarkan` dicatat lewat pembungkus yang tetap memanggil aslinya.
 */
async function braga() {
  const peringatan = [];
  const asli = console.warn;
  console.warn = (...a) => { peringatan.push(a.join(' ')); };
  try {
    const f = new Fisika({ muatRapier });
    const catatan = [];
    const daftarkanAsli = f.daftarkan.bind(f);
    f.daftarkan = (kelompok, deskriptor, induk, putarY, pemilik) => {
      const n = daftarkanAsli(kelompok, deskriptor, induk, putarY, pemilik);
      catatan.push({ kelompok, pemilik, n });
      return n;
    };
    const scene = new THREE.Scene();
    const rt = new BragaSpotRuntime();
    rt.mount(scene, { toast: { show() {} }, openPanel() {}, fisika: f, kelompokFisika: KELOMPOK });
    await f.muat();
    scene.updateMatrixWorld(true);
    const targets = rt.getRaycastTargets();
    const alas = targets.find((m) => m.geometry.parameters.width === TOTAL_LEBAR);
    const aspal = targets.find((m) => m.geometry.parameters.width === JALAN_LEBAR);
    return {
      f, rt, scene, peringatan, catatan,
      trotoarY: kotakDunia(alas).max.y,
      aspalY: kotakDunia(aspal).max.y,
      kotakAspal: kotakDunia(aspal),
      kotakAlas: kotakDunia(alas),
    };
  } finally {
    console.warn = asli;
  }
}

let B;
before(async () => { B = await braga(); });

/** Titik muncul yang dipakai Avatar.pastikanBebas: (0, 2) kalau bebas, kalau tidak titik bebas terdekat. */
function titikMuncul(k) {
  const r = ruangBebas(k, { ...MUNCUL, y: 0 });
  if (r.bebas) return { titik: { x: MUNCUL.x, y: r.tanahY, z: MUNCUL.z }, langsung: true };
  return { titik: cariTempatBerdiri(k, calonMelingkar(MUNCUL)), langsung: false, sebab: r.sebab };
}

test('Braga: menyatakan tanahnya sendiri, semua collider terpasang dari antrean, tanpa peringatan [fisika]', (t) => {
  assert.equal(B.rt.fisikaTanah, true, 'tanpa penanda ini Game menimpa dengan tanah datar + cincin 17 m');
  assert.deepEqual(B.peringatan.filter((p) => p.includes('[fisika]')), []);
  const n = B.f.hitung()[KELOMPOK];
  assert.ok(n > 0, 'tidak ada collider di kelompok Spot');
  assert.equal(B.f.jumlahDiDunia(), n, 'collider yang didaftarkan sebelum fisika siap tidak semuanya dipasang');
  assert.ok(B.catatan.every((c) => c.kelompok === KELOMPOK), 'ada collider di luar kelompok Spot — tidak ikut dilepas saat warp');

  // Meja kafe mendaftarkan dirinya sendiri; runtime tidak boleh menggandakannya.
  for (const meja of B.rt.meja) {
    const milik = B.catatan.filter((c) => c.pemilik === meja.id);
    assert.equal(milik.length, 1, `${meja.id}: didaftarkan ${milik.length} kali`);
    assert.equal(milik[0].n, meja.deskriptorFisika().length);
  }

  const jenis = {};
  for (const c of B.catatan) {
    const kunci = c.pemilik.replace(/_\d+$/, '').replace(/_(barat|timur)$/, '');
    jenis[kunci] = (jenis[kunci] ?? 0) + c.n;
  }
  t.diagnostic(`collider per jenis: ${JSON.stringify(jenis)} · total ${n}`);
});

test('Braga: tanah fisika setinggi permukaan yang terlihat — trotoar dan aspal', () => {
  const { f, kotakAlas, kotakAspal, trotoarY, aspalY } = B;
  // Tengah trotoar TIMUR: di luar aspal, sebelum ruko, dan tanpa meja kafe
  // (meja ada di barat). Tengah jalan: aspal, garis cat tanpa collider.
  const xTrotoar = (kotakAspal.max.x + kotakAlas.max.x) / 2;
  assert.ok(Math.abs(aspalY - trotoarY) > 0.005, 'uji ini tidak bisa membedakan aspal dari trotoar');
  // Ujung jalan dihindari: portal ada di sana.
  for (const z of [-16, -8, 0, 8]) {
    const tTrotoar = f.tanahDi(xTrotoar, z);
    const tAspal = f.tanahDi(0, z);
    assert.ok(tTrotoar !== null && Math.abs(tTrotoar - trotoarY) < 1e-3,
      `trotoar (${xTrotoar}, ${z}): tanah fisika ${tTrotoar}, terlihat ${trotoarY}`);
    assert.ok(tAspal !== null && Math.abs(tAspal - aspalY) < 1e-3,
      `aspal (0, ${z}): tanah fisika ${tAspal}, terlihat ${aspalY}`);
  }
});

test('Braga: titik muncul (0, 2) bebas, atau ada titik bebas ≤ 3 m, dan pemain menapak di sana', (t) => {
  const k = buatKarakter(B.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    const { titik, langsung, sebab } = titikMuncul(k);
    t.diagnostic(langsung ? `(0, 2) bebas, tanah y=${titik.y.toFixed(3)}` : `(0, 2) terhalang (${sebab}), dipindah ke ${JSON.stringify(titik)}`);
    assert.ok(titik, 'tidak ada titik berdiri dalam 3 m dari titik muncul');
    assert.ok(Math.hypot(titik.x - MUNCUL.x, titik.z - MUNCUL.z) <= 3 + 1e-9);
    teleportKarakter(k, titik);
    const h = jalanKarakter(k, { detik: 1 });
    const tanah = B.f.tanahDi(titik.x, titik.z, { abaikan: k.collider });
    assert.ok(h.menapak && Math.abs(h.kaki.y - tanah) < 0.03,
      `tidak menapak di titik muncul: kaki y=${h.kaki.y}, tanah ${tanah}`);
  } finally { lepasKarakter(k); }
});

test('Braga: dari titik muncul, 6 detik ke 16 arah — tidak jatuh, tidak memanjat, tidak keluar alas', (t) => {
  const k = buatKarakter(B.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  // Pusat pemain wajib tetap ≥ TEPI_MIN di dalam tepi alas yang terlihat.
  const batasX = TOTAL_LEBAR / 2 - TEPI_MIN;
  const batasZ = JALAN_PANJANG / 2 - TEPI_MIN;
  // Braga tidak punya apa pun yang boleh dinaiki: tanah tertinggi adalah aspal.
  const tanahTertinggi = Math.max(B.trotoarY, B.aspalY);
  try {
    const { titik } = titikMuncul(k);
    assert.ok(titik);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + 0.1;
      teleportKarakter(k, titik);
      // 6 detik × 5,4 m/s = 32 m: lebih dari cukup untuk mencapai tepi mana pun,
      // termasuk lewat meluncur di sepanjang ruko, tiang, dan meja.
      let yMin = Infinity; let yMaks = -Infinity; let xMaks = 0; let zMaks = 0;
      for (let s = 0; s < 6 * 60; s++) {
        const { kaki } = langkahKarakter(k, { dt: LANGKAH, arah: [Math.sin(a), Math.cos(a)] });
        yMin = Math.min(yMin, kaki.y);
        yMaks = Math.max(yMaks, kaki.y);
        xMaks = Math.max(xMaks, Math.abs(kaki.x));
        zMaks = Math.max(zMaks, Math.abs(kaki.z));
      }
      const p = kakiKarakter(k);
      t.diagnostic(`arah ${i}: akhir (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) y=${p.y.toFixed(3)} · |x| maks ${xMaks.toFixed(3)}/${batasX} · |z| maks ${zMaks.toFixed(3)}/${batasZ}`);
      assert.ok(yMin > -0.5, `arah ${i}: jatuh menembus tanah, y min ${yMin}`);
      assert.ok(yMaks < tanahTertinggi + TERANGKAT, `arah ${i}: naik ke atas sesuatu, y maks ${yMaks.toFixed(3)}`);
      assert.ok(xMaks <= batasX, `arah ${i}: keluar tepi X alas, |x| maks ${xMaks.toFixed(3)} (batas ${batasX})`);
      assert.ok(zMaks <= batasZ, `arah ${i}: keluar tepi Z alas, |z| maks ${zMaks.toFixed(3)} (batas ${batasZ})`);
      const akhir = ruangBebas(k, p);
      assert.equal(akhir.bebas, true, `arah ${i}: berakhir terjepit di dalam collider (${akhir.sebab})`);
    }
  } finally { lepasKarakter(k); }
});

test('Braga: tepi trotoar–aspal diseberangi tanpa tersendat', (t) => {
  const k = buatKarakter(B.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  // Dari tengah trotoar barat ke tengah trotoar timur: melewati dua tepi aspal.
  const x0 = -(JALAN_LEBAR / 2 + TROTOAR_LEBAR / 2);
  const x1 = -x0;
  try {
    // Lajur yang benar-benar kosong sepanjang jalurnya (tiang, meja, portal
    // dihindari), dicari dengan uji ruang kapsul — bukan z yang diketik. Pita
    // selebar kapsul di kedua tepi aspal DILEWATI: tepi itu yang diuji langkah
    // di bawah, bukan penghalang yang dihindari lajur. Tanpa ini, tepi yang
    // salah tinggi membuat pencarian lajur yang merah, dan penghitung tersendat
    // tidak pernah dijalankan (terlacak lewat uji mutasi, 15 Sep 2026).
    const lajurBebas = (z) => {
      for (let x = x0; x <= x1 + 1e-9; x += 0.2) {
        if (Math.abs(Math.abs(x) - JALAN_LEBAR / 2) < JARI + 0.1) continue;
        for (const dz of [-0.15, 0, 0.15]) if (!ruangBebas(k, { x, z: z + dz, y: 0 }).bebas) return false;
      }
      return true;
    };
    let z = null;
    for (let c = -JALAN_PANJANG / 2 + 1; c <= JALAN_PANJANG / 2 - 1; c += 0.25) {
      if (lajurBebas(c)) { z = c; break; }
    }
    assert.ok(z !== null, 'tidak ada lajur kosong melintang jalan');
    teleportKarakter(k, { x: x0, y: B.trotoarY, z });
    const n = Math.ceil((x1 - x0) / (KECEPATAN * LANGKAH));
    let yMin = Infinity; let yMaks = -Infinity;
    // Tersendat diukur PER LANGKAH, bukan dari posisi akhir: jarak total bisa
    // hampir benar walau beberapa langkah bergerak nol. Ambang dan empat langkah
    // awal yang dilewati sama dengan tools/fisika/ukur-tersendat.mjs (grounded
    // dari langkah sebelum teleport masih basi).
    const tersendat = [];
    for (let s = 0; s < n; s++) {
      const { kaki, gerak } = langkahKarakter(k, { dt: LANGKAH, arah: [1, 0] });
      if (s > 3 && gerak[0] < 0.08) tersendat.push(`langkah ${s} x=${kaki.x.toFixed(2)} gerak ${gerak[0].toFixed(3)}`);
      yMin = Math.min(yMin, kaki.y);
      yMaks = Math.max(yMaks, kaki.y);
    }
    const p = kakiKarakter(k);
    const harapan = n * KECEPATAN * LANGKAH;
    const tempuh = p.x - x0;
    t.diagnostic(`lajur z=${z} · ${tersendat.length}/${n - 4} langkah tersendat · tempuh ${tempuh.toFixed(3)} dari ${harapan.toFixed(3)} m · y ${yMin.toFixed(3)}..${yMaks.toFixed(3)}`);
    assert.deepEqual(tersendat, [], 'langkah bergerak < 0,08 m saat melintasi tepi aspal');
    assert.ok(Math.abs(p.z - z) < 0.01, `terbelok di tepi aspal: z ${p.z}`);
    assert.ok(yMin > Math.min(B.trotoarY, B.aspalY) - TERANGKAT && yMaks < Math.max(B.trotoarY, B.aspalY) + TERANGKAT,
      `terangkat atau terbenam di tepi aspal: y ${yMin.toFixed(3)}..${yMaks.toFixed(3)}`);
  } finally { lepasKarakter(k); }
});

test('Braga: tiap kursi meja kafe punya titik berdiri yang muat, di lantai trotoar', () => {
  const k = buatKarakter(B.f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  // Aturan permainan yang sama dengan Game._bolehBerdiriDi.
  const boleh = (p) => B.rt.meja.every((m) => m.kursi.every(
    (kur) => Math.hypot(p.x - kur.x, p.z - kur.z) > m.toleransiKursi + 0.08,
  ));
  try {
    assert.ok(B.rt.meja.length > 0);
    for (const meja of B.rt.meja) {
      for (const kur of meja.kursi) {
        const titik = cariTempatBerdiri(k, kur.keluar);
        assert.ok(titik, `${meja.id} kursi ${kur.i}: tidak ada titik berdiri yang muat`);
        const titikBoleh = cariTempatBerdiri(k, kur.keluar, { boleh });
        assert.ok(titikBoleh, `${meja.id} kursi ${kur.i}: titik berdiri hanya ada di radius kursi lain`);
        assert.ok(Math.abs(titikBoleh.y - B.trotoarY) < 0.03, `${meja.id} kursi ${kur.i}: berdiri di atas sesuatu, y=${titikBoleh.y}`);
      }
    }
  } finally { lepasKarakter(k); }
});

test('Braga: tiap ruko padat dari tanah — collider rata dengan badannya dan kaca etalase yang menonjol', () => {
  const { f, rt, catatan } = B;
  const ruko = rt.root.children.filter((c) => c.isGroup && c.name.startsWith('braga_ruko_'));
  assert.ok(ruko.length > 0, 'grup ruko tidak ditemukan');
  f.segarkan();
  const JARAK = 0.2;
  for (const r of ruko) {
    const milik = catatan.filter((c) => c.pemilik === r.name);
    assert.equal(milik.reduce((n, c) => n + c.n, 0), 1, `${r.name}: harus tepat satu volume`);

    const kb = kotakDunia(r.getObjectByName(`${r.name}_badan`));
    const ke = kotakDunia(r.getObjectByName(`${r.name}_etalase`));
    const pusat = kb.getCenter(new THREE.Vector3());
    // Keempat sisi mendatar badan. Di sisi tempat kaca etalase menonjol, dinding
    // harus sampai muka luar kacanya; di sisi lain, rata dengan badan. Sinar
    // ditembakkan dari 0,2 m DI LUAR muka yang diharapkan ke arah ruko: kena di
    // 0,2 m berarti mukanya tepat di sana — tidak kurang, tidak lebih (sinar
    // yang mulai di dalam collider kena di 0).
    const sisi = [
      { sumbu: 'x', arah: 1, muka: kb.max.x, kaca: ke.max.x },
      { sumbu: 'x', arah: -1, muka: kb.min.x, kaca: ke.min.x },
      { sumbu: 'z', arah: 1, muka: kb.max.z, kaca: ke.max.z },
      { sumbu: 'z', arah: -1, muka: kb.min.z, kaca: ke.min.z },
    ];
    for (const s of sisi) {
      const menonjol = (s.kaca - s.muka) * s.arah > 1e-6;
      const harapan = menonjol ? s.kaca : s.muka;
      for (const y of [0.1, 1.2]) {
        const asal = s.sumbu === 'x'
          ? { x: harapan + s.arah * JARAK, y, z: pusat.z }
          : { x: pusat.x, y, z: harapan + s.arah * JARAK };
        const dir = s.sumbu === 'x' ? { x: -s.arah, y: 0, z: 0 } : { x: 0, y: 0, z: -s.arah };
        const kena = f.w.castRay(new f.R.Ray(asal, dir), 1, true);
        const toi = kena?.timeOfImpact ?? null;
        assert.ok(toi !== null && Math.abs(toi - JARAK) < 1e-3,
          `${r.name} sisi ${s.arah > 0 ? '+' : '−'}${s.sumbu} y=${y}${menonjol ? ' (etalase)' : ''}: `
          + `muka collider ${toi === null ? 'tidak ada' : (harapan + s.arah * (JARAK - toi)).toFixed(4)}, terlihat ${harapan.toFixed(4)}`);
      }
    }
  }
});

/**
 * Jarak tembus sinar mendatar ke sebuah benda silinder, dari 0,2 m di luar jari-
 * jari PANGKAL mesh-nya, ke empat arah sumbu. Mesh 8 segi punya titik sudut
 * tepat di sumbu itu, jadi muka yang diharapkan = jari-jari pangkal.
 */
function mukaSilinder(f, pusat, jari, y) {
  const JARAK = 0.2;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([ax, az]) => {
    const asal = { x: pusat.x + ax * (jari + JARAK), y, z: pusat.z + az * (jari + JARAK) };
    const kena = f.w.castRay(new f.R.Ray(asal, { x: -ax, y: 0, z: -az }), 1, true);
    return { arah: [ax, az], selisih: kena ? kena.timeOfImpact - JARAK : null };
  });
}

/**
 * Sapuan panjat: dari 16 arah × 3 geser samping, 1,5 detik berjalan menuju pusat
 * benda. Empat arah tepat ke pusat TIDAK cukup — terukur, kapsul memanjat
 * silinder rendah justru saat datang menyerong, dan versi pertama uji ini
 * (empat arah) hijau untuk alas yang bisa dinaiki.
 * @returns {{ dinaiki: number, total: number, kenaikanMaks: number }}
 */
function sapuPanjat(k, pusat, jariMulai) {
  const f = k.fisika;
  let dinaiki = 0; let total = 0; let kenaikanMaks = 0;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const ax = Math.sin(a); const az = Math.cos(a);
    for (const geser of [0, 0.3, 0.6]) {
      const x = pusat.x + ax * jariMulai + az * geser;
      const z = pusat.z + az * jariMulai - ax * geser;
      const lantaiY = f.tanahDi(x, z, { abaikan: k.collider });
      teleportKarakter(k, { x, y: lantaiY, z });
      let yMaks = -Infinity;
      for (let s = 0; s < 90; s++) yMaks = Math.max(yMaks, langkahKarakter(k, { dt: LANGKAH, arah: [-ax, -az] }).kaki.y);
      total++;
      kenaikanMaks = Math.max(kenaikanMaks, yMaks - lantaiY);
      if (yMaks - lantaiY >= TERANGKAT) dinaiki++;
    }
  }
  return { dinaiki, total, kenaikanMaks };
}

test('Braga: tiang lampu dan alas portal padat dari tanah, selebar pangkal mesh-nya — alas portal tidak bisa dinaiki', async (t) => {
  const { f, rt } = B;
  f.segarkan();
  const tiang = rt.root.children.filter((c) => c.isMesh && c.name.startsWith('braga_lampu_') && c.name.endsWith('_tiang'));
  assert.ok(tiang.length > 0, 'mesh tiang lampu tidak ditemukan');
  for (const m of tiang) {
    const pusat = kotakDunia(m).getCenter(new THREE.Vector3());
    for (const y of [0.1, 1.2]) {
      for (const { arah, selisih } of mukaSilinder(f, pusat, m.geometry.parameters.radiusBottom, y)) {
        assert.ok(selisih !== null && Math.abs(selisih) < 1e-3, `${m.name} arah ${arah} y=${y}: selisih muka ${selisih}`);
      }
    }
  }

  const anchor = rt.root.getObjectByName('spot:warp_portal_anchor');
  const alas = anchor?.children.find((c) => c.geometry?.type === 'CylinderGeometry');
  assert.ok(alas, 'alas portal tidak ditemukan');
  const kotakAlasPortal = kotakDunia(alas);
  const pusatPortal = kotakAlasPortal.getCenter(new THREE.Vector3());
  for (const y of [0.1, kotakAlasPortal.max.y - 0.1]) {
    for (const { arah, selisih } of mukaSilinder(f, pusatPortal, alas.geometry.parameters.radiusBottom, y)) {
      assert.ok(selisih !== null && Math.abs(selisih) < 1e-3, `alas portal arah ${arah} y=${y}: selisih muka ${selisih}`);
    }
  }

  // Tidak bisa dinaiki dari arah mana pun, termasuk menyerong.
  const { radiusBottom, height: tinggiMesh } = alas.geometry.parameters;
  const mulai = radiusBottom + JARI + 1.05;
  const k = buatKarakter(f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  let braga;
  try {
    braga = sapuPanjat(k, pusatPortal, mulai);
  } finally { lepasKarakter(k); }

  // KONTROL ALAT UKUR: silinder yang sama persis dengan MESH-nya (tanpa
  // tinggi tambahan) di dunia datar. Terukur bisa dinaiki; kalau sapuan ini
  // tidak mendeteksinya, sapuan itu buta dan angka 0 di atas tidak berarti.
  const fk = new Fisika({ muatRapier });
  await fk.muat();
  fk.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [40, 1, 40], letak: [0, -0.5, 0] }], { x: 0, y: 0, z: 0 });
  fk.daftarkan('kontrol', [
    { bentuk: 'silinder', ukuran: [radiusBottom * 2, tinggiMesh, radiusBottom * 2], letak: [0, tinggiMesh / 2, 0] },
  ], { x: 0, y: 0, z: 0 });
  const kk = buatKarakter(fk, { x: 10, y: 0, z: 10 });
  let kontrol;
  try {
    kontrol = sapuPanjat(kk, { x: 0, z: 0 }, mulai);
  } finally { lepasKarakter(kk); }

  t.diagnostic(`alas portal Braga: dinaiki ${braga.dinaiki}/${braga.total}, kenaikan maks ${braga.kenaikanMaks.toFixed(3)} m`
    + ` · kontrol silinder setinggi mesh (${tinggiMesh} m): dinaiki ${kontrol.dinaiki}/${kontrol.total}, kenaikan maks ${kontrol.kenaikanMaks.toFixed(3)} m`);
  assert.ok(kontrol.dinaiki > 0, 'kontrol: silinder setinggi mesh tidak terdeteksi dinaiki — sapuan panjat buta');
  assert.equal(braga.dinaiki, 0, `alas portal dinaiki di ${braga.dinaiki}/${braga.total} pendekatan (kenaikan maks ${braga.kenaikanMaks.toFixed(3)} m)`);
});

test('Braga: paling banyak 3 PointLight, dan semua kepala lampu tetap ikut siklus hari', (t) => {
  const { rt } = B;
  // Ditelusuri SEKALI di uji — runtime sendiri tidak boleh menyapu scene.
  let pointLightRoot = 0;
  let kepalaRoot = 0;
  rt.root.traverse((o) => {
    if (o.isPointLight) pointLightRoot++;
    else if (o.isMesh && o.userData.isLampu) kepalaRoot++;
  });
  const lampu = rt.getLampu();
  const cahaya = lampu.filter((o) => o.isPointLight);
  const kepala = lampu.filter((o) => o.isMesh);
  t.diagnostic(`PointLight di root: ${pointLightRoot} · kepala lampu emissive: ${kepalaRoot}`);

  assert.ok(pointLightRoot <= ANGGARAN_POINTLIGHT, `${pointLightRoot} PointLight dibuat, anggaran ${ANGGARAN_POINTLIGHT}`);
  assert.equal(cahaya.length, pointLightRoot, 'ada PointLight di root yang tidak dikendalikan DayNight');
  assert.equal(kepala.length, kepalaRoot, 'ada kepala lampu di root yang tidak ikut siklus hari');
  assert.ok(kepala.length > cahaya.length, 'uji ini butuh kepala lampu yang TIDAK punya PointLight');

  // DayNight yang sebenarnya, dengan daftar lampu dari runtime. `update()` membaca
  // jam dinding; `_applyTime` dipakai supaya jamnya pasti.
  const dn = new DayNight({});
  dn.pakaiLampu(lampu);
  dn._applyTime(12);
  const siang = kepala.map((b) => b.material.emissiveIntensity);
  assert.ok(cahaya.every((c) => c.intensity === 0), 'PointLight menyala di siang hari');
  dn._applyTime(20);
  kepala.forEach((b, i) => assert.ok(b.material.emissiveIntensity > siang[i],
    `kepala lampu ${i} tidak menyala malam: ${siang[i]} → ${b.material.emissiveIntensity}`));
  assert.ok(cahaya.every((c) => c.intensity > 0), 'PointLight tidak menyala malam');
});

test('Braga: lepasKelompok mengembalikan jumlah collider dunia ke garis dasar, bolak-balik', async () => {
  const f = new Fisika({ muatRapier });
  await f.muat();
  // Pemain sudah ada sebelum warp, seperti di Game — kapsulnya bagian garis dasar.
  const k = buatKarakter(f, { x: MUNCUL.x, y: 0, z: MUNCUL.z });
  try {
    const dasar = f.jumlahDiDunia();
    for (let putaran = 0; putaran < 2; putaran++) {
      const scene = new THREE.Scene();
      const rt = new BragaSpotRuntime();
      // Warp setelah fisika siap: collider langsung dipasang, tanpa antrean.
      rt.mount(scene, { toast: { show() {} }, fisika: f, kelompokFisika: KELOMPOK });
      const n = f.hitung()[KELOMPOK];
      assert.ok(n > 0);
      assert.equal(f.jumlahDiDunia(), dasar + n, `putaran ${putaran}: collider tidak langsung terpasang atau menumpuk`);
      // Urutan Game._syncSpotVisuals: lepas kelompok dulu, baru dispose.
      assert.equal(f.lepasKelompok(KELOMPOK), n);
      rt.dispose(scene);
      assert.equal(f.jumlahDiDunia(), dasar, `putaran ${putaran}: collider Braga tertinggal setelah pindah Spot`);
    }
  } finally { lepasKarakter(k); }
});
