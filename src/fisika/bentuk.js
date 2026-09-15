// ═══════════════════════════════════════════════════════
// bentuk.js — kosakata bentuk tabrakan, SAMA PERSIS dengan Rupa3D
//
// Galantara, Rupa3D, dan Mighan-3D-Studio memakai mesin fisika yang sama
// (Rapier). Kalau ketiganya memakai kosakata bentuk yang berbeda, aset yang
// proksinya diukur di Rupa3D akan berperilaku sebagai benda LAIN begitu
// dijalankan di Galantara — dan tidak ada yang akan tahu sebabnya.
//
// Jadi modul ini meniru `Rupa3D/fisika.mjs` baris 66–69 apa adanya:
//
//   ukuran = [x, y, z]  — UKURAN PENUH, bukan setengah
//   kotak    → cuboid(x/2, y/2, z/2)
//   bola     → ball(x/2)
//   kapsul   → capsule(max(y/2 − x/2, ε), x/2)
//   silinder → cylinder(y/2, x/2)
//   cembung  → convexHull(titik), maksimal 4.096 titik (Rupa3D/adegan.mjs:290)
//
// Perluasan yang sengaja, dan disebut:
//   1. Node adegan Rupa3D membawa SATU bentuk; prop Galantara boleh membawa
//      BEBERAPA BAGIAN (batang pohon + pagar + papan), masing-masing dengan
//      makna `bentuk/ukuran` yang identik.
//   2. Tiap bagian boleh diputar sendiri: `putarY` (radian) atau `putar`
//      (kuaternion [x,y,z,w]). Euler dua sumbu atau lebih DITOLAK — Rupa3D
//      pernah memutar collider ZYX sementara adegannya XYZ (commit 76f8595),
//      dan bedanya hanya tampak pada putaran dua sumbu. Kuaternion tidak punya
//      urutan, jadi kelas bug itu tidak bisa terjadi.
//
// Modul ini murni — tidak menyentuh Rapier — supaya pemetaannya bisa diuji
// tanpa memuat 2,86 MB WASM.
// ═══════════════════════════════════════════════════════

/** Sama dengan `BENTUK_TABRAK` di Rupa3D/fisika.mjs. `cembung` butuh `titik`. */
export const BENTUK = Object.freeze(['kotak', 'bola', 'kapsul', 'silinder', 'cembung']);

/** Galantara hari ini hanya memakai collider statis; dinamis menyusul. */
export const JENIS = Object.freeze(['statis']);

/**
 * Batas aman titik hull — SAMA dengan Rupa3D (adegan.mjs:290, tabrak.mjs:54).
 *
 * Versi pertama modul ini memakai 8.000, yaitu TEPAT di ambang tempat
 * convexHull Rapier rusak diam-diam (collider bervolume nol, benda jatuh
 * menembus dunia). Ditemukan Codex saat meninjau rancangan ini, 15 Sep 2026.
 */
export const TITIK_HULL_MAKS = 4096;

const EPS = 1e-6;

/**
 * Terjemahkan satu deskriptor ke nama pembuat ColliderDesc Rapier + argumennya.
 *
 * @param {{ bentuk: string, ukuran?: number[]|number, titik?: number[] }} d
 * @returns {{ pembuat: string, args: any[] }}
 */
export function paramCollider(d) {
  if (!d || !BENTUK.includes(d.bentuk)) {
    throw new Error(`bentuk tabrakan tidak dikenal: ${d?.bentuk}. Yang ada: ${BENTUK.join(', ')}`);
  }
  if (d.bentuk === 'cembung') {
    return { pembuat: 'convexHull', args: [Float32Array.from(periksaTitikHull(d.titik))] };
  }

  const u = Array.isArray(d.ukuran) ? d.ukuran : [d.ukuran ?? 1, d.ukuran ?? 1, d.ukuran ?? 1];
  const [x, y, z] = u.map(Number);
  if (![x, y, z].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error(`ukuran tidak sah untuk ${d.bentuk}: ${JSON.stringify(d.ukuran)}`);
  }

  switch (d.bentuk) {
    case 'kotak': return { pembuat: 'cuboid', args: [x / 2, y / 2, z / 2] };
    case 'bola': return { pembuat: 'ball', args: [x / 2] };
    case 'kapsul': return { pembuat: 'capsule', args: [Math.max(y / 2 - x / 2, EPS), x / 2] };
    case 'silinder': return { pembuat: 'cylinder', args: [y / 2, x / 2] };
    default: throw new Error(`bentuk belum ditangani: ${d.bentuk}`);
  }
}

/**
 * Titik hull harus: larik datar kelipatan 3, 4..4096 titik, semua finite, dan
 * MEMBENTANG TIGA DIMENSI. Titik yang segaris atau sebidang tidak punya
 * volume — Rapier tidak melempar galat untuk itu, ia membuat collider yang
 * tidak menabrak apa pun.
 *
 * @param {number[]} titik
 * @returns {number[]}
 */
export function periksaTitikHull(titik) {
  if (!Array.isArray(titik) && !(titik instanceof Float32Array)) {
    throw new Error('bentuk "cembung" butuh `titik`: larik datar [x,y,z,...] minimal 4 titik');
  }
  if (titik.length < 12 || titik.length % 3 !== 0) {
    throw new Error('bentuk "cembung" butuh `titik`: larik datar [x,y,z,...] minimal 4 titik');
  }
  const n = titik.length / 3;
  if (n > TITIK_HULL_MAKS) {
    throw new Error(`cembung dengan ${n} titik melewati batas aman 4.096 — `
      + 'convexHull Rapier rusak diam-diam di atas ~8.000 titik. Reduksi dulu (rupa_proksi melakukannya)');
  }
  for (let i = 0; i < titik.length; i++) {
    if (!Number.isFinite(Number(titik[i]))) {
      throw new Error(`titik hull ke-${Math.floor(i / 3)} tidak finite: ${titik[i]}`);
    }
  }
  if (!membentangTigaDimensi(titik)) {
    throw new Error('titik hull segaris atau sebidang — hull bervolume nol tidak menabrak apa pun');
  }
  return Array.from(titik, Number);
}

/**
 * Apakah titik-titik membentang 3D? O(n): titik terjauh dari titik pertama,
 * lalu terjauh dari garisnya, lalu terjauh dari bidangnya.
 */
function membentangTigaDimensi(t) {
  const n = t.length / 3;
  const P = (i) => [t[i * 3], t[i * 3 + 1], t[i * 3 + 2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const len = (a) => Math.sqrt(dot(a, a));

  const p0 = P(0);
  let i1 = 0; let best = 0;
  for (let i = 1; i < n; i++) { const d = len(sub(P(i), p0)); if (d > best) { best = d; i1 = i; } }
  if (best < 1e-4) return false;
  const arah = sub(P(i1), p0);

  let i2 = 0; best = 0;
  for (let i = 0; i < n; i++) {
    const d = len(cross(sub(P(i), p0), arah)) / len(arah);
    if (d > best) { best = d; i2 = i; }
  }
  if (best < 1e-4) return false;
  const normal = cross(arah, sub(P(i2), p0));
  const panjangNormal = len(normal);

  best = 0;
  for (let i = 0; i < n; i++) best = Math.max(best, Math.abs(dot(sub(P(i), p0), normal)) / panjangNormal);
  return best >= 1e-4;
}

/**
 * Pusat collider di ruang DUNIA, dari posisi induk + letak lokal + putar-Y induk.
 *
 * Induk (prop) hanya pernah diputar di sumbu Y — itu cara semua prop Galantara
 * ditaruh. Putaran bagian sendiri tidak memindahkan pusatnya, jadi tidak
 * masuk rumus ini.
 *
 * Arah putar SAMA dengan THREE.Object3D (x' = x·cos + z·sin, z' = −x·sin + z·cos);
 * rumus kebalikannya pernah mendudukkan pemain di sebelah bangkunya.
 *
 * @param {{x:number,y:number,z:number}} induk
 * @param {number} putarY radian
 * @param {number[]} [letak] offset lokal [x,y,z]
 */
export function pusatDunia(induk, putarY = 0, letak = [0, 0, 0]) {
  const [lx, ly, lz] = letak;
  const c = Math.cos(putarY);
  const s = Math.sin(putarY);
  return {
    x: induk.x + lx * c + lz * s,
    y: (induk.y ?? 0) + ly,
    z: induk.z - lx * s + lz * c,
  };
}

/** Kuaternion untuk putaran murni sumbu Y. */
export function kuaternionY(putarY = 0) {
  return { x: 0, y: Math.sin(putarY / 2), z: 0, w: Math.cos(putarY / 2) };
}

/** Hasil kali Hamilton a ⊗ b (putar b dulu, lalu a) — konvensi THREE.Quaternion.multiply. */
export function kaliKuaternion(a, b) {
  return {
    x: a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
    y: a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z,
    z: a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

/**
 * Putaran dunia sebuah bagian: putar-Y induk ⊗ putaran bagian itu sendiri.
 * @param {number} putarYInduk
 * @param {{ putarY?: number, putar?: number[] }} d
 */
export function kuaternionDunia(putarYInduk, d) {
  const qInduk = kuaternionY(putarYInduk);
  if (d.putar) {
    const [x, y, z, w] = d.putar;
    return kaliKuaternion(qInduk, { x, y, z, w });
  }
  return d.putarY ? kaliKuaternion(qInduk, kuaternionY(d.putarY)) : qInduk;
}

/**
 * Salinan deskriptor yang diskala SERAGAM — untuk aset yang ditaruh manifest
 * dengan `scale`. Hanya skala seragam: bola, kapsul, dan silinder tidak punya
 * bentuk yang benar di bawah skala tak seragam.
 * @param {object} d
 * @param {number} s
 */
export function skalaDeskriptor(d, s = 1) {
  if (!Number.isFinite(s) || s <= 0) throw new Error(`skala tidak sah: ${s}`);
  if (s === 1) return { ...d };
  const kali = (v) => (Array.isArray(v) ? v.map((x) => x * s) : (v == null ? v : v * s));
  return {
    ...d,
    ...(d.ukuran != null ? { ukuran: kali(d.ukuran) } : {}),
    ...(d.letak != null ? { letak: kali(d.letak) } : {}),
    ...(d.titik != null ? { titik: kali(d.titik) } : {}),
  };
}

/**
 * Baca dokumen collider aset: `{ versi: 1, jenis: 'statis', bagian: [...] }`.
 *
 * Bentuknya SAMA dengan usulan kontrak `extras.rupa3d.collider` (Codex,
 * 15 Sep 2026; belum diputuskan Fahmi), supaya berkas pendamping
 * `<aset>.collider.json` hari ini dan extras di dalam GLB nanti dibaca oleh
 * pembaca yang sama.
 *
 * @param {unknown} dok
 * @param {string} pemilik untuk pesan galat
 * @returns {object[]} bagian yang sudah diperiksa
 */
export function bacaKontrakCollider(dok, pemilik = '(aset)') {
  if (!dok || typeof dok !== 'object') throw new Error(`${pemilik}: dokumen collider bukan objek`);
  if (dok.versi !== 1) throw new Error(`${pemilik}: versi collider ${dok.versi} tidak dikenal (hanya 1)`);
  if ((dok.jenis ?? 'statis') !== 'statis') throw new Error(`${pemilik}: jenis "${dok.jenis}" belum didukung (hanya statis)`);
  if (!Array.isArray(dok.bagian) || !dok.bagian.length) throw new Error(`${pemilik}: collider tanpa bagian`);
  return periksaDaftar(dok.bagian, pemilik);
}

/**
 * Periksa satu daftar deskriptor sebelum didaftarkan. Deskriptor yang salah
 * ditolak di sini dengan pesan yang menyebut prop-nya, bukan di dalam Rapier
 * dengan pesan WASM yang tidak menunjuk apa pun.
 *
 * @param {object[]} daftar
 * @param {string} pemilik nama prop, untuk pesan galat
 * @returns {object[]} salinan yang sudah dinormalkan (jenis terisi, putar ternormal)
 */
export function periksaDaftar(daftar, pemilik = '(tanpa nama)') {
  if (daftar == null) return [];
  if (!Array.isArray(daftar)) throw new Error(`${pemilik}: fisika harus larik deskriptor`);
  return daftar.map((d, i) => {
    const nama = `${pemilik}[${i}]`;
    const jenis = d.jenis ?? 'statis';
    if (!JENIS.includes(jenis)) {
      throw new Error(`${nama}: jenis "${jenis}" belum didukung Galantara (hanya statis)`);
    }
    if (d.putarX || d.putarZ) {
      throw new Error(`${nama}: putaran Euler selain Y ditolak (urutan sumbunya ambigu) — pakai \`putar\` kuaternion [x,y,z,w]`);
    }
    if (d.putar != null && d.putarY != null) {
      throw new Error(`${nama}: \`putar\` dan \`putarY\` sekaligus — pilih satu`);
    }
    const hasil = { ...d, jenis };
    if (d.letak != null) {
      if (!Array.isArray(d.letak) || d.letak.length !== 3 || !d.letak.every(Number.isFinite)) {
        throw new Error(`${nama}: letak harus [x,y,z] finite, dapat ${JSON.stringify(d.letak)}`);
      }
    }
    if (d.putarY != null && !Number.isFinite(d.putarY)) {
      throw new Error(`${nama}: putarY tidak finite`);
    }
    if (d.putar != null) {
      if (!Array.isArray(d.putar) || d.putar.length !== 4 || !d.putar.every(Number.isFinite)) {
        throw new Error(`${nama}: putar harus kuaternion [x,y,z,w] finite`);
      }
      const p = Math.hypot(...d.putar);
      if (p < 1e-6) throw new Error(`${nama}: kuaternion putar bernorma nol`);
      hasil.putar = d.putar.map((v) => v / p);
    }
    paramCollider(d); // melempar kalau bentuk/ukuran/titik tidak sah
    return hasil;
  });
}
