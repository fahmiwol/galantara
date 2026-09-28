// ═══════════════════════════════════════════════════════
// MisiKlien.js — send a hired agent on a mission and watch it (contract: SPRINT-01, /api/misi*).
//
// Polling, not sockets (M1): GET /api/misi/:id every 3 s while the tab is visible, paused while
// it is hidden (no quota burned in a pocket), stopped at a final status or after a time limit,
// and backing off when the network or the runtime fails. The runtime keeps working either way;
// the world only stops LOOKING.
//
// Input is checked before anything leaves the browser: at most 300 characters, at most three
// https addresses, and nothing that looks like a pasted API key (findSecrets, applied to the
// whole text, each line and each token: the contract's patterns are anchored at the start of a
// string, so "tolong cek sk-…" would slip past a whole-text check alone).
// ═══════════════════════════════════════════════════════

import { findSecrets } from '../../vendor/party-contract/umum.js';
import { GalatRuntime, segmen } from './apiRuntime.js';

export const JENIS_MISI = 'riset-sumber';
/** Mission kinds (SPRINT-02 contract): one per class. The runtime refuses a kind outside the agent's skills. */
export const JENIS = Object.freeze({ RISET: 'riset-sumber', PECAH: 'pecah-tugas', PANDUAN: 'susun-panduan' });
export const SEMUA_JENIS = new Set(Object.values(JENIS));
export const MAKS_PERTANYAAN = 300;
export const MAKS_KONTEKS = 1500;
export const MAKS_SUMBER = 3;
export const STATUS_AKHIR = new Set(['selesai', 'selesai_tanpa_temuan', 'gagal', 'dibatalkan']);
/** Waiting for the player (a paid tool asked for approval): not final, and not the mission's own time. */
export const STATUS_MENUNGGU_IZIN = 'menunggu_persetujuan';
export const PUTUSAN = new Set(['setujui', 'perbaiki', 'buang']);

export const PESAN_MISI = Object.freeze({
  KUNCI_DITEMPEL: 'Sepertinya kamu menempelkan kunci API. Jangan tulis kunci di misi. Simpan di Kantor.',
  MISI_BELUM_ADA: 'Misi belum aktif di server ini. Agenmu tetap di party; misinya menyusul.',
  WAKTU_MISI_HABIS: 'Misi belum selesai setelah 10 menit. Agenmu mungkin masih bekerja di server; cek lagi nanti.',
  PERSETUJUAN_BELUM_ADA: 'Persetujuan alat belum aktif di server ini. Misinya tetap menunggu; coba lagi nanti.',
});

const galat = (kode, pesan, data = null) => new GalatRuntime({ kode, pesan, data });

/** True when any part of the text looks like a credential. */
export function adaKunci(...teks) {
  const bagian = [];
  for (const t of teks) {
    if (typeof t !== 'string' || !t) continue;
    bagian.push(t, ...t.split(/\r?\n/), ...t.split(/[\s"'`<>()[\]{},;|?&=#/]+/));
  }
  return findSecrets(bagian.filter(Boolean)).length > 0;
}

const bersihkan = (v) => (typeof v === 'string' ? v.trim() : '');

function periksaSumber(alamat) {
  if (alamat.length > MAKS_SUMBER) throw galat('MASUKAN_TIDAK_SAH', `Maksimal ${MAKS_SUMBER} alamat sumber.`);
  alamat.forEach((a, i) => {
    let u = null;
    try { u = new URL(a); } catch { u = null; }
    if (!u || u.protocol !== 'https:') {
      throw galat('MASUKAN_TIDAK_SAH', `Sumber ${i + 1} harus alamat lengkap yang diawali https://`);
    }
    if (u.username || u.password) {
      throw galat('MASUKAN_TIDAK_SAH', `Sumber ${i + 1} memuat nama pengguna atau kata sandi. Hapus bagian itu.`);
    }
  });
}

function wajib(teks, nama, maks) {
  if (!teks) throw galat('MASUKAN_TIDAK_SAH', `Tulis dulu ${nama} untuk misinya.`);
  if (teks.length > maks) {
    throw galat('MASUKAN_TIDAK_SAH', `${nama[0].toUpperCase()}${nama.slice(1)} terlalu panjang (${teks.length} huruf). Maksimal ${maks}.`);
  }
}

/**
 * Check a mission form before anything leaves the browser. One shape per kind (SPRINT-02):
 *   riset-sumber   pertanyaan (≤ 300), sumber (≤ 3 https)
 *   pecah-tugas    tujuan (≤ 300), konteks? (≤ 1.500)
 *   susun-panduan  topik (≤ 300), sumber (≤ 3 https; at least one unless it builds on a result)
 * `rujuk_misi` (a result of the player's own, approved) may come with any kind.
 * @param {{jenis?: string, pertanyaan?: string, tujuan?: string, konteks?: string, topik?: string,
 *   sumber?: string[], rujuk_misi?: string|null}} masukan
 * @returns {Record<string, any>} the request body fields (without instance_id)
 * @throws {GalatRuntime} KUNCI_DITEMPEL or MASUKAN_TIDAK_SAH, before any request
 */
export function periksaMasukanMisi(masukan = {}) {
  const jenis = masukan.jenis ?? JENIS.RISET;
  if (!SEMUA_JENIS.has(jenis)) throw galat('MASUKAN_TIDAK_SAH', 'Jenis misi tidak dikenal. Muat ulang halaman, lalu coba lagi.');
  const alamat = (Array.isArray(masukan.sumber) ? masukan.sumber : []).map(bersihkan).filter(Boolean);
  const teks = { pertanyaan: bersihkan(masukan.pertanyaan), tujuan: bersihkan(masukan.tujuan), konteks: bersihkan(masukan.konteks), topik: bersihkan(masukan.topik) };
  // Keys first, in every field the kind sends: a key must never be echoed back in a validation message either.
  const dikirim = jenis === JENIS.PECAH ? [teks.tujuan, teks.konteks] : jenis === JENIS.PANDUAN ? [teks.topik, ...alamat] : [teks.pertanyaan, ...alamat];
  if (adaKunci(...dikirim)) throw galat('KUNCI_DITEMPEL', PESAN_MISI.KUNCI_DITEMPEL);
  const rujuk = masukan.rujuk_misi ? segmen('misi', masukan.rujuk_misi) : null;
  const isi = { jenis };
  if (jenis === JENIS.PECAH) {
    wajib(teks.tujuan, 'tujuan', MAKS_PERTANYAAN);
    if (teks.konteks.length > MAKS_KONTEKS) throw galat('MASUKAN_TIDAK_SAH', `Konteks terlalu panjang (${teks.konteks.length} huruf). Maksimal ${MAKS_KONTEKS}.`);
    isi.tujuan = teks.tujuan;
    if (teks.konteks) isi.konteks = teks.konteks;
  } else if (jenis === JENIS.PANDUAN) {
    wajib(teks.topik, 'topik', MAKS_PERTANYAAN);
    periksaSumber(alamat);
    if (!alamat.length && !rujuk) throw galat('MASUKAN_TIDAK_SAH', 'Panduan butuh bahan: isi minimal satu sumber https, atau teruskan dari hasil rekan.');
    isi.topik = teks.topik;
    isi.sumber = alamat;
  } else {
    wajib(teks.pertanyaan, 'pertanyaan', MAKS_PERTANYAAN);
    periksaSumber(alamat);
    isi.pertanyaan = teks.pertanyaan;
    isi.sumber = alamat;
  }
  if (rujuk) isi.rujuk_misi = rujuk;
  return isi;
}

/** The mission's title line, whatever its kind. */
export function judulMisi(misi) {
  const m = misi?.masukan ?? {};
  return misi?.pertanyaan ?? misi?.tujuan ?? misi?.topik ?? m.pertanyaan ?? m.tujuan ?? m.topik ?? misi?.laporan?.pertanyaan ?? null;
}

export class MisiKlien {
  /**
   * @param {{
   *   api: ReturnType<import('./apiRuntime.js').buatApiRuntime>,
   *   jam?: {setTimeout: Function, clearTimeout: Function, sekarang: () => number},
   *   dokumen?: {hidden: boolean, addEventListener: Function} | null,
   *   intervalMs?: number, batasMs?: number, mundurMaksMs?: number,
   * }} p
   */
  constructor({
    api,
    jam = { setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout: (t) => clearTimeout(t), sekarang: () => Date.now() },
    dokumen = globalThis.document ?? null,
    intervalMs = 3000,
    batasMs = 10 * 60 * 1000,
    mundurMaksMs = 30000,
  }) {
    this.api = api;
    this.jam = jam;
    this.dokumen = dokumen;
    this.intervalMs = intervalMs;
    this.batasMs = batasMs;
    this.mundurMaksMs = mundurMaksMs;
    /** @type {Map<string, any>} mission id → watcher */
    this._pemantau = new Map();
    this.dokumen?.addEventListener?.('visibilitychange', () => {
      if (this.dokumen.hidden) return;
      // Back in view: look now instead of waiting for a timer that was never set.
      for (const p of this._pemantau.values()) {
        if (!p.sedangTanya && !p.berhenti) this._tanya(p);
      }
    });
  }

  _tersembunyi() {
    return Boolean(this.dokumen?.hidden);
  }

  /** POST /api/misi. `masukan.jenis` picks the kind (default riset-sumber). Returns {id, status, posisi, eta_detik}. */
  async mulai(instanceId, masukan) {
    const bersih = periksaMasukanMisi(masukan);
    try {
      const r = await this.api.post('/misi', { instance_id: segmen('agen', instanceId), ...bersih });
      return r.misi;
    } catch (err) {
      if (err.kode === 'TIDAK_ADA' && !bersih.rujuk_misi) throw galat('MISI_BELUM_ADA', PESAN_MISI.MISI_BELUM_ADA);
      if (err.kode === 'TIDAK_ADA') throw galat('RUJUKAN_TIDAK_ADA', 'Hasil yang dirujuk tidak ditemukan lagi. Lepas rujukannya, lalu kirim ulang.');
      throw err;
    }
  }

  /**
   * POST /api/misi/:id/persetujuan: let a paid tool run (true) or cancel the mission (false).
   * @returns {Promise<any>} the mission as the runtime answers it (may be null)
   */
  async putuskanIzin(misiId, setuju) {
    if (typeof setuju !== 'boolean') throw galat('PERSETUJUAN_TIDAK_SAH', 'Pilih setujui atau tolak.');
    try {
      const r = await this.api.post(`/misi/${segmen('misi', misiId)}/persetujuan`, { setuju });
      return r.misi ?? null;
    } catch (err) {
      if (err.kode === 'TIDAK_ADA') throw galat('PERSETUJUAN_BELUM_ADA', PESAN_MISI.PERSETUJUAN_BELUM_ADA);
      throw err;
    }
  }

  async ambil(misiId) {
    const r = await this.api.get(`/misi/${segmen('misi', misiId)}`);
    return r.misi;
  }

  /** The player's last missions for one agent (newest first), or [] if missions are not live yet. */
  async daftar(instanceId) {
    try {
      const r = await this.api.get(`/misi?instance_id=${segmen('agen', instanceId)}`);
      return Array.isArray(r.misi) ? r.misi : [];
    } catch (err) {
      if (err.kode === 'TIDAK_ADA') return [];
      throw err;
    }
  }

  async batal(misiId) {
    return this.api.post(`/misi/${segmen('misi', misiId)}/batal`, {});
  }

  /** @param {'setujui'|'perbaiki'|'buang'} putusan */
  async putuskan(misiId, putusan, catatan) {
    if (!PUTUSAN.has(putusan)) throw galat('PUTUSAN_TIDAK_SAH', 'Pilih setujui, perbaiki, atau buang.');
    const isi = { putusan };
    if (typeof catatan === 'string' && catatan.trim()) {
      if (adaKunci(catatan)) throw galat('KUNCI_DITEMPEL', PESAN_MISI.KUNCI_DITEMPEL);
      if (catatan.trim().length > MAKS_PERTANYAAN) {
        throw galat('MASUKAN_TIDAK_SAH', `Catatan terlalu panjang. Maksimal ${MAKS_PERTANYAAN} huruf.`);
      }
      isi.catatan = catatan.trim();
    }
    const r = await this.api.post(`/misi/${segmen('misi', misiId)}/putusan`, isi);
    return r.misi ?? null;
  }

  /** GET /api/otak/status, or null when the route is not live yet. */
  async statusOtak() {
    try {
      const r = await this.api.get('/otak/status');
      return Array.isArray(r.otak) ? r.otak : [];
    } catch (err) {
      if (err.kode === 'TIDAK_ADA') return null;
      throw err;
    }
  }

  /**
   * Watch one mission. `onUbah` receives:
   *   {jenis:'status', misi}        every answer (final ones included, then watching stops)
   *   {jenis:'terputus', galat}     once, when the network/runtime stops answering
   *   {jenis:'tersambung'}          once it answers again
   *   {jenis:'galat', galat}        a failure watching cannot fix (signed out, mission gone)
   *   {jenis:'habis', galat}        time limit reached; the mission may still finish later
   * @returns {() => void} stop watching
   */
  pantau(misiId, onUbah) {
    segmen('misi', misiId);
    this._pemantau.get(misiId)?.hentikan();
    const p = {
      id: misiId,
      onUbah,
      mulai: this.jam.sekarang(),
      timer: null,
      gagalBeruntun: 0,
      terputus: false,
      sedangTanya: false,
      berhenti: false,
      hentikan: () => {
        p.berhenti = true;
        if (p.timer !== null) this.jam.clearTimeout(p.timer);
        p.timer = null;
        if (this._pemantau.get(misiId) === p) this._pemantau.delete(misiId);
      },
    };
    this._pemantau.set(misiId, p);
    this._tanya(p);
    return p.hentikan;
  }

  hentikanSemua() {
    for (const p of [...this._pemantau.values()]) p.hentikan();
  }

  get jumlahDipantau() {
    return this._pemantau.size;
  }

  _beri(p, kabar) {
    try { p.onUbah?.(kabar); } catch (err) { console.warn('[misi] pendengar gagal', err); }
  }

  _jadwal(p, tunda) {
    if (p.berhenti) return;
    if (p.timer !== null) this.jam.clearTimeout(p.timer);
    p.timer = null;
    // Hidden tab: set no timer at all. The visibilitychange handler resumes.
    if (this._tersembunyi()) return;
    p.timer = this.jam.setTimeout(() => {
      p.timer = null;
      this._tanya(p);
    }, tunda);
  }

  async _tanya(p) {
    if (p.berhenti || p.sedangTanya) return;
    if (this._tersembunyi()) return;
    p.sedangTanya = true;
    let misi = null;
    try {
      misi = await this.ambil(p.id);
    } catch (err) {
      p.sedangTanya = false;
      if (p.berhenti) return;
      if (['BELUM_MASUK', 'MISI_TIDAK_ADA', 'TIDAK_ADA', 'ID_TIDAK_SAH', 'BUKAN_JSON'].includes(err.kode)) {
        p.hentikan();
        this._beri(p, { jenis: 'galat', galat: err });
        return;
      }
      p.gagalBeruntun++;
      if (!p.terputus) {
        p.terputus = true;
        this._beri(p, { jenis: 'terputus', galat: err });
      }
      this._jadwal(p, Math.min(this.mundurMaksMs, this.intervalMs * 2 ** p.gagalBeruntun));
      return;
    }
    p.sedangTanya = false;
    if (p.berhenti) return;
    p.gagalBeruntun = 0;
    if (p.terputus) {
      p.terputus = false;
      this._beri(p, { jenis: 'tersambung' });
    }
    this._beri(p, { jenis: 'status', misi });
    if (STATUS_AKHIR.has(misi?.status)) {
      p.hentikan();
      return;
    }
    // Waiting for the player's approval is not the mission taking long: the clock restarts.
    if (misi?.status === STATUS_MENUNGGU_IZIN) p.mulai = this.jam.sekarang();
    if (this.jam.sekarang() - p.mulai >= this.batasMs) {
      p.hentikan();
      this._beri(p, { jenis: 'habis', galat: galat('WAKTU_MISI_HABIS', PESAN_MISI.WAKTU_MISI_HABIS) });
      return;
    }
    this._jadwal(p, this.intervalMs);
  }
}
