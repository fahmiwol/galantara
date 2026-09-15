// ═══════════════════════════════════════════════════════
// MalioboroSpotRuntime.js — Spot Yogyakarta: jalan pedestrian + lesehan
// Pola sama Monas/Bogor: root, raycast ground, volume + [F], manifest GLB.
// Palet dari PRD BAB 4.2 — Batik Amber primer, Ungu sekunder.
// Rumah Joglo datang dari assets/spots/malioboro/manifest.json (Rupa3D).
// Fisika: tanah, batas, dan collider tiap benda dinyatakan di mount (ADR-0016).
// ═══════════════════════════════════════════════════════

import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { MejaNongkrong } from '../MejaNongkrong.js';
import { animateSpotWarpPortal, createSpotWarpPortal } from '../spotWarpPortal.js';
import { dindingPersegi } from '../../fisika/Fisika.js';

// THREE global — klien memuat three.min.js lewat tag script. Bare import
// akan mematikan modul ini tanpa error (gotcha tercatat di AGENTS.md).
const MS = (color, roughness = 0.78) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.04 });

// Palet Spot. Diturunkan dari PRD BAB 4.2 (Batik Amber · Ungu), bukan selera.
const PALET = {
  trotoar: 0x8c6b3f,   // batik amber gelap — permukaan jalan
  tepi:    0xb08a4a,   // amber terang, garis tepi
  ungu:    0x6b4c8a,   // sekunder: tenda kios
  lesehan: 0xc4933f,   // tikar gelaran
  kayu:    0x4a3220,   // tiang lampu & meja
  kaca:    0xffd98a,   // nyala lampu jalan
};

// Malioboro adalah JALAN — bentuknya memanjang, bukan plaza bundar seperti
// Monas. Itu yang membuatnya langsung terbaca beda dari kamera orbit.
// Diekspor supaya uji fisika menghitung batas jalan dari angka yang sama.
export const JALAN_PANJANG = 34;
export const JALAN_LEBAR = 11;

export class MalioboroSpotRuntime {
  constructor() {
    /** @type {THREE.Group} */
    this.root = new THREE.Group();
    this.root.name = 'spot:malioboro';
    /** @type {THREE.Mesh[]} */
    this.raycastMeshes = [];
    /** @type {THREE.Object3D[]} Bohlam + lampu titik, ikut siklus hari. */
    this._lampu = [];
    /** @type {THREE.Mesh | null} */
    this._warpRing = null;
    /** @type {InteractionVolume[]} */
    this.interactionVolumes = [];
    /** Social node Spot ini — dibaca Game untuk keterisian kursi.
     *  @type {MejaNongkrong[]} */
    this.meja = [];
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

    // Collider tiap benda ditulis TEPAT di bawah mesh-nya, dengan angka yang
    // sama (ADR-0016). Aman tanpa fisika (ctx null → dilewati) dan sebelum
    // fisika siap (masuk antrean Fisika). Pelepasannya milik Game: kelompok
    // Spot dilepas utuh saat warp.
    const fisika = ctx?.fisika ?? null;
    const daftarFisika = (deskriptor, induk, pemilik) =>
      fisika?.daftarkan(ctx.kelompokFisika, deskriptor, induk, 0, pemilik);
    // Spot ini menyatakan tanah dan batasnya sendiri, jadi Game TIDAK memasang
    // lantai 120 × 120 + cincin 17 m bawaan. Cincin itu bundar sedangkan jalan
    // ini persegi panjang: pemain bisa berjalan di udara sampai 11,5 m di luar
    // tepi jalan.
    this.fisikaTanah = true;

    const trotoar = new THREE.Mesh(
      new THREE.BoxGeometry(JALAN_LEBAR, 0.9, JALAN_PANJANG),
      MS(PALET.trotoar, 0.9),
    );
    trotoar.position.set(0, -0.45, 0);
    trotoar.receiveShadow = true;
    g.add(trotoar);
    this.raycastMeshes.push(trotoar);
    // Tanah = balok jalan itu sendiri: permukaan atasnya y = 0, persis yang
    // terlihat diinjak.
    daftarFisika([{ bentuk: 'kotak', ukuran: [JALAN_LEBAR, 0.9, JALAN_PANJANG] }], trotoar.position, 'malioboro_trotoar');
    // Batas: dinding tak terlihat yang permukaan DALAMNYA tepat di tepi balok
    // jalan, bukan di luarnya. Pusat pemain berhenti jari kapsul + offset
    // pengendali (0,40 + 0,02) di dalam tepi, jadi badannya tidak menggantung
    // di atas udara. Dinding yang digeser keluar supaya PUSAT pemain sampai di
    // tepi akan membuat separuh badannya melayang di luar jalan.
    daftarFisika(dindingPersegi(JALAN_LEBAR, JALAN_PANJANG), { x: 0, y: 0, z: 0 }, 'malioboro_batas');

    // Dua garis tepi. Permukaan datar besar tanpa garis tidak punya ARAH —
    // dari kamera atas ia cuma bidang. Garis inilah yang bilang "ini jalan".
    for (const sisi of [-1, 1]) {
      const tepi = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.08, JALAN_PANJANG),
        MS(PALET.tepi, 0.85),
      );
      tepi.position.set(sisi * (JALAN_LEBAR / 2 - 0.5), 0.03, 0);
      g.add(tepi);
      // Tanpa collider, dan itu keputusan: garis ini bagian dari permukaan yang
      // diinjak, puncaknya cuma 7 cm. Badan avatar memang berpusat di tanah
      // (Karakter.js), jadi garis setipis ini tidak terbaca menembus kaki;
      // collider setinggi mesh-nya justru membuat avatar naik-turun 7 cm
      // setiap kali melintas.
    }

    // Lampu jalan berpasangan. Bohlam ditandai userData.isLampu supaya
    // DayNight menyalakannya saat magrib — pola sama dengan prop Oola.
    //
    // Hanya TIGA bohlam yang membawa PointLight; tujuh lainnya murni mesh
    // emissive. Anggaran Spot ≤ 3 PointLight untuk ponsel kelas menengah
    // (brief suasana Malioboro §3.1; sintesis 15 Sep 2026 §2 "Braga §3 butir 3
    // dan Malioboro §3 butir 1", §4 urut 4). Tujuh sisanya TIDAK DIBUAT, bukan
    // dibuat dengan intensitas 0: three r128 memasukkan jumlah PointLight di
    // scene ke shader setiap material yang menerima cahaya (NUM_POINT_LIGHTS)
    // tanpa melihat intensitasnya, jadi lampu padam tetap dihitung di tiap
    // piksel MeshStandardMaterial jalan ini. Bohlam tanpa PointLight tetap ikut
    // siklus hari — DayNight menyalakan `material.emissiveIntensity` untuk isi
    // daftar lampu yang bukan light.
    //
    // Letaknya MENYIMPANG dari brief §5 (−4,4; −7), (4,4; 0), (−4,4; 7), dengan
    // alasan terukur: pola bergantian kiri–kanan–kiri membuat kedua kios
    // (x 3,1; z 4 dan 8,5) gelap di malam hari — kios z 8,5 berjarak ≥ 8,1 m
    // dari semua lampu, jangkauan 7 m (ditemukan agen Spot Malioboro). Cahaya
    // di proyek ini dibuat untuk TEMPAT ORANG BERHENTI (lihat MejaNongkrong),
    // bukan untuk ritme hiasan: (−4,4; −7) menerangi lesehan, (4,4; 0) titik
    // kedatangan, (4,4; 7) kedua kios. Tetap tiga kolam, tidak seragam.
    const JUMLAH_LAMPU = 5;
    /** [baris i, sisi] bohlam yang membawa PointLight. */
    const BERCAHAYA = [[1, -1], [2, 1], [3, 1]];
    for (let i = 0; i < JUMLAH_LAMPU; i += 1) {
      const z = (i / (JUMLAH_LAMPU - 1) - 0.5) * (JALAN_PANJANG - 6);
      for (const sisi of [-1, 1]) {
        const x = sisi * (JALAN_LEBAR / 2 - 1.1);

        const tiang = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.12, 3.4, 8),
          MS(PALET.kayu, 0.7),
        );
        tiang.position.set(x, 1.7, z);
        tiang.castShadow = true;
        g.add(tiang);
        // Silinder selebar PANGKAL tiang (jari 0,12), bukan rata-ratanya: tiang
        // meruncing ke atas, jadi setinggi badan pangkal adalah bagian
        // terlebar dan tidak ada bagian mesh yang menembus kapsul. Bohlam di
        // 3,5 m ada di atas kepala — tanpa collider.
        daftarFisika([{ bentuk: 'silinder', ukuran: [0.24, 3.4, 0.24] }], tiang.position, `malioboro_tiang_${i}_${sisi}`);

        const bohlam = new THREE.Mesh(
          new THREE.SphereGeometry(0.26, 10, 8),
          MS(PALET.kaca, 0.35),
        );
        bohlam.position.set(x, 3.5, z);
        bohlam.material.emissive = new THREE.Color(PALET.kaca);
        bohlam.material.emissiveIntensity = 0.3;
        bohlam.userData.isLampu = true;
        g.add(bohlam);
        this._lampu.push(bohlam);

        if (BERCAHAYA.some(([baris, s]) => baris === i && s === sisi)) {
          // Tanpa bayangan — lampu bershadow akan menghabiskan HP kelas
          // menengah, dan kolam cahayanya toh tetap terbaca.
          const nyala = new THREE.PointLight(0xffd98a, 0, 7, 2);
          nyala.position.set(x, 3.5, z);
          nyala.userData.isLampu = true;
          g.add(nyala);
          this._lampu.push(nyala);
        }
      }
    }

    // Lesehan — sekarang social node sungguhan, bukan tikar hiasan.
    //
    // Sebelumnya tiga balok 1,60 x 0,06 x 1,20 yang tidak bisa diapa-apakan,
    // dan volume [F]-nya cuma memunculkan toast "menyusul". 6 cm itu tebal
    // PAPAN; tikar pandan sekitar 8 mm, dan yang membuatnya terbaca sebagai
    // tikar adalah anyamannya — dibangun di Rupa3D, dimuat sebagai GLB oleh
    // MejaNongkrong gaya `lesehan`.
    const LESEHAN_Z = -6;
    const LESEHAN_X = -JALAN_LEBAR / 2 + 2.2;
    for (let i = 0; i < 3; i += 1) {
      const meja = new MejaNongkrong({
        id: `malioboro_lesehan_${i + 1}`,
        nama: 'Lesehan Malioboro',
        gaya: 'lesehan',
        x: LESEHAN_X,
        z: LESEHAN_Z + i * 1.9,
        // TIGA, bukan empat. Tikar 1,60 x 1,20 memang cuma muat tiga orang
        // tanpa badan saling tembus — lihat SPEK.lebarBadan.
        kursi: 3,
        // Sedikit miring bergantian — tikar yang digelar orang tidak pernah
        // sejajar sempurna, dan tiga tikar sejajar presisi terbaca sebagai
        // display, bukan tempat yang dipakai.
        rotasi: (i - 1) * 0.09,
      });
      meja.bangun(g);
      meja.daftarkanFisika(ctx?.fisika, ctx?.kelompokFisika);
      this.meja.push(meja);
      this._lampu.push(...meja.getLampu());
    }

    // Kios bertenda ungu — warna sekunder PRD dipakai di sini, bukan
    // ditaburkan ke mana-mana.
    const KIOS_X = JALAN_LEBAR / 2 - 2.4;
    for (let i = 0; i < 2; i += 1) {
      const z = 4 + i * 4.5;
      const tenda = new THREE.Mesh(
        new THREE.ConeGeometry(1.9, 1.0, 4),
        MS(PALET.ungu, 0.86),
      );
      tenda.rotation.y = Math.PI / 4;
      tenda.position.set(KIOS_X, 2.4, z);
      tenda.castShadow = true;
      g.add(tenda);
      // Tenda tanpa collider: bibir bawahnya 1,9 m (pusat 2,4 − setengah tinggi
      // 0,5), di atas kepala avatar 1,30 m.

      const meja = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.9, 1.1),
        MS(PALET.kayu, 0.8),
      );
      meja.position.set(KIOS_X, 0.45, z);
      meja.castShadow = true;
      g.add(meja);
      daftarFisika([{ bentuk: 'kotak', ukuran: [2.2, 0.9, 1.1] }], meja.position, `malioboro_kios_${i + 1}`);
    }

    scene.add(g);

    const warpX = 0;
    const warpZ = JALAN_PANJANG / 2 - 3;
    const { anchor, warpRing } = createSpotWarpPortal(g, warpX, warpZ);
    this._warpRing = warpRing;
    // Hanya ALAS portal yang padat. Cincinnya berputar di sumbu Y (animate) dan
    // menyentuh tanah, jadi collider tetap mana pun salah separuh waktu — dan
    // melangkah ke dalam portal memang yang diharapkan orang. Alasnya
    // CylinderGeometry(0,45, 0,65, 0,45) di y 0,22 (spotWarpPortal.js): setinggi
    // 0,45 m, di atas batas naik tangga 0,35. Angkanya disalin di sini karena
    // berkas bersama itu belum menyatakan collider-nya sendiri.
    daftarFisika([{ bentuk: 'silinder', ukuran: [1.3, 0.45, 1.3], letak: [0, 0.22, 0] }], anchor.position, 'malioboro_warp_portal');

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
        // Satu volume per tikar. Bukan satu volume besar: hint-nya menyebut
        // keterisian tikar TERTENTU, dan [F] mendudukkan di tikar yang memang
        // sedang didekati.
        ...this.meja.map((m) => new InteractionVolume({
          id: m.id,
          shape: 'sphere',
          center: { x: m.x, z: m.z },
          radius: m.jariInteraksi,
          hint: `🍵 ${m.nama}`,
          useKeyHint: '[F] ikut lesehan',
        })),
        new InteractionVolume({
          id: 'malioboro_batik',
          shape: 'sphere',
          center: { x: KIOS_X, z: 4 },
          radius: 2.4,
          hint: '🧵 Kios batik',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Katalog batik — Mighan menyusul 🧵', 'a');
          },
        }),
      ];
    }

    return this;
  }

  /**
   * Bohlam & lampu titik untuk DayNight. Dikumpulkan saat dibangun, bukan
   * dengan menyapu scene — PRD BAB 2.4 melarang `scene.traverse`.
   */
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
    this._warpRing = null;
  }

  /** @param {number} t */
  animate(t) {
    animateSpotWarpPortal(this._warpRing, t);
  }

  getRaycastTargets() {
    return this.raycastMeshes;
  }
}
