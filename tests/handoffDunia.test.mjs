// tests/handoffDunia.test.mjs — world ↔ Kantor handoff both ways (SPRINT-02 B7, D-12, D2-5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DuniaParty } from '../src/party/DuniaParty.js';
import { buatApiRuntime } from '../src/party/apiRuntime.js';
import { ambilKodeHandoff, urlKantorDenganKode } from '../src/core/kodeHandoff.js';
import { buatRuntimePalsu, KODE_PALSU } from './bantu/runtimePalsu.mjs';

const riwayat = () => ({ state: null, panggil: [], replaceState(s, j, u) { this.panggil.push(u); } });

function siapkan({ m2 = true, kodeMasuk = null } = {}) {
  const rt = buatRuntimePalsu({ m2 });
  const toast = [];
  const dibuka = [];
  const game = { npcs: null, avatar: { getPosition: () => ({ x: 0, z: 0 }) }, toast: { show: (m) => toast.push(m) } };
  const tab = { opener: 'dunia', location: { url: null, replace(u) { this.url = u; } } };
  const dp = new DuniaParty(game, {
    api: buatApiRuntime({ fetch: rt.fetch }), penyimpanan: null, doc: { getElementById: () => null }, lokal: true, kodeMasuk,
    buka: (url, target, fitur) => { dibuka.push([url, target, fitur]); return url === 'about:blank' ? tab : {}; },
  });
  dp.sheet = { buka() {}, ganti() {}, tutup() {}, umumkan() {}, cari() { return null; } };
  return { rt, dp, toast, dibuka, tab };
}

test('arrival: the code leaves the URL first; only a well-formed single code is returned', () => {
  const r = riwayat();
  const kode = KODE_PALSU(1);
  assert.deepEqual(ambilKodeHandoff({ href: `http://localhost:4000/?mighan=${kode}&spot=kuta` }, r), { kode, ada: true });
  assert.deepEqual(r.panggil, ['/?spot=kuta']);
  const r2 = riwayat();
  assert.deepEqual(ambilKodeHandoff({ href: 'http://localhost:4000/?mighan=<script>' }, r2), { kode: null, ada: true });
  assert.equal(r2.panggil.length, 1, 'a malformed value is stripped too');
  const r3 = riwayat();
  assert.equal(ambilKodeHandoff({ href: `http://x/?mighan=${kode}&mighan=${kode}` }, r3).kode, null, 'two codes: neither');
  assert.deepEqual(ambilKodeHandoff({ href: 'http://x/' }, riwayat()), { kode: null, ada: false });
});

test('arrival: redeemed once via tukar-dunia → signed in with the party; a replay is refused honestly', async () => {
  const k = siapkan({ kodeMasuk: KODE_PALSU(3) });
  k.rt.kodeDunia.set(KODE_PALSU(3), 'usr-kantor');
  await k.dp.muat();
  const tukar = k.rt.tulisan().filter((p) => p.jalur === '/rt/api/handoff/tukar-dunia');
  assert.deepEqual(tukar.map((p) => p.isi), [{ kode: KODE_PALSU(3) }]);
  assert.equal(k.dp.party.masuk, true);
  assert.equal(k.dp.party.pemain, 'usr-kantor');
  assert.match(k.toast[0], /Tersambung dari Kantor/);
  await k.dp.muat();
  assert.equal(k.rt.tulisan().filter((p) => p.jalur === '/rt/api/handoff/tukar-dunia').length, 1, 'never redeemed twice');

  const k2 = siapkan({ kodeMasuk: KODE_PALSU(4) }); // unknown / used code
  await k2.dp.muat();
  assert.match(k2.toast[0], /sudah tidak berlaku \(sekali pakai, 60 detik\)/);
  assert.equal(k2.dp.party.masuk, false);
});

test('arrival on a runtime without the route: "segera hadir", the world still loads', async () => {
  const k = siapkan({ m2: false, kodeMasuk: KODE_PALSU(5) });
  await k.dp.muat();
  assert.match(k.toast[0], /segera hadir/);
  assert.equal(k.dp.party.termuat, true);
});

test('Buka Kantor: tab opened in the click, code issued then, lands on /dashboard/kantor?mighan=', async () => {
  const k = siapkan();
  await k.dp.muat();
  await k.dp.party.masukDev('usr-ke-kantor');
  assert.equal(k.rt.kodeTerbit.length, 0, 'nothing issued before the click');
  const hasil = await k.dp.bukaKantor();
  assert.equal(hasil.denganKode, true);
  assert.equal(k.dibuka[0][0], 'about:blank');
  assert.equal(k.tab.opener, null);
  const u = new URL(k.tab.location.url);
  assert.equal(u.pathname, '/dashboard/kantor');
  assert.equal(u.searchParams.get('mighan'), k.rt.kodeTerbit[0].kode);
  assert.equal(k.rt.kodeTerbit[0].party_id, 'party-utama');
});

test('Buka Kantor without the route or without a session: the Kantor opens without a code', async () => {
  const k = siapkan({ m2: false });
  await k.dp.muat();
  await k.dp.party.masukDev('usr-lama');
  assert.deepEqual(await k.dp.bukaKantor(), { denganKode: false });
  assert.doesNotMatch(k.tab.location.url, /mighan=/);
  assert.match(k.toast.at(-1), /segera hadir/);
  const tamu = siapkan();
  await tamu.dp.muat();
  await tamu.dp.bukaKantor();
  assert.deepEqual(tamu.dibuka[0].slice(1), ['_blank', 'noopener']);
  assert.equal(urlKantorDenganKode('javascript:alert(1)', KODE_PALSU(1)), null);
});
