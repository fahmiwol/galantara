// ═══════════════════════════════════════════════════════
// KutaSpotRuntime.js — Spot Bali: pantai, candi bentar, selancar
// Pola sama Monas/Bogor: root, raycast ground, volume + [F], manifest GLB.
// Palet PRD BAB 4.2 — Oranye primer, Biru sekunder, Krem aksen.
// Dasar bentuk: docs/RISET_3D_NUSANTARA.md §13.
// ═══════════════════════════════════════════════════════

import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { animateSpotWarpPortal, createSpotWarpPortal } from '../spotWarpPortal.js';

// THREE global — jangan `import 'three'`; klien memuatnya lewat tag script.
const MS = (color, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03 });

const PALET = {
  pasir:    0xefe2c8,   // krem — aksen PRD, dan memang warna pasir Kuta
  pasirBsh: 0xd8c6a4,   // pasir basah di batas air, lebih gelap
  laut:     0x3d8fb8,   // biru — sekunder PRD
  buih:     0xd9eef5,
  batu:     0x8b8378,   // candi bentar, batu paras
  batuTua:  0x6e6960,   // bayangan undakan
  kelapa:   0x6b4a2f,
  daun:     0x3f7d4a,
  papan:    0xe2703a,   // oranye — primer PRD, di papan selancar
  payung:   0xe2703a,
};

// Sumbu: +Z darat, -Z laut. Semua penempatan mengacu ke sini.
const PANTAI_LEBAR = 32;
const PANTAI_DALAM = 15;
const GARIS_AIR_Z = -PANTAI_DALAM / 2 + 3;

export class KutaSpotRuntime {
  constructor() {
    /** @type {THREE.Group} */
    this.root = new THREE.Group();
    this.root.name = 'spot:kuta';
    /** @type {THREE.Mesh[]} */
    this.raycastMeshes = [];
    /** @type {THREE.Object3D[]} */
    this._lampu = [];
    /** @type {THREE.Mesh | null} */
    this._buih = null;
    /** @type {THREE.Object3D[]} */
    this._pelepah = [];
    /** @type {THREE.Mesh | null} */
    this._warpRing = null;
    /** @type {InteractionVolume[]} */
    this.interactionVolumes = [];
  }

  /** Candi bentar: satu candi dibelah dua, celah di tengah, profil BERUNDAK.
   *  Muka berhias, sisi lorong polos — itu memang cirinya, dan kebetulan
   *  hemat poligon (riset §13). */
  _candiBentar(g, x, z, rotY) {
    const gerbang = new THREE.Group();
    gerbang.name = 'kuta_candi_bentar';
    const CELAH = 1.9;          // lebar jalan di tengah
    const UNDAK = 5;            // jumlah undakan profil
    const UNDAK_TINGGI = 0.62;
    const UNDAK_TEBAL = 0.9;

    for (const sisi of [-1, 1]) {
      for (let i = 0; i < UNDAK; i += 1) {
        // Menyempit ke atas — itulah profil berundaknya.
        const lebar = 1.5 - i * 0.19;
        const blok = new THREE.Mesh(
          new THREE.BoxGeometry(lebar, UNDAK_TINGGI, UNDAK_TEBAL),
          MS(i % 2 ? PALET.batuTua : PALET.batu, 0.92),
        );
        blok.position.set(
          sisi * (CELAH / 2 + lebar / 2),
          UNDAK_TINGGI / 2 + i * UNDAK_TINGGI,
          0,
        );
        blok.castShadow = true;
        gerbang.add(blok);
      }
      // Puncak runcing tiap belahan.
      const puncak = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.8, 4),
        MS(PALET.batu, 0.9),
      );
      puncak.rotation.y = Math.PI / 4;
      puncak.position.set(sisi * (CELAH / 2 + 0.45), UNDAK * UNDAK_TINGGI + 0.4, 0);
      gerbang.add(puncak);
    }

    // Lorong ditinggikan beberapa anak tangga (sesuai sumber).
    for (let s = 0; s < 3; s += 1) {
      const anak = new THREE.Mesh(
        new THREE.BoxGeometry(CELAH + 2.6, 0.16, 0.55),
        MS(PALET.batu, 0.9),
      );
      anak.position.set(0, 0.08 + s * 0.16, 0.75 + s * 0.55);
      anak.receiveShadow = true;
      gerbang.add(anak);
    }

    gerbang.position.set(x, 0, z);
    gerbang.rotation.y = rotY;
    g.add(gerbang);
    return gerbang;
  }

  /** Kelapa: batang MELENGKUNG, itu tandanya. Batang lurus terbaca sebagai
   *  tiang, bukan kelapa. */
  _kelapa(g, x, z, tinggi, condong) {
    const pohon = new THREE.Group();
    const RUAS = 5;
    for (let i = 0; i < RUAS; i += 1) {
      const t = i / RUAS;
      const ruas = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13 - t * 0.04, 0.16 - t * 0.04, tinggi / RUAS, 6),
        MS(PALET.kelapa, 0.85),
      );
      // Lengkung: makin ke atas makin menjauh dari pangkal.
      ruas.position.set(
        Math.sin(t * condong) * tinggi * 0.28,
        tinggi / RUAS / 2 + i * (tinggi / RUAS),
        0,
      );
      ruas.rotation.z = -t * condong * 0.55;
      ruas.castShadow = true;
      pohon.add(ruas);
    }
    const puncakX = Math.sin(condong) * tinggi * 0.28;
    for (let d = 0; d < 6; d += 1) {
      const pelepah = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 2.5, 4),
        MS(PALET.daun, 0.88),
      );
      const a = (d / 6) * Math.PI * 2;
      pelepah.position.set(puncakX + Math.cos(a) * 0.95, tinggi + 0.2, Math.sin(a) * 0.95);
      pelepah.rotation.set(Math.PI / 2.4, 0, -a);
      pelepah.castShadow = true;
      pohon.add(pelepah);
      this._pelepah.push(pelepah);
    }
    pohon.position.set(x, 0, z);
    g.add(pohon);
    return pohon;
  }

  /**
   * @param {THREE.Scene} scene
   * @param {{ toast: { show: (m: string, t?: string) => void }, openPanel?: (id: string) => void }} [ctx]
   */
  mount(scene, ctx = null) {
    const g = this.root;

    // Pasir — permukaan yang dijalani.
    const pasir = new THREE.Mesh(
      new THREE.BoxGeometry(PANTAI_LEBAR, 0.9, PANTAI_DALAM),
      MS(PALET.pasir, 0.95),
    );
    pasir.position.set(0, -0.45, 0);
    pasir.receiveShadow = true;
    g.add(pasir);
    this.raycastMeshes.push(pasir);

    // Pita pasir basah. Tanpa ini pasir dan laut cuma dua bidang yang
    // bersentuhan — pelajaran yang sama dari anjungan Losari.
    const basah = new THREE.Mesh(
      new THREE.BoxGeometry(PANTAI_LEBAR, 0.04, 2.2),
      MS(PALET.pasirBsh, 0.9),
    );
    basah.position.set(0, 0.02, GARIS_AIR_Z + 1.1);
    g.add(basah);

    const laut = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 100),
      MS(PALET.laut, 0.4),
    );
    laut.rotation.x = -Math.PI / 2;
    laut.position.set(0, -0.06, GARIS_AIR_Z - 50);
    laut.receiveShadow = true;
    g.add(laut);

    const buih = new THREE.Mesh(
      new THREE.BoxGeometry(PANTAI_LEBAR + 8, 0.05, 0.8),
      MS(PALET.buih, 0.55),
    );
    buih.position.set(0, -0.02, GARIS_AIR_Z - 0.4);
    g.add(buih);
    this._buih = buih;

    // Candi bentar sebagai gerbang menuju pantai — persis peran aslinya
    // di Kuta, bukan hiasan yang ditempel biar terasa Bali.
    this._candiBentar(g, 0, PANTAI_DALAM / 2 - 2.2, Math.PI);

    // Kelapa berderet di sisi darat, condong ke arah laut.
    const posisiKelapa = [-12, -8.5, 8.5, 12.5];
    posisiKelapa.forEach((x, i) => {
      this._kelapa(g, x, PANTAI_DALAM / 2 - 5.5, 4.6 + (i % 2) * 0.9, 0.5 + (i % 3) * 0.12);
    });

    // Papan selancar ditancapkan di pasir — penanda surfing yang terbaca
    // dari kamera orbit tanpa perlu animasi ombak.
    const PAPAN_X = -5.5;
    for (let i = 0; i < 4; i += 1) {
      const papan = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 2.3, 0.09),
        MS(i % 2 ? PALET.papan : PALET.buih, 0.55),
      );
      papan.position.set(PAPAN_X + i * 0.95, 1.05, GARIS_AIR_Z + 4.2);
      papan.rotation.z = (i - 1.5) * 0.09;
      papan.castShadow = true;
      g.add(papan);
    }

    // Payung + kursi berjemur.
    const PAYUNG_X = 6.5;
    for (let i = 0; i < 2; i += 1) {
      const z = GARIS_AIR_Z + 4.5 + i * 3.2;
      const tiang = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6),
        MS(PALET.kelapa, 0.8),
      );
      tiang.position.set(PAYUNG_X, 1.1, z);
      g.add(tiang);

      const kanopi = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 0.6, 8),
        MS(PALET.payung, 0.85),
      );
      kanopi.position.set(PAYUNG_X, 2.4, z);
      kanopi.castShadow = true;
      g.add(kanopi);

      const kursi = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.16, 0.62),
        MS(PALET.buih, 0.8),
      );
      kursi.position.set(PAYUNG_X - 0.2, 0.35, z + 0.9);
      kursi.rotation.x = -0.18;
      kursi.castShadow = true;
      g.add(kursi);
    }

    // Obor pantai — Kuta terkenal karena matahari terbenamnya, jadi lampu
    // di sini ikut siklus hari seperti Spot lain.
    for (const x of [-14, 14]) {
      const batang = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, 2.4, 6),
        MS(PALET.kelapa, 0.8),
      );
      batang.position.set(x, 1.2, GARIS_AIR_Z + 3);
      g.add(batang);

      const api = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 6),
        MS(0xffb35c, 0.4),
      );
      api.position.set(x, 2.5, GARIS_AIR_Z + 3);
      api.material.emissive = new THREE.Color(0xffb35c);
      api.material.emissiveIntensity = 0.3;
      api.userData.isLampu = true;
      g.add(api);
      this._lampu.push(api);

      const nyala = new THREE.PointLight(0xffb35c, 0, 7, 2);
      nyala.position.set(x, 2.5, GARIS_AIR_Z + 3);
      nyala.userData.isLampu = true;
      g.add(nyala);
      this._lampu.push(nyala);
    }

    scene.add(g);

    const warpX = -11;
    const warpZ = PANTAI_DALAM / 2 - 2.5;
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
          id: 'kuta_selancar',
          shape: 'sphere',
          center: { x: PAPAN_X + 1.4, z: GARIS_AIR_Z + 4.2 },
          radius: 2.8,
          hint: '🏄 Sewa papan selancar',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Sewa papan + mini-game selancar — menyusul 🏄', 'a');
          },
        }),
        new InteractionVolume({
          id: 'kuta_candi_bentar',
          shape: 'sphere',
          center: { x: 0, z: PANTAI_DALAM / 2 - 2.2 },
          radius: 3.0,
          hint: '⛩ Candi bentar — gerbang pantai',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Gerbang belah dua: lambang dualitas yang seimbang ⛩', 'g');
          },
        }),
        new InteractionVolume({
          id: 'kuta_sunset',
          shape: 'sphere',
          center: { x: PAYUNG_X, z: GARIS_AIR_Z + 5.4 },
          radius: 3.0,
          hint: '🌅 Kursi pantai — lihat matahari terbenam',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Duduk & lihat sunset Kuta 🌅', 'g');
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
    this._pelepah = [];
    this._buih = null;
    this._warpRing = null;
  }

  /** @param {number} t */
  animate(t) {
    // Buih maju-mundur pelan. Amplitudo kecil — ombak yang bergerak jauh
    // terbaca sebagai bug, bukan laut.
    if (this._buih) {
      this._buih.position.z = GARIS_AIR_Z - 0.4 + Math.sin(t * 0.7) * 0.45;
    }
    // Pelepah kelapa bergoyang. Fase digeser per pelepah supaya tidak
    // bergerak serempak seperti satu benda.
    for (let i = 0; i < this._pelepah.length; i += 1) {
      this._pelepah[i].rotation.x = Math.PI / 2.4 + Math.sin(t * 0.9 + i * 0.7) * 0.045;
    }
    animateSpotWarpPortal(this._warpRing, t);
  }

  getRaycastTargets() {
    return this.raycastMeshes;
  }
}
