// ═══════════════════════════════════════════════════════
// tampilan.js — the M1 sheets as pure data (design report §9.2, microcopy §9.8).
//
//   Rekrut · Markas · Otak · Beri misi · Hasil · Masuk dulu · kartu galat
//
// Rules carried by every view:
// - numbers only from data (party x/4, slots, sources, durations); no rarity, no "148 sumber";
// - a brain is always labelled "Milik sendiri" / "Cloud pihak lain" / SIMULASI;
// - no key input anywhere in the world (no password field): keys live in the Kantor;
// - agents always carry the "AI" tag, so they are told apart from players without colour.
// ═══════════════════════════════════════════════════════

import { h } from './pohon.js';
import { labelOtak, MAKS_JULUKAN } from '../../party/PartyKlien.js';
import { MAKS_PERTANYAAN, MAKS_SUMBER, MAKS_KONTEKS, JENIS, judulMisi } from '../../party/MisiKlien.js';

// ── Words ─────────────────────────────────────────────

const TEMPAT = { 'oola-hub': 'Oola', oola: 'Oola', kuta: 'Kuta', monas: 'Monas', malioboro: 'Malioboro', braga: 'Braga', bogor: 'Bogor', losari: 'Losari' };
export const namaTempat = (id) => TEMPAT[id] ?? (id ? String(id) : 'dunia');

const EQUIPMENT = {
  'jelajah-sumber': 'Jelajah sumber (baca saja)',
  'validasi-awal': 'Cek kutipan',
  'catat-temuan': 'Catat temuan',
  'tanya-pemilik': 'Tanya pemilik',
  'cari-web': 'Cari web',
};
export const namaEquipment = (id) => EQUIPMENT[id] ?? String(id);

/** Mission kinds in the player's words: what the form says, and what the agent will do. */
export const JENIS_TEKS = Object.freeze({
  'riset-sumber': { label: 'Riset dengan sumber', judul: 'Riset', kerja: 'mencari sumber lalu merangkum', teruskan: 'Riset lanjutan dari hasil ini' },
  'pecah-tugas': { label: 'Pecah tugas jadi langkah', judul: 'Rencana kerja', kerja: 'memecah tujuan jadi langkah kerja', teruskan: 'Jadikan rencana kerja' },
  'susun-panduan': { label: 'Susun panduan bersumber', judul: 'Panduan', kerja: 'menyusun panduan dari sumber', teruskan: 'Susun jadi panduan' },
});
export const jenisTeks = (jenis) => JENIS_TEKS[jenis] ?? JENIS_TEKS['riset-sumber'];

const PENYEDIA = { migancore: 'MiganCore', ollama: 'Ollama', local: 'Otak lokal', runpod: 'GPU sewaan', openrouter: 'OpenRouter', deepseek: 'DeepSeek', openai: 'OpenAI', 'openai-compat': 'Cloud (OpenAI-compatible)', simulasi: 'Simulasi' };
export const namaOtak = (brain) => PENYEDIA[String(brain?.provider ?? '').toLowerCase()] ?? String(brain?.provider ?? 'Belum ada otak');

/** One state machine for panel, world and Kantor (design §9.3/§9.4) over the runtime enum. */
const STATUS = {
  siap: { label: 'Siap diberi misi', glyph: '○', jenis: 'siaga' },
  antre: { label: 'Menunggu giliran', glyph: '⋯', jenis: 'kerja' },
  bekerja: { label: 'Sedang bekerja', glyph: '⋯', jenis: 'kerja' },
  hasil_siap: { label: 'Hasil siap · perlu persetujuanmu', glyph: '!', jenis: 'perlu' },
  menunggu_otak: { label: 'Otak belum menjawab', glyph: '!', jenis: 'perlu' },
  menunggu_persetujuan: { label: 'Menunggu izinmu · alat berbiaya', glyph: '!', jenis: 'perlu' },
  gagal: { label: 'Gagal', glyph: '✕', jenis: 'gagal' },
};
/** @param {string|null} status runtime status_kerja @param {{durasi?: string, sebab?: string}} [x] */
export function statusAgen(status, x = {}) {
  const s = STATUS[status] ?? STATUS.siap;
  let label = s.label;
  if ((status === 'bekerja' || status === 'antre') && x.durasi) label = `${label} · ${x.durasi}`;
  if (status === 'gagal' && x.sebab) label = `Gagal: ${x.sebab}`;
  return { ...s, label, perluPerhatian: s.jenis === 'perlu' || s.jenis === 'gagal' };
}

const bulatSah = (n) => Number.isInteger(n) && n >= 0;
/**
 * Pengalaman line for an agent card, only from the runtime's `pengalaman {xp, level, dari_misi}`
 * (verified, approved, non-SIMULASI missions). No field = no line: never a made-up number.
 * @returns {string|null}
 */
export function teksPengalaman(p) {
  if (!p || typeof p !== 'object' || !bulatSah(p.xp) || !bulatSah(p.level)) return null;
  const n = Array.isArray(p.dari_misi) ? p.dari_misi.length : bulatSah(p.dari_misi) ? p.dari_misi : null;
  if (p.xp === 0) return 'Pengalaman: belum ada · tumbuh dari misi yang kamu setujui';
  return [`Pengalaman: Level ${p.level}`, `${p.xp.toLocaleString('id-ID')} XP`, n !== null ? `dari ${n} misi disetujui` : null].filter(Boolean).join(' · ');
}

/**
 * The runtime's cost estimate (`biaya_perkiraan`) in words. A number is rupiah; an object may carry
 * {rupiah, token}. Missing = said so, never guessed.
 */
export function teksBiaya(b) {
  const rp = (n) => `± Rp ${Math.round(n).toLocaleString('id-ID')}`;
  if (Number.isFinite(b) && b >= 0) return b === 0 ? 'gratis' : rp(b);
  if (typeof b === 'string' && b.trim()) return b.trim();
  if (b && typeof b === 'object') {
    const bagian = [];
    if (Number.isFinite(b.rupiah) && b.rupiah >= 0) bagian.push(b.rupiah === 0 ? 'gratis' : rp(b.rupiah));
    if (Number.isFinite(b.token) && b.token > 0) bagian.push(`± ${Math.round(b.token).toLocaleString('id-ID')} token`);
    if (Number.isFinite(b.panggilan) && b.panggilan > 0) bagian.push(`${b.panggilan} panggilan`);
    if (bagian.length) return bagian.join(' · ');
  }
  return 'belum ada perkiraan dari server';
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
/** Runtime timestamps may be ISO strings or epoch seconds/milliseconds. */
export function keTanggal(nilai) {
  if (nilai === null || nilai === undefined || nilai === '') return null;
  const angka = typeof nilai === 'number' ? nilai : (/^\d+$/.test(String(nilai)) ? Number(nilai) : NaN);
  const d = Number.isFinite(angka) ? new Date(angka < 1e12 ? angka * 1000 : angka) : new Date(String(nilai));
  return Number.isNaN(d.getTime()) ? null : d;
}
export function formatWaktu(nilai) {
  const d = keTanggal(nilai);
  if (!d) return null;
  const dua = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${dua(d.getHours())}.${dua(d.getMinutes())}`;
}
/** "3 mnt", "1 mnt 20 dtk", "40 dtk"; null when the start is unknown. */
export function durasi(dari, kini = Date.now()) {
  const d = keTanggal(dari);
  if (!d) return null;
  const s = Math.max(0, Math.floor((kini - d.getTime()) / 1000));
  if (s < 60) return `${s} dtk`;
  const m = Math.floor(s / 60);
  if (m >= 10) return `${m} mnt`;
  return s % 60 ? `${m} mnt ${s % 60} dtk` : `${m} mnt`;
}
const domain = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

// ── Building blocks ───────────────────────────────────

const klik = (fn) => (fn ? { click: (e) => { e?.preventDefault?.(); fn(); } } : undefined);

export function kepala(judul, { onTutup, onKembali } = {}) {
  return h('header', { kelas: 'gw-kepala' },
    onKembali ? h('button', { kelas: 'gw-x', attr: { type: 'button', 'aria-label': 'Kembali' }, teks: '←', on: klik(onKembali) }) : null,
    h('h2', { kelas: 'gw-judul', id: 'gw-judul', attr: { tabindex: '-1' }, teks: judul }),
    h('button', { kelas: 'gw-x', attr: { type: 'button', 'aria-label': 'Tutup' }, teks: '✕', on: klik(onTutup) }),
  );
}
export const cta = (label, fn, attr = {}) => h('button', { kelas: 'gw-cta', attr: { type: 'button', ...attr }, teks: label, on: klik(fn) });
export const tombol2 = (label, fn) => h('button', { kelas: 'gw-cta2', attr: { type: 'button' }, teks: label, on: klik(fn) });
export const tombolTeks = (label, fn) => h('button', { kelas: 'gw-teks', attr: { type: 'button' }, teks: label, on: klik(fn) });
export const tagAi = (teks = 'AI') => h('span', { kelas: 'gw-tag-ai', attr: { title: 'Agen AI, bukan pemain' }, teks });

export function pilStatus(st) {
  return h('span', { kelas: `gw-pil gw-st-${st.jenis}` },
    h('b', { attr: { 'aria-hidden': 'true' }, teks: st.glyph }),
    st.label);
}

export function labelOtakChip(brain) {
  const l = labelOtak(brain);
  const teks = l.jenis === 'sendiri' ? '✓ MILIK SENDIRI' : l.jenis === 'cloud' ? '☁ CLOUD PIHAK LAIN' : l.jenis === 'gpu' ? `⚙ ${l.teks.toUpperCase()}` : l.teks;
  return h('span', { kelas: `gw-lbl gw-lbl-${l.jenis}`, teks });
}

export function titikParty(jumlah, maks) {
  return h('span', { kelas: 'gw-titik', attr: { 'aria-hidden': 'true' } },
    Array.from({ length: maks }, (_, i) => h('i', { kelas: i < jumlah ? 'isi' : '' })));
}

function potret(nama, jenisStatus) {
  return h('span', { kelas: `gw-potret gw-cincin-${jenisStatus ?? 'siaga'}`, attr: { 'aria-hidden': 'true' }, teks: String(nama ?? '?').trim().charAt(0).toUpperCase() || '?' });
}

// ── Sheets ────────────────────────────────────────────

/** "Masuk dulu, ya" (design §9.8). */
export function tampilanMasuk({ nama = 'agenmu', dev = false } = {}, aksi = {}) {
  return h('div', { kelas: 'gw-isi' },
    kepala('Masuk dulu, ya', { onTutup: aksi.tutup }),
    h('p', { kelas: 'gw-sub', teks: `Party disimpan di akunmu, supaya ${nama} tetap ada besok.` }),
    dev ? h('p', { kelas: 'gw-meta', teks: 'Mode pengembang: masuk dengan nama tamu di perangkat ini.' }) : null,
    cta(dev ? 'Masuk (mode pengembang)' : 'Masuk', aksi.masuk),
    tombolTeks('Lanjut jalan-jalan', aksi.tutup),
  );
}

/**
 * ① Rekrut.
 * @param {{spesies: any, jumlah: number, maks: number, otak?: {provider:string, model?:string}|null}} d
 */
export function tampilanRekrut({ spesies, jumlah, maks, otak = null }, aksi = {}) {
  const nama = spesies?.nama ?? 'Warga';
  const bisaRiset = (spesies?.misi_keahlian ?? []).includes('riset-sumber');
  const penuh = jumlah >= maks;
  const equipment = (spesies?.equipment_dasar ?? []).map((e) => namaEquipment(e.id));
  return h('div', { kelas: 'gw-isi' },
    kepala(`Ajak ${nama} gabung party?`, { onTutup: aksi.tutup }),
    h('div', { kelas: 'gw-warga' },
      potret(nama, 'siaga'),
      h('div', { kelas: 'gw-warga-teks' },
        h('div', { kelas: 'gw-nama' }, nama, tagAi('AGEN AI')),
        h('div', { kelas: 'gw-peran', teks: spesies?.kelas_kerja ?? '' }),
        h('div', { kelas: 'gw-meta', teks: `Ditemui di ${namaTempat(spesies?.ditemui_di)}` }),
      ),
    ),
    h('p', { kelas: 'gw-sub', teks: bisaRiset
      ? `${nama} mencari sumber, membandingkannya, lalu menulis ringkasan dengan daftar sumber. Kamu yang memutuskan hasilnya disimpan atau tidak.`
      : `${nama} ikut di party-mu. Di M1 ${nama} belum punya keahlian misi; keahliannya menyusul.` }),
    h('div', { kelas: 'gw-blok' },
      h('div', { kelas: 'gw-label', teks: `YANG DIBUTUHKAN ${nama.toUpperCase()}` }),
      h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Otak' }), h('small', { teks: otak
        ? `${namaOtak(otak)}, ${labelOtak(otak).teks.toLowerCase()}, tanpa kunci`
        : 'bawaan server, milik sendiri, tanpa kunci' })),
      h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Equipment' }), h('small', { teks: equipment.length ? equipment.join(' · ') : 'belum ada' })),
    ),
    h('div', { kelas: 'gw-slot' }, titikParty(jumlah, maks), penuh ? `Party ${jumlah}/${maks} · penuh` : `Party ${jumlah}/${maks} → ${jumlah + 1}/${maks}`),
    penuh
      ? [h('p', { kelas: 'gw-peringatan', teks: `Party sudah penuh (${maks}/${maks}). Keluarkan satu anggota dulu di Markas.` }), cta('Buka Markas', aksi.bukaMarkas)]
      : cta(`Rekrut ${nama}`, aksi.rekrut),
    tombolTeks('Nanti dulu', aksi.tutup),
  );
}

/**
 * ②③ Markas: party x/4, members as Kartu Warga, empty slots folded into one row.
 * @param {{
 *   anggota: Array<null|{instance_id:string, id:string, nama:string, julukan?:string, kelas:string, status:string|null,
 *            brain:any, bisaMisi:boolean, durasi?:string|null, sebab?:string|null}>,
 *   maks: number, pratinjau?: boolean,
 *   berikut?: {id:string, nama:string, tempat:string}|null,
 *   diMarkas?: Array<{instance_id:string, id:string, nama:string, julukan?:string, kelas:string, status:string|null, pengalaman?:any}>,
 * }} d
 */
export function tampilanMarkas({ anggota, maks, pratinjau = false, berikut = null, diMarkas = [] }, aksi = {}) {
  const isi = anggota.filter(Boolean);
  const kosong = maks - isi.length;
  const kartu = isi.map((a) => {
    const nama = a.julukan || a.nama;
    const st = statusAgen(a.status, { durasi: a.durasi, sebab: a.sebab });
    let utama = null;
    if (a.status === 'hasil_siap') utama = cta('Periksa hasil', () => aksi.bukaHasil?.(a.instance_id));
    else if (a.status === 'gagal') utama = cta('Lihat sebabnya', () => aksi.bukaHasil?.(a.instance_id));
    else if (a.status === 'menunggu_otak') utama = cta('Cek otak', () => aksi.bukaOtak?.(a.instance_id));
    else if (a.status === 'menunggu_persetujuan') utama = cta('Periksa izin', () => aksi.bukaIzin?.(a.instance_id));
    else if (a.status === 'bekerja' || a.status === 'antre') utama = tombol2(`Lihat ${nama} bekerja`, () => aksi.arahkan?.(a.id));
    else if (a.bisaMisi) utama = cta('Beri misi', () => aksi.bukaMisi?.(a.instance_id));
    return h('article', { kelas: 'gw-kartu', attr: { 'aria-label': `${nama}, agen AI, ${st.label}` } },
      h('div', { kelas: 'gw-warga' },
        potret(nama, st.jenis),
        h('div', { kelas: 'gw-warga-teks' },
          h('div', { kelas: 'gw-nama' }, nama, tagAi()),
          h('div', { kelas: 'gw-peran', teks: a.julukan ? `${a.nama} · ${a.kelas}` : a.kelas }),
          pilStatus(st),
          h('div', { kelas: 'gw-otak' }, h('span', { teks: `Otak: ${namaOtak(a.brain)}` }), labelOtakChip(a.brain)),
          teksPengalaman(a.pengalaman) ? h('div', { kelas: 'gw-meta gw-xp', teks: teksPengalaman(a.pengalaman) }) : null,
        ),
      ),
      utama,
      h('div', { kelas: 'gw-baris-teks' },
        tombolTeks('Otak', () => aksi.bukaOtak?.(a.instance_id)),
        aksi.bukaJulukan ? tombolTeks('Julukan', () => aksi.bukaJulukan(a.instance_id)) : null,
        ['bekerja', 'antre', 'menunggu_persetujuan'].includes(a.status) ? tombolTeks('Batalkan misi', () => aksi.batalMisi?.(a.instance_id)) : null,
        tombolTeks('Keluarkan', () => aksi.keluarkan?.(a.instance_id)),
      ),
    );
  });

  const arahkan = berikut ? tombol2(`🧭 Arahkan saya ke ${berikut.nama}`, () => aksi.arahkan?.(berikut.id)) : null;
  // The Markas box: hired, not carried. Bringing one along needs a free slot; nothing is hired twice.
  const box = diMarkas.length
    ? h('section', { kelas: 'gw-blok gw-box', attr: { 'aria-label': 'Di Markas, tidak dibawa' } },
      h('div', { kelas: 'gw-label', teks: `DI MARKAS · TIDAK DIBAWA (${diMarkas.length})` }),
      diMarkas.map((a) => {
        const nama = a.julukan || a.nama;
        const st = statusAgen(a.status);
        return h('div', { kelas: 'gw-baris-box', attr: { 'aria-label': `${nama}, agen AI di Markas, ${st.label}` } },
          potret(nama, st.jenis),
          h('div', { kelas: 'gw-warga-teks' },
            h('div', { kelas: 'gw-nama' }, nama, tagAi()),
            h('div', { kelas: 'gw-peran', teks: a.julukan ? `${a.nama} · ${a.kelas}` : a.kelas }),
            teksPengalaman(a.pengalaman) ? h('div', { kelas: 'gw-meta gw-xp', teks: teksPengalaman(a.pengalaman) }) : null),
          h('div', { kelas: 'gw-baris-teks' },
            kosong > 0 ? tombol2('Bawa', () => aksi.bawa?.(a.instance_id)) : h('small', { kelas: 'gw-meta', teks: 'Party penuh' }),
            aksi.bukaJulukan ? tombolTeks('Julukan', () => aksi.bukaJulukan(a.instance_id)) : null));
      }))
    : null;
  const kantor = aksi.bukaKantor
    ? h('button', { kelas: 'gw-tautan', attr: { type: 'button' }, teks: 'Kunci API & tagihan: buka Kantor (mighan.com) ↗', on: klik(aksi.bukaKantor) })
    : h('a', { kelas: 'gw-tautan', attr: { href: aksi.urlKantor, target: '_blank', rel: 'noopener noreferrer' }, teks: 'Kunci API & tagihan: buka Kantor (mighan.com) ↗' });
  return h('div', { kelas: 'gw-isi' },
    kepala(`Markas · Party ${isi.length}/${maks}`, { onTutup: aksi.tutup }),
    pratinjau ? h('p', { kelas: 'gw-meta', teks: 'Pratinjau dari kunjungan terakhir; sedang menyambung ke server.' }) : null,
    isi.length === 0
      ? [
        h('p', { kelas: 'gw-nama', teks: 'Party masih kosong.' }),
        h('p', { kelas: 'gw-sub', teks: berikut
          ? `Warga bertanda ✦ bisa direkrut. Yang terdekat: ${berikut.nama}, di ${berikut.tempat}.`
          : 'Warga bertanda ✦ bisa direkrut.' }),
        berikut ? cta(`Arahkan saya ke ${berikut.nama}`, () => aksi.arahkan?.(berikut.id)) : null,
      ]
      : [
        kartu,
        kosong > 0 ? h('div', { kelas: 'gw-slot' }, titikParty(isi.length, maks),
          berikut ? `${kosong} slot kosong · ${berikut.nama} ada di ${berikut.tempat}` : `${kosong} slot kosong`) : null,
        kosong > 0 ? arahkan : null,
      ],
    box,
    aksi.bukaBuku ? tombol2('📖 Buku Warga', aksi.bukaBuku) : null,
    kantor,
  );
}

/**
 * Buku Warga: every hireable species; met ones by name, unmet ones as silhouettes (design §10 M2).
 * Counts come from the list itself, never from a target the data does not have.
 * @param {{entri: ReturnType<typeof import('../../party/BukuWarga.js').entriBuku>}} d
 */
export function tampilanBukuWarga({ entri }, aksi = {}) {
  const kenal = entri.filter((e) => e.ditemui).length;
  return h('div', { kelas: 'gw-isi' },
    kepala('Buku Warga', { onTutup: aksi.tutup, onKembali: aksi.kembali }),
    h('p', { kelas: 'gw-sub', teks: `Ditemui ${kenal} dari ${entri.length} warga yang bisa direkrut. Ngobrol dengan warga untuk mencatatnya.` }),
    entri.map((e) => (e.ditemui
      ? h('article', { kelas: 'gw-kartu gw-buku', attr: { 'aria-label': `${e.nama}, ${e.kelas}` } },
        h('div', { kelas: 'gw-warga' },
          potret(e.nama, e.status === 'party' ? 'kerja' : 'siaga'),
          h('div', { kelas: 'gw-warga-teks' },
            h('div', { kelas: 'gw-nama' }, e.nama, tagAi()),
            h('div', { kelas: 'gw-peran', teks: e.kelas }),
            h('div', { kelas: 'gw-meta', teks: [`Ditemui di ${namaTempat(e.tempat)}`, e.status === 'party' ? 'di party-mu' : e.status === 'markas' ? 'di Markas-mu' : 'bisa direkrut'].join(' · ') }))),
        !e.status && aksi.arahkan ? tombolTeks(`Arahkan saya ke ${e.nama}`, () => aksi.arahkan(e.id)) : null)
      : h('article', { kelas: 'gw-kartu gw-buku gw-siluet', attr: { 'aria-label': 'Warga yang belum ditemui' } },
        h('div', { kelas: 'gw-warga' },
          h('span', { kelas: 'gw-potret gw-potret-siluet', attr: { 'aria-hidden': 'true' }, teks: '?' }),
          h('div', { kelas: 'gw-warga-teks' },
            h('div', { kelas: 'gw-nama', teks: '???' }),
            h('div', { kelas: 'gw-meta', teks: e.tempat ? `Belum ditemui · kabarnya ada di ${namaTempat(e.tempat)}` : 'Belum ditemui' })))))),
  );
}

/**
 * Julukan: the name this player gives their agent (1–24 characters). A text field, never a key field.
 * @param {{nama:string, spesies:string, julukan?:string|null, galat?: any}} d
 */
export function tampilanJulukan({ nama, spesies, julukan = null, galat = null }, aksi = {}) {
  return h('div', { kelas: 'gw-isi' },
    kepala(`Julukan untuk ${spesies}`, { onTutup: aksi.tutup, onKembali: aksi.kembali }),
    h('p', { kelas: 'gw-sub', teks: `Nama panggilan ${spesies}-mu. Terlihat di Markas, di plakat, dan di Kantor. Spesiesnya tetap ${spesies}.` }),
    h('form', { kelas: 'gw-form', attr: { novalidate: true }, on: { submit: (e) => { e.preventDefault(); aksi.simpan?.(e.target?.elements?.julukan?.value ?? ''); } } },
      h('label', { kelas: 'gw-label', attr: { for: 'gw-julukan' }, teks: 'Julukan' }),
      h('input', { id: 'gw-julukan', kelas: 'gw-input', attr: { type: 'text', name: 'julukan', value: julukan ?? '', maxlength: MAKS_JULUKAN, placeholder: `mis. ${spesies} Kilat`, autocomplete: 'off', spellcheck: 'false' } }),
      h('div', { kelas: 'gw-meta', teks: `1–${MAKS_JULUKAN} huruf.${julukan ? ` Sekarang: ${nama}.` : ''}` }),
      galat ? tampilanKartuGalat(galat, aksi) : null,
      h('button', { kelas: 'gw-cta', attr: { type: 'submit' }, teks: 'Simpan julukan' }),
      julukan ? tombol2('Hapus julukan', aksi.hapus) : null,
      tombolTeks('Batal', aksi.kembali ?? aksi.tutup),
    ),
  );
}

/**
 * ④ Otak: display only. Changing brains or keys happens in the Kantor.
 * @param {{nama:string, brain:any, statusOtak?: Array<{provider:string, model?:string, hidup?:boolean, dicek?:any}>|null}} d
 */
export function tampilanOtak({ nama, brain, statusOtak = null }, aksi = {}) {
  const l = labelOtak(brain);
  const cek = (statusOtak ?? []).find((o) => o.provider === brain?.provider && (!o.model || !brain?.model || o.model === brain.model))
    ?? (statusOtak ?? []).find((o) => o.provider === brain?.provider) ?? null;
  // Runtime in RUNTIME_MODE=demo reports only the SIMULASI brain and runs every mission on it,
  // whatever the loadout says. Say that, instead of promising the self-hosted brain.
  const demo = !cek && l.jenis !== 'simulasi' && (statusOtak ?? []).some((o) => o.label === 'SIMULASI' || o.provider === 'simulasi');
  const kesehatan = demo
    ? 'status: mode demo'
    : statusOtak === null || !cek
      ? 'status: belum ada data'
      : `${cek.hidup ? '● hidup' : '○ tidak menjawab'}${formatWaktu(cek.dicek) ? ` · dicek ${formatWaktu(cek.dicek)}` : ''}`;
  const jelas = demo
    ? `Server sedang mode demo: setiap misi dikerjakan otak SIMULASI (berlabel), bukan ${namaOtak(brain)}. Hasilnya bukan riset sungguhan dan tidak menambah pengalaman.`
    : l.jenis === 'sendiri'
    ? 'Otak milik sendiri. Berjalan di server Mighan, tidak dikirim ke pihak lain.'
    : l.jenis === 'gpu'
      ? `Otak GPU sewaan pengelola Galantara${brain?.model ? ` (model ${brain.model})` : ''}. Bukan MiganCore dan bukan kuncimu; kuncinya hanya ada di server pengelola.`
    : l.jenis === 'cloud'
      ? 'Otak cloud pihak lain (BYOK). Kuncinya disimpan di Kantor (mighan.com), tidak pernah di dunia. Biaya ditagih penyedia itu ke akunmu.'
      : l.jenis === 'simulasi'
        ? 'Otak SIMULASI untuk uji. Hasilnya bukan riset sungguhan dan tidak menambah pengalaman.'
        : 'Belum ada otak terpasang.';
  return h('div', { kelas: 'gw-isi' },
    kepala(`Otak ${nama}`, { onTutup: aksi.tutup, onKembali: aksi.kembali }),
    h('div', { kelas: 'gw-opsi pilih' },
      h('h3', { teks: `◉ ${namaOtak(brain)}` }),
      brain?.model ? h('div', { kelas: 'gw-meta', teks: `Model: ${brain.model}` }) : null,
      h('p', { teks: jelas }),
      h('div', { kelas: 'gw-baris-lbl' },
        demo ? h('span', { kelas: 'gw-lbl gw-lbl-simulasi', teks: 'SIMULASI' }) : labelOtakChip(brain),
        l.jenis === 'sendiri' && !demo ? h('span', { kelas: 'gw-lbl gw-lbl-kosong', teks: 'tanpa kunci' }) : null,
        h('span', { kelas: 'gw-lbl gw-lbl-kosong', teks: kesehatan }),
      ),
    ),
    h('p', { kelas: 'gw-sub', teks: 'Mengganti otak atau memasang kunci API dilakukan di Kantor (mighan.com), bukan di dunia.' }),
    aksi.bukaKantor
      ? cta('Ubah di Kantor ↗', aksi.bukaKantor)
      : h('a', { kelas: 'gw-cta gw-cta-tautan', attr: { href: aksi.urlKantor, target: '_blank', rel: 'noopener noreferrer' }, teks: 'Ubah di Kantor ↗' }),
  );
}

/**
 * ⑤ Beri misi, one form per class (SPRINT-02): Sari asks a question with sources, Budi breaks a
 * goal into steps from its context, Maya writes a guide on a topic from sources. No key field.
 * @param {{nama:string, brain:any, jenis?: string, isian?: Record<string, any>, galat?: any, kirimTertunda?: boolean,
 *   rujukan?: {nama:string, judul?:string|null}|null, equipment?: string[]}} d
 */
export function tampilanMisi({ nama, brain, jenis = JENIS.RISET, isian = {}, galat = null, kirimTertunda = false, rujukan = null, equipment = null }, aksi = {}) {
  const l = labelOtak(brain);
  const jt = jenisTeks(jenis);
  const sumber = Array.from({ length: MAKS_SUMBER }, (_, i) => isian.sumber?.[i] ?? '');
  const bidangSumber = (label) => [
    h('div', { kelas: 'gw-label', teks: label }),
    sumber.map((s, i) => h('input', {
      kelas: 'gw-input',
      attr: { type: 'url', name: `sumber${i + 1}`, value: s, placeholder: 'https://…', inputmode: 'url', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': `Sumber ${i + 1}` },
    })),
  ];
  const areaTeks = (nameAttr, label, maks, placeholder, rows = 3) => [
    h('label', { kelas: 'gw-label', attr: { for: `gw-${nameAttr}` }, teks: label }),
    h('textarea', {
      id: `gw-${nameAttr}`,
      kelas: 'gw-input',
      attr: { name: nameAttr, rows, maxlength: maks, placeholder, autocomplete: 'off' },
      teks: isian[nameAttr] ?? '',
    }),
  ];
  let bidang;
  if (jenis === JENIS.PECAH) {
    bidang = [
      areaTeks('tujuan', 'Tujuan', MAKS_PERTANYAAN, rujukan ? `mis. rencana kerja dari temuan ${rujukan.nama}` : 'mis. buka warung kopi kecil di Bogor bulan depan'),
      areaTeks('konteks', 'Konteks (boleh kosong)', MAKS_KONTEKS, 'mis. modal, waktu, orang yang membantu, yang sudah ada', 4),
      h('div', { kelas: 'gw-meta', teks: `${nama} memecah tujuanmu jadi langkah. Setiap langkah menyebut dasarnya; langkah tanpa dasar dibuang, bukan dikarang. Tujuan maksimal ${MAKS_PERTANYAAN} huruf, konteks ${MAKS_KONTEKS.toLocaleString('id-ID')}.` }),
    ];
  } else if (jenis === JENIS.PANDUAN) {
    bidang = [
      areaTeks('topik', 'Topik panduan', MAKS_PERTANYAAN, 'mis. cara mendaftar UMKM di Kota Bogor'),
      bidangSumber(rujukan
        ? `Sumber tambahan (boleh kosong, maksimal ${MAKS_SUMBER} alamat https)`
        : `Sumber (minimal 1, maksimal ${MAKS_SUMBER} alamat https)`),
      h('div', { kelas: 'gw-meta', teks: `Setiap bagian panduan menyebut temuan yang menjadi rujukannya. Topik maksimal ${MAKS_PERTANYAAN} huruf.` }),
    ];
  } else {
    bidang = [
      areaTeks('pertanyaan', 'Pertanyaan', MAKS_PERTANYAAN, 'mis. harga cabai rawit di Bogor minggu ini'),
      h('div', { kelas: 'gw-meta', teks: `Semakin spesifik, semakin bagus sumbernya. Maksimal ${MAKS_PERTANYAAN} huruf.` }),
      bidangSumber(`Sumber (boleh kosong, maksimal ${MAKS_SUMBER} alamat https)`),
    ];
  }
  const alat = equipment?.length ? equipment.map(namaEquipment).join(' · ') : namaEquipment('jelajah-sumber');
  return h('div', { kelas: 'gw-isi' },
    kepala(`Misi untuk ${nama}`, { onTutup: aksi.tutup, onKembali: aksi.kembali }),
    h('form', { kelas: 'gw-form', attr: { novalidate: true, 'data-jenis': jenis }, on: { submit: (e) => { e.preventDefault(); aksi.kirim?.(bacaFormMisi(e.target, jenis)); } } },
      h('div', { kelas: 'gw-meta', teks: `Jenis: ${jt.label}` }),
      rujukan
        ? h('div', { kelas: 'gw-chip gw-rujukan' },
          h('b', { teks: `Dari hasil ${rujukan.nama}` }),
          h('small', { teks: rujukan.judul ? `“${rujukan.judul}” · temuan dan sumbernya ikut dibaca ${nama}` : `temuan dan sumbernya ikut dibaca ${nama}` }),
          aksi.lepasRujukan ? tombolTeks('Lepas', aksi.lepasRujukan) : null)
        : null,
      bidang,
      h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Otak' }), h('small', { teks: `${namaOtak(brain)} (${l.teks.toLowerCase()})` })),
      h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Equipment' }), h('small', { teks: alat })),
      h('div', { kelas: 'gw-meta', teks: 'Waktu: belum ada data (misi pertama)' }),
      galat ? tampilanKartuGalat(galat, aksi) : null,
      h('button', { kelas: 'gw-cta', attr: { type: 'submit', disabled: kirimTertunda }, teks: kirimTertunda ? 'Mengirim…' : `Kirim ${nama}` }),
      tombolTeks('Batal', aksi.tutup),
    ),
  );
}

/** Reads the mission form of one kind (real DOM form, or a test stand-in with the same `elements`). */
export function bacaFormMisi(form, jenis = JENIS.RISET) {
  const el = form?.elements ?? {};
  const nilai = (n) => (typeof el[n]?.value === 'string' ? el[n].value : '');
  const sumber = () => Array.from({ length: MAKS_SUMBER }, (_, i) => nilai(`sumber${i + 1}`)).filter((s) => s.trim());
  if (jenis === JENIS.PECAH) return { jenis, tujuan: nilai('tujuan'), konteks: nilai('konteks') };
  if (jenis === JENIS.PANDUAN) return { jenis, topik: nilai('topik'), sumber: sumber() };
  return { jenis: JENIS.RISET, pertanyaan: nilai('pertanyaan'), sumber: sumber() };
}

/** A step's basis (`dasar`) in words: the player's goal/context, or a finding with its source number. */
function teksDasar(d, nomorTemuan) {
  if (d === 'tujuan') return 'tujuanmu';
  if (d === 'konteks') return 'konteksmu';
  const n = nomorTemuan(d);
  return n ? `temuan [${n}]` : `temuan ${d}`;
}

/**
 * ⑥ Hasil: the report of any kind (riset: summary; pecah-tugas: steps with their basis; susun-panduan:
 * sections with references), the sources, and the verdict buttons. Once approved, the result can be
 * passed on to a colleague whose skill fits ("Teruskan ke rekan", SPRINT-02).
 * @param {{nama:string, misi:any, langkah?: 'utama'|'perbaiki'|'buang', galat?: any,
 *   rekan?: Array<{instance_id:string, nama:string, jenis:string, sibuk?: boolean}>, rantaiNama?: string[]|null}} d
 */
export function tampilanHasil({ nama, misi, langkah = 'utama', galat = null, rekan = [], rantaiNama = null }, aksi = {}) {
  const lap = misi?.laporan ?? {};
  const jenis = misi?.jenis ?? lap.jenis ?? JENIS.RISET;
  const jt = jenisTeks(jenis);
  const sumber = Array.isArray(lap.sumber) ? lap.sumber : [];
  const nomor = new Map(sumber.map((s, i) => [s.id, i + 1]));
  const temuan = new Map((Array.isArray(lap.temuan) ? lap.temuan : []).map((t) => [t.id, t]));
  const nomorTemuan = (t) => nomor.get(temuan.get(t)?.sumber);
  const otak = lap.otak ?? null;
  const simulasi = String(otak?.label ?? misi?.label_otak ?? '').toUpperCase() === 'SIMULASI' || String(otak?.provider ?? '') === 'simulasi';
  const labelO = otak?.label ?? misi?.label_otak ?? (otak ? labelOtak(otak).teks.toLowerCase() : null);
  const waktu = formatWaktu(misi?.selesai ?? misi?.dibuat);
  const putus = misi?.putusan ?? lap.putusan ?? null;

  const bagianOtak = otak ? `otak ${namaOtak(otak)}${labelO ? ` (${labelO})` : ''}` : (labelO ? `otak ${labelO}` : null);
  const meta = [`${jt.judul}: ${judulMisi(misi) ?? '(tanpa judul)'}`, waktu, bagianOtak].filter(Boolean).join(' · ');

  const sup = (daftar) => [...new Set((daftar ?? []).map(nomorTemuan).filter(Boolean))].map((n) => h('sup', { kelas: 'gw-rujuk', teks: `[${n}]` }));
  let isiLaporan = null;
  if (jenis === JENIS.PECAH) {
    const daftar = Array.isArray(lap.langkah) ? lap.langkah : [];
    isiLaporan = daftar.length
      ? h('ol', { kelas: 'gw-langkah' }, daftar.map((l) => h('li', { kelas: 'gw-langkah-item' },
        h('div', { teks: l.teks ?? '' }),
        h('small', { kelas: 'gw-meta', teks: [
          Number.isFinite(l.perkiraan_menit) && l.perkiraan_menit > 0 ? `± ${l.perkiraan_menit} mnt` : null,
          Array.isArray(l.dasar) && l.dasar.length ? `dasar: ${l.dasar.map((d) => teksDasar(d, nomorTemuan)).join(', ')}` : null,
        ].filter(Boolean).join(' · ') }))))
      : null;
  } else if (jenis === JENIS.PANDUAN) {
    const daftar = Array.isArray(lap.bagian) ? lap.bagian : [];
    isiLaporan = daftar.length
      ? h('div', { kelas: 'gw-ringkasan' }, daftar.map((b) => h('section', { kelas: 'gw-bagian' },
        h('h3', { kelas: 'gw-nama', teks: b.judul ?? '' }),
        h('p', { kelas: 'gw-kalimat' }, b.isi ?? '', sup(b.rujukan)))))
      : null;
  } else {
    const kalimat = (Array.isArray(lap.ringkasan) ? lap.ringkasan : []).map((r) => h('p', { kelas: 'gw-kalimat' }, r.kalimat ?? '', sup(r.rujukan)));
    isiLaporan = kalimat.length ? h('div', { kelas: 'gw-ringkasan' }, kalimat) : null;
  }

  const ditolak = (Array.isArray(lap.ditolak) ? lap.ditolak.length : 0) + (Array.isArray(lap.bagian_dibuang) ? lap.bagian_dibuang.length : 0);
  const teksDitolak = !ditolak ? null
    : jenis === JENIS.PECAH ? `${ditolak} langkah dibuang karena tidak menyebut dasarnya.`
      : jenis === JENIS.PANDUAN ? `${ditolak} bagian atau klaim dibuang karena rujukannya tidak ada di sumber.`
      : `${ditolak} klaim dibuang karena kutipannya tidak ada di sumber.`;

  const statusPil = putus === 'setujui' ? { label: 'Disetujui · tersimpan', glyph: '✓', jenis: 'info' }
    : putus === 'buang' ? { label: 'Dibuang', glyph: '✕', jenis: 'siaga' }
      : putus === 'perbaiki' ? { label: `Diminta perbaiki · ${nama} bekerja lagi`, glyph: '⋯', jenis: 'kerja' }
        : misi?.status === 'gagal' ? statusAgen('gagal') : { label: 'Menunggu persetujuanmu', glyph: '!', jenis: 'perlu' };

  // Passing a result on needs an approved, finished result with something in it (SPRINT-02 rujuk_misi).
  const bisaDiteruskan = putus === 'setujui' && misi?.status === 'selesai';
  const teruskan = bisaDiteruskan && rekan.length
    ? h('div', { kelas: 'gw-blok gw-teruskan' },
      h('div', { kelas: 'gw-label', teks: 'TERUSKAN KE REKAN' }),
      rekan.map((r) => (r.sibuk
        ? h('div', { kelas: 'gw-meta', teks: `${r.nama} sedang bekerja; teruskan setelah ia selesai.` })
        : h('div', { kelas: 'gw-baris-rekan' },
          tombol2(`Teruskan ke ${r.nama}`, () => aksi.teruskan?.(r.instance_id)),
          h('small', { kelas: 'gw-meta', teks: jenisTeks(r.jenis).teruskan })))))
    : null;

  let bawah;
  if (misi?.status === 'gagal') {
    bawah = galat ? tampilanKartuGalat(galat, aksi) : cta('Tutup', aksi.tutup);
  } else if (putus) {
    bawah = [galat ? tampilanKartuGalat(galat, aksi) : null, cta('Tutup', aksi.tutup)];
  } else if (langkah === 'perbaiki') {
    bawah = h('form', { kelas: 'gw-form', on: { submit: (e) => { e.preventDefault(); aksi.perbaiki?.(e.target?.elements?.catatan?.value ?? ''); } } },
      h('label', { kelas: 'gw-label', attr: { for: 'gw-catatan' }, teks: 'Apa yang kurang?' }),
      h('textarea', { id: 'gw-catatan', kelas: 'gw-input', attr: { name: 'catatan', rows: 3, maxlength: MAKS_PERTANYAAN, placeholder: 'mis. tambahkan harga di pasar tradisional', autocomplete: 'off' } }),
      galat ? tampilanKartuGalat(galat, aksi) : null,
      h('button', { kelas: 'gw-cta', attr: { type: 'submit' }, teks: `Kirim ke ${nama}` }),
      tombolTeks('Batal', aksi.kembaliKeHasil),
    );
  } else if (langkah === 'buang') {
    bawah = [
      h('p', { kelas: 'gw-peringatan', teks: 'Buang hasil ini? Tidak bisa dikembalikan.' }),
      h('div', { kelas: 'gw-baris' }, tombol2('Buang', aksi.buangPasti), tombol2('Batal', aksi.kembaliKeHasil)),
    ];
  } else {
    bawah = [
      galat ? tampilanKartuGalat(galat, aksi) : null,
      cta('Setujui & simpan', aksi.setujui),
      h('div', { kelas: 'gw-baris' }, tombol2('Minta perbaiki', aksi.mintaPerbaiki), tombol2('Buang', aksi.buang)),
      rekan.length && misi?.status === 'selesai' ? h('p', { kelas: 'gw-meta', teks: 'Setelah disetujui, hasil ini bisa diteruskan ke rekan di party-mu.' }) : null,
    ];
  }

  // Steps are built from the player's own goal and context; sources are optional for them.
  const tanpaSumberWajar = jenis === JENIS.PECAH && !sumber.length;
  const rantai = Array.isArray(misi?.rantai) && misi.rantai.length > 1
    ? h('div', { kelas: 'gw-meta', teks: rantaiNama?.length > 1 ? `Rantai: ${rantaiNama.join(' → ')}` : `Lanjutan dari ${misi.rantai.length - 1} hasil sebelumnya` })
    : null;

  return h('div', { kelas: 'gw-isi' },
    kepala(`Hasil misi ${nama}`, { onTutup: aksi.tutup }),
    h('div', { kelas: 'gw-meta', teks: meta }),
    rantai,
    pilStatus(statusPil),
    simulasi ? h('p', { kelas: 'gw-peringatan', teks: 'SIMULASI: hasil ini dibuat otak simulasi untuk uji, bukan riset sungguhan.' }) : null,
    misi?.status === 'selesai_tanpa_temuan'
      ? h('p', { kelas: 'gw-sub', teks: `${nama} tidak menemukan jawaban di sumber yang dibaca. Itu hasil yang jujur, bukan kegagalan.` })
      : null,
    // The runtime's own reason (`alasan {kode, pesan}`, LOG-A A5) is complete and actionable: show it as is.
    (misi?.status === 'gagal' || misi?.status === 'menunggu_otak') && typeof misi?.alasan?.pesan === 'string' && misi.alasan.pesan
      ? h('p', { kelas: 'gw-peringatan', teks: misi.alasan.pesan })
      : null,
    isiLaporan,
    teksDitolak ? h('p', { kelas: 'gw-meta', teks: teksDitolak }) : null,
    tanpaSumberWajar
      ? h('p', { kelas: 'gw-meta', teks: 'Langkah disusun dari tujuan dan konteks yang kamu tulis, bukan dari sumber web.' })
      : h('div', { kelas: 'gw-blok' },
        h('div', { kelas: 'gw-label', teks: `SUMBER (${sumber.length})` }),
        sumber.length
          ? sumber.map((s, i) => h('div', { kelas: 'gw-sumber' },
            h('b', { teks: String(i + 1) }),
            h('div', { kelas: 'gw-sumber-teks' },
              h('div', { teks: s.judul || domain(s.url) || 'Tanpa judul' }),
              h('small', { teks: [domain(s.url), formatWaktu(s.diambil) ? `dibuka ${formatWaktu(s.diambil)}` : null].filter(Boolean).join(' · ') }),
            ),
            h('a', { kelas: 'gw-buka', attr: { href: s.url, target: '_blank', rel: 'noopener noreferrer nofollow' }, teks: 'Buka ↗' }),
          ))
          : h('p', { kelas: 'gw-peringatan', teks: 'Tidak ada sumber. Perlakukan ini sebagai dugaan, bukan fakta.' }),
      ),
    teruskan,
    bawah,
  );
}

/**
 * ⑦ Persetujuan: a mission stopped before a tool that may cost money (SPRINT-02 `cari-web`). Nothing
 * leaves the server until the player says yes; "Tolak" cancels the mission.
 * @param {{nama:string, misi:any, galat?: any}} d
 */
export function tampilanPersetujuan({ nama, misi, galat = null }, aksi = {}) {
  const izin = misi?.persetujuan ?? {};
  const alat = izin.alat ? namaEquipment(izin.alat) : 'alat tambahan';
  return h('div', { kelas: 'gw-isi' },
    kepala(`${nama} minta izin`, { onTutup: aksi.tutup, onKembali: aksi.kembali }),
    h('p', { kelas: 'gw-sub', teks: `${nama} ingin memakai ${alat} untuk misi “${judulMisi(misi) ?? 'ini'}”.` }),
    h('div', { kelas: 'gw-blok' },
      h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Alat' }), h('small', { teks: alat })),
      h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Perkiraan biaya' }), h('small', { teks: teksBiaya(izin.biaya_perkiraan) })),
      izin.penyedia?.label ? h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Penyedia' }), h('small', { teks: String(izin.penyedia.label) })) : null,
      izin.alasan ? h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Alasan' }), h('small', { teks: String(izin.alasan) })) : null,
      izin.biaya_catatan ? h('p', { kelas: 'gw-meta', teks: String(izin.biaya_catatan) }) : null,
    ),
    h('p', { kelas: 'gw-meta', teks: 'Sampai kamu memutuskan, tidak ada satu panggilan pun ke alat ini. Tolak = misinya dibatalkan.' }),
    galat ? tampilanKartuGalat(galat, aksi) : null,
    cta('Setujui', aksi.setujui),
    tombol2('Tolak', aksi.tolak),
  );
}

/** A §9.9 failure as a card with buttons (never a toast). */
export function tampilanKartuGalat(kartu, aksi = {}) {
  return h('div', { kelas: 'gw-kartu-galat', attr: { role: 'alert' } },
    kartu.judul ? h('div', { kelas: 'gw-nama', teks: kartu.judul }) : null,
    h('p', { teks: kartu.pesan }),
    h('div', { kelas: 'gw-baris' }, kartu.tombol.map((t) => (t.utama ? cta : tombol2)(t.label, () => aksi.kartu?.(t.aksi, kartu)))),
  );
}
