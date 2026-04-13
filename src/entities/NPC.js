// ═══════════════════════════════════════════════════════
// NPC.js — NPC entities dengan patrol & dialog tree
// ═══════════════════════════════════════════════════════

import { NPCS } from '../data/config.js';

const INTERACT_R = 2.5; // radius interaksi

export class NPCManager {
  constructor(scene) {
    this.scene  = scene;
    this.npcs   = []; // { data, mesh, labelEl, timer, phase, dx, dz }
    this._onDialog = null;
  }

  onDialog(fn) { this._onDialog = fn; return this; }

  // ── BUILD SEMUA NPC ───────────────────────────────────
  /** Sembunyikan NPC Oola saat Spot visual lain (mis. Bogor) aktif. */
  setHubVisible(visible) {
    this.npcs.forEach((npc) => {
      npc.mesh.visible = visible;
    });
  }

  build() {
    NPCS.forEach(data => {
      const group = new THREE.Group();

      // Body
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 8, 7),
        new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.7 }),
      );
      body.scale.y = 1.15;
      body.castShadow = true;
      group.add(body);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 8, 7),
        new THREE.MeshStandardMaterial({ color: 0xFFDEAD, roughness: 0.8 }),
      );
      head.position.y = 0.72;
      head.castShadow = true;
      group.add(head);

      // Name tag (floating dot above head)
      const tag = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 5),
        new THREE.MeshBasicMaterial({ color: data.color }),
      );
      tag.position.y = 1.3;
      group.add(tag);

      group.position.set(data.x, 0, data.z);
      this.scene.add(group);

      this.npcs.push({
        data,
        mesh: group,
        spawnX: data.x,
        spawnZ: data.z,
        x: data.x,
        z: data.z,
        timer: Math.random() * 3,
        phase: 'idle', // idle | walk
        dx: 0,
        dz: 0,
      });
    });
    return this;
  }

  // ── UPDATE PATROL + IDLE BOB ──────────────────────────
  update(dt, t) {
    this.npcs.forEach(npc => {
      npc.timer -= dt;

      if (npc.timer <= 0) {
        // Decide next action
        if (npc.phase === 'idle') {
          npc.phase = 'walk';
          const angle = Math.random() * Math.PI * 2;
          npc.dx = Math.cos(angle) * 0.04;
          npc.dz = Math.sin(angle) * 0.04;
          npc.timer = 1.5 + Math.random() * 2;
        } else {
          npc.phase = 'idle';
          npc.timer = 2 + Math.random() * 3;
          npc.dx = 0;
          npc.dz = 0;
        }
      }

      if (npc.phase === 'walk') {
        npc.x += npc.dx;
        npc.z += npc.dz;

        // Keep near spawn
        const distFromSpawn = Math.sqrt(
          (npc.x - npc.spawnX) ** 2 + (npc.z - npc.spawnZ) ** 2,
        );
        if (distFromSpawn > 3) {
          // Walk back toward spawn
          const angle = Math.atan2(npc.spawnZ - npc.z, npc.spawnX - npc.x);
          npc.dx = Math.cos(angle) * 0.04;
          npc.dz = Math.sin(angle) * 0.04;
        }
      }

      // Bob animation
      const bobY = npc.phase === 'walk'
        ? Math.abs(Math.sin(t * 6 + npc.spawnX)) * 0.1
        : Math.sin(t * 1.2 + npc.spawnX) * 0.03;

      npc.mesh.position.set(npc.x, bobY, npc.z);
      if (npc.phase === 'walk' && (npc.dx || npc.dz)) {
        npc.mesh.rotation.y = Math.atan2(npc.dx, npc.dz);
      }
    });
  }

  // ── CHECK PROXIMITY — kembalikan NPC terdekat jika dalam range ─
  checkProximity(avatarPos) {
    let closest = null;
    let closestDist = Infinity;

    this.npcs.forEach(npc => {
      const dx = avatarPos.x - npc.x;
      const dz = avatarPos.z - npc.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < INTERACT_R && dist < closestDist) {
        closestDist = dist;
        closest = npc;
      }
    });

    return closest ? closest.data : null;
  }
}
