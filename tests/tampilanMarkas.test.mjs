// ═══════════════════════════════════════════════════════
// tests/tampilanMarkas.test.mjs — the M1 sheets as data, and the renderer that shows them.
//
// Guarded (mutation-proven, docs/sprint/LOG-B-dunia-klien.md):
// - text only through textContent; links only https (or http on localhost); no on*/style attrs;
// - Markas: party x/4 from data, empty slots folded into one row, no rarity, no stray numbers;
// - every brain labelled; the world has no key input (no password field anywhere);
// - a result with zero sources says so; source numbers follow the report's references;
// - every §9.9 failure is a card with at least one button.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { h, render, hrefAman, teksPohon, cariSemua, cariTombol } from '../src/ui/gw/pohon.js';
import {
  tampilanRekrut, tampilanMarkas, tampilanOtak, tampilanMisi, tampilanHasil, tampilanMasuk,
  tampilanKartuGalat, bacaFormMisi, statusAgen, durasi,
} from '../src/ui/gw/tampilan.js';
import { kartuGalat, KARTU, AKSI_KARTU, isiTeks } from '../src/party/pesanGalat.js';
import { SPESIES } from './bantu/runtimePalsu.mjs';

const APP = join(import.meta.dirname, '..');
const sari = SPESIES.find((s) => s.id === 'sari');
const budi = SPESIES.find((s) => s.id === 'budi');
const OTAK = { provider: 'migancore', model: 'qwen3:4b-instruct-2507' };

// ── A DOM stand-in that refuses innerHTML ─────────────
function dokumen() {
  const buat = (tag) => {
    const el = {
      tag, anak: [], attr: {}, textContent: '', className: '', id: '', dengar: {},
      setAttribute(k, v) { this.attr[k] = v; },
      appendChild(a) { this.anak.push(a); return a; },
      addEventListener(n, fn) { this.dengar[n] = fn; },
    };
    Object.defineProperty(el, 'innerHTML', { set() { throw new Error('innerHTML is forbidden'); } });
    return el;
  };
  return { createElement: buat, createTextNode: (t) => ({ tag: '#text', textContent: t }) };
}

test('render writes text as text, drops unsafe links and attributes', () => {
  const pohon = h('div', { kelas: 'x', attr: { onclick: 'alert(1)', style: 'color:red', 'aria-label': 'ok' } },
    h('p', { teks: '<img src=x onerror=alert(1)>' }),
    h('a', { attr: { href: 'javascript:alert(1)' }, teks: 'jahat' }),
    h('a', { attr: { href: 'https://contoh.go.id/data' }, teks: 'baik' }),
    '<b>teks polos</b>');
  const el = render(pohon, dokumen());
  assert.deepEqual(el.attr, { 'aria-label': 'ok' });
  assert.equal(el.anak[0].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(el.anak[1].attr.href, undefined, 'javascript: link removed');
  assert.equal(el.anak[2].attr.href, 'https://contoh.go.id/data');
  assert.equal(el.anak[3].textContent, '<b>teks polos</b>');
  assert.equal(hrefAman('http://localhost:3200/dashboard'), 'http://localhost:3200/dashboard');
  for (const buruk of ['http://situs.id/x', 'data:text/html,hai', 'javascript:0', '//situs.id', '/relatif']) assert.equal(hrefAman(buruk), null, buruk);
});

test('Rekrut: who, what it needs, 0/4 → 1/4, and one clear action', () => {
  const dipanggil = [];
  const t = tampilanRekrut({ spesies: sari, jumlah: 0, maks: 4, otak: OTAK }, { rekrut: () => dipanggil.push('rekrut'), tutup: () => dipanggil.push('tutup') });
  const teks = teksPohon(t);
  for (const perlu of ['Ajak Sari gabung party?', 'AGEN AI', 'Penjejak Intelijen', 'Ditemui di Oola', 'YANG DIBUTUHKAN SARI', 'MiganCore, milik sendiri, tanpa kunci', 'Jelajah sumber (baca saja)', 'Party 0/4 → 1/4', 'Nanti dulu']) {
    assert.ok(teks.includes(perlu), `missing "${perlu}"`);
  }
  cariTombol(t, 'Rekrut Sari').props.on.click();
  cariTombol(t, 'Nanti dulu').props.on.click();
  assert.deepEqual(dipanggil, ['rekrut', 'tutup']);
  // Full party: no recruit button, a way to the Markas instead.
  const penuh = tampilanRekrut({ spesies: budi, jumlah: 4, maks: 4 }, {});
  assert.equal(cariTombol(penuh, 'Rekrut Budi'), null);
  assert.ok(cariTombol(penuh, 'Buka Markas'));
  assert.match(teksPohon(penuh), /belum punya keahlian misi/);
});

test('Markas 0/4 points to the nearest recruit; no rarity, no numbers that are not data', () => {
  const t = tampilanMarkas({ anggota: [null, null, null, null], maks: 4, berikut: { id: 'sari', nama: 'Sari', tempat: 'Oola' } }, { urlKantor: 'https://mighan.com/dashboard' });
  const teks = teksPohon(t);
  assert.ok(teks.includes('Markas · Party 0/4'));
  assert.ok(teks.includes('Party masih kosong.'));
  assert.ok(cariTombol(t, 'Arahkan saya ke Sari'));
  assert.doesNotMatch(teks, /EPIK|LANGKA|LEGEND|rarity|sumber\b.*\d{2,}/i);
  assert.deepEqual(teks.match(/\d+/g), ['0', '4'], 'the only numbers are the party count');
});

test('Markas 1/4: an agent card with AI tag, status, labelled brain; three empty slots in one row', () => {
  const anggota = [{ instance_id: 'ag_abc123', id: 'sari', nama: 'Sari', kelas: 'Penjejak Intelijen', status: 'siap', brain: OTAK, bisaMisi: true }, null, null, null];
  const dipanggil = [];
  const t = tampilanMarkas({ anggota, maks: 4, berikut: { id: 'budi', nama: 'Budi', tempat: 'Oola' } }, { bukaMisi: (id) => dipanggil.push(['misi', id]), keluarkan: (id) => dipanggil.push(['keluar', id]), urlKantor: 'https://mighan.com/dashboard' });
  const teks = teksPohon(t);
  for (const perlu of ['Markas · Party 1/4', 'Sari', 'AI', 'Siap diberi misi', 'Otak: MiganCore', '✓ MILIK SENDIRI', '3 slot kosong · Budi ada di Oola']) assert.ok(teks.includes(perlu), `missing "${perlu}"`);
  assert.equal(cariSemua(t, (n) => n.props?.kelas === 'gw-kartu').length, 1, 'empty slots are not cards');
  assert.equal(cariSemua(t, (n) => n.props?.kelas === 'gw-slot').length, 1, 'one folded row for all empty slots');
  cariTombol(t, 'Beri misi').props.on.click();
  cariTombol(t, 'Keluarkan').props.on.click();
  assert.deepEqual(dipanggil, [['misi', 'ag_abc123'], ['keluar', 'ag_abc123']]);
  // A ready result takes the main button; a cloud brain says so.
  const siap = tampilanMarkas({ anggota: [{ ...anggota[0], status: 'hasil_siap', brain: { provider: 'openrouter', model: 'x', vault_ref: 'vault://u/k123456' } }], maks: 4 }, {});
  assert.ok(cariTombol(siap, 'Periksa hasil'));
  assert.equal(cariTombol(siap, 'Beri misi'), null);
  assert.match(teksPohon(siap), /CLOUD PIHAK LAIN/);
  assert.doesNotMatch(teksPohon(siap), /vault:\/\//, 'a vault reference is never shown');
});

test('Otak is display-only: no inputs, a link to the Kantor, honest health', () => {
  const t = tampilanOtak({ nama: 'Sari', brain: OTAK, statusOtak: null }, { urlKantor: 'https://mighan.com/dashboard' });
  assert.equal(cariSemua(t, (n) => ['input', 'textarea', 'select'].includes(n.tag)).length, 0);
  const tautan = cariTombol(t, 'Ubah di Kantor ↗');
  assert.equal(tautan.props.attr.href, 'https://mighan.com/dashboard');
  assert.match(teksPohon(t), /belum ada data/);
  assert.match(teksPohon(t), /tidak dikirim ke pihak lain/);
  const hidup = tampilanOtak({ nama: 'Sari', brain: OTAK, statusOtak: [{ provider: 'migancore', model: OTAK.model, hidup: true, dicek: '2026-09-26T15:03:00Z' }] }, {});
  assert.match(teksPohon(hidup), /● hidup · dicek 26 Sep/);
  // RUNTIME_MODE=demo: the runtime reports only the SIMULASI brain, and every mission runs on
  // it. The sheet must say so instead of promising the self-hosted brain (found by the M1 e2e).
  const demo = tampilanOtak({ nama: 'Sari', brain: OTAK, statusOtak: [{ provider: 'simulasi', model: 'simulasi-v1', hidup: true, dicek: '2026-09-26T15:03:00Z', label: 'SIMULASI' }] }, {});
  assert.match(teksPohon(demo), /SIMULASI/);
  assert.match(teksPohon(demo), /mode demo/);
  assert.doesNotMatch(teksPohon(demo), /tidak dikirim ke pihak lain/, 'no self-hosted promise while missions run on the simulation');
  assert.doesNotMatch(teksPohon(hidup), /mode demo/);
});

test('Beri misi: question ≤ 300, three https fields, and no password field', () => {
  const dikirim = [];
  const t = tampilanMisi({ nama: 'Sari', brain: OTAK }, { kirim: (x) => dikirim.push(x) });
  const tanya = cariSemua(t, (n) => n.tag === 'textarea')[0];
  assert.equal(tanya.props.attr.maxlength, 300);
  const url = cariSemua(t, (n) => n.tag === 'input');
  assert.equal(url.length, 3);
  assert.ok(url.every((u) => u.props.attr.type === 'url'));
  assert.equal(cariSemua(t, (n) => n.props?.attr?.type === 'password').length, 0);
  const form = cariSemua(t, (n) => n.tag === 'form')[0];
  const elements = { pertanyaan: { value: 'harga cabai' }, sumber1: { value: 'https://a.id' }, sumber2: { value: ' ' }, sumber3: { value: '' } };
  form.props.on.submit({ preventDefault() {}, target: { elements } });
  assert.deepEqual(dikirim, [{ jenis: 'riset-sumber', pertanyaan: 'harga cabai', sumber: ['https://a.id'] }]);
  assert.deepEqual(bacaFormMisi(null), { jenis: 'riset-sumber', pertanyaan: '', sumber: [] });
});

test('Hasil: source numbers follow the references; zero sources is a warning; verdict buttons', () => {
  const misi = {
    id: 'm_1', status: 'selesai', pertanyaan: 'harga cabai rawit di Bogor', selesai: '2026-09-26T15:02:00Z',
    laporan: {
      ringkasan: [{ kalimat: 'Harga naik minggu ini.', rujukan: ['T2'] }, { kalimat: 'Pasokan dari Garut berkurang.', rujukan: ['T1', 'T2'] }],
      // Crossed on purpose: T1 cites the SECOND source, so "T# = source #" would be wrong.
      temuan: [{ id: 'T1', sumber: 'S2' }, { id: 'T2', sumber: 'S1' }],
      ditolak: [{ alasan: 'kutipan_tidak_ada_di_sumber', klaim: 'x' }],
      sumber: [
        { id: 'S1', url: 'https://contoh.go.id/a', judul: 'Harga pangan', diambil: '2026-09-26T15:00:00Z' },
        { id: 'S2', url: 'http://tidak-aman.id/b', judul: 'Berita pasar' },
      ],
      otak: { provider: 'migancore', model: 'qwen3:4b-instruct-2507', label: 'otak milik sendiri' },
    },
  };
  const t = tampilanHasil({ nama: 'Sari', misi }, {});
  const teks = teksPohon(t);
  assert.match(teks, /Harga naik minggu ini\. \[1\]/);
  assert.match(teks, /Pasokan dari Garut berkurang\. \[2\] \[1\]/);
  assert.match(teks, /SUMBER \(2\)/);
  assert.match(teks, /1 klaim dibuang/);
  assert.match(teks, /otak MiganCore \(otak milik sendiri\)/);
  assert.ok(cariTombol(t, 'Setujui & simpan') && cariTombol(t, 'Minta perbaiki') && cariTombol(t, 'Buang'));
  const el = render(t, dokumen());
  const tautan = [];
  const jalan = (n) => { if (n.tag === 'a') tautan.push(n.attr.href); (n.anak ?? []).forEach(jalan); };
  jalan(el);
  assert.ok(tautan.includes('https://contoh.go.id/a'));
  assert.ok(!tautan.includes('http://tidak-aman.id/b'), 'non-https source links are not clickable');

  const kosong = tampilanHasil({ nama: 'Sari', misi: { ...misi, laporan: { ...misi.laporan, sumber: [], ringkasan: [] } } }, {});
  assert.match(teksPohon(kosong), /Tidak ada sumber\. Perlakukan ini sebagai dugaan, bukan fakta\./);
  const simulasi = tampilanHasil({ nama: 'Sari', misi: { ...misi, laporan: { ...misi.laporan, otak: { provider: 'simulasi', label: 'SIMULASI' } } } }, {});
  assert.match(teksPohon(simulasi), /SIMULASI: hasil ini dibuat otak simulasi/);
  const disetujui = tampilanHasil({ nama: 'Sari', misi: { ...misi, putusan: 'setujui' } }, {});
  assert.equal(cariTombol(disetujui, 'Setujui & simpan'), null);
  assert.match(teksPohon(disetujui), /Disetujui · tersimpan/);

  // Runtime M1 failure: its own reason is shown as is (LOG-A A5), and only for a failed/waiting mission.
  const pesan = 'Semua sumber gagal diambil: S1 (waktu habis) Periksa alamatnya, lalu beri misi lagi.';
  const gagal = tampilanHasil({ nama: 'Sari', misi: { ...misi, status: 'gagal', alasan: { kode: 'SUMBER_GAGAL', pesan } } }, {});
  assert.ok(teksPohon(gagal).includes(pesan));
  const selesai = tampilanHasil({ nama: 'Sari', misi: { ...misi, alasan: { kode: 'X', pesan: 'basi' } } }, {});
  assert.ok(!teksPohon(selesai).includes('basi'), 'a stale reason on a finished mission is not shown');
});

test('every §9.9 failure is a card with a known button; nothing leaks a {placeholder}', () => {
  for (const [kode] of Object.entries(KARTU)) {
    const k = kartuGalat({ kode, pesan: 'Pesan dari server.' }, { nama: 'Sari', otak: 'MiganCore', penyedia: 'OpenRouter', topik: 'harga cabai' });
    assert.ok(k.pesan.trim().length > 10, kode);
    assert.ok(k.tombol.length >= 1, `${kode} needs a button`);
    assert.ok(k.tombol.every((t) => AKSI_KARTU.has(t.aksi)), `${kode} uses a known action`);
    assert.doesNotMatch(k.pesan, /[{}]/, kode);
  }
  const tidakDikenal = kartuGalat({ kode: 'SESUATU_BARU', pesan: 'Server bilang begini.' });
  assert.equal(tidakDikenal.pesan, 'Server bilang begini.');
  assert.equal(isiTeks('{nama} dan {otak}', {}), 'agenmu dan Otak');
  const diklik = [];
  const t = tampilanKartuGalat(kartuGalat({ kode: 'KUNCI_DITEMPEL' }), { kartu: (a) => diklik.push(a) });
  cariTombol(t, 'Hapus teks').props.on.click();
  assert.deepEqual(diklik, ['hapusTeks']);
});

test('status words, durations, and the sign-in sheet', () => {
  assert.equal(statusAgen('bekerja', { durasi: '3 mnt' }).label, 'Sedang bekerja · 3 mnt');
  assert.equal(statusAgen('hasil_siap').perluPerhatian, true);
  assert.equal(statusAgen(null).label, 'Siap diberi misi');
  assert.equal(durasi('2026-09-26T15:00:00Z', Date.parse('2026-09-26T15:01:20Z')), '1 mnt 20 dtk');
  assert.equal(durasi(null), null);
  const m = tampilanMasuk({ nama: 'Sari', dev: true }, {});
  assert.match(teksPohon(m), /supaya Sari tetap ada besok/);
  assert.ok(cariTombol(m, 'Masuk (mode pengembang)'));
});

// ── Static guards over the world's source ─────────────
function berkas(dir, pola) {
  const out = [];
  for (const nama of readdirSync(dir)) {
    const j = join(dir, nama);
    if (statSync(j).isDirectory()) out.push(...berkas(j, pola));
    else if (pola.test(nama)) out.push(j);
  }
  return out;
}

test('no innerHTML in the M1 client code; no password field anywhere in the world', () => {
  const m1 = [...berkas(join(APP, 'src', 'party'), /\.js$/), ...berkas(join(APP, 'src', 'ui', 'gw'), /\.js$/)];
  assert.ok(m1.length >= 6);
  for (const f of m1) assert.doesNotMatch(readFileSync(f, 'utf8'), /\.innerHTML\s*=|insertAdjacentHTML|outerHTML\s*=/, f);
  const dunia = [join(APP, 'index.html'), ...berkas(join(APP, 'src'), /\.(js|html|css)$/)];
  for (const f of dunia) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /type\s*=\s*["']?password|type:\s*['"]password/i, `${f} must not ask for a key`);
  }
});
