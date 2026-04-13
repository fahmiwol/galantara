// ═══════════════════════════════════════════════════════
// World.js — Membangun dunia Oola (island melayang)
// Soft · Bubbly · Playful · Low Poly · Semi-3D · Chibi
// ═══════════════════════════════════════════════════════

import { buildProceduralGroup } from '../tools/proceduralMeshFactory.js';
import { PALETTE_SLOTS } from '../data/styleTokens.js';

const M = (color) => new THREE.MeshLambertMaterial({ color });
const MS = (color, r = 0.7) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: 0.05 });

export class World {
  constructor(scene) {
    this.scene     = scene;
    /** @type {THREE.Group | null} */
    this.worldRoot = null; // isi Oola — bisa di-dispose saat ganti Spot visual
    this.objects   = []; // mesh di island (raycast MapBuilder) — tidak pakai scene.traverse()
    this.mapData   = null;
  }

  async init(mapPath = 'src/data/maps/default_oola.json') {
    try {
      const resp = await fetch(mapPath);
      this.mapData = await resp.json();
    } catch (e) {
      console.error('Gagal load map:', e);
    }
  }

  build() {
    this._mountIslandGeometry();
    if (!this.skyDome) this._buildSkyDome();
  }

  /** Lepas island Oola (tanpa sky). Dipanggil sebelum mount Spot lain (mis. Bogor). */
  disposeContent() {
    if (this.worldRoot) {
      this.worldRoot.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m?.dispose?.());
        }
      });
      this.scene.remove(this.worldRoot);
      this.worldRoot = null;
    }
    this.halo       = null;
    this.warpPortal = null;
    this.objects    = [];
  }

  /** Bangun ulang island dari `mapData` (sky tetap). */
  rebuildContent() {
    this._mountIslandGeometry();
  }

  _ensureWorldRoot() {
    if (!this.worldRoot) {
      this.worldRoot = new THREE.Group();
      this.worldRoot.name = 'world:oola';
      this.scene.add(this.worldRoot);
    }
  }

  /** Tambah mesh ke island + daftar raycast */
  _addToIsland(mesh) {
    this._ensureWorldRoot();
    this.worldRoot.add(mesh);
    this.objects.push(mesh);
    return mesh;
  }

  _mountIslandGeometry() {
    this._ensureWorldRoot();
    this._buildGround();
    this._buildIslandBase();

    if (this.mapData && this.mapData.objects) {
      this.mapData.objects.forEach((obj) => {
        if (obj.type === 'native' && typeof this[obj.method] === 'function') {
          this[obj.method](obj.pos.x, obj.pos.y, obj.pos.z, obj.id);
        }
      });
    } else {
      this._buildPurpleTree(0, 0, 0, 'landmark_tree');
      this._buildWarpPortal(-7, 0, -2);
      this._buildInfoBoard(1, 0, 0);
      this._buildSuggestionBox(-9, 0, 3);
      this._buildDevHub(8, 0, -2.5);
      this._buildDecorations();
    }

    if (this.mapData?.procedural_props?.length) {
      for (const prop of this.mapData.procedural_props) {
        if (!prop?.archetype || !prop?.pos) continue;
        const paletteId = prop.paletteId || 'jakarta_warm';
        const pal = PALETTE_SLOTS[paletteId] || PALETTE_SLOTS.jakarta_warm;
        const g = buildProceduralGroup(
          prop.archetype,
          pal,
          prop.seed ?? 42,
          typeof prop.scale === 'number' ? prop.scale : 1,
        );
        g.position.set(prop.pos.x, prop.pos.y, prop.pos.z);
        this.addObject(g, prop.id || `prop_${prop.archetype}`);
      }
    }
  }

  /** Tambahkan objek baru ke dunia secara runtime (untuk Game Builder) */
  addObject(group, id) {
    if (!this.worldRoot) this._ensureWorldRoot();
    group.name = id;
    this.worldRoot.add(group);
    this.objects.push(group);
    return group;
  }

  // ── GROUND PLANE ──────────────────────────────────
  _buildGround() {
    const geo = new THREE.CylinderGeometry(20, 22, 1.2, 32);
    const mat = MS(0x7BC67E);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -0.6, 0);
    mesh.receiveShadow = true;
    this._addToIsland(mesh);

    // Outer edge darker
    const edgeGeo = new THREE.CylinderGeometry(22, 23, 0.8, 32);
    const edgeMat = MS(0x5A9E5E);
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(0, -1.2, 0);
    this._addToIsland(edge);

    // Water ring
    const waterGeo = new THREE.CylinderGeometry(25, 25, 0.3, 32);
    const waterMat = MS(0x38BDF8, 0.1);
    waterMat.transparent = true;
    waterMat.opacity = 0.7;
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, -2, 0);
    this._addToIsland(water);
  }

  // ── ISLAND BASE (floating clouds underneath) ──────
  _buildIslandBase() {
    const positions = [[0, -2.5, 0, 8], [-6, -3.5, 4, 5], [5, -3, -6, 4], [-3, -4, -5, 3]];
    positions.forEach(([x, y, z, r]) => {
      const geo = new THREE.SphereGeometry(r, 8, 6);
      const mat = MS(0xF0F8FF, 0.3);
      mat.transparent = true; mat.opacity = 0.6;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this._addToIsland(mesh);
    });
  }

  // ── PURPLE TREE (landmark utama Oola) ─────────────
  _buildPurpleTree(x = 0, y = 0, z = 0, id = 'purple_tree') {
    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 4, 8),
      MS(0x6B3F1A),
    );
    trunk.position.set(x, y + 2, z);
    trunk.castShadow = true;
    trunk.name = `${id}_trunk`;
    this._addToIsland(trunk);

    // Canopy layers (3 spheres)
    const canopyColors = [0x7C3AED, 0x8B5CF6, 0x6D28D9];
    const canopyData   = [
      [x, y + 4.5, z, 2.8],
      [x - 0.8, y + 4, z + 0.8, 2.0],
      [x + 0.8, y + 3.8, z - 0.8, 1.8]
    ];
    canopyData.forEach(([cx, cy, cz, cr], i) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(cr, 10, 8),
        MS(canopyColors[i], 0.8),
      );
      mesh.position.set(cx, cy, cz);
      mesh.castShadow = true;
      mesh.name = `${id}_canopy_${i}`;
      this._addToIsland(mesh);
    });

    // Halo ring (golden glow)
    const haloGeo = new THREE.TorusGeometry(2.2, 0.12, 8, 32);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xFDE68A });
    this.halo = new THREE.Mesh(haloGeo, haloMat);
    this.halo.position.set(x, y + 7.5, z);
    this.halo.rotation.x = Math.PI / 2;
    this.halo.name = `${id}_halo`;
    this._addToIsland(this.halo);
  }

  // ── WARP PORTAL ───────────────────────────────────
  _buildWarpPortal(x = -7, y = 0, z = -2) {
    // Ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.15, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x7C3AED }),
    );
    ring.position.set(x, y + 1.5, z);
    this._addToIsland(ring);

    // Inner glow disc
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 32),
      new THREE.MeshBasicMaterial({ color: 0x4F46E5, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    disc.position.set(x, y + 1.5, z);
    disc.rotation.y = Math.PI / 2;
    this._addToIsland(disc);

    // Pedestal
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 0.5, 8),
      MS(0x4B5563),
    );
    ped.position.set(x, y + 0.25, z);
    this._addToIsland(ped);

    // Label sign
    this._buildSign(x, y + 2.8, z, '🌀 Warp Portal', 0x4F46E5);

    this.warpPortal = ring;
  }

  // ── INFO BOARD ────────────────────────────────────
  _buildInfoBoard(x = 1, y = 0, z = 0) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2, 6),
      MS(0x92400E),
    );
    post.position.set(x, y + 1, z);
    this._addToIsland(post);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1, 0.08),
      MS(0xFDE68A, 0.9),
    );
    board.position.set(x, y + 2.3, z);
    this._addToIsland(board);
  }

  // ── SUGGESTION BOX ────────────────────────────────
  _buildSuggestionBox(x = -9, y = 0, z = 3) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.5),
      MS(0xEC4899),
    );
    box.position.set(x, y + 0.35, z);
    box.castShadow = true;
    this._addToIsland(box);
  }

  // ── DEVELOPER HUB ─────────────────────────────────
  _buildDevHub(x = 8, y = 0, z = -2.5) {
    // Building base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.8, 2),
      MS(0x1E1040),
    );
    base.position.set(x, y + 0.9, z);
    base.castShadow = true;
    this._addToIsland(base);

    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.2, 2.3),
      MS(0x7C3AED),
    );
    roof.position.set(x, y + 1.9, z);
    this._addToIsland(roof);

    // Screen glow
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x00FF88 }),
    );
    screen.position.set(x, y + 0.9, z + 1.02);
    this._addToIsland(screen);

    this._buildSign(x, y + 2.5, z, '💻 Dev Hub', 0x7C3AED);
  }

  // ── DECORATIONS (benches, flowers, rocks) ─────────
  _buildBench(x, y, z, id = 'bench') {
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.2, 0.4),
      MS(0x92400E, 0.9),
    );
    bench.position.set(x, y, z);
    bench.name = id;
    this._addToIsland(bench);
  }

  _buildDecorations() {
    // Benches default
    const benchPositions = [[3, 0.2, -2], [-4, 0.2, 1], [0, 0.2, -6]];
    benchPositions.forEach(([x, y, z], i) => this._buildBench(x, y, z, `bench_${i}`));

    // Flower clusters
    const flowerColors = [0xF97316, 0xEC4899, 0xFDE68A, 0x10B981, 0x38BDF8];
    const flowerPos = [[4, -4], [-6, -3], [2, 6], [-2, -7], [8, 5], [-10, -2], [5, 8]];
    flowerPos.forEach(([x, z], i) => {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 6, 5),
        MS(flowerColors[i % flowerColors.length], 0.9),
      );
      flower.position.set(x + (Math.random() - 0.5), 0.25, z + (Math.random() - 0.5));
      this._addToIsland(flower);
    });
  }

  // ── SKY DOME ──────────────────────────────────────
  _buildSkyDome() {
    const geo = new THREE.SphereGeometry(150, 16, 8);
    geo.scale(-1, 1, -1); // flip inside out
    this.skyMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
    this.skyDome = new THREE.Mesh(geo, this.skyMat);
    this.scene.add(this.skyDome);
  }

  // ── HELPER: floating sign text ────────────────────
  _buildSign(x, y, z, _label, color) {
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color });
    const marker = new THREE.Mesh(geo, mat);
    marker.position.set(x, y, z);
    this._addToIsland(marker);
  }

  // ── ANIMATE (halo spin, portal pulse) ─────────────
  animate(t) {
    if (this.halo) {
      this.halo.rotation.z = t * 0.3;
    }
    if (this.warpPortal) {
      this.warpPortal.rotation.y = t * 0.8;
      this.warpPortal.material.color.setHSL(0.75 + Math.sin(t) * 0.05, 0.8, 0.5);
    }
  }

  // ── DUNGEON PORTAL (show/hide) ────────────────────
  showDungeonPortal(visible) {
    // Placeholder — akan ditambah geometry dungeon portal
    document.getElementById('dg-portal')?.classList.toggle('on', visible);
  }
}
