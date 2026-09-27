// ═══════════════════════════════════════════════════════
// tests/duniaParty.test.mjs — the whole M1 loop through the glue, in Node.
//
// Fake runtime (tests/bantu/runtimePalsu.mjs), fake clock, a stand-in game (NPCs record the
// commands they get) and a stand-in sheet (records the view trees; the test presses their
// buttons). Guarded: guest → "Masuk dulu" → recruit → Markas 1/4 → mission → the agent walks
// to the Markas desk → result ready → the agent comes to report → approve → scroll hook.
// Plus the pure helpers: screen arrow, tap hit test, plaque contents.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DuniaParty, STATUS_DARI_MISI, teksAntrean } from '../src/party/DuniaParty.js';
import { MisiKlien } from '../src/party/MisiKlien.js';
import { buatApiRuntime } from '../src/party/apiRuntime.js';
import { pasangKaitDunia, lepasKaitDunia, TITIK_KERJA_CADANGAN } from '../src/party/kaitDunia.js';
import { sambungDunia3D } from '../src/party/sambungDunia3D.js';
import { cariTombol, teksPohon } from '../src/ui/gw/pohon.js';
import { arahLayar } from '../src/ui/ArahkanSaya.js';
import { pilihNpcDiLayar } from '../src/core/KontrolSentuh.js';
import { isiPenanda } from '../src/ui/PenandaAgen.js';
import { buatRuntimePalsu } from './bantu/runtimePalsu.mjs';
import { jamPalsu, dokumenPalsu, kuras } from './bantu/jamPalsu.mjs';

function siapkan() {
  const rt = buatRuntimePalsu();
  const perintah = [];
  const toast = [];
  const npc = (id) => ({ x: 0, z: 0, data: { id }, mesh: {}, perilaku: { keadaan: 'keliling' } });
  const game = {
    npcs: { get: npc, perintah: (id, p) => perintah.push([id, p.jenis, p.titik ?? null]), terlihat: true },
    avatar: { getPosition: () => ({ x: 0, z: 0 }) },
    toast: { show: (m) => toast.push(m) },
  };
  const api = buatApiRuntime({ fetch: rt.fetch });
  const dp = new DuniaParty(game, { api, penyimpanan: null, doc: { getElementById: () => null }, lokal: true });
  const jam = jamPalsu(1_000_000);
  dp.misi = new MisiKlien({ api, jam, dokumen: dokumenPalsu() });
  const sheet = {
    riwayat: [], terbuka: false, nama: null, pohon: null,
    buka(nama, pohon) { this.riwayat.push(nama); this.nama = nama; this.pohon = pohon; this.terbuka = true; },
    ganti(nama, pohon) { if (this.nama === nama) this.pohon = pohon; return true; },
    tutup() { this.terbuka = false; this.nama = null; },
    umumkan() {}, cari() { return null; },
  };
  dp.sheet = sheet;
  const tekan = async (label) => {
    const t = cariTombol(sheet.pohon, label);
    assert.ok(t, `button "${label}" in sheet "${sheet.nama}": ${teksPohon(sheet.pohon).slice(0, 200)}`);
    await t.props.on.click();
    await kuras();
  };
  return { rt, dp, game, perintah, toast, jam, sheet, tekan };
}

test('the M1 loop: guest → sign in → recruit → mission → work → result → approve', async (t) => {
  t.after(() => lepasKaitDunia());
  const gulungan = [];
  pasangKaitDunia({ tambahGulungan: (m) => gulungan.push(m.id) });
  const { rt, dp, perintah, toast, jam, sheet, tekan } = siapkan();
  await dp.muat();
  assert.equal(dp.party.masuk, false);

  // Dialog "Ayo, gabung party-ku!" as a guest → "Masuk dulu" → dev sign-in → back to Rekrut.
  dp.aksiDialog('rekrut', { id: 'sari' });
  assert.equal(sheet.nama, 'masuk');
  await tekan('Masuk (mode pengembang)');
  assert.equal(dp.party.masuk, true);
  assert.equal(sheet.nama, 'rekrut');
  assert.match(teksPohon(sheet.pohon), /Party 0\/4 → 1\/4/);

  await tekan('Rekrut Sari');
  assert.equal(sheet.nama, 'markas');
  assert.match(teksPohon(sheet.pohon), /Markas · Party 1\/4/);
  assert.match(toast.at(-1), /Sari gabung party \(1\/4\)/);
  assert.equal(dp.syarat('bisa_misi', { id: 'sari' }), true);
  assert.equal(dp.syarat('bisa_misi', { id: 'budi' }), false, 'Budi has no mission skill in M1');

  // Beri misi → Sari walks to the Markas work spot and the world starts watching.
  await tekan('Beri misi');
  assert.equal(sheet.nama, 'misi');
  const iid = dp.party.agenDariSpesies('sari').agen.instance_id;
  await dp.kirimMisi(iid, { pertanyaan: 'harga cabai rawit di Bogor minggu ini', sumber: [] });
  assert.equal(sheet.terbuka, false);
  assert.deepEqual(perintah.at(-1), ['sari', 'menuju', [{ ...TITIK_KERJA_CADANGAN }]]);
  assert.equal(dp.misi.jumlahDipantau, 1);
  await kuras(); // the first look (status antre) lands before the runtime moves on

  const [misiId] = [...rt.misi.keys()];
  rt.misi.get(misiId).status = 'berjalan';
  await jam.maju(3000);
  assert.equal(dp.party.agenDariId(iid).status_kerja, 'bekerja');

  rt.misi.get(misiId).status = 'selesai';
  rt.misi.get(misiId).laporan = { schema: 'galantara.laporan-misi/v1', ringkasan: [{ kalimat: 'Harga naik.', rujukan: ['T1'] }], temuan: [{ id: 'T1', sumber: 'S1' }], sumber: [{ id: 'S1', url: 'https://contoh.go.id/a', judul: 'Harga' }] };
  await jam.maju(3000);
  assert.equal(dp.party.agenDariId(iid).status_kerja, 'hasil_siap');
  assert.deepEqual(perintah.at(-1).slice(0, 2), ['sari', 'lapor'], 'without a 3D Markas, Sari comes to report');
  assert.deepEqual(gulungan, [misiId], 'a finished result gets its scroll right away');
  assert.match(toast.at(-1), /Hasil Sari siap/);

  await dp.bukaHasil(iid);
  assert.equal(sheet.nama, 'hasil');
  assert.match(teksPohon(sheet.pohon), /Harga naik\. \[1\]/);
  await tekan('Setujui & simpan');
  assert.equal(rt.misi.get(misiId).putusan, 'setujui');
  assert.deepEqual([...new Set(gulungan)], [misiId], 'approving resends the same scroll (idempotent in 3D)');
  assert.equal(dp.party.agenDariId(iid).status_kerja, 'siap');
  assert.match(toast.at(-1), /Gulungannya ada di Papan Hasil/);
});

test('a pasted key in the mission form becomes a card with buttons, and the text is dropped', async () => {
  const { dp, sheet } = siapkan();
  await dp.muat();
  await dp.party.masukDev('usr-kunci');
  await dp.party.rekrut('sari');
  const iid = dp.party.agenDariSpesies('sari').agen.instance_id;
  const kunci = ['sk', 'or', 'v1', 'b'.repeat(40)].join('-');
  await dp.kirimMisi(iid, { pertanyaan: `cek ${kunci}`, sumber: [] });
  assert.equal(sheet.nama, 'misi');
  const teks = teksPohon(sheet.pohon);
  assert.match(teks, /menempelkan kunci API/);
  assert.ok(cariTombol(sheet.pohon, 'Hapus teks') && cariTombol(sheet.pohon, 'Buka Kantor ↗'));
  assert.ok(!teks.includes(kunci), 'the key is not put back into the form');
});

test('missions not live on this runtime yet: an honest card, the agent stays in the party', async () => {
  const { rt, dp, sheet } = siapkan();
  rt.misiAda = false;
  await dp.muat();
  await dp.party.masukDev('usr-belum');
  await dp.party.rekrut('sari');
  const iid = dp.party.agenDariSpesies('sari').agen.instance_id;
  await dp.kirimMisi(iid, { pertanyaan: 'harga cabai', sumber: [] });
  assert.match(teksPohon(sheet.pohon), /Misi belum aktif di server ini/);
  assert.equal(dp.party.diParty('sari'), true);
});

test('mission status maps onto the one agent state machine', () => {
  assert.deepEqual(STATUS_DARI_MISI, {
    antre: 'antre', berjalan: 'bekerja', menunggu_otak: 'menunggu_otak', selesai: 'hasil_siap',
    selesai_tanpa_temuan: 'hasil_siap', gagal: 'gagal', dibatalkan: 'siap',
  });
});

test('screen arrow follows the camera; tap hit test; plaque contents', () => {
  // Camera at theta 0 looks toward -z: a target at -z is straight up, +x is to the right.
  assert.deepEqual(arahLayar({ x: 0, z: 0 }, { x: 0, z: -10 }, 0), { jarak: 10, sudut: 0 });
  assert.equal(Math.round(arahLayar({ x: 0, z: 0 }, { x: 5, z: 0 }, 0).sudut), 90);
  assert.equal(Math.round(arahLayar({ x: 0, z: 0 }, { x: 0, z: 5 }, 0).sudut), 180);
  // Orbit a quarter turn (camera now east of the player, looking west): ▶ walks toward -z,
  // so a target at -z is on the right.
  assert.equal(Math.round(arahLayar({ x: 0, z: 0 }, { x: 0, z: -10 }, Math.PI / 2).sudut), 90);

  const kandidat = [
    { id: 'sari', kaki: { x: 100, y: 400 }, kepala: { x: 100, y: 340 } },
    { id: 'budi', kaki: { x: 150, y: 400 }, kepala: { x: 150, y: 340 } },
  ];
  assert.equal(pilihNpcDiLayar({ x: 104, y: 370 }, kandidat), 'sari');
  assert.equal(pilihNpcDiLayar({ x: 140, y: 330 }, kandidat), 'budi');
  assert.equal(pilihNpcDiLayar({ x: 300, y: 370 }, kandidat), null);
  assert.equal(pilihNpcDiLayar({ x: 100, y: 200 }, kandidat), null, 'far above the head is not a hit');

  const bebas = isiPenanda({ nama: 'Sari', bisaDirekrut: true, diParty: false, status: null });
  assert.deepEqual(bebas.plakat.isi.map((s) => s.teks), ['✦', 'Sari', 'AI']);
  assert.equal(bebas.penanda.isi[1].teks, 'Bisa direkrut');
  const kerja = isiPenanda({ nama: 'Sari', bisaDirekrut: false, diParty: true, status: 'bekerja', durasi: '1 mnt' });
  assert.deepEqual(kerja.plakat.isi.map((s) => s.teks), ['Sari', 'AI', 'Sudah di party-mu']);
  assert.equal(kerja.penanda.isi[1].teks, 'Sari bekerja · 1 mnt');
  assert.equal(isiPenanda({ nama: 'Sari', bisaDirekrut: false, diParty: true, status: 'siap' }).penanda, null, 'a calm world: no marker when ready');
});

test('with C\'s Markas wired in: each status walks Sari to the place 3D gives, pose and scroll follow', async (t) => {
  t.after(() => lepasKaitDunia());
  const { rt, dp, game, perintah, toast, jam } = siapkan();
  const pose = [];
  game.npcs.setelPose = (id, p) => pose.push([id, p]);
  const panggil = [];
  const TEMPAT = {
    antre: { x: 7, y: 0.2, z: -9, arah: 1 },
    bekerja: { x: 7, y: 0.2, z: -9, arah: 1 },
    hasil_siap: { x: 4, y: 0.2, z: -8, arah: 0 },
    gagal: { x: 9, y: 0.62, z: -7, arah: 0, duduk: true, dekat: { x: 9, y: 0.2, z: -6.5 } },
  };
  let terlihat = null;
  // C-shaped module (src/world/markas/index.js): the status call hands out the place and pose.
  sambungDunia3D({
    markas: {
      tampilkanStatus: (id, st, opsi) => { panggil.push([id, st, Boolean(opsi.mesh)]); return { status: st, pose: `pose-${st}`, titik: TEMPAT[st] ?? null }; },
      terlihatStatus: () => terlihat,
      tambahGulungan: (m) => panggil.push(['gulungan', m.id]),
      tandaiGulunganDibaca: (m) => panggil.push(['dibaca', m.id]),
    },
    meshDari: (id) => game.npcs.get(id).mesh,
  });
  await dp.muat();
  await dp.party.masukDev('usr-meja');
  await dp.party.rekrut('sari');
  const iid = dp.party.agenDariSpesies('sari').agen.instance_id;
  await dp.kirimMisi(iid, { pertanyaan: 'harga cabai', sumber: [] });
  assert.deepEqual(panggil[0], ['sari', 'antre', true], 'status reaches 3D BEFORE the walk, with the mesh the first time');
  assert.deepEqual(perintah.at(-1), ['sari', 'menuju', [{ x: 7, y: 0.2, z: -9, arah: 1 }]], 'the desk C assigned, not the fallback');
  assert.deepEqual(pose.at(-1), ['sari', 'pose-antre']);
  await kuras();

  const [misiId] = [...rt.misi.keys()];
  rt.misi.get(misiId).status = 'selesai';
  rt.misi.get(misiId).laporan = { schema: 'galantara.laporan-misi/v1', ringkasan: [], temuan: [], sumber: [] };
  terlihat = 'panah'; // the edge arrow already says it
  const nToast = toast.length;
  await jam.maju(3000);
  assert.deepEqual(perintah.at(-1), ['sari', 'menuju', [{ x: 4, y: 0.2, z: -8, arah: 0 }]], 'to the Papan Hasil, not to the player');
  assert.ok(panggil.some((p) => p[0] === 'gulungan' && p[1] === misiId), 'finished → scroll');
  assert.equal(toast.length, nToast, 'no toast while the world already shows the status');
  assert.ok(panggil.filter((p) => p[0] === 'sari').every((p, i) => i === 0 || p[2] === false), 'mesh sent once');
  await dp.bukaHasil(iid);
  assert.ok(panggil.some((p) => p[0] === 'dibaca' && p[1] === misiId), 'opened → scroll turns to paper');

  // A seat is approached through its free point first.
  dp._gerakkan('sari', 'gagal', dp._status3D('sari', 'gagal'));
  assert.deepEqual(perintah.at(-1), ['sari', 'menuju', [{ x: 9, y: 0.2, z: -6.5 }, { x: 9, y: 0.62, z: -7, arah: 0 }]]);
});

test('an agent leaving the party frees its desk in the Markas', async (t) => {
  t.after(() => lepasKaitDunia());
  const { dp, perintah } = siapkan();
  const lepas = [];
  pasangKaitDunia({ lepasAgen: (id) => lepas.push(id) });
  await dp.muat();
  await dp.party.masukDev('usr-keluar');
  await dp.party.rekrut('sari');
  await dp.keluarkan(dp.party.agenDariSpesies('sari').agen.instance_id);
  assert.deepEqual(lepas, ['sari']);
  assert.deepEqual(perintah.at(-1).slice(0, 2), ['sari', 'keliling']);
});

test('one status, one channel: B\'s text marker yields while the 3D icon shows the status', async (t) => {
  t.after(() => lepasKaitDunia());
  const { dp } = siapkan();
  await dp.muat();
  await dp.party.masukDev('usr-ikon');
  await dp.party.rekrut('sari');
  dp.party.setelStatus(dp.party.agenDariSpesies('sari').agen.instance_id, 'bekerja');
  const sari = () => dp._daftarPenanda().find((a) => a.id === 'sari');
  assert.equal(sari().status, 'bekerja', 'no 3D icon: B shows it');
  pasangKaitDunia({ terlihatStatus: (id) => (id === 'sari' ? 'ikon' : null) });
  assert.equal(sari().status, null);
  assert.equal(sari().diParty, true, 'the plaque (name + AI) stays');
});

test('queue line: position, and an honest "belum terukur" until the runtime has measured one', () => {
  assert.equal(teksAntrean({ posisi: 2, eta_detik: null }), 'Antrean ke-2 · perkiraan belum terukur');
  assert.equal(teksAntrean({ posisi: 1, eta_detik: 95 }), 'Antrean ke-1 · ± 2 mnt');
  assert.equal(teksAntrean({ posisi: 1, eta_detik: 5 }), 'Antrean ke-1 · ± 1 mnt');
  assert.equal(teksAntrean({ status: 'antre' }), null, 'no position from the runtime: nothing made up');
});

test('the name plaque climbs over the 3D status icon and follows the floor the agent stands on', async () => {
  const { PenandaAgen, TINGGI_PLAKAT_DI_ATAS_IKON } = await import('../src/ui/PenandaAgen.js');
  const ucap = new Map();
  const bubble = { ucap: (k, _t, pos) => ucap.set(k, pos), buang() {}, ada: (k) => ucap.has(k) };
  let ikon = false;
  const npcs = { terlihat: true, get: () => ({ x: 1, z: 2, perilaku: { y: 0.2 } }) };
  const p = new PenandaAgen({ bubble, npcs, adaIkon: () => ikon, daftar: () => [{ id: 'sari', nama: 'Sari', bisaDirekrut: false, diParty: true, status: null }] });
  p.perbarui();
  const pos = ucap.get('plakat:sari');
  const rendah = pos().y;
  ikon = true;
  assert.ok(Math.abs(pos().y - (TINGGI_PLAKAT_DI_ATAS_IKON + 0.2)) < 1e-9, 'above the icon, on the terrace');
  assert.ok(pos().y > rendah);
});
