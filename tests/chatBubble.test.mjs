// ═══════════════════════════════════════════════════════
// tests/chatBubble.test.mjs
//
// ChatBubbleLayer hidup di antara DOM dan Three.js, jadi ia diuji dengan
// tiruan seadanya untuk keduanya. Yang dijaga di sini bukan tampilannya
// (itu diperiksa di browser), melainkan angka dan aturan yang mudah rusak
// diam-diam saat orang lain mengubahnya nanti:
//   - lama tampil ikut panjang pesan, dan dijepit
//   - pesan baru MENGGANTI, tidak menumpuk
//   - kedaluwarsa → transisi keluar → benar-benar dibuang (tidak bocor)
//   - ambang 24px: tokoh yang terlalu kecil tidak diberi bubble
//   - penjaga viewport 0: kalau ukuran layar tidak diketahui, bubble tetap
//     ditampilkan — menyembunyikan atas dasar data tak diketahui berarti
//     chat diam-diam kosong
// ═══════════════════════════════════════════════════════

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Tiruan DOM ────────────────────────────────────────
function buatElemen() {
  const kelas = new Set();
  return {
    style: {},
    textContent: '',
    _dibuang: false,
    classList: {
      add: (c) => kelas.add(c),
      remove: (c) => kelas.delete(c),
      contains: (c) => kelas.has(c),
    },
    remove() { this._dibuang = true; },
  };
}

function pasangLingkungan({ lebar = 1280, tinggi = 720 } = {}) {
  const lapisan = { clientWidth: lebar, clientHeight: tinggi, appendChild() {} };
  globalThis.document = {
    getElementById: (id) => (id === 'lbl-layer' ? lapisan : null),
    createElement: () => buatElemen(),
  };
  globalThis.window = { innerWidth: lebar, innerHeight: tinggi };
  // Dijalankan langsung: uji ini tidak menunggu frame.
  globalThis.requestAnimationFrame = (fn) => fn();
  globalThis.THREE = {
    Vector3: class {
      constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
      set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
      distanceTo(v) {
        return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z);
      }
      /** Kamera tiruan: menghadap -z, tanpa rotasi. NDC sederhana. */
      project(cam) {
        const dz = cam.position.z - this.z;
        const f = 1 / Math.max(Math.tan((cam.fov * Math.PI) / 360), 1e-6);
        this.x = (this.x / (dz || 1e-6)) * f;
        this.y = (this.y / (dz || 1e-6)) * f;
        this.z = dz > 0 ? 0.9 : 1.1; // >0 = di depan kamera
        return this;
      }
    },
  };
  return lapisan;
}

function kameraDi(z, { fov = 45 } = {}) {
  return {
    isPerspectiveCamera: true,
    fov,
    position: new globalThis.THREE.Vector3(0, 0, z),
  };
}

pasangLingkungan();
const { ChatBubbleLayer } = await import('../src/ui/ChatBubble.js');

const diTitikAsal = () => ({ x: 0, y: 0, z: 0 });

// ── Lama tampil ───────────────────────────────────────
test('lama tampil tumbuh mengikuti panjang pesan', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  L.ucap('a', 'hai', diTitikAsal);
  const pendek = L._bubble.get('a').kadaluarsa - performance.now();
  L.ucap('b', 'x'.repeat(40), diTitikAsal);
  const panjang = L._bubble.get('b').kadaluarsa - performance.now();

  assert.ok(panjang > pendek, 'pesan panjang harus bertahan lebih lama');
  // 2.4 + 3*0.045 = 2.535 detik
  assert.ok(Math.abs(pendek - 2535) < 60, `dapat ${pendek} ms`);
});

test('lama tampil dijepit di 7 detik walau pesannya maksimum', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  L.ucap('a', 'x'.repeat(500), diTitikAsal);
  const lama = L._bubble.get('a').kadaluarsa - performance.now();
  assert.ok(lama <= 7000 + 60, `dapat ${lama} ms, harus <= 7000`);
});

test('pesan dipotong di 100 huruf', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  L.ucap('a', 'x'.repeat(500), diTitikAsal);
  assert.equal(L._bubble.get('a').el.textContent.length, 100);
});

// ── Tidak menumpuk ────────────────────────────────────
test('pesan beruntun dari orang yang sama mengganti, bukan menumpuk', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  L.ucap('a', 'satu', diTitikAsal);
  L.ucap('a', 'dua', diTitikAsal);
  L.ucap('a', 'tiga', diTitikAsal);
  assert.equal(L.jumlah, 1);
  assert.equal(L._bubble.get('a').el.textContent, 'tiga');
});

// ── Daur hidup ────────────────────────────────────────
test('kedaluwarsa → transisi keluar → dibuang, tanpa sisa', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  const cam = kameraDi(10);
  L.ucap('a', 'hai', diTitikAsal);
  const el = L._bubble.get('a').el;

  L._bubble.get('a').kadaluarsa = performance.now() - 1; // paksa lewat waktu

  L.update(cam);
  assert.equal(L.jumlah, 1, 'masih ada selama transisi keluar');
  assert.equal(L._bubble.get('a').keluar, true);
  assert.equal(el.classList.contains('on'), false, 'kelas "on" dilepas');

  L._bubble.get('a').kadaluarsa = performance.now() - 1; // transisi selesai
  L.update(cam);
  assert.equal(L.jumlah, 0, 'akhirnya dibuang');
  assert.equal(el._dibuang, true, 'elemennya dilepas dari DOM');
});

test('bersihkan() mengosongkan semuanya (dipakai saat pindah Spot)', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  L.ucap('a', 'satu', diTitikAsal);
  L.ucap('b', 'dua', diTitikAsal);
  assert.equal(L.jumlah, 2);
  L.bersihkan();
  assert.equal(L.jumlah, 0);
});

// ── Keterlihatan ──────────────────────────────────────
test('pemilik yang sudah pergi (posisi null) tidak terlihat, tapi tidak error', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  L.ucap('a', 'hai', () => null);
  L.update(kameraDi(10));
  assert.equal(L.terlihat('a'), false);
});

test('tokoh lebih kecil dari 24px tidak diberi bubble', () => {
  pasangLingkungan({ tinggi: 720 });
  const L = new ChatBubbleLayer();
  // 1.85 * (720 / (2*tan(22.5°))) / jarak = 24  →  jarak ≈ 67
  const dekat = kameraDi(30);
  const jauh = kameraDi(200);

  L.ucap('dekat', 'hai', diTitikAsal);
  L.update(dekat);
  assert.equal(L.terlihat('dekat'), true, '30 unit harus terlihat');

  const M = new ChatBubbleLayer();
  M.ucap('jauh', 'hai', diTitikAsal);
  M.update(jauh);
  assert.equal(M.terlihat('jauh'), false, '200 unit harus disembunyikan');
});

test('titik di belakang kamera tidak terlihat', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  L.ucap('a', 'hai', diTitikAsal);
  L.update(kameraDi(-10)); // kamera di belakang titik → z proyeksi >= 1
  assert.equal(L.terlihat('a'), false);
});

// ── Penjaga: ukuran layar tidak diketahui ─────────────
test('viewport 0 tidak boleh membuat semua bubble hilang diam-diam', () => {
  pasangLingkungan({ lebar: 0, tinggi: 0 });
  const L = new ChatBubbleLayer();
  L.ucap('a', 'hai', diTitikAsal);
  L.update(kameraDi(30));
  // Menyembunyikan atas dasar data yang tidak diketahui = chat diam-diam
  // kosong. Lebih baik satu bubble salah tempat daripada fitur mati.
  assert.equal(L.terlihat('a'), true);
});
