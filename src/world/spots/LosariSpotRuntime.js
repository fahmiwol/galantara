// ═══════════════════════════════════════════════════════
// LosariSpotRuntime.js — Spot Makassar: anjungan tepi laut + dermaga
// Pola sama Monas/Bogor: root, raycast ground, volume + [F], manifest GLB.
// Palet dari PRD BAB 4.2 — Merah-oranye primer, Biru Navy sekunder.
// Rumah panggung Bugis-Makassar datang dari
// assets/spots/losari/manifest.json (dibangun dengan Rupa3D).
// ═══════════════════════════════════════════════════════

import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { animateSpotWarpPortal, createSpotWarpPortal } from '../spotWarpPortal.js';

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
const ANJUNGAN_LEBAR = 30;   // sepanjang garis pantai
const ANJUNGAN_DALAM = 13;   // dari bibir air ke darat
const BIBIR_Z = -ANJUNGAN_DALAM / 2;

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
   * }} [ctx]
   */
  mount(scene, ctx = null) {
    const g = this.root;

    // Anjungan — permukaan yang bisa dijalani.
    const anjungan = new THREE.Mesh(
      new THREE.BoxGeometry(ANJUNGAN_LEBAR, 0.9, ANJUNGAN_DALAM),
      MS(PALET.anjungan, 0.9),
    );
    anjungan.position.set(0, -0.45, 0);
    anjungan.receiveShadow = true;
    g.add(anjungan);
    this.raycastMeshes.push(anjungan);

    // Lis di bibir air — penanda batas yang jelas dari kamera atas, sekaligus
    // pagar visual supaya pemain tahu di mana daratannya berhenti.
    const lis = new THREE.Mesh(
      new THREE.BoxGeometry(ANJUNGAN_LEBAR, 0.34, 0.5),
      MS(PALET.tepi, 0.8),
    );
    lis.position.set(0, 0.17, BIBIR_Z);
    g.add(lis);

    // Laut. Bidang besar, jauh melewati anjungan, warnanya navy sesuai PRD.
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
    const buih = new THREE.Mesh(
      new THREE.BoxGeometry(ANJUNGAN_LEBAR + 6, 0.04, 0.7),
      MS(PALET.buih, 0.6),
    );
    buih.position.set(0, -0.05, BIBIR_Z - 0.7);
    g.add(buih);

    // Dermaga menjorok ke laut.
    const DERMAGA_X = -7;
    const DERMAGA_PANJANG = 9;
    const dermaga = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.3, DERMAGA_PANJANG),
      MS(PALET.kayu, 0.86),
    );
    dermaga.position.set(DERMAGA_X, 0.05, BIBIR_Z - DERMAGA_PANJANG / 2);
    dermaga.receiveShadow = true;
    g.add(dermaga);
    this.raycastMeshes.push(dermaga);

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
