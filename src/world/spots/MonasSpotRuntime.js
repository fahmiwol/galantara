// ═══════════════════════════════════════════════════════
// MonasSpotRuntime.js — POC plaza Jakarta: lapangan + obelisk stilized
// Pola sama Bogor: root, raycast ground, volume + [F], manifest GLB opsional
// ═══════════════════════════════════════════════════════

import { cincinTepi } from '../../fisika/Fisika.js';
import { UKURAN_KAPSUL } from '../../fisika/Karakter.js';
import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { animateSpotWarpPortal, createSpotWarpPortal } from '../spotWarpPortal.js';

const MS = (color, roughness = 0.72) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.05,
  });

/**
 * Plaza — SATU sumber angka untuk mesh dan collider-nya.
 * CylinderGeometry(jariAtas, jariBawah, tinggi, segmen) di y = pusatY, jadi
 * permukaan yang diinjak ada di pusatY + tinggi / 2 = 0,02 m, bukan 0.
 */
export const TANAH = Object.freeze({ jariAtas: 16, jariBawah: 17, tinggi: 1.0, pusatY: -0.48, segmen: 28 });

/** Jarak minimum pusat pemain dari tepi atas plaza yang TERLIHAT. */
export const SISA_TEPI = 0.1;

/** Jumlah potongan cincin tepi. Dipakai rumus JARI_TEPI, jadi dikirim eksplisit. */
export const SEGMEN_TEPI = 32;

/**
 * Jari permukaan DALAM cincin tepi — diturunkan dari SISA_TEPI, bukan dipilih.
 *
 * Dua poligon memakan sisa itu:
 *   - tepi atas plaza 28 potongan paling dekat di tengah sisinya:
 *     jariAtas · cos(π/28) = 15,90 m, bukan 16;
 *   - di sambungan cincin, pusat kapsul sampai (jari − 0,40) / cos(π/32),
 *     lebih jauh daripada di tengah potongan.
 * Hasilnya 16,12 — di LUAR tepi plaza, dan memang harus: kapsul menahan
 * pusatnya 0,40 m dari dinding. Offset pengendali (0,02) sengaja tidak
 * dikurangkan: itu cadangannya.
 */
export const JARI_TEPI = (TANAH.jariAtas * Math.cos(Math.PI / TANAH.segmen) - SISA_TEPI)
  * Math.cos(Math.PI / SEGMEN_TEPI) + UKURAN_KAPSUL[0] / 2;

export class MonasSpotRuntime {
  constructor() {
    /** @type {THREE.Group} */
    this.root = new THREE.Group();
    this.root.name = 'spot:monas';
    /** @type {THREE.Mesh[]} */
    this.raycastMeshes = [];
    /** Dunia fisika dari ctx saat mount; null = tanpa fisika.
     *  @type {import('../../fisika/Fisika.js').Fisika | null} */
    this._fisika = null;
    /** @type {string | undefined} */
    this._kelompokFisika = undefined;
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
   *   fisika?: import('../../fisika/Fisika.js').Fisika,
   *   kelompokFisika?: string,
   * }} [ctx]
   */
  mount(scene, ctx = null) {
    const g = this.root;

    // Monas menyatakan tanah dan batasnya sendiri. Bawaan Game (lantai di y 0
    // + cincin 17 m) salah untuk plaza ini: permukaannya di y 0,02, dan tepinya
    // di 16 m — pemain akan berjalan di udara sampai 1 m di luar plaza.
    this.fisikaTanah = true;
    this._fisika = ctx?.fisika ?? null;
    this._kelompokFisika = ctx?.kelompokFisika;

    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(TANAH.jariAtas, TANAH.jariBawah, TANAH.tinggi, TANAH.segmen),
      MS(0xd8d4c8, 0.9),   // plaza putih-krem (sekunder PRD)
    );
    plaza.position.set(0, TANAH.pusatY, 0);
    plaza.receiveShadow = true;
    g.add(plaza);
    this.raycastMeshes.push(plaza);
    // Hanya jari ATAS yang dimodelkan: sisi plaza melebar ke 17 m di bawah
    // permukaan, di luar cincin tepi, jadi tidak pernah disentuh pemain.
    this._daftarFisika([{ bentuk: 'silinder', ukuran: [TANAH.jariAtas * 2, TANAH.tinggi, TANAH.jariAtas * 2] }],
      { x: 0, y: TANAH.pusatY, z: 0 }, 0, 'tanah_monas');
    this._daftarFisika(cincinTepi(JARI_TEPI, SEGMEN_TEPI), { x: 0, y: 0, z: 0 }, 0, 'tepi_monas');

    const grass = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 5.5, 24),
      MS(0x2f6b3a, 0.9),   // hijau — PRIMER PRD, bukan aksen
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, 0.04, 0);
    g.add(grass);

    // Obelisk stylized (tong + atap emas)
    // Dasar tugu MENAPAK plaza (y 0,02). Dulu kotak 5,5 berpusat di 2,85 —
    // dasarnya 0,10, melayang 8 cm dengan celah bayangan yang terbaca dari
    // kamera. Puncaknya tetap 5,60 supaya kerucut emas tidak bergeser.
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 5.58, 1.1),
      MS(0xe5e7eb, 0.55),
    );
    base.position.set(0, 2.81, 0);
    base.castShadow = true;
    base.name = 'monas_tugu';
    g.add(base);
    // Penghalang dimulai dari tanah: collider 0 → 5,60 (mesh 0,02 → 5,60).
    // Atap emas di atas kepala dan berputar: tanpa collider.
    this._daftarFisika([{ bentuk: 'kotak', ukuran: [1.1, 5.6, 1.1], letak: [0, 2.8, 0] }],
      { x: 0, y: 0, z: 0 }, 0, 'monas_tugu');

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
    // Tanpa collider: cincin rebah setinggi 0,12 m, di bawah batas naik tangga.
    // Collider hanya membuat pemain tersentak naik-turun tiap melintasinya.


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
      // Badan meruncing 0,78 → 0,62; setinggi kapsul pemain (0–1,3 m)
      // rata-ratanya ±0,73. Goyang di animate() berporos di pusat badan dan
      // menggeser kakinya < 6 cm, jadi collider tetap cukup. Kepala dan mahkota
      // mulai 1,93 m — di atas kepala.
      this._daftarFisika([{ bentuk: 'silinder', ukuran: [1.46, 2.1, 1.46], letak: [0, 1.05, 0] }],
        { x: ox, y: 0, z: oz }, 0, `monas_ondel_${i}`);

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
    const RK_X = 8.2, RK_Z = 7.4, RK_LEBAR = 5.2, RK_DALAM = 4.0, RK_PUTAR = -0.5;
    // Collider rumah memakai induk dan putaran grup yang sama; `letak` = posisi lokal mesh.
    const rkInduk = { x: RK_X, y: 0, z: RK_Z };

    const rkBadan = new THREE.Mesh(
      new THREE.BoxGeometry(RK_LEBAR, 2.25, RK_DALAM),
      MS(0xf2ede4, 0.9),
    );
    rkBadan.position.set(0, 1.13, 0);
    rkBadan.castShadow = true;
    rk.add(rkBadan);
    // Badan rumah padat penuh — tidak ada pintu yang dimodelkan. Atap, lisplang,
    // dan gigi balang mulai ±2,2 m, di atas kepala: tanpa collider.
    this._daftarFisika([{ bentuk: 'kotak', ukuran: [RK_LEBAR, 2.25, RK_DALAM], letak: [0, 1.13, 0] }],
      rkInduk, RK_PUTAR, 'monas_rumah_kebaya');

    // Dua bidang miring + satu bidang datar di tengah = siluet kebaya.
    for (const sisi of [-1, 1]) {
      const miring = new THREE.Mesh(
        new THREE.BoxGeometry(RK_LEBAR + 0.7, 0.16, 1.55),
        MS(0x8a5a3c, 0.88),
      );
      miring.position.set(0, 2.72, sisi * 1.4);
      // Tanda POSITIF: tepi luar turun ke lisplang (y 2,335, tempat gigi balang
      // digantung di 2,34), tepi dalam naik menyambung bidang datar (3,105 vs
      // 3,12). Tanda negatif sebelumnya membalik keduanya — siluet kupu-kupu,
      // bukan perisai — dan gigi balang menggantung di udara di bawah atap.
      miring.rotation.x = sisi * 0.52;
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
    // Teras memang untuk diinjak: permukaannya 0,16 m di atas plaza, di bawah
    // batas naik tangga 0,35 — satu anak tangga, bukan kebocoran.
    this._daftarFisika([{ bentuk: 'kotak', ukuran: [RK_LEBAR, 0.18, 1.6], letak: [0, 0.09, -RK_DALAM / 2 - 0.8] }],
      rkInduk, RK_PUTAR, 'monas_teras');
    // Atap teras. Tanpa ini dua tiang di tepi teras berdiri 1,3 m di depan
    // lisplang dan tidak menopang apa pun. Sengkuap tipis dari lisplang depan
    // (z −2,0, y 2,35) turun ke puncak tiang (z −3,55, y 2,20).
    const atapTeras = new THREE.Mesh(
      new THREE.BoxGeometry(RK_LEBAR + 0.3, 0.1, 1.56),
      MS(0x8a5a3c, 0.88),
    );
    atapTeras.position.set(0, 2.28, -RK_DALAM / 2 - 0.78);
    atapTeras.rotation.x = -0.096;   // tepi luar (−z) lebih rendah
    atapTeras.castShadow = true;
    rk.add(atapTeras);
    for (const tx of [-1.9, 1.9]) {
      const tiang = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 2.1, 6),
        MS(0x8a5a3c, 0.82),
      );
      tiang.position.set(tx, 1.15, -RK_DALAM / 2 - 1.4);
      rk.add(tiang);
      // Kaki tiang (0,10) tertanam di teras (permukaan 0,18), jadi angka mesh
      // apa adanya sudah menyambung ke lantai.
      this._daftarFisika([{ bentuk: 'silinder', ukuran: [0.18, 2.1, 0.18], letak: [tx, 1.15, -RK_DALAM / 2 - 1.4] }],
        rkInduk, RK_PUTAR, 'monas_tiang_teras');
    }

    rk.position.set(RK_X, 0, RK_Z);   // RK_X/RK_Z/RK_PUTAR dinaikkan di deklarasi
    rk.rotation.y = RK_PUTAR;
    g.add(rk);

    scene.add(g);

    const warpX = 12;
    const warpZ = 0.5;
    const { warpRing } = createSpotWarpPortal(g, warpX, warpZ);
    this._warpRing = warpRing;
    // Mesh portal ada di spotWarpPortal.js (bersama semua Spot); angka ini
    // SALINAN pedestalnya: CylinderGeometry(0.45, 0.65, 0.45) di y 0,22.
    // Ubah keduanya bersamaan. Hanya pedestal yang padat — cincinnya
    // berputar, sama dengan portal Oola (World._buildWarpPortal).
    this._daftarFisika([{ bentuk: 'silinder', ukuran: [1.3, 0.45, 1.3], letak: [0, 0.22, 0] }],
      { x: warpX, y: 0, z: warpZ }, 0, 'monas_portal');

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
   * Daftarkan collider ke kelompok fisika Spot. Tanpa fisika (ctx null) = tidak
   * melakukan apa-apa; sebelum fisika siap = masuk antrean Fisika. Melepasnya
   * tugas Game (`lepasKelompok` saat warp), bukan dispose.
   */
  _daftarFisika(deskriptor, induk, putarY = 0, pemilik = 'monas') {
    this._fisika?.daftarkan(this._kelompokFisika, deskriptor, induk, putarY, pemilik);
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
    this._fisika = null;
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
