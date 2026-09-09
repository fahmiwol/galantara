// ═══════════════════════════════════════════════════════
// dailyChallenge.js — alasan untuk kembali besok
//
// PRD BAB 5.5.1 meminta daily challenge dengan reward Mighan Coin. Koinnya
// BELUM end-to-end (docs/GALANATARA_CURRENT_STATE.md), dan memberi reward
// koin yang tidak nyata lebih buruk daripada tidak memberi apa-apa — ia
// mengajari pemain bahwa mata uangnya tidak berarti. Jadi lapisan ini
// sengaja dibangun TANPA koin: yang diberikan adalah runtutan (streak) dan
// penyelesaian. Slot `reward` sudah disiapkan supaya ekonomi tinggal
// disambungkan nanti tanpa menulis ulang.
//
// KETERBATASAN YANG HARUS JUJUR DISEBUT: kemajuan disimpan di localStorage,
// jadi ia per-browser. Bukan pengganti server. Begitu ada akun, pindahkan
// `muat()`/`simpan()` ke API dan sisanya tidak berubah.
// ═══════════════════════════════════════════════════════

const KUNCI = 'galantara_harian_v1';

/**
 * Tantangan ditentukan dari TANGGAL, bukan acak per pemain.
 * Itu disengaja: kalau semua orang mendapat tantangan yang sama hari itu,
 * ia jadi bahan obrolan ("udah kelar yang hari ini?"). Tantangan acak
 * per-orang membunuh hal itu.
 */
export const TANTANGAN = Object.freeze([
  {
    id: 'jelajah_spot',
    judul: 'Keliling tiga tempat',
    detail: 'Kunjungi 3 Spot berbeda hari ini',
    target: 3,
    satuan: 'Spot',
  },
  {
    id: 'jalan_kaki',
    judul: 'Jalan-jalan sore',
    detail: 'Berjalan 500 meter di dunia',
    target: 500,
    satuan: 'm',
  },
  {
    id: 'sapa_warga',
    judul: 'Sapa warga',
    detail: 'Ajak bicara 3 NPC',
    target: 3,
    satuan: 'warga',
  },
  {
    id: 'main_benteng',
    judul: 'Satu ronde Benteng',
    detail: 'Selesaikan 1 pertandingan Benteng',
    target: 1,
    satuan: 'match',
  },
  {
    id: 'magrib',
    judul: 'Tunggu magrib',
    detail: 'Berada di dunia saat lampu menyala (17:15–18:24)',
    target: 1,
    satuan: 'kali',
  },
]);

/** `YYYY-MM-DD` waktu lokal — hari berganti mengikuti jam pemain, bukan UTC. */
export function hariIni(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Jumlah hari sejak epoch, dipakai sebagai indeks tantangan. */
function nomorHari(tanggal) {
  const [y, m, d] = tanggal.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Tantangan hari ini — sama untuk semua orang di tanggal yang sama. */
export function tantanganHariIni(tanggal = hariIni()) {
  return TANTANGAN[nomorHari(tanggal) % TANTANGAN.length];
}

function kosong() {
  return { tanggal: hariIni(), kemajuan: 0, selesai: false, runtutan: 0, terakhirSelesai: null };
}

function muat() {
  try {
    const raw = localStorage.getItem(KUNCI);
    if (!raw) return kosong();
    const d = JSON.parse(raw);
    return (d && typeof d === 'object') ? { ...kosong(), ...d } : kosong();
  } catch {
    // Tab privat / storage penuh / JSON rusak. Permainan tetap jalan;
    // yang hilang cuma catatannya.
    return kosong();
  }
}

function simpan(d) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}

/** Kemarin, dalam format yang sama — dipakai menentukan runtutan putus. */
function kemarin(tanggal) {
  const [y, m, d] = tanggal.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) - 86400000);
  const p = (n) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

export class DailyChallenge {
  constructor() {
    this.data = muat();
    this._gulirHari();
    /** @type {Set<string>} penanda unik hari ini (mis. id Spot yang sudah dikunjungi) */
    this._unik = new Set();
    /** @type {((s: object) => void) | null} */
    this.onUbah = null;
  }

  /**
   * Kalau tanggalnya sudah ganti, mulai tantangan baru.
   * Runtutan lanjut HANYA kalau kemarin selesai — bolong satu hari,
   * runtutan kembali ke nol. Itu yang membuat runtutan berarti.
   */
  _gulirHari() {
    const kini = hariIni();
    if (this.data.tanggal === kini) return;
    const lanjut = this.data.terakhirSelesai === kemarin(kini);
    this.data = {
      tanggal: kini,
      kemajuan: 0,
      selesai: false,
      runtutan: lanjut ? this.data.runtutan : 0,
      terakhirSelesai: this.data.terakhirSelesai,
    };
    simpan(this.data);
  }

  /** @returns {{ tantangan: object, kemajuan: number, target: number, selesai: boolean, runtutan: number, persen: number }} */
  status() {
    this._gulirHari();
    const t = tantanganHariIni(this.data.tanggal);
    return {
      tantangan: t,
      kemajuan: Math.min(this.data.kemajuan, t.target),
      target: t.target,
      selesai: this.data.selesai,
      runtutan: this.data.runtutan,
      persen: Math.min(100, (this.data.kemajuan / t.target) * 100),
    };
  }

  /**
   * Catat kemajuan untuk satu id tantangan. Diabaikan kalau bukan
   * tantangan hari ini — jadi pemanggil boleh melapor apa saja tanpa
   * perlu tahu tantangan mana yang sedang aktif.
   *
   * @param {string} idTantangan
   * @param {number} jumlah
   * @param {string} [kunciUnik] jika diberikan, hanya dihitung sekali per hari
   *   (mis. Spot yang sama dikunjungi dua kali tidak menambah)
   */
  catat(idTantangan, jumlah = 1, kunciUnik = null) {
    this._gulirHari();
    const t = tantanganHariIni(this.data.tanggal);
    if (t.id !== idTantangan || this.data.selesai) return this.status();

    if (kunciUnik) {
      if (this._unik.has(kunciUnik)) return this.status();
      this._unik.add(kunciUnik);
    }

    this.data.kemajuan += jumlah;
    if (this.data.kemajuan >= t.target) {
      this.data.selesai = true;
      this.data.kemajuan = t.target;
      // Runtutan naik SEKALI per hari, di sini — bukan di _gulirHari,
      // supaya menyelesaikan dua kali tidak menghitung dua kali.
      this.data.runtutan += 1;
      this.data.terakhirSelesai = this.data.tanggal;
    }
    simpan(this.data);
    const s = this.status();
    this.onUbah?.(s);
    return s;
  }

  /** Buang catatan — untuk uji, dan supaya pemain bisa mulai bersih. */
  hapus() {
    this.data = kosong();
    this._unik.clear();
    try { localStorage.removeItem(KUNCI); } catch { /* abaikan */ }
    this.onUbah?.(this.status());
  }
}
