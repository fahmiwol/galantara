// ═══════════════════════════════════════════════════════
// PenandaAgen.js — name plaque ("✦ Sari AI") and status marker above each agent NPC.
//
// Players have dark name pills; agents get a LIGHT paper plaque with an "AI" tag and, while
// they can still be hired, a ✦. Different shape and words, so a player and an agent are told
// apart without relying on colour (design §9.4, VISI pilar 4).
//
// Both ride the ChatBubble layer: one projection path, the same 24 px visibility rule, the same
// overlap handling (ADR-0004/0005). Contents change only when the state changes; positions are
// projected by the layer every frame.
// ═══════════════════════════════════════════════════════

import { TINGGI_KEPALA_NPC } from '../entities/NPC.js';

const TINGGI_PLAKAT = TINGGI_KEPALA_NPC + 0.32;
const TINGGI_STATUS = TINGGI_KEPALA_NPC + 0.78;

/** What the world shows above an agent for each runtime status_kerja. */
const PENANDA_STATUS = {
  antre: { glyph: '⋯', teks: 'menunggu giliran', jenis: 'kerja' },
  bekerja: { glyph: '⋯', teks: 'bekerja', jenis: 'kerja' },
  hasil_siap: { glyph: '!', teks: 'Hasil siap', jenis: 'perlu' },
  menunggu_otak: { glyph: '!', teks: 'otak belum menjawab', jenis: 'perlu' },
  gagal: { glyph: '✕', teks: 'misi gagal', jenis: 'gagal' },
};

/**
 * Pure: plaque and marker contents for one agent.
 * @param {{nama:string, bisaDirekrut:boolean, diParty:boolean, status:string|null, durasi?:string|null}} a
 */
export function isiPenanda({ nama, bisaDirekrut, diParty, status, durasi = null }) {
  const plakat = [
    ...(bisaDirekrut && !diParty ? [{ teks: '✦', kelas: 'pk-bintang' }] : []),
    { teks: nama },
    { teks: 'AI', kelas: 'pk-ai' },
    ...(diParty ? [{ teks: 'Sudah di party-mu', kelas: 'pk-catatan' }] : []),
  ];
  const s = diParty ? PENANDA_STATUS[status] : null;
  let penanda = null;
  if (s) {
    const teks = status === 'hasil_siap' ? s.teks : `${nama} ${s.teks}${status === 'bekerja' && durasi ? ` · ${durasi}` : ''}`;
    penanda = { isi: [{ teks: s.glyph, kelas: 'st-glyph' }, { teks }], kelas: `status-agen st-${s.jenis}` };
  } else if (bisaDirekrut && !diParty) {
    penanda = { isi: [{ teks: '✦', kelas: 'st-glyph' }, { teks: 'Bisa direkrut' }], kelas: 'status-agen st-bisa' };
  }
  return {
    plakat: { isi: plakat, kelas: diParty ? 'plakat-agen redup' : 'plakat-agen' },
    penanda,
  };
}

const tanda = (x) => (x ? `${x.kelas}|${x.isi.map((s) => `${s.kelas ?? ''}:${s.teks}`).join('|')}` : '');

export class PenandaAgen {
  /**
   * @param {{bubble: import('./ChatBubble.js').ChatBubbleLayer, npcs: import('../entities/NPC.js').NPCManager,
   *          daftar: () => Array<{id:string, nama:string, bisaDirekrut:boolean, diParty:boolean, status:string|null, durasi?:string|null}>}} p
   */
  constructor({ bubble, npcs, daftar }) {
    this.bubble = bubble;
    this.npcs = npcs;
    this.daftar = daftar;
    this._tanda = new Map();
  }

  _posisi(id, tinggi) {
    return () => {
      const npc = this.npcs?.get(id);
      if (!npc || !this.npcs.terlihat) return null;
      return { x: npc.x, y: tinggi, z: npc.z };
    };
  }

  /** Recompute contents; cheap when nothing changed. Call a few times per second. */
  perbarui() {
    if (!this.bubble) return;
    for (const a of this.daftar()) {
      const { plakat, penanda } = isiPenanda(a);
      this._pasang(`plakat:${a.id}`, plakat, TINGGI_PLAKAT, a.id);
      this._pasang(`status:${a.id}`, penanda, TINGGI_STATUS, a.id);
    }
  }

  _pasang(kunci, isi, tinggi, id) {
    const t = tanda(isi);
    // Re-create when the layer dropped it (warp between Spots clears every bubble).
    if (this._tanda.get(kunci) === t && (!isi || this.bubble.ada(kunci))) return;
    this._tanda.set(kunci, t);
    if (!isi) {
      this.bubble.buang(kunci);
      return;
    }
    this.bubble.ucap(kunci, '', this._posisi(id, tinggi), { tetap: true, kelas: isi.kelas, isi: isi.isi });
  }
}
