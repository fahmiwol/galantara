// ═══════════════════════════════════════════════════════
// DuniaParty.js — the M1 loop in the world: meet → recruit → Markas → mission → result.
//
// Glue only. State lives in the runtime (PartyKlien, MisiKlien); screens are data
// (ui/gw/tampilan.js); failures are cards (pesanGalat.js); the 3D world is reached through
// kaitDunia.js. Game.js calls init() once and perbarui(dt) every frame.
// ═══════════════════════════════════════════════════════

import { buatApiRuntime } from './apiRuntime.js';
import { PartyKlien, normalisasiPemilik } from './PartyKlien.js';
import { MisiKlien, STATUS_AKHIR, JENIS, SEMUA_JENIS, judulMisi } from './MisiKlien.js';
import { kartuGalat } from './pesanGalat.js';
import { JejakPemilik } from './JejakPemilik.js';
import { BukuWarga, entriBuku } from './BukuWarga.js';
import {
  ruteKerja, posisiMarkas, statusKe3D, statusTerlihat, gulungan, gulunganDibaca, buangGulungan, pasangPenanda, lepasAgen,
} from './kaitDunia.js';
import { Sheet } from '../ui/Sheet.js';
import { PenandaAgen } from '../ui/PenandaAgen.js';
import { ArahkanSaya } from '../ui/ArahkanSaya.js';
import {
  tampilanRekrut, tampilanMarkas, tampilanOtak, tampilanMisi, tampilanHasil, tampilanMasuk, tampilanPersetujuan, tampilanJulukan, tampilanBukuWarga,
  tampilanKartuGalat, durasi, namaTempat, namaOtak,
} from '../ui/gw/tampilan.js';
import { h, render } from '../ui/gw/pohon.js';
import { NPCS, KANTOR_URL } from '../data/config.js';
import { getOrCreateGuestId } from '../data/guestIdentity.js';

/** Mission status (runtime) → agent status in the world (design §9.3). */
/**
 * Queue line for a mission just sent (runtime `posisi`, `eta_detik`; LOG-A A6). `eta_detik` stays
 * null until one mission finished on that brain host: say so, never invent a number.
 * @returns {string|null}
 */
export function teksAntrean(misi) {
  const posisi = Number.isInteger(misi?.posisi) && misi.posisi > 0 ? misi.posisi : null;
  if (!posisi) return null;
  const eta = Number.isFinite(misi.eta_detik) && misi.eta_detik >= 0 ? `± ${Math.max(1, Math.ceil(misi.eta_detik / 60))} mnt` : 'perkiraan belum terukur';
  return `Antrean ke-${posisi} · ${eta}`;
}

/** Mission statuses that carry a result the player can read (one scroll each on the Papan Hasil). */
export const HASIL_ADA = new Set(['selesai', 'selesai_tanpa_temuan']);

/** The form fields to refill "Ubah misi" / "Beri misi lagi" with, whatever the kind. */
export function isianUlang(misi) {
  if (misi?.tujuan !== undefined) return { tujuan: misi.tujuan ?? '', konteks: misi.konteks ?? '' };
  if (misi?.topik !== undefined) return { topik: misi.topik ?? '', sumber: misi.sumber ?? [] };
  return { pertanyaan: misi?.pertanyaan ?? '', sumber: misi?.sumber ?? [] };
}

export const STATUS_DARI_MISI = Object.freeze({
  antre: 'antre',
  berjalan: 'bekerja',
  menunggu_otak: 'menunggu_otak',
  menunggu_persetujuan: 'menunggu_persetujuan',
  selesai: 'hasil_siap',
  selesai_tanpa_temuan: 'hasil_siap',
  gagal: 'gagal',
  dibatalkan: 'siap',
});

const PERLU_PERHATIAN = new Set(['hasil_siap', 'gagal', 'menunggu_otak', 'menunggu_persetujuan']);
/** Party members with these statuses walk behind the player; the rest keep to the Markas (SPRINT-02 B4). */
export const BOLEH_IKUT = new Set(['siap', null]);
/** An agent with one of these statuses is busy with a mission (1 active mission per agent, SPRINT-02). */
export const SEDANG_MISI = new Set(['antre', 'bekerja', 'menunggu_otak', 'menunggu_persetujuan']);

function penyimpananAman() {
  try {
    const s = globalThis.localStorage;
    s?.getItem('x');
    return s ?? null;
  } catch {
    return null; // private mode / blocked storage: run without a preview cache
  }
}

export class DuniaParty {
  /**
   * @param {any} game the Game instance (npcs, avatar, camera, panels, toast, hud, bubble)
   * @param {{api?: any, penyimpanan?: Storage|null, doc?: Document, lokal?: boolean}} [opsi]
   */
  constructor(game, { api, penyimpanan, doc, lokal } = {}) {
    this.game = game;
    this.doc = doc ?? globalThis.document;
    this.lokal = lokal ?? Boolean(globalThis.window?.G_LOCAL);
    this.api = api ?? buatApiRuntime();
    const simpanan = penyimpanan === undefined ? penyimpananAman() : penyimpanan;
    this.party = new PartyKlien({ api: this.api, penyimpanan: simpanan });
    this.buku = new BukuWarga({ penyimpanan: simpanan });
    this.misi = new MisiKlien({ api: this.api });
    this.sheet = new Sheet(this.doc);
    /** Agent NPCs in the world: species that can be hired (config.js `agen: true`). */
    this.agenDunia = NPCS.filter((n) => n.agen).map((n) => n.id);
    /** instance_id → latest mission seen */
    this._misiTerakhir = new Map();
    /** instance_id → GalatRuntime from watching (shown in the Markas) */
    this._galatPantau = new Map();
    /** mission id → instance_id of every mission seen (names a chain "Sari → Budi") */
    this._pemilikMisi = new Map();
    /** instance_id → {id, nama, judul}: the approved result a colleague's next mission builds on */
    this._rujukan = new Map();
    this._statusOtak = undefined;
    this._tunda = null;
    this._jedaPenanda = 0;
    this._terputus = false;
    this.penanda = null;
    this.arah = null;
    /** The player's recent path; companion k walks where the player was k·0.35 s of walking ago. */
    this.jejak = new JejakPemilik();
    /** species ids following the player, in party slot order (companion k = index + 1) */
    this.pengikut = [];
    this._jedaIkut = 0;
  }

  init() {
    const g = this.game;
    g.panels?.onAksi?.((aksi, npc) => this.aksiDialog(aksi, npc));
    g.panels?.saringSyarat?.((syarat, npc) => this.syarat(syarat, npc));
    this.penanda = new PenandaAgen({ bubble: g.bubble, npcs: g.npcs, daftar: () => this._daftarPenanda(), adaIkon: (id) => statusTerlihat(id) });
    this.arah = new ArahkanSaya({
      doc: this.doc,
      ambilPemain: () => g.avatar?.getPosition(),
      ambilTheta: () => g.camera?.theta ?? 0,
    });
    for (const id of this.agenDunia) {
      const npc = g.npcs?.get(id);
      if (npc) pasangPenanda(id, npc.mesh);
    }
    this.doc.getElementById('bb-party-btn')?.addEventListener('click', () => this.bukaMarkas());
    this.party.onUbah(() => this._segarkan());
    this.party.muatCache();
    this._segarkan();
    this.muat();
    return this;
  }

  async muat() {
    try {
      await this.party.muat();
      this._terputus = false;
      await this._lanjutkanMisi();
    } catch (err) {
      // The world keeps working without the runtime; the Markas shows why when opened.
      this._galatMuat = err;
      console.warn(`[party] runtime belum bisa dimuat: ${err.kode ?? err.message}`);
    }
    this._segarkan();
  }

  /** Every frame. */
  perbarui(dt) {
    this.arah?.perbarui();
    this._perbaruiIkut(dt);
    this._jedaPenanda -= dt;
    if (this._jedaPenanda <= 0) {
      this._jedaPenanda = 0.5;
      this.penanda?.perbarui();
    }
  }

  // ── Party follows the player (local, Game report §6b) ──

  _perbaruiIkut(dt) {
    const g = this.game;
    const pos = g.avatar?.getPosition?.();
    if (pos) this.jejak.catat(pos, dt, g.avatar?._facing ?? 0);
    this._jedaIkut -= dt;
    if (this._jedaIkut <= 0) {
      this._jedaIkut = 0.5;
      this._selaraskanIkut();
    }
    this.pengikut.forEach((spId, i) => g.npcs?.setelTitikIkut?.(spId, this.jejak.titikPendamping(i + 1)));
  }

  /**
   * Who follows: party members that are not on a mission (status siap), in slot order. A member
   * strolling (just recruited, back from the desk) starts following; one that stopped qualifying
   * (a mission, left the party) strolls from where it stands. Mission moves (desk, results board,
   * report) are never interrupted: only 'keliling' is turned into 'ikut'.
   */
  _selaraskanIkut() {
    const npcs = this.game.npcs;
    if (!npcs) return;
    const ikut = [];
    if (this.party.masuk) {
      for (const a of this.party.anggota()) {
        if (!a || a.hilang || !BOLEH_IKUT.has(a.status_kerja ?? null)) continue;
        const spId = a.agen.template?.id;
        const k = npcs.get(spId)?.perilaku?.keadaan;
        if (k === 'keliling') npcs.perintah(spId, { jenis: 'ikut' });
        if (k === 'keliling' || k === 'ikut') ikut.push(spId);
      }
    }
    for (const spId of this.pengikut) {
      if (ikut.includes(spId)) continue;
      const npc = npcs.get(spId);
      npcs.setelTitikIkut?.(spId, null);
      if (npc?.perilaku?.keadaan === 'ikut') npcs.perintah(spId, { jenis: 'keliling', jangkar: { x: npc.x, z: npc.z } });
    }
    this.pengikut = ikut;
  }

  // ── Species & agents as the UI needs them ──────────────

  _spesies(id) {
    const rt = this.party.spesies.get(id);
    const npc = NPCS.find((n) => n.id === id);
    return {
      id,
      nama: rt?.nama ?? npc?.name ?? id,
      kelas_kerja: rt?.kelas_kerja ?? npc?.role ?? '',
      ditemui_di: rt?.ditemui_di ?? 'oola-hub',
      misi_keahlian: rt?.misi_keahlian ?? [],
      equipment_dasar: rt?.equipment_dasar ?? [],
      bisa_direkrut: rt ? rt.bisa_direkrut !== false : Boolean(npc?.agen),
    };
  }

  /** The mission kind a species does (its first known skill), or null (no mission yet). */
  _jenis(spesiesId) {
    return this._spesies(spesiesId).misi_keahlian.find((j) => SEMUA_JENIS.has(j)) ?? null;
  }

  _namaAgen(item) {
    return item?.agen.julukan || this._spesies(item?.agen.template?.id).nama;
  }

  _anggota(item) {
    if (!item || item.hilang) return null;
    const sp = this._spesies(item.agen.template?.id);
    const misi = this._misiTerakhir.get(item.agen.instance_id);
    const status = item.status_kerja ?? null;
    return {
      instance_id: item.agen.instance_id,
      id: sp.id,
      nama: sp.nama,
      julukan: item.agen.julukan,
      kelas: sp.kelas_kerja,
      status,
      brain: item.agen.loadout?.brain ?? null,
      bisaMisi: Boolean(this._jenis(sp.id)),
      jenis: this._jenis(sp.id),
      pengalaman: item.pengalaman ?? null,
      durasi: status === 'bekerja' || status === 'antre' ? durasi(misi?.dibuat) : null,
      sebab: status === 'gagal' ? this._sebabGagal(misi) : null,
    };
  }

  _sebabGagal(misi) {
    // Runtime M1 sends `alasan {kode, pesan}` (LOG-A A5); the older names stay for other runtimes.
    const kode = misi?.alasan?.kode ?? misi?.error_code ?? misi?.galat?.kode ?? null;
    const SEBAB = {
      SUMBER_GAGAL: 'sumber tidak bisa dibuka', OTAK_TIDAK_TERBACA: 'jawaban otak tidak terbaca', GALAT_INTERNAL: 'galat di server',
      brain_timeout: 'otak tidak menjawab', vault_revoked: 'kunci dicabut', provider_auth: 'kunci ditolak', provider_quota: 'kuota habis', no_sources: 'tanpa sumber', cancelled: 'dibatalkan',
    };
    return SEBAB[kode] ?? null;
  }

  /** The nearest hireable species not yet in the party (for "Arahkan saya ke …"). */
  _rekrutBerikut() {
    const pemain = this.game.avatar?.getPosition?.() ?? { x: 0, z: 0 };
    let terbaik = null;
    for (const id of this.agenDunia) {
      const sp = this._spesies(id);
      if (!sp.bisa_direkrut || this.party.diParty(id)) continue;
      const npc = this.game.npcs?.get(id);
      const jarak = npc ? Math.hypot(npc.x - pemain.x, npc.z - pemain.z) : Infinity;
      if (!terbaik || jarak < terbaik.jarak) terbaik = { id, nama: sp.nama, tempat: namaTempat(sp.ditemui_di), jarak };
    }
    return terbaik;
  }

  _daftarPenanda() {
    return this.agenDunia.map((id) => {
      const sp = this._spesies(id);
      const item = this.party.agenDariSpesies(id);
      const diParty = this.party.diParty(id);
      const misi = item ? this._misiTerakhir.get(item.agen.instance_id) : null;
      return {
        id,
        nama: item?.agen.julukan || sp.nama,
        bisaDirekrut: sp.bisa_direkrut && !item,
        diParty,
        // One status, one channel (ADR-0005): while the Markas's 28 px icon shows it over the
        // agent, B's text marker stays away (the plaque with name + AI remains).
        status: diParty && !statusTerlihat(id) ? item?.status_kerja ?? null : null,
        durasi: misi ? durasi(misi.dibuat) : null,
      };
    });
  }

  // ── Buku Warga ─────────────────────────────────────────

  /** Hireable species: the runtime's list first, then world NPCs marked `agen` it does not know. */
  _daftarSpesies() {
    const ids = [...this.party.spesies.values()].filter((sp) => sp.bisa_direkrut !== false).map((sp) => sp.id);
    for (const id of this.agenDunia) if (!ids.includes(id)) ids.push(id);
    return ids.map((id) => this._spesies(id));
  }

  /** The player talked to an NPC (Game._tryTalkNPC). A hireable species gets its page in the book. */
  temui(npcId) {
    if (!this._daftarSpesies().some((sp) => sp.id === npcId)) return false;
    const baru = this.buku.tandai(npcId);
    if (baru) this.game.toast?.show(`📖 ${this._spesies(npcId).nama} tercatat di Buku Warga.`, 'g');
    return baru;
  }

  bukaBukuWarga() {
    const entri = entriBuku({
      spesies: this._daftarSpesies(),
      ditemui: (id) => this.buku.sudah(id),
      status: (id) => (this.party.diParty(id) ? 'party' : this.party.agenDariSpesies(id) ? 'markas' : null),
    });
    this.sheet.buka('buku', tampilanBukuWarga({ entri }, {
      ...this._aksiUmum(),
      kembali: () => this.bukaMarkas(),
      arahkan: (id) => (this.game.npcs?.get(id) ? (this.sheet.tutup(), this.arahkanKe(id)) : undefined),
    }));
  }

  // ── Dialog hooks (Panels.js) ───────────────────────────

  /** Dialog choice filter: `syarat` on a choice in config.js. */
  syarat(syarat, npc) {
    const id = npc?.id;
    if (syarat === 'belum_di_party') return !this.party.diParty(id);
    if (syarat === 'di_party') return this.party.diParty(id);
    if (syarat === 'bisa_misi') return this.party.diParty(id) && Boolean(this._jenis(id));
    return true;
  }

  aksiDialog(aksi, npc) {
    if (aksi === 'rekrut') return this.bukaRekrut(npc.id);
    if (aksi === 'misi') {
      const item = this.party.agenDariSpesies(npc.id);
      return item ? this.bukaMisi(item.agen.instance_id) : this.bukaRekrut(npc.id);
    }
    if (aksi === 'markas') return this.bukaMarkas();
    console.warn(`[party] aksi dialog tidak dikenal: ${aksi}`);
    return undefined;
  }

  // ── Sheets ─────────────────────────────────────────────

  _aksiUmum() {
    return {
      tutup: () => this.sheet.tutup(),
      kartu: (aksi, kartu) => this.aksiKartu(aksi, kartu),
      urlKantor: KANTOR_URL,
    };
  }

  bukaMasuk(namaAgen = 'agenmu', lanjut = null) {
    this._lanjutSetelahMasuk = lanjut;
    this.sheet.buka('masuk', tampilanMasuk({ nama: namaAgen, dev: this.lokal }, {
      ...this._aksiUmum(),
      masuk: () => this.masuk(),
    }));
  }

  async masuk() {
    if (!this.lokal) {
      this._kartuDiSheet('masuk', kartuGalat({ kode: 'MASUK_BELUM_ADA' }));
      return;
    }
    try {
      await this.party.masukDev(normalisasiPemilik(getOrCreateGuestId()));
      this.game.toast?.show(`Masuk sebagai ${this.party.pemain} (mode pengembang).`, 'g');
      await this._lanjutkanMisi();
      const lanjut = this._lanjutSetelahMasuk;
      this._lanjutSetelahMasuk = null;
      if (lanjut) lanjut();
      else this.sheet.tutup();
    } catch (err) {
      this._kartuDiSheet('masuk', kartuGalat(err));
    }
  }

  /** Put a failure card at the bottom of the current sheet (keeps the context visible). */
  _kartuDiSheet(nama, kartu) {
    const aksi = this._aksiUmum();
    const kartuPohon = tampilanKartuGalat(kartu, aksi);
    if (!this.sheet.terbuka) {
      this.sheet.buka('galat', h('div', { kelas: 'gw-isi' }, h('header', { kelas: 'gw-kepala' },
        h('h2', { kelas: 'gw-judul', id: 'gw-judul', attr: { tabindex: '-1' }, teks: kartu.judul ?? 'Ada kendala' }),
        h('button', { kelas: 'gw-x', attr: { type: 'button', 'aria-label': 'Tutup' }, teks: '✕', on: { click: () => this.sheet.tutup() } })), kartuPohon));
      return;
    }
    const wadah = this.sheet.cari('.gw-isi');
    if (!wadah) return;
    wadah.querySelector('.gw-kartu-galat')?.remove();
    wadah.appendChild(render(kartuPohon, this.doc));
    wadah.querySelector('.gw-kartu-galat .gw-cta')?.focus?.();
    this.sheet.nama = nama;
  }

  bukaRekrut(id) {
    const sp = this._spesies(id);
    if (!this.party.masuk) return this.bukaMasuk(sp.nama, () => this.bukaRekrut(id));
    if (this.party.diParty(id)) return this.bukaMarkas();
    this.sheet.buka('rekrut', tampilanRekrut({ spesies: sp, jumlah: this.party.jumlah(), maks: this.party.maks, otak: null }, {
      ...this._aksiUmum(),
      rekrut: () => this.rekrut(id),
      bukaMarkas: () => this.bukaMarkas(),
    }));
    return undefined;
  }

  async rekrut(id) {
    const sp = this._spesies(id);
    this._ulang = () => this.rekrut(id);
    try {
      const r = await this.party.rekrut(id);
      this.game.toast?.show(`${sp.nama} gabung party (${r.jumlah}/${this.party.maks}). Lihat di Markas.`, 'g');
      this.sheet.umumkan(`${sp.nama} gabung party, ${r.jumlah} dari ${this.party.maks}.`);
      this.bukaMarkas();
    } catch (err) {
      if (err.kode === 'BELUM_MASUK') return this.bukaMasuk(sp.nama, () => this.bukaRekrut(id));
      this._kartuDiSheet('rekrut', kartuGalat(err, { nama: sp.nama }));
    }
    return undefined;
  }

  _keadaanMarkas() {
    const anggota = this.party.masuk
      ? this.party.anggota().map((a) => this._anggota(a))
      : (this.party.pratinjau?.party?.slots ?? []).map((id) => {
        if (!id) return null;
        const c = this.party.pratinjau.agen.find((a) => a.instance_id === id);
        const sp = this._spesies(c?.template?.id);
        return { instance_id: id, id: sp.id, nama: sp.nama, julukan: c?.julukan, kelas: sp.kelas_kerja, status: null, brain: null, bisaMisi: false };
      });
    while (anggota.length < this.party.maks) anggota.push(null);
    const diMarkas = this.party.masuk ? this.party.diMarkas().map((a) => this._anggota(a)).filter(Boolean) : [];
    return { anggota, maks: this.party.maks, pratinjau: !this.party.masuk && Boolean(this.party.pratinjau), berikut: this._rekrutBerikut(), diMarkas };
  }

  _aksiMarkas() {
    return {
      ...this._aksiUmum(),
      bukaMisi: (iid) => this.bukaMisi(iid),
      bukaHasil: (iid) => this.bukaHasil(iid),
      bukaOtak: (iid) => this.bukaOtak(iid),
      bukaIzin: (iid) => this.bukaIzin(iid),
      bukaJulukan: this.party.masuk ? (iid) => this.bukaJulukan(iid) : null,
      bawa: (iid) => this.bawa(iid),
      bukaBuku: () => this.bukaBukuWarga(),
      bukaKantor: () => this.bukaKantor?.(),
      keluarkan: (iid) => this.keluarkan(iid),
      batalMisi: (iid) => this.batalMisi(iid),
      arahkan: (id) => { this.sheet.tutup(); this.arahkanKe(id); },
    };
  }

  _pohonMarkas() {
    const pohon = tampilanMarkas(this._keadaanMarkas(), this._aksiMarkas());
    const galat = this._galatMuat && !this.party.masuk ? kartuGalat(this._galatMuat) : (this._terputus ? kartuGalat({ kode: 'JARINGAN' }) : null);
    if (galat) pohon.anak.splice(1, 0, tampilanKartuGalat(galat, this._aksiUmum()));
    return pohon;
  }

  bukaMarkas() {
    if (!this.party.masuk && this.party.termuat && !this._galatMuat) return this.bukaMasuk('agenmu', () => this.bukaMarkas());
    this.sheet.buka('markas', this._pohonMarkas());
    return undefined;
  }

  async bukaOtak(instanceId) {
    const item = this.party.agenDariId(instanceId);
    if (!item) return;
    const nama = item.agen.julukan || this._spesies(item.agen.template?.id).nama;
    const pohon = () => tampilanOtak({ nama, brain: item.agen.loadout?.brain, statusOtak: this._statusOtak ?? null }, {
      ...this._aksiUmum(),
      kembali: () => this.bukaMarkas(),
    });
    this.sheet.buka('otak', pohon());
    if (this._statusOtak === undefined) {
      try {
        this._statusOtak = await this.misi.statusOtak();
      } catch {
        this._statusOtak = null;
      }
      this.sheet.ganti('otak', pohon());
    }
  }

  bukaMisi(instanceId, isian = {}, galat = null) {
    const item = this.party.agenDariId(instanceId);
    if (!item) return this.bukaMarkas();
    const spId = item.agen.template?.id;
    const nama = this._namaAgen(item);
    const jenis = this._jenis(spId) ?? JENIS.RISET;
    const rujukan = this._rujukan.get(instanceId) ?? null;
    this._isianTerakhir = isian;
    this.sheet.buka('misi', tampilanMisi({
      nama, brain: item.agen.loadout?.brain, jenis, isian, galat, rujukan,
      equipment: this._spesies(spId).equipment_dasar.map((e) => e.id).filter((id) => id !== 'tanya-pemilik'),
    }, {
      ...this._aksiUmum(),
      kembali: () => this.bukaMarkas(),
      kirim: (masukan) => this.kirimMisi(instanceId, masukan),
      lepasRujukan: rujukan ? () => { this._rujukan.delete(instanceId); this.bukaMisi(instanceId, this._isianTerakhir); } : null,
      kartu: (aksi, kartu) => {
        if (aksi === 'hapusTeks') return this.bukaMisi(instanceId, {});
        if (aksi === 'perbaikiIsian') return this.bukaMisi(instanceId, this._isianTerakhir);
        if (aksi === 'lepasRujukan') { this._rujukan.delete(instanceId); return this.bukaMisi(instanceId, this._isianTerakhir); }
        return this.aksiKartu(aksi, kartu);
      },
    }), { fokus: !galat });
    if (galat) this.sheet.cari('.gw-kartu-galat .gw-cta')?.focus?.();
    return undefined;
  }

  async kirimMisi(instanceId, masukan) {
    const item = this.party.agenDariId(instanceId);
    const sp = this._spesies(item?.agen.template?.id);
    const nama = this._namaAgen(item);
    const rujukan = this._rujukan.get(instanceId) ?? null;
    const isi = { jenis: this._jenis(sp.id) ?? JENIS.RISET, ...masukan };
    if (rujukan) isi.rujuk_misi = rujukan.id;
    this._isianTerakhir = masukan;
    this._ulang = () => this.kirimMisi(instanceId, masukan);
    try {
      const misi = await this.misi.mulai(instanceId, isi);
      this._rujukan.delete(instanceId);
      this._pemilikMisi.set(misi.id, instanceId);
      const judul = { pertanyaan: isi.pertanyaan, tujuan: isi.tujuan, topik: isi.topik };
      for (const k of Object.keys(judul)) if (judul[k] === undefined) delete judul[k];
      this._misiTerakhir.set(instanceId, {
        ...misi, instance_id: instanceId, jenis: isi.jenis, ...judul,
        ...(rujukan ? { rujuk_misi: rujukan.id } : {}),
        dibuat: misi.dibuat ?? new Date().toISOString(),
      });
      this.party.setelStatus(instanceId, STATUS_DARI_MISI[misi.status] ?? 'antre');
      this.sheet.tutup();
      const antrean = teksAntrean(misi);
      this.game.toast?.show(`${nama} berangkat ke meja kerja di Markas.${antrean ? ` ${antrean}.` : ''} Kamu bisa lanjut jalan-jalan.`, 'g');
      // 3D first: the Markas assigns this agent a desk, and the walk goes to that desk.
      const st = STATUS_DARI_MISI[misi.status] ?? 'antre';
      this._gerakkan(sp.id, st, this._status3D(sp.id, st));
      this._pantau(instanceId, misi.id);
    } catch (err) {
      // The text stays (unless it holds a key): the card explains, the form is right there.
      const aman = err.kode === 'KUNCI_DITEMPEL' ? {} : masukan;
      this.bukaMisi(instanceId, aman, kartuGalat(err, { nama }));
    }
  }

  _keTempatKerja(spesiesId, rute = null) {
    this.game.npcs?.perintah(spesiesId, { jenis: 'menuju', titik: rute ?? ruteKerja(spesiesId), lalu: 'bekerja' });
  }

  /** Tell the 3D world the status; the pose it names is held by the NPC once it has arrived. */
  _status3D(spId, st) {
    const r = statusKe3D(spId, st);
    this.game.npcs?.setelPose?.(spId, r.pose);
    return r;
  }

  /**
   * Walk the agent to where its status lives. The 3D Markas decides the place (desk, results
   * board, the brain question spot, the bench); without it B falls back to its own moves:
   * work spot in front of the site, coming to the player to report, strolling.
   * @param {{r: ReturnType<typeof statusKe3D>}|any} r plan from _status3D
   * @param {{hanyaDariKeliling?: boolean}} [opsi] desk statuses: do not restart a walk already under way
   */
  _gerakkan(spId, st, r, { hanyaDariKeliling = false } = {}) {
    const npcs = this.game.npcs;
    if (!npcs) return;
    if (st === 'antre' || st === 'bekerja' || st === 'menunggu_persetujuan') {
      // Waiting for approval is still mid-mission: the agent stays at its desk.
      if (!hanyaDariKeliling || npcs.get(spId)?.perilaku.keadaan === 'keliling') this._keTempatKerja(spId, r.rute);
    } else if (st === 'siap' && this.party.diParty(spId)) {
      // Free again: back to walking behind the player (the next sync gives it its place in line).
      npcs.perintah(spId, { jenis: 'ikut' });
      this._jedaIkut = 0;
    } else if (r.rute) {
      npcs.perintah(spId, { jenis: 'menuju', titik: r.rute, lalu: 'bekerja' });
    } else if (st === 'hasil_siap') {
      npcs.perintah(spId, { jenis: 'lapor' });
    } else {
      npcs.perintah(spId, { jenis: 'keliling' });
    }
  }

  _pantau(instanceId, misiId) {
    this._galatPantau.delete(instanceId);
    this.misi.pantau(misiId, (kabar) => this._kabarMisi(instanceId, kabar));
  }

  _kabarMisi(instanceId, kabar) {
    const item = this.party.agenDariId(instanceId);
    const spId = item?.agen.template?.id;
    const nama = item?.agen.julukan || this._spesies(spId).nama;
    if (kabar.jenis === 'terputus') {
      this._terputus = true;
      this.game.toast?.show(`Koneksi putus. ${nama} tetap bekerja di server; hasilnya menunggu saat kamu tersambung lagi.`, 'a');
    } else if (kabar.jenis === 'tersambung') {
      this._terputus = false;
    } else if (kabar.jenis === 'galat' || kabar.jenis === 'habis') {
      this._galatPantau.set(instanceId, kabar.galat);
      if (kabar.galat?.kode === 'BELUM_MASUK') this.party.masuk = false;
    } else if (kabar.jenis === 'status') {
      const misi = kabar.misi;
      const lama = this._misiTerakhir.get(instanceId);
      this._misiTerakhir.set(instanceId, { ...lama, ...misi });
      const st = STATUS_DARI_MISI[misi.status] ?? item?.status_kerja ?? null;
      const sebelum = item?.status_kerja;
      this.party.setelStatus(instanceId, st);
      // Every finished result gets its scroll (idempotent per id, so polling may resend it).
      const gabung = this._misiTerakhir.get(instanceId);
      if (HASIL_ADA.has(misi.status) && gabung?.putusan !== 'buang') gulungan(gabung);
      if (st !== sebelum) this._statusBerubah(spId, nama, st, sebelum);
    }
    this._segarkan();
  }

  _statusBerubah(spId, nama, st, sebelum) {
    const r = this._status3D(spId, st);
    if (st === 'siap' && !sebelum) return;
    this._gerakkan(spId, st, r, { hanyaDariKeliling: true });
    // A toast only when the world is not already showing it (icon over the agent or edge arrow).
    const tampak = statusTerlihat(spId);
    if (st === 'hasil_siap') {
      if (!tampak) this.game.toast?.show(`Hasil ${nama} siap. Periksa dulu sebelum disimpan.`, 'g');
      this.sheet.umumkan(`${nama}: hasil siap.`);
    } else if (st === 'menunggu_persetujuan') {
      // A decision only the player can make: always said, even when the world shows an icon.
      this.game.toast?.show(`${nama} minta izin memakai alat berbiaya. Buka Markas → Periksa izin.`, 'a');
      this.sheet.umumkan(`${nama}: menunggu izinmu.`);
    } else if (st === 'gagal') {
      if (!tampak) this.game.toast?.show(`Misi ${nama} gagal. Buka Markas untuk sebab dan langkahnya.`, 'a');
      this.sheet.umumkan(`${nama}: misi gagal.`);
    }
  }

  /** After (re)loading: find missions still running or waiting for a verdict, and watch them. */
  async _lanjutkanMisi() {
    if (!this.party.masuk) return;
    for (const a of this.party.anggota()) {
      if (!a || a.hilang) continue;
      const sp = this._spesies(a.agen.template?.id);
      if (!this._jenis(sp.id)) continue;
      let daftar = [];
      try {
        daftar = await this.misi.daftar(a.agen.instance_id);
      } catch {
        return; // missions not reachable now; the Markas still works
      }
      for (const m of daftar) if (m?.id) this._pemilikMisi.set(m.id, a.agen.instance_id);
      const terbaru = daftar[0];
      if (!terbaru) continue;
      this._misiTerakhir.set(a.agen.instance_id, terbaru);
      const menunggu = STATUS_AKHIR.has(terbaru.status) ? (terbaru.putusan ? 'siap' : STATUS_DARI_MISI[terbaru.status]) : STATUS_DARI_MISI[terbaru.status];
      this.party.setelStatus(a.agen.instance_id, menunggu ?? a.status_kerja);
      const r = this._status3D(sp.id, menunggu);
      if (HASIL_ADA.has(terbaru.status) && terbaru.putusan !== 'buang') {
        gulungan(terbaru);
        if (terbaru.putusan) gulunganDibaca(terbaru);
      }
      if (menunggu && menunggu !== 'siap') this._gerakkan(sp.id, menunggu, r);
      if (!STATUS_AKHIR.has(terbaru.status)) this._pantau(a.agen.instance_id, terbaru.id);
    }
  }

  async bukaHasil(instanceId, langkah = 'utama', galat = null) {
    const item = this.party.agenDariId(instanceId);
    if (!item) return;
    const nama = item.agen.julukan || this._spesies(item.agen.template?.id).nama;
    let misi = this._misiTerakhir.get(instanceId);
    if (misi?.id && !misi.laporan && STATUS_AKHIR.has(misi.status)) {
      try {
        misi = await this.misi.ambil(misi.id);
        this._misiTerakhir.set(instanceId, misi);
      } catch (err) {
        this._kartuDiSheet('hasil', kartuGalat(err, { nama }));
        return;
      }
    }
    if (!misi) {
      this._kartuDiSheet('hasil', kartuGalat({ kode: 'MISI_TIDAK_ADA' }, { nama }));
      return;
    }
    if (HASIL_ADA.has(misi.status)) gulunganDibaca(misi); // opened: its scroll turns from gold to paper
    this._pemilikMisi.set(misi.id, instanceId);
    const brain = item.agen.loadout?.brain;
    const galatMisi = galat ?? (misi.status === 'gagal'
      ? kartuGalat(misi.error_code ?? misi.galat?.kode ?? 'GALAT_SERVER', { nama, otak: namaOtak(brain), topik: judulMisi(misi), selfHosted: brain && ['migancore', 'ollama', 'local'].includes(brain.provider), pesan: misi.galat?.pesan })
      : null);
    this.sheet.buka('hasil', tampilanHasil({ nama, misi, langkah, galat: galatMisi, rekan: this._rekan(instanceId), rantaiNama: this._namaRantai(misi) }, {
      ...this._aksiUmum(),
      setujui: () => this.putuskan(instanceId, 'setujui'),
      mintaPerbaiki: () => this.bukaHasil(instanceId, 'perbaiki'),
      buang: () => this.bukaHasil(instanceId, 'buang'),
      buangPasti: () => this.putuskan(instanceId, 'buang'),
      kembaliKeHasil: () => this.bukaHasil(instanceId),
      perbaiki: (catatan) => this.putuskan(instanceId, 'perbaiki', catatan),
      teruskan: (tujuanIid) => this.teruskan(instanceId, tujuanIid),
      kartu: (aksi, kartu) => {
        if (aksi === 'beriMisi' || aksi === 'ubahMisi') return this.bukaMisi(instanceId, isianUlang(misi));
        if (aksi === 'lihatOtak') return this.bukaOtak(instanceId);
        return this.aksiKartu(aksi, kartu);
      },
    }));
  }

  /** Party members a result can be passed on to: everyone else with a mission kind (busy ones flagged). */
  _rekan(instanceId) {
    if (!this.party.masuk) return [];
    return this.party.anggota()
      .filter((a) => a && !a.hilang && a.agen.instance_id !== instanceId)
      .map((a) => ({ instance_id: a.agen.instance_id, nama: this._namaAgen(a), jenis: this._jenis(a.agen.template?.id), sibuk: SEDANG_MISI.has(a.status_kerja) }))
      .filter((r) => r.jenis);
  }

  /** "Sari → Budi" for a chain whose missions this world has seen; null when any link is unknown. */
  _namaRantai(misi) {
    const rantai = Array.isArray(misi?.rantai) ? misi.rantai : null;
    if (!rantai || rantai.length < 2) return null;
    const nama = rantai.map((id) => this._namaAgen(this.party.agenDariId(this._pemilikMisi.get(id))));
    return rantai.every((id) => this.party.agenDariId(this._pemilikMisi.get(id))) ? nama : null;
  }

  /**
   * "Teruskan ke Budi": the next mission of a colleague builds on this approved result (rujuk_misi).
   * The runtime reads the result's findings and sources as DATA; the form only shows where it comes from.
   */
  teruskan(dariIid, keIid) {
    const misi = this._misiTerakhir.get(dariIid);
    const dari = this.party.agenDariId(dariIid);
    const ke = this.party.agenDariId(keIid);
    if (!misi?.id || !dari || !ke) return this.bukaMarkas();
    const judul = judulMisi(misi);
    this._rujukan.set(keIid, { id: misi.id, nama: this._namaAgen(dari), judul });
    const jenis = this._jenis(ke.agen.template?.id);
    const isian = jenis === JENIS.PANDUAN ? { topik: judul ?? '' } : {};
    return this.bukaMisi(keIid, isian);
  }

  /** Persetujuan sheet: a paid tool waits for the player's yes (SPRINT-02 `menunggu_persetujuan`). */
  async bukaIzin(instanceId, galat = null) {
    const item = this.party.agenDariId(instanceId);
    if (!item) return this.bukaMarkas();
    const nama = this._namaAgen(item);
    let misi = this._misiTerakhir.get(instanceId);
    if (misi?.id && !misi.persetujuan) {
      try {
        misi = await this.misi.ambil(misi.id);
        this._misiTerakhir.set(instanceId, misi);
      } catch (err) {
        this._kartuDiSheet('izin', kartuGalat(err, { nama }));
        return undefined;
      }
    }
    if (!misi?.id) return this._kartuDiSheet('izin', kartuGalat({ kode: 'MISI_TIDAK_ADA' }, { nama }));
    this.sheet.buka('izin', tampilanPersetujuan({ nama, misi, galat }, {
      ...this._aksiUmum(),
      kembali: () => this.bukaMarkas(),
      setujui: () => this.putuskanIzin(instanceId, true),
      tolak: () => this.putuskanIzin(instanceId, false),
    }));
    return undefined;
  }

  async putuskanIzin(instanceId, setuju) {
    const item = this.party.agenDariId(instanceId);
    const nama = this._namaAgen(item);
    const misi = this._misiTerakhir.get(instanceId);
    if (!misi?.id) return;
    try {
      const baru = await this.misi.putuskanIzin(misi.id, setuju);
      const status = baru?.status ?? (setuju ? 'berjalan' : 'dibatalkan');
      this.sheet.tutup();
      this._kabarMisi(instanceId, { jenis: 'status', misi: { ...misi, ...(baru ?? {}), status } });
      this.game.toast?.show(setuju ? `${nama} lanjut bekerja dengan izinmu.` : `Ditolak. Misi ${nama} dibatalkan; tidak ada panggilan ke alat itu.`, setuju ? 'g' : 'a');
      if (setuju && !STATUS_AKHIR.has(status)) this._pantau(instanceId, misi.id);
    } catch (err) {
      this.bukaIzin(instanceId, kartuGalat(err, { nama }));
    }
  }

  async putuskan(instanceId, putusan, catatan) {
    const item = this.party.agenDariId(instanceId);
    const spId = item?.agen.template?.id;
    const nama = item?.agen.julukan || this._spesies(spId).nama;
    const misi = this._misiTerakhir.get(instanceId);
    if (!misi?.id) return;
    try {
      const baru = await this.misi.putuskan(misi.id, putusan, catatan);
      const gabung = { ...misi, ...(baru ?? {}), putusan };
      this._misiTerakhir.set(instanceId, gabung);
      if (putusan === 'setujui') {
        this.party.setelStatus(instanceId, 'siap');
        gulungan(gabung); // already there since the result finished; resent in case that was missed (idempotent)
        this.game.toast?.show('Tersimpan. Gulungannya ada di Papan Hasil.', 'g');
        this._gerakkan(spId, 'siap', this._status3D(spId, 'siap'));
        this.bukaHasil(instanceId);
      } else if (putusan === 'buang') {
        this.party.setelStatus(instanceId, 'siap');
        buangGulungan(gabung);
        this._gerakkan(spId, 'siap', this._status3D(spId, 'siap'));
        this.sheet.tutup();
        this.game.toast?.show('Hasil dibuang.', 'a');
      } else {
        this.party.setelStatus(instanceId, 'antre');
        this.sheet.tutup();
        this.game.toast?.show(`${nama} memperbaiki hasilnya.`, 'g');
        this._gerakkan(spId, 'antre', this._status3D(spId, 'antre'));
        this._pantau(instanceId, gabung.id);
      }
    } catch (err) {
      this.bukaHasil(instanceId, putusan === 'perbaiki' ? 'perbaiki' : 'utama', kartuGalat(err, { nama }));
    }
  }

  async batalMisi(instanceId) {
    const misi = this._misiTerakhir.get(instanceId);
    if (!misi?.id) return;
    try {
      await this.misi.batal(misi.id);
      this._kabarMisi(instanceId, { jenis: 'status', misi: { ...misi, status: 'dibatalkan' } });
      this.game.toast?.show('Misi dibatalkan. Yang sudah dikerjakan tidak disimpan.', 'a');
      this.bukaMarkas();
    } catch (err) {
      this._kartuDiSheet('markas', kartuGalat(err));
    }
  }

  /** From the Markas box into the party; it starts following at the next sync. */
  async bawa(instanceId) {
    const item = this.party.agenDariId(instanceId);
    const nama = this._namaAgen(item);
    this._ulang = () => this.bawa(instanceId);
    try {
      const r = await this.party.bawa(instanceId);
      this.game.toast?.show(`${nama} ikut party lagi (${r.jumlah}/${this.party.maks}).`, 'g');
      this.sheet.umumkan(`${nama} ikut party, ${r.jumlah} dari ${this.party.maks}.`);
      this.bukaMarkas();
    } catch (err) {
      this._kartuDiSheet('markas', kartuGalat(err, { nama }));
    }
  }

  bukaJulukan(instanceId, galat = null, isian = undefined) {
    const item = this.party.agenDariId(instanceId);
    if (!item) return this.bukaMarkas();
    const spesies = this._spesies(item.agen.template?.id).nama;
    const simpan = (nilai) => this.simpanJulukan(instanceId, nilai);
    this.sheet.buka('julukan', tampilanJulukan({ nama: this._namaAgen(item), spesies, julukan: isian ?? item.agen.julukan ?? null, galat }, {
      ...this._aksiUmum(),
      kembali: () => this.bukaMarkas(),
      simpan,
      hapus: () => simpan(''),
      kartu: (aksi, kartu) => {
        if (aksi === 'perbaikiIsian' || aksi === 'hapusTeks') return this.bukaJulukan(instanceId, null, aksi === 'hapusTeks' ? '' : undefined);
        return this.aksiKartu(aksi, kartu);
      },
    }), { fokus: !galat });
    return undefined;
  }

  async simpanJulukan(instanceId, nilai) {
    const item = this.party.agenDariId(instanceId);
    const spesies = this._spesies(item?.agen.template?.id).nama;
    try {
      const baru = await this.party.setelJulukan(instanceId, nilai);
      this.game.toast?.show(baru ? `${spesies} sekarang kamu panggil ${baru}.` : `Julukan ${spesies} dihapus.`, 'g');
      this.bukaMarkas();
    } catch (err) {
      // A key-shaped nickname is not put back into the field.
      this.bukaJulukan(instanceId, kartuGalat(err, { nama: spesies }), err.kode === 'KUNCI_DITEMPEL' ? '' : nilai);
    }
  }

  async keluarkan(instanceId) {
    const item = this.party.agenDariId(instanceId);
    const nama = item?.agen.julukan || this._spesies(item?.agen.template?.id).nama;
    this._ulang = () => this.keluarkan(instanceId);
    try {
      await this.party.keluarkan(instanceId);
      const spId = item?.agen.template?.id;
      if (spId) {
        lepasAgen(spId); // frees its desk and status icon in the Markas
        this.game.npcs?.setelPose?.(spId, null);
        this.game.npcs?.perintah(spId, { jenis: 'keliling' });
      }
      this.game.toast?.show(`${nama} keluar dari party. Ia tetap di Markas-mu.`, 'a');
      this.bukaMarkas();
    } catch (err) {
      this._kartuDiSheet('markas', kartuGalat(err, { nama }));
    }
  }

  /** Card buttons (pesanGalat.AKSI_KARTU). */
  aksiKartu(aksi) {
    switch (aksi) {
      case 'tutup': return this.sheet.tutup();
      case 'masuk': return this.masuk();
      case 'bukaMarkas': return this.bukaMarkas();
      case 'muatUlang': return this.muat().then(() => this.bukaMarkas());
      case 'cobaLagi':
      case 'simpanLagi': return this._ulang ? this._ulang() : this.muat().then(() => this.bukaMarkas());
      case 'cobaSambung':
      case 'cekLagi': return this.muat().then(() => this.bukaMarkas());
      case 'bukaKantor': globalThis.open?.(KANTOR_URL, '_blank', 'noopener'); return undefined;
      default: return this.bukaMarkas();
    }
  }

  // ── "Arahkan saya" ─────────────────────────────────────

  arahkanKe(id) {
    if (id === 'markas') {
      const m = posisiMarkas();
      return this.arah?.mulai({ id, nama: 'Markas', ambilPosisi: () => m });
    }
    const npc = this.game.npcs?.get(id);
    if (!npc) return undefined;
    return this.arah?.mulai({ id, nama: this._spesies(id).nama, ambilPosisi: () => (this.game.npcs.terlihat ? { x: npc.x, z: npc.z } : null) });
  }

  // ── Tab Party + live sheet refresh ─────────────────────

  _segarkan() {
    const d = this.doc;
    const jumlah = this.party.masuk ? this.party.jumlah() : (this.party.pratinjau ? this.party.pratinjau.party.slots.filter(Boolean).length : 0);
    const maks = this.party.maks;
    const perlu = this.party.masuk ? this.party.anggota().filter((a) => a && PERLU_PERHATIAN.has(a.status_kerja)).length : 0;
    const t = d.getElementById('bb-party-t');
    if (t) t.textContent = `Party ${jumlah}/${maks}`;
    const titik = d.getElementById('bb-party-titik');
    if (titik) titik.querySelectorAll('i').forEach((el, i) => el.classList.toggle('isi', i < jumlah));
    const lencana = d.getElementById('bb-party-lencana');
    if (lencana) {
      lencana.hidden = perlu === 0;
      lencana.textContent = '!';
    }
    d.getElementById('bb-party-btn')?.setAttribute('aria-label', `Party, ${jumlah} dari ${maks}${perlu ? `, ${perlu} perlu perhatianmu` : ''}`);
    if (this.sheet.terbuka && this.sheet.nama === 'markas') this.sheet.ganti('markas', this._pohonMarkas());
    this._jedaPenanda = 0;
    this._jedaIkut = 0;
  }
}
