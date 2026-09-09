// ═══════════════════════════════════════════════════════
// ChatBubble.js — bubble pesan di atas kepala (PRD BAB 5.1.1)
//
// "Pesan muncul sebagai bubble di atas kepala karakter. Bubble menghilang
// setelah beberapa detik."
//
// SATU lapisan untuk SEMUA bubble — pemain lokal maupun pemain lain. Sebelum
// ini ada setengah rintisan di Avatar.js (showChat/updateBubble) yang tidak
// pernah dipanggil dan CSS-nya tidak pernah ada; kalau dibiarkan, akan ada dua
// jalur proyeksi 3D→2D yang harus dijaga tetap sama. Rintisan itu dibuang.
//
// Lapisan ini tidak tahu apa-apa soal avatar: pemilik bubble menyerahkan
// fungsi pengambil posisi dunia, dan itu sekaligus menentukan tinggi anchor —
// avatar lokal (kepala ~1.23) dan avatar remote (ada name-tag di 1.6) butuh
// tinggi berbeda, jadi angkanya tidak boleh dipatok di sini.
// ═══════════════════════════════════════════════════════

/** Lama tampil: dasar + per huruf, dijepit. Pesan panjang butuh waktu baca
 *  lebih lama; pesan pendek yang menggantung lama justru menutupi dunia. */
const DETIK_DASAR = 2.4;
const DETIK_PER_HURUF = 0.045;
const DETIK_MAKS = 7.0;

/** Lama transisi keluar — harus >= durasi transisi di CSS (.22s). */
const MS_KELUAR = 260;

/** Batas huruf yang digambar. Server sudah menolak >100, ini pagar kedua
 *  supaya satu pesan tidak pernah menutupi layar. */
const MAKS_HURUF = 100;

/** Tinggi tokoh yang dipakai menaksir ukurannya di layar (unit dunia). */
const TINGGI_TOKOH = 1.85;

/** Bubble disembunyikan kalau tokohnya sudah lebih kecil dari ini di layar.
 *  Di bawah ~24 px tokohnya bukan lagi sesuatu yang bisa dikenali, jadi bubble
 *  berhenti menunjuk siapa pun dan hanya menutupi dunia.
 *
 *  CATATAN KEJUJURAN: 24 px dipilih dengan MEMBANDINGKAN ke ukuran target
 *  minimum WCAG 2.5.8, tetapi ini BUKAN klaim kepatuhan — SC 2.5.8 mengatur
 *  target interaktif, sedangkan avatar di sini bukan target klik. Anggap ini
 *  keputusan keterbacaan yang memakai angka WCAG sebagai pembanding besaran.
 *
 *  Yang penting: patokannya UKURAN DI LAYAR, bukan jarak karangan, supaya ikut
 *  menyesuaikan FOV dan tinggi viewport. */
const MIN_PX_TOKOH = 24;

/** Jarak aman antar bubble yang bertumpuk, dan dari tepi layar. */
const SELA_PX = 6;
const TEPI_PX = 8;

/** Sejauh mana bubble boleh digeser naik untuk menghindari tumpukan. Lebih
 *  dari ini ia sudah terlalu jauh dari kepala pemiliknya untuk masih bisa
 *  dibaca sebagai "ucapan orang itu". */
const GESER_MAKS_PX = 120;

/** Ukuran cadangan kalau elemen belum terukur (mis. di lingkungan uji). */
const LEBAR_CADANGAN = 160;
const TINGGI_CADANGAN = 28;

/** Dipakai ulang tiap frame — jangan alokasi Vector3 di dalam loop. */
let _v = null;

export class ChatBubbleLayer {
  /** @param {string} idLapisan elemen tempat bubble ditempel */
  constructor(idLapisan = 'lbl-layer', kamera = null) {
    this._lapisan = document.getElementById(idLapisan);
    // Kalau kamera baru diketahui saat update() pertama, pesan yang tiba
    // SEBELUM frame pertama akan dianggap "tidak terlihat" dan memicu toast
    // padahal pengirimnya di depan mata. Jadi kamera boleh diberikan di sini.
    this._kamera = kamera;
    /** @type {Map<string, {el: HTMLElement, ambilPosisi: Function, kadaluarsa: number, keluar: boolean, terlihat: boolean}>} */
    this._bubble = new Map();
  }

  /**
   * Tampilkan bubble untuk satu pemilik. Pesan baru dari pemilik yang sama
   * MENGGANTI yang lama, bukan menumpuk — orang yang mengetik cepat tidak
   * boleh membangun menara bubble di atas kepalanya.
   *
   * @param {string} id kunci pemilik (socketId, atau 'aku' untuk pemain lokal)
   * @param {string} pesan
   * @param {() => ({x:number,y:number,z:number} | null)} ambilPosisi
   *   posisi dunia titik gantung bubble; kembalikan null kalau pemiliknya
   *   sudah tidak ada (mis. pemain keluar) — bubble ikut disembunyikan.
   */
  ucap(id, pesan, ambilPosisi) {
    if (!this._lapisan || !pesan || typeof ambilPosisi !== 'function') return;
    // Array.from, bukan slice/length: keduanya bekerja pada code unit UTF-16,
    // sehingga satu emoji terhitung dua "huruf" (durasi jadi berlebih) dan
    // pemotongan di batas 100 bisa membelah pasangan surrogate jadi sampah.
    const huruf = Array.from(String(pesan));
    const teks = huruf.slice(0, MAKS_HURUF).join('');
    const jumlahHuruf = Math.min(huruf.length, MAKS_HURUF);

    let b = this._bubble.get(id);
    if (!b) {
      const el = document.createElement('div');
      el.className = 'chat-bubble';
      this._lapisan.appendChild(el);
      b = { el, ambilPosisi, kadaluarsa: 0, keluar: false, terlihat: false };
      this._bubble.set(id, b);
    }

    // textContent, bukan innerHTML — isinya diketik pemain lain.
    b.el.textContent = teks;
    b.ambilPosisi = ambilPosisi;
    b.keluar = false;

    // Ukur saat teksnya baru berubah — bukan tiap frame. Membaca
    // offsetWidth/Height memaksa layout; 60x/detik per bubble itu biaya
    // yang tidak perlu.
    b.terukur = false;
    b.w = LEBAR_CADANGAN;
    b.h = TINGGI_CADANGAN;
    this._ukur(b);

    // Tempatkan dulu sebelum terlihat, supaya bubble tidak sempat berkedip
    // di pojok kiri-atas pada frame pertama.
    this._tempatkan(b);
    this._rapikan();
    // Satu frame jeda supaya transisi masuknya terlihat. Kalau rAF tidak ada,
    // langsung tampilkan — sebuah pesan yang hilang jauh lebih buruk daripada
    // sebuah pesan yang muncul tanpa animasi.
    const rAF = globalThis.requestAnimationFrame;
    if (typeof rAF === 'function') rAF(() => b.el.classList.add('on'));
    else b.el.classList.add('on');

    const lama = Math.min(DETIK_MAKS, DETIK_DASAR + jumlahHuruf * DETIK_PER_HURUF);
    b.kadaluarsa = performance.now() + lama * 1000;
  }

  /** Hapus bubble milik satu pemilik (mis. pemainnya keluar). */
  buang(id) {
    const b = this._bubble.get(id);
    if (!b) return;
    b.el.remove();
    this._bubble.delete(id);
  }

  /** Proyeksi satu bubble ke layar. Dipakai update() dan ucap(). */
  _tempatkan(b) {
    const p = b.ambilPosisi?.();
    if (!p || !this._kamera) return this._sembunyikan(b);

    if (!_v) _v = new THREE.Vector3();
    _v.set(p.x, p.y, p.z);

    const [W, H] = this._ukuranLayar();

    // Ukur dulu, baru proyeksikan — project() menimpa isi vektornya.
    // px per unit dunia = (tinggi viewport / 2·tan(fov/2)) / jarak.
    // H bisa 0 saat layout belum jadi; kalau ukurannya tidak diketahui,
    // LEWATI uji ini. Menyembunyikan bubble atas dasar data yang tidak
    // diketahui berarti chat diam-diam tidak menampilkan apa pun — kegagalan
    // yang jauh lebih buruk daripada satu bubble yang kekecilan.
    if (H > 0 && this._kamera.isPerspectiveCamera) {
      const jarak = Math.max(this._kamera.position.distanceTo(_v), 1e-3);
      const fovRad = (this._kamera.fov * Math.PI) / 180;
      const pxPerUnit = H / (2 * Math.tan(fovRad / 2)) / jarak;
      if (TINGGI_TOKOH * pxPerUnit < MIN_PX_TOKOH) return this._sembunyikan(b);
    }

    _v.project(this._kamera);

    // NDC z yang sah ada di [-1, 1]. z >= 1 berarti di belakang kamera —
    // proyeksinya membalik dan bubble muncul di sisi layar yang salah.
    // z < -1 berarti lebih dekat daripada near plane; titiknya juga tidak
    // benar-benar tergambar, jadi jangan diberi bubble.
    if (_v.z >= 1 || _v.z < -1) return this._sembunyikan(b);

    const sx = (_v.x * 0.5 + 0.5) * W;
    const sy = (-_v.y * 0.5 + 0.5) * H;
    // Di luar tepi layar sama saja tidak terlihat: #lbl-layer memotongnya.
    // Hanya diuji kalau ukuran layarnya memang diketahui.
    if (W > 0 && H > 0 && (sx < 0 || sx > W || sy < 0 || sy > H)) {
      return this._sembunyikan(b);
    }

    // Hanya dihitung di sini. Penulisan gaya ditunda ke _rapikan(), yang
    // melihat SEMUA bubble sekaligus — penjepitan tepi dan penghindaran
    // tumpukan tidak bisa diputuskan satu per satu.
    b.terlihat = true;
    b.sx = sx;
    b.sy = sy;
  }

  /**
   * Coba ukur elemennya. Bisa gagal (mengembalikan 0) kalau layout belum jadi
   * — dan kalau itu terjadi tepat saat pesan datang, ukuran cadangan akan
   * terkunci selamanya dan penghindaran tumpukan memakai angka yang salah
   * (pesan panjang jauh lebih lebar dari cadangan 160 px). Jadi selama belum
   * berhasil, dicoba lagi tiap frame; setelah berhasil, tidak diukur lagi.
   */
  _ukur(b) {
    if (b.terukur) return;
    const w = b.el.offsetWidth;
    const h = b.el.offsetHeight;
    if (w > 0 && h > 0) { b.w = w; b.h = h; b.terukur = true; }
  }

  /**
   * Rapikan seluruh bubble yang terlihat, lalu tulis posisinya.
   *
   * Dua masalah yang tidak bisa dilihat dari satu bubble saja:
   *
   * 1. TEPI LAYAR. Bubble digambar DI ATAS titik gantungnya
   *    (translate -100%), dan #lbl-layer memakai overflow:hidden. Pemain yang
   *    berdiri di bagian atas layar — hal yang biasa — bubble-nya terpotong
   *    habis. Jadi posisinya dijepit supaya seluruh kotaknya tetap di dalam.
   *
   * 2. TUMPUKAN. Inti dunia ini orang berkumpul, jadi dua orang bicara
   *    berdekatan itu kejadian yang SERING, bukan kasus tepi. Tanpa ini
   *    bubble yang satu menutupi yang lain dan dua-duanya jadi tidak terbaca.
   *    Yang lebih bawah di layar (lebih dekat ke kamera) dianggap pemilik
   *    tempat; yang di belakangnya naik.
   */
  _rapikan() {
    const [W, H] = this._ukuranLayar();
    const tampak = [];
    for (const b of this._bubble.values()) {
      if (!b.terlihat) { b.el.style.visibility = 'hidden'; continue; }
      b.el.style.visibility = '';
      this._ukur(b);
      tampak.push(b);
    }
    if (!tampak.length) return;

    // Kotak layar tiap bubble: x di tengah sx, y dari (sy - tinggi) ke sy.
    for (const b of tampak) {
      const w = b.w || LEBAR_CADANGAN;
      const h = b.h || TINGGI_CADANGAN;
      b._x = W > 0 ? Math.min(Math.max(b.sx, w / 2 + TEPI_PX), W - w / 2 - TEPI_PX) : b.sx;
      b._y = H > 0 ? Math.min(Math.max(b.sy, h + TEPI_PX), H - TEPI_PX) : b.sy;
    }

    if (tampak.length > 1) {
      // Urut dari yang paling bawah: ia mendapat tempatnya lebih dulu.
      const urut = [...tampak].sort((a, b) => b._y - a._y);
      const sudah = [];
      for (const b of urut) {
        const w = b.w || LEBAR_CADANGAN;
        const h = b.h || TINGGI_CADANGAN;
        let geser = 0;
        // Ulangi karena menggeser ke atas bisa membenturkan ke bubble lain.
        for (let putaran = 0; putaran < sudah.length + 1; putaran++) {
          let bentrok = null;
          for (const a of sudah) {
            const aw = a.w || LEBAR_CADANGAN;
            const tumpangX = Math.abs(a._x - b._x) < (aw + w) / 2;
            const atasB = b._y - geser - h;
            const bawahB = b._y - geser;
            const tumpangY = atasB < a._y + SELA_PX && bawahB > a._y - (a.h || TINGGI_CADANGAN) - SELA_PX;
            if (tumpangX && tumpangY) { bentrok = a; break; }
          }
          if (!bentrok) break;
          geser = b._y - (bentrok._y - (bentrok.h || TINGGI_CADANGAN) - SELA_PX);
          if (geser > GESER_MAKS_PX) { geser = GESER_MAKS_PX; break; }
        }
        b._y -= geser;
        if (H > 0) b._y = Math.max(b._y, h + TEPI_PX);
        sudah.push(b);
      }
    }

    for (const b of tampak) {
      b.el.style.left = `${b._x}px`;
      b.el.style.top = `${b._y}px`;
    }
  }

  /**
   * Ukuran area gambar. #lbl-layer menutupi kanvas persis (inset:0), jadi ia
   * lebih benar daripada window kalau kanvasnya tidak sepenuh jendela.
   * Bisa mengembalikan 0 sebelum layout jadi — pemanggil wajib menjaganya.
   * @returns {[number, number]} [lebar, tinggi] px
   */
  _ukuranLayar() {
    const el = this._lapisan;
    return [
      el?.clientWidth || window.innerWidth || 0,
      el?.clientHeight || window.innerHeight || 0,
    ];
  }

  _sembunyikan(b) {
    b.terlihat = false;
    b.el.style.visibility = 'hidden';
  }

  /**
   * Apakah bubble ini benar-benar terlihat pemain saat ini?
   * Dipakai memutuskan perlu-tidaknya notifikasi cadangan: pesan dari orang
   * yang bubble-nya kelihatan tidak perlu diulang lagi sebagai toast.
   */
  terlihat(id) {
    return this._bubble.get(id)?.terlihat === true;
  }

  /**
   * Proyeksikan tiap bubble ke layar dan buang yang sudah lewat waktunya.
   * Dipanggil sekali per frame dari game loop.
   *
   * @param {THREE.Camera} camera
   */
  update(camera) {
    this._kamera = camera;
    if (!camera || !this._bubble.size) return;
    const kini = performance.now();

    for (const [id, b] of this._bubble) {
      if (kini > b.kadaluarsa) {
        if (!b.keluar) {
          // Mulai transisi keluar; baru benar-benar dibuang setelah selesai.
          b.keluar = true;
          b.el.classList.remove('on');
          b.kadaluarsa = kini + MS_KELUAR;
        } else {
          this.buang(id);
          continue;
        }
      }
      this._tempatkan(b);
    }
    this._rapikan();
  }

  /** Buang semuanya — dipakai saat pindah Spot. */
  bersihkan() {
    for (const id of [...this._bubble.keys()]) this.buang(id);
  }

  get jumlah() { return this._bubble.size; }
}
