// A read-only world HUD. No requests, credentials, party writes or animation loop here.
// DuniaParty owns the state and actions; this module only projects safe display fields.
import { h, render } from './pohon.js';
import { labelOtak } from '../../party/PartyKlien.js';
import { statusAgen } from './tampilan.js';
import { JEDA_SETELAH_TEKAN_MS } from '../Sheet.js';
import { MAX_SLOTS } from '../../../vendor/party-contract/party.js';

const AKSI = Object.freeze({
  siap: ['misi', 'Beri misi'], bekerja: ['markas', 'Lihat pekerjaan'],
  antre: ['markas', 'Lihat antrean'], menunggu_otak: ['otak', 'Periksa otak'],
  menunggu_persetujuan: ['izin', 'Periksa izin'], hasil_siap: ['hasil', 'Buka hasil'],
  gagal: ['hasil', 'Periksa kegagalan'],
});
const BELUM_PASTI = { label: 'Status belum terverifikasi', jenis: 'siaga', glyph: '?' };

/** Deliberately no spreading runtime objects: a HUD never needs a vault reference or corpus. */
export function modelTimku(k = {}) {
  const maks = Math.min(MAX_SLOTS, Number.isInteger(k.maks) && k.maks > 0 ? k.maks : MAX_SLOTS);
  const boleh = k.masuk && k.termuat;
  const anggota = boleh ? (k.anggota ?? []).slice(0, maks).filter(Boolean).map(a => {
    const ragu = k.terputus || k.gagalMuat || (k.galatAgen ?? []).includes(a.instance_id);
    const dikenal = Object.hasOwn(AKSI, a.status ?? 'siap');
    let [aksi, tombol] = AKSI[a.status ?? 'siap'] ?? ['markas', 'Periksa tim'];
    if ((a.status === 'siap' || !a.status) && (!a.brain || !a.bisaMisi)) {
      [aksi, tombol] = !a.brain ? ['otak', 'Pilih otak'] : ['markas', 'Lihat agen'];
    }
    if (ragu) [aksi, tombol] = ['markas', 'Periksa koneksi'];
    const simulasi = (k.simulasiAgen ?? []).includes(a.instance_id) || labelOtak(a.brain).jenis === 'simulasi';
    return {
      id: a.instance_id, nama: a.julukan || a.nama, kelas: a.kelas,
      status: ragu ? BELUM_PASTI : !dikenal ? { ...BELUM_PASTI, label: 'Status belum dikenali' } : statusAgen(a.status),
      // A chosen provider is not proof it executed this mission; simulation evidence takes precedence.
      otak: simulasi ? 'SIMULASI · bukan hasil kerja nyata' : `Otak dipilih: ${labelOtak(a.brain).teks}`,
      simulasi, aksi, tombol, ulang: !ragu && a.status === 'gagal' && Boolean(a.brain) && a.bisaMisi === true,
    };
  }) : [];
  const mode = k.gagalMuat || k.terputus ? 'terputus' : !k.termuat ? 'memuat' : !k.masuk ? 'tamu' : 'siap';
  return { mode, anggota, maks, jumlah: anggota.length, kosong: maks - anggota.length,
    berikut: typeof k.berikut?.nama === 'string' ? k.berikut.nama : null,
    ringkas: mode === 'terputus' ? 'Koneksi perlu diperiksa' : mode === 'memuat' ? 'Memuat tim…'
      : mode === 'tamu' ? 'Mulai perjalananmu' : `${anggota.length}/${maks} agen`,
  };
}

const tombol = (teks, aksi, key, utama = false) => h('button', {
  kelas: `gw-timku-aksi${utama ? ' utama' : ''}`, teks,
  attr: { type: 'button', 'data-timku-key': key }, on: { click: aksi },
});

export function tampilanTimku(m, aksi = {}) {
  const panggil = (jenis, id) => () => aksi[jenis]?.(id);
  if (!m.anggota.length && m.mode !== 'siap') {
    const tamu = m.mode === 'tamu';
    return h('div', { kelas: 'gw-timku-isi' },
      h('p', { kelas: 'gw-timku-ajakan', teks: tamu ? 'Petualanganmu, tim pilihanmu.' : m.ringkas }),
      h('p', { kelas: 'gw-timku-meta', teks: tamu
        ? 'Kenali warga, rekrut agen AI, lalu kerjakan misi bersama.'
        : 'Status kerja belum terverifikasi. Kamu tetap bisa menjelajahi dunia.' }),
      tombol(tamu ? 'Bangun timku' : 'Periksa tim', panggil('markas'), 'markas', true));
  }
  return h('div', { kelas: 'gw-timku-isi' },
    m.mode === 'terputus' ? h('p', { kelas: 'gw-timku-peringatan', teks: 'Koneksi terputus · status terakhir belum terverifikasi.' }) : null,
    m.anggota.length ? h('ul', { kelas: 'gw-timku-daftar', attr: { 'aria-label': 'Agen dalam party' } },
      m.anggota.map(a => h('li', { kelas: 'gw-timku-agen' },
        h('div', { kelas: 'gw-timku-identitas' },
          h('span', { kelas: 'gw-timku-potret', attr: { 'aria-hidden': 'true' }, teks: Array.from(a.nama ?? '?')[0] }),
          h('div', { kelas: 'gw-timku-nama' },
            h('strong', { teks: a.nama }), h('span', { kelas: 'gw-timku-meta', teks: a.kelas })),
          h('span', { kelas: 'gw-timku-ai', teks: 'AI' })),
        h('p', { kelas: `gw-timku-status gw-st-${a.status.jenis}` },
          h('b', { teks: a.status.glyph, attr: { 'aria-hidden': 'true' } }), a.status.label),
        h('p', { kelas: `gw-timku-meta${a.simulasi ? ' gw-timku-peringatan' : ''}`, teks: a.otak }),
        tombol(a.tombol, panggil(a.aksi, a.id), `agen:${a.id}`),
        a.ulang ? tombol('Beri misi baru', panggil('misi', a.id), `ulang:${a.id}`) : null)))
      : h('div', { kelas: 'gw-timku-kosong' },
        h('span', { kelas: 'gw-timku-benih', teks: '✦', attr: { 'aria-hidden': 'true' } }),
        h('p', { kelas: 'gw-timku-ajakan', teks: 'Tim hebat dimulai dari satu perkenalan.' }),
        h('p', { kelas: 'gw-timku-meta', teks: m.berikut ? `Temui ${m.berikut} di dunia untuk mulai merekrut.` : 'Jelajahi dunia dan temui agen pertamamu.' })),
    m.kosong > 0 ? tombol(m.anggota.length ? `+ Temukan rekan · ${m.kosong} slot kosong` : 'Temukan agen', panggil('buku'), 'buku', !m.anggota.length) : null,
    tombol('Kelola party', panggil('markas'), 'markas'));
}

/** Stable header + keyed focus restoration; identical status updates do not touch the DOM. */
export class Timku {
  constructor(doc, aksi, { terbuka = false } = {}) {
    this.doc = doc;
    this.host = doc?.getElementById('gw-timku');
    if (!this.host) return;
    this.aksi = aksi;
    this.isi = doc.createElement('div');
    this.isi.id = 'gw-timku-isi';
    this.ringkas = doc.createElement('span');
    this.ringkas.className = 'gw-timku-ringkas';
    this.kepala = render(h('button', {
      kelas: 'gw-timku-kepala', attr: { type: 'button', 'aria-controls': this.isi.id },
      on: { click: () => this.lipat(!this.terbuka) },
    }, h('span', { kelas: 'gw-timku-lambang', teks: '✦', attr: { 'aria-hidden': 'true' } }),
    h('strong', { teks: 'Timku' })), doc);
    this.kepala.append(this.ringkas);
    this.host.replaceChildren(this.kepala, this.isi);
    // Buttons are world UI, not movement controls. Do not swallow Tab or Space defaults.
    this.host.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { this.lipat(false); this.kepala.focus(); }
    });
    this.host.addEventListener('keyup', e => e.stopPropagation());
    // One card at a time on the shared rail, including keyboard activation.
    this.doc.getElementById('harian-pill')?.addEventListener('click', () => this.lipat(false));
    // The touch-generated click must land on the button that was pressed, even if polling
    // changes the status before the finger lifts (the same rule as the existing Sheet).
    this.host.addEventListener('pointerdown', () => {
      this._ditekan = true;
      clearTimeout(this._jeda);
    });
    const lepas = () => {
      clearTimeout(this._jeda);
      this._jeda = setTimeout(() => {
        this._ditekan = false;
        if (this._tunda) { const k = this._tunda; this._tunda = null; this.perbarui(k); }
      }, JEDA_SETELAH_TEKAN_MS);
    };
    this.host.addEventListener('pointerup', lepas);
    this.host.addEventListener('pointercancel', lepas);
    this.host.addEventListener('pointerleave', lepas);
    this.lipat(terbuka);
  }

  lipat(terbuka) {
    if (terbuka) this.doc.getElementById('harian-kartu')?.classList.remove('on');
    this.terbuka = terbuka;
    this.isi.hidden = !terbuka;
    this.kepala.setAttribute('aria-expanded', String(terbuka));
    this.host.classList.toggle('terbuka', terbuka);
  }

  perbarui(keadaan) {
    if (!this.host) return;
    if (this._ditekan && keadaan.masuk) { this._tunda = keadaan; return; }
    this._tunda = null; // A revoked session must clear private names even during a press.
    const m = modelTimku(keadaan);
    const sidik = JSON.stringify(m);
    if (sidik === this._sidik) return;
    this._sidik = sidik;
    this.ringkas.textContent = m.ringkas;
    this.kepala.setAttribute('aria-label', `Timku · ${m.ringkas}`);
    const fokus = this.isi.contains(this.doc.activeElement)
      ? this.doc.activeElement.getAttribute('data-timku-key') : null;
    this.isi.replaceChildren(render(tampilanTimku(m, this.aksi), this.doc));
    if (fokus) {
      // Only component-owned keys are compared; names/IDs never become selectors.
      const calon = [...this.isi.querySelectorAll('[data-timku-key]')].find(el => el.getAttribute('data-timku-key') === fokus);
      (calon ?? this.kepala).focus();
    }
  }
}
