// ═══════════════════════════════════════════════════════
// BragaSpotRuntime.js — Spot Bandung: ruko art deco + kafe trotoar
// Pola sama Monas/Malioboro/Losari/Kuta.
// Palet PRD BAB 4.2 — Abu-biru primer, Teal sekunder, Coral aksen.
// Dasar bentuk: docs/RISET_3D_NUSANTARA.md §14.
//
// Ini Spot NONGKRONG, dan itu sengaja. PRD BAB 1.5 menaruh Galantara
// sebagai "ruang digital yang merepresentasikan budaya berkumpul Indonesia
// — dari ngobrol di warung kopi ... sampai nongkrong di pinggir jalan".
// Braga adalah tempat paling tepat untuk itu: sumbernya menyebut deretan
// kafe klasik dan trotoar yang ditata ramah pejalan kaki.
// ═══════════════════════════════════════════════════════

import { dindingPersegi } from '../../fisika/Fisika.js';
import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { MejaNongkrong } from '../MejaNongkrong.js';
import { animateSpotWarpPortal, createSpotWarpPortal, FISIKA_ALAS_PORTAL } from '../spotWarpPortal.js';

// THREE global — jangan `import 'three'`; klien memuatnya lewat tag script.
const MS = (color, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });

const PALET = {
  aspal:    0x4a5560,   // badan jalan
  trotoar:  0x8d9aa5,   // abu-biru — PRIMER PRD, dan trotoar memang dominan di sini
  garis:    0xa9b6c0,
  ruko1:    0xd9d3c6,   // plester krem kolonial
  ruko2:    0xc3ccc9,
  ruko3:    0xd6c8bd,
  aksenTeal: 0x2e8b84,  // teal — SEKUNDER PRD, di kanopi & kusen
  coral:    0xe8836b,   // coral — AKSEN PRD, dipakai HEMAT (tenda kafe saja)
  kayu:     0x54402e,
  kaca:     0xffd9a0,   // lampu jalan klasik
  atap:     0x6b5a4a,
};

// Braga adalah JALAN, seperti Malioboro — tapi arsitekturnya kebalikan:
// deret ruko masif dua-tiga lantai, bukan kios terbuka.
// Diekspor supaya uji menghitung batas permukaan dari angka yang sama dengan
// yang membangunnya, bukan mengetik ulang.
export const JALAN_PANJANG = 36;
export const JALAN_LEBAR = 8;          // badan jalan
export const TROTOAR_LEBAR = 4.2;      // sengaja LEBAR: sumber menyebut penataan
                                       // trotoar yang ramah pejalan kaki sebagai ciri.
/** Lebar alas yang bisa diinjak: jalan + dua trotoar. */
export const TOTAL_LEBAR = JALAN_LEBAR + TROTOAR_LEBAR * 2;

/**
 * Kepala lampu jalan yang diberi PointLight: [indeks sepanjang jalan, sisi].
 * Alasannya di bagian lampu dalam `mount`.
 */
const LAMPU_BERCAHAYA = Object.freeze([[1, -1], [2, 1], [3, -1]]);

export class BragaSpotRuntime {
  constructor() {
    /** @type {THREE.Group} */
    this.root = new THREE.Group();
    this.root.name = 'spot:braga';
    /** @type {THREE.Mesh[]} */
    this.raycastMeshes = [];
    /** @type {THREE.Object3D[]} */
    this._lampu = [];
    /** @type {THREE.Mesh | null} */
    this._warpRing = null;
    /** @type {InteractionVolume[]} */
    this.interactionVolumes = [];
    /** Social node Spot ini — dibaca Game untuk keterisian kursi.
     *  @type {MejaNongkrong[]} */
    this.meja = [];
    /**
     * Unsur BERULANG dikumpulkan sebagai transform dulu, lalu digambar
     * sekali lewat InstancedMesh. Versi pertama membuat satu mesh untuk tiap
     * alur, kusen, dan lengkung — hasilnya 254 mesh untuk satu Spot,
     * TIGA KALI lipat Spot terpadat berikutnya (Kuta 81). Tiap mesh satu
     * draw call, dan target kita HP kelas menengah.
     * @type {{alur: THREE.Matrix4[], kusen: THREE.Matrix4[], lengkung: THREE.Matrix4[]}}
     */
    this._ulang = { alur: [], kusen: [], lengkung: [] };
    /**
     * Spot ini menyatakan tanah dan batas fisikanya sendiri. Dibaca Game
     * sesudah mount: kalau true, tanah datar + cincin 17 m bawaan tidak dipasang.
     */
    this.fisikaTanah = false;
    /** @type {import('../../fisika/Fisika.js').Fisika | null} */
    this._fisika = null;
    /** @type {string | undefined} */
    this._kelompokFisika = undefined;
  }

  /**
   * Daftarkan collider ke kelompok fisika Spot. Aman tanpa fisika (no-op) dan
   * sebelum fisika siap (masuk antrean Fisika). Dilepas Game sekelompok utuh
   * saat warp — runtime tidak melepasnya sendiri.
   */
  _daftarFisika(deskriptor, induk, putarY = 0, pemilik = 'braga') {
    this._fisika?.daftarkan(this._kelompokFisika, deskriptor, induk, putarY, pemilik);
  }

  /**
   * Satu ruko art deco. Yang membuatnya terbaca art deco, menurut sumber:
   * garis-garis GEOMETRIS, jendela LENGKUNG, balkon, dan tekstur batu.
   * Bukan ornamen rumit — art deco justru bicara lewat garis dan susun.
   *
   * @param {number} lantai 2 atau 3 — sumber menyebut ruko dua sampai tiga lantai
   * @param {string} nama nama grup dan pemilik collider, mis. `braga_ruko_barat_1`
   */
  _ruko(g, x, z, lebar, lantai, warna, hadap, nama) {
    const r = new THREE.Group();
    r.name = nama;
    // Transform grup dipasang DULU: collider di bawah membaca posisi dan
    // putaran yang sama persis dengan yang dipakai mesh-nya.
    r.position.set(x, 0, z);
    if (hadap < 0) r.rotation.y = Math.PI;
    const TINGGI_LANTAI = 2.5;
    const DALAM = 5.0;
    /** Kaca etalase menempel di muka: pusatnya 6 cm di depan badan, tebal 10 cm. */
    const ETALASE_MAJU = 0.06;
    const ETALASE_TEBAL = 0.1;
    const tinggi = lantai * TINGGI_LANTAI;

    const badan = new THREE.Mesh(
      new THREE.BoxGeometry(lebar, tinggi, DALAM),
      MS(warna, 0.9),
    );
    badan.name = `${nama}_badan`;
    badan.position.y = tinggi / 2;
    badan.castShadow = true;
    badan.receiveShadow = true;
    r.add(badan);

    // Lis horizontal antar lantai — garis geometris, ciri art deco.
    for (let i = 1; i < lantai; i += 1) {
      const lis = new THREE.Mesh(
        new THREE.BoxGeometry(lebar + 0.16, 0.18, DALAM + 0.16),
        MS(PALET.aksenTeal, 0.85),
      );
      lis.position.y = i * TINGGI_LANTAI;
      r.add(lis);
    }

    // Mahkota bertingkat (stepped parapet) — tanda art deco paling cepat
    // terbaca dari kamera orbit, karena ia mengubah SILUET atas.
    for (let i = 0; i < 3; i += 1) {
      const w = lebar * (0.86 - i * 0.22);
      const mahkota = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.34, DALAM * 0.5),
        MS(warna, 0.88),
      );
      mahkota.position.set(0, tinggi + 0.17 + i * 0.34, -DALAM * 0.2);
      mahkota.castShadow = true;
      r.add(mahkota);
    }

    // Alur vertikal (fluting) di muka — geometris, murah, dan berulang.
    const kolom = Math.max(3, Math.round(lebar / 1.3));
    for (let i = 0; i < kolom; i += 1) {
      // Geometri satuan 1x1x1 diskalakan lewat matriks — instansinya berbagi
      // satu geometri, jadi tingginya harus masuk ke skala, bukan ke geometri.
      this._ulang.alur.push(this._matriks(
        -lebar / 2 + (i + 0.5) * (lebar / kolom), tinggi * 0.52,
        hadap * (DALAM / 2 + 0.05),
        0.13, tinggi * 0.82, 0.1, x, z, hadap,
      ));
    }

    // Jendela LENGKUNG di lantai atas — disebut sumber sebagai ciri.
    for (let lt = 1; lt < lantai; lt += 1) {
      const n = Math.max(2, Math.round(lebar / 1.9));
      for (let i = 0; i < n; i += 1) {
        const jx = -lebar / 2 + (i + 0.5) * (lebar / n);
        const jy = lt * TINGGI_LANTAI + TINGGI_LANTAI * 0.52;
        this._ulang.kusen.push(this._matriks(
          jx, jy, hadap * (DALAM / 2 + 0.06), 0.78, 1.05, 0.09, x, z, hadap,
        ));
        this._ulang.lengkung.push(this._matriks(
          jx, jy + 0.52, hadap * (DALAM / 2 + 0.06), 1, 1, 1, x, z, hadap,
        ));
      }
    }

    // Lantai dasar = ruang usaha. Sumber menyebut inilah yang dominan:
    // ruko yang lantai bawahnya toko, kafe, restoran, galeri.
    const etalase = new THREE.Mesh(
      new THREE.BoxGeometry(lebar * 0.78, 1.5, ETALASE_TEBAL),
      MS(0x3a4a52, 0.55),
    );
    etalase.name = `${nama}_etalase`;
    etalase.position.set(0, 1.05, hadap * (DALAM / 2 + ETALASE_MAJU));
    r.add(etalase);

    // FISIKA — badan + relief muka jadi SATU dinding padat dari tanah
    // (ADR-0016: benda rapat satu volume). Setinggi badan pemain, yang paling
    // menonjol dari badan adalah kaca etalase ini: muka luarnya DALAM/2 + 0,11;
    // alur (0,10) dan kusen (0,105) ada di dalamnya. Tanpa tonjolan itu pemain
    // yang menyusuri muka ruko berdiri 11 cm di dalam kaca. Lis (mulai 2,41 m),
    // mahkota, dan kanopi di atas kepala — tidak ikut. Putaran diambil dari
    // grup yang sama dengan mesh, jadi kalau arah muka ruko dibetulkan (brief
    // suasana Braga §3 butir 1) volumenya ikut berputar.
    const tonjol = ETALASE_MAJU + ETALASE_TEBAL / 2;
    this._daftarFisika([{
      bentuk: 'kotak',
      ukuran: [lebar, tinggi, DALAM + tonjol],
      letak: [0, tinggi / 2, hadap * (tonjol / 2)],
    }], r.position, r.rotation.y, nama);

    const kanopi = new THREE.Mesh(
      new THREE.BoxGeometry(lebar * 0.9, 0.12, 1.1),
      MS(PALET.aksenTeal, 0.82),
    );
    kanopi.position.set(0, 2.05, hadap * (DALAM / 2 + 0.55));
    kanopi.castShadow = true;
    r.add(kanopi);
    // Kanopi tanpa collider: bawahnya 1,99 m, di atas kapsul pemain (1,32 m).

    g.add(r);
    return r;
  }

  /**
   * Susun matriks dunia untuk satu instans: skala -> putar (kalau ruko
   * menghadap sebaliknya) -> geser ke posisi ruko.
   */
  _matriks(lx, ly, lz, sx, sy, sz, rukoX, rukoZ, hadap) {
    const m = new THREE.Matrix4();
    const putar = hadap < 0 ? Math.PI : 0;
    const cos = Math.cos(putar);
    const sin = Math.sin(putar);
    // Rotasi Y manual pada posisi lokal — lebih murah daripada merangkai
    // beberapa Matrix4 hanya untuk satu sudut yang cuma 0 atau PI.
    const wx = lx * cos + lz * sin;
    const wz = -lx * sin + lz * cos;
    m.compose(
      new THREE.Vector3(rukoX + wx, ly, rukoZ + wz),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), putar),
      new THREE.Vector3(sx, sy, sz),
    );
    return m;
  }

  /** Gambar seluruh unsur berulang dalam tiga draw call, bukan ~160. */
  _pasangUlangan(g) {
    const buat = (geo, mat, daftar, nama) => {
      if (!daftar.length) return;
      const im = new THREE.InstancedMesh(geo, mat, daftar.length);
      daftar.forEach((m, i) => im.setMatrixAt(i, m));
      im.instanceMatrix.needsUpdate = true;
      im.castShadow = true;
      im.name = nama;
      g.add(im);
    };
    buat(new THREE.BoxGeometry(1, 1, 1), MS(PALET.garis, 0.86),
      this._ulang.alur, 'braga_alur');
    buat(new THREE.BoxGeometry(1, 1, 1), MS(PALET.aksenTeal, 0.8),
      this._ulang.kusen, 'braga_kusen');
    const lengkungGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.09, 10, 1, false, 0, Math.PI);
    lengkungGeo.rotateX(Math.PI / 2);
    buat(lengkungGeo, MS(PALET.aksenTeal, 0.8), this._ulang.lengkung, 'braga_lengkung');
  }


  /**
   * @param {THREE.Scene} scene
   * @param {{ toast: { show: (m: string, t?: string) => void }, openPanel?: (id: string) => void,
   *           fisika?: import('../../fisika/Fisika.js').Fisika, kelompokFisika?: string }} [ctx]
   */
  mount(scene, ctx = null) {
    const g = this.root;

    // Fisika: Spot ini menyatakan tanah, batas, dan benda padatnya sendiri, di
    // sebelah mesh masing-masing (ADR-0016). Tanpa penanda ini Game memasang
    // tanah datar 120 × 120 + cincin 17 m — jauh lebih lebar dari alas 16,4 m,
    // jadi pemain bisa berjalan di udara melewati tepi alas, di sela ruko.
    this.fisikaTanah = true;
    this._fisika = ctx?.fisika ?? null;
    this._kelompokFisika = ctx?.kelompokFisika;

    // Trotoar sebagai permukaan utama yang dijalani — bukan aspalnya.
    // Braga adalah jalan PEJALAN KAKI dalam ingatan orang, dan sumber
    // menyebut penataan trotoar sebagai bagian dari revitalisasinya.
    const alas = new THREE.Mesh(
      new THREE.BoxGeometry(TOTAL_LEBAR, 0.9, JALAN_PANJANG),
      MS(PALET.trotoar, 0.92),
    );
    alas.position.set(0, -0.45, 0);
    alas.receiveShadow = true;
    g.add(alas);
    this.raycastMeshes.push(alas);
    // TANAH trotoar: kotak yang sama dengan alas, puncaknya y = 0.
    this._daftarFisika([
      { bentuk: 'kotak', ukuran: [TOTAL_LEBAR, 0.9, JALAN_PANJANG], letak: [0, -0.45, 0] },
    ], { x: 0, y: 0, z: 0 }, 0, 'braga_trotoar');
    // BATAS: empat dinding tak terlihat (tinggi 3 m, tebal 0,6 m) dengan
    // permukaan dalam TEPAT di tepi alas. Pusat pemain berhenti 0,42 m di
    // dalam tepi (jari kapsul 0,40 + offset pengendali 0,02), jadi badan avatar
    // tidak pernah menggantung di atas kekosongan. Di sisi X, di sela ruko,
    // di balik tepi alas memang tidak ada tanah.
    this._daftarFisika(
      dindingPersegi(TOTAL_LEBAR, JALAN_PANJANG, { tinggi: 3, tebal: 0.6 }),
      { x: 0, y: 0, z: 0 }, 0, 'braga_batas',
    );

    // Badan jalan sedikit lebih rendah — bedanya kecil, tapi itu yang
    // membedakan trotoar dari jalan tanpa perlu pagar.
    const aspal = new THREE.Mesh(
      new THREE.BoxGeometry(JALAN_LEBAR, 0.12, JALAN_PANJANG),
      MS(PALET.aspal, 0.94),
    );
    aspal.position.set(0, -0.04, 0);
    aspal.receiveShadow = true;
    g.add(aspal);
    this.raycastMeshes.push(aspal);
    // TANAH aspal: kotak yang sama dengan mesh-nya. Puncaknya y = 0,02 — dua
    // senti LEBIH TINGGI dari trotoar, kebalikan dari komentar di atas (brief
    // suasana Braga §3 butir 2). Collider mengikuti yang terlihat, bukan yang
    // dimaksud; beda 2 cm jauh di bawah naik tangga otomatis 0,35 m.
    this._daftarFisika([
      { bentuk: 'kotak', ukuran: [JALAN_LEBAR, 0.12, JALAN_PANJANG], letak: [0, -0.04, 0] },
    ], { x: 0, y: 0, z: 0 }, 0, 'braga_aspal');

    // Garis putus-putus di tengah jalan.
    for (let i = 0; i < 9; i += 1) {
      const garis = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.03, 1.4),
        MS(PALET.garis, 0.8),
      );
      garis.position.set(0, 0.03, -JALAN_PANJANG / 2 + 2.5 + i * 3.9);
      g.add(garis);
      // Tanpa collider: cat jalan, menonjol 2,5 cm di atas aspal — hiasan
      // yang boleh diinjak tembus.
    }

    // Deret ruko di kedua sisi. Lebar dan jumlah lantai divariasikan
    // supaya deretannya tidak terbaca sebagai satu blok panjang.
    const rukoWarna = [PALET.ruko1, PALET.ruko2, PALET.ruko3];
    const rencana = [
      { z: -13, lebar: 5.4, lantai: 3 },
      { z: -7.2, lebar: 4.6, lantai: 2 },
      { z: -1.2, lebar: 5.8, lantai: 3 },
      { z: 5.0, lebar: 4.8, lantai: 2 },
      { z: 10.8, lebar: 5.2, lantai: 3 },
    ];
    const xRuko = TOTAL_LEBAR / 2 + 2.0;
    rencana.forEach((r, i) => {
      // Barat = x negatif, sisi kafe (sama dengan brief suasana Braga).
      this._ruko(g, -xRuko, r.z, r.lebar, r.lantai, rukoWarna[i % 3], 1,
        `braga_ruko_barat_${i + 1}`);
      this._ruko(g, xRuko, r.z + 2.4, r.lebar * 0.92,
        r.lantai === 3 ? 2 : 3, rukoWarna[(i + 1) % 3], -1, `braga_ruko_timur_${i + 1}`);
    });

    // Semua alur, kusen, dan lengkung dari 10 ruko digambar di sini —
    // tiga draw call, bukan ratusan.
    this._pasangUlangan(g);

    // Kafe trotoar — meja-meja di sisi barat, menghadap jalan.
    const KAFE_X = -(JALAN_LEBAR / 2 + TROTOAR_LEBAR * 0.5);
    for (let i = 0; i < 4; i += 1) {
      // Meja kafe yang BISA DIDUDUKI, bukan hiasan.
      //
      // Bentuknya sengaja tetap bahasa kafe — daun bundar, kaki tunggal, kursi
      // bersandaran — bukan dingklik warung. Braga art deco memang budaya kafe
      // trotoar; memaksakan meja warung di sini akan salah tempat, dan akan
      // membuat dua bahasa visual bertabrakan di satu Spot.
      const meja = new MejaNongkrong({
        id: `braga_kafe_${i + 1}`,
        nama: 'Kafe trotoar',
        gaya: 'kafe',
        x: KAFE_X,
        z: -8 + i * 4.2,
        kursi: 2,
        // Menghadap jalan, seperti meja kafe trotoar sungguhan.
        rotasi: Math.PI / 2,
      });
      meja.bangun(g);
      meja.daftarkanFisika(ctx?.fisika, ctx?.kelompokFisika);
      this.meja.push(meja);
    }

    // Tenda kafe coral. Aksen dipakai HEMAT — kalau coral ditaburkan
    // ke mana-mana ia berhenti jadi aksen.
    for (let i = 0; i < 2; i += 1) {
      const tenda = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.14, 1.8),
        MS(PALET.coral, 0.86),
      );
      tenda.position.set(KAFE_X - 0.4, 2.5, -6.5 + i * 8.4);
      tenda.rotation.x = -0.16;
      tenda.castShadow = true;
      g.add(tenda);
      // Tanpa collider: tepi bawah tenda yang miring ini 2,29 m, di atas kepala.
    }

    // Lampu jalan klasik — sumber menyebutnya bagian dari penataan Braga.
    //
    // ANGGARAN CAHAYA: sepuluh kepala lampu, hanya TIGA PointLight.
    // Versi sebelumnya membuat PointLight di tiap kepala (10). three r128
    // memasukkan SETIAP PointLight di scene ke shader tiap material yang
    // diterangi dan menghitungnya per piksel — termasuk yang intensitasnya 0
    // (WebGLLights tidak melewatkan lampu padam). Target kita HP kelas
    // menengah. Sintesis suasana 15 Sep 2026 (docs/brief/suasana/SINTESIS.md,
    // baris "Braga §3 butir 3"): hanya tiga lampu yang DIBUAT, tujuh sisanya
    // cukup mesh emissive. Kepala tanpa PointLight tetap ikut siklus hari:
    // DayNight menyalakannya lewat getLampu() di cabang `lampu.material`.
    //
    // Tiga yang dipilih (LAMPU_BERCAHAYA): indeks tengah z = −7,75 / 0 / 7,75,
    // berselang barat–timur–barat. Ujung ±15,5 m adalah tepi Spot, bukan
    // tempat orang berkumpul; dua di barat karena empat meja kafe ada di sana,
    // satu di timur dekat galeri, supaya kedua trotoar punya kolam cahaya.
    const JUMLAH_LAMPU = 5;
    for (let i = 0; i < JUMLAH_LAMPU; i += 1) {
      const z = (i / (JUMLAH_LAMPU - 1) - 0.5) * (JALAN_PANJANG - 5);
      for (const sisi of [-1, 1]) {
        const x = sisi * (JALAN_LEBAR / 2 + 0.7);
        const nama = `braga_lampu_${sisi < 0 ? 'barat' : 'timur'}_${i + 1}`;

        const tiang = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.11, 3.6, 8),
          MS(0x2f3a42, 0.7),
        );
        tiang.name = `${nama}_tiang`;
        tiang.position.set(x, 1.8, z);
        tiang.castShadow = true;
        g.add(tiang);
        // Tiang padat dari tanah, selebar PANGKALNYA (jari-jari 0,11) — bagian
        // yang mengenai badan pemain. Kepala lampu (3,85 m) di atas kepala.
        this._daftarFisika([
          { bentuk: 'silinder', ukuran: [0.22, 3.6, 0.22], letak: [0, 1.8, 0] },
        ], { x, y: 0, z }, 0, nama);

        // Kepala lampu bersegi — bentuk klasik, bukan bola polos.
        const kepala = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.16, 0.42, 6),
          MS(PALET.kaca, 0.35),
        );
        kepala.position.set(x, 3.85, z);
        kepala.material.emissive = new THREE.Color(PALET.kaca);
        kepala.material.emissiveIntensity = 0.3;
        kepala.userData.isLampu = true;
        g.add(kepala);
        this._lampu.push(kepala);

        if (!LAMPU_BERCAHAYA.some(([bi, bs]) => bi === i && bs === sisi)) continue;
        const nyala = new THREE.PointLight(0xffd9a0, 0, 7.5, 2);
        nyala.position.set(x, 3.7, z);
        nyala.userData.isLampu = true;
        g.add(nyala);
        this._lampu.push(nyala);
      }
    }

    scene.add(g);

    const warpX = 0;
    const warpZ = JALAN_PANJANG / 2 - 3;
    const { warpRing } = createSpotWarpPortal(g, warpX, warpZ);
    this._warpRing = warpRing;
    // Collider alas portal dinyatakan sekali di spotWarpPortal.js. Agen Spot
    // Braga yang menemukan pendekatan SERONG memanjat alas setinggi mesh (0,45):
    // batas naik tangga 0,35 bukan batas panjat untuk benda bundar.
    this._daftarFisika(FISIKA_ALAS_PORTAL, { x: warpX, y: 0, z: warpZ }, 0, 'braga_portal');

    this.interactionVolumes = [];
    if (ctx?.toast) {
      const T = ctx.toast;
      this.interactionVolumes = [
        new InteractionVolume({
          id: 'spot_warp_portal',
          shape: 'sphere',
          center: { x: warpX, z: warpZ },
          radius: 2.7,
          hint: '🌀 Warp Portal — pilih Spot lain',
          useKeyHint: '[F]',
          onUse: () => {
            if (ctx?.openPanel) ctx.openPanel('map-panel');
            else T.show('Buka Peta Spot dari bar bawah (ikon peta) 🗺', 'g');
          },
        }),
        ...this.meja.map((m) => new InteractionVolume({
          id: m.id,
          shape: 'sphere',
          center: { x: m.x, z: m.z },
          radius: m.jariInteraksi,
          hint: `☕ ${m.nama}`,
          useKeyHint: '[F] duduk',
        })),
        new InteractionVolume({
          id: 'braga_galeri',
          shape: 'sphere',
          center: { x: xRuko - 3.2, z: -1.2 },
          radius: 3.0,
          hint: '🖼 Galeri — lantai dasar ruko',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Galeri karya warga Galantara — menyusul 🖼', 'a');
          },
        }),
      ];
    }

    return this;
  }

  /** Dikumpulkan saat mount, bukan disapu dari scene (PRD BAB 2.4). */
  getLampu() {
    return this._lampu;
  }

  /** @param {THREE.Scene} scene */
  dispose(scene) {
    for (const v of this.interactionVolumes) v.reset();
    this.interactionVolumes = [];
    scene.remove(this.root);
    this.root.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m?.dispose?.());
      }
    });
    this.raycastMeshes = [];
    this._lampu = [];
    this._ulang = { alur: [], kusen: [], lengkung: [] };
    this._warpRing = null;
    // Collider-nya sudah dilepas Game (lepasKelompok) SEBELUM dispose — satu
    // kelompok utuh, bukan per benda. Di sini cukup lepas rujukannya.
    this._fisika = null;
  }

  /** @param {number} t */
  animate(t) {
    animateSpotWarpPortal(this._warpRing, t);
  }

  getRaycastTargets() {
    return this.raycastMeshes;
  }
}
