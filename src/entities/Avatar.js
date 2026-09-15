// ═══════════════════════════════════════════════════════
// Avatar.js — Chibi player entity
// Build mesh, handle movement input, clamp ke island
// ═══════════════════════════════════════════════════════

import { AV_PRESETS, ISLAND_R } from '../data/config.js';
import { getSavedAvatarColorIndex, setSavedAvatarColorIndex } from '../data/avatarPreferences.js';
import {
  KECEPATAN, BATAS_JATUH, majukanKarakter, teleportKarakter, resetWaktuKarakter,
  nonaktifkanKarakter, aktifkanKarakter, cariTempatBerdiri, ruangBebas, calonMelingkar,
} from '../fisika/Karakter.js';

/** Turunnya badan saat duduk: dudukan dingklik 0,38 m dikurangi tenggelamnya
 *  badan chibi ke dalam dudukan. */
/** Cadangan kalau kursinya tidak menyebutkan tingginya sendiri. */
const TINGGI_DUDUK = -0.16;

export class Avatar {
  constructor(scene) {
    this.scene     = scene;
    this.mesh      = null;   // root group
    this.body      = null;   // body mesh (untuk ganti warna)
    this.pos       = { x: 0, y: 0, z: 2 };
    this.isMoving  = false;
    this.keys      = {};     // keyboard state
    this.dpad      = {};     // dpad state
    this.colorIdx  = 0;
    this._bobTimer = 0;

    // Facing direction (radians) — dipakai untuk rotate mesh
    this._facing = 0;

    /** Kursi yang sedang diduduki, atau null. Saat duduk, tombol arah tidak
     *  memindahkan posisi — ia MEMBANGUNKAN. Memaksa orang menekan [F] lagi
     *  untuk berdiri membuat mereka merasa terjebak di kursi. */
    this._kursi = null;
    /** Benar satu frame saat pemain berdiri sendiri; dibaca Game untuk
     *  memberi tahu mejanya. */
    this.baruBerdiri = false;
    /** Benar satu frame saat ingin berdiri tapi tidak ada titik yang muat. */
    this.gagalBerdiri = false;
    /** Benar satu frame saat pemain jatuh dari dunia dan dikembalikan. */
    this.jatuhDariDunia = false;

    /** Karakter fisika (src/fisika/Karakter.js), atau null selama Rapier belum
     *  siap / gagal dimuat. Selama null, gerak lama yang dipakai. */
    this._karakter = null;
    /** Tinggi telapak kaki dari fisika — naik saat di anak tangga/terasering. */
    this._kakiY = 0;
    /**
     * Penolak titik berdiri karena alasan PERMAINAN, disetel Game: titik di
     * radius kursi mana pun ditolak, karena keterisian diturunkan dari posisi.
     * @type {((p:{x:number,z:number}) => boolean) | null}
     */
    this.bolehBerdiri = null;
  }

  /**
   * Sambungkan karakter fisika. Pemain mungkin sudah berjalan dengan gerak lama
   * — dan gerak lama menembus apa saja — jadi posisinya diperiksa dulu dan
   * dipindah ke titik bebas terdekat kalau sedang berdiri di dalam sesuatu.
   *
   * @param {object} k hasil buatKarakter() dari src/fisika/Karakter.js
   */
  pakaiKarakter(k) {
    this._karakter = k;
    if (this._kursi) {
      nonaktifkanKarakter(k);
      return;
    }
    this.pastikanBebas();
  }

  get pakaiFisika() { return this._karakter !== null; }

  /**
   * Kalau kapsul sedang beririsan dengan collider (baru menyambung, baru warp),
   * pindahkan ke titik bebas terdekat. Pengendali Rapier tidak mendepenetrasi
   * sendiri — kapsul yang mulai di dalam batang pohon akan tetap di sana.
   * @returns {boolean} apakah posisinya dipindah
   */
  pastikanBebas() {
    const k = this._karakter;
    if (!k || this._kursi) return false;
    const di = ruangBebas(k, this.pos);
    if (di.bebas) {
      // Badan fisika disamakan dengan posisi gambar — selama gerak lama
      // berjalan, keduanya berpisah.
      teleportKarakter(k, { x: this.pos.x, y: di.tanahY, z: this.pos.z });
      this._kakiY = di.tanahY;
      return false;
    }
    const boleh = this.bolehBerdiri ?? undefined;
    const titik = cariTempatBerdiri(k, calonMelingkar(this.pos), { boleh })
      ?? cariTempatBerdiri(k, calonMelingkar({ x: 0, z: 2 }), { boleh });
    if (!titik) return false;
    teleportKarakter(k, titik);
    this.pos.x = titik.x;
    this.pos.z = titik.z;
    this._kakiY = titik.y;
    return true;
  }

  // ── BUILD CHIBI MESH ──────────────────────────────────
  build() {
    this.mesh = new THREE.Group();

    // Body (ellipsoid effect via scaled sphere)
    const bodyGeo = new THREE.SphereGeometry(0.45, 10, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: AV_PRESETS[this.colorIdx].color,
      roughness: 0.7,
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.scale.y = 1.2;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    // Head (sphere, lebih besar relatif body — chibi style)
    const headGeo = new THREE.SphereGeometry(0.38, 10, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xFFDEAD, roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.85;
    head.castShadow = true;
    this.mesh.add(head);

    // Eyes (two small spheres)
    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0x1a1a1a }),
      );
      eye.position.set(ex, 0.88, 0.33);
      this.mesh.add(eye);
    });

    // Shadow disc (ground projection hint)
    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18 }),
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = -0.54;
    this.mesh.add(shadowDisc);

    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.scene.add(this.mesh);
    this._bindKeys();

    const saved = getSavedAvatarColorIndex();
    if (saved !== null && saved >= 0 && saved < AV_PRESETS.length) {
      this.setColor(saved);
    }

    return this;
  }

  // ── INPUT: KEYBOARD ───────────────────────────────────
  _bindKeys() {
    const MAP = {
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
    };
    window.addEventListener('keydown', (e) => {
      // Jangan capture WASD kalau user lagi ketik di input/textarea
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = MAP[e.code];
      if (k) { this.keys[k] = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
      const k = MAP[e.code];
      if (k) this.keys[k] = false;
    });
    // Tombol yang DITAHAN saat jendela kehilangan fokus (alt-tab, klik di luar
    // halaman, dialog) tidak pernah mengirim keyup — pemain berjalan sendiri
    // sampai menabrak tepi pulau. Terlihat saat verifikasi fisika 15 Sep 2026;
    // pola perbaikannya dari Mighan-3D-Studio (reset saat blur).
    const lepasSemua = () => { this.keys = {}; this.dpad = {}; };
    window.addEventListener('blur', lepasSemua);
    document.addEventListener('visibilitychange', () => { if (document.hidden) lepasSemua(); });

    // D-pad buttons
    const bindDpad = (id, dir) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.dpad[dir] = true; });
      el.addEventListener('pointerup',   () => { this.dpad[dir] = false; });
      el.addEventListener('pointerleave', () => { this.dpad[dir] = false; });
    };
    bindDpad('dp-u', 'up');
    bindDpad('dp-d', 'down');
    bindDpad('dp-l', 'left');
    bindDpad('dp-r', 'right');
  }

  // ── UPDATE — called each frame ────────────────────────
  // camera dipakai untuk getMoveDelta (relatif kamera)
  update(dt, camera) {
    const dirs = ['up', 'down', 'left', 'right'];
    const active = dirs.filter(d => this.keys[d] || this.dpad[d]);

    this.baruBerdiri = false;
    this.gagalBerdiri = false;
    this.jatuhDariDunia = false;
    if (this._kursi) {
      // Menekan arah = ingin pergi. Berdiri dulu; gerakannya frame berikutnya,
      // supaya tidak melompat keluar kursi dalam satu langkah penuh.
      if (active.length && !this._tahanBerdiri) {
        if (this.berdiri()) this.baruBerdiri = true;
        else { this.gagalBerdiri = true; this._tahanBerdiri = true; }
      }
      // Tombol harus DILEPAS dulu sebelum mencoba lagi — kalau tidak, gagal
      // berdiri diulang 60 kali per detik selama tombolnya ditahan.
      if (!active.length) this._tahanBerdiri = false;
      this.isMoving = false;
    } else {
      this.isMoving = active.length > 0;
    }

    let dx = 0, dz = 0;
    if (this.isMoving) {
      active.forEach(dir => {
        const delta = camera.getMoveDelta(dir);
        if (delta) { dx += delta.dx; dz += delta.dz; }
      });

      // Normalize diagonal
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) {
        dx /= len;
        dz /= len;
        this._facing = Math.atan2(dx, dz);
      }
    }

    if (this._karakter && !this._kursi) {
      // Fisika: langkah tetap 1/60, posisi gambar diinterpolasi. Tetap
      // dipanggil saat diam — gravitasi dan menempel-tanah juga butuh langkah.
      const h = majukanKarakter(this._karakter, dt, [dx, dz], KECEPATAN);
      this.pos.x = h.kaki.x;
      this.pos.z = h.kaki.z;
      this._kakiY = h.kaki.y;
      // Jatuh dari dunia (lubang di collider, tepi Spot yang lupa diberi
      // dinding): kembalikan ke titik muncul, jangan biarkan jatuh selamanya.
      if (h.kaki.y < BATAS_JATUH) {
        this.teleport(0, 2, this._facing);
        this.pastikanBebas();
        this.jatuhDariDunia = true;
      }
    } else if (this.isMoving) {
      // Gerak lama, dipakai selama fisika belum siap atau gagal dimuat.
      // Kecepatannya sekarang m/s × dt: SPEED lama 0.09 PER BINGKAI membuat
      // pemain di ponsel 30 fps berjalan setengah kecepatan.
      this.pos.x += dx * KECEPATAN * dt;
      this.pos.z += dz * KECEPATAN * dt;

      // Clamp ke island
      const dist = Math.sqrt(this.pos.x ** 2 + this.pos.z ** 2);
      if (dist > ISLAND_R - 1) {
        const scale = (ISLAND_R - 1) / dist;
        this.pos.x *= scale;
        this.pos.z *= scale;
      }
    }

    // Bob animation
    this._bobTimer += dt;
    let bobY = this.isMoving
      ? Math.abs(Math.sin(this._bobTimer * 8)) * 0.12
      : Math.sin(this._bobTimer * 1.5) * 0.04;

    // Duduk: badan turun ke tinggi dudukan dan napasnya melambat. Tanpa rig
    // tulang, INI yang membedakan duduk dari berdiri diam — dan dari kamera
    // isometrik Galantara, itu sudah cukup terbaca.
    if (this._kursi) {
      // Tinggi datang dari KURSINYA, bukan konstanta global: lesehan duduk di
      // lantai, kursi kafe lebih tinggi daripada dingklik. Satu angka untuk
      // ketiganya akan salah di dua tempat.
      const turun = this._kursi.tinggiDuduk ?? TINGGI_DUDUK;
      bobY = turun + Math.sin(this._bobTimer * 0.9) * 0.012;
    }

    const kakiY = this._kursi ? 0 : this._kakiY;
    this.mesh.position.set(this.pos.x, kakiY + bobY, this.pos.z);

    // Rotate mesh to face direction
    this.mesh.rotation.y = this._facing;
  }

  // ── CHANGE COLOR ──────────────────────────────────────
  setColor(idx) {
    this.colorIdx = idx % AV_PRESETS.length;
    if (this.body) {
      this.body.material.color.setHex(AV_PRESETS[this.colorIdx].color);
    }
    setSavedAvatarColorIndex(this.colorIdx);
  }

  // Bubble chat di atas kepala ditangani src/ui/ChatBubble.js — satu lapisan
  // untuk avatar lokal maupun avatar pemain lain.

  getPosition() {
    return this.pos;
  }

  get kursi() { return this._kursi; }
  get sedangDuduk() { return this._kursi !== null; }

  /**
   * Dudukkan di satu kursi: posisi di-snap ke kursi dan menghadap pusat meja,
   * supaya orang-orang di satu meja benar-benar BERHADAPAN. Itu inti "meja
   * nongkrong" — bukan sekadar berdiri berdekatan.
   *
   * Posisi hasil snap disiarkan lewat emit posisi yang sudah ada, jadi klien
   * lain melihatnya duduk tanpa perlu pesan socket baru.
   *
   * @param {{ i: number, x: number, z: number, facing: number }} kursi
   */
  duduk(kursi) {
    if (!kursi) return false;
    this._kursi = kursi;
    this.pos.x = kursi.x;
    this.pos.z = kursi.z;
    this._facing = kursi.facing;
    this.isMoving = false;
    // Kapsul dimatikan, bukan cuma berhenti membaca tombol: kapsul yang
    // tertinggal di tempat lama adalah penghalang tak terlihat.
    if (this._karakter) nonaktifkanKarakter(this._karakter);
    return true;
  }

  /**
   * Berdiri ke titik keluar kursi yang MUAT.
   *
   * Berdiri memindahkan posisi. Dulu tidak, dan akibatnya nyata: keterisian
   * kursi diturunkan dari posisi (ADR-0003), jadi pemain yang berdiri tapi
   * belum melangkah tetap terlihat DUDUK di layar orang lain.
   *
   * Dengan fisika: calon diuji ruang kapsulnya dan yang pertama muat dipakai;
   * kalau tidak ada yang muat, pemain TETAP DUDUK — lebih baik daripada
   * dilempar ke dalam tembok atau ke atas meja.
   * Tanpa fisika: calon pertama yang lolos aturan kursi, tanpa uji ruang.
   *
   * @returns {boolean} apakah berhasil berdiri
   */
  berdiri() {
    if (!this._kursi) return false;
    const calon = this._kursi.keluar ?? [];
    const boleh = this.bolehBerdiri ?? undefined;
    let titik = null;
    if (this._karakter) {
      titik = cariTempatBerdiri(this._karakter, calon, { boleh });
      if (!titik) return false;
      aktifkanKarakter(this._karakter, titik);
      this._kakiY = titik.y;
    } else {
      titik = calon.find((c) => !boleh || boleh(c)) ?? null;
    }
    if (titik) {
      this.pos.x = titik.x;
      this.pos.z = titik.z;
    }
    this._kursi = null;
    return true;
  }

  /** Lupakan waktu fisika yang terkumpul (tab kembali dari latar belakang). */
  resetWaktuFisika() {
    if (this._karakter) resetWaktuKarakter(this._karakter);
  }

  /** Teleport (warp antar Spot / hub) — reset posisi & mesh. */
  teleport(x, z, facing = 0) {
    // Warp sambil duduk: kursinya tertinggal di Spot lama.
    if (this._kursi) {
      this._kursi = null;
      if (this._karakter) {
        this._karakter.collider.setEnabled(true);
        this._karakter.aktif = true;
      }
    }
    this.pos.x = x;
    this.pos.z = z;
    this._facing = facing;
    this._kakiY = 0;
    if (this._karakter) teleportKarakter(this._karakter, { x, y: 0, z });
    if (this.mesh) {
      this.mesh.position.set(x, 0, z);
      this.mesh.rotation.y = facing;
    }
  }
}
