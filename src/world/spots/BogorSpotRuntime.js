// ═══════════════════════════════════════════════════════
// BogorSpotRuntime.js — POC ruang kecil: alun-alun vibe hijau
// Warung + bangku — prioritas interaksi ringan, bukan detail mesh
// ═══════════════════════════════════════════════════════

import { cincinTepi } from '../../fisika/Fisika.js';
import { UKURAN_KAPSUL } from '../../fisika/Karakter.js';
import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { MejaNongkrong } from '../MejaNongkrong.js';
import { animateSpotWarpPortal, createSpotWarpPortal } from '../spotWarpPortal.js';

const MS = (color, roughness = 0.72) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.04,
  });

/**
 * Tanah alun-alun — SATU sumber angka untuk mesh dan collider-nya.
 * CylinderGeometry(jariAtas, jariBawah, tinggi, segmen) di y = pusatY, jadi
 * permukaan yang diinjak ada di pusatY + tinggi / 2 = 0,005 m.
 */
export const TANAH = Object.freeze({ jariAtas: 14, jariBawah: 15.2, tinggi: 1.05, pusatY: -0.52, segmen: 26 });

/** Jarak minimum pusat pemain dari tepi atas tanah yang TERLIHAT. */
export const SISA_TEPI = 0.1;

/** Jumlah potongan cincin tepi. Dipakai rumus JARI_TEPI, jadi dikirim eksplisit. */
export const SEGMEN_TEPI = 32;

/**
 * Jari permukaan DALAM cincin tepi — diturunkan dari SISA_TEPI, bukan dipilih.
 *
 * Dua poligon memakan sisa itu:
 *   - tepi atas tanah 26 potongan paling dekat di tengah sisinya:
 *     jariAtas · cos(π/26) = 13,90 m, bukan 14;
 *   - di sambungan cincin, pusat kapsul sampai (jari − 0,40) / cos(π/32),
 *     lebih jauh daripada di tengah potongan.
 * Offset pengendali (0,02) sengaja tidak dikurangkan: itu cadangannya.
 */
export const JARI_TEPI = (TANAH.jariAtas * Math.cos(Math.PI / TANAH.segmen) - SISA_TEPI)
  * Math.cos(Math.PI / SEGMEN_TEPI) + UKURAN_KAPSUL[0] / 2;

export class BogorSpotRuntime {
  constructor() {
    /** @type {THREE.Group} */
    this.root = new THREE.Group();
    this.root.name = 'spot:bogor';
    /** @type {THREE.Mesh[]} */
    this.raycastMeshes = [];
    /** @type {THREE.Mesh | null} */
    this._awning = null;
    /** @type {THREE.Mesh | null} */
    this._warpRing = null;
    /** @type {InteractionVolume[]} */
    this.interactionVolumes = [];
    /** Social node Spot ini — dibaca Game untuk keterisian kursi.
     *  @type {MejaNongkrong[]} */
    this.meja = [];
    /** Dunia fisika dari ctx saat mount; null kalau tidak ada.
     *  @type {import('../../fisika/Fisika.js').Fisika | null} */
    this._fisika = null;
    /** @type {string | undefined} */
    this._kelompokFisika = undefined;
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

    // Spot ini menyatakan tanah dan batasnya sendiri, jadi Game tidak memasang
    // lantai datar 120×120 + cincin 17 m bawaannya — dengan bawaan itu pemain
    // bisa berjalan sampai 17 m, tiga meter di luar tanah yang terlihat.
    this.fisikaTanah = true;
    this._fisika = ctx?.fisika ?? null;
    this._kelompokFisika = ctx?.kelompokFisika;

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(TANAH.jariAtas, TANAH.jariBawah, TANAH.tinggi, TANAH.segmen),
      MS(0x2f6b44),
    );
    ground.position.set(0, TANAH.pusatY, 0);
    ground.receiveShadow = true;
    g.add(ground);
    this.raycastMeshes.push(ground);
    // Tanah fisika = permukaan atas mesh ini (0,005 m). Jari ATAS, bukan bawah:
    // sisi miring 14 → 15,2 m tidak pernah diinjak, cincin menahan lebih dulu.
    this._daftarFisika([{
      bentuk: 'silinder',
      ukuran: [TANAH.jariAtas * 2, TANAH.tinggi, TANAH.jariAtas * 2],
    }], ground.position, 0, 'bogor_tanah');
    // Dinding tak terlihat di tepi: pemain meluncur menyusurinya, tidak jatuh
    // dari alun-alun. Jarinya diturunkan di JARI_TEPI.
    this._daftarFisika(cincinTepi(JARI_TEPI, SEGMEN_TEPI), { x: 0, y: 0, z: 0 }, 0, 'bogor_tepi');

    // Tanah gembur: bidang rata tanpa tebal di atas rumput — diinjak, tanpa collider.
    const soil = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 8, 20),
      MS(0x5c4a32, 0.88),
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.set(0, 0.02, 0);
    g.add(soil);

    // Warung sederhana (kubus + kanopi)
    const stall = new THREE.Group();
    stall.position.set(-4, 0, 2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.35, 1.6), MS(0x8b5a2b));
    body.position.y = 0.68;
    body.castShadow = true;
    stall.add(body);
    // Badan warung padat, angka sama dengan mesh-nya; dasarnya 0,005 = permukaan tanah.
    this._daftarFisika([{ bentuk: 'kotak', ukuran: [2.2, 1.35, 1.6], letak: [0, 0.68, 0] }],
      stall.position, 0, 'bogor_warung');
    // Tenda tanpa collider: dasarnya 1,32 m, setinggi ubun-ubun kapsul dan di
    // atas kepala avatar (1,23) — dan ia bergoyang di animate().
    this._awning = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.12, 1.9),
      MS(0x166534, 0.65),
    );
    this._awning.position.set(0, 1.38, 0.15);
    this._awning.castShadow = true;
    stall.add(this._awning);
    // Papan nama tanpa collider: menempel di muka badan dan menonjol 6 cm.
    // Kapsul sudah berhenti 42 cm dari muka itu; kepala avatar (jari 0,38)
    // paling jauh menyentuhnya ±2 cm.
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.35, 0.06),
      MS(0xfef3c7, 0.55),
    );
    sign.position.set(0, 1.05, 0.83);
    stall.add(sign);
    g.add(stall);

    // Bangku — social node, dan sekarang benar-benar begitu.
    //
    // Sebelumnya dua papan hiasan, dan [F]-nya cuma memunculkan toast
    // "Mode duduk — animasi & pose menyusul". Bangku memakai geometri sosial
    // yang BERBEDA dari meja: orang duduk bersebelahan menghadap arah yang
    // sama, bukan berhadapan.
    for (const [i, [bx, bz, rot]] of [[3, -1.5, 0], [2.2, 2.4, Math.PI / 2.3]].entries()) {
      const bangku = new MejaNongkrong({
        id: `bogor_bangku_${i + 1}`,
        nama: 'Bangku',
        gaya: 'bangku',
        x: bx,
        z: bz,
        kursi: 2,
        rotasi: rot,
      });
      bangku.bangun(g);
      bangku.daftarkanFisika(ctx?.fisika, ctx?.kelompokFisika);
      this.meja.push(bangku);
    }

    // Pohon kecil (low poly)
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 1.4, 6),
      MS(0x4a3728),
    );
    trunk.position.set(5, 0.7, 3);
    trunk.castShadow = true;
    g.add(trunk);
    // Batang saja, meruncing 0,32 → 0,22. Kapsul menyentuhnya pertama di pangkal
    // bagian lurusnya (±0,42 m), tempat jari batang ±0,29 — jadi silinder 0,60.
    this._daftarFisika([{ bentuk: 'silinder', ukuran: [0.6, 1.4, 0.6] }], trunk.position, 0, 'bogor_pohon');
    // Kanopi tanpa collider (ADR-0016): dasarnya 0,95 m, jadi ia menembus kepala
    // yang merapat ke batang — harga pohon yang tidak terasa seperti tembok.
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 7, 5),
      MS(0x22c55e, 0.78),
    );
    crown.position.set(5, 2.05, 3);
    crown.castShadow = true;
    g.add(crown);

    scene.add(g);

    const warpX = 9.5;
    const warpZ = -5.2;
    const { warpRing } = createSpotWarpPortal(g, warpX, warpZ);
    this._warpRing = warpRing;
    // Mesh portal dibangun spotWarpPortal.js (berkas bersama), jadi collider-nya
    // di sini dengan angka alasnya: CylinderGeometry(0,45, 0,65, 0,45) di y 0,22.
    // Hanya alas yang padat — cincinnya BERPUTAR di animate() dan melangkah ke
    // cincin portal memang yang diharapkan; piringan (1,45 m) dan label (2,75 m)
    // di atas kepala. Diameter bawah 1,30, sama dengan portal Oola.
    // Tinggi 0,60, bukan 0,45: ujung kapsul bundar, dan terukur ia MEMANJAT tepi
    // silinder 0,45 (kaki naik sampai 0,40 m) walau batas naik tangga 0,35.
    this._daftarFisika([{ bentuk: 'silinder', ukuran: [1.3, 0.6, 1.3], letak: [0, 0.3, 0] }],
      { x: warpX, y: 0, z: warpZ }, 0, 'bogor_portal');

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
          id: 'warung',
          shape: 'sphere',
          center: { x: -4, z: 2.2 },
          radius: 2.35,
          hint: '🏠 Warung POC',
          useKeyHint: '[F]',
          onUse: () => {
            T.show('Warung: katalog virtual + Mighan — menyusul 💰', 'g');
          },
        }),
        ...this.meja.map((m) => new InteractionVolume({
          id: m.id,
          shape: 'sphere',
          center: { x: m.x, z: m.z },
          radius: m.jariInteraksi,
          hint: `${m.ikon} ${m.nama}`,
          useKeyHint: `[F] ${m.ajakan}`,
        })),
      ];
    }

    return this;
  }

  /**
   * Daftarkan collider satu benda Spot ini ke kelompok milik Game. Aman tanpa
   * ctx (no-op) dan sebelum fisika siap (antrean di Fisika). Melepasnya bukan
   * urusan runtime: Game melepas kelompok 'spot' utuh saat warp.
   */
  _daftarFisika(deskriptor, induk, putarY, pemilik) {
    this._fisika?.daftarkan(this._kelompokFisika, deskriptor, induk, putarY, pemilik);
  }

  /** Belum punya lampu sendiri; kembalikan kosong supaya Game tidak
   *  mewarisi daftar lampu Spot sebelumnya. */
  getLampu() {
    return [];
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
    this._awning = null;
    this._warpRing = null;
    this._fisika = null;
  }

  /** @param {number} t */
  animate(t) {
    if (this._awning) {
      this._awning.rotation.y = Math.sin(t * 0.65) * 0.06;
    }
    animateSpotWarpPortal(this._warpRing, t);
  }

  getRaycastTargets() {
    return this.raycastMeshes;
  }
}
