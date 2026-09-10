// ═══════════════════════════════════════════════════════
// BogorSpotRuntime.js — POC ruang kecil: alun-alun vibe hijau
// Warung + bangku — prioritas interaksi ringan, bukan detail mesh
// ═══════════════════════════════════════════════════════

import { InteractionVolume } from '../../interaction/InteractionVolume.js';
import { MejaNongkrong } from '../MejaNongkrong.js';
import { animateSpotWarpPortal, createSpotWarpPortal } from '../spotWarpPortal.js';

const MS = (color, roughness = 0.72) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.04,
  });

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

    const ground = new THREE.Mesh(
      new THREE.CylinderGeometry(14, 15.2, 1.05, 26),
      MS(0x2f6b44),
    );
    ground.position.set(0, -0.52, 0);
    ground.receiveShadow = true;
    g.add(ground);
    this.raycastMeshes.push(ground);

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
    this._awning = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.12, 1.9),
      MS(0x166534, 0.65),
    );
    this._awning.position.set(0, 1.38, 0.15);
    this._awning.castShadow = true;
    stall.add(this._awning);
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
