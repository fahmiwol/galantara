// ═══════════════════════════════════════════════════════
// NPC.js — NPC entities: mesh + dialog data. Movement lives in PerilakuNpc.js.
// ═══════════════════════════════════════════════════════

import { NPCS } from '../data/config.js';
import { PerilakuNpc } from './PerilakuNpc.js';

export const INTERACT_R = 2.5; // radius interaksi

/** Height of the head top (world units) — anchor for labels above an NPC. */
export const TINGGI_KEPALA_NPC = 1.3;

export class NPCManager {
  constructor(scene) {
    this.scene  = scene;
    this.npcs   = []; // { data, mesh, perilaku, spawnX, spawnZ, x, z }
    this._onDialog = null;
    this._terlihat = true;
  }

  onDialog(fn) { this._onDialog = fn; return this; }

  // ── BUILD SEMUA NPC ───────────────────────────────────
  /** Sembunyikan NPC Oola saat Spot visual lain (mis. Bogor) aktif. */
  setHubVisible(visible) {
    this._terlihat = visible;
    this.npcs.forEach((npc) => {
      npc.mesh.visible = visible;
    });
  }

  get terlihat() { return this._terlihat; }

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
      tag.position.y = TINGGI_KEPALA_NPC;
      group.add(tag);

      group.position.set(data.x, 0, data.z);
      this.scene.add(group);

      this.npcs.push({
        data,
        mesh: group,
        perilaku: new PerilakuNpc({ x: data.x, z: data.z }),
        spawnX: data.x,
        spawnZ: data.z,
        x: data.x,
        z: data.z,
      });
    });
    return this;
  }

  /** @returns {object|undefined} the NPC entry (data, mesh, perilaku, x, z) */
  get(id) {
    return this.npcs.find((n) => n.data.id === id);
  }

  /** Command one NPC's behaviour (see PerilakuNpc.perintah). */
  perintah(id, p) {
    const npc = this.get(id);
    if (!npc) return false;
    npc.perilaku.perintah(p);
    return true;
  }

  // ── UPDATE: behaviour + pose ──────────────────────────
  /**
   * @param {number} dt
   * @param {number} t
   * @param {{dialogNpcId?: string|null, posisiPemain?: {x:number,z:number}|null}} [ctx]
   */
  update(dt, t, ctx = {}) {
    this.npcs.forEach(npc => {
      const p = npc.perilaku;
      p.perbarui(dt, {
        dialogTerbuka: ctx.dialogNpcId === npc.data.id,
        posisiPemain: ctx.posisiPemain ?? null,
      });
      npc.x = p.x;
      npc.z = p.z;

      // Pose: walking bounces, working nods over the desk, reporting waves (a hop), idle breathes.
      let bobY;
      let condong = 0;
      if (p.bergerak) bobY = Math.abs(Math.sin(t * 6 + npc.spawnX)) * 0.1;
      else if (p.keadaan === 'bekerja') { bobY = Math.sin(t * 2.4 + npc.spawnX) * 0.02; condong = 0.14 + Math.sin(t * 2.4) * 0.05; }
      else if (p.melambai) bobY = Math.max(0, Math.sin(t * 7)) * 0.12;
      else bobY = Math.sin(t * 1.2 + npc.spawnX) * 0.03;

      npc.mesh.position.set(p.x, bobY, p.z);
      npc.mesh.rotation.y = p.arah;
      npc.mesh.rotation.x = condong;
    });
  }

  // ── CHECK PROXIMITY — kembalikan NPC terdekat jika dalam range ─
  checkProximity(avatarPos) {
    if (!this._terlihat) return null;
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
