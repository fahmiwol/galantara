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

/** Palet: kayu jati tua, bambu, gerabah, dan tanah terinjak. */
const PALET = Object.freeze({
  daun: 0xa8703f,
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
  constructor({ id, x, z, kursi = 4, rotasi = 0, nama = 'Meja Nongkrong' }) {
    this.id = id;
    this.x = x;
    this.z = z;
    this.jumlahKursi = Math.max(2, Math.min(8, kursi));
    this.rotasi = rotasi;
    this.nama = nama;

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
  _hitungLetakKursi() {
    const setengahP = SPEK.panjangDaun / 2;
    const setengahL = SPEK.lebarDaun / 2;
    const renggang = SPEK.sisiDudukan / 2 + 0.17;

    /**
     * Titik lokal sebelum diputar — susunannya 2 + 1 + 1, BUKAN satu per sisi.
     *
     * Avatar Galantara chibi: kepalanya besar, jadi empat orang tersebar merata
     * di empat sisi akan menutup seluruh daun meja dari kamera atas-serong,
     * berapa pun ukuran mejanya. Dengan satu sisi panjang sengaja DIKOSONGKAN,
     * selalu ada satu tepi meja yang tidak terhalang badan siapa pun.
     *
     * Dua kursi di sisi yang sama membuat jaraknya cuma 0,76 m — itulah
     * sebabnya toleransi kursi ikut diturunkan ke 0,34 m.
     */
    const dasar = [
      { x: 0.38, z: setengahL + renggang },   // sisi jauh, kiri
      { x: -0.38, z: setengahL + renggang },  // sisi jauh, kanan
      { x: setengahP + renggang, z: -0.10 },  // ujung, digeser sedikit
      { x: -(setengahP + renggang), z: 0 },   // ujung seberang
    ];

    const out = [];
    const cos = Math.cos(this.rotasi);
    const sin = Math.sin(this.rotasi);

    for (let i = 0; i < this.jumlahKursi; i++) {
      let lx;
      let lz;
      if (this.jumlahKursi <= dasar.length && i < dasar.length) {
        ({ x: lx, z: lz } = dasar[i]);
      } else {
        // Meja bisa diminta lebih dari empat kursi. Selebihnya melingkar di
        // jari-jari yang sama besarnya — tetap deterministik.
        const jari = setengahP + renggang;
        const sudut = (i / this.jumlahKursi) * Math.PI * 2;
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
      out.push({ i, x, z, lx, lz, facing: Math.atan2(this.x - x, this.z - z) });
    }
    return out;
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

  get toleransiKursi() { return SPEK.jariKursi; }

  /**
   * Radius InteractionVolume. Melingkupi BIDANG tempatnya, bukan cuma mejanya
   * — hint yang baru muncul saat orang sudah berdiri di antara dingklik
   * terlambat untuk jadi ajakan.
   */
  get jariInteraksi() { return SPEK.panjangBidang / 2 + 0.75; }

  // ── BANGUN 3D ────────────────────────────────────────
  /** @param {THREE.Object3D} induk */
  bangun(induk) {
    const g = new THREE.Group();
    g.position.set(this.x, 0, this.z);
    g.rotation.y = this.rotasi;

    this._pasangWilayah(g);
    this._pasangMeja(g);
    this._pasangAtap(g);
    this._pasangDingklik(g);
    this._pasangBendaMeja(g);
    this._pasangRangkaLampu(g);

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
