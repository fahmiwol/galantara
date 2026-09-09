// ═══════════════════════════════════════════════════════
// MonasSpotRuntime.js — POC plaza Jakarta: lapangan + obelisk stilized
// Pola sama Bogor: root, raycast ground, volume + [F], manifest GLB opsional
// ═══════════════════════════════════════════════════════

import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { animateSpotWarpPortal, createSpotWarpPortal } from '../spotWarpPortal.js';

const MS = (color, roughness = 0.72) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.05,
  });

export class MonasSpotRuntime {
  constructor() {
    /** @type {THREE.Group} */
    this.root = new THREE.Group();
    this.root.name = 'spot:monas';
    /** @type {THREE.Mesh[]} */
    this.raycastMeshes = [];
    /** @type {THREE.Mesh | null} */
    this._goldTip = null;
    /** @type {THREE.Mesh | null} */
    this._warpRing = null;
    /** @type {{badan: THREE.Mesh, kepala: THREE.Mesh, fase: number}[]} */
    this._ondel = [];
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

    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 17, 1.0, 28),
      MS(0xd8d4c8, 0.9),   // plaza putih-krem (sekunder PRD)
    );
    plaza.position.set(0, -0.48, 0);
    plaza.receiveShadow = true;
    g.add(plaza);
    this.raycastMeshes.push(plaza);

    const grass = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 5.5, 24),
      MS(0x2f6b3a, 0.9),   // hijau — PRIMER PRD, bukan aksen
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, 0.04, 0);
    g.add(grass);

    // Obelisk stylized (tong + atap emas)
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 5.5, 1.1),
      MS(0xe5e7eb, 0.55),
    );
    base.position.set(0, 2.85, 0);
    base.castShadow = true;
    g.add(base);

    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 1.4, 6),
      MS(0xfbbf24, 0.45),
    );
    cap.position.set(0, 5.85, 0);
    cap.castShadow = true;
    g.add(cap);
    this._goldTip = cap;

    // Tugu ring kecil (siluet)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.8, 0.06, 6, 40),
      MS(0xd1d5db, 0.75),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.08, 0);
    g.add(ring);


    // ── Khazanah Betawi ────────────────────────────────
    // Riset: docs/RISET_3D_NUSANTARA.md §12. Yang dibangun hanya yang
    // punya sumber; ornamen tanpa dasar sengaja tidak dibuat.

    // Ondel-ondel SEPASANG. Sumber konsisten menyebutnya dipakai berpasangan
    // untuk menyambut tamu — satu ondel-ondel sendirian salah baca.
    const ondelWarna = [0xc0392b, 0xf2ede4];
    for (let i = 0; i < 2; i += 1) {
      const sisi = i === 0 ? -1 : 1;
      const ox = sisi * 2.6;
      const oz = 9.2;

      const badan = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.78, 2.1, 10),
        MS(i === 0 ? 0x2f6b3a : 0xb0483f, 0.86),
      );
      badan.position.set(ox, 1.05, oz);
      badan.castShadow = true;
      g.add(badan);

      const kepala = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 12, 10),
        MS(ondelWarna[i], 0.8),
      );
      kepala.position.set(ox, 2.55, oz);
      kepala.castShadow = true;
      g.add(kepala);

      // Mahkota jurai — deret kelopak mengelilingi kepala.
      for (let k = 0; k < 9; k += 1) {
        const a = (k / 9) * Math.PI * 2;
        const jurai = new THREE.Mesh(
          new THREE.ConeGeometry(0.11, 0.5, 5),
          MS(k % 2 ? 0xd4a537 : 0xe8836b, 0.82),
        );
        jurai.position.set(ox + Math.cos(a) * 0.5, 3.15, oz + Math.sin(a) * 0.5);
        jurai.rotation.set(0.42, 0, -a);
        g.add(jurai);
      }
      this._ondel.push({ badan, kepala, fase: i * Math.PI });
    }

    // Rumah Kebaya. Cirinya: atap perisai dengan BIDANG TENGAH DATAR, dan
    // lipatannya terbaca dari SAMPING. Teras depan lebar dan terbuka.
    const rk = new THREE.Group();
    rk.name = 'monas_rumah_kebaya';
    const RK_X = 8.2, RK_Z = 7.4, RK_LEBAR = 5.2, RK_DALAM = 4.0;

    const rkBadan = new THREE.Mesh(
      new THREE.BoxGeometry(RK_LEBAR, 2.25, RK_DALAM),
      MS(0xf2ede4, 0.9),
    );
    rkBadan.position.set(0, 1.13, 0);
    rkBadan.castShadow = true;
    rk.add(rkBadan);

    // Dua bidang miring + satu bidang datar di tengah = siluet kebaya.
    for (const sisi of [-1, 1]) {
      const miring = new THREE.Mesh(
        new THREE.BoxGeometry(RK_LEBAR + 0.7, 0.16, 1.55),
        MS(0x8a5a3c, 0.88),
      );
      miring.position.set(0, 2.72, sisi * 1.4);
      miring.rotation.x = sisi * -0.52;
      miring.castShadow = true;
      rk.add(miring);
    }
    const rkDatar = new THREE.Mesh(
      new THREE.BoxGeometry(RK_LEBAR + 0.7, 0.16, 1.5),
      MS(0x8a5a3c, 0.88),
    );
    rkDatar.position.set(0, 3.12, 0);
    rk.add(rkDatar);

    // Gigi balang — deret segitiga di lisplang. Pengulangannya yang
    // membuatnya terbaca; satu-dua buah tidak akan kelihatan.
    for (const sisi of [-1, 1]) {
      for (let t = 0; t < 11; t += 1) {
        const gigi = new THREE.Mesh(
          new THREE.ConeGeometry(0.17, 0.3, 3),
          MS(0xd4a537, 0.84),
        );
        gigi.position.set(-2.6 + t * 0.52, 2.34, sisi * 2.08);
        gigi.rotation.x = Math.PI;
        rk.add(gigi);
      }
    }

    // Teras depan terbuka — ciri yang paling konsisten disebut sumber.
    const teras = new THREE.Mesh(
      new THREE.BoxGeometry(RK_LEBAR, 0.18, 1.6),
      MS(0xd8d4c8, 0.9),
    );
    teras.position.set(0, 0.09, -RK_DALAM / 2 - 0.8);
    teras.receiveShadow = true;
    rk.add(teras);
    for (const tx of [-1.9, 1.9]) {
      const tiang = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 2.1, 6),
        MS(0x8a5a3c, 0.82),
      );
      tiang.position.set(tx, 1.15, -RK_DALAM / 2 - 1.4);
      rk.add(tiang);
    }

    rk.position.set(RK_X, 0, RK_Z);   // RK_X/RK_Z dinaikkan di deklarasi
    rk.rotation.y = -0.5;
    g.add(rk);

    scene.add(g);

    const warpX = 12;
    const warpZ = 0.5;
    const { warpRing } = createSpotWarpPortal(g, warpX, warpZ);
    this._warpRing = warpRing;

    this.interactionVolumes = [];
    if (ctx?.toast) {
      const T = ctx.toast;
      const openMap = () => {
        if (ctx?.openPanel) ctx.openPanel('map-panel');
        else T.show('Buka Peta Spot dari bar bawah (ikon peta) 🗺', 'g');
      };
      this.interactionVolumes = [
        new InteractionVolume({
          id: 'spot_warp_portal',
          shape: 'sphere',
          center: { x: warpX, z: warpZ },
          radius: 2.7,
          hint: '🌀 Warp Portal — pilih Spot lain',
          useKeyHint: '[F]',
          onUse: openMap,
        }),
        new InteractionVolume({
          id: 'monas_foto',
          shape: 'sphere',
          center: { x: 0, z: 3.2 },
          radius: 2.4,
          hint: '📸 Area foto Monas',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Mode foto + pose — menyusul 📸', 'g');
          },
        }),
        new InteractionVolume({
          id: 'monas_oleh',
          shape: 'sphere',
          center: { x: 5.5, z: -2 },
          radius: 2.0,
          hint: '🛍 Kiosk oleh-oleh',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Katalog oleh-oleh virtual — Mighan menyusul 🛍', 'a');
          },
        }),
      ];
    }

    return this;
  }

  /**
   * Monas belum punya lampu sendiri, tapi metodenya tetap ada supaya Game
   * mendapat daftar KOSONG saat pindah ke sini — bukan mewarisi daftar lampu
   * Spot sebelumnya, yang meshnya sudah di-dispose.
   */
  getLampu() {
    return [];
  }

  /**
   * @param {THREE.Scene} scene
   */
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
    this._goldTip = null;
    this._ondel = [];
    this._warpRing = null;
  }

  /** @param {number} t */
  animate(t) {
    if (this._goldTip) {
      this._goldTip.rotation.y = t * 0.12;
    }
    // Ondel-ondel bergoyang pelan seperti diarak. Fase digeser antar
    // pasangan supaya tidak bergerak serempak seperti satu benda.
    for (const o of this._ondel) {
      const goyang = Math.sin(t * 1.1 + o.fase) * 0.055;
      o.badan.rotation.z = goyang;
      o.kepala.rotation.z = goyang * 1.4;
      o.kepala.position.x = o.badan.position.x - goyang * 0.5;
    }
    animateSpotWarpPortal(this._warpRing, t);
  }

  getRaycastTargets() {
    return this.raycastMeshes;
  }
}
