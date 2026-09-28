// ═══════════════════════════════════════════════════════
// pesanGalat.js — every M1 failure as a card with a button (design report §9.9).
//
// A message the player cannot act on is a bug (AGENTS.md §5), and a toast cannot hold a button,
// so failures that need a decision become cards. Each entry names what happened and offers
// the next step. Buttons carry an `aksi` the coordinator (DuniaParty) knows how to run.
// ═══════════════════════════════════════════════════════

/** Actions a card button may ask for. DuniaParty implements each one. */
export const AKSI_KARTU = new Set([
  'tutup', 'masuk', 'bukaMarkas', 'muatUlang', 'cobaLagi', 'cobaSambung', 'simpanLagi', 'bukaKantor',
  'hapusTeks', 'perbaikiIsian', 'ubahMisi', 'cekLagi', 'lihatOtak', 'beriMisi', 'lepasRujukan',
]);

const T = (label, aksi, utama = false) => ({ label, aksi, utama });

/** kode → {pesan, tombol}. `{x}` is filled from the context (see isiTeks). */
export const KARTU = Object.freeze({
  // ── Account & party ──
  BELUM_MASUK: { judul: 'Masuk dulu, ya', pesan: 'Party disimpan di akunmu, supaya {nama} tetap ada besok.', tombol: [T('Masuk', 'masuk', true), T('Lanjut jalan-jalan', 'tutup')] },
  MASUK_BELUM_ADA: { pesan: 'Masuk dari dunia belum tersedia di server ini. Jalur masuk akun untuk party menyusul.', tombol: [T('Lanjut jalan-jalan', 'tutup', true)] },
  UNDANGAN_DITOLAK: { judul: 'Kode tidak berlaku', pesan: 'Kodenya salah ketik, sudah dipakai, atau kedaluwarsa. Periksa lagi di kolom atas, atau minta kode baru ke tim Galantara.', tombol: [T('Lanjut jalan-jalan', 'tutup')] },
  KODE_UNDANGAN_KOSONG: { pesan: 'Ketik kode undangan dari tim Galantara dulu, bentuknya XXXXX-XXXXX-XXXXX.', tombol: [T('Lanjut jalan-jalan', 'tutup')] },
  PARTY_PENUH: { pesan: 'Party sudah penuh (4/4). Keluarkan satu anggota dulu di Markas.', tombol: [T('Buka Markas', 'bukaMarkas', true)] },
  VERSI_BENTROK: { pesan: 'Party baru saja diubah di tempat lain (dunia atau Kantor). Muat ulang dulu, lalu ulangi.', tombol: [T('Muat ulang', 'muatUlang', true)] },
  PARTY_TIDAK_SAH: { pesan: '{pesan}', tombol: [T('Muat ulang', 'muatUlang', true), T('Tutup', 'tutup')] },
  ROSTER_PENUH: { pesan: '{pesan}', tombol: [T('Buka Markas', 'bukaMarkas', true)] },
  TIDAK_BISA_DIREKRUT: { pesan: '{pesan}', tombol: [T('Tutup', 'tutup', true)] },
  SPESIES_TIDAK_ADA: { pesan: '{pesan}', tombol: [T('Tutup', 'tutup', true)] },

  // ── Transport ──
  JARINGAN: { pesan: 'Koneksi putus. Periksa internetmu, lalu coba lagi.', tombol: [T('Coba lagi', 'cobaLagi', true), T('Tutup', 'tutup')] },
  WAKTU_HABIS: { pesan: 'Server agen terlalu lama menjawab. Coba lagi sebentar lagi.', tombol: [T('Coba lagi', 'cobaLagi', true), T('Tutup', 'tutup')] },
  RUNTIME_MATI: { pesan: 'Server agen sedang tidak menjawab. Coba lagi sebentar lagi.', tombol: [T('Coba lagi', 'cobaLagi', true), T('Tutup', 'tutup')] },
  BUKAN_JSON: { pesan: 'Dunia belum tersambung ke server agen (jalur /rt). Beri tahu admin Galantara.', tombol: [T('Tutup', 'tutup', true)] },
  ASAL_DITOLAK: { pesan: 'Server agen belum mengizinkan alamat dunia ini. Beri tahu admin Galantara.', tombol: [T('Tutup', 'tutup', true)] },
  GALAT_SERVER: { pesan: '{pesan}', tombol: [T('Coba lagi', 'cobaLagi', true), T('Tutup', 'tutup')] },

  // ── Mission input ──
  KUNCI_DITEMPEL: { pesan: 'Sepertinya kamu menempelkan kunci API. Jangan tulis kunci di misi. Simpan di Kantor.', tombol: [T('Hapus teks', 'hapusTeks', true), T('Buka Kantor ↗', 'bukaKantor')] },
  MASUKAN_TIDAK_SAH: { pesan: '{pesan}', tombol: [T('Perbaiki', 'perbaikiIsian', true)] },
  MISI_BELUM_ADA: { pesan: 'Misi belum aktif di server ini. {nama} tetap di party-mu; misinya menyusul.', tombol: [T('Tutup', 'tutup', true)] },
  WAKTU_MISI_HABIS: { pesan: 'Misi belum selesai setelah 10 menit. {nama} mungkin masih bekerja di server; cek lagi nanti.', tombol: [T('Cek lagi', 'cekLagi', true), T('Tutup', 'tutup')] },
  MISI_TIDAK_ADA: { pesan: 'Misi ini tidak ditemukan lagi di server. Buka Markas untuk melihat keadaan terbaru.', tombol: [T('Buka Markas', 'bukaMarkas', true)] },

  // ── Party at work (SPRINT-02): kinds, passing results on, paid tools ──
  MISI_BUKAN_KEAHLIAN: { pesan: '{pesan}', tombol: [T('Buka Markas', 'bukaMarkas', true), T('Tutup', 'tutup')] },
  AGEN_SIBUK: { pesan: '{pesan}', tombol: [T('Buka Markas', 'bukaMarkas', true)] },
  RANTAI_TERLALU_PANJANG: { pesan: 'Rantai hasil ini sudah 4 misi. Lepas rujukannya dan mulai misi baru.', tombol: [T('Lepas rujukan', 'lepasRujukan', true), T('Tutup', 'tutup')] },
  RUJUKAN_TIDAK_ADA: { pesan: 'Hasil yang dirujuk tidak ditemukan lagi. Lepas rujukannya, lalu kirim ulang.', tombol: [T('Lepas rujukan', 'lepasRujukan', true)] },
  RUJUKAN_BELUM_DISETUJUI: { pesan: 'Hasil yang dirujuk belum kamu setujui. Setujui dulu di Markas, atau lepas rujukannya.', tombol: [T('Buka Markas', 'bukaMarkas', true), T('Lepas rujukan', 'lepasRujukan')] },
  PERSETUJUAN_BELUM_ADA: { pesan: 'Persetujuan alat belum aktif di server ini (segera hadir). Misinya tetap menunggu; kamu juga bisa membatalkannya di Markas.', tombol: [T('Buka Markas', 'bukaMarkas', true)] },
  TIDAK_MENUNGGU: { pesan: 'Misi ini sudah tidak menunggu izinmu (mungkin sudah diputuskan di Kantor).', tombol: [T('Buka Markas', 'bukaMarkas', true)] },
  TUJUAN_TIDAK_SAH: { pesan: '{pesan}', tombol: [T('Perbaiki', 'perbaikiIsian', true)] },
  KONTEKS_TERLALU_PANJANG: { pesan: '{pesan}', tombol: [T('Perbaiki', 'perbaikiIsian', true)] },
  TOPIK_TIDAK_SAH: { pesan: '{pesan}', tombol: [T('Perbaiki', 'perbaikiIsian', true)] },
  SUMBER_TIDAK_DIPAKAI: { pesan: '{pesan}', tombol: [T('Perbaiki', 'perbaikiIsian', true)] },
  MISI_AKTIF_PENUH: { pesan: '{pesan}', tombol: [T('Buka Markas', 'bukaMarkas', true)] },
  CARI_BELUM_SIAP: { pesan: '{pesan}', tombol: [T('Ubah misi', 'perbaikiIsian', true), T('Tutup', 'tutup')] },
  AGEN_TIDAK_SAH: { pesan: '{pesan}', tombol: [T('Perbaiki', 'perbaikiIsian', true)] },
  JULUKAN_TIDAK_SAH: { pesan: '{pesan}', tombol: [T('Perbaiki', 'perbaikiIsian', true)] },

  // ── Mission failures (error_code, design §9.3) ──
  OTAK_MATI: { pesan: '{otak} sedang tidak menjawab{dicek}. Coba lagi sebentar lagi, atau ganti otak di Kantor.', tombol: [T('Cek lagi', 'cekLagi', true), T('Lihat otak', 'lihatOtak')] },
  brain_timeout: { pesan: 'Misi berhenti: {otak} tidak menjawab selama 60 detik.{tanpaBiaya}', tombol: [T('Coba lagi', 'beriMisi', true), T('Lihat otak', 'lihatOtak')] },
  vault_revoked: { pesan: 'Kunci {penyedia}-mu sudah dicabut{waktu}. Pasang kunci baru di Kantor, atau ganti ke otak milik sendiri di sana.', tombol: [T('Pasang kunci baru ↗', 'bukaKantor', true), T('Lihat otak', 'lihatOtak')] },
  provider_auth: { pesan: '{penyedia} menolak kunci ini (salah atau kedaluwarsa). Periksa atau ganti kunci di Kantor.', tombol: [T('Buka Kantor ↗', 'bukaKantor', true)] },
  provider_quota: { pesan: 'Saldo atau kuota {penyedia}-mu habis. Isi saldo di {penyedia}, atau ganti ke otak milik sendiri di Kantor.', tombol: [T('Buka Kantor ↗', 'bukaKantor', true), T('Tutup', 'tutup')] },
  no_sources: { pesan: '{nama} tidak menemukan sumber yang cocok untuk "{topik}". Coba topik yang lebih umum, atau tambahkan tempat dan waktu.', tombol: [T('Ubah misi', 'ubahMisi', true), T('Tutup', 'tutup')] },
  cancelled: { pesan: 'Misi dibatalkan. Yang sudah dikerjakan {nama} tidak disimpan.', tombol: [T('Beri misi lagi', 'beriMisi', true), T('Tutup', 'tutup')] },
});

const BAWAAN = { nama: 'agenmu', otak: 'Otak', penyedia: 'Penyedia cloud', topik: 'misi ini', pesan: 'Terjadi galat. Coba lagi sebentar lagi.' };

/** Fill `{x}` from the context; missing values fall back to a neutral word, never "{x}". */
export function isiTeks(teks, konteks = {}) {
  return teks.replace(/\{(\w+)\}/g, (_, k) => {
    const v = konteks[k];
    if (v === undefined || v === null || v === '') return BAWAAN[k] ?? '';
    return String(v);
  });
}

/**
 * @param {{kode?: string, pesan?: string} | string} galat a GalatRuntime, or a mission error_code
 * @param {Record<string, any>} [konteks] nama, otak, penyedia, topik, waktu, dicek, selfHosted
 * @returns {{kode: string, judul: string|null, pesan: string, tombol: {label:string, aksi:string, utama:boolean}[]}}
 */
export function kartuGalat(galat, konteks = {}) {
  const kode = typeof galat === 'string' ? galat : (galat?.kode ?? 'GALAT_SERVER');
  const def = KARTU[kode] ?? KARTU.GALAT_SERVER;
  const ctx = {
    ...konteks,
    pesan: typeof galat === 'object' && galat?.pesan ? galat.pesan : konteks.pesan,
    tanpaBiaya: konteks.selfHosted ? ' Tidak ada biaya yang terpakai.' : '',
    waktu: konteks.waktu ? ` (${konteks.waktu})` : '',
    dicek: konteks.dicek ? ` (dicek ${konteks.dicek})` : '',
  };
  return {
    kode,
    judul: def.judul ? isiTeks(def.judul, ctx) : null,
    pesan: isiTeks(def.pesan, ctx),
    tombol: def.tombol.map((t) => ({ ...t })),
  };
}
