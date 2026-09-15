// ═══════════════════════════════════════════════════════
// MejaNongkrong.js — social node: meja warung + dingklik + rangka bambu
//
// PRD (GALANTARA_BUILDER_SYSTEM §"SocialNode registry"): "warung, bangku,
// panggung = node pertama, bukan dekorasi terakhir." RESOURCES_RESEARCH
// menaruh "InteractionVolume + satu aksi (bangku duduk)" sebagai P1 dengan
// alasan "jadi betah tanpa nambah mesh".
//
// ── ARAHAN SENI (pendapat kedua gpt-5.6-sol, 10 Sep 2026) ──
// Versi pertama meja ini BUNDAR dengan kaki tengah dan dingklik bundar, dan
// itu ternyata bahasa visual **set patio / kafe taman** — teko gerabah saja
// tidak cukup mengubahnya jadi Indonesia. Tiga koreksi yang dipakai:
//
//   1. Daun PERSEGI PANJANG dari tiga papan bercelah, kaki empat di sudut
//      dengan apron dan pengaku H. Itu konstruksi tukang kayu, bukan bistro.
//   2. Meja perlu WILAYAH, bukan ukuran lebih besar. Ukurannya sudah benar
//      terhadap avatar; yang hilang adalah tanah terinjak, batu tepi, dan
//      jalur kedatangan yang membuatnya terbaca sebagai "somewhere".
//   3. Satu tiang lampu tinggi terbaca sebagai LAMPU JALAN. Yang
//      menghangatkan titik kumpul adalah pusat terang yang RENDAH dengan tepi
//      gelap — bukan menambah lampu atau menambah warna oranye.
//
// ── KEPUTUSAN TEKNIS: keterisian kursi TIDAK memakai state server ──
// Posisi tiap pemain sudah disiarkan lewat `player_move`, jadi tiap klien bisa
// menghitung sendiri siapa duduk di kursi mana, dan hasilnya sama di semua
// layar selama aturannya deterministik (lihat `hitungKursi`). Karena itu letak
// kursi juga wajib deterministik — pergeseran "supaya tidak kaku" memakai
// angka TETAP, bukan acak.
// ═══════════════════════════════════════════════════════

const MS = (color, r = 0.75) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: 0.04 });

/**
 * Ukuran nyata, satu unit = satu meter. Meja warung Indonesia rendah dan
 * dingkliknya pendek — itu yang membuat orang duduk membungkuk mendekat,
 * bukan bersandar menjauh seperti kursi kafe.
 */
const SPEK = Object.freeze({
  // Daun: tiga papan bercelah, bukan lingkaran.
  panjangDaun: 1.10,
  lebarDaun: 0.72,
  tinggiMeja: 0.68,
  tebalPapan: 0.035,
  celahPapan: 0.018,

  // Kaki sudut + apron + pengaku H — konstruksi, bukan tiang tengah.
  sisiKaki: 0.06,
  masukKaki: 0.10,
  tinggiApron: 0.11,

  // Dingklik berkaki, dudukan kotak.
  sisiDudukan: 0.28,
  tinggiDingklik: 0.38,
  tebalDudukan: 0.045,
  sisiKakiDingklik: 0.032,
  /** Kaki sedikit membuka — 5°, cukup untuk terbaca sebagai buatan tangan. */
  bukaKakiDeg: 5,

  // Rangka bambu: dua tiang + palang, selebar meja. Memberi siluet tegak
  // tanpa jadi lampu jalan.
  tinggiTiang: 2.32,
  jariTiang: 0.045,
  bentangTiang: 1.80,

  /** Pusat bohlam utama. Rendah, supaya cahayanya turun ke meja dan wajah. */
  tinggiBohlam: 1.80,
  jariTudung: 0.165,
  /** Jarak bohlam pendamping dari pusat palang. */
  jarakPendamping: 0.65,

  // Atap. Tanpa ini rangka dua tiang + palang terbaca sebagai GAWANG atau
  // ayunan taman bermain, bukan warung.
  //
  // ANGKA INI MENIMPA ARAHAN SENI, dengan alasan. Arahan aslinya meminta
  // pelana DANGKAL: nok 2,12 m dan bibir 1,92 m, artinya naik 0,20 m di atas
  // bentang 1,10 m — kemiringan 20°. Dicoba dan dilihat: dari jarak kamera
  // Galantara, kemiringan itu tidak terbaca sama sekali dan atapnya tampak
  // sebagai PAPAN NAMA mendatar — persis siluet yang sedang dihindari.
  //
  // Dibuat curam: naik 0,57 m di atas setengah bentang 0,55 m ≈ 46°. Itu juga
  // yang benar secara budaya — atap Nusantara curam karena hujan, dan riset
  // joglo di docs/RISET_3D_NUSANTARA sudah mencatat proporsi itu. Lebarnya
  // dikurangi 1,95 → 1,60 m supaya terbaca sebagai naungan di atas meja,
  // bukan bentangan papan reklame.
  panjangAtap: 1.90,
  /** Kedalaman atap. Harus benar-benar MENUTUPI meja, bukan sepita di
   *  belakangnya — naungan yang orangnya duduk di luar naungan itu tetap
   *  terbaca sebagai papan di atas tiang. */
  lebarAtap: 1.95,
  tinggiBelakang: 2.30,
  tinggiDepan: 1.72,
  julurAtap: 0.09,
  jumlahKasau: 4,
  panjangPengaku: 0.34,

  // Wilayah: tanah terinjak, jalur kedatangan, batu.
  panjangBidang: 3.40,
  lebarBidang: 2.80,
  /** Bidang dibuat dari poligon tak beraturan, bukan oval. Oval tertutup
   *  terbaca sebagai panggung / kolam sorot lampu, dan itu membuat seluruh
   *  susunan terasa seperti diorama aset — bukan tempat yang terbentuk karena
   *  dipakai. */
  titikBidang: 12,
  simpanganTepi: 0.22,

  lebarJalur: 0.58,
  panjangJalur: 1.70,
  batuTepi: 6,
  batuPijak: 7,

  // Lesehan — dicocokkan dengan tikar GLB (1,60 x 1,20 m) dari Rupa3D.
  lesehanPanjang: 1.60,
  lesehanLebar: 1.20,
  /** Jari-jari lingkar duduk di atas tikar. 0,55 m memberi jarak antar orang
   *  0,95 m pada tiga orang — cukup supaya badan chibi tidak saling tembus,
   *  dan masih di dalam tepi tikar (setengah lebar 0,60 m). */
  lesehanJariDuduk: 0.55,

  /** Lebar badan avatar chibi. Ini ambang KEDUA, terpisah dari toleransi
   *  kursi: `jariKursi * 2` menjaga penetapan kursi tidak ambigu, angka ini
   *  menjaga orangnya tidak saling tembus. Dua pertanyaan berbeda, dan
   *  menjaga yang pertama saja pernah membuat tiga orang di satu tikar
   *  tumpang tindih di layar. */
  lebarBadan: 0.90,
  dulangJari: 0.27,
  dulangTinggi: 0.14,

  // Bangku — mengikuti papan bangku yang sudah ada di BogorSpotRuntime.
  bangkuPanjang: 1.35,
  bangkuDalam: 0.42,
  bangkuTebal: 0.18,
  bangkuTinggiKaki: 0.12,
  /** 0,90 m = lebar badan. Dua orang di papan 1,35 m pas tanpa saling tembus. */
  bangkuJarakDuduk: 0.90,

  // Kafe — mengikuti meja kafe yang sudah ada di BragaSpotRuntime.
  kafeJariDaun: 0.42,
  kafeTinggiMeja: 0.74,
  kafeTinggiDudukan: 0.46,

  /**
   * Jarak titik BERDIRI dari pusat kursi, per gaya.
   *
   * = setengah lebar penghalang kursi + jari-jari kapsul pemain (0,40) + 7 cm.
   * Titik yang lebih dekat akan berada di dalam collider dingklik/kursi dan
   * ditolak uji ruang; titik yang lebih jauh terasa seperti dilempar.
   * Semuanya juga lebih besar dari jariKursi + 0,08 — kalau tidak, orang yang
   * sudah berdiri tetap dihitung duduk oleh klien lain.
   */
  jarakKeluar: { warung: 0.62, lesehan: 0.50, kafe: 0.78, bangku: 0.68 },

  /** Sejauh mana pemain boleh berdiri dari sebuah kursi untuk dihitung
   *  menempatinya. Harus lebih kecil dari SETENGAH jarak kursi terdekat,
   *  kalau tidak satu posisi bisa masuk jangkauan dua kursi. Dijaga oleh
   *  `jarakKursiTerdekat` dan diuji di tests/mejaNongkrong.test.mjs.
   *
   *  Diturunkan dari 0,45 ke 0,34 ketika dua kursi dipindah ke SATU sisi
   *  panjang (lihat _hitungLetakKursi): jaraknya jadi 0,76 m, dan toleransi
   *  lama akan membuat satu posisi masuk jangkauan dua kursi sekaligus. */
  jariKursi: 0.34,
});

/**
 * Gaya meja. Yang berbeda bukan cuma tampilannya — TINGGI DUDUK ikut berbeda,
 * dan itu harus datang dari kursinya, bukan dari konstanta global di Avatar.
 * Orang yang lesehan duduk di lantai; orang di kursi kafe duduk lebih tinggi
 * daripada di dingklik. Satu angka untuk ketiganya akan salah di dua tempat.
 *
 * tinggiDuduk = pergeseran Y badan avatar terhadap posisi berdirinya.
 */
const GAYA = Object.freeze({
  // Meja warung + dingklik 0,38 m. Dasar, dan yang sudah diverifikasi di Oola.
  warung:  { tinggiDuduk: -0.16, jariInteraksiTambahan: 0.75, ikon: '🍵', ajakan: 'ikut nimbrung' },
  // Tikar di tanah. Duduk bersila, badan turun jauh lebih dalam.
  lesehan: { tinggiDuduk: -0.30, jariInteraksiTambahan: 0.70, ikon: '🍵', ajakan: 'ikut lesehan' },
  // Kursi kafe Braga: dudukan 0,46 m, lebih tinggi dari dingklik.
  /**
   * Bangku taman. Geometri sosial yang BERBEDA dari meja: orang duduk
   * BERSEBELAHAN menghadap arah yang sama, bukan berhadapan. Itu bukan
   * penyederhanaan — duduk sebelahan menatap hal yang sama adalah cara
   * berkumpul tersendiri, dan sering justru yang paling nyaman untuk orang
   * yang baru saling kenal.
   */
  bangku:  { tinggiDuduk: -0.33, jariInteraksiTambahan: 1.10, ikon: '🪑', ajakan: 'duduk', menghadapLuar: true },
  // Braga itu kopi, bukan teh. Ikon ikut gayanya, bukan di-hardcode di Game.
  kafe:    { tinggiDuduk: -0.09, jariInteraksiTambahan: 0.85, ikon: '☕', ajakan: 'duduk' },
});

/** Palet: kayu jati tua, bambu, gerabah, dan tanah terinjak. */
const PALET = Object.freeze({
  daun: 0xa8703f,
  tikar: 0xa37637,
  tikarLintang: 0xbd924c,
  bisTikar: 0x603028,
  kursiKafe: 0xe8836b,
  logamKafe: 0x3a3a3a,
  kayuTua: 0x7a4f2a,
  bambu: 0xc9a86a,
  gerabah: 0x9c5b3f,
  logam: 0xb9bec4,
  kain: 0xd8c39a,
  bohlam: 0xffd9a0,
  tanah: 0xa89268,
  jalur: 0x8a6b50,
  batuPijak: 0x756e62,
  batuTepi: 0x747a72,
  atap: 0x806047,
  atapBawah: 0x654a39,
});

export class MejaNongkrong {
  /**
   * @param {{ id: string, x: number, z: number, kursi?: number,
   *           rotasi?: number, nama?: string }} spek
   */
  constructor({ id, x, z, kursi = 4, rotasi = 0, nama = 'Meja Nongkrong', gaya = 'warung' }) {
    this.id = id;
    this.x = x;
    this.z = z;
    this.jumlahKursi = Math.max(2, Math.min(8, kursi));
    this.rotasi = rotasi;
    this.nama = nama;
    this.gaya = GAYA[gaya] ? gaya : 'warung';
    this.spekGaya = GAYA[this.gaya];

    /** @type {THREE.Group | null} */
    this.grup = null;
    /** Bohlam + point light untuk DayNight. Dikumpulkan saat dibangun, bukan
     *  dengan menyapu scene — PRD BAB 2.4. */
    this.lampu = [];
    /** Mesh yang perlu di-dispose saat meja dilepas. */
    this.objek = [];

    this._kursi = this._hitungLetakKursi();
  }

  /**
   * Letak kursi mengelilingi daun PERSEGI PANJANG: satu per sisi, bukan
   * melingkar rata. Dua di antaranya digeser sedikit supaya tidak berbaris
   * presisi — meja warung tidak pernah rapi. Pergeserannya angka TETAP, bukan
   * acak, karena tiap klien harus menghasilkan letak yang sama persis.
   */
  /**
   * Jejak tempat duduk per gaya.
   *
   * Kursi meja warung ada di jari-jari 0,86 m. Memakai angka itu untuk lesehan
   * akan menaruh orang DI LUAR TIKAR yang lebarnya cuma 1,20 m. Jadi jejaknya
   * ikut gayanya.
   */
  _jejak() {
    if (this.gaya === 'lesehan') {
      // Mengelilingi dulang, semuanya masih di atas tikar 1,60 x 1,20.
      return { setengahP: 0.32, setengahL: 0.14, renggang: 0.28 };
    }
    if (this.gaya === 'kafe') {
      return { setengahP: SPEK.kafeJariDaun, setengahL: SPEK.kafeJariDaun, renggang: 0.36 };
    }
    if (this.gaya === 'bangku') {
      return { setengahP: SPEK.bangkuPanjang / 2, setengahL: SPEK.bangkuDalam / 2, renggang: 0 };
    }
    // renggang 0,40 — bukan 0,31. Angka lama menaruh kursi cukup renggang
    // untuk penetapan yang tidak ambigu (0,76 m > 0,68 m) tetapi TERLALU
    // RAPAT untuk badan chibi selebar 0,90 m, sehingga orangnya saling tembus.
    // Lolos uji, gagal di mata. Lihat SPEK.lebarBadan.
    return {
      setengahP: SPEK.panjangDaun / 2,
      setengahL: SPEK.lebarDaun / 2,
      renggang: SPEK.sisiDudukan / 2 + 0.26,
    };
  }

  _hitungLetakKursi() {
    const { setengahP, setengahL, renggang } = this._jejak();

    /**
     * Meja warung: susunan 2 + 1 + 1, BUKAN satu per sisi.
     *
     * Avatar chibi berkepala besar — empat orang tersebar merata di empat sisi
     * akan menutup seluruh daun meja dari kamera atas-serong, berapa pun ukuran
     * mejanya. Dengan satu sisi panjang sengaja DIKOSONGKAN, selalu ada satu
     * tepi meja yang tidak terhalang badan siapa pun.
     *
     * Konsekuensinya dua kursi sesisi hanya berjarak 0,76 m, dan itulah sebabnya
     * toleransi kursi turun ke 0,34 m.
     */
    const polaWarung = [
      { x: 0.48, z: setengahL + renggang },   // sisi jauh, kiri
      { x: -0.48, z: setengahL + renggang },  // sisi jauh, kanan
      { x: setengahP + renggang, z: -0.10 },  // ujung, digeser sedikit
      { x: -(setengahP + renggang), z: -0.06 }, // ujung seberang, digeser juga
    ];

    /**
     * Lesehan: CINCIN mengelilingi dulang.
     *
     * Bukan satu-per-sisi persegi. Tikar 1,60 x 1,20 itu kecil; empat orang
     * satu per sisi memberi jarak terdekat 0,73 m, yang LOLOS invarian
     * penetapan kursi (> 0,68 m) tetapi tetap membuat badan chibi selebar
     * ~0,90 m saling tembus. Terlihat di render, tidak terlihat di uji —
     * karena ujinya menjaga pertanyaan yang berbeda.
     *
     * Cincin jari-jari 0,55 m dengan TIGA orang memberi 0,95 m: lolos
     * dua-duanya, dan tiga orang memang muat wajar di tikar sebesar ini.
     */
    const polaLesehan = Array.from({ length: this.jumlahKursi }, (_, i) => {
      const sudut = (i / this.jumlahKursi) * Math.PI * 2;
      return {
        x: Math.sin(sudut) * SPEK.lesehanJariDuduk,
        z: Math.cos(sudut) * SPEK.lesehanJariDuduk,
      };
    });

    /**
     * Dua kursi harus BERHADAPAN, bukan mengambil dua entri pertama dari pola
     * empat — dua entri pertama meja warung ada di sisi panjang yang SAMA, jadi
     * dua orang akan duduk bersebelahan menatap arah yang sama. Untuk meja kafe
     * dua kursi, berhadapan itu justru intinya.
     */
    const polaBerdua = [
      { x: setengahP + renggang, z: 0 },
      { x: -(setengahP + renggang), z: 0 },
    ];

    /**
      * Bangku: dua tempat bersebelahan di sepanjang papan, jaraknya 0,90 m —
      * tepat lebar badan, dan masih di dalam papan 1,35 m.
      */
    const polaBangku = [
      { x: SPEK.bangkuJarakDuduk / 2, z: 0 },
      { x: -SPEK.bangkuJarakDuduk / 2, z: 0 },
    ];

    const pola = this.gaya === 'bangku'
      ? polaBangku
      : (this.jumlahKursi === 2
        ? polaBerdua
        : (this.gaya === 'warung' ? polaWarung : polaLesehan));

    const out = [];
    const cos = Math.cos(this.rotasi);
    const sin = Math.sin(this.rotasi);

    for (let i = 0; i < this.jumlahKursi; i++) {
      let lx;
      let lz;
      if (this.jumlahKursi <= pola.length && i < pola.length) {
        ({ x: lx, z: lz } = pola[i]);
      } else {
        // Meja bisa diminta lebih dari empat kursi. Selebihnya melingkar di
        // jari-jari yang sama besarnya — tetap deterministik.
        const jari = setengahP + renggang;
        const sudut = (i / this.jumlahKursi) * Math.PI * 2;
        // (deret melingkar untuk jumlah kursi di luar pola bernama)
        lx = Math.sin(sudut) * jari;
        lz = Math.cos(sudut) * jari;
      }

      // DUA sistem koordinat, dan membingungkannya adalah bug yang nyata:
      //   lx/lz — LOKAL dan BELUM diputar. Dipakai menempatkan mesh dingklik
      //           di dalam grup, dan grup itu sendiri sudah diputar rotasi.
      //           Kalau di sini dipakai nilai yang sudah diputar, dingkliknya
      //           kena rotasi dua kali.
      //   x/z   — DUNIA dan SUDAH diputar. Dipakai mendudukkan pemain dan
      //           menghitung keterisian, yang keduanya bekerja di ruang dunia.
      // Arah putaran WAJIB sama dengan Three.js, bukan hasil menebak. Matriks
      // rotasi-Y Three: x' = x·cos + z·sin, z' = -x·sin + z·cos. Rumus
      // kebalikannya mencerminkan letak kursi terhadap dingklik yang digambar,
      // sehingga pemain didudukkan di sebelah bangkunya, bukan di atasnya.
      // Diverifikasi terhadap THREE.Object3D asli di tests/mejaNongkrong.
      const rx = lx * cos + lz * sin;
      const rz = -lx * sin + lz * cos;
      const x = this.x + rx;
      const z = this.z + rz;
      out.push({
        i, x, z, lx, lz,
        // Menghadap pusat untuk meja; menghadap KELUAR (searah) untuk bangku.
        facing: this.spekGaya.menghadapLuar
          ? this.rotasi
          : Math.atan2(this.x - x, this.z - z),
        // Tinggi duduk ikut kursinya, bukan konstanta global.
        tinggiDuduk: this.spekGaya.tinggiDuduk,
        keluar: this._calonKeluar(lx, lz).map(([ex, ez]) => ({
          x: this.x + ex * cos + ez * sin,
          z: this.z - ex * sin + ez * cos,
        })),
      });
    }
    return out;
  }

  /**
   * Calon titik BERDIRI untuk satu kursi, lokal dan belum diputar, BERURUTAN
   * dari yang paling wajar.
   *
   * Orang berdiri dari dingklik dengan MUNDUR menjauhi meja, bukan melompat ke
   * atas meja atau menembus dingklik tetangga. Jadi calon pertama selalu lurus
   * ke belakang dari sisi meja terdekat; baru kalau itu terhalang (tembok,
   * pohon, pemain tidak dihitung) dicoba serong, lalu samping.
   *
   * Titik ini ALASAN BERDIRI memindahkan posisi: keterisian kursi diturunkan
   * dari posisi (ADR-0003), jadi berdiri di tempat berarti klien lain tetap
   * melihat kita duduk. Uji ruang kapsulnya dilakukan pemanggil (Karakter.js),
   * karena hanya dunia fisika yang tahu apa yang ada di sekitar meja.
   *
   * @returns {[number, number][]}
   */
  _calonKeluar(lx, lz) {
    let ux;
    let uz;
    if (this.gaya === 'bangku') {
      // Bangku menghadap +z lokal; berdiri ke depan, ke arah pandangannya.
      ux = 0; uz = 1;
    } else if (this.gaya === 'warung') {
      // Normal sisi daun terdekat — mundur tegak lurus dari tepi meja.
      const { setengahP, setengahL } = this._jejak();
      if (Math.abs(lz) / setengahL >= Math.abs(lx) / setengahP) { ux = 0; uz = Math.sign(lz) || 1; } else { ux = Math.sign(lx) || 1; uz = 0; }
    } else {
      const r = Math.hypot(lx, lz) || 1;
      ux = lx / r; uz = lz / r;
    }
    const d = SPEK.jarakKeluar[this.gaya];
    const sudut = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
    if (this.gaya === 'bangku') sudut.push(Math.PI); // ke belakang bangku, paling akhir
    const out = [];
    for (const jarak of [d, d + 0.3]) {
      for (const a of sudut) {
        const c = Math.cos(a);
        const s = Math.sin(a);
        out.push([lx + (ux * c + uz * s) * jarak, lz + (-ux * s + uz * c) * jarak]);
      }
    }
    return out;
  }

  /**
   * Collider meja ini, dalam koordinat LOKAL grupnya (sebelum diputar).
   * Didaftarkan dengan induk (x, 0, z) dan putarY = rotasi.
   *
   * Volume PERMAINAN, bukan salinan mesh. Dua keputusan yang disengaja:
   *   - Penghalang dimulai dari tanah. Daun meja 0,68 m di atas kaki-kaki
   *     tipis tetap tidak bisa dilewati avatar setinggi 1,30 m, jadi kolong
   *     meja tidak perlu dimodelkan.
   *   - Benda pendek yang tidak boleh DINAIKI diberi volume lebih tinggi dari
   *     mesh-nya: bangku (0,30 m) dan dulang (0,16 m) ada di bawah batas naik
   *     tangga pengendali (0,35 m), jadi tanpa ini pemain berjalan di atasnya.
   * Tikar, bidang tanah, batu pijak, dan atap tidak diberi collider: yang
   * pertama rata dengan tanah, yang terakhir di atas kepala.
   *
   * @returns {object[]} deskriptor kosakata Rupa3D (lihat src/fisika/bentuk.js)
   */
  deskriptorFisika() {
    const out = [];
    if (this.gaya === 'warung') {
      out.push({ bentuk: 'kotak', ukuran: [SPEK.panjangDaun, 0.70, SPEK.lebarDaun], letak: [0, 0.35, 0] });
      for (const k of this._kursi) {
        // 0,60, bukan 0,40 setinggi dudukan: kapsul masih menaiki benda 0,40 m
        // (ambang nyata, lihat Karakter.js PARAM). Pemain yang duduk tidak
        // terpengaruh — kapsulnya dimatikan saat duduk.
        out.push({ bentuk: 'kotak', ukuran: [0.30, 0.60, 0.30], letak: [k.lx, 0.30, k.lz] });
      }
      const zTiang = -(SPEK.lebarDaun / 2 + 0.42);
      for (const x of [SPEK.bentangTiang / 2, -SPEK.bentangTiang / 2]) {
        out.push({ bentuk: 'silinder', ukuran: [0.10, SPEK.tinggiTiang, 0.10], letak: [x, SPEK.tinggiTiang / 2, zTiang] });
      }
    } else if (this.gaya === 'lesehan') {
      out.push({ bentuk: 'silinder', ukuran: [SPEK.dulangJari * 2 + 0.02, 0.60, SPEK.dulangJari * 2 + 0.02], letak: [0, 0.30, 0] });
    } else if (this.gaya === 'kafe') {
      out.push({ bentuk: 'silinder', ukuran: [SPEK.kafeJariDaun * 2, 0.78, SPEK.kafeJariDaun * 2], letak: [0, 0.39, 0] });
      for (const k of this._kursi) {
        // Dudukan jari-jari 0,24 + sandaran di 0,20 m ke luar: satu silinder
        // 0,62 m menutup keduanya.
        out.push({ bentuk: 'silinder', ukuran: [0.62, 0.97, 0.62], letak: [k.lx, 0.485, k.lz] });
      }
    } else if (this.gaya === 'bangku') {
      out.push({ bentuk: 'kotak', ukuran: [SPEK.bangkuPanjang, 0.60, SPEK.bangkuDalam], letak: [0, 0.30, 0] });
    }
    return out;
  }

  /**
   * Daftarkan collider meja ke dunia fisika. Aman sebelum fisika siap
   * (masuk antrean). Pelepasan ikut kelompok pemiliknya (Oola / Spot).
   *
   * @param {import('../fisika/Fisika.js').Fisika | null} fisika
   * @param {string} kelompok
   */
  daftarkanFisika(fisika, kelompok) {
    if (!fisika) return 0;
    return fisika.daftarkan(kelompok, this.deskriptorFisika(), { x: this.x, y: 0, z: this.z }, this.rotasi, this.id);
  }

  /** @returns {{i:number,x:number,z:number,facing:number}[]} */
  get kursi() { return this._kursi; }

  /**
   * Jarak antara dua kursi yang paling berdekatan.
   *
   * Ini bukan angka hias: pemetaan pemain ke kursi hanya tidak ambigu selama
   * `toleransiKursi * 2` lebih kecil daripada nilai ini. Diekspos supaya uji
   * bisa menjaganya walau letak kursi diubah lagi nanti.
   */
  get jarakKursiTerdekat() {
    let min = Infinity;
    for (let a = 0; a < this._kursi.length; a++) {
      for (let b = a + 1; b < this._kursi.length; b++) {
        const d = Math.hypot(
          this._kursi[a].x - this._kursi[b].x,
          this._kursi[a].z - this._kursi[b].z,
        );
        if (d < min) min = d;
      }
    }
    return min;
  }

  get ikon() { return this.spekGaya.ikon; }
  get ajakan() { return this.spekGaya.ajakan; }

  get toleransiKursi() { return SPEK.jariKursi; }

  /** Ambang KEDUA: jarak minimum supaya badan avatar tidak saling tembus.
   *  Berbeda dari toleransiKursi, yang menjaga penetapan kursi tidak ambigu. */
  get lebarBadan() { return SPEK.lebarBadan; }

  /**
   * Radius InteractionVolume. Melingkupi BIDANG tempatnya, bukan cuma mejanya
   * — hint yang baru muncul saat orang sudah berdiri di antara dingklik
   * terlambat untuk jadi ajakan.
   */
  get jariInteraksi() {
    if (this.gaya === 'warung') return SPEK.panjangBidang / 2 + this.spekGaya.jariInteraksiTambahan;
    // Gaya lain tidak punya bidang tanah sendiri; ukurannya dari lingkar kursi.
    const terjauh = Math.max(...this._kursi.map((k) => Math.hypot(k.x - this.x, k.z - this.z)));
    return terjauh + this.spekGaya.jariInteraksiTambahan;
  }

  // ── BANGUN 3D ────────────────────────────────────────
  /** @param {THREE.Object3D} induk */
  bangun(induk) {
    const g = new THREE.Group();
    g.position.set(this.x, 0, this.z);
    g.rotation.y = this.rotasi;

    if (this.gaya === 'warung') {
      this._pasangWilayah(g);
      this._pasangMeja(g);
      this._pasangAtap(g);
      this._pasangDingklik(g);
      this._pasangBendaMeja(g);
      this._pasangRangkaLampu(g);
    } else if (this.gaya === 'lesehan') {
      this._pasangLesehan(g);
    } else if (this.gaya === 'bangku') {
      this._pasangBangku(g);
    } else {
      this._pasangKafe(g);
    }

    induk.add(g);
    this.grup = g;
    return this;
  }

  _catat(g, mesh) { g.add(mesh); this.objek.push(mesh); return mesh; }

  /**
   * Wilayah: tanah terinjak, batu tepi, jalur kedatangan.
   *
   * Inilah yang membuat meja terbaca sebagai TEMPAT dan bukan prop yang
   * tergeletak. Sengaja bukan lingkaran paving rapi — itu justru terasa
   * seperti patio, persis yang sedang dihindari.
   *
   * @param {THREE.Group} g
   */
  _pasangWilayah(g) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sk = new THREE.Vector3();
    const sumbuY = new THREE.Vector3(0, 1, 0);

    // Bidang tanah terinjak — poligon TAK BERATURAN, bukan oval.
    // Oval tertutup terbaca sebagai panggung atau kolam sorot lampu, dan itu
    // membuat seluruh susunan terasa seperti diorama aset. Tepinya menyimpang
    // dengan angka TETAP (bukan acak), dan sisi ke arah jalur sengaja
    // menyempit-terbuka supaya jalur dan bidang terbaca menyatu.
    const simpangan = [0.10, -0.18, 0.22, -0.09, 0.15, -0.22, 0.06, -0.14, 0.19, -0.07, 0.12, -0.20];
    const bentuk = new THREE.Shape();
    const arahJalur = Math.PI * 0.25;
    for (let i = 0; i < SPEK.titikBidang; i++) {
      const a = (i / SPEK.titikBidang) * Math.PI * 2;
      // Selisih sudut ke arah jalur, dinormalkan ke [-π, π].
      let beda = a - arahJalur;
      while (beda > Math.PI) beda -= Math.PI * 2;
      while (beda < -Math.PI) beda += Math.PI * 2;
      // Menyempit di sisi jalur: tanah aus menipis saat menjadi jalan setapak.
      const sempit = Math.abs(beda) < 0.5 ? 0.82 : 1;
      const rx = (SPEK.panjangBidang / 2 + simpangan[i]) * sempit;
      const rz = (SPEK.lebarBidang / 2 + simpangan[(i + 5) % SPEK.titikBidang]) * sempit;
      const x = Math.sin(a) * rx;
      const z = Math.cos(a) * rz;
      // -z: rotation.x = -π/2 memetakan (x, y) bentuk ke (x, 0, -y) dunia,
      // jadi z dibalik di sini supaya takik ke arah jalur tidak tercermin.
      if (i === 0) bentuk.moveTo(x, -z); else bentuk.lineTo(x, -z);
    }
    bentuk.closePath();

    const bidang = new THREE.Mesh(
      new THREE.ShapeGeometry(bentuk),
      new THREE.MeshStandardMaterial({ color: PALET.tanah, roughness: 0.96, metalness: 0 }),
    );
    // ShapeGeometry lahir di bidang XY dengan normal +Z. rotation.x = +π/2
    // memutar normal itu jadi -Y — menghadap TANAH, dan bidangnya tidak
    // pernah terlihat karena backface culling. Harus -π/2.
    bidang.rotation.x = -Math.PI / 2;
    bidang.position.y = 0.012;
    bidang.receiveShadow = true;
    this._catat(g, bidang);

    // Jalur: satu bidang tanah padat yang MENERUS, bukan lima batu terpisah.
    // Batu yang berdiri sendiri terbaca sebagai deretan benda, bukan jalan.
    // Jalur hanya perlu menyentuh tepi bidang lalu memudar, bukan membentang
    // jauh ke padang. Versi sebelumnya sepanjang 3,1 m dan terbaca sebagai
    // landasan pacu, bukan jalan setapak.
    const panjangTotal = SPEK.panjangJalur;
    const jalur = new THREE.Mesh(
      new THREE.PlaneGeometry(SPEK.lebarJalur, panjangTotal),
      new THREE.MeshStandardMaterial({ color: PALET.jalur, roughness: 0.96, metalness: 0 }),
    );
    jalur.rotation.x = -Math.PI / 2;
    jalur.rotation.z = -arahJalur;
    const pusatJalur = SPEK.panjangBidang / 2 * 0.82 + panjangTotal / 2 - 0.45;
    jalur.position.set(Math.sin(arahJalur) * pusatJalur, 0.014, Math.cos(arahJalur) * pusatJalur);
    jalur.receiveShadow = true;
    this._catat(g, jalur);

    // Batu pijak: LEBAR, DATAR, TERTANAM. Hampir rata dengan tanah.
    const imPijak = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 7), MS(PALET.batuPijak, 0.95), SPEK.batuPijak,
    );
    imPijak.name = `${this.id}_batu_pijak`;
    const mulai = SPEK.panjangBidang / 2 * 0.82 + 0.1;
    const kelok = [0.0, 0.07, -0.05, 0.09, -0.03, 0.06, -0.04];
    for (let i = 0; i < SPEK.batuPijak; i++) {
      const jarak = mulai + i * (0.27 + 0.10);
      p.set(
        Math.sin(arahJalur) * jarak + Math.cos(arahJalur) * kelok[i],
        0.020,
        Math.cos(arahJalur) * jarak - Math.sin(arahJalur) * kelok[i],
      );
      q.setFromAxisAngle(sumbuY, arahJalur + (i % 2 ? 0.12 : -0.09));
      sk.set(0.38, 0.020, 0.27);
      m.compose(p, q, sk);
      imPijak.setMatrixAt(i, m);
    }
    imPijak.instanceMatrix.needsUpdate = true;
    g.add(imPijak);
    this.objek.push(imPijak);

    // Batu tepi: KECIL, TINGGI, TERSEBAR — kebalikan dari batu pijak, dan
    // warnanya lebih dingin. Perbedaan itu yang membuat jalur terbaca sebagai
    // jalur dan tepi terbaca sebagai tepi. Sengaja tidak mengelilingi penuh:
    // lingkaran penuh membaca sebagai pembatas taman.
    const imTepi = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1), MS(PALET.batuTepi, 0.95), SPEK.batuTepi,
    );
    imTepi.name = `${this.id}_batu_tepi`;
    const sudutTepi = [1.35, 1.95, 2.55, 3.15, 4.05, 4.75];
    const tinggiTepi = [0.09, 0.07, 0.08, 0.07, 0.09, 0.08];
    sudutTepi.forEach((a, i) => {
      p.set(
        Math.sin(a) * (SPEK.panjangBidang / 2) * 0.92,
        tinggiTepi[i] / 2,
        Math.cos(a) * (SPEK.lebarBidang / 2) * 0.92,
      );
      q.setFromAxisAngle(sumbuY, a * 1.7);
      sk.set(0.23, tinggiTepi[i], 0.13);
      m.compose(p, q, sk);
      imTepi.setMatrixAt(i, m);
    });
    imTepi.instanceMatrix.needsUpdate = true;
    g.add(imTepi);
    this.objek.push(imTepi);
  }

  /** @param {THREE.Group} g */
  _pasangMeja(g) {
    const matDaun = MS(PALET.daun, 0.82);
    const matKayu = MS(PALET.kayuTua, 0.88);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(1, 1, 1);

    // Tiga papan bercelah. Celahnya kecil, tapi itulah yang membedakan meja
    // buatan tukang dari satu lempeng cetakan.
    const lebarPapan = (SPEK.lebarDaun - SPEK.celahPapan * 2) / 3;
    const imPapan = new THREE.InstancedMesh(
      new THREE.BoxGeometry(SPEK.panjangDaun, SPEK.tebalPapan, lebarPapan), matDaun, 3,
    );
    imPapan.name = `${this.id}_papan`;
    imPapan.castShadow = true;
    imPapan.receiveShadow = true;
    for (let i = 0; i < 3; i++) {
      p.set(0, SPEK.tinggiMeja, (i - 1) * (lebarPapan + SPEK.celahPapan));
      m.compose(p, q, s);
      imPapan.setMatrixAt(i, m);
    }
    imPapan.instanceMatrix.needsUpdate = true;
    g.add(imPapan);
    this.objek.push(imPapan);

    // Empat kaki di sudut, masuk 0,10 m dari tepi.
    const tinggiKaki = SPEK.tinggiMeja - SPEK.tebalPapan / 2;
    const kx = SPEK.panjangDaun / 2 - SPEK.masukKaki;
    const kz = SPEK.lebarDaun / 2 - SPEK.masukKaki;
    const imKaki = new THREE.InstancedMesh(
      new THREE.BoxGeometry(SPEK.sisiKaki, tinggiKaki, SPEK.sisiKaki), matKayu, 4,
    );
    imKaki.name = `${this.id}_kaki`;
    imKaki.castShadow = true;
    [[kx, kz], [-kx, kz], [kx, -kz], [-kx, -kz]].forEach(([x, z], i) => {
      p.set(x, tinggiKaki / 2, z);
      m.compose(p, q, s);
      imKaki.setMatrixAt(i, m);
    });
    imKaki.instanceMatrix.needsUpdate = true;
    g.add(imKaki);
    this.objek.push(imKaki);

    // Apron di bawah daun, dua sisi panjang.
    const yApron = SPEK.tinggiMeja - SPEK.tebalPapan / 2 - SPEK.tinggiApron / 2 - 0.005;
    const imApron = new THREE.InstancedMesh(
      new THREE.BoxGeometry(kx * 2 + SPEK.sisiKaki, SPEK.tinggiApron, 0.022), matKayu, 2,
    );
    imApron.name = `${this.id}_apron`;
    [kz, -kz].forEach((z, i) => {
      p.set(0, yApron, z);
      m.compose(p, q, s);
      imApron.setMatrixAt(i, m);
    });
    imApron.instanceMatrix.needsUpdate = true;
    g.add(imApron);
    this.objek.push(imApron);

    // Pengaku H: dua palang samping + satu palang tengah.
    const yPengaku = 0.16;
    const imSisi = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.028, 0.028, kz * 2), matKayu, 2,
    );
    imSisi.name = `${this.id}_pengaku_sisi`;
    [kx, -kx].forEach((x, i) => {
      p.set(x, yPengaku, 0);
      m.compose(p, q, s);
      imSisi.setMatrixAt(i, m);
    });
    imSisi.instanceMatrix.needsUpdate = true;
    g.add(imSisi);
    this.objek.push(imSisi);

    const tengah = new THREE.Mesh(new THREE.BoxGeometry(kx * 2, 0.028, 0.028), matKayu);
    tengah.position.set(0, yPengaku, 0);
    this._catat(g, tengah);
  }

  /**
   * Dingklik berkaki: dudukan KOTAK dengan empat kaki sedikit membuka dan satu
   * palang bawah. Dingklik "jamur" — dudukan bundar di atas satu tiang — itu
   * bangku bar, bukan bangku warung.
   *
   * @param {THREE.Group} g
   */
  _pasangDingklik(g) {
    const n = this.jumlahKursi;
    const matDudukan = MS(PALET.bambu, 0.85);
    const matKaki = MS(PALET.kayuTua, 0.9);

    const imDudukan = new THREE.InstancedMesh(
      new THREE.BoxGeometry(SPEK.sisiDudukan, SPEK.tebalDudukan, SPEK.sisiDudukan), matDudukan, n,
    );
    imDudukan.name = `${this.id}_dudukan`;
    imDudukan.castShadow = true;

    const tinggiKaki = SPEK.tinggiDingklik - SPEK.tebalDudukan;
    const imKaki = new THREE.InstancedMesh(
      new THREE.BoxGeometry(SPEK.sisiKakiDingklik, tinggiKaki, SPEK.sisiKakiDingklik), matKaki, n * 4,
    );
    imKaki.name = `${this.id}_kaki_dingklik`;

    const imPalang = new THREE.InstancedMesh(
      new THREE.BoxGeometry(SPEK.sisiDudukan * 0.78, 0.02, 0.02), matKaki, n,
    );
    imPalang.name = `${this.id}_palang_dingklik`;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(1, 1, 1);
    const sumbuZ = new THREE.Vector3(0, 0, 1);
    const sumbuX = new THREE.Vector3(1, 0, 0);
    const qa = new THREE.Quaternion();
    const qb = new THREE.Quaternion();
    const buka = (SPEK.bukaKakiDeg * Math.PI) / 180;
    const dalam = SPEK.sisiDudukan / 2 - 0.045;

    this._kursi.forEach((k, i) => {
      p.set(k.lx, SPEK.tinggiDingklik - SPEK.tebalDudukan / 2, k.lz);
      m.compose(p, q, s);
      imDudukan.setMatrixAt(i, m);

      // Empat kaki, tiap pasang miring keluar 5°.
      [[dalam, dalam], [-dalam, dalam], [dalam, -dalam], [-dalam, -dalam]]
        .forEach(([ox, oz], j) => {
          p.set(k.lx + ox, tinggiKaki / 2, k.lz + oz);
          qa.setFromAxisAngle(sumbuZ, ox > 0 ? -buka : buka);
          qb.setFromAxisAngle(sumbuX, oz > 0 ? buka : -buka);
          qa.multiply(qb);
          m.compose(p, qa, s);
          imKaki.setMatrixAt(i * 4 + j, m);
        });

      p.set(k.lx, 0.11, k.lz);
      m.compose(p, q, s);
      imPalang.setMatrixAt(i, m);
    });

    imDudukan.instanceMatrix.needsUpdate = true;
    imKaki.instanceMatrix.needsUpdate = true;
    imPalang.instanceMatrix.needsUpdate = true;
    g.add(imDudukan, imKaki, imPalang);
    this.objek.push(imDudukan, imKaki, imPalang);
  }

  /**
   * Benda di atas meja: teko gerabah, dua gelas, satu termos pompa.
   *
   * Termos pompa dipilih daripada menambah banyak cangkir — siluetnya yang
   * paling langsung terbaca sebagai warung tahun 90-an sampai awal 2000-an.
   * Dua gelas, bukan satu per kursi: meja penuh gelas terlihat seperti display,
   * bukan seperti meja yang sedang dipakai.
   *
   * @param {THREE.Group} g
   */
  _pasangBendaMeja(g) {
    const y = SPEK.tinggiMeja + SPEK.tebalPapan / 2;
    const matGerabah = MS(PALET.gerabah, 0.8);
    const matLogam = MS(PALET.logam, 0.45);

    const badan = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), matGerabah);
    badan.scale.y = 0.8;
    badan.position.set(-0.16, y + 0.078, 0.02);
    badan.castShadow = true;
    this._catat(g, badan);

    const tutup = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), matGerabah);
    tutup.position.set(-0.16, y + 0.15, 0.02);
    g.add(tutup);

    const corot = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.12, 7), matGerabah);
    corot.position.set(-0.26, y + 0.095, 0.02);
    corot.rotation.z = Math.PI / 3.1;
    g.add(corot);

    // Termos pompa: badan, pundak, tutup pompa.
    const termos = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.088, 0.235, 12), matLogam);
    termos.position.set(0.30, y + 0.117, -0.06);
    termos.castShadow = true;
    this._catat(g, termos);

    const pundak = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.082, 0.045, 12), matLogam);
    pundak.position.set(0.30, y + 0.257, -0.06);
    g.add(pundak);

    const pompa = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.05, 0.05, 10), matGerabah);
    pompa.position.set(0.30, y + 0.30, -0.06);
    g.add(pompa);

    const imGelas = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.031, 0.026, 0.085, 8), MS(PALET.kain, 0.55), 2,
    );
    imGelas.name = `${this.id}_gelas`;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(1, 1, 1);
    [[0.02, 0.20], [0.12, -0.19]].forEach(([gx, gz], i) => {
      p.set(gx, y + 0.042, gz);
      m.compose(p, q, s);
      imGelas.setMatrixAt(i, m);
    });
    imGelas.instanceMatrix.needsUpdate = true;
    g.add(imGelas);
    this.objek.push(imGelas);
  }

  /**
   * Atap pelana dangkal di atas rangka.
   *
   * Ini perubahan terkecil yang ANDAL mengubah "gawang" menjadi "warung".
   * Papan nama atau gantungan sachet lebih murah, tapi siluet dasarnya tetap
   * dua tiang dan satu palang — yaitu gawang. Yang membedakan warung dari
   * kerangka kosong adalah adanya NAUNGAN.
   *
   * Sengaja polos: tanpa garis merah-putih atau rumbai. Hiasan begitu justru
   * membuatnya terasa seperti aset kios generik.
   *
   * @param {THREE.Group} g
   */
  _pasangAtap(g) {
    // SENGKUAP (satu bidang miring), bukan pelana.
    //
    // Dicoba dua kali sebagai pelana dan dua kali gagal terbaca. Sebabnya
    // bukan hitungan: dari kamera atas-serong Galantara hanya SATU bidang
    // atap yang terlihat, dan satu bidang polos sebesar itu tetap membaca
    // sebagai papan nama — persis siluet yang sedang dihindari. Pelana juga
    // menuntut tiang depan supaya tidak melayang, dan tiang depan berdiri
    // tepat di tempat orang duduk.
    //
    // Sengkuap menyelesaikan ketiganya sekaligus: ia ditopang dua tiang
    // belakang yang sudah ada, menjulur ke depan menaungi meja, dan
    // kemiringannya terbaca karena tepi depannya jelas lebih rendah daripada
    // tepi belakang. Ini juga bentuk yang paling lazim untuk warung dan kaki
    // lima — bukan penyederhanaan, melainkan yang benar.
    const zBelakang = -(SPEK.lebarDaun / 2 + 0.42);
    const zDepan = zBelakang + SPEK.lebarAtap;
    const naik = SPEK.tinggiBelakang - SPEK.tinggiDepan;
    const sudut = Math.atan2(naik, SPEK.lebarAtap);
    const panjangMiring = Math.hypot(naik, SPEK.lebarAtap);

    const matAtap = MS(PALET.atap, 0.9);
    const matBawah = MS(PALET.atapBawah, 0.95);

    const bidang = new THREE.Mesh(
      new THREE.BoxGeometry(SPEK.panjangAtap + SPEK.julurAtap * 2, 0.04, panjangMiring),
      matAtap,
    );
    bidang.rotation.x = sudut;
    bidang.position.set(
      0,
      (SPEK.tinggiBelakang + SPEK.tinggiDepan) / 2,
      (zBelakang + zDepan) / 2,
    );
    bidang.castShadow = true;
    this._catat(g, bidang);

    // Kasau yang TERLIHAT di bawah atap. Tanpa ini bawah atap cuma satu bidang
    // rata dan tetap membaca sebagai lempeng, bukan bangunan.
    const imKasau = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.045, 0.045, panjangMiring * 0.96), matBawah, SPEK.jumlahKasau,
    );
    imKasau.name = `${this.id}_kasau`;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sk = new THREE.Vector3(1, 1, 1);
    const sumbuX = new THREE.Vector3(1, 0, 0);
    q.setFromAxisAngle(sumbuX, sudut);
    for (let i = 0; i < SPEK.jumlahKasau; i++) {
      const t = (i + 0.5) / SPEK.jumlahKasau;   // rata, tanpa menyentuh tepi
      const x = (t - 0.5) * SPEK.panjangAtap;
      p.set(x, (SPEK.tinggiBelakang + SPEK.tinggiDepan) / 2 - 0.045, (zBelakang + zDepan) / 2);
      m.compose(p, q, sk);
      imKasau.setMatrixAt(i, m);
    }
    imKasau.instanceMatrix.needsUpdate = true;
    g.add(imKasau);
    this.objek.push(imKasau);

    // Dua pengaku diagonal di sudut atas tiang — tanpa ini tiangnya masih
    // terbaca sebagai batang lurus yang kebetulan ada atapnya.
    const imPengaku = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.03, SPEK.panjangPengaku, 0.03), matBawah, 2,
    );
    imPengaku.name = `${this.id}_pengaku_atap`;
    const setengahBentang = SPEK.bentangTiang / 2;
    const sumbuZ = new THREE.Vector3(0, 0, 1);
    [setengahBentang, -setengahBentang].forEach((x, i) => {
      const dalam = x > 0 ? -1 : 1;
      p.set(
        x + dalam * SPEK.panjangPengaku * 0.35,
        SPEK.tinggiTiang - 0.06 - SPEK.panjangPengaku * 0.35,
        zBelakang,
      );
      q.setFromAxisAngle(sumbuZ, dalam * Math.PI / 4);
      m.compose(p, q, sk);
      imPengaku.setMatrixAt(i, m);
    });
    imPengaku.instanceMatrix.needsUpdate = true;
    g.add(imPengaku);
    this.objek.push(imPengaku);
  }

  /**
   * Rangka bambu + tiga titik cahaya.
   *
   * Satu tiang tinggi tunggal terbaca sebagai lampu jalan: ia menerangi tanah,
   * bukan menaungi meja. Rangka dua tiang selebar meja memberi siluet tegak
   * yang MEMILIKI mejanya.
   *
   * Rasa hangat datang dari pusat terang yang rendah dengan tepi gelap — bukan
   * dari menambah lampu atau menambah oranye. Karena itu lampu utama
   * menggantung di 1,80 m dengan tudung yang menutup ke atas, dua pendamping
   * hanya 30% terangnya, dan jangkauan cahayanya sengaja habis sebelum tepi
   * bidang supaya tempat ini jadi pulau terang di tanah yang gelap.
   *
   * @param {THREE.Group} g
   */
  _pasangRangkaLampu(g) {
    const matBambu = MS(PALET.bambu, 0.8);
    const matIkat = MS(PALET.kayuTua, 0.9);
    const setengah = SPEK.bentangTiang / 2;
    const zTiang = -(SPEK.lebarDaun / 2 + 0.42);
    const yPalang = SPEK.tinggiTiang - 0.06;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3(1, 1, 1);

    const imTiang = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(SPEK.jariTiang, SPEK.jariTiang * 1.1, SPEK.tinggiTiang, 8),
      matBambu, 2,
    );
    imTiang.name = `${this.id}_tiang`;
    imTiang.castShadow = true;
    [setengah, -setengah].forEach((x, i) => {
      p.set(x, SPEK.tinggiTiang / 2, zTiang);
      m.compose(p, q, s);
      imTiang.setMatrixAt(i, m);
    });
    imTiang.instanceMatrix.needsUpdate = true;
    g.add(imTiang);
    this.objek.push(imTiang);

    const palang = new THREE.Mesh(
      new THREE.CylinderGeometry(SPEK.jariTiang * 0.85, SPEK.jariTiang * 0.85, SPEK.bentangTiang + 0.16, 8),
      matBambu,
    );
    palang.rotation.z = Math.PI / 2;
    palang.position.set(0, yPalang, zTiang);
    this._catat(g, palang);

    // Ikatan tali di dua sambungan — detail kecil yang membuatnya terbaca
    // sebagai bambu diikat, bukan pipa dilas.
    const imIkat = new THREE.InstancedMesh(
      new THREE.TorusGeometry(SPEK.jariTiang * 1.35, 0.012, 5, 10), matIkat, 2,
    );
    imIkat.name = `${this.id}_ikat`;
    const sumbuX = new THREE.Vector3(1, 0, 0);
    [setengah, -setengah].forEach((x, i) => {
      p.set(x, yPalang, zTiang);
      q.setFromAxisAngle(sumbuX, Math.PI / 2);
      m.compose(p, q, s);
      imIkat.setMatrixAt(i, m);
    });
    imIkat.instanceMatrix.needsUpdate = true;
    g.add(imIkat);
    this.objek.push(imIkat);

    // Lengan pendek yang membawa lampu utama ke ATAS MEJA, bukan di atas tiang.
    const panjangLengan = Math.abs(zTiang) * 0.9;
    const lengan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, panjangLengan, 6), matBambu,
    );
    lengan.rotation.x = Math.PI / 2;
    lengan.position.set(0, yPalang, zTiang + panjangLengan / 2);
    this._catat(g, lengan);

    const kabel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, yPalang - SPEK.tinggiBohlam, 5), matIkat,
    );
    kabel.position.set(0, (yPalang + SPEK.tinggiBohlam) / 2, 0);
    g.add(kabel);

    const buatBohlam = (x, z, jariTudung, kuat, jangkau) => {
      const tudung = new THREE.Mesh(
        new THREE.CylinderGeometry(jariTudung * 0.36, jariTudung, jariTudung * 0.85, 12, 1, true),
        new THREE.MeshStandardMaterial({ color: PALET.kayuTua, roughness: 0.85, side: THREE.DoubleSide }),
      );
      tudung.position.set(x, SPEK.tinggiBohlam + jariTudung * 0.5, z);
      this._catat(g, tudung);

      const bohlam = new THREE.Mesh(
        new THREE.SphereGeometry(jariTudung * 0.34, 9, 7),
        new THREE.MeshStandardMaterial({
          color: PALET.bohlam,
          emissive: new THREE.Color(PALET.bohlam),
          emissiveIntensity: 0,
          roughness: 0.35,
        }),
      );
      bohlam.position.set(x, SPEK.tinggiBohlam, z);
      bohlam.userData.isLampu = true;
      // Bohlam pendamping juga harus terlihat lebih redup, bukan cuma
      // cahayanya — kalau tidak, tiga bola sama terang tetap membaca sebagai
      // deretan lampu hias.
      bohlam.userData.kuatRelatif = kuat;
      g.add(bohlam);

      // decay 2 + jangkauan pendek: cahayanya habis sebelum tepi bidang.
      const cahaya = new THREE.PointLight(PALET.bohlam, 0, jangkau, 2);
      cahaya.position.copy(bohlam.position);
      cahaya.userData.isLampu = true;
      cahaya.userData.kuatRelatif = kuat;
      g.add(cahaya);

      this.lampu.push(bohlam, cahaya);
    };

    buatBohlam(0, 0, SPEK.jariTudung, 1, 2.35);
    buatBohlam(SPEK.jarakPendamping, zTiang * 0.55, SPEK.jariTudung * 0.55, 0.3, 1.55);
    buatBohlam(-SPEK.jarakPendamping, zTiang * 0.55, SPEK.jariTudung * 0.55, 0.3, 1.55);
  }

  /**
   * LESEHAN — tikar digelar di tanah, satu dulang rendah, orang duduk bersila.
   *
   * Tikarnya GLB dari Rupa3D (`assets/models/tikar_pandan.glb`), bukan kotak
   * pipih. Yang digantikan adalah balok 1,60 x 0,06 x 1,20 di Malioboro:
   * 6 cm itu tebal PAPAN, tikar pandan sekitar 8 mm. Dan yang membuat sesuatu
   * terbaca sebagai tikar bukan tebalnya, melainkan ANYAMANNYA — bilah
   * bersilangan dua arah pada tinggi berbeda supaya ada bayangan di tiap
   * persilangan.
   *
   * Kalau GLB-nya gagal dimuat, tikar sementara dari geometri dipakai supaya
   * tempatnya tetap ada dan tetap bisa diduduki. Lebih baik tikar sederhana
   * daripada orang duduk di udara.
   *
   * @param {THREE.Group} g
   */
  _pasangLesehan(g) {
    const P = SPEK.lesehanPanjang;
    const L = SPEK.lesehanLebar;

    const sementara = new THREE.Mesh(
      new THREE.BoxGeometry(P, 0.016, L),
      MS(PALET.tikar, 0.94),
    );
    sementara.position.y = 0.008;
    sementara.receiveShadow = true;
    this._catat(g, sementara);
    this._tikarSementara = sementara;

    // GLTFLoader dimuat lewat script tag yang sama dengan THREE (r128 global).
    const Pemuat = THREE.GLTFLoader;
    if (typeof Pemuat === 'function') {
      new Pemuat().load(
        'assets/models/tikar_pandan.glb',
        (hasil) => {
          if (!this.grup) return;           // meja sudah dilepas sebelum GLB tiba
          const tikar = hasil.scene;
          tikar.position.y = 0.002;
          this.grup.add(tikar);
          this._tikarGlb = tikar;
          // Kumpulkan mesh GLB ke daftar dispose. Ditelusuri SEKALI di sini,
          // saat objeknya masih di tangan — bukan dengan menyapu scene nanti
          // (PRD BAB 2.4). Tumpukan manual, bukan .traverse(), mengikuti pola
          // yang sudah dipakai World.disposeContent.
          const tumpuk = [tikar];
          while (tumpuk.length) {
            const o = tumpuk.pop();
            if (o.isMesh) this.objek.push(o);
            if (o.children?.length) tumpuk.push(...o.children);
          }
          // Tikar sementara baru dilepas SETELAH penggantinya benar-benar ada,
          // supaya tidak pernah ada frame tanpa tikar sama sekali.
          sementara.visible = false;
        },
        undefined,
        () => { /* biarkan tikar sementara; tempatnya tetap bisa dipakai */ },
      );
    }

    // Dulang rendah di tengah — permukaan taruh gelas, bukan meja makan.
    const dulang = new THREE.Mesh(
      new THREE.CylinderGeometry(SPEK.dulangJari, SPEK.dulangJari * 0.88, SPEK.dulangTinggi, 14),
      MS(PALET.daun, 0.82),
    );
    dulang.position.y = SPEK.dulangTinggi / 2 + 0.016;
    dulang.castShadow = true;
    this._catat(g, dulang);

    const teko = new THREE.Mesh(new THREE.SphereGeometry(0.085, 9, 7), MS(PALET.gerabah, 0.8));
    teko.scale.y = 0.78;
    teko.position.set(0, SPEK.dulangTinggi + 0.08, 0);
    this._catat(g, teko);

    const imGelas = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.029, 0.024, 0.075, 8), MS(PALET.kain, 0.55), 2,
    );
    imGelas.name = `${this.id}_gelas_lesehan`;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sk = new THREE.Vector3(1, 1, 1);
    [[0.17, 0.09], [-0.15, -0.11]].forEach(([gx, gz], i) => {
      p.set(gx, SPEK.dulangTinggi + 0.054, gz);
      m.compose(p, q, sk);
      imGelas.setMatrixAt(i, m);
    });
    imGelas.instanceMatrix.needsUpdate = true;
    g.add(imGelas);
    this.objek.push(imGelas);
  }

  /**
   * BANGKU — papan kayu di atas dua kaki. Sengaja polos.
   *
   * Mengikuti papan yang sudah ada di BogorSpotRuntime supaya tidak ada dua
   * bahasa visual untuk benda yang sama; bedanya, yang ini bisa diduduki.
   *
   * @param {THREE.Group} g
   */
  _pasangBangku(g) {
    const papan = new THREE.Mesh(
      new THREE.BoxGeometry(SPEK.bangkuPanjang, SPEK.bangkuTebal, SPEK.bangkuDalam),
      MS(PALET.kayuTua, 0.88),
    );
    papan.position.y = SPEK.bangkuTinggiKaki + SPEK.bangkuTebal / 2;
    papan.castShadow = true;
    this._catat(g, papan);

    const imKaki = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.09, SPEK.bangkuTinggiKaki, SPEK.bangkuDalam * 0.8),
      MS(PALET.kayuTua, 0.92), 2,
    );
    imKaki.name = `${this.id}_kaki_bangku`;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sk = new THREE.Vector3(1, 1, 1);
    [SPEK.bangkuPanjang / 2 - 0.14, -(SPEK.bangkuPanjang / 2 - 0.14)].forEach((x, i) => {
      p.set(x, SPEK.bangkuTinggiKaki / 2, 0);
      m.compose(p, q, sk);
      imKaki.setMatrixAt(i, m);
    });
    imKaki.instanceMatrix.needsUpdate = true;
    g.add(imKaki);
    this.objek.push(imKaki);
  }

  /**
   * KAFE — meja bundar berkaki tunggal + dua kursi bersandaran.
   *
   * Bentuk ini SENGAJA bahasa kafe, bukan warung: Braga art deco memang
   * budaya kafe trotoar, dan memaksakan dingklik warung di sana akan salah
   * tempat. Geometrinya mengikuti meja kafe yang sudah ada di
   * BragaSpotRuntime supaya tidak ada dua bahasa visual di satu Spot.
   *
   * @param {THREE.Group} g
   */
  _pasangKafe(g) {
    const daun = new THREE.Mesh(
      new THREE.CylinderGeometry(SPEK.kafeJariDaun, SPEK.kafeJariDaun * 0.86, 0.08, 14),
      MS(PALET.daun, 0.82),
    );
    daun.position.y = SPEK.kafeTinggiMeja;
    daun.castShadow = true;
    this._catat(g, daun);

    const kaki = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.09, SPEK.kafeTinggiMeja - 0.04, 10),
      MS(PALET.logamKafe, 0.7),
    );
    kaki.position.y = (SPEK.kafeTinggiMeja - 0.04) / 2;
    this._catat(g, kaki);

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sk = new THREE.Vector3(1, 1, 1);
    const sumbuY = new THREE.Vector3(0, 1, 0);
    const n = this._kursi.length;

    const imDudukan = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.24, 0.21, 0.08, 10), MS(PALET.kursiKafe, 0.84), n,
    );
    imDudukan.name = `${this.id}_dudukan_kafe`;
    imDudukan.castShadow = true;

    const imSandaran = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.42, 0.5, 0.06), MS(PALET.kursiKafe, 0.84), n,
    );
    imSandaran.name = `${this.id}_sandaran_kafe`;

    this._kursi.forEach((k, i) => {
      p.set(k.lx, SPEK.kafeTinggiDudukan, k.lz);
      m.compose(p, q, sk);
      imDudukan.setMatrixAt(i, m);

      // Sandaran di sisi LUAR kursi, menghadap meja — arah keluar dari pusat.
      const jarak = Math.hypot(k.lx, k.lz) || 1;
      const ux = k.lx / jarak;
      const uz = k.lz / jarak;
      p.set(k.lx + ux * 0.2, SPEK.kafeTinggiDudukan + 0.26, k.lz + uz * 0.2);
      q.setFromAxisAngle(sumbuY, Math.atan2(ux, uz) + Math.PI / 2);
      m.compose(p, q, sk);
      imSandaran.setMatrixAt(i, m);
      q.identity();
    });

    imDudukan.instanceMatrix.needsUpdate = true;
    imSandaran.instanceMatrix.needsUpdate = true;
    g.add(imDudukan, imSandaran);
    this.objek.push(imDudukan, imSandaran);
  }

  // ── KETERISIAN ───────────────────────────────────────
  /**
   * Petakan pemain ke kursi. Deterministik: pasangan (pemain, kursi) yang
   * jaraknya paling dekat menang lebih dulu, seri dipatahkan oleh kunci pemain
   * yang sudah terurut. Dengan begitu setiap klien menghasilkan peta yang sama
   * dari data posisi yang sama, tanpa perlu server memutuskan.
   *
   * @param {{kunci: string, nama: string, x: number, z: number}[]} pemain
   * @returns {({kunci: string, nama: string} | null)[]} per indeks kursi
   */
  hitungKursi(pemain) {
    const hasil = new Array(this.jumlahKursi).fill(null);
    if (!pemain?.length) return hasil;

    const batas = SPEK.jariKursi * SPEK.jariKursi;
    const calon = [];
    for (const p of pemain) {
      for (const k of this._kursi) {
        const dx = p.x - k.x;
        const dz = p.z - k.z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= batas) calon.push({ d2, kursi: k.i, p });
      }
    }
    calon.sort((a, b) => (a.d2 - b.d2) || (a.p.kunci < b.p.kunci ? -1 : 1));

    const terpakai = new Set();
    for (const c of calon) {
      if (hasil[c.kursi] || terpakai.has(c.p.kunci)) continue;
      hasil[c.kursi] = { kunci: c.p.kunci, nama: c.p.nama };
      terpakai.add(c.p.kunci);
    }
    return hasil;
  }

  /**
   * Kursi kosong terdekat dari sebuah posisi, supaya "ikut nimbrung"
   * mendudukkan orang di tempat yang masuk akal — bukan di seberang meja.
   *
   * @param {{x:number,z:number}} pos
   * @param {({kunci:string}|null)[]} terisi hasil hitungKursi
   */
  kursiKosongTerdekat(pos, terisi) {
    let pilih = null;
    let terdekat = Infinity;
    for (const k of this._kursi) {
      if (terisi?.[k.i]) continue;
      const dx = pos.x - k.x;
      const dz = pos.z - k.z;
      const d = dx * dx + dz * dz;
      if (d < terdekat) { terdekat = d; pilih = k; }
    }
    return pilih;
  }

  getLampu() { return this.lampu; }

  dispose() {
    if (!this.grup) return;
    // Tanpa scene.traverse: yang dilepas adalah yang dicatat saat dibangun.
    for (const o of this.objek) {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m?.dispose?.());
    }
    this.grup.parent?.remove(this.grup);
    this.grup = null;
    this.objek = [];
    this.lampu = [];
  }
}

export { SPEK as SPEK_MEJA };
