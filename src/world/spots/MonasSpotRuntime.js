// ═══════════════════════════════════════════════════════
// MonasSpotRuntime.js — POC plaza Jakarta: lapangan + obelisk stilized
// Pola sama Bogor: root, raycast ground, volume + [F], manifest GLB opsional
// ═══════════════════════════════════════════════════════

import { InteractionVolume } from '../../interaction/InteractionVolume.js';

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
    /** @type {InteractionVolume[]} */
    this.interactionVolumes = [];
  }

  /**
   * @param {THREE.Scene} scene
   * @param {{ toast: { show: (msg: string, type?: string) => void } }} [ctx]
   */
  mount(scene, ctx = null) {
    const g = this.root;

    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 17, 1.0, 28),
      MS(0x9ca3af, 0.88),
    );
    plaza.position.set(0, -0.48, 0);
    plaza.receiveShadow = true;
    g.add(plaza);
    this.raycastMeshes.push(plaza);

    const grass = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 5.5, 24),
      MS(0x4d7c0f, 0.9),
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

    scene.add(g);

    this.interactionVolumes = [];
    if (ctx?.toast) {
      const T = ctx.toast;
      this.interactionVolumes = [
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
  }

  /** @param {number} t */
  animate(t) {
    if (this._goldTip) {
      this._goldTip.rotation.y = t * 0.12;
    }
  }

  getRaycastTargets() {
    return this.raycastMeshes;
  }
}
