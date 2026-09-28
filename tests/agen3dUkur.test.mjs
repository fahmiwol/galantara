// ═══════════════════════════════════════════════════════
// tests/agen3dUkur.test.mjs — the `?ukur` page measures honestly (laporan 3D §6a butir 11)
//
// A stub renderer that behaves like r128 where it matters (ADR-0012): `render` is an
// INSTANCE property (r128 assigns it in the constructor — a prototype wrapper never
// runs, found in Chromium), the scene's onBeforeRender(renderer, …) is called inside
// render, and the order is shadow pass → info reset when autoReset → main pass:
//   - main-pass DC and triangles come from normal frames; shadow DC = one measured
//     frame's total − main
//   - info.autoReset is always restored, even when render throws
//   - nothing is wrapped and nothing is added to the page without `?ukur`
//   - FPS and frame times come from the renders' own clock
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';

const U = await import('../src/world/ukur.js');

/** r128: instance `render`; scene.onBeforeRender → shadow pass → (autoReset && reset) → main pass. */
function buatRenderer({ bayangan = 3, utama = 10, segitiga = 1200, lempar = () => false } = {}) {
  const r = {
    info: {
      autoReset: true,
      render: { calls: 0, triangles: 0 },
      reset() { this.render.calls = 0; this.render.triangles = 0; },
    },
  };
  r.render = function (scene, camera) {
    if (scene?.isScene === true) scene.onBeforeRender(r, scene, camera, null);
    this.info.render.calls += bayangan;
    this.info.render.triangles += 400;
    if (this.info.autoReset === true) this.info.reset();
    if (lempar()) throw new Error('konteks WebGL hilang');
    this.info.render.calls += utama;
    this.info.render.triangles += segitiga;
  };
  return r;
}
const adegan = () => ({ isScene: true, onBeforeRender() {} });

function jamPalsu(langkah) {
  let t = 0;
  return { jam: () => t, maju: () => { t += langkah; } };
}

test('DC utama dari bingkai biasa, DC bayangan = total bingkai ukur − utama', () => {
  const r = buatRenderer({ bayangan: 7, utama: 131, segitiga: 12125 });
  const j = jamPalsu(1000 / 60);
  const p = new U.PengukurRender({ jam: j.jam });
  const lepas = U.bungkusRenderer(r, p);
  for (let i = 0; i < U.TIAP_BAYANGAN * 2; i++) { r.render(); j.maju(); }
  const s = p.ringkas();
  assert.equal(s.dcUtama, 131);
  assert.equal(s.dcBayangan, 7);
  assert.equal(s.segitiga, 12125, 'segitiga bayangan ikut terhitung');
  assert.ok(Math.abs(s.fps - 60) < 0.5, `fps ${s.fps}`);
  assert.ok(Math.abs(s.msRata - 1000 / 60) < 0.1);
  assert.equal(r.info.autoReset, true, 'autoReset tidak dikembalikan');
  // Rendering stops (tab hidden): the panel reads 0 fps, not the old value.
  for (let i = 0; i < 400; i++) j.maju();
  assert.equal(p.ringkas().fps, 0);
  // After the wrapper is removed, render is the original again.
  lepas();
  const q = new U.PengukurRender();
  r.render();
  assert.equal(q.renderKe, 0);
  assert.equal(p.renderKe, U.TIAP_BAYANGAN * 2);
});

test('di bawah 1 fps (SwiftShader, HP lemah) FPS tetap terbaca, bukan 0', () => {
  const r = buatRenderer();
  const j = jamPalsu(2500);
  const p = new U.PengukurRender({ jam: j.jam });
  const lepas = U.bungkusRenderer(r, p);
  try {
    for (let i = 0; i < 3; i++) { r.render(); j.maju(); }
    const s = p.ringkas();
    assert.ok(Math.abs(s.fps - 0.4) < 1e-9, `fps ${s.fps}`);
    assert.equal(s.msRata, 2500);
  } finally { lepas(); }
});

test('render yang melempar tetap mengembalikan autoReset (kalau tidak, angka menumpuk selamanya)', () => {
  let n = 0;
  const r = buatRenderer({ lempar: () => ++n === U.TIAP_BAYANGAN });
  const p = new U.PengukurRender();
  const lepas = U.bungkusRenderer(r, p);
  try {
    for (let i = 0; i < U.TIAP_BAYANGAN - 1; i++) r.render();
    assert.throws(() => r.render(), /konteks WebGL hilang/);
    assert.equal(r.info.autoReset, true);
    r.render();
    assert.equal(p.ringkas().dcUtama, 10, 'bingkai sesudah galat masih menumpuk');
  } finally { lepas(); }
});

test('bungkus idempoten: dua kali memasang = satu pembungkus', () => {
  const r = buatRenderer();
  const p = new U.PengukurRender();
  const lepas = U.bungkusRenderer(r, p);
  U.bungkusRenderer(r, p);
  r.render();
  assert.equal(p.renderKe, 1);
  lepas();
});

test('tanpa ?ukur tidak ada yang dibungkus atau ditambahkan ke halaman', () => {
  const r = buatRenderer();
  const asli = r.render;
  const sc = adegan();
  const hook = sc.onBeforeRender;
  let ditambah = 0;
  const dokumen = { body: { appendChild: () => { ditambah++; } }, createElement: () => ({ style: {}, appendChild() {} }) };
  for (const search of ['', '?jam=12.5', '?ukuran=1']) {
    assert.equal(U.dimintaUkur({ search }), false, search);
    assert.equal(U.pasangUkurBilaDiminta({ adegan: sc, lokasi: { search }, dokumen }), null);
  }
  r.render(sc);
  assert.equal(r.render, asli);
  assert.equal(sc.onBeforeRender, hook, 'hook adegan disentuh tanpa ?ukur');
  assert.equal(ditambah, 0);
  assert.equal(U.dimintaUkur({ search: '?jam=12.5&ukur' }), true);
});

test('dengan ?ukur: panel dipasang, teks dan baris salin memakai format Indonesia', () => {
  const r = buatRenderer({ bayangan: 70, utama: 139, segitiga: 21000 });
  const sc = adegan();
  const hook = sc.onBeforeRender;
  const anak = [];
  const el = () => ({ style: {}, textContent: '', appendChild(c) { anak.push(c); }, addEventListener() {}, remove() {} });
  const dokumen = { body: el(), createElement: el };
  const jendela = { innerWidth: 390, innerHeight: 844, devicePixelRatio: 3, navigator: { userAgent: 'Mozilla/5.0 HP-acuan' }, setInterval: () => 1, clearInterval() {} };
  const a = U.pasangUkurBilaDiminta({ adegan: sc, lokasi: { search: '?ukur' }, dokumen, jendela });
  try {
    assert.ok(a?.panel, 'panel tidak dipasang');
    // First render hands over the renderer (and is itself not measured); the scene's hook is restored.
    r.render(sc);
    assert.equal(sc.onBeforeRender, hook, 'hook adegan tidak dikembalikan');
    assert.equal(a.pengukur.renderKe, 0);
    for (let i = 0; i < U.TIAP_BAYANGAN; i++) r.render(sc);
    a.panel.segarkan();
    const teks = anak[0].textContent;
    assert.match(teks, /DC utama +139/);
    assert.match(teks, /DC bayangan 70/);
    assert.match(teks, /segitiga +21\.000/);
    assert.match(teks, /390×844 @3,00/);
    const baris = a.pengukur.baris({ lebar: 390, tinggi: 844, dpr: 3, perangkat: 'HP-acuan' });
    assert.match(baris, /HP-acuan \| 390×844 @3,00 \| .* fps \| .* ms \| DC 139 \+ bayangan 70 \| 21\.000 segitiga$/);
    // The button is a real touch target (44 px).
    assert.equal(anak[1].style.minHeight, '44px');
  } finally { a?.lepas(); }
});

test('?ukur&party=N: hanya dengan ?ukur, dijepit 0–4, angka rusak = 0', async () => {
  const U = await import('../src/world/ukur.js');
  const l = (search) => ({ search });
  assert.equal(U.jumlahPartyUkur(l('?party=4')), 0, 'party tanpa ?ukur tidak boleh memasang apa pun');
  assert.equal(U.jumlahPartyUkur(l('?ukur&party=4')), 4);
  assert.equal(U.jumlahPartyUkur(l('?ukur&party=9')), 4);
  assert.equal(U.jumlahPartyUkur(l('?ukur&party=-2')), 0);
  assert.equal(U.jumlahPartyUkur(l('?ukur&party=abc')), 0);
  assert.equal(U.jumlahPartyUkur(l('?ukur')), 0);
});
