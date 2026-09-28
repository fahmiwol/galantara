// ═══════════════════════════════════════════════════════
// markas/keadaan.js — what the Markas SHOWS, as data (no THREE here)
//
// The runtime owns mission state (services/runtime, `status_kerja`). This store
// only mirrors what the world must display for the viewer's own party
// (phasing, laporan 3D §6.8): which agent is in which status, which desk slot it
// uses, and which approved results hang on the Papan Hasil. It outlives the
// Markas view, so warping to a Spot and back redraws the same thing.
//
// Status vocabulary = runtime `status_kerja` (SPRINT-01 API contract):
//   siap | antre | bekerja | hasil_siap | menunggu_otak | gagal | menunggu_persetujuan (M2)
// ═══════════════════════════════════════════════════════

import { KAPASITAS_GULUNGAN, MEJA } from './spek.js';

export const STATUS_KERJA = Object.freeze(['siap', 'antre', 'bekerja', 'hasil_siap', 'menunggu_otak', 'gagal', 'menunggu_persetujuan']);

/**
 * Status colours — dark-surface values of Desain §9.6 (`--st-*-g`, = DNA-VISUAL-MIGHAN
 * `status`), because the beacon and lamps GLOW. Same semantics as the panels and
 * the Kantor. `mati` = lamp off (no agent), not a status.
 */
export const WARNA_STATUS = Object.freeze({
  siaga: 0x8B93A7, kerja: 0x2FE39A, perlu: 0xFFC15C, gagal: 0xFF7A6B, info: 0x7DB8FF, mati: 0x4A3F36,
});

/** Which colour token each status uses (Desain §9.4). `siap` has no lamp: the world stays calm. */
export const WARNA_UNTUK_STATUS = Object.freeze({
  antre: 'siaga', bekerja: 'kerja', hasil_siap: 'perlu', menunggu_otak: 'perlu', gagal: 'gagal', menunggu_persetujuan: 'perlu',
});

/**
 * Where and how each status is shown in 3D (laporan 3D §6.5, Desain §9.4):
 *  keluarga = which family of Markas points; null = not at the Markas (follows / wanders)
 *  pose     = name from src/world/agen/pose.js
 */
export const TAMPILAN_STATUS = Object.freeze({
  siap:          Object.freeze({ keluarga: null, pose: 'bebas' }),
  antre:         Object.freeze({ keluarga: 'meja', pose: 'menunggu' }),
  bekerja:       Object.freeze({ keluarga: 'meja', pose: 'bekerja' }),
  hasil_siap:    Object.freeze({ keluarga: 'hasil', pose: 'lapor' }),
  menunggu_otak: Object.freeze({ keluarga: 'tanya', pose: 'tanya' }),
  gagal:         Object.freeze({ keluarga: 'gagal', pose: 'lesu' }),
  // M2 (PERMINTAAN B2-P2): a paid tool waits for the player's yes. Still mid-mission, so the agent
  // stays at its own desk (same slot), turned to the plaza asking; icon + edge arrow say why.
  menunggu_persetujuan: Object.freeze({ keluarga: 'meja', pose: 'tanya' }),
});

/**
 * Beacon priority, highest first: what needs the player beats what does not.
 * Laporan 3D §6.9 ("menunggu > gagal > … > bekerja > mati"), mapped onto the
 * runtime statuses.
 */
export const PRIORITAS_SUAR = Object.freeze(['hasil_siap', 'menunggu_persetujuan', 'menunggu_otak', 'gagal', 'bekerja', 'antre']);

const JUMLAH_SLOT = MEJA.x.length;

/** Accept `'h_1'`, `{ id: 'h_1' }` (a misi/hasil object), or a number. */
export function idHasil(hasil) {
  const id = typeof hasil === 'object' && hasil !== null ? hasil.id : hasil;
  if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '') {
    throw new Error('gulungan butuh id hasil (string), mis. tambahGulungan(misi.id)');
  }
  return String(id);
}

export class KeadaanMarkas {
  constructor() {
    /** npcId → { status, slot } — only agents that have a Markas status. */
    this.agen = new Map();
    /** Approved results, in the order they were added. */
    this.gulungan = [];
    this._urut = 0;
  }

  /**
   * Record a status. Slot = desk index, kept for as long as the agent has a Markas
   * status (so it returns to the same desk after "minta perbaiki"), released on
   * `siap` or null.
   * @returns {{ npcId:string, status:string|null, slot:number|null, keluarga:string|null, pose:string }}
   */
  setelStatus(npcId, status, { slot } = {}) {
    if (typeof npcId !== 'string' || !npcId) throw new Error('tampilkanStatus3D butuh npcId (string)');
    if (status != null && !STATUS_KERJA.includes(status)) {
      throw new Error(`status_kerja tidak dikenal: "${status}". Yang ada: ${STATUS_KERJA.join(', ')}`);
    }
    const tampilan = TAMPILAN_STATUS[status ?? 'siap'];
    if (!tampilan.keluarga) {
      this.agen.delete(npcId);
      return { npcId, status: status ?? null, slot: null, keluarga: null, pose: tampilan.pose };
    }
    const lama = this.agen.get(npcId);
    let s = lama?.slot ?? null;
    if (Number.isInteger(slot) && slot >= 0 && slot < JUMLAH_SLOT && !this._slotDipakai(slot, npcId)) s = slot;
    if (s == null) s = this._slotBebas();
    if (s == null) {
      // Party is capped at 4 in the contract; a 5th Markas agent is a caller bug.
      console.warn(`[markas] semua ${JUMLAH_SLOT} meja terpakai — "${npcId}" tidak ditempatkan`);
      return { npcId, status, slot: null, keluarga: null, pose: 'bebas' };
    }
    this.agen.set(npcId, { status, slot: s });
    return { npcId, status, slot: s, keluarga: tampilan.keluarga, pose: tampilan.pose };
  }

  lepasAgen(npcId) {
    return this.agen.delete(npcId);
  }

  /** The one status the tower beacon shows, or null (dark). */
  statusSuar() {
    let terbaik = null;
    for (const { status } of this.agen.values()) {
      const p = PRIORITAS_SUAR.indexOf(status);
      if (p >= 0 && (terbaik == null || p < PRIORITAS_SUAR.indexOf(terbaik))) terbaik = status;
    }
    return terbaik;
  }

  /** Status of the agent at desk `i`, or null. */
  statusSlot(i) {
    for (const a of this.agen.values()) if (a.slot === i) return a.status;
    return null;
  }

  /**
   * 1 approved result = 1 scroll. Adding the same id twice is a no-op (polling
   * will deliver the same result more than once).
   */
  tambahGulungan(hasil, { dibaca = false } = {}) {
    const id = idHasil(hasil);
    if (this.gulungan.some((g) => g.id === id)) return { ok: true, baru: false, ...this._posisi(id) };
    this.gulungan.push({ id, dibaca: !!dibaca, urut: this._urut++ });
    return { ok: true, baru: true, ...this._posisi(id) };
  }

  buangGulungan(hasil) {
    const id = idHasil(hasil);
    const i = this.gulungan.findIndex((g) => g.id === id);
    if (i < 0) return { ok: false, jumlah: this.gulungan.length };
    this.gulungan.splice(i, 1);
    return { ok: true, jumlah: this.gulungan.length };
  }

  tandaiDibaca(hasil) {
    const g = this.gulungan.find((x) => x.id === idHasil(hasil));
    if (!g) return false;
    g.dibaca = true;
    return true;
  }

  /**
   * What hangs on the board: at most KAPASITAS_GULUNGAN scrolls. Unread first
   * (top rows, gold), then read; newest first within each. When there are more
   * results than slots, the oldest READ ones are the ones not shown — nothing is
   * lost from the data, the board just has a fixed size.
   * @returns {{ id:string, dibaca:boolean, slot:number }[]}
   */
  gulunganTampil() {
    const urut = [...this.gulungan].sort((a, b) => (a.dibaca - b.dibaca) || (b.urut - a.urut));
    return urut.slice(0, KAPASITAS_GULUNGAN).map((g, slot) => ({ id: g.id, dibaca: g.dibaca, slot }));
  }

  _posisi(id) {
    const t = this.gulunganTampil().find((g) => g.id === id);
    return { tampil: !!t, slot: t ? t.slot : null, jumlah: this.gulungan.length };
  }

  _slotDipakai(slot, kecuali) {
    for (const [id, a] of this.agen) if (a.slot === slot && id !== kecuali) return true;
    return false;
  }

  _slotBebas() {
    for (let i = 0; i < JUMLAH_SLOT; i++) if (!this._slotDipakai(i, null)) return i;
    return null;
  }
}
