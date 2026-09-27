// ═══════════════════════════════════════════════════════
// DuniaParty.js — the M1 loop in the world: meet → recruit → Markas → mission → result.
//
// Glue only. State lives in the runtime (PartyKlien, MisiKlien); screens are data
// (ui/gw/tampilan.js); failures are cards (pesanGalat.js); the 3D world is reached through
// kaitDunia.js. Game.js calls init() once and perbarui(dt) every frame.
// ═══════════════════════════════════════════════════════

import { buatApiRuntime } from './apiRuntime.js';
import { PartyKlien, normalisasiPemilik } from './PartyKlien.js';
import { MisiKlien, STATUS_AKHIR } from './MisiKlien.js';
import { kartuGalat } from './pesanGalat.js';
import { titikKerja, posisiMarkas, statusKe3D, gulungan, pasangPenanda } from './kaitDunia.js';
import { Sheet } from '../ui/Sheet.js';
import { PenandaAgen } from '../ui/PenandaAgen.js';
import { ArahkanSaya } from '../ui/ArahkanSaya.js';
import {
  tampilanRekrut, tampilanMarkas, tampilanOtak, tampilanMisi, tampilanHasil, tampilanMasuk,
  tampilanKartuGalat, durasi, namaTempat, namaOtak,
} from '../ui/gw/tampilan.js';
import { h, render } from '../ui/gw/pohon.js';
import { NPCS, KANTOR_URL } from '../data/config.js';
import { getOrCreateGuestId } from '../data/guestIdentity.js';

/** Mission status (runtime) → agent status in the world (design §9.3). */
export const STATUS_DARI_MISI = Object.freeze({
  antre: 'antre',
  berjalan: 'bekerja',
  menunggu_otak: 'menunggu_otak',
  selesai: 'hasil_siap',
  selesai_tanpa_temuan: 'hasil_siap',
  gagal: 'gagal',
  dibatalkan: 'siap',
});

const PERLU_PERHATIAN = new Set(['hasil_siap', 'gagal', 'menunggu_otak']);

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
    this.party = new PartyKlien({ api: this.api, penyimpanan: penyimpanan === undefined ? penyimpananAman() : penyimpanan });
    this.misi = new MisiKlien({ api: this.api });
    this.sheet = new Sheet(this.doc);
    /** Agent NPCs in the world: species that can be hired (config.js `agen: true`). */
    this.agenDunia = NPCS.filter((n) => n.agen).map((n) => n.id);
    /** instance_id → latest mission seen */
    this._misiTerakhir = new Map();
    /** instance_id → GalatRuntime from watching (shown in the Markas) */
    this._galatPantau = new Map();
    this._statusOtak = undefined;
    this._tunda = null;
    this._jedaPenanda = 0;
    this._terputus = false;
    this.penanda = null;
    this.arah = null;
  }

  init() {
    const g = this.game;
    g.panels?.onAksi?.((aksi, npc) => this.aksiDialog(aksi, npc));
    g.panels?.saringSyarat?.((syarat, npc) => this.syarat(syarat, npc));
    this.penanda = new PenandaAgen({ bubble: g.bubble, npcs: g.npcs, daftar: () => this._daftarPenanda() });
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
    this._jedaPenanda -= dt;
    if (this._jedaPenanda <= 0) {
      this._jedaPenanda = 0.5;
      this.penanda?.perbarui();
    }
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
      bisaMisi: sp.misi_keahlian.includes('riset-sumber'),
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
        status: diParty ? item?.status_kerja ?? null : null,
        durasi: misi ? durasi(misi.dibuat) : null,
      };
    });
  }

  // ── Dialog hooks (Panels.js) ───────────────────────────

  /** Dialog choice filter: `syarat` on a choice in config.js. */
  syarat(syarat, npc) {
    const id = npc?.id;
    if (syarat === 'belum_di_party') return !this.party.diParty(id);
    if (syarat === 'di_party') return this.party.diParty(id);
    if (syarat === 'bisa_misi') return this.party.diParty(id) && this._spesies(id).misi_keahlian.includes('riset-sumber');
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
    return { anggota, maks: this.party.maks, pratinjau: !this.party.masuk && Boolean(this.party.pratinjau), berikut: this._rekrutBerikut() };
  }

  _aksiMarkas() {
    return {
      ...this._aksiUmum(),
      bukaMisi: (iid) => this.bukaMisi(iid),
      bukaHasil: (iid) => this.bukaHasil(iid),
      bukaOtak: (iid) => this.bukaOtak(iid),
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
    const nama = item.agen.julukan || this._spesies(item.agen.template?.id).nama;
    this._isianTerakhir = isian;
    this.sheet.buka('misi', tampilanMisi({ nama, brain: item.agen.loadout?.brain, isian, galat }, {
      ...this._aksiUmum(),
      kembali: () => this.bukaMarkas(),
      kirim: (masukan) => this.kirimMisi(instanceId, masukan),
      kartu: (aksi, kartu) => {
        if (aksi === 'hapusTeks') return this.bukaMisi(instanceId, {});
        if (aksi === 'perbaikiIsian') return this.bukaMisi(instanceId, this._isianTerakhir);
        return this.aksiKartu(aksi, kartu);
      },
    }), { fokus: !galat });
    if (galat) this.sheet.cari('.gw-kartu-galat .gw-cta')?.focus?.();
    return undefined;
  }

  async kirimMisi(instanceId, masukan) {
    const item = this.party.agenDariId(instanceId);
    const sp = this._spesies(item?.agen.template?.id);
    const nama = item?.agen.julukan || sp.nama;
    this._isianTerakhir = masukan;
    this._ulang = () => this.kirimMisi(instanceId, masukan);
    try {
      const misi = await this.misi.mulai(instanceId, masukan);
      this._misiTerakhir.set(instanceId, { ...misi, instance_id: instanceId, pertanyaan: masukan.pertanyaan, dibuat: misi.dibuat ?? new Date().toISOString() });
      this.party.setelStatus(instanceId, STATUS_DARI_MISI[misi.status] ?? 'antre');
      this.sheet.tutup();
      this.game.toast?.show(`${nama} berangkat ke meja kerja di Markas. Kamu bisa lanjut jalan-jalan.`, 'g');
      // 3D first: the Markas assigns this agent a desk, and the walk goes to that desk.
      statusKe3D(sp.id, STATUS_DARI_MISI[misi.status] ?? 'antre');
      this._keTempatKerja(sp.id);
      this._pantau(instanceId, misi.id);
    } catch (err) {
      // The text stays (unless it holds a key): the card explains, the form is right there.
      const aman = err.kode === 'KUNCI_DITEMPEL' ? {} : masukan;
      this.bukaMisi(instanceId, aman, kartuGalat(err, { nama }));
    }
  }

  /**
   * The 3D hooks arrived after init() (C's modules load asynchronously): put the ✦ markers on
   * the agent NPCs, replay each member's status so the Markas shows it, and send agents that are
   * already walking to the desk C assigned instead of the fallback spot.
   */
  kait3DSiap() {
    for (const id of this.agenDunia) {
      const npc = this.game.npcs?.get(id);
      if (npc) pasangPenanda(id, npc.mesh);
    }
    for (const a of this.party.anggota()) {
      if (!a || a.hilang) continue;
      const spId = a.agen.template?.id;
      if (!spId) continue;
      statusKe3D(spId, a.status_kerja ?? null);
      const keadaan = this.game.npcs?.get(spId)?.perilaku.keadaan;
      if ((a.status_kerja === 'antre' || a.status_kerja === 'bekerja') && (keadaan === 'menuju' || keadaan === 'bekerja')) {
        this._keTempatKerja(spId);
      }
    }
  }

  _keTempatKerja(spesiesId) {
    this.game.npcs?.perintah(spesiesId, { jenis: 'menuju', titik: titikKerja(spesiesId), lalu: 'bekerja' });
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
      if (st !== sebelum) this._statusBerubah(spId, nama, st, sebelum);
    }
    this._segarkan();
  }

  _statusBerubah(spId, nama, st, sebelum) {
    statusKe3D(spId, st);
    const npcs = this.game.npcs;
    if (st === 'bekerja' || st === 'antre') {
      if (npcs?.get(spId)?.perilaku.keadaan === 'keliling') this._keTempatKerja(spId);
    } else if (st === 'hasil_siap') {
      npcs?.perintah(spId, { jenis: 'lapor' });
      this.game.toast?.show(`Hasil ${nama} siap. Periksa dulu sebelum disimpan.`, 'g');
      this.sheet.umumkan(`${nama}: hasil siap.`);
    } else if (st === 'gagal') {
      npcs?.perintah(spId, { jenis: 'keliling' });
      this.game.toast?.show(`Misi ${nama} gagal. Buka Markas untuk sebab dan langkahnya.`, 'a');
      this.sheet.umumkan(`${nama}: misi gagal.`);
    } else if (st === 'siap' && sebelum) {
      npcs?.perintah(spId, { jenis: 'keliling' });
    }
  }

  /** After (re)loading: find missions still running or waiting for a verdict, and watch them. */
  async _lanjutkanMisi() {
    if (!this.party.masuk) return;
    for (const a of this.party.anggota()) {
      if (!a || a.hilang) continue;
      const sp = this._spesies(a.agen.template?.id);
      if (!sp.misi_keahlian.includes('riset-sumber')) continue;
      let daftar = [];
      try {
        daftar = await this.misi.daftar(a.agen.instance_id);
      } catch {
        return; // missions not reachable now; the Markas still works
      }
      const terbaru = daftar[0];
      if (!terbaru) continue;
      this._misiTerakhir.set(a.agen.instance_id, terbaru);
      const menunggu = STATUS_AKHIR.has(terbaru.status) ? (terbaru.putusan ? 'siap' : STATUS_DARI_MISI[terbaru.status]) : STATUS_DARI_MISI[terbaru.status];
      this.party.setelStatus(a.agen.instance_id, menunggu ?? a.status_kerja);
      statusKe3D(sp.id, menunggu);
      if (!STATUS_AKHIR.has(terbaru.status)) {
        this._keTempatKerja(sp.id);
        this._pantau(a.agen.instance_id, terbaru.id);
      } else if (menunggu === 'hasil_siap') {
        this.game.npcs?.perintah(sp.id, { jenis: 'lapor' });
      }
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
    const brain = item.agen.loadout?.brain;
    const galatMisi = galat ?? (misi.status === 'gagal'
      ? kartuGalat(misi.error_code ?? misi.galat?.kode ?? 'GALAT_SERVER', { nama, otak: namaOtak(brain), topik: misi.pertanyaan, selfHosted: brain && ['migancore', 'ollama', 'local'].includes(brain.provider), pesan: misi.galat?.pesan })
      : null);
    this.sheet.buka('hasil', tampilanHasil({ nama, misi, langkah, galat: galatMisi }, {
      ...this._aksiUmum(),
      setujui: () => this.putuskan(instanceId, 'setujui'),
      mintaPerbaiki: () => this.bukaHasil(instanceId, 'perbaiki'),
      buang: () => this.bukaHasil(instanceId, 'buang'),
      buangPasti: () => this.putuskan(instanceId, 'buang'),
      kembaliKeHasil: () => this.bukaHasil(instanceId),
      perbaiki: (catatan) => this.putuskan(instanceId, 'perbaiki', catatan),
      kartu: (aksi, kartu) => {
        if (aksi === 'beriMisi' || aksi === 'ubahMisi') return this.bukaMisi(instanceId, { pertanyaan: misi.pertanyaan ?? '' });
        if (aksi === 'lihatOtak') return this.bukaOtak(instanceId);
        return this.aksiKartu(aksi, kartu);
      },
    }));
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
        gulungan(gabung);
        this.game.toast?.show('Tersimpan. Gulungannya dipasang di Papan Hasil.', 'g');
        this.game.npcs?.perintah(spId, { jenis: 'keliling' });
        statusKe3D(spId, 'siap');
        this.bukaHasil(instanceId);
      } else if (putusan === 'buang') {
        this.party.setelStatus(instanceId, 'siap');
        this.game.npcs?.perintah(spId, { jenis: 'keliling' });
        statusKe3D(spId, 'siap');
        this.sheet.tutup();
        this.game.toast?.show('Hasil dibuang.', 'a');
      } else {
        this.party.setelStatus(instanceId, 'antre');
        this.sheet.tutup();
        this.game.toast?.show(`${nama} memperbaiki hasilnya.`, 'g');
        this._keTempatKerja(spId);
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

  async keluarkan(instanceId) {
    const item = this.party.agenDariId(instanceId);
    const nama = item?.agen.julukan || this._spesies(item?.agen.template?.id).nama;
    this._ulang = () => this.keluarkan(instanceId);
    try {
      await this.party.keluarkan(instanceId);
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
  }
}
