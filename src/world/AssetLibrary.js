// ═══════════════════════════════════════════════════════
// AssetLibrary.js — Cache GLB/glTF per URL + apply manifest Spot
// Butuh THREE.GLTFLoader (script di index.html). Manifest boleh glbs: [].
// ═══════════════════════════════════════════════════════

/**
 * @typedef {{ url: string, position?: number[], rotationY?: number, scale?: number }} ManifestGlbEntry
 * @typedef {{ version?: number, spotId?: string, glbs?: ManifestGlbEntry[] }} SpotManifest
 */

export class AssetLibrary {
  constructor() {
    /** @type {Map<string, import('three').Group>} */
    this._cache = new Map();
    /** Root yang ditambahkan lewat applyManifest (untuk dispose batch) */
    this._batchRoots = [];
    /** @type {InstanceType<typeof THREE.GLTFLoader> | null} */
    this._loader =
      typeof THREE !== 'undefined' && THREE.GLTFLoader ? new THREE.GLTFLoader() : null;
  }

  /**
   * Fetch JSON manifest lalu load tiap entri ke `parent`.
   * @param {import('three').Object3D} parent
   * @param {string} manifestUrl — relatif ke origin, mis. `assets/spots/bogor/manifest.json`
   * @returns {Promise<void>}
   */
  async applyManifest(parent, manifestUrl) {
    this.detachBatch(parent);

    let manifest = /** @type {SpotManifest} */ ({ glbs: [] });
    try {
      const res = await fetch(manifestUrl, { cache: 'no-store' });
      if (res.ok) manifest = await res.json();
    } catch (_) {
      return;
    }

    const list = Array.isArray(manifest.glbs) ? manifest.glbs : [];
    if (!list.length || !this._loader) return;

    for (const entry of list) {
      if (!entry?.url) continue;
      const root = await this._loadOrClone(entry.url);
      if (!root) continue;

      const p = entry.position;
      if (p && p.length >= 3) root.position.set(p[0], p[1], p[2]);
      const s = entry.scale;
      if (typeof s === 'number' && s > 0) root.scale.setScalar(s);
      if (typeof entry.rotationY === 'number') root.rotation.y = entry.rotationY;

      parent.add(root);
      this._batchRoots.push(root);
    }
  }

  /**
   * Lepas root batch dari parent & dispose subtree mesh.
   * @param {import('three').Object3D} parent
   */
  detachBatch(parent) {
    for (const root of this._batchRoots) {
      parent.remove(root);
      root.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose?.());
        }
      });
    }
    this._batchRoots = [];
  }

  /** Kosongkan cache URL (panggil saat hot-reload dev / ganti user); batch harus sudah detach */
  clearCache() {
    this._cache.clear();
  }

  /**
   * @param {string} url
   * @returns {Promise<import('three').Group | null>}
   */
  async _loadOrClone(url) {
    if (this._cache.has(url)) {
      const template = this._cache.get(url);
      return /** @type {import('three').Group} */ (template.clone(true));
    }
    if (!this._loader) return null;
    try {
      const gltf = await new Promise((resolve, reject) => {
        this._loader.load(url, resolve, undefined, reject);
      });
      const scene = gltf.scene;
      scene.name = `asset:${url}`;
      this._cache.set(url, scene);
      return /** @type {import('three').Group} */ (scene.clone(true));
    } catch (_) {
      return null;
    }
  }
}
