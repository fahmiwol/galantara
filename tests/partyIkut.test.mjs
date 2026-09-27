// ═══════════════════════════════════════════════════════
// tests/partyIkut.test.mjs — the party walks behind the player (SPRINT-02 stream B item 4).
//
// Companion k stands where the owner was k·0.35 s of walking ago (Game report §6b), from a ~2 s
// trail. Standing still keeps the line; a jump restarts it; agents on a mission stay in the Markas.
// No wall clock: every test moves time by hand.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JejakPemilik, JEDA_PENDAMPING, JARAK_LOMPAT } from '../src/party/JejakPemilik.js';
import { PerilakuNpc, KECEPATAN_IKUT_MAKS, JARAK_LONCAT_IKUT } from '../src/entities/PerilakuNpc.js';
import { NPCManager } from '../src/entities/NPC.js';
import { DuniaParty } from '../src/party/DuniaParty.js';
import { MisiKlien } from '../src/party/MisiKlien.js';
import { buatApiRuntime } from '../src/party/apiRuntime.js';
import { buatRuntimePalsu } from './bantu/runtimePalsu.mjs';
import { jamPalsu, dokumenPalsu } from './bantu/jamPalsu.mjs';

const DT = 1 / 60;
const dekat = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

/** Walk the owner along +x at `v` m/s for `detik`, recording every frame. */
function jalan(j, pos, v, detik, dt = DT) {
  for (let t = 0; t < detik - 1e-9; t += dt) {
    pos.x += v * dt;
    j.catat(pos, dt, Math.PI / 2);
  }
}

test('companion k is where the owner was k·0.35 s of walking ago', () => {
  const j = new JejakPemilik();
  const pos = { x: 0, z: 0 };
  assert.equal(j.catat(pos, DT, Math.PI / 2), 'baru');
  jalan(j, pos, 5.4, 2);
  for (const k of [1, 2, 3, 4]) {
    const p = j.titikPendamping(k);
    assert.ok(dekat(p.x, pos.x - 5.4 * k * JEDA_PENDAMPING, 1e-6), `k=${k}: ${p.x} vs ${pos.x - 5.4 * k * JEDA_PENDAMPING}`);
    assert.ok(dekat(p.z, 0));
  }
  // The trail is bounded (~2 s), not the whole walk.
  assert.ok(j.titik.length <= Math.ceil(2 / DT) + 3, `${j.titik.length} samples`);
});

test('standing still keeps the line: the party does not collapse onto the player', () => {
  const j = new JejakPemilik();
  const pos = { x: 0, z: 0 };
  j.catat(pos, DT);
  jalan(j, pos, 3, 1.5);
  const sebelum = [1, 2, 3].map((k) => j.titikPendamping(k));
  for (let i = 0; i < 600; i++) assert.equal(j.catat(pos, DT), 'diam'); // 10 s without moving
  assert.deepEqual([1, 2, 3].map((k) => j.titikPendamping(k)), sebelum);
  assert.ok(pos.x - sebelum[0].x > 1, 'companion 1 is still a step behind');
});

test('a fresh trail starts straight behind the owner, one step apart', () => {
  const j = new JejakPemilik();
  j.catat({ x: 10, z: 0 }, DT, 0); // facing +z
  const p1 = j.titikPendamping(1), p2 = j.titikPendamping(2);
  assert.ok(dekat(p1.x, 10) && p1.z < -1 && p1.z > -1.5, JSON.stringify(p1));
  assert.ok(dekat(p2.z, 2 * p1.z, 1e-9), 'evenly spaced');
});

test('a jump (warp, respawn) restarts the trail behind the new spot', () => {
  const j = new JejakPemilik();
  const pos = { x: 0, z: 0 };
  j.catat(pos, DT);
  jalan(j, pos, 5, 1);
  assert.equal(j.catat({ x: pos.x + JARAK_LOMPAT + 0.5, z: 40 }, DT, 0), 'lompat');
  const p = j.titikPendamping(1);
  assert.ok(Math.hypot(p.x - (pos.x + JARAK_LOMPAT + 0.5), p.z - 40) < 1.5, `companion target near the new spot: ${JSON.stringify(p)}`);
});

test('a following NPC catches up (faster than the player, capped) and faces the player when there', () => {
  const b = new PerilakuNpc({ x: 0, z: 0, rng: () => 0.5 });
  b.perintah({ jenis: 'ikut' });
  b.titikIkut = { x: 10, z: 0 };
  b.perbarui(0.1, { posisiPemain: { x: 12, z: 0 } });
  assert.ok(dekat(b.x, KECEPATAN_IKUT_MAKS * 0.1, 1e-9), `capped at ${KECEPATAN_IKUT_MAKS} m/s: moved ${b.x}`);
  for (let i = 0; i < 120; i++) b.perbarui(DT, { posisiPemain: { x: 12, z: 0 } });
  assert.ok(Math.abs(b.x - 10) < 0.02, `arrived: ${b.x}`);
  assert.equal(b.bergerak, false);
  assert.ok(dekat(b.arah, Math.PI / 2, 1e-6), 'faces the player once in place');
  // Far away (back from another Spot): appears at its spot instead of running across the map.
  b.titikIkut = { x: 10 + JARAK_LONCAT_IKUT + 5, z: 3 };
  b.perbarui(DT, {});
  assert.deepEqual([b.x, b.z], [10 + JARAK_LONCAT_IKUT + 5, 3]);
  // An open dialog still freezes it.
  b.titikIkut = { x: 0, z: 0 };
  b.perbarui(1, { dialogTerbuka: true, posisiPemain: { x: 0, z: 0 } });
  assert.equal(b.x, 10 + JARAK_LONCAT_IKUT + 5);
});

test('a companion is not offered as "the NPC near you" (it always is); others still are', () => {
  globalThis.THREE ??= undefined;
  const m = Object.create(NPCManager.prototype);
  m._terlihat = true;
  const npc = (id, x, keadaan) => ({ data: { id }, x, z: 0, perilaku: { keadaan } });
  m.npcs = [npc('sari', 0.5, 'ikut'), npc('budi', 1.5, 'keliling')];
  assert.equal(m.checkProximity({ x: 0, z: 0 })?.id, 'budi');
  m.npcs[1].perilaku.keadaan = 'ikut';
  assert.equal(m.checkProximity({ x: 0, z: 0 }), null);
});

function siapkan() {
  const rt = buatRuntimePalsu({ m2: true });
  const npcs = new Map();
  const perintah = [];
  const titik = new Map();
  const game = {
    npcs: {
      get: (id) => {
        if (!npcs.has(id)) npcs.set(id, { x: 0, z: 0, data: { id }, mesh: {}, perilaku: { keadaan: 'keliling' } });
        return npcs.get(id);
      },
      perintah: (id, p) => { perintah.push([id, p.jenis]); game.npcs.get(id).perilaku.keadaan = p.jenis === 'menuju' ? 'menuju' : p.jenis; },
      setelTitikIkut: (id, t) => titik.set(id, t),
      terlihat: true,
    },
    avatar: { pos: { x: 0, z: 0 }, _facing: Math.PI / 2, getPosition() { return this.pos; } },
    toast: { show() {} },
  };
  const api = buatApiRuntime({ fetch: rt.fetch });
  const dp = new DuniaParty(game, { api, penyimpanan: null, doc: { getElementById: () => null }, lokal: true });
  dp.misi = new MisiKlien({ api, jam: jamPalsu(0), dokumen: dokumenPalsu() });
  dp.sheet = { buka() {}, ganti() {}, tutup() {}, umumkan() {}, cari() { return null; }, terbuka: false };
  return { rt, dp, game, perintah, titik, npcs };
}

test('party members follow in slot order; one sent on a mission leaves the line and the next moves up', async () => {
  const k = siapkan();
  await k.dp.muat();
  await k.dp.party.masukDev('usr-ikut');
  await k.dp.party.rekrut('sari');
  await k.dp.party.rekrut('budi');
  await k.dp.party.rekrut('maya');
  // Walk 2 s to the east.
  for (let i = 0; i < 120; i++) {
    k.game.avatar.pos.x += 5.4 * DT;
    k.dp.perbarui(DT);
  }
  assert.deepEqual(k.dp.pengikut, ['sari', 'budi', 'maya']);
  const x = k.game.avatar.pos.x;
  assert.ok(dekat(k.titik.get('sari').x, x - 5.4 * 0.35, 1e-6), `sari: ${k.titik.get('sari').x}`);
  assert.ok(dekat(k.titik.get('maya').x, x - 5.4 * 1.05, 1e-6), `maya: ${k.titik.get('maya').x}`);

  // Budi goes to work: he leaves the line (he walks to the Markas), Maya becomes companion 2.
  const budi = k.dp.party.agenDariSpesies('budi').agen.instance_id;
  await k.dp.kirimMisi(budi, { tujuan: 'rencana' });
  assert.equal(k.npcs.get('budi').perilaku.keadaan, 'menuju');
  k.dp._jedaIkut = 0;
  k.dp.perbarui(DT);
  assert.deepEqual(k.dp.pengikut, ['sari', 'maya']);
  assert.ok(dekat(k.titik.get('maya').x, k.dp.jejak.titikPendamping(2).x), 'Maya takes the second place');
  assert.equal(k.titik.get('budi'), null, 'Budi has no trail spot while on a mission');
});

test('guests and agents outside the party never follow; leaving the party = strolling from there', async () => {
  const k = siapkan();
  await k.dp.muat();
  k.dp.perbarui(1);
  assert.deepEqual(k.dp.pengikut, [], 'a guest has no party to follow');
  await k.dp.party.masukDev('usr-ikut2');
  await k.dp.party.rekrut('sari');
  k.dp._jedaIkut = 0;
  k.dp.perbarui(DT);
  assert.deepEqual(k.dp.pengikut, ['sari']);
  await k.dp.party.keluarkan(k.dp.party.agenDariSpesies('sari').agen.instance_id);
  k.dp._jedaIkut = 0;
  k.dp.perbarui(DT);
  assert.deepEqual(k.dp.pengikut, []);
  assert.equal(k.npcs.get('sari').perilaku.keadaan, 'keliling');
  assert.deepEqual(k.perintah.at(-1), ['sari', 'keliling']);
});

test('an agent whose status says "on a mission" never follows, even if it happens to be strolling', async () => {
  const k = siapkan();
  await k.dp.muat();
  await k.dp.party.masukDev('usr-ikut3');
  await k.dp.party.rekrut('sari');
  const sari = k.dp.party.agenDariSpesies('sari').agen.instance_id;
  // e.g. reloaded mid-mission on a world without the 3D Markas: the NPC strolls, the runtime says bekerja.
  k.dp.party.setelStatus(sari, 'bekerja');
  k.game.npcs.get('sari').perilaku.keadaan = 'keliling';
  k.dp._jedaIkut = 0;
  k.dp.perbarui(DT);
  assert.deepEqual(k.dp.pengikut, []);
  assert.equal(k.npcs.get('sari').perilaku.keadaan, 'keliling');
});
