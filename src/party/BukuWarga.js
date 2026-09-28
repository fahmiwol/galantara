// ═══════════════════════════════════════════════════════
// BukuWarga.js — which hireable species this player has met (design report §6b/§10 M2: "Buku
// Warga", silhouettes like a Pokédex).
//
// "Met" = talked to in the world, or already hired (the runtime roster is the truth for that).
// Talking is remembered on this device only: a short list of species ids in localStorage, nothing
// else (no names, no loadout, no text), refused outright if findSecrets sees anything. Losing it
// costs nothing but a silhouette that comes back after the next chat.
// ═══════════════════════════════════════════════════════

import { findSecrets } from '../../vendor/party-contract/umum.js';

export const KUNCI_BUKU = 'galantara_buku_warga_v1';
const POLA_ID = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const MAKS_ENTRI = 64;

export class BukuWarga {
  /** @param {{penyimpanan?: Storage|null}} [p] */
  constructor({ penyimpanan = null } = {}) {
    this.penyimpanan = penyimpanan;
    /** @type {Set<string>} species ids met on this device */
    this.ditemui = new Set();
    this._muat();
  }

  _muat() {
    let isi = null;
    try {
      isi = JSON.parse(this.penyimpanan?.getItem(KUNCI_BUKU) ?? 'null');
    } catch {
      isi = null;
    }
    if (!isi || isi.v !== 1 || !Array.isArray(isi.ditemui) || findSecrets(isi).length) return;
    for (const id of isi.ditemui.slice(0, MAKS_ENTRI)) if (typeof id === 'string' && POLA_ID.test(id)) this.ditemui.add(id);
  }

  _simpan() {
    const isi = { v: 1, ditemui: [...this.ditemui].slice(0, MAKS_ENTRI) };
    if (findSecrets(isi).length) return false;
    try {
      this.penyimpanan?.setItem(KUNCI_BUKU, JSON.stringify(isi));
      return true;
    } catch {
      return false; // storage blocked: the book lives for this visit only
    }
  }

  /** @returns {boolean} true the first time this species is met */
  tandai(id) {
    if (typeof id !== 'string' || !POLA_ID.test(id) || this.ditemui.has(id)) return false;
    this.ditemui.add(id);
    this._simpan();
    return true;
  }

  sudah(id) {
    return this.ditemui.has(id);
  }
}

/**
 * Book entries in species order. An unmet species is a silhouette: no name, no class; only where it
 * can be met (a hint, like a Pokédex area), so the book invites a walk instead of spoiling it.
 * @param {{spesies: Array<{id:string, nama:string, kelas_kerja?:string, ditemui_di?:string}>,
 *   ditemui: (id:string) => boolean, status: (id:string) => 'party'|'markas'|null}} p
 */
export function entriBuku({ spesies, ditemui, status }) {
  return spesies.map((sp) => {
    const st = status(sp.id);
    const kenal = Boolean(st) || ditemui(sp.id);
    return kenal
      ? { id: sp.id, ditemui: true, nama: sp.nama, kelas: sp.kelas_kerja ?? '', tempat: sp.ditemui_di ?? null, status: st }
      : { id: sp.id, ditemui: false, nama: null, kelas: null, tempat: sp.ditemui_di ?? null, status: null };
  });
}
