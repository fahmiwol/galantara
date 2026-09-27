// ═══════════════════════════════════════════════════════
// tests/agen3dIkonStatus.test.mjs — status layers 2 and 3 (laporan 3D §6.5, §6a butir 4)
//
// "uji: tiap status → lokasi + ikon; ikon hilang mengikuti ADR-0004". On the real
// THREE r128 camera, with a DOM stub that records what the layer writes:
//   - every status → a Markas place (layer 1) AND an icon of its own SHAPE (layer 2);
//     shapes differ with every colour stripped (colour never carries meaning alone)
//   - colours = the beacon/lamp colours of keadaan.js, not a second palette
//   - icon hides when the agent is < 24 px tall on screen; H = 0 never hides it
//   - off-screen / behind camera: edge arrow ONLY for statuses that need the player,
//     inside the screen, pointing towards the agent
//   - terlihat() = channel in use, so a toast is only the fallback (ADR-0005)
// ═══════════════════════════════════════════════════════

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

if (!globalThis.THREE) {
  const sumber = readFileSync(new URL('../vendor/three.r128.min.js', import.meta.url), 'utf8');
  const modul = { exports: {} };
  new Function('module', 'exports', sumber)(modul, modul.exports);
  globalThis.THREE = modul.exports;
}

const I = await import('../src/world/agen/ikonStatus.js');
const M = await import('../src/world/markas/index.js');

// ── DOM stub ─────────────────────────────────────────
function elemen(tag = 'div') {
  const kelas = new Set();
  return {
    tag, style: {}, dataset: {}, atribut: {}, innerHTML: '', textContent: '', children: [], _dibuang: false,
    get className() { return [...kelas].join(' '); },
    set className(v) { kelas.clear(); for (const c of String(v).split(/\s+/)) if (c) kelas.add(c); },
    classList: { add: (c) => kelas.add(c), remove: (c) => kelas.delete(c), contains: (c) => kelas.has(c) },
    setAttribute(k, v) { this.atribut[k] = String(v); },
    appendChild(c) { this.children.push(c); return c; },
    remove() { this._dibuang = true; },
    get firstChild() { return this._ujung ??= { style: {} }; },
  };
}
function dokumen(W = 1280, H = 720) {
  const lapisan = Object.assign(elemen(), { clientWidth: W, clientHeight: H });
  const head = elemen('head');
  const d = {
    lapisan, head,
    getElementById: (id) => (id === 'lbl-layer' ? lapisan : head.children.find((c) => c.id === id) ?? null),
    createElement: (t) => elemen(t),
  };
  return d;
}
function kamera(W = 1280, H = 720) {
  const k = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);
  k.position.set(0, 1.6, 10);
  k.lookAt(0, 1.6, 0);
  k.updateMatrixWorld(true);
  return k;
}
const di = (x, y, z) => () => ({ x, y, z });

beforeEach(() => M._resetKeadaanMarkas());

test('setiap status_kerja → tempat di Markas (lapis 1) dan ikon berbentuk sendiri (lapis 2)', () => {
  const d = dokumen();
  const lap = new I.LapisanIkonStatus(kamera(), d.lapisan, { dokumen: d });
  const bentuk = new Set();
  const tanpaWarna = new Set();
  for (const status of ['antre', 'bekerja', 'hasil_siap', 'menunggu_otak', 'gagal']) {
    const r = M.tampilkanStatus3D(`a_${status}`, status);
    assert.ok(r.titik && Number.isFinite(r.titik.x), `${status}: tanpa titik Markas`);
    assert.ok(r.pose, `${status}: tanpa pose`);
    assert.equal(lap.setel(`a_${status}`, status, di(0, 1.3, 0)), 'ikon', `${status}: ikon tidak tampil`);
    const ikon = I.IKON_STATUS[status];
    bentuk.add(ikon.bentuk);
    // Colour removed: the markup must still differ (WCAG 1.4.1).
    tanpaWarna.add(ikon.svg.replace(/currentColor|#[0-9a-f]{3,8}/gi, ''));
    assert.ok(!/#[0-9a-f]{3,8}/i.test(ikon.svg), `${status}: warna ditulis di SVG, bukan lewat currentColor`);
    M.lepasAgenMarkas(`a_${status}`);
    assert.equal(lap.buang(`a_${status}`), true);
  }
  assert.equal(bentuk.size, 5, 'dua status berbagi bentuk');
  assert.equal(tanpaWarna.size, 5, 'tanpa warna, dua ikon tidak terbedakan');
  // `siap` = no icon: the world stays calm (✦ is enough).
  assert.equal(lap.setel('x', 'siap', di(0, 1.3, 0)), null);
  assert.equal(d.lapisan.children.filter((c) => !c._dibuang && c.classList.contains('on')).length, 0);
});

test('ikon 28 px, warna diambil dari keadaan.js (suar/lampu), CSS dipasang sekali', () => {
  const d = dokumen();
  const lap = new I.LapisanIkonStatus(kamera(), d.lapisan, { dokumen: d });
  new I.LapisanIkonStatus(kamera(), d.lapisan, { dokumen: d });
  assert.equal(d.head.children.length, 1, 'CSS dipasang dua kali');
  assert.match(d.head.children[0].textContent, new RegExp(`width:${I.UKURAN_IKON_PX}px;height:${I.UKURAN_IKON_PX}px`));
  assert.equal(I.UKURAN_IKON_PX, 28);
  assert.match(d.head.children[0].textContent, /prefers-reduced-motion/);
  lap.setel('sari', 'gagal', di(0, 1.3, 0));
  const el = d.lapisan.children[0];
  assert.equal(el.style.color, '#FF7A6B');
  assert.equal(el.dataset.bentuk, 'segitiga-seru');
  assert.match(el.atribut['aria-label'], /Gagal/);
  // Failed is still (no bounce); "needs you" bounces once.
  assert.equal(el.classList.contains('gw-tiba'), false);
  lap.setel('sari', 'menunggu_otak');
  assert.equal(el.classList.contains('gw-tiba'), true);
  assert.equal(el.style.color, '#FFC15C');
  assert.throws(() => lap.setel('sari', 'tidur'), /status_kerja tidak dikenal/);
});

test('ADR-0004: ikon hilang saat agen < 24 px di layar; H = 0 tidak pernah menyembunyikan', () => {
  const d = dokumen(1280, 720);
  const k = kamera();
  const lap = new I.LapisanIkonStatus(k, d.lapisan, { dokumen: d });
  // px per unit at distance D = (720 / (2 tan 22,5°)) / D; 1,23 m ≥ 24 px ⇔ D ≤ ~44,5 m.
  const batas = (720 / (2 * Math.tan(Math.PI / 8))) * I.TINGGI_AGEN / I.MIN_PX_AGEN;
  lap.setel('dekat', 'bekerja', di(0, 1.6, 10 - (batas - 0.5)));
  lap.setel('jauh', 'bekerja', di(0, 1.6, 10 - (batas + 0.5)));
  assert.equal(lap.terlihat('dekat'), 'ikon');
  assert.equal(lap.terlihat('jauh'), null);
  // Layout not ready: unknown size must not hide it.
  d.lapisan.clientWidth = 0; d.lapisan.clientHeight = 0;
  const w = globalThis.window; globalThis.window = { innerWidth: 0, innerHeight: 0 };
  try {
    lap.perbarui();
    assert.equal(lap.terlihat('jauh'), 'ikon');
  } finally { globalThis.window = w; }
});

test('lapis 3: di luar layar → panah tepi hanya untuk status yang butuh pemain, di dalam layar, menunjuk ke agen', () => {
  const W = 1280; const H = 720;
  const d = dokumen(W, H);
  const lap = new I.LapisanIkonStatus(kamera(W, H), d.lapisan, { dokumen: d });
  // Far to the right of the view, in front of the camera.
  lap.setel('kanan', 'menunggu_otak', di(40, 1.6, 0));
  lap.setel('kerja', 'bekerja', di(40, 1.6, 0));
  lap.setel('antre', 'antre', di(-40, 1.6, 0));
  assert.equal(lap.terlihat('kanan'), 'panah');
  assert.equal(lap.terlihat('kerja'), null, 'agen bekerja di luar layar tidak boleh memanggil');
  assert.equal(lap.terlihat('antre'), null);
  const p = lap.posisiLayar('kanan');
  assert.ok(Math.abs(p.x - (W - I.TEPI_PANAH_PX)) < 1, `panah tidak di tepi kanan: ${p.x}`);
  assert.ok(p.y > 0 && p.y < H);
  assert.ok(Math.abs(p.sudut) < 0.2, `panah tidak menunjuk ke kanan: ${p.sudut}`);
  // Behind the camera, to the left: arrow on the left edge (project() would mirror it).
  lap.setel('belakang', 'hasil_siap', di(-6, 1.6, 20));
  const b = lap.posisiLayar('belakang');
  assert.equal(lap.terlihat('belakang'), 'panah');
  assert.ok(Math.abs(b.x - I.TEPI_PANAH_PX) < 1, `panah belakang-kiri tidak di tepi kiri: ${b.x}`);
  // Straight behind: bottom edge.
  lap.setel('lurus', 'gagal', di(0, 1.6, 20));
  const c = lap.posisiLayar('lurus');
  assert.ok(Math.abs(c.y - (H - I.TEPI_PANAH_PX)) < 1 && Math.abs(c.x - W / 2) < 1, JSON.stringify(c));
  // Every arrow stays fully inside the screen.
  for (const id of ['kanan', 'belakang', 'lurus']) {
    const q = lap.posisiLayar(id);
    assert.ok(q.x >= I.TEPI_PANAH_PX - 1e-6 && q.x <= W - I.TEPI_PANAH_PX + 1e-6 && q.y >= I.TEPI_PANAH_PX - 1e-6 && q.y <= H - I.TEPI_PANAH_PX + 1e-6, id);
  }
  // Icon and arrow are never both on.
  const nyala = d.lapisan.children.filter((c2) => c2.classList.contains('on'));
  assert.equal(nyala.length, 3);
  assert.ok(nyala.every((e) => e.className.includes('gw-panah-status')));
});

test('panah ke semua arah tetap di tepi, sudutnya searah agen', () => {
  const W = 390; const H = 844; // HP tegak
  const k = kamera(W, H);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const vc = new THREE.Vector3(Math.cos(a) * 30, Math.sin(a) * 30, -5);
    const p = I.panahTepi(vc, k, W, H);
    const diTepi = Math.abs(p.x - I.TEPI_PANAH_PX) < 1e-6 || Math.abs(p.x - (W - I.TEPI_PANAH_PX)) < 1e-6
      || Math.abs(p.y - I.TEPI_PANAH_PX) < 1e-6 || Math.abs(p.y - (H - I.TEPI_PANAH_PX)) < 1e-6;
    assert.ok(diTepi, `arah ${i}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) tidak di tepi`);
    // Screen y points down: camera-space +y is up.
    if (Math.abs(Math.cos(a)) > 1e-6) assert.equal(Math.sign(p.x - W / 2), Math.sign(Math.cos(a)), `arah ${i} x`);
    if (Math.abs(Math.sin(a)) > 1e-6) assert.equal(Math.sign(p.y - H / 2), -Math.sign(Math.sin(a)), `arah ${i} y`);
    const dx = Math.cos(p.sudut); const dy = Math.sin(p.sudut);
    assert.ok(dx * (p.x - W / 2) + dy * (p.y - H / 2) > 0, `arah ${i}: panah menunjuk ke dalam`);
  }
});

test('ADR-0005: terlihatStatus lewat pintu Markas; toast hanya bila tidak ada kanal', () => {
  const d = dokumen();
  const k = kamera();
  const mesh = new THREE.Object3D();
  mesh.position.set(0, 0.3, 0);
  // Status first, layer later: the icon appears as soon as the layer is attached.
  M.tampilkanStatus3D('sari', 'menunggu_otak', { mesh });
  assert.equal(M.terlihatStatus('sari'), null, 'tanpa lapisan tidak ada kanal');
  M.pasangLapisanIkon(k, d.lapisan, { dokumen: d });
  assert.equal(M.terlihatStatus('sari'), 'ikon');
  // Anchor = mesh world position + ANGKUR_Y (above the name tag).
  const p = M.lapisanIkon().posisiLayar('sari');
  const ref = new THREE.Vector3(0, 0.3 + I.ANGKUR_Y, 0).project(k);
  assert.ok(Math.abs(p.y - (-ref.y * 0.5 + 0.5) * 720) < 0.5);
  // The agent walks off-screen: the frame update moves it to the edge arrow.
  mesh.position.set(60, 0.3, 0);
  M.perbaruiIkonStatus();
  assert.equal(M.terlihatStatus('sari'), 'panah');
  // Status changes reuse the mesh given before.
  M.tampilkanStatus3D('sari', 'bekerja');
  assert.equal(M.terlihatStatus('sari'), null, 'bekerja di luar layar tidak memanggil');
  mesh.position.set(0, 0.3, 0);
  M.perbaruiIkonStatus();
  assert.equal(M.terlihatStatus('sari'), 'ikon');
  M.tampilkanStatus3D('sari', 'siap');
  assert.equal(M.terlihatStatus('sari'), null);
  M.tampilkanStatus3D('sari', 'gagal');
  assert.equal(M.terlihatStatus('sari'), 'ikon');
  M.lepasAgenMarkas('sari');
  assert.equal(M.terlihatStatus('sari'), null);
  assert.ok(d.lapisan.children.every((c) => c._dibuang || !c.classList.contains('on')));
});
