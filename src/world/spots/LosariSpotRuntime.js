// ═══════════════════════════════════════════════════════
// LosariSpotRuntime.js — Spot Makassar: anjungan tepi laut + dermaga
// Pola sama Monas/Bogor: root, raycast ground, volume + [F], manifest GLB.
// Palet dari PRD BAB 4.2 — Merah-oranye primer, Biru Navy sekunder.
// Rumah panggung Bugis-Makassar datang dari
// assets/spots/losari/manifest.json (dibangun dengan Rupa3D).
//
// Fisika (ADR-0016): tanah, batas, dan collider prop dinyatakan di sini, di
// sebelah mesh masing-masing. `fisikaTanah = true` membuat Game TIDAK memasang
// lantai datar + cincin 17 m bawaan. Rumah panggung dari manifest belum punya
// collider — Galantara belum membaca collider dari GLB (ADR-0016, belum
// diputuskan), jadi tiang dan tangganya masih bisa ditembus.
// Diuji: tests/fisikaSpot-losari.test.mjs.
// ═══════════════════════════════════════════════════════

import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { animateSpotWarpPortal, createSpotWarpPortal, FISIKA_ALAS_PORTAL } from '../spotWarpPortal.js';

// THREE global — jangan `import 'three'`; klien memuatnya lewat tag script.
const MS = (color, roughness = 0.78) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });

// PRD BAB 4.2: Losari = merah-oranye · biru navy · "sunset, pelabuhan, maritim".
const PALET = {
  anjungan: 0x9a5a3c,   // paving merah-oranye tepi laut
  tepi:     0xc2764a,   // lis anjungan, lebih terang
  laut:     0x1e3a5f,   // biru navy — sekunder PRD
  buih:     0x6f93b8,   // garis buih di batas air
  kayu:     0x5a3a24,   // dermaga & tiang
  layar:    0xe8d9bd,   // layar pinisi, pasir pucat
  bara:     0xff9a4d,   // tungku pisang epe
};

// Anjungan menghadap laut. Sumbu X = garis pantai, +Z = arah darat,
// -Z = laut. Semua penempatan mengacu ke situ supaya tidak saling tabrak.
// "Kiri/kanan" pada nama collider = dilihat dari darat menghadap laut (−X/+X).
//
// Diekspor untuk tests/fisikaSpot-losari.test.mjs: area yang boleh diinjak
// diturunkan dari angka yang sama dengan mesh, bukan disalin ke uji.
export const ANJUNGAN_LEBAR = 30;   // sepanjang garis pantai
export const ANJUNGAN_DALAM = 13;   // dari bibir air ke darat
export const BIBIR_Z = -ANJUNGAN_DALAM / 2;
// Lis di bibir air. 0,34 m — jauh di bawah ambang panjat nyata (pendekatan
// serong memanjat sampai ±0,50 m), jadi batas lautnya dinding penuh; lihat mount().
export const LIS_TINGGI = 0.34;
export const LIS_DALAM = 0.5;       // bertumpu separuh di anjungan, separuh di atas air
// Dermaga menjorok ke laut dari bibir air.
export const DERMAGA_X = -7;
export const DERMAGA_LEBAR = 2.6;
export const DERMAGA_PANJANG = 9;
const DERMAGA_TEBAL = 0.3;
const DERMAGA_Y = 0.05;
/** Permukaan dermaga: 0,20 di atas paving anjungan (y = 0). */
export const DERMAGA_ATAS = DERMAGA_Y + DERMAGA_TEBAL / 2;

// Tepi-tepi yang dipakai collider, diturunkan dari angka di atas.
const TEPI_KIRI = -ANJUNGAN_LEBAR / 2;
const TEPI_KANAN = ANJUNGAN_LEBAR / 2;
const TEPI_DARAT = ANJUNGAN_DALAM / 2;
const BIBIR_DALAM = BIBIR_Z + LIS_DALAM / 2;   // muka lis yang menghadap darat
const BIBIR_LUAR = BIBIR_Z - LIS_DALAM / 2;    // muka lis yang menghadap laut
const DERMAGA_KIRI = DERMAGA_X - DERMAGA_LEBAR / 2;
const DERMAGA_KANAN = DERMAGA_X + DERMAGA_LEBAR / 2;
const DERMAGA_UJUNG = BIBIR_Z - DERMAGA_PANJANG;

// Batas tak terlihat. Tebal dan tinggi sama dengan bawaan dindingPersegi.
const BATAS_TEBAL = 0.6;
const BATAS_TINGGI = 3;
const PUSAT = Object.freeze({ x: 0, y: 0, z: 0 });

/**
 * Deskriptor kotak sejajar sumbu dari rentang DUNIA [min, max] per sumbu,
 * untuk didaftarkan dengan induk (0, 0, 0). Batas dan ambang paling jelas
 * dibaca sebagai "dari sini sampai sini"; menghitung pusat dan ukuran penuh
 * di kepala adalah tempat salah tanda terjadi.
 */
function kotakRentang([x0, x1], [y0, y1], [z0, z1]) {
  return {
    bentuk: 'kotak',
    ukuran: [x1 - x0, y1 - y0, z1 - z0],
    letak: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
  };
}

export class LosariSpotRuntime {
  constructor() {
    /** @type {THREE.Group} */
    this.root = new THREE.Group();
    this.root.name = 'spot:losari';
    /** @type {THREE.Mesh[]} */
    this.raycastMeshes = [];
    /** @type {THREE.Object3D[]} */
    this._lampu = [];
    /** @type {THREE.Mesh | null} */
    this._laut = null;
    /** @type {THREE.Group | null} */
    this._pinisi = null;
    /** @type {THREE.Mesh | null} */
    this._warpRing = null;
    /** @type {InteractionVolume[]} */
    this.interactionVolumes = [];
  }

  /**
   * @param {THREE.Scene} scene
   * @param {{
   *   toast: { show: (msg: string, type?: string) => void },
   *   openPanel?: (id: string) => void,
   *   fisika?: import('../../fisika/Fisika.js').Fisika,
   *   kelompokFisika?: string,
   * }} [ctx]
   */
  mount(scene, ctx = null) {
    const g = this.root;

    // Spot ini menyatakan tanah dan batasnya sendiri. Bawaan Game (lantai
    // 120 × 120 di y = 0 + cincin 17 m) salah di sini: lantainya menutupi laut
    // sehingga pemain berjalan di atas air, dan cincinnya jauh melewati tepi
    // darat anjungan (13 m dalamnya).
    this.fisikaTanah = true;
    const fisika = ctx?.fisika ?? null;
    const kelompok = ctx?.kelompokFisika;
    // Aman tanpa fisika (no-op) dan sebelum fisika siap (antrean di Fisika).
    const daftarFisika = (pemilik, deskriptor, induk = PUSAT) => {
      fisika?.daftarkan(kelompok, deskriptor, induk, 0, `losari:${pemilik}`);
    };

    // Anjungan — permukaan yang bisa dijalani.
    const anjungan = new THREE.Mesh(
      new THREE.BoxGeometry(ANJUNGAN_LEBAR, 0.9, ANJUNGAN_DALAM),
      MS(PALET.anjungan, 0.9),
    );
    anjungan.position.set(0, -0.45, 0);
    anjungan.receiveShadow = true;
    g.add(anjungan);
    this.raycastMeshes.push(anjungan);
    // Tanah: permukaan atas collider = paving yang terlihat, y = 0.
    daftarFisika('anjungan', [{ bentuk: 'kotak', ukuran: [ANJUNGAN_LEBAR, 0.9, ANJUNGAN_DALAM] }], anjungan.position);
    // Batas di tiga tepi darat. Di balik tepi ini tidak ada apa-apa — anjungan
    // menggantung di udara — jadi tanpa dinding pemain jatuh sampai BATAS_JATUH
    // lalu dikembalikan ke titik muncul. Muka dalam dinding = tepi paving:
    // pusat pemain berhenti 0,42 m (jari kapsul + offset) di dalamnya, badannya
    // tidak menggantung di atas kekosongan. Tepi laut dijaga lis di bawah.
    daftarFisika('batas-anjungan', [
      kotakRentang([TEPI_KIRI - BATAS_TEBAL, TEPI_KANAN + BATAS_TEBAL], [0, BATAS_TINGGI], [TEPI_DARAT, TEPI_DARAT + BATAS_TEBAL]),
      kotakRentang([TEPI_KIRI - BATAS_TEBAL, TEPI_KIRI], [0, BATAS_TINGGI], [BIBIR_LUAR, TEPI_DARAT + BATAS_TEBAL]),
      kotakRentang([TEPI_KANAN, TEPI_KANAN + BATAS_TEBAL], [0, BATAS_TINGGI], [BIBIR_LUAR, TEPI_DARAT + BATAS_TEBAL]),
    ]);

    // Lis di bibir air — penanda batas yang jelas dari kamera atas, sekaligus
    // pagar visual supaya pemain tahu di mana daratannya berhenti.
    const lis = new THREE.Mesh(
      new THREE.BoxGeometry(ANJUNGAN_LEBAR, LIS_TINGGI, LIS_DALAM),
      MS(PALET.tepi, 0.8),
    );
    lis.position.set(0, LIS_TINGGI / 2, BIBIR_Z);
    g.add(lis);
    // Batas laut: jejak XZ sama dengan lis, tingginya dinding penuh. Volume
    // setinggi mesh (0,34) DINAIKI pengendali karakter — pemain naik ke lis
    // lalu jatuh ke laut; kontrol itu dijaga uji. Ini batas laut, bukan
    // bangku, jadi tidak ada alasan menyisakan tinggi yang bisa dilangkahi.
    // Mulut dermaga dibiarkan terbuka; ambangnya dinyatakan di dermaga.
    daftarFisika('batas-bibir', [
      kotakRentang([TEPI_KIRI, DERMAGA_KIRI], [0, BATAS_TINGGI], [BIBIR_LUAR, BIBIR_DALAM]),
      kotakRentang([DERMAGA_KANAN, TEPI_KANAN], [0, BATAS_TINGGI], [BIBIR_LUAR, BIBIR_DALAM]),
    ]);

    // Laut. Bidang besar, jauh melewati anjungan, warnanya navy sesuai PRD.
    // Tanpa collider: tidak untuk diinjak, dan batas di atas menjaga pemain
    // tidak pernah sampai ke sana.
    const laut = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 90),
      MS(PALET.laut, 0.42),
    );
    laut.rotation.x = -Math.PI / 2;
    laut.position.set(0, -0.08, BIBIR_Z - 45);
    laut.receiveShadow = true;
    g.add(laut);
    this._laut = laut;

    // Garis buih tipis di batas air. Tanpa ini, laut dan anjungan cuma dua
    // bidang yang bersentuhan — tidak terbaca sebagai pantai.
    // Hiasan di atas air, di luar batas: tanpa collider.
    const buih = new THREE.Mesh(
      new THREE.BoxGeometry(ANJUNGAN_LEBAR + 6, 0.04, 0.7),
      MS(PALET.buih, 0.6),
    );
    buih.position.set(0, -0.05, BIBIR_Z - 0.7);
    g.add(buih);

    // Dermaga menjorok ke laut.
    const dermaga = new THREE.Mesh(
      new THREE.BoxGeometry(DERMAGA_LEBAR, DERMAGA_TEBAL, DERMAGA_PANJANG),
      MS(PALET.kayu, 0.86),
    );
    dermaga.position.set(DERMAGA_X, DERMAGA_Y, BIBIR_Z - DERMAGA_PANJANG / 2);
    dermaga.receiveShadow = true;
    g.add(dermaga);
    this.raycastMeshes.push(dermaga);
    // Dermaga BISA DIJALANI. Tiga hal di kode ini yang memutuskannya:
    // permukaannya 0,20 di atas anjungan (satu anak tangga), menempel tepat di
    // bibir air, dan volume "lihat matahari terbenam" di tengahnya (jari 3 m
    // di z = −11) tidak terjangkau dari anjungan, tempat pusat pemain paling
    // jauh sampai z ≈ −5,8.
    daftarFisika('dermaga', [
      { bentuk: 'kotak', ukuran: [DERMAGA_LEBAR, DERMAGA_TEBAL, DERMAGA_PANJANG] },
    ], dermaga.position);
    // Ambang di mulut dermaga. Lis dibangun sebagai satu balok selebar
    // anjungan, jadi 0,34 m-nya melintang juga di sini. Volume permainannya
    // disamakan dengan lantai dermaga: naiknya 0,20, bukan 0,34 yang hanya
    // 1 cm di bawah PARAM.naikTangga dan akan putus diam-diam begitu angka itu
    // diturunkan. Yang dibayar: kaki tenggelam 14 cm di lis sepanjang 0,5 m.
    daftarFisika('ambang-dermaga', [
      kotakRentang([DERMAGA_KIRI, DERMAGA_KANAN], [0, DERMAGA_ATAS], [BIBIR_LUAR, BIBIR_DALAM]),
    ]);
    // Batas kedua sisi dan ujung dermaga, muka dalamnya = tepi papan. Sisi-
    // sisinya diteruskan sampai muka darat lis supaya BERTUMPUK dengan batas
    // lis, bukan sekadar bersentuhan — sudut mulut dermaga tanpa celah.
    daftarFisika('batas-dermaga', [
      kotakRentang([DERMAGA_KIRI - BATAS_TEBAL, DERMAGA_KIRI], [0, BATAS_TINGGI], [DERMAGA_UJUNG - BATAS_TEBAL, BIBIR_DALAM]),
      kotakRentang([DERMAGA_KANAN, DERMAGA_KANAN + BATAS_TEBAL], [0, BATAS_TINGGI], [DERMAGA_UJUNG - BATAS_TEBAL, BIBIR_DALAM]),
      kotakRentang([DERMAGA_KIRI - BATAS_TEBAL, DERMAGA_KANAN + BATAS_TEBAL], [0, BATAS_TINGGI], [DERMAGA_UJUNG - BATAS_TEBAL, DERMAGA_UJUNG]),
    ]);

    // Tiang dermaga tanpa collider: seluruhnya di bawah papan (puncaknya rata
    // dengan permukaan dermaga), pemain tidak pernah menyentuhnya.
    for (let i = 0; i < 4; i += 1) {
      const tiang = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 1.4, 6),
        MS(PALET.kayu, 0.8),
      );
      tiang.position.set(
        DERMAGA_X + (i % 2 ? 1 : -1),
        -0.5,
        BIBIR_Z - 1.6 - Math.floor(i / 2) * 4.4,
      );
      g.add(tiang);
    }

    // Pinisi — siluet perahu layar. Bukan model detail; yang dikenali dari
    // kejauhan cuma lambung gelap dan dua layar segitiga.
    // Tanpa collider: berlabuh ±11 m dari bibir, lebih dari 10 m dari titik
    // mana pun yang bisa diinjak. Ia juga bergoyang (animate), jadi collider
    // tetap akan salah seandainya pun terjangkau.
    const pinisi = new THREE.Group();
    pinisi.name = 'losari_pinisi';
    const lambung = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.85, 1.5),
      MS(PALET.kayu, 0.82),
    );
    lambung.position.y = 0.42;
    pinisi.add(lambung);
    for (let i = 0; i < 2; i += 1) {
      const layar = new THREE.Mesh(
        new THREE.ConeGeometry(1.05, 2.9, 3),
        MS(PALET.layar, 0.88),
      );
      layar.position.set(-0.9 + i * 1.9, 2.2, 0);
      layar.rotation.y = Math.PI / 6;
      pinisi.add(layar);
    }
    pinisi.position.set(6.5, -0.1, BIBIR_Z - 11);
    pinisi.rotation.y = -0.35;
    g.add(pinisi);
    this._pinisi = pinisi;

    // Gerobak pisang epe + tungku. Tungkunya emissive dan ikut siklus hari.
    const EPE_X = 8;
    const EPE_Z = 2.5;
    const gerobak = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.95, 1.1),
      MS(PALET.kayu, 0.8),
    );
    gerobak.position.set(EPE_X, 0.48, EPE_Z);
    gerobak.castShadow = true;
    g.add(gerobak);
    // Padat setinggi gerobaknya (0,95 m, jauh di atas batas naik tangga).
    // Tungku di atasnya masuk jejak gerobak — tidak butuh volume sendiri.
    daftarFisika('gerobak-epe', [{ bentuk: 'kotak', ukuran: [2.0, 0.95, 1.1] }], gerobak.position);

    const tungku = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.16, 0.5),
      MS(PALET.bara, 0.5),
    );
    tungku.position.set(EPE_X, 1.02, EPE_Z);
    tungku.material.emissive = new THREE.Color(PALET.bara);
    tungku.material.emissiveIntensity = 0.35;
    tungku.userData.isLampu = true;
    g.add(tungku);
    this._lampu.push(tungku);

    const baraLight = new THREE.PointLight(0xff9a4d, 0, 5, 2);
    baraLight.position.set(EPE_X, 1.2, EPE_Z);
    baraLight.userData.isLampu = true;
    g.add(baraLight);
    this._lampu.push(baraLight);

    // Lampu anjungan sepanjang bibir air.
    const JUMLAH_LAMPU = 4;
    for (let i = 0; i < JUMLAH_LAMPU; i += 1) {
      const x = (i / (JUMLAH_LAMPU - 1) - 0.5) * (ANJUNGAN_LEBAR - 8);
      const tiang = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 3.0, 8),
        MS(PALET.kayu, 0.7),
      );
      tiang.position.set(x, 1.5, BIBIR_Z + 1.4);
      tiang.castShadow = true;
      g.add(tiang);
      // Tiangnya saja, selebar pangkalnya; bohlam 3,1 m di atas kepala.
      // Celah tiang–lis 1,04 m > lebar kapsul 0,84 m: bibir tetap bisa disusuri.
      daftarFisika(`tiang-lampu-${i}`, [{ bentuk: 'silinder', ukuran: [0.22, 3.0, 0.22] }], tiang.position);

      const bohlam = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 10, 8),
        MS(0xffc98a, 0.35),
      );
      bohlam.position.set(x, 3.1, BIBIR_Z + 1.4);
      bohlam.material.emissive = new THREE.Color(0xffc98a);
      bohlam.material.emissiveIntensity = 0.3;
      bohlam.userData.isLampu = true;
      g.add(bohlam);
      this._lampu.push(bohlam);

      const nyala = new THREE.PointLight(0xffc98a, 0, 6.5, 2);
      nyala.position.set(x, 3.1, BIBIR_Z + 1.4);
      nyala.userData.isLampu = true;
      g.add(nyala);
      this._lampu.push(nyala);
    }

    scene.add(g);

    const warpX = 0;
    const warpZ = ANJUNGAN_DALAM / 2 - 2.5;
    const { warpRing } = createSpotWarpPortal(g, warpX, warpZ);
    this._warpRing = warpRing;
    // Alasnya saja, deskriptor bersama semua Spot (alasan tingginya di sana).
    daftarFisika('alas-portal', FISIKA_ALAS_PORTAL, { x: warpX, y: 0, z: warpZ });

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
        new InteractionVolume({
          id: 'losari_pisang_epe',
          shape: 'sphere',
          center: { x: EPE_X, z: EPE_Z },
          radius: 2.4,
          hint: '🍌 Pisang epe — jajan tepi laut',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Jajan pisang epe — Mighan menyusul 🍌', 'a');
          },
        }),
        new InteractionVolume({
          id: 'losari_dermaga',
          shape: 'sphere',
          center: { x: DERMAGA_X, z: BIBIR_Z - DERMAGA_PANJANG / 2 },
          radius: 3.0,
          hint: '⚓ Dermaga — lihat matahari terbenam',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Spot foto sunset Losari 🌅', 'g');
          },
        }),
      ];
    }

    return this;
  }

  /** Lihat catatan yang sama di MalioboroSpotRuntime: dikumpulkan saat
   *  dibangun, bukan dengan menyapu scene (PRD BAB 2.4). */
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
    this._laut = null;
    this._pinisi = null;
    this._warpRing = null;
  }

  /** @param {number} t */
  animate(t) {
    // Pinisi bergoyang pelan. Amplitudonya kecil — perahu yang berayun
    // terlalu jauh terbaca sebagai bug fisika, bukan laut yang tenang.
    if (this._pinisi) {
      this._pinisi.position.y = -0.1 + Math.sin(t * 0.6) * 0.06;
      this._pinisi.rotation.z = Math.sin(t * 0.45) * 0.025;
    }
    animateSpotWarpPortal(this._warpRing, t);
  }

  getRaycastTargets() {
    return this.raycastMeshes;
  }
}
