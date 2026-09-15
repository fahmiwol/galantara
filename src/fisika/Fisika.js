// ═══════════════════════════════════════════════════════
// Fisika.js — dunia Rapier Galantara: dimuat malas, milik per kelompok
//
// ── Kenapa Rapier, bukan solver XZ buatan sendiri ─────────────────────
// Jujurnya: untuk 31 prop di pulau datar, solver lingkaran/OBB sendiri CUKUP
// (Codex benar soal itu). Rapier dipilih karena alasan lain — Rupa3D mengukur
// proksi tabrakannya dengan Rapier, dan Mighan-3D-Studio menjalankan Player
// Controller-nya dengan Rapier. Mengukur proksi dengan alat yang BERBEDA dari
// yang menjalankannya berarti mengukur benda yang berbeda. Ditambah tangga,
// panggung, dan terasering yang sudah ada di katalog prop. Lihat ADR-0015.
//
// ── Kenapa DIMUAT MALAS ───────────────────────────────────────────────
// rapier3d-compat 0.20.0 = 2,86 MB mentah, 1,08 MB gzip (terukur). Dunia
// TIDAK BOLEH menunggu itu: pulau tampil dan bisa dijalani lebih dulu dengan
// gerak lama, lalu fisika menyambung begitu siap. Lazy loading MEMINDAHKAN
// biayanya, tidak menghapusnya — di 1 Mbps unduhannya saja 8,6 detik.
//
// ── Kenapa ada ANTREAN ───────────────────────────────────────────────
// Prop dibangun SEBELUM fisika siap — itu memang urutannya kalau dunia tidak
// menunggu. Collider yang didaftarkan lebih awal disimpan, lalu dipasang
// sekaligus saat mesin siap. Tanpa antrean, prop yang dibangun duluan akan
// diam-diam tidak punya collider sama sekali.
//
// ── Kenapa KELOMPOK ──────────────────────────────────────────────────
// Pindah Spot harus melepas collider Spot lama saja, bukan seluruh dunia.
// Sama dengan ADR-0002: yang dilepas adalah yang dicatat pemiliknya, bukan
// hasil menyapu scene.
//
// ── Kenapa ada `segarkan()` (terbukti, bukan dugaan) ────────────────────
// Di Rapier 0.20.0, collider yang BARU DITAMBAHKAN tidak terlihat oleh
// pengendali karakter maupun query bentuk sampai `world.step()` berikutnya.
// Terukur: gerak 2 m menuju dinding baru → 2,000 m (tembus); setelah satu
// step → 0,580 m. `propagateModifiedBodyPositionsToColliders()` tidak menolong
// dan `updateSceneQueries()` tidak ada di versi ini. Collider yang DIHAPUS
// langsung hilang dari query — asimetris. Jadi setiap penambahan menandai
// dunia kotor, dan setiap query menyegarkannya dulu.
// Ditemukan Codex; diverifikasi ulang: tools/fisika/langkah-pertama.mjs.
// ═══════════════════════════════════════════════════════

import { paramCollider, pusatDunia, kuaternionDunia, periksaDaftar } from './bentuk.js';

/** Jalur vendor. Versinya dipatok di nama berkas, sama dengan Rupa3D.
 *  Ekstensi `.js`, bukan `.mjs`: modul ES WAJIB dilayani dengan MIME
 *  JavaScript, dan tidak semua `mime.types` server memetakan `.mjs`. `.js`
 *  dijamin benar di server mana pun yang sudah melayani src/. */
export const JALUR_RAPIER = '/vendor/rapier3d-compat.0.20.0.js';

/** Gravitasi bumi. Karakter memakai gravitasinya sendiri (lihat Karakter.js). */
export const GRAVITASI = { x: 0, y: -9.81, z: 0 };

export class Fisika {
  /**
   * @param {{ muatRapier?: () => Promise<any> }} [opsi]
   *   `muatRapier` bisa diganti di uji Node supaya memakai jalur berkas, bukan
   *   jalur URL browser.
   */
  constructor({ muatRapier } = {}) {
    this._muatRapier = muatRapier ?? (() => import(JALUR_RAPIER).then((m) => m.default));
    /** @type {any} modul RAPIER setelah init */
    this.R = null;
    /** @type {any} RAPIER.World */
    this.w = null;
    this.siap = false;
    /** Galat pemuatan, kalau gagal. Dunia tetap jalan dengan gerak lama. */
    this.gagal = null;
    /** @type {Promise<Fisika>|null} */
    this._janji = null;
    /** kelompok → [{ deskriptor, induk, putarY, pemilik, collider|null }] */
    this._kelompok = new Map();
    /** Ada collider baru yang belum dilihat query sejak step terakhir. */
    this._kotor = false;
    /** Waktu terukur, supaya klaim performa bisa diperiksa di perangkat nyata. */
    this.waktu = { muat_ms: null, init_ms: null };
  }

  /** Mulai memuat. Aman dipanggil berkali-kali. */
  muat() {
    if (this._janji) return this._janji;
    this._janji = (async () => {
      try {
        const t0 = performance.now();
        const R = await this._muatRapier();
        const t1 = performance.now();
        await R.init();
        const t2 = performance.now();
        this.R = R;
        this.w = new R.World(GRAVITASI);
        this.waktu = { muat_ms: +(t1 - t0).toFixed(1), init_ms: +(t2 - t1).toFixed(1) };
        this.siap = true;
        // Pasang semua yang didaftarkan sebelum mesin siap.
        for (const daftar of this._kelompok.values()) {
          for (const e of daftar) if (!e.collider) e.collider = this._pasang(e);
        }
        this.segarkan();
        return this;
      } catch (e) {
        this.gagal = e;
        throw e;
      }
    })();
    return this._janji;
  }

  /**
   * Daftarkan collider statis milik satu prop.
   *
   * @param {string} kelompok mis. 'oola' atau 'spot'
   * @param {object[]} deskriptor daftar { bentuk, ukuran, letak?, putarY?, putar?, titik? }
   * @param {{x:number,y?:number,z:number}} induk posisi dunia prop
   * @param {number} [putarY] putaran prop di sumbu Y
   * @param {string} [pemilik] nama prop, untuk pesan galat dan diagnosa
   * @returns {number} jumlah collider yang didaftarkan
   */
  daftarkan(kelompok, deskriptor, induk, putarY = 0, pemilik = kelompok) {
    const sah = periksaDaftar(deskriptor, pemilik);
    if (!sah.length) return 0;
    const daftar = this._kelompok.get(kelompok) ?? [];
    for (const d of sah) {
      const e = { deskriptor: d, induk: { x: induk.x, y: induk.y ?? 0, z: induk.z }, putarY, pemilik, collider: null };
      if (this.siap) e.collider = this._pasang(e);
      daftar.push(e);
    }
    this._kelompok.set(kelompok, daftar);
    return sah.length;
  }

  /** @private */
  _pasang(e) {
    const { pembuat, args } = paramCollider(e.deskriptor);
    const pusat = pusatDunia(e.induk, e.putarY, e.deskriptor.letak);
    const desc = this.R.ColliderDesc[pembuat](...args)
      .setTranslation(pusat.x, pusat.y, pusat.z)
      .setRotation(kuaternionDunia(e.putarY, e.deskriptor));
    if (e.deskriptor.gesekan != null) desc.setFriction(e.deskriptor.gesekan);
    this._kotor = true;
    // Collider statis tanpa badan: Rapier menaruhnya di badan tetap bawaan.
    return this.w.createCollider(desc);
  }

  /** Lepas seluruh collider satu kelompok (mis. saat meninggalkan Spot). */
  lepasKelompok(kelompok) {
    const daftar = this._kelompok.get(kelompok);
    if (!daftar) return 0;
    if (this.siap) {
      for (const e of daftar) if (e.collider) this.w.removeCollider(e.collider, false);
    }
    this._kelompok.delete(kelompok);
    return daftar.length;
  }

  /**
   * Buat query melihat collider yang baru ditambahkan. Murah: dunia Galantara
   * hanya berisi collider statis dan satu badan kinematik.
   */
  segarkan() {
    if (!this.siap || !this._kotor) return;
    this.w.step();
    this._kotor = false;
  }

  /**
   * Tinggi permukaan di bawah sebuah titik, atau null kalau tidak ada tanah
   * (tepi pulau, jurang). Dipakai supaya titik berdiri dan titik muncul tidak
   * pernah dipilih di udara.
   *
   * @param {number} x
   * @param {number} z
   * @param {{ dari?: number, jarak?: number, abaikan?: any }} [opsi]
   */
  tanahDi(x, z, { dari = 1.5, jarak = 4, abaikan } = {}) {
    if (!this.siap) return null;
    this.segarkan();
    const sinar = new this.R.Ray({ x, y: dari, z }, { x: 0, y: -1, z: 0 });
    const kena = this.w.castRay(sinar, jarak, true, undefined, undefined, abaikan);
    return kena ? dari - kena.timeOfImpact : null;
  }

  /** Jumlah collider per kelompok — untuk diagnosa dan uji. */
  hitung() {
    const out = {};
    for (const [k, d] of this._kelompok) out[k] = d.length;
    return out;
  }

  /** Jumlah collider yang BENAR-BENAR ada di dunia Rapier (termasuk kapsul pemain). */
  jumlahDiDunia() {
    return this.siap ? this.w.colliders.len() : 0;
  }

  /** Garis semua collider untuk tampilan debug: { vertices, colors } dari Rapier. */
  garisDebug() {
    if (!this.siap) return null;
    this.segarkan();
    return this.w.debugRender();
  }
}

/**
 * Cincin dinding tak terlihat di tepi pulau bundar.
 *
 * Sebelumnya tepi pulau dijaga clamp radial: posisi dipotong kembali ke jari
 * pulau. Rasanya LENGKET — menabrak tepi berarti berhenti, bukan meluncur.
 * Dinding cincin membuat pengendali karakter meluncur di sepanjang tepi seperti
 * menyusuri pagar, dan itu yang dirasakan pemain sebagai batas yang wajar.
 *
 * @param {number} jari jari-jari PERMUKAAN DALAM dinding
 * @param {number} [segmen] jumlah potongan; 32 memberi galat tali busur < 1 %
 * @returns {object[]} deskriptor kotak dengan `letak` dan `putarY` masing-masing,
 *   didaftarkan dengan induk di pusat pulau
 */
export function cincinTepi(jari, segmen = 32, { tinggi = 3, tebal = 0.6, y = 0 } = {}) {
  const r = jari + tebal / 2;
  // Tali busur di jari-jari tengah dinding, ditambah 8 % supaya sambungan
  // antarpotongan tidak menyisakan celah.
  const panjang = 2 * r * Math.tan(Math.PI / segmen) * 1.08;
  const out = [];
  for (let i = 0; i < segmen; i++) {
    const a = (i / segmen) * Math.PI * 2;
    out.push({
      bentuk: 'kotak',
      ukuran: [panjang, tinggi, tebal],
      letak: [Math.sin(a) * r, y + tinggi / 2, Math.cos(a) * r],
      putarY: a,
    });
  }
  return out;
}

/**
 * Empat dinding tak terlihat mengelilingi area jalan persegi — untuk Spot
 * yang tanahnya jalan, pantai, atau anjungan, bukan pulau bundar.
 *
 * @param {number} lebar ukuran X area yang boleh diinjak
 * @param {number} panjang ukuran Z area yang boleh diinjak
 * @returns {object[]} deskriptor kotak dengan `letak`, induk di pusat area
 */
export function dindingPersegi(lebar, panjang, { tinggi = 3, tebal = 0.6, y = 0 } = {}) {
  const hx = lebar / 2 + tebal / 2;
  const hz = panjang / 2 + tebal / 2;
  const cy = y + tinggi / 2;
  return [
    { bentuk: 'kotak', ukuran: [lebar + tebal * 2, tinggi, tebal], letak: [0, cy, hz] },
    { bentuk: 'kotak', ukuran: [lebar + tebal * 2, tinggi, tebal], letak: [0, cy, -hz] },
    { bentuk: 'kotak', ukuran: [tebal, tinggi, panjang], letak: [hx, cy, 0] },
    { bentuk: 'kotak', ukuran: [tebal, tinggi, panjang], letak: [-hx, cy, 0] },
  ];
}
