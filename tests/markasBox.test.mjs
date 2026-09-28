// ═══════════════════════════════════════════════════════
// tests/markasBox.test.mjs — Markas box + julukan + Buku Warga (SPRINT-02 stream B items 5–6).
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DuniaParty } from '../src/party/DuniaParty.js';
import { MisiKlien } from '../src/party/MisiKlien.js';
import { buatApiRuntime } from '../src/party/apiRuntime.js';
import { KUNCI_CACHE } from '../src/party/PartyKlien.js';
import { BukuWarga, KUNCI_BUKU, entriBuku } from '../src/party/BukuWarga.js';
import { cariTombol, cariSemua, teksPohon } from '../src/ui/gw/pohon.js';
import { tampilanJulukan } from '../src/ui/gw/tampilan.js';
import { findSecrets } from '../vendor/party-contract/umum.js';
import { buatRuntimePalsu, penyimpananPalsu } from './bantu/runtimePalsu.mjs';
import { jamPalsu, dokumenPalsu, kuras } from './bantu/jamPalsu.mjs';

function siapkan({ penyimpanan = penyimpananPalsu() } = {}) {
  const rt = buatRuntimePalsu({ m2: true });
  const toast = [];
  const npcs = new Map();
  const game = {
    npcs: {
      get: (id) => npcs.get(id) ?? (npcs.set(id, { x: 0, z: 0, data: { id }, mesh: {}, perilaku: { keadaan: 'keliling' } }), npcs.get(id)),
      perintah: () => true, setelTitikIkut() {}, terlihat: true,
    },
    avatar: { getPosition: () => ({ x: 0, z: 0 }) },
    toast: { show: (m) => toast.push(m) },
  };
  const api = buatApiRuntime({ fetch: rt.fetch });
  const dp = new DuniaParty(game, { api, penyimpanan, doc: { getElementById: () => null }, lokal: true });
  dp.misi = new MisiKlien({ api, jam: jamPalsu(0), dokumen: dokumenPalsu() });
  const sheet = {
    terbuka: false, nama: null, pohon: null,
    buka(nama, pohon) { this.nama = nama; this.pohon = pohon; this.terbuka = true; },
    ganti(nama, pohon) { if (this.nama === nama) this.pohon = pohon; return true; },
    tutup() { this.terbuka = false; this.nama = null; },
    umumkan() {}, cari() { return null; },
  };
  dp.sheet = sheet;
  const tekan = async (label, pohon = sheet.pohon) => {
    const t = cariTombol(pohon, label);
    assert.ok(t, `button "${label}" in "${sheet.nama}": ${teksPohon(sheet.pohon).slice(0, 300)}`);
    await t.props.on.click();
    await kuras();
  };
  const kirimJulukan = async (nilai) => {
    const form = cariSemua(sheet.pohon, (n) => n.tag === 'form')[0];
    form.props.on.submit({ preventDefault() {}, target: { elements: { julukan: { value: nilai } } } });
    await kuras();
  };
  return { rt, dp, toast, sheet, tekan, kirimJulukan, penyimpanan };
}

test('Markas box: an agent taken out stays hired and can be brought back without a second hire', async () => {
  const k = siapkan();
  await k.dp.muat();
  await k.dp.party.masukDev('usr-box');
  await k.dp.party.rekrut('sari');
  await k.dp.party.rekrut('budi');
  const budi = k.dp.party.agenDariSpesies('budi').agen.instance_id;
  await k.dp.keluarkan(budi);
  const t = teksPohon(k.sheet.pohon);
  assert.match(t, /Markas · Party 1\/4/);
  assert.match(t, /DI MARKAS · TIDAK DIBAWA \(1\)/);
  assert.match(t, /Budi AI Operator Lapangan/);
  const rekrutSebelum = k.rt.tulisan().filter((p) => p.jalur.endsWith('/agen/rekrut')).length;
  await k.tekan('Bawa');
  assert.equal(k.dp.party.diParty('budi'), true);
  assert.match(k.toast.at(-1), /Budi ikut party lagi \(2\/4\)/);
  assert.equal(k.rt.tulisan().filter((p) => p.jalur.endsWith('/agen/rekrut')).length, rekrutSebelum, 'no second hire');
  assert.doesNotMatch(teksPohon(k.sheet.pohon), /DI MARKAS · TIDAK DIBAWA/);
});

test('Markas box with a full party: "Party penuh" instead of Bawa, and the client refuses a fifth', async () => {
  const k = siapkan();
  await k.dp.muat();
  await k.dp.party.masukDev('usr-box2');
  for (const sp of ['sari', 'budi', 'maya', 'dewi', 'dev']) await k.dp.party.rekrut(sp).catch(() => {});
  assert.equal(k.dp.party.jumlah(), 4);
  const dev = k.dp.party.agenDariSpesies('dev');
  assert.equal(dev, null, 'the fifth recruit was refused before any hire');
  const dewi = k.dp.party.agenDariSpesies('dewi').agen.instance_id;
  await k.dp.party.keluarkan(dewi);
  await k.dp.party.rekrut('dev');
  k.dp.bukaMarkas();
  assert.match(teksPohon(k.sheet.pohon), /Dewi AI Pedagang.*Party penuh/s);
  assert.equal(cariTombol(k.sheet.pohon, 'Bawa'), null);
  await assert.rejects(k.dp.party.bawa(dewi), (e) => e.kode === 'PARTY_PENUH');
});

test('julukan: saved through PUT /agen with its version, shown with the species, kept in the preview cache', async () => {
  const k = siapkan();
  await k.dp.muat();
  await k.dp.party.masukDev('usr-julukan');
  await k.dp.party.rekrut('sari');
  const sari = k.dp.party.agenDariSpesies('sari').agen.instance_id;
  k.dp.bukaMarkas();
  await k.tekan('Julukan');
  assert.equal(k.sheet.nama, 'julukan');
  const input = cariSemua(k.sheet.pohon, (n) => n.tag === 'input')[0];
  assert.deepEqual([input.props.attr.type, input.props.attr.maxlength], ['text', 24]);
  await k.kirimJulukan('  Sari   Kilat ');
  const put = k.rt.tulisan().filter((p) => p.metode === 'PUT' && p.jalur.startsWith('/rt/api/agen/'));
  assert.equal(put.length, 1);
  assert.equal(put[0].isi.agen.julukan, 'Sari Kilat');
  assert.equal(put[0].isi.versi, 1);
  assert.equal(k.rt.agen.get(sari).agen.julukan, 'Sari Kilat');
  assert.match(teksPohon(k.sheet.pohon), /Sari Kilat AI Sari · Penjejak Intelijen/);
  assert.equal(JSON.parse(k.penyimpanan.getItem(KUNCI_CACHE)).agen[0].julukan, 'Sari Kilat');

  // Remove it again: the field is deleted, not set to "".
  await k.dp.simpanJulukan(sari, '');
  assert.equal('julukan' in k.rt.agen.get(sari).agen, false);
});

test('julukan refusals: too long, key-shaped (never echoed back), version conflict retried once', async () => {
  const k = siapkan();
  await k.dp.muat();
  await k.dp.party.masukDev('usr-julukan2');
  await k.dp.party.rekrut('budi');
  const budi = k.dp.party.agenDariSpesies('budi').agen.instance_id;
  await k.dp.simpanJulukan(budi, 'x'.repeat(25));
  assert.match(teksPohon(k.sheet.pohon), /Julukan maksimal 24 huruf/);

  const kunci = ['sk', 'or', 'v1', 'd'.repeat(40)].join('-');
  const put = () => k.rt.tulisan().filter((p) => p.metode === 'PUT' && p.jalur.startsWith('/rt/api/agen/')).length;
  await k.dp.simpanJulukan(budi, `budi ${kunci}`);
  assert.equal(put(), 0, 'nothing sent');
  assert.match(teksPohon(k.sheet.pohon), /menempelkan kunci API/);
  assert.ok(!JSON.stringify(k.sheet.pohon).includes(kunci), 'the key is not put back into the field');

  // The Kantor renamed Budi meanwhile: the version moved on; one reload + retry, then saved.
  k.rt.agen.get(budi).version = 5;
  await k.dp.simpanJulukan(budi, 'Pak Budi');
  assert.equal(k.rt.agen.get(budi).agen.julukan, 'Pak Budi');
  assert.equal(put(), 2, 'first PUT refused (VERSI_BENTROK), second accepted');
});

test('julukan form: text field only, never a password field', () => {
  const v = tampilanJulukan({ nama: 'Budi', spesies: 'Budi', julukan: 'Pak Budi' }, {});
  assert.equal(cariSemua(v, (n) => n.props?.attr?.type === 'password').length, 0);
  assert.ok(cariTombol(v, 'Hapus julukan'));
});

test('Buku Warga: silhouettes for unmet species; talking or hiring fills the page', async () => {
  const k = siapkan();
  await k.dp.muat();
  k.dp.bukaBukuWarga();
  let t = teksPohon(k.sheet.pohon);
  assert.match(t, /Ditemui 0 dari 5 warga/);
  assert.equal((t.match(/\?\?\?/g) ?? []).length, 5);
  assert.doesNotMatch(t, /Sari|Penjejak/, 'an unmet species shows no name and no class');
  assert.match(t, /kabarnya ada di Kuta/, 'where to look is the only hint');

  assert.equal(k.dp.temui('sari'), true);
  assert.equal(k.dp.temui('sari'), false, 'once');
  assert.equal(k.dp.temui('guide'), false, 'not a hireable species');
  assert.match(k.toast.at(-1), /Sari tercatat di Buku Warga/);
  await k.dp.party.masukDev('usr-buku');
  await k.dp.party.rekrut('budi'); // hired without a chat (e.g. from the Kantor): met all the same
  k.dp.bukaBukuWarga();
  t = teksPohon(k.sheet.pohon);
  assert.match(t, /Ditemui 2 dari 5/);
  assert.match(t, /Sari AI Penjejak Intelijen Ditemui di Oola · bisa direkrut/);
  assert.match(t, /Budi AI Operator Lapangan Ditemui di Oola · di party-mu/);
  assert.ok(cariTombol(k.sheet.pohon, 'Arahkan saya ke Sari'));
});

test('Buku Warga storage: ids only, survives a reload, junk and key-shaped content are dropped', () => {
  const s = penyimpananPalsu();
  const b = new BukuWarga({ penyimpanan: s });
  b.tandai('sari');
  b.tandai('../x');
  assert.deepEqual(JSON.parse(s.getItem(KUNCI_BUKU)), { v: 1, ditemui: ['sari'] });
  assert.equal(new BukuWarga({ penyimpanan: s }).sudah('sari'), true);
  const kunci = ['sk', 'or', 'v1', 'e'.repeat(40)].join('-');
  const kotor = penyimpananPalsu({ [KUNCI_BUKU]: JSON.stringify({ v: 1, ditemui: ['sari', kunci] }) });
  assert.equal(new BukuWarga({ penyimpanan: kotor }).sudah('sari'), false, 'a list holding a key-shaped value is not trusted at all');
  assert.equal(findSecrets(JSON.parse(s.getItem(KUNCI_BUKU))).length, 0);
  // Blocked storage: the book still works for this visit.
  const rusak = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const b2 = new BukuWarga({ penyimpanan: rusak });
  assert.equal(b2.tandai('maya'), true);
  assert.equal(b2.sudah('maya'), true);
});

test('entriBuku: order kept; met-ness from chats or the roster', () => {
  const e = entriBuku({
    spesies: [{ id: 'a', nama: 'A', ditemui_di: 'oola-hub' }, { id: 'b', nama: 'B' }],
    ditemui: (id) => id === 'b',
    status: () => null,
  });
  assert.deepEqual(e.map((x) => [x.id, x.ditemui, x.nama]), [['a', false, null], ['b', true, 'B']]);
});
