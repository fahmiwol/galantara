// ═══════════════════════════════════════════════════════
// tests/serverParitas.test.mjs — aturan server = perilaku klien
//
// galantara-server/penjaga.cjs memegang SALINAN beberapa fakta klien: room
// yang ada, seberapa jauh pemain bisa berjalan di tiap Spot, titik muncul,
// kecepatan jalan, lompatan duduk terjauh, laju kirim posisi, dan panjang
// input. Server tidak bisa mengimpor src/ (paket deploy multiplayer hanya
// berisi galantara-server/), jadi kesamaannya dijaga di sini. Kalau klien
// berubah dan angka server tidak, pemain sah akan dijepit atau ditolak
// DIAM-DIAM — uji ini yang membuatnya bersuara.
// ═══════════════════════════════════════════════════════

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { ISLAND_R, OOLA_SOCKET_ROOM, SPOTS, socketRoomForSpot } from '../src/data/config.js';
import { KECEPATAN, UKURAN_KAPSUL, PARAM, calonMelingkar } from '../src/fisika/Karakter.js';
import { MejaNongkrong } from '../src/world/MejaNongkrong.js';
import { MOVE_THROTTLE_MS } from '../src/multiplayer/Socket.js';
import * as Bogor from '../src/world/spots/BogorSpotRuntime.js';
import * as Braga from '../src/world/spots/BragaSpotRuntime.js';
import * as Kuta from '../src/world/spots/KutaSpotRuntime.js';
import * as Losari from '../src/world/spots/LosariSpotRuntime.js';
import * as Malioboro from '../src/world/spots/MalioboroSpotRuntime.js';
import * as Monas from '../src/world/spots/MonasSpotRuntime.js';

const P = createRequire(import.meta.url)('../galantara-server/penjaga.cjs');
const baca = (jalur) => readFile(new URL(`../${jalur}`, import.meta.url), 'utf8');

/** Jarak pusat kapsul dari permukaan dalam dinding saat berhenti. */
const JARAK_DINDING = UKURAN_KAPSUL[0] / 2 + PARAM.offset;
/** Gerak cadangan (Avatar.update tanpa fisika) menjepit di sini, di SEMUA room. */
const JEPIT_CADANGAN = ISLAND_R - 1;
/** Pusat kapsul di sudut poligon cincin berpermukaan dalam `jari`. */
const sudutCincin = (jari, segmen = 32) => (jari - JARAK_DINDING) / Math.cos(Math.PI / segmen);
/** Pusat kapsul di sudut dalam persegi [x0,x1] × [z0,z1] yang berdinding di tepinya. */
const sudutPersegi = (x0, x1, z0, z1) => Math.max(...[x0 + JARAK_DINDING, x1 - JARAK_DINDING]
  .flatMap((x) => [z0 + JARAK_DINDING, z1 - JARAK_DINDING].map((z) => Math.hypot(x, z))));

/** Jangkauan terjauh yang sah per room, dari angka yang dipakai klien sendiri. */
function jangkauan() {
  const losari = Math.max(
    sudutPersegi(-Losari.ANJUNGAN_LEBAR / 2, Losari.ANJUNGAN_LEBAR / 2,
      Losari.BIBIR_Z + Losari.LIS_DALAM / 2, Losari.ANJUNGAN_DALAM / 2),
    sudutPersegi(Losari.DERMAGA_X - Losari.DERMAGA_LEBAR / 2, Losari.DERMAGA_X + Losari.DERMAGA_LEBAR / 2,
      Losari.BIBIR_Z - Losari.DERMAGA_PANJANG, Losari.BIBIR_Z),
  );
  const fisika = {
    oola: sudutCincin(ISLAND_R - 1 + UKURAN_KAPSUL[0] / 2),
    'spot:bogor': sudutCincin(Bogor.JARI_TEPI, Bogor.SEGMEN_TEPI),
    'spot:monas': sudutCincin(Monas.JARI_TEPI, Monas.SEGMEN_TEPI),
    'spot:braga': sudutPersegi(-Braga.TOTAL_LEBAR / 2, Braga.TOTAL_LEBAR / 2, -Braga.JALAN_PANJANG / 2, Braga.JALAN_PANJANG / 2),
    'spot:malioboro': sudutPersegi(-Malioboro.JALAN_LEBAR / 2, Malioboro.JALAN_LEBAR / 2,
      -Malioboro.JALAN_PANJANG / 2, Malioboro.JALAN_PANJANG / 2),
    'spot:kuta': sudutPersegi(-Kuta.PANTAI_LEBAR / 2, Kuta.PANTAI_LEBAR / 2, Kuta.BATAS_LAUT_Z, Kuta.PANTAI_DALAM / 2),
    'spot:losari': losari,
  };
  return Object.fromEntries(Object.entries(fisika).map(([room, d]) => [room, Math.max(d, JEPIT_CADANGAN)]));
}

test('paritas: room server = hub + semua Spot live di klien', () => {
  assert.equal(OOLA_SOCKET_ROOM, 'oola');
  const klien = [OOLA_SOCKET_ROOM, ...SPOTS.filter((s) => s.status === 'live').map((s) => socketRoomForSpot(s.id))];
  assert.deepEqual(Object.keys(P.RUANG).sort(), klien.sort());
  for (const room of klien) assert.equal(P.ruangDikenal(room), true, room);
  for (const bukan of ['spot:atlantis', '__proto__', 'constructor', 'toString', '', 42, null]) {
    assert.equal(P.ruangDikenal(bukan), false, String(bukan));
  }
});

test('paritas: batas dunia tiap room menampung jangkauan terjauh yang sah, dan tidak jauh lebih', () => {
  const j = jangkauan();
  assert.deepEqual(Object.keys(j).sort(), Object.keys(P.RUANG).sort(), 'setiap room punya perhitungan jangkauan');
  for (const [room, d] of Object.entries(j)) {
    const batas = P.RUANG[room].jari;
    assert.ok(batas >= d + 0.45, `${room}: batas ${batas} m terlalu dekat dengan jangkauan ${d.toFixed(2)} m`);
    assert.ok(batas <= d + 1.0, `${room}: batas ${batas} m jauh melebihi jangkauan ${d.toFixed(2)} m`);
  }
});

test('paritas: titik muncul server = semua teleport klien yang tidak lewat koneksi baru', async () => {
  const sumber = (await baca('src/core/Game.js')) + (await baca('src/entities/Avatar.js'));
  const titik = [...sumber.matchAll(/teleport\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.ok(titik.length >= 3, 'warp ke Spot, warp ke Oola, dan jatuh dari dunia');
  for (const [x, z] of titik) assert.deepEqual({ x, z }, { ...P.SPAWN });
  // pastikanBebas() mencari titik bebas sampai jariMaks dari titik muncul.
  const terjauh = Math.max(...calonMelingkar(P.SPAWN).map((c) => Math.hypot(c.x - P.SPAWN.x, c.z - P.SPAWN.z)));
  assert.ok(P.GERAK.radiusSpawn >= terjauh + 0.25, `radiusSpawn ${P.GERAK.radiusSpawn} < ${terjauh}`);
});

test('paritas: kecepatan dan jatah lompatan menampung gerak sah klien', () => {
  assert.ok(P.GERAK.kecepatanMaks >= KECEPATAN * 1.25, 'toleransi lag minimal 25 %');
  assert.ok(P.GERAK.kecepatanMaks <= KECEPATAN * 2, 'batas kecepatan tetap bermakna');
  let duduk = 0;
  let berdiri = 0;
  for (const gaya of ['warung', 'lesehan', 'bangku', 'kafe']) {
    for (let n = 2; n <= 8; n++) {
      const m = new MejaNongkrong({ id: 'u', x: 0, z: 0, kursi: n, gaya });
      duduk = Math.max(duduk, m.jariInteraksi + Math.max(...m.kursi.map((k) => Math.hypot(k.x, k.z))));
      for (const k of m.kursi) for (const e of k.keluar ?? []) berdiri = Math.max(berdiri, Math.hypot(e.x - k.x, e.z - k.z));
    }
  }
  assert.ok(duduk > 2 && berdiri > 0.5, 'geometri meja terbaca');
  assert.ok(P.GERAK.cadangan >= duduk + 1, `jatah ${P.GERAK.cadangan} m vs duduk terjauh ${duduk.toFixed(2)} m`);
  assert.ok(P.GERAK.cadangan >= berdiri + 1);
});

test('paritas: laju gerak server di atas laju kirim klien', () => {
  const klienPerDetik = 1000 / MOVE_THROTTLE_MS;
  assert.ok(P.LAJU.move.perDetik >= klienPerDetik * 1.5, 'isi ember gerak ≥ 1,5 × laju klien');
  assert.ok(P.GERAK.siarMinMs <= MOVE_THROTTLE_MS, 'klien sah tidak pernah digabung-buang');
});

test('paritas: batas teks server ≥ batas input klien, dan nama tamu buatan klien diterima apa adanya', async () => {
  const html = await baca('index.html');
  const maks = (id) => Number(html.match(new RegExp(`id="${id}"[^>]*maxlength="(\\d+)"`))?.[1]);
  assert.ok(maks('chat-input') > 0 && maks('p-name') > 0);
  assert.ok(P.BATAS_TEKS.pesan >= maks('chat-input'));
  assert.ok(P.BATAS_TEKS.nama >= maks('p-name'));

  const simpan = new Map();
  globalThis.localStorage = { getItem: (k) => simpan.get(k) ?? null, setItem: (k, v) => simpan.set(k, String(v)) };
  try {
    const { getOrCreateGuestName } = await import('../src/data/guestIdentity.js');
    for (let i = 0; i < 20; i++) {
      simpan.clear();
      const nama = getOrCreateGuestName();
      assert.equal(P.namaTamu(nama, () => 0), nama, nama);
    }
  } finally {
    delete globalThis.localStorage;
  }
});
