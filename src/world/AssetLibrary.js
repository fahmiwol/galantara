// ═══════════════════════════════════════════════════════
// AssetLibrary.js — Cache GLB/glTF per URL + apply manifest Spot
// Butuh THREE.GLTFLoader (script di index.html). Manifest boleh glbs: [].
//
// ── Collider aset (16 Sep 2026) ──────────────────────────────────────
// GLB yang ditaruh manifest dulu tanpa collider: tiga rumah panggung Losari
// bisa ditembus. Collider dibaca dari, berurutan:
//   1. `asset.extras.rupa3d.collider` di dalam GLB (usulan kontrak bersama
//      Rupa3D, belum diputuskan — pembacanya sudah siap);
//   2. berkas pendamping `<nama>.collider.json` di sebelah GLB.
// Keduanya berbentuk `{ versi: 1, jenis: 'statis', bagian: [...] }` dalam
// satuan GLB, diskala seragam dengan `scale` entri, dan didaftarkan HANYA
// setelah GLB-nya benar-benar ditempatkan — GLB yang gagal dimuat tidak boleh
// meninggalkan tembok tak terlihat.
// ═══════════════════════════════════════════════════════

import { bacaKontrakCollider, skalaDeskriptor } from '../fisika/bentuk.js';

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
    /** url → bagian collider (sudah diperiksa) atau null kalau aset tanpa collider. */
    this._collider = new Map();
    /**
     * Naik setiap detachBatch/applyManifest. GLB yang selesai dimuat SETELAH
     * pemain pindah Spot membawa generasi lama dan dibuang — tanpa ini
     * collider-nya terdaftar di Spot yang baru.
     */
    this._generasi = 0;
    /** @type {InstanceType<typeof THREE.GLTFLoader> | null} */
    this._loader =
      typeof THREE !== 'undefined' && THREE.GLTFLoader ? new THREE.GLTFLoader() : null;
  }

  /**
   * Fetch JSON manifest lalu load tiap entri ke `parent`.
   * @param {import('three').Object3D} parent
   * @param {string} manifestUrl — relatif ke origin, mis. `assets/spots/bogor/manifest.json`
   * @param {{ fisika?: import('../fisika/Fisika.js').Fisika | null, kelompok?: string }} [opsi]
   * @returns {Promise<void>}
   */
  async applyManifest(parent, manifestUrl, { fisika = null, kelompok = 'spot' } = {}) {
    this.detachBatch(parent);
    const generasi = this._generasi;

    let manifest = /** @type {SpotManifest} */ ({ glbs: [] });
    try {
      const res = await fetch(manifestUrl, { cache: 'no-store' });
      if (res.ok) manifest = await res.json();
    } catch (_) {
      return;
    }
    if (generasi !== this._generasi) return;

    const list = Array.isArray(manifest.glbs) ? manifest.glbs : [];
    if (!list.length || !this._loader) return;

    for (const entry of list) {
      if (!entry?.url) continue;
      const root = await this._loadOrClone(entry.url);
      // Pemain sudah pindah Spot selama GLB dimuat: jangan taruh apa pun.
      if (generasi !== this._generasi) return;
      if (!root) continue;

      const p = entry.position;
      if (p && p.length >= 3) root.position.set(p[0], p[1], p[2]);
      const s = entry.scale;
      if (typeof s === 'number' && s > 0) root.scale.setScalar(s);
      if (typeof entry.rotationY === 'number') root.rotation.y = entry.rotationY;

      parent.add(root);
      this._batchRoots.push(root);

      if (fisika) {
        const bagian = this._collider.get(entry.url);
        if (generasi !== this._generasi) return;
        if (bagian) {
          const skala = typeof s === 'number' && s > 0 ? s : 1;
          fisika.daftarkan(
            kelompok,
            bagian.map((d) => skalaDeskriptor(d, skala)),
            { x: root.position.x, y: root.position.y, z: root.position.z },
            root.rotation.y,
            `glb:${entry.url}`,
          );
        }
      }
    }
  }

  /**
   * Lepas root batch dari parent & dispose subtree mesh.
   * @param {import('three').Object3D} parent
   */
  detachBatch(parent) {
    this._generasi++;
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
    this._collider.clear();
  }

  /**
   * Collider satu aset: extras di GLB dulu, lalu berkas pendamping. Aset tanpa
   * keduanya → null, dengan satu peringatan (ia bisa ditembus).
   * @returns {Promise<object[] | null>}
   */
  async _bacaCollider(url, gltf) {
    const dariGlb = gltf?.parser?.json?.asset?.extras?.rupa3d?.collider;
    try {
      if (dariGlb) return bacaKontrakCollider(dariGlb, url);
      const res = await fetch(url.replace(/\.gl(b|tf)$/i, '.collider.json'), { cache: 'no-store' });
      if (res.ok) return bacaKontrakCollider(await res.json(), url);
    } catch (e) {
      console.warn(`[fisika] collider aset "${url}" rusak — aset ditaruh tanpa collider`, e);
      return null;
    }
    console.warn(`[fisika] aset "${url}" tidak menyatakan collider — bisa ditembus`);
    return null;
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
      this._collider.set(url, await this._bacaCollider(url, gltf));
      return /** @type {import('three').Group} */ (scene.clone(true));
    } catch (_) {
      return null;
    }
  }
}
