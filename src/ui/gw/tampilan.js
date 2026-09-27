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
import { labelOtak } from '../../party/PartyKlien.js';
import { MAKS_PERTANYAAN, MAKS_SUMBER } from '../../party/MisiKlien.js';

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

const PENYEDIA = { migancore: 'MiganCore', ollama: 'Ollama', local: 'Otak lokal', openrouter: 'OpenRouter', 'openai-compat': 'Cloud (OpenAI-compatible)', simulasi: 'Simulasi' };
export const namaOtak = (brain) => PENYEDIA[String(brain?.provider ?? '').toLowerCase()] ?? String(brain?.provider ?? 'Belum ada otak');

/** One state machine for panel, world and Kantor (design §9.3/§9.4) over the runtime enum. */
const STATUS = {
  siap: { label: 'Siap diberi misi', glyph: '○', jenis: 'siaga' },
  antre: { label: 'Menunggu giliran', glyph: '⋯', jenis: 'kerja' },
  bekerja: { label: 'Sedang bekerja', glyph: '⋯', jenis: 'kerja' },
  hasil_siap: { label: 'Hasil siap · perlu persetujuanmu', glyph: '!', jenis: 'perlu' },
  menunggu_otak: { label: 'Otak belum menjawab', glyph: '!', jenis: 'perlu' },
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
  return h('span', { kelas: `gw-lbl gw-lbl-${l.jenis}`, teks: l.jenis === 'sendiri' ? '✓ MILIK SENDIRI' : l.jenis === 'cloud' ? '☁ CLOUD PIHAK LAIN' : l.teks });
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
 * }} d
 */
export function tampilanMarkas({ anggota, maks, pratinjau = false, berikut = null }, aksi = {}) {
  const isi = anggota.filter(Boolean);
  const kosong = maks - isi.length;
  const kartu = isi.map((a) => {
    const nama = a.julukan || a.nama;
    const st = statusAgen(a.status, { durasi: a.durasi, sebab: a.sebab });
    let utama = null;
    if (a.status === 'hasil_siap') utama = cta('Periksa hasil', () => aksi.bukaHasil?.(a.instance_id));
    else if (a.status === 'gagal') utama = cta('Lihat sebabnya', () => aksi.bukaHasil?.(a.instance_id));
    else if (a.status === 'menunggu_otak') utama = cta('Cek otak', () => aksi.bukaOtak?.(a.instance_id));
    else if (a.status === 'bekerja' || a.status === 'antre') utama = tombol2(`Lihat ${nama} bekerja`, () => aksi.arahkan?.(a.id));
    else if (a.bisaMisi) utama = cta('Beri misi', () => aksi.bukaMisi?.(a.instance_id));
    return h('article', { kelas: 'gw-kartu', attr: { 'aria-label': `${nama}, agen AI, ${st.label}` } },
      h('div', { kelas: 'gw-warga' },
        potret(nama, st.jenis),
        h('div', { kelas: 'gw-warga-teks' },
          h('div', { kelas: 'gw-nama' }, nama, tagAi()),
          h('div', { kelas: 'gw-peran', teks: a.kelas }),
          pilStatus(st),
          h('div', { kelas: 'gw-otak' }, h('span', { teks: `Otak: ${namaOtak(a.brain)}` }), labelOtakChip(a.brain)),
        ),
      ),
      utama,
      h('div', { kelas: 'gw-baris-teks' },
        tombolTeks('Otak', () => aksi.bukaOtak?.(a.instance_id)),
        (a.status === 'bekerja' || a.status === 'antre') ? tombolTeks('Batalkan misi', () => aksi.batalMisi?.(a.instance_id)) : null,
        tombolTeks('Keluarkan', () => aksi.keluarkan?.(a.instance_id)),
      ),
    );
  });

  const arahkan = berikut ? tombol2(`🧭 Arahkan saya ke ${berikut.nama}`, () => aksi.arahkan?.(berikut.id)) : null;
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
    h('a', { kelas: 'gw-tautan', attr: { href: aksi.urlKantor, target: '_blank', rel: 'noopener noreferrer' }, teks: 'Kunci API & tagihan: buka Kantor (mighan.com) ↗' }),
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
  const kesehatan = statusOtak === null || !cek
    ? 'status: belum ada data'
    : `${cek.hidup ? '● hidup' : '○ tidak menjawab'}${formatWaktu(cek.dicek) ? ` · dicek ${formatWaktu(cek.dicek)}` : ''}`;
  const jelas = l.jenis === 'sendiri'
    ? 'Otak milik sendiri. Berjalan di server Mighan, tidak dikirim ke pihak lain.'
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
        labelOtakChip(brain),
        l.jenis === 'sendiri' ? h('span', { kelas: 'gw-lbl gw-lbl-kosong', teks: 'tanpa kunci' }) : null,
        h('span', { kelas: 'gw-lbl gw-lbl-kosong', teks: kesehatan }),
      ),
    ),
    h('p', { kelas: 'gw-sub', teks: 'Mengganti otak atau memasang kunci API dilakukan di Kantor (mighan.com), bukan di dunia.' }),
    h('a', { kelas: 'gw-cta gw-cta-tautan', attr: { href: aksi.urlKantor, target: '_blank', rel: 'noopener noreferrer' }, teks: 'Ubah di Kantor ↗' }),
  );
}

/**
 * ⑤ Beri misi: question + up to three https sources. No key field exists here.
 * @param {{nama:string, brain:any, isian?: {pertanyaan?:string, sumber?:string[]}, galat?: any, kirimTertunda?: boolean}} d
 */
export function tampilanMisi({ nama, brain, isian = {}, galat = null, kirimTertunda = false }, aksi = {}) {
  const l = labelOtak(brain);
  const sumber = Array.from({ length: MAKS_SUMBER }, (_, i) => isian.sumber?.[i] ?? '');
  return h('div', { kelas: 'gw-isi' },
    kepala(`Misi untuk ${nama}`, { onTutup: aksi.tutup, onKembali: aksi.kembali }),
    h('form', { kelas: 'gw-form', attr: { novalidate: true }, on: { submit: (e) => { e.preventDefault(); aksi.kirim?.(bacaFormMisi(e.target)); } } },
      h('div', { kelas: 'gw-meta', teks: 'Jenis: Riset dengan sumber' }),
      h('label', { kelas: 'gw-label', attr: { for: 'gw-pertanyaan' }, teks: 'Pertanyaan' }),
      h('textarea', {
        id: 'gw-pertanyaan',
        kelas: 'gw-input',
        attr: { name: 'pertanyaan', rows: 3, maxlength: MAKS_PERTANYAAN, placeholder: 'mis. harga cabai rawit di Bogor minggu ini', autocomplete: 'off', required: true },
        teks: isian.pertanyaan ?? '',
      }),
      h('div', { kelas: 'gw-meta', teks: `Semakin spesifik, semakin bagus sumbernya. Maksimal ${MAKS_PERTANYAAN} huruf.` }),
      h('div', { kelas: 'gw-label', teks: `Sumber (boleh kosong, maksimal ${MAKS_SUMBER} alamat https)` }),
      sumber.map((s, i) => h('input', {
        kelas: 'gw-input',
        attr: { type: 'url', name: `sumber${i + 1}`, value: s, placeholder: 'https://…', inputmode: 'url', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': `Sumber ${i + 1}` },
      })),
      h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Otak' }), h('small', { teks: `${namaOtak(brain)} (${l.teks.toLowerCase()})` })),
      h('div', { kelas: 'gw-chip' }, h('b', { teks: 'Equipment' }), h('small', { teks: namaEquipment('jelajah-sumber') })),
      h('div', { kelas: 'gw-meta', teks: 'Waktu: belum ada data (misi pertama)' }),
      galat ? tampilanKartuGalat(galat, aksi) : null,
      h('button', { kelas: 'gw-cta', attr: { type: 'submit', disabled: kirimTertunda }, teks: kirimTertunda ? 'Mengirim…' : `Kirim ${nama}` }),
      tombolTeks('Batal', aksi.tutup),
    ),
  );
}

/** Reads the mission form (real DOM form, or a test stand-in with the same `elements`). */
export function bacaFormMisi(form) {
  const el = form?.elements ?? {};
  const nilai = (n) => (typeof el[n]?.value === 'string' ? el[n].value : '');
  return {
    pertanyaan: nilai('pertanyaan'),
    sumber: Array.from({ length: MAKS_SUMBER }, (_, i) => nilai(`sumber${i + 1}`)).filter((s) => s.trim()),
  };
}

/**
 * ⑥ Hasil: summary with source numbers, the sources, and the verdict buttons.
 * @param {{nama:string, misi:any, langkah?: 'utama'|'perbaiki'|'buang', galat?: any}} d
 */
export function tampilanHasil({ nama, misi, langkah = 'utama', galat = null }, aksi = {}) {
  const lap = misi?.laporan ?? {};
  const sumber = Array.isArray(lap.sumber) ? lap.sumber : [];
  const nomor = new Map(sumber.map((s, i) => [s.id, i + 1]));
  const temuan = new Map((Array.isArray(lap.temuan) ? lap.temuan : []).map((t) => [t.id, t]));
  const otak = lap.otak ?? null;
  const simulasi = String(otak?.label ?? misi?.label_otak ?? '').toUpperCase() === 'SIMULASI' || String(otak?.provider ?? '') === 'simulasi';
  const labelO = otak?.label ?? misi?.label_otak ?? (otak ? labelOtak(otak).teks.toLowerCase() : null);
  const waktu = formatWaktu(misi?.selesai ?? misi?.dibuat);
  const putus = misi?.putusan ?? lap.putusan ?? null;

  const bagianOtak = otak ? `otak ${namaOtak(otak)}${labelO ? ` (${labelO})` : ''}` : (labelO ? `otak ${labelO}` : null);
  const meta = [`Riset: ${misi?.pertanyaan ?? lap.pertanyaan ?? '(tanpa judul)'}`, waktu, bagianOtak].filter(Boolean).join(' · ');

  const kalimat = (Array.isArray(lap.ringkasan) ? lap.ringkasan : []).map((r) => {
    const rujukan = [...new Set((r.rujukan ?? []).map((t) => nomor.get(temuan.get(t)?.sumber)).filter(Boolean))];
    return h('p', { kelas: 'gw-kalimat' }, r.kalimat ?? '', rujukan.map((n) => h('sup', { kelas: 'gw-rujuk', teks: `[${n}]` })));
  });

  const statusPil = putus === 'setujui' ? { label: 'Disetujui · tersimpan', glyph: '✓', jenis: 'info' }
    : putus === 'buang' ? { label: 'Dibuang', glyph: '✕', jenis: 'siaga' }
      : putus === 'perbaiki' ? { label: `Diminta perbaiki · ${nama} bekerja lagi`, glyph: '⋯', jenis: 'kerja' }
        : misi?.status === 'gagal' ? statusAgen('gagal') : { label: 'Menunggu persetujuanmu', glyph: '!', jenis: 'perlu' };

  let bawah;
  if (misi?.status === 'gagal') {
    bawah = galat ? tampilanKartuGalat(galat, aksi) : cta('Tutup', aksi.tutup);
  } else if (putus) {
    bawah = cta('Tutup', aksi.tutup);
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
    ];
  }

  return h('div', { kelas: 'gw-isi' },
    kepala(`Hasil misi ${nama}`, { onTutup: aksi.tutup }),
    h('div', { kelas: 'gw-meta', teks: meta }),
    pilStatus(statusPil),
    simulasi ? h('p', { kelas: 'gw-peringatan', teks: 'SIMULASI: hasil ini dibuat otak simulasi untuk uji, bukan riset sungguhan.' }) : null,
    misi?.status === 'selesai_tanpa_temuan'
      ? h('p', { kelas: 'gw-sub', teks: `${nama} tidak menemukan jawaban di sumber yang dibaca. Itu hasil yang jujur, bukan kegagalan.` })
      : null,
    // The runtime's own reason (`alasan {kode, pesan}`, LOG-A A5) is complete and actionable: show it as is.
    (misi?.status === 'gagal' || misi?.status === 'menunggu_otak') && typeof misi?.alasan?.pesan === 'string' && misi.alasan.pesan
      ? h('p', { kelas: 'gw-peringatan', teks: misi.alasan.pesan })
      : null,
    kalimat.length ? h('div', { kelas: 'gw-ringkasan' }, kalimat) : null,
    Array.isArray(lap.ditolak) && lap.ditolak.length
      ? h('p', { kelas: 'gw-meta', teks: `${lap.ditolak.length} klaim dibuang karena kutipannya tidak ada di sumber.` })
      : null,
    h('div', { kelas: 'gw-blok' },
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
    bawah,
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
