// ═══════════════════════════════════════════════════════
// PartyKlien.js — roster (hired agents) and party, as the world sees them.
//
// The runtime is the source of truth (GET/PUT /api/party with `versi`, POST /api/agen/rekrut).
// This module never decides who is in the party on its own; it:
// - validates a party with the SAME contract as the server before sending it (vendored copy,
//   tools/test/party-vendor.test.mjs), so the player gets a clear message without a round trip;
// - retries once on a version conflict (the Kantor may have changed the party meanwhile);
// - keeps a small localStorage copy ONLY as a preview for the next page load, built from an
//   allowlist of fields and refused outright if findSecrets() sees anything (AGENTS.md §2).
// ═══════════════════════════════════════════════════════

import { validateParty, emptyParty, memberCount, MAX_SLOTS } from '../../vendor/party-contract/party.js';
import { findSecrets, isSelfHosted, ID } from '../../vendor/party-contract/umum.js';
import { GalatRuntime, segmen } from './apiRuntime.js';

export const KUNCI_CACHE = 'galantara_party_v2';
/** Party the world creates when the player has none yet. The Kantor reads the same one. */
export const ID_PARTY_BAWAAN = 'party-utama';

const galat = (kode, pesan, data = null) => new GalatRuntime({ kode, pesan, data });

/**
 * Galantara's guest id is `guest:<uuid>`, which the contract refuses as an owner/tenant id.
 * `guest-<uuid>` is accepted. Returns null when nothing valid remains.
 */
export function normalisasiPemilik(id) {
  const bersih = String(id ?? '')
    .trim()
    .toLowerCase()
    .replace(/^guest:/, 'guest-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 64);
  return ID.test(bersih) ? bersih : null;
}

/** Label shown next to a brain. Never omitted: a cloud brain is always named as such. */
export function labelOtak(brain) {
  const provider = String(brain?.provider ?? '');
  if (!provider) return { teks: 'Belum ada otak', jenis: 'kosong' };
  if (provider.toLowerCase() === 'simulasi') return { teks: 'SIMULASI', jenis: 'simulasi' };
  return isSelfHosted(provider)
    ? { teks: 'Milik sendiri', jenis: 'sendiri' }
    : { teks: 'Cloud pihak lain', jenis: 'cloud' };
}

function itemRoster(mentah) {
  const agen = mentah?.agen ?? null;
  if (!agen || typeof agen.instance_id !== 'string') return null;
  return {
    agen,
    versi: Number(mentah.version ?? mentah.versi ?? 0),
    status_kerja: mentah.status_kerja ?? agen.status_kerja ?? null,
  };
}

function lengkapiSlot(party) {
  const slots = Array.isArray(party?.slots) ? party.slots.slice(0, MAX_SLOTS) : [];
  while (slots.length < MAX_SLOTS) slots.push(null);
  return { ...party, slots };
}

export class PartyKlien {
  /**
   * @param {{api: ReturnType<import('./apiRuntime.js').buatApiRuntime>, penyimpanan?: Storage|null}} p
   */
  constructor({ api, penyimpanan = null }) {
    this.api = api;
    this.penyimpanan = penyimpanan;
    this.masuk = false;
    this.termuat = false;
    this.pemain = null;
    /** @type {Map<string, any>} species id → species (galantara.spesies/v1) */
    this.spesies = new Map();
    /** @type {{agen:any, versi:number, status_kerja:string|null}[]} */
    this.roster = [];
    this.party = null;
    this.versiParty = 0;
    /** Cached party from the last visit; shown until the runtime answers. */
    this.pratinjau = null;
    this._pendengar = new Set();
  }

  /** @param {(k: PartyKlien) => void} fn @returns {() => void} */
  onUbah(fn) {
    this._pendengar.add(fn);
    return () => this._pendengar.delete(fn);
  }

  _umumkan() {
    for (const fn of this._pendengar) {
      try { fn(this); } catch (err) { console.warn('[party] pendengar gagal', err); }
    }
  }

  // ── Loading ────────────────────────────────────────────

  async muat() {
    // Species are public (no session needed): the world can mark who is recruitable even for guests.
    const sp = await this.api.get('/spesies').catch(() => null);
    if (sp?.spesies) this.spesies = new Map(sp.spesies.map((s) => [s.id, s]));
    try {
      const saya = await this.api.get('/saya');
      // A runtime may answer guests with {pemain: null} instead of 401 (asked in PERMINTAAN B-P2).
      if (!saya?.pemain) throw new GalatRuntime({ kode: 'BELUM_MASUK', pesan: 'Kamu belum masuk.' });
      this.pemain = saya.pemain;
      this.masuk = true;
    } catch (err) {
      if (err.kode !== 'BELUM_MASUK') throw err;
      this.masuk = false;
      this.pemain = null;
      this.roster = [];
      this.party = null;
      this.versiParty = 0;
      this.termuat = true;
      this._umumkan();
      return this;
    }
    await Promise.all([this._muatRoster(), this._muatParty()]);
    this.termuat = true;
    this.pratinjau = null;
    this._simpanCache();
    this._umumkan();
    return this;
  }

  async _muatRoster() {
    const r = await this.api.get('/agen');
    this.roster = (r.agen ?? []).map(itemRoster).filter(Boolean);
  }

  async _muatParty() {
    const r = await this.api.get('/party');
    const daftar = (r.party ?? []).filter((p) => p?.party);
    const pilih = daftar.find((p) => p.party.id === ID_PARTY_BAWAAN) ?? daftar[0] ?? null;
    if (pilih) {
      this.party = lengkapiSlot(pilih.party);
      this.versiParty = Number(pilih.version ?? pilih.versi ?? 0);
    } else {
      this.party = emptyParty({ id: ID_PARTY_BAWAAN, owner_id: this.pemain });
      this.versiParty = 0; // created on the first save
    }
  }

  /** Development sign-in (RUNTIME_DEV=1 on localhost). */
  async masukDev(pemain) {
    const nama = normalisasiPemilik(pemain);
    if (!nama) throw galat('PEMAIN_TIDAK_SAH', 'Nama pemain tidak sah untuk masuk.');
    try {
      await this.api.post('/dev/masuk', { pemain: nama });
    } catch (err) {
      if (err.kode === 'TIDAK_ADA') {
        throw galat('MASUK_BELUM_ADA', 'Masuk dari dunia belum tersedia di server ini.');
      }
      throw err;
    }
    return this.muat();
  }

  // ── Reading ────────────────────────────────────────────

  agenDariSpesies(templateId) {
    return this.roster.find((r) => r.agen.template?.id === templateId) ?? null;
  }

  agenDariId(instanceId) {
    return this.roster.find((r) => r.agen.instance_id === instanceId) ?? null;
  }

  _slotDari(instanceId) {
    return this.party?.slots?.indexOf(instanceId) ?? -1;
  }

  diParty(templateId) {
    const item = this.agenDariSpesies(templateId);
    return Boolean(item && this._slotDari(item.agen.instance_id) >= 0);
  }

  jumlah() {
    return this.party ? memberCount(this.party) : 0;
  }

  get maks() {
    return MAX_SLOTS;
  }

  /** Party slots resolved to roster items (null = "Slot kosong"). */
  anggota() {
    const slots = this.party?.slots ?? Array(MAX_SLOTS).fill(null);
    return slots.map((id) => (id ? this.agenDariId(id) ?? { agen: { instance_id: id }, versi: 0, status_kerja: null, hilang: true } : null));
  }

  /** Local status update from the mission client, until the next roster load. */
  setelStatus(instanceId, status) {
    const item = this.agenDariId(instanceId);
    if (!item || item.status_kerja === status) return;
    item.status_kerja = status;
    this._umumkan();
  }

  // ── Changing ───────────────────────────────────────────

  _pastikanMasuk() {
    if (!this.masuk) throw galat('BELUM_MASUK', 'Kamu belum masuk. Party disimpan di akunmu.');
  }

  _petaAgen() {
    return Object.fromEntries(this.roster.map((r) => [r.agen.instance_id, r.agen]));
  }

  /**
   * Hire a species (if not yet hired) and put the agent in the party.
   * @returns {Promise<{agen:any, baru:boolean, jumlah:number}>}
   */
  async rekrut(templateId) {
    this._pastikanMasuk();
    const ada = this.agenDariSpesies(templateId);
    if (ada && this._slotDari(ada.agen.instance_id) >= 0) {
      return { agen: ada.agen, baru: false, jumlah: this.jumlah() };
    }
    if (this.jumlah() >= MAX_SLOTS) {
      throw galat('PARTY_PENUH', `Party sudah penuh (${MAX_SLOTS}/${MAX_SLOTS}). Keluarkan satu anggota dulu di Markas.`);
    }
    let item = ada;
    if (!item) {
      try {
        const r = await this.api.post('/agen/rekrut', { template_id: templateId });
        item = itemRoster({ agen: r.agen, versi: r.versi, status_kerja: r.status_kerja });
        if (!item) throw galat('GALAT_SERVER', 'Server tidak mengembalikan agen yang direkrut. Coba lagi.');
        this.roster.push(item);
      } catch (err) {
        // Hired earlier (another tab, the Kantor): not an error, just put it in the party.
        if (err.kode !== 'SUDAH_DIREKRUT') throw err;
        await this._muatRoster();
        item = this.agenDariSpesies(templateId);
        if (!item) throw err;
      }
    }
    const id = item.agen.instance_id;
    await this._simpanParty((p) => {
      if (p.slots.includes(id)) return;
      const kosong = p.slots.indexOf(null);
      if (kosong < 0) {
        throw galat('PARTY_PENUH', `Party sudah penuh (${MAX_SLOTS}/${MAX_SLOTS}). Keluarkan satu anggota dulu di Markas.`);
      }
      p.slots[kosong] = id;
    });
    return { agen: item.agen, baru: true, jumlah: this.jumlah() };
  }

  /** Take an agent out of the party. It stays hired (in the Markas roster). */
  async keluarkan(instanceId) {
    this._pastikanMasuk();
    await this._simpanParty((p) => {
      const i = p.slots.indexOf(instanceId);
      if (i >= 0) p.slots[i] = null;
    });
  }

  /**
   * Apply `ubah` to a copy of the party, validate it with the shared contract, then save.
   * On a version conflict the party is reloaded and `ubah` applied again, once.
   */
  async _simpanParty(ubah, sisaUlang = 1) {
    const calon = lengkapiSlot(this.party ?? emptyParty({ id: ID_PARTY_BAWAAN, owner_id: this.pemain }));
    ubah(calon);
    const vonis = validateParty(calon, { agents: this._petaAgen() });
    if (!vonis.ok) {
      throw galat('PARTY_TIDAK_SAH', vonis.errors[0]?.pesan ?? 'Party belum bisa disimpan.', { errors: vonis.errors });
    }
    try {
      const r = await this.api.put(`/party/${segmen('party', calon.id)}`, { party: calon, versi: this.versiParty });
      this.party = calon;
      this.versiParty = Number(r.versi ?? this.versiParty + 1);
    } catch (err) {
      if (err.kode === 'VERSI_BENTROK' && sisaUlang > 0) {
        await Promise.all([this._muatRoster(), this._muatParty()]);
        return this._simpanParty(ubah, sisaUlang - 1);
      }
      throw err;
    }
    this._simpanCache();
    this._umumkan();
  }

  // ── Preview cache (localStorage) ───────────────────────

  /** Allowlisted copy: ids, species and nicknames only. No loadout, no vault reference. */
  _isiCache() {
    const agen = (this.party?.slots ?? []).filter(Boolean).map((id) => {
      const item = this.agenDariId(id);
      const a = { instance_id: id, template: { id: item?.agen.template?.id ?? null } };
      if (typeof item?.agen.julukan === 'string') a.julukan = item.agen.julukan;
      return a;
    });
    return {
      v: 1,
      pemain: this.pemain,
      party: this.party ? { schema: this.party.schema, id: this.party.id, owner_id: this.party.owner_id, slots: [...this.party.slots] } : null,
      agen,
    };
  }

  _hapusCache() {
    try { this.penyimpanan?.removeItem(KUNCI_CACHE); } catch { /* storage blocked */ }
  }

  /** @returns {boolean} whether a copy was written */
  _simpanCache() {
    if (!this.penyimpanan) return false;
    const isi = this._isiCache();
    if (findSecrets(isi).length) {
      // Never write anything that looks like a credential; drop the old copy as well.
      this._hapusCache();
      return false;
    }
    try {
      this.penyimpanan.setItem(KUNCI_CACHE, JSON.stringify(isi));
      return true;
    } catch {
      return false;
    }
  }

  /** Load last visit's party as a preview (labelled as such by the UI). */
  muatCache() {
    if (!this.penyimpanan) return null;
    let isi = null;
    try {
      isi = JSON.parse(this.penyimpanan.getItem(KUNCI_CACHE) ?? 'null');
    } catch {
      isi = null;
    }
    if (!isi || isi.v !== 1 || !isi.party || findSecrets(isi).length || !validateParty(isi.party).ok) {
      if (isi) this._hapusCache();
      return null;
    }
    this.pratinjau = isi;
    this._umumkan();
    return isi;
  }
}
