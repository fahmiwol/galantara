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
//   - ambang keterbacaan 24px: tokoh yang terlalu kecil tidak diberi bubble
//   - emoji dihitung satu huruf, dan tidak terbelah saat dipotong
//   - tata letak: dijepit di tepi layar, tidak bertumpuk sesama bubble
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
    // 0 = layout belum jadi, seperti yang benar-benar terjadi di Browser pane.
    offsetWidth: 0,
    offsetHeight: 0,
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
      /**
        * Kamera tiruan: menghadap -z, tanpa rotasi.
        * z dikembalikan sebagai NDC sungguhan di [-1, 1] untuk titik yang
        * berada antara near dan far — supaya uji batas near/far menguji
        * perilaku nyata, bukan nilai yang dipaksakan dari luar.
        */
      project(cam) {
        const NEAR = 1, FAR = 1000;
        const dz = cam.position.z - this.z;
        const f = 1 / Math.max(Math.tan((cam.fov * Math.PI) / 360), 1e-6);
        this.x = (this.x / (dz || 1e-6)) * f;
        this.y = (this.y / (dz || 1e-6)) * f;
        if (dz <= 0) this.z = 1.1;              // di belakang kamera
        else if (dz < NEAR) this.z = -1.5;      // lebih dekat dari near plane
        else if (dz > FAR) this.z = 1.5;
        else this.z = ((dz - NEAR) / (FAR - NEAR)) * 2 - 1;
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
  // 24 px = keputusan keterbacaan yang memakai angka WCAG 2.5.8 sebagai
  // pembanding besaran. BUKAN klaim kepatuhan: SC 2.5.8 mengatur target
  // interaktif, sedangkan avatar di sini bukan target klik.
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

test('emoji dihitung satu huruf dan tidak terbelah saat dipotong', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  const BULAN = String.fromCodePoint(0x1F319); // satu emoji = dua code unit UTF-16

  // Kalau dihitung per code unit, 10 emoji akan dianggap 20 huruf dan
  // durasinya jadi dua kali lipat.
  L.ucap('a', BULAN.repeat(10), diTitikAsal);
  const durasiEmoji = L._bubble.get('a').kadaluarsa - performance.now();
  L.ucap('b', 'x'.repeat(10), diTitikAsal);
  const durasiHuruf = L._bubble.get('b').kadaluarsa - performance.now();
  assert.ok(Math.abs(durasiEmoji - durasiHuruf) < 30,
    `10 emoji (${durasiEmoji} ms) harus setara 10 huruf (${durasiHuruf} ms)`);

  const M = new ChatBubbleLayer();
  M.ucap('c', BULAN.repeat(200), diTitikAsal);
  const teks = M._bubble.get('c').el.textContent;
  assert.equal(Array.from(teks).length, 100, 'dipotong di 100 karakter tampak');
  // Karakter terakhir tidak boleh separuh pasangan surrogate.
  const akhir = teks.charCodeAt(teks.length - 1);
  assert.ok(akhir < 0xD800 || akhir > 0xDBFF, 'tidak berakhir di separuh emoji');
});

test('titik lebih dekat dari near plane tidak terlihat', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  L.ucap('a', 'hai', diTitikAsal);
  // Kamera 0,5 unit dari titiknya — di dalam near plane (1,0). Tokohnya
  // besar sekali jadi uji ukuran lolos; yang harus menolak adalah uji NDC.
  L.update(kameraDi(0.5));
  assert.equal(L.terlihat('a'), false);
});

test('kamera boleh diberikan saat konstruksi, tidak menunggu frame pertama', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer('lbl-layer', kameraDi(30));
  // Belum sekali pun update() dipanggil. Pesan pertama tetap harus terlihat,
  // supaya toast cadangan tidak salah menyala.
  L.ucap('a', 'hai', diTitikAsal);
  assert.equal(L.terlihat('a'), true);
});

test('titik di belakang kamera tidak terlihat', () => {
  pasangLingkungan();
  const L = new ChatBubbleLayer();
  L.ucap('a', 'hai', diTitikAsal);
  L.update(kameraDi(-10)); // kamera di belakang titik → z proyeksi >= 1
  assert.equal(L.terlihat('a'), false);
});

// ── Tata letak: tepi layar dan tumpukan ───────────────
const angka = (px) => Number(String(px).replace('px', ''));

test('bubble di dekat tepi atas dijepit supaya tidak terpotong', () => {
  pasangLingkungan({ tinggi: 720 });
  const L = new ChatBubbleLayer();
  // y dunia tinggi → proyeksinya jatuh di ~12 px dari atas layar. Bubble
  // digambar DI ATAS titik itu, jadi tanpa penjepitan ia terpotong habis
  // oleh overflow:hidden milik #lbl-layer.
  L.ucap('a', 'hai', () => ({ x: 0, y: 12, z: 0 }));
  L.update(kameraDi(30));

  assert.equal(L.terlihat('a'), true, 'harus tetap terlihat, bukan disembunyikan');
  const atas = angka(L._bubble.get('a').el.style.top);
  // Tinggi cadangan 28 + tepi 8 = 36: seluruh kotaknya masuk layar.
  assert.ok(atas >= 36, `top ${atas} px, seluruh bubble harus di dalam layar`);
});

test('dua bubble di titik yang sama tidak saling menutupi', () => {
  pasangLingkungan({ tinggi: 720 });
  const L = new ChatBubbleLayer();
  // Dua orang bicara berdempetan — kejadian yang SERING di dunia yang
  // seluruh tujuannya orang berkumpul, bukan kasus tepi.
  L.ucap('a', 'sini kumpul', diTitikAsal);
  L.ucap('b', 'otw', diTitikAsal);
  L.update(kameraDi(30));

  const ya = angka(L._bubble.get('a').el.style.top);
  const yb = angka(L._bubble.get('b').el.style.top);
  // Tinggi cadangan 28 + sela 6 = 34.
  assert.ok(Math.abs(ya - yb) >= 34,
    `jarak vertikal ${Math.abs(ya - yb)} px, harus >= 34 supaya tidak bertumpuk`);
});

test('bubble sendirian tidak digeser tanpa alasan', () => {
  pasangLingkungan({ tinggi: 720 });
  const L = new ChatBubbleLayer();
  L.ucap('a', 'hai', diTitikAsal);
  L.update(kameraDi(30));
  // Titik asal memproyeksi ke tengah layar; tidak ada tepi maupun tumpukan.
  assert.equal(angka(L._bubble.get('a').el.style.top), 360);
});

test('ukuran elemen diukur ulang setelah layout jadi, tidak terkunci di cadangan', () => {
  pasangLingkungan({ tinggi: 720 });
  const L = new ChatBubbleLayer();
  L.ucap('a', 'pesan yang panjang sekali sampai lebarnya jauh dari cadangan', diTitikAsal);

  const b = L._bubble.get('a');
  assert.equal(b.terukur, false, 'saat layout belum jadi, pakai cadangan');
  assert.equal(b.w, 160);

  // Layout akhirnya jadi — bubble panjang jauh lebih lebar dari cadangan.
  b.el.offsetWidth = 230;
  b.el.offsetHeight = 46;
  L.update(kameraDi(30));

  assert.equal(b.terukur, true, 'harus diukur ulang, bukan terkunci');
  assert.equal(b.w, 230);
  assert.equal(b.h, 46);
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
