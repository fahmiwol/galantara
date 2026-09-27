// ═══════════════════════════════════════════════════════
// tests/partyKlien.test.mjs — roster + party as the world sees them.
//
// Guarded (mutation-proven, docs/sprint/LOG-B-dunia-klien.md):
// - the party is validated with the shared contract BEFORE it is sent (no round trip for a
//   party the server would refuse);
// - a fifth member and a duplicate agent never reach the server;
// - a version conflict (Kantor changed the party) reloads and retries once, keeping both edits;
// - localStorage holds an allowlisted preview only, and nothing findSecrets() would flag.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PartyKlien, KUNCI_CACHE, ID_PARTY_BAWAAN, normalisasiPemilik, labelOtak } from '../src/party/PartyKlien.js';
import { buatApiRuntime } from '../src/party/apiRuntime.js';
import { findSecrets } from '../vendor/party-contract/umum.js';
import { buatRuntimePalsu, penyimpananPalsu } from './bantu/runtimePalsu.mjs';

// Fake credentials are assembled at runtime so the repo scanner stays clean (AGENTS.md §2.4).
const kunciPalsu = () => ['sk', 'or', 'v1', 'x'.repeat(40)].join('-');

function siapkan(opsi = {}) {
  const rt = buatRuntimePalsu(opsi);
  const simpan = penyimpananPalsu();
  const klien = new PartyKlien({ api: buatApiRuntime({ fetch: rt.fetch }), penyimpanan: simpan });
  return { rt, simpan, klien };
}

test('a guest loads species but no party, and cannot recruit without signing in', async () => {
  const { rt, klien } = siapkan();
  await klien.muat();
  assert.equal(klien.masuk, false);
  assert.equal(klien.spesies.get('sari').kelas_kerja, 'Penjejak Intelijen');
  const err = await klien.rekrut('sari').catch((e) => e);
  assert.equal(err.kode, 'BELUM_MASUK');
  assert.equal(rt.tulisan().length, 0, 'nothing is written for a guest');
});

test('recruiting hires the agent, then saves the party through the contract with a version', async () => {
  const { rt, klien } = siapkan({ masuk: 'usr-rekrut' });
  await klien.muat();
  const hasil = await klien.rekrut('sari');
  assert.equal(hasil.baru, true);
  assert.equal(hasil.jumlah, 1);
  assert.equal(klien.diParty('sari'), true);
  const [rekrut, simpan] = rt.tulisan();
  assert.equal(rekrut.jalur, '/rt/api/agen/rekrut');
  assert.equal(simpan.jalur, `/rt/api/party/${ID_PARTY_BAWAAN}`);
  assert.equal(simpan.isi.versi, 0, 'a new party is created at version 0');
  assert.equal(simpan.isi.party.schema, 'galantara.party/v2');
  assert.equal(simpan.isi.party.slots.length, 4);
  assert.equal(klien.versiParty, 1);

  // Asking again does not hire a second Sari or write anything.
  const lagi = await klien.rekrut('sari');
  assert.equal(lagi.baru, false);
  assert.equal(rt.tulisan().length, 2);
});

test('a fifth member is refused in the world, before any request', async () => {
  const { rt, klien } = siapkan({ masuk: 'usr-penuh' });
  await klien.muat();
  for (const s of ['sari', 'budi', 'maya', 'dewi']) await klien.rekrut(s);
  assert.equal(klien.jumlah(), 4);
  const sebelum = rt.panggilan.length;
  const err = await klien.rekrut('dev').catch((e) => e);
  assert.equal(err.kode, 'PARTY_PENUH');
  assert.match(err.pesan, /4\/4/);
  assert.equal(rt.panggilan.length, sebelum, 'no hire, no save');
});

test('a party the contract refuses is never sent (client-side validateParty)', async () => {
  const { rt, klien } = siapkan({ masuk: 'usr-basi' });
  // The stored party points at an agent that no longer exists in the roster.
  rt.party.set(ID_PARTY_BAWAAN, { party: { schema: 'galantara.party/v2', id: ID_PARTY_BAWAAN, owner_id: 'usr-basi', slots: ['ag_hilang123', null, null, null] }, version: 3 });
  await klien.muat();
  const err = await klien.rekrut('sari').catch((e) => e);
  assert.equal(err.kode, 'PARTY_TIDAK_SAH');
  assert.match(err.pesan, /tidak ada di rostermu/);
  assert.equal(rt.tulisan().filter((p) => p.metode === 'PUT').length, 0, 'the server never sees an invalid party');
});

test('a version conflict reloads the party and retries once, keeping the other edit', async () => {
  const { rt, klien } = siapkan({ masuk: 'usr-bentrok' });
  await klien.muat();
  await klien.rekrut('sari');
  // Meanwhile the Kantor adds Budi (version 1 -> 2).
  const budi = rt.rekrutLangsung('budi');
  rt.party.get(ID_PARTY_BAWAAN).party.slots[1] = budi.instance_id;
  rt.party.get(ID_PARTY_BAWAAN).version = 2;
  await klien.rekrut('maya');
  const tersimpan = rt.party.get(ID_PARTY_BAWAAN);
  assert.equal(tersimpan.version, 3);
  assert.equal(tersimpan.party.slots.filter(Boolean).length, 3, 'Sari, Budi (from the Kantor) and Maya');
  assert.equal(klien.jumlah(), 3);

  // A conflict that keeps happening is reported, not retried forever.
  rt.sebelumSimpanParty = () => { rt.party.get(ID_PARTY_BAWAAN).version += 1; };
  const err = await klien.keluarkan(budi.instance_id).catch((e) => e);
  assert.equal(err.kode, 'VERSI_BENTROK');
});

test('an agent hired elsewhere (409 SUDAH_DIREKRUT) is simply put in the party', async () => {
  const { rt, klien } = siapkan({ masuk: 'usr-tab' });
  await klien.muat();
  rt.rekrutLangsung('sari'); // another tab hired Sari after this page loaded
  const hasil = await klien.rekrut('sari');
  assert.equal(hasil.jumlah, 1);
  assert.equal(klien.diParty('sari'), true);
});

test('taking an agent out keeps it hired and frees the slot', async () => {
  const { klien } = siapkan({ masuk: 'usr-keluar' });
  await klien.muat();
  const { agen } = await klien.rekrut('sari');
  await klien.keluarkan(agen.instance_id);
  assert.equal(klien.jumlah(), 0);
  assert.ok(klien.agenDariSpesies('sari'), 'still in the Markas roster');
});

test('the preview cache holds allowlisted fields only and stays clean per findSecrets', async () => {
  const { rt, simpan, klien } = siapkan({ masuk: 'usr-cache' });
  // A misbehaving runtime sends a raw key inside the loadout. It must never reach localStorage.
  const sari = rt.rekrutLangsung('sari');
  sari.loadout.brain.api_key = kunciPalsu();
  sari.loadout.brain.vault_ref = 'vault://usr-cache/kunci01';
  rt.party.set(ID_PARTY_BAWAAN, { party: { schema: 'galantara.party/v2', id: ID_PARTY_BAWAAN, owner_id: 'usr-cache', slots: [sari.instance_id, null, null, null] }, version: 1 });
  await klien.muat();
  const teks = simpan.getItem(KUNCI_CACHE);
  assert.ok(teks, 'a preview is written');
  const isi = JSON.parse(teks);
  assert.deepEqual(findSecrets(isi), []);
  assert.ok(!teks.includes('loadout') && !teks.includes('vault://'), 'no loadout, no vault reference');
  assert.deepEqual(isi.agen, [{ instance_id: sari.instance_id, template: { id: 'sari' } }]);

  // A nickname that looks like a key blocks the write and removes the old copy.
  sari.julukan = kunciPalsu();
  await klien.muat();
  assert.equal(simpan.getItem(KUNCI_CACHE), null);
});

test('a tampered or key-bearing cache is dropped, a clean one becomes the preview', async () => {
  const bersih = { v: 1, pemain: 'usr-x', party: { schema: 'galantara.party/v2', id: ID_PARTY_BAWAAN, owner_id: 'usr-x', slots: ['ag_abc123', null, null, null] }, agen: [{ instance_id: 'ag_abc123', template: { id: 'sari' } }] };
  let simpan = penyimpananPalsu({ [KUNCI_CACHE]: JSON.stringify(bersih) });
  let klien = new PartyKlien({ api: buatApiRuntime({ fetch: buatRuntimePalsu().fetch }), penyimpanan: simpan });
  assert.deepEqual(klien.muatCache(), bersih);

  const kotor = { ...bersih, agen: [{ instance_id: 'ag_abc123', template: { id: 'sari' }, julukan: kunciPalsu() }] };
  simpan = penyimpananPalsu({ [KUNCI_CACHE]: JSON.stringify(kotor) });
  klien = new PartyKlien({ api: buatApiRuntime({ fetch: buatRuntimePalsu().fetch }), penyimpanan: simpan });
  assert.equal(klien.muatCache(), null);
  assert.equal(simpan.getItem(KUNCI_CACHE), null);

  simpan = penyimpananPalsu({ [KUNCI_CACHE]: '{bukan json' });
  klien = new PartyKlien({ api: buatApiRuntime({ fetch: buatRuntimePalsu().fetch }), penyimpanan: simpan });
  assert.equal(klien.muatCache(), null);
});

test('guest ids are normalised to what the contract accepts', () => {
  assert.equal(normalisasiPemilik('guest:5F0C1A2B-0000-4000-8000-00000000ABCD'), 'guest-5f0c1a2b-0000-4000-8000-00000000abcd');
  assert.equal(normalisasiPemilik('usr-fahmi'), 'usr-fahmi');
  assert.equal(normalisasiPemilik(''), null);
  assert.equal(normalisasiPemilik('::'), null);
});

test('dev sign-in reports plainly when the server has it switched off', async () => {
  const { klien } = siapkan({ devLogin: false });
  const err = await klien.masukDev('guest:abc-123').catch((e) => e);
  assert.equal(err.kode, 'MASUK_BELUM_ADA');
  const nyala = siapkan();
  await nyala.klien.masukDev('guest:abc-123');
  assert.equal(nyala.klien.masuk, true);
  assert.equal(nyala.klien.pemain, 'guest-abc-123');
});

test('every brain carries an honest label', () => {
  assert.deepEqual(labelOtak({ provider: 'migancore', model: 'qwen3:4b-instruct-2507' }), { teks: 'Milik sendiri', jenis: 'sendiri' });
  assert.deepEqual(labelOtak({ provider: 'openrouter', model: 'x' }), { teks: 'Cloud pihak lain', jenis: 'cloud' });
  assert.deepEqual(labelOtak({ provider: 'simulasi', model: 'x' }), { teks: 'SIMULASI', jenis: 'simulasi' });
  assert.deepEqual(labelOtak(null), { teks: 'Belum ada otak', jenis: 'kosong' });
});
