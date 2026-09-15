// ═══════════════════════════════════════════════════════
// tests/assetCollider.test.mjs — GLB dari manifest Spot punya collider
//
// Tiga rumah panggung Losari (assets/spots/losari/manifest.json) dulu bisa
// ditembus: AssetLibrary menaruh GLB tanpa collider, dan runtime Spot tidak
// tahu GLB itu ada. Collider sekarang dibaca dari berkas pendamping
// `<aset>.collider.json` (bentuk usulan kontrak extras.rupa3d.collider).
//
// Stub di sini memodelkan perilaku nyata (ADR-0012): `fetch` membaca berkas
// SUNGGUHAN dari repo dan menjawab 404 untuk yang tidak ada; loader GLB
// mengembalikan struktur { scene, parser.json } seperti GLTFLoader r128.
// Rapier dan THREE asli.
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
const modul = { exports: {} };
new Function('module', 'exports', sumber)(modul, modul.exports);
globalThis.THREE = modul.exports;

const { AssetLibrary } = await import('../src/world/AssetLibrary.js');
const { Fisika } = await import('../src/fisika/Fisika.js');
const { buatKarakter, langkahKarakter, kakiKarakter } = await import('../src/fisika/Karakter.js');

const muatRapier = () => import(new URL('../vendor/rapier3d-compat.0.20.0.js', import.meta.url).href).then((m) => m.default);
const AKAR = new URL('../', import.meta.url);

/** fetch yang membaca berkas repo sungguhan — 404 untuk yang tidak ada. */
globalThis.fetch = async (url) => {
  const berkas = new URL(String(url).replace(/^\//, ''), AKAR);
  if (!existsSync(berkas)) return { ok: false, status: 404, json: async () => { throw new Error('404'); } };
  const isi = readFileSync(berkas, 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(isi) };
};

/** Loader dengan bentuk hasil GLTFLoader; `tunda` menahan penyelesaiannya. */
function loaderUji({ tunda = null } = {}) {
  return {
    load(url, selesai) {
      const hasil = { scene: new THREE.Group(), parser: { json: { asset: { version: '2.0' } } } };
      if (tunda) tunda.then(() => selesai(hasil)); else selesai(hasil);
    },
  };
}

async function duniaLosari() {
  const f = new Fisika({ muatRapier });
  await f.muat();
  f.daftarkan('lantai', [{ bentuk: 'kotak', ukuran: [80, 1, 80] }], { x: 0, y: -0.5, z: 0 });
  return f;
}

const MANIFEST = 'assets/spots/losari/manifest.json';
const RUMAH = JSON.parse(readFileSync(new URL(MANIFEST, AKAR), 'utf8')).glbs;

test('manifest Losari: tiap rumah panggung didaftarkan dengan collider berkas pendampingnya', async () => {
  const f = await duniaLosari();
  const al = new AssetLibrary();
  al._loader = loaderUji();
  await al.applyManifest(new THREE.Group(), MANIFEST, { fisika: f, kelompok: 'spot' });
  const bagian = JSON.parse(readFileSync(new URL('assets/models/rumah_panggung.collider.json', AKAR), 'utf8')).bagian.length;
  assert.equal(f.hitung().spot, RUMAH.length * bagian);
});

test('rumah panggung: badan menahan, skala entri diterapkan, tangga depan terlalu curam untuk didaki', async () => {
  const f = await duniaLosari();
  const al = new AssetLibrary();
  al._loader = loaderUji();
  await al.applyManifest(new THREE.Group(), MANIFEST, { fisika: f, kelompok: 'spot' });

  for (const r of RUMAH) {
    const [x, , z] = r.position;
    const s = r.scale ?? 1;
    // Puncak collider badan = 2,79 × skala, tepat di atas pusat rumah.
    const puncak = f.tanahDi(x, z, { dari: 10, jarak: 12 });
    assert.ok(Math.abs(puncak - 2.79 * s) < 0.01, `rumah di (${x}, ${z}) skala ${s}: puncak ${puncak}, harapan ${2.79 * s}`);
  }

  // Rumah pertama: berjalan lurus ke sisi SAMPING badan (±X lokal) tertahan.
  const r = RUMAH[0];
  const [x0, , z0] = r.position;
  const c = Math.cos(r.rotationY ?? 0); const sn = Math.sin(r.rotationY ?? 0);
  const keDunia = (lx, lz) => ({ x: x0 + lx * c + lz * sn, z: z0 - lx * sn + lz * c });
  const awalSamping = keDunia(4.5, 0);
  const k = buatKarakter(f, { x: awalSamping.x, y: 0, z: awalSamping.z });
  const arahMasuk = [x0 - awalSamping.x, z0 - awalSamping.z];
  for (let i = 0; i < 120; i++) langkahKarakter(k, { dt: 1 / 60, arah: arahMasuk });
  const p = kakiKarakter(k);
  const lokalX = (p.x - x0) * c - (p.z - z0) * sn;
  assert.ok(lokalX >= 2.1 + 0.4 - 0.05, `menembus badan rumah: x lokal ${lokalX.toFixed(3)}`);

  // Tangga depan (+Z lokal): naik 0,298 per undak di tapak 0,21 m (55°), di
  // atas lereng maksimum 50° dan lebih sempit dari jari kapsul. Versi pertama
  // uji ini mengharapkan pemain sampai lantai — mesinnya berkata lain (kaki
  // berhenti di undak pertama, 0,288 m). Yang dijaga sekarang: undak pertama
  // bisa diinjak, lantai tidak tercapai, dan pemain tidak tersangkut.
  const awalDepan = keDunia(0, 4.0);
  const k2 = buatKarakter(f, { x: awalDepan.x, y: 0, z: awalDepan.z });
  const arahNaik = [x0 - awalDepan.x, z0 - awalDepan.z];
  let yMaks = 0;
  for (let i = 0; i < 180; i++) yMaks = Math.max(yMaks, langkahKarakter(k2, { dt: 1 / 60, arah: arahNaik }).kaki.y);
  assert.ok(yMaks > 0.2 && yMaks < 0.7, `tangga: kaki maks ${yMaks.toFixed(3)} m (harapan undak pertama saja)`);
  const diTangga = kakiKarakter(k2);
  for (let i = 0; i < 90; i++) langkahKarakter(k2, { dt: 1 / 60, arah: [-arahNaik[0], -arahNaik[1]] });
  const pergi = kakiKarakter(k2);
  assert.ok(Math.hypot(pergi.x - diTangga.x, pergi.z - diTangga.z) > 3, 'tersangkut di tangga, tidak bisa berjalan pergi');
});

test('GLB yang selesai dimuat SETELAH pindah Spot tidak meninggalkan collider maupun mesh', async () => {
  const f = await duniaLosari();
  const al = new AssetLibrary();
  let lepaskan;
  const tunda = new Promise((r) => { lepaskan = r; });
  al._loader = loaderUji({ tunda });
  const induk = new THREE.Group();
  const janji = al.applyManifest(induk, MANIFEST, { fisika: f, kelompok: 'spot' });
  // Pemain warp sebelum GLB pertama selesai: Game melepas batch dan kelompok Spot.
  await new Promise((r) => setTimeout(r, 10));
  al.detachBatch(induk);
  f.lepasKelompok('spot');
  lepaskan();
  await janji;
  assert.equal(f.hitung().spot, undefined, 'collider GLB terdaftar di Spot yang sudah ditinggalkan');
  assert.equal(induk.children.length, 0, 'mesh GLB ditaruh di Spot yang sudah ditinggalkan');
});

test('aset tanpa berkas collider tetap ditaruh, tanpa tembok tak terlihat, dengan peringatan', async () => {
  const f = await duniaLosari();
  const al = new AssetLibrary();
  al._loader = loaderUji();
  const peringatan = [];
  const asli = console.warn;
  console.warn = (...a) => peringatan.push(a.join(' '));
  const aslifetch = globalThis.fetch;
  globalThis.fetch = async (url) => (String(url).endsWith('manifest.json')
    ? { ok: true, json: async () => ({ glbs: [{ url: 'assets/models/tidak_ada.glb', position: [0, 0, 0] }] }) }
    : aslifetch(url));
  try {
    const induk = new THREE.Group();
    await al.applyManifest(induk, 'uji/manifest.json', { fisika: f, kelompok: 'spot' });
    assert.equal(induk.children.length, 1);
    assert.equal(f.hitung().spot, undefined);
    assert.ok(peringatan.some((p) => p.includes('tidak menyatakan collider')), peringatan.join(' | '));
  } finally {
    console.warn = asli;
    globalThis.fetch = aslifetch;
  }
});
