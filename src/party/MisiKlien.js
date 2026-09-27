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
export const MAKS_PERTANYAAN = 300;
export const MAKS_SUMBER = 3;
export const STATUS_AKHIR = new Set(['selesai', 'selesai_tanpa_temuan', 'gagal', 'dibatalkan']);
export const PUTUSAN = new Set(['setujui', 'perbaiki', 'buang']);

export const PESAN_MISI = Object.freeze({
  KUNCI_DITEMPEL: 'Sepertinya kamu menempelkan kunci API. Jangan tulis kunci di misi. Simpan di Kantor.',
  MISI_BELUM_ADA: 'Misi belum aktif di server ini. Agenmu tetap di party; misinya menyusul.',
  WAKTU_MISI_HABIS: 'Misi belum selesai setelah 10 menit. Agenmu mungkin masih bekerja di server; cek lagi nanti.',
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

/**
 * @param {{pertanyaan?: string, sumber?: string[]}} masukan
 * @returns {{pertanyaan: string, sumber: string[]}} the cleaned input
 * @throws {GalatRuntime} KUNCI_DITEMPEL or MASUKAN_TIDAK_SAH, before any request
 */
export function periksaMasukanMisi({ pertanyaan, sumber = [] } = {}) {
  const tanya = typeof pertanyaan === 'string' ? pertanyaan.trim() : '';
  const alamat = (Array.isArray(sumber) ? sumber : [])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);
  // Keys first: a key must never be echoed back in a validation message either.
  if (adaKunci(tanya, ...alamat)) throw galat('KUNCI_DITEMPEL', PESAN_MISI.KUNCI_DITEMPEL);
  if (!tanya) throw galat('MASUKAN_TIDAK_SAH', 'Tulis dulu pertanyaan untuk misinya.');
  if (tanya.length > MAKS_PERTANYAAN) {
    throw galat('MASUKAN_TIDAK_SAH', `Pertanyaan terlalu panjang (${tanya.length} huruf). Maksimal ${MAKS_PERTANYAAN}.`);
  }
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
  return { pertanyaan: tanya, sumber: alamat };
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

  /** POST /api/misi. Returns {id, status, posisi, eta_detik}. */
  async mulai(instanceId, masukan) {
    const bersih = periksaMasukanMisi(masukan);
    try {
      const r = await this.api.post('/misi', {
        instance_id: segmen('agen', instanceId),
        jenis: JENIS_MISI,
        pertanyaan: bersih.pertanyaan,
        sumber: bersih.sumber,
      });
      return r.misi;
    } catch (err) {
      if (err.kode === 'TIDAK_ADA') throw galat('MISI_BELUM_ADA', PESAN_MISI.MISI_BELUM_ADA);
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
    if (this.jam.sekarang() - p.mulai >= this.batasMs) {
      p.hentikan();
      this._beri(p, { jenis: 'habis', galat: galat('WAKTU_MISI_HABIS', PESAN_MISI.WAKTU_MISI_HABIS) });
      return;
    }
    this._jadwal(p, this.intervalMs);
  }
}
