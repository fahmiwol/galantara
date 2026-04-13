// ═══════════════════════════════════════════════════════
// MapBuilder.js — Tool untuk penempatan objek di grid secara real-time
// ═══════════════════════════════════════════════════════

export class MapBuilder {
  /** @param {{ getPlacementRaycastTargets?: () => unknown[] }} | null gameHost */
  constructor(scene, world, renderer, camera, gameHost = null) {
    this.scene = scene;
    this.world = world;
    this.renderer = renderer; // Renderer.js wrapper
    this.camera = camera; // Camera.js wrapper
    this.gameHost = gameHost;

    this.active = false;
    this.ghost = null;
    this.activeArchetype = null;
    this.activeParams = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onClick = this._onClick.bind(this);
  }

  enable(archetype, params) {
    this.active = true;
    this.activeArchetype = archetype;
    this.activeParams = params;
    
    window.G_UI?.toast(`Placement Mode: Klik di tanah untuk pasang ${archetype}`, 'g');
    
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onClick);
  }

  disable() {
    this.active = false;
    this._removeGhost();
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mousedown', this._onClick);
  }

  _removeGhost() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost.traverse(child => {
        if (child.isMesh) {
          child.geometry?.dispose();
          child.material?.dispose();
        }
      });
      this.ghost = null;
    }
  }

  _onMouseMove(e) {
    if (!this.active) return;

    // Raycast ke ground
    const pos = this._getGroundIntersect(e);
    if (!pos) return;

    // Update ghost position
    if (!this.ghost && this.activeArchetype) {
      this._createGhost();
    }

    if (this.ghost) {
      this.ghost.position.copy(pos);
    }
  }

  _onClick(e) {
    if (!this.active || !this.ghost) return;
    if (e.button !== 0) return; // Only left click

    const pos = this._getGroundIntersect(e);
    if (!pos) return;

    this._placeObject(pos);
  }

  _getGroundIntersect(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera.cam);

    // Filter ground objects (only index 0/1 usually Cylinder in World.js)
    const targets =
      this.gameHost?.getPlacementRaycastTargets?.() ?? this.world.objects;
    const intersects = this.raycaster.intersectObjects(targets, true);
    if (intersects.length > 0) {
      // Find the ground mesh (CylinderGeometry)
      const ground = intersects.find(i => i.object.geometry instanceof THREE.CylinderGeometry);
      if (ground) {
        // Grid snapping 0.5 unit
        const p = ground.point;
        return new THREE.Vector3(
          Math.round(p.x * 2) / 2,
          0,
          Math.round(p.z * 2) / 2
        );
      }
    }
    return null;
  }

  _createGhost() {
    const { buildProceduralGroup } = document.querySelector('script[src="/src/tools/proceduralMeshFactory.js"]') 
      ? window : {}; // This won't work easily with ES modules unless exposed.
    
    // Better way: get it via a registry or the GeneratorPanel instance
    // For now, let's assume we pass a factory function or use the instance
    if (window._game?.generator3d) {
      const { archetype, palette, seed, scale } = this.activeParams;
      import('./proceduralMeshFactory.js').then(mod => {
        this.ghost = mod.buildProceduralGroup(archetype, palette, seed, scale);
        this.ghost.traverse(o => {
          if (o.isMesh) {
            o.material = o.material.clone();
            o.material.transparent = true;
            o.material.opacity = 0.5;
          }
        });
        this.scene.add(this.ghost);
      });
    }
  }

  _ensureMapDataForEdits() {
    if (!this.world.mapData) {
      this.world.mapData = {
        name: 'Oola Island',
        version: '1.0',
        environment: { skyColor: '0x87CEEB', groundColor: '0x7BC67E' },
        objects: [],
        procedural_props: [],
      };
    } else if (!Array.isArray(this.world.mapData.procedural_props)) {
      this.world.mapData.procedural_props = [];
    }
  }

  _placeObject(pos) {
    const { archetype, palette, paletteId, seed, scale } = this.activeParams;
    import('./proceduralMeshFactory.js').then((mod) => {
      const obj = mod.buildProceduralGroup(archetype, palette, seed, scale);
      obj.position.copy(pos);
      const id = `${archetype}_${Date.now()}`;
      this.world.addObject(obj, id);

      this._ensureMapDataForEdits();
      this.world.mapData.procedural_props.push({
        id,
        type: 'procedural',
        archetype,
        paletteId: paletteId || 'jakarta_warm',
        seed,
        scale,
        pos: { x: pos.x, y: pos.y, z: pos.z },
      });

      window.G_UI?.toast(`✅ Dipasang: ${archetype} di ${pos.x}, ${pos.z}`, 'g');
    });
  }
}
