// ═══════════════════════════════════════════════════════
// MalioboroSpotRuntime.js — Spot Yogyakarta: jalan pedestrian + lesehan
// Pola sama Monas/Bogor: root, raycast ground, volume + [F], manifest GLB.
// Palet dari PRD BAB 4.2 — Batik Amber primer, Ungu sekunder.
// Rumah Joglo datang dari assets/spots/malioboro/manifest.json (Rupa3D).
// ═══════════════════════════════════════════════════════

import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { animateSpotWarpPortal, createSpotWarpPortal } from '../spotWarpPortal.js';

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
const JALAN_PANJANG = 34;
const JALAN_LEBAR = 11;

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

    const trotoar = new THREE.Mesh(
      new THREE.BoxGeometry(JALAN_LEBAR, 0.9, JALAN_PANJANG),
      MS(PALET.trotoar, 0.9),
    );
    trotoar.position.set(0, -0.45, 0);
    trotoar.receiveShadow = true;
    g.add(trotoar);
    this.raycastMeshes.push(trotoar);

    // Dua garis tepi. Permukaan datar besar tanpa garis tidak punya ARAH —
    // dari kamera atas ia cuma bidang. Garis inilah yang bilang "ini jalan".
    for (const sisi of [-1, 1]) {
      const tepi = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.08, JALAN_PANJANG),
        MS(PALET.tepi, 0.85),
      );
      tepi.position.set(sisi * (JALAN_LEBAR / 2 - 0.5), 0.03, 0);
      g.add(tepi);
    }

    // Lampu jalan berpasangan. Bohlam ditandai userData.isLampu supaya
    // DayNight menyalakannya saat magrib — pola sama dengan prop Oola.
    const JUMLAH_LAMPU = 5;
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

        // Tanpa bayangan — sepuluh lampu bershadow akan menghabiskan HP
        // kelas menengah, dan kolam cahayanya toh tetap terbaca.
        const nyala = new THREE.PointLight(0xffd98a, 0, 7, 2);
        nyala.position.set(x, 3.5, z);
        nyala.userData.isLampu = true;
        g.add(nyala);
        this._lampu.push(nyala);
      }
    }

    // Lesehan — gelaran tikar di tepi jalan.
    const LESEHAN_Z = -6;
    const LESEHAN_X = -JALAN_LEBAR / 2 + 2.2;
    for (let i = 0; i < 3; i += 1) {
      const tikar = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.06, 1.2),
        MS(PALET.lesehan, 0.92),
      );
      tikar.position.set(LESEHAN_X, 0.04, LESEHAN_Z + i * 1.7);
      tikar.receiveShadow = true;
      g.add(tikar);
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

      const meja = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.9, 1.1),
        MS(PALET.kayu, 0.8),
      );
      meja.position.set(KIOS_X, 0.45, z);
      meja.castShadow = true;
      g.add(meja);
    }

    scene.add(g);

    const warpX = 0;
    const warpZ = JALAN_PANJANG / 2 - 3;
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
          id: 'malioboro_lesehan',
          shape: 'sphere',
          center: { x: LESEHAN_X, z: LESEHAN_Z + 1.7 },
          radius: 2.6,
          hint: '🍵 Lesehan — duduk & ngobrol',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Duduk lesehan + proximity chat — menyusul 🍵', 'g');
          },
        }),
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
