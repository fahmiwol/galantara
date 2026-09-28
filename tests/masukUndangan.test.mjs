// ═══════════════════════════════════════════════════════
// tests/masukUndangan.test.mjs — signing in on galantara.io with an invitation code (ADR-0011).
//
// In production (not localhost) the "Masuk dulu" sheet asks for the code the Galantara team gave;
// the runtime turns it into a session once. Guarded: the form is a text field, never stored; a good
// code brings the player back to what they were doing; a refused or empty code shows a card that
// says what to do, with the typed code still in the field; an older runtime without the route says
// sign-in is not available yet.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DuniaParty } from '../src/party/DuniaParty.js';
import { buatApiRuntime } from '../src/party/apiRuntime.js';
import { tampilanMasuk } from '../src/ui/gw/tampilan.js';
import { cariTombol, teksPohon } from '../src/ui/gw/pohon.js';
import { kartuGalat } from '../src/party/pesanGalat.js';
import { buatRuntimePalsu } from './bantu/runtimePalsu.mjs';
import { kuras } from './bantu/jamPalsu.mjs';

const KODE = 'ABCDE-FGHJK-MNPQR';

function cari(pohon, cocok) {
  if (!pohon || typeof pohon !== 'object') return null;
  if (cocok(pohon)) return pohon;
  for (const anak of [].concat(pohon.anak ?? pohon.children ?? [])) {
    const k = cari(anak, cocok);
    if (k) return k;
  }
  return null;
}
const formDi = (pohon) => cari(pohon, (n) => n.tag === 'form' || n.nama === 'form' || n.type === 'form');
const inputDi = (pohon) => cari(pohon, (n) => (n.tag === 'input' || n.nama === 'input' || n.type === 'input'));

function siapkan({ undangan = new Map([[KODE.replace(/-/g, ''), 'penguji-a']]) } = {}) {
  const rt = buatRuntimePalsu({ devLogin: false, undangan });
  const tersimpan = [];
  const penyimpanan = { getItem: () => null, setItem: (k, v) => tersimpan.push(`${k}=${v}`), removeItem() {} };
  const toast = [];
  const game = {
    npcs: { get: (id) => ({ x: 0, z: 0, data: { id }, mesh: {}, perilaku: { keadaan: 'keliling' } }), perintah() {}, terlihat: true },
    avatar: { getPosition: () => ({ x: 0, z: 0 }) },
    toast: { show: (m) => toast.push(m) },
  };
  const dp = new DuniaParty(game, { api: buatApiRuntime({ fetch: rt.fetch }), penyimpanan, doc: { getElementById: () => null }, lokal: false });
  const sheet = {
    riwayat: [], terbuka: false, nama: null, pohon: null,
    buka(nama, pohon) { this.riwayat.push(nama); this.nama = nama; this.pohon = pohon; this.terbuka = true; },
    ganti(nama, pohon) { if (this.nama === nama) this.pohon = pohon; return true; },
    tutup() { this.terbuka = false; this.nama = null; },
    umumkan() {}, cari() { return null; },
  };
  dp.sheet = sheet;
  const kartu = [];
  dp._kartuDiSheet = (nama, k) => kartu.push([nama, k.kode]);
  const kirim = async (nilai) => {
    const form = formDi(sheet.pohon);
    assert.ok(form, `a form in sheet "${sheet.nama}": ${teksPohon(sheet.pohon).slice(0, 200)}`);
    form.props.on.submit({ preventDefault() {}, target: { elements: { undangan: { value: nilai } } } });
    await kuras();
  };
  return { rt, dp, sheet, kartu, kirim, tersimpan, toast };
}

test('production "Masuk dulu" asks for an invitation code in a plain text field (no dev button)', () => {
  const pohon = tampilanMasuk({ nama: 'Sari', dev: false }, {});
  const teks = teksPohon(pohon);
  assert.match(teks, /Kode undangan/);
  assert.match(teks, /tim Galantara/);
  assert.ok(!cariTombol(pohon, 'Masuk (mode pengembang)'), 'no dev sign-in in production');
  const input = inputDi(pohon);
  assert.ok(input, 'an input field');
  const attr = input.props.attr;
  assert.equal(attr.type, 'text', 'a code is not a password field: it is typed from a message');
  assert.equal(attr.name, 'undangan');
  assert.equal(attr.autocomplete, 'one-time-code');
  assert.equal(attr.spellcheck, 'false');
  assert.ok(cariTombol(pohon, 'Lanjut jalan-jalan'), 'a way out without signing in');
  const dev = teksPohon(tampilanMasuk({ nama: 'Sari', dev: true }, {}));
  assert.match(dev, /mode pengembang/, 'localhost keeps the dev sign-in');
  assert.doesNotMatch(dev, /Kode undangan/);
});

test('a good code signs in and returns to recruiting; the code is not kept anywhere', async () => {
  const { rt, dp, sheet, kirim, tersimpan, toast } = siapkan();
  await dp.muat();
  assert.equal(dp.party.masuk, false);
  dp.aksiDialog('rekrut', { id: 'sari' });
  assert.equal(sheet.nama, 'masuk');
  await kirim(` ${KODE.toLowerCase()} `);
  assert.equal(dp.party.masuk, true);
  assert.equal(dp.party.pemain, 'penguji-a');
  assert.equal(sheet.nama, 'rekrut', 'back to what the player was doing');
  assert.match(toast.at(-1), /Masuk sebagai penguji-a/);
  const kirimKode = rt.panggilan.filter((p) => p.jalur === '/rt/api/masuk/undangan');
  assert.equal(kirimKode.length, 1, 'sent once');
  const nilai = Object.values(dp.party).map((v) => { try { return typeof v === 'string' ? v : JSON.stringify(v); } catch { return ''; } });
  const jejak = JSON.stringify([tersimpan, toast, nilai]);
  assert.ok(!jejak.toUpperCase().includes(KODE.replace(/-/g, '')) && !jejak.toUpperCase().includes(KODE), 'the code is not stored or shown');
});

test('a refused code shows a card that says what to do, and the form stays for another try', async () => {
  const { dp, sheet, kartu, kirim } = siapkan();
  await dp.muat();
  dp.aksiDialog('rekrut', { id: 'sari' });
  await kirim('ZZZZZ-ZZZZZ-ZZZZZ');
  assert.equal(dp.party.masuk, false);
  assert.deepEqual(kartu.at(-1), ['masuk', 'UNDANGAN_DITOLAK']);
  assert.equal(sheet.nama, 'masuk', 'the sheet stays open with the form');
  const k = kartuGalat({ kode: 'UNDANGAN_DITOLAK' });
  assert.match(k.pesan, /minta kode baru/i);
  await kirim(KODE);
  assert.equal(dp.party.masuk, true, 'a second try with the right code works');
});

test('an empty code is answered here, without a request', async () => {
  const { rt, dp, kartu, kirim } = siapkan();
  await dp.muat();
  dp.aksiDialog('rekrut', { id: 'sari' });
  await kirim('   ');
  assert.deepEqual(kartu.at(-1), ['masuk', 'KODE_UNDANGAN_KOSONG']);
  assert.equal(rt.panggilan.filter((p) => p.jalur === '/rt/api/masuk/undangan').length, 0);
  assert.match(kartuGalat({ kode: 'KODE_UNDANGAN_KOSONG' }).pesan, /XXXXX-XXXXX-XXXXX/);
});

test('a "Masuk" button on a card opens the code form in production, without sending anything', async () => {
  const { rt, dp, sheet } = siapkan();
  await dp.muat();
  const sebelum = rt.panggilan.length;
  dp.aksiKartu('masuk');
  await kuras();
  assert.equal(sheet.nama, 'masuk');
  assert.ok(formDi(sheet.pohon), 'the sheet with the code field');
  assert.equal(rt.panggilan.length, sebelum, 'no sign-in request without a code');
});

test('a runtime without the invitation route says sign-in is not available yet', async () => {
  const { dp, kartu, kirim } = siapkan({ undangan: null });
  await dp.muat();
  dp.aksiDialog('rekrut', { id: 'sari' });
  await kirim(KODE);
  assert.deepEqual(kartu.at(-1), ['masuk', 'MASUK_BELUM_ADA']);
});
