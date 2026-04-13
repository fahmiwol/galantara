// ═══════════════════════════════════════════════════════
// Generator3DPanel — MVP 3D procedural + preview + export JSON
// Slot AI: tombol disabled + copy prompt (nanti wiring API)
// ═══════════════════════════════════════════════════════

import { STYLE_CONTRACT_ID, PALETTE_SLOTS, ARCHETYPES } from '../data/styleTokens.js';
import { buildProceduralGroup, countTrianglesInObject } from './proceduralMeshFactory.js';

export class Generator3DPanel {
  constructor() {
    this._panel = null;
    this._canvas = null;
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._root = null;
    this._raf = 0;
    this._rot = 0;
  }

  init() {
    this._panel = document.getElementById('generator3d-panel');
    this._canvas = document.getElementById('gen3d-canvas');
    if (!this._panel || !this._canvas) return this;

    this._fillSelects();
    this._bindControls();
    return this;
  }

  _fillSelects() {
    const arch = document.getElementById('gen3d-archetype');
    const pal = document.getElementById('gen3d-palette');
    if (arch && arch.options.length === 0) {
      ARCHETYPES.forEach((a) => {
        const o = document.createElement('option');
        o.value = a.id;
        o.textContent = a.label;
        arch.appendChild(o);
      });
    }
    if (pal && pal.options.length === 0) {
      Object.values(PALETTE_SLOTS).forEach((p) => {
        const o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.label;
        pal.appendChild(o);
      });
    }
  }

  _bindControls() {
    const onChange = () => this._refreshPreview();
    ['gen3d-archetype', 'gen3d-palette', 'gen3d-seed', 'gen3d-scale'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', onChange);
      document.getElementById(id)?.addEventListener('change', onChange);
    });
    document.getElementById('gen3d-scale')?.addEventListener('input', () => {
      const v = document.getElementById('gen3d-scale')?.value ?? '1';
      const el = document.getElementById('gen3d-scale-val');
      if (el) el.textContent = v;
    });
  }

  _readParams() {
    const archetype = document.getElementById('gen3d-archetype')?.value || 'tree_round';
    const paletteId = document.getElementById('gen3d-palette')?.value || 'jakarta_warm';
    const seed = Math.floor(Number(document.getElementById('gen3d-seed')?.value) || 42);
    const scale = Number(document.getElementById('gen3d-scale')?.value) || 1;
    const palette = PALETTE_SLOTS[paletteId] || PALETTE_SLOTS.jakarta_warm;
    return { archetype, paletteId, palette, seed, scale };
  }

  open() {
    window.G_UI?.closePanel('dev-panel');
    window.G_UI?.openPanel('generator3d-panel');
    this._ensureThree();
    this._refreshPreview();
    this._updateMetrics();
    this._startLoop();
  }

  close() {
    this.stopPreview();
    window.G_UI?.closePanel('generator3d-panel');
  }

  /** Hentikan animasi preview (dipanggil saat panel lain dibuka). */
  stopPreview() {
    this._stopLoop();
  }

  _ensureThree() {
    if (this._scene) return;

    const W = this._canvas.clientWidth || 300;
    const H = this._canvas.clientHeight || 200;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xe8e6ff);

    this._camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 80);
    this._camera.position.set(3.2, 2.4, 3.6);
    this._camera.lookAt(0, 0.9, 0);

    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: false,
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(W, H);
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const hemi = new THREE.HemisphereLight(0xfff4e0, 0xa8d5a2, 0.55);
    this._scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4c0, 0.95);
    sun.position.set(4, 10, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    this._scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(6, 32),
      new THREE.MeshStandardMaterial({ color: 0xc7d2fe, roughness: 0.88, metalness: 0.02 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this._scene.add(ground);

    this._root = new THREE.Group();
    this._scene.add(this._root);
  }

  _resizeRenderer() {
    if (!this._renderer || !this._canvas || !this._camera) return;
    const W = this._canvas.clientWidth || 300;
    const H = this._canvas.clientHeight || 200;
    this._camera.aspect = W / H;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(W, H);
  }

  _refreshPreview() {
    if (!this._root) return;
    this._resizeRenderer();

    while (this._root.children.length) {
      const o = this._root.children[0];
      this._root.remove(o);
      o.traverse((x) => {
        if (x.isMesh) {
          x.geometry?.dispose();
          if (Array.isArray(x.material)) x.material.forEach((m) => m.dispose());
          else x.material?.dispose();
        }
      });
    }

    const { archetype, palette, seed, scale } = this._readParams();
    const mesh = buildProceduralGroup(archetype, palette, seed, scale);
    this._root.add(mesh);
    this._updateMetrics();
  }

  _updateMetrics() {
    const { archetype, paletteId, seed, scale } = this._readParams();
    const tri = this._root ? countTrianglesInObject(this._root) : 0;
    const budget = 5000;
    const score = Math.max(0, 100 - Math.max(0, tri - budget) * 0.02);
    const elTri = document.getElementById('gen3d-metric-tri');
    const elScore = document.getElementById('gen3d-metric-style');
    if (elTri) elTri.textContent = String(tri);
    if (elScore) {
      elScore.textContent =
        tri <= budget
          ? `Style OK (${score.toFixed(0)} / 100) — di bawah budget ${budget} tri`
          : `Perhatian: ${tri} tri (target ≤ ${budget})`;
    }

    const promptEl = document.getElementById('gen3d-ai-prompt');
    if (promptEl) {
      promptEl.value = this._buildAiPromptStub({ archetype, paletteId, seed, scale });
    }
  }

  _buildAiPromptStub({ archetype, paletteId, seed, scale }) {
    const label = ARCHETYPES.find((a) => a.id === archetype)?.label || archetype;
    return [
      'stylized low poly indonesia, soft rounded edges, matte PBR, warm golden hour lighting,',
      'toy diorama scale, chunky silhouettes, no photorealism, no lego bricks,',
      `subject: ${label}, palette slot: ${paletteId}, variation seed ${seed}, scale ${scale.toFixed(2)},`,
      `galantara style contract ${STYLE_CONTRACT_ID}`,
    ].join(' ');
  }

  exportJson() {
    const { archetype, paletteId, seed, scale } = this._readParams();
    const tri = this._root ? countTrianglesInObject(this._root) : 0;
    const payload = {
      version: 'galantara.generator.v0',
      styleContract: STYLE_CONTRACT_ID,
      archetype,
      paletteSlot: paletteId,
      seed,
      scale,
      estimatedTriangles: tri,
      generator: 'procedural',
      ai: { enabled: false, note: 'Hubungkan API Meshy/Tripo di sprint berikutnya.' },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `galantara_prop_${archetype}_${seed}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    window.G_UI?.toast('Preset JSON terunduh ✓', 'g');
  }

  copyAiPrompt() {
    const el = document.getElementById('gen3d-ai-prompt');
    if (!el?.value) return;
    navigator.clipboard.writeText(el.value).then(
      () => window.G_UI?.toast('Prompt disalin — tempel di tool AI eksternal', 'g'),
      () => window.G_UI?.toast('Clipboard gagal — salin manual', 'a'),
    );
  }

  _startLoop() {
    this._stopLoop();
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      this._rot += 0.008;
      if (this._root) this._root.rotation.y = this._rot;
      if (this._renderer && this._scene && this._camera) {
        this._renderer.render(this._scene, this._camera);
      }
    };
    this._raf = requestAnimationFrame(loop);
  }

  _stopLoop() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
  }

  /** Lepas WebGL saat unload (opsional) */
  dispose() {
    this._stopLoop();
    if (this._root) {
      while (this._root.children.length) {
        const o = this._root.children[0];
        this._root.remove(o);
        o.traverse((x) => {
          if (x.isMesh) {
            x.geometry?.dispose();
            if (Array.isArray(x.material)) x.material.forEach((m) => m.dispose());
            else x.material?.dispose();
          }
        });
      }
    }
    this._renderer?.dispose();
    this._renderer = null;
    this._scene = null;
    this._camera = null;
    this._root = null;
  }
}
