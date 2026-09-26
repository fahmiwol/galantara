// ═══════════════════════════════════════════════════════
// agen/penanda.js — the ✦ foot ring: "this one is an AI agent"
//
// VISI pillar 4: humans and AI are always distinguishable. The DOM name label
// with the "AI" tag belongs to stream B; this is the in-world half, readable at
// the smallest size a character is drawn (≈ 36 px tall on a phone held
// landscape, laporan 3D §6.3): a flat ring around the feet with the four points
// of ✦ sticking out. A player has a dark, soft, FILLED shadow disc (Avatar.js);
// an agent has a HOLLOW, pointed, two-tone ring — shape and colour both differ,
// so neither carries the meaning alone (WCAG 1.4.1).
//
// Two tones because one is not enough, measured: gold alone falls to ΔE 16,7
// against the golden-hour ground under protanopia. The inner band is the dark
// "pil gelap" ink of the world UI (Desain §9.6), so in EVERY light one of the two
// bands stands ≥ 20 away from the ground (tests/agen3dPenanda.test.mjs).
//
// Cost: 1 draw call per agent (child mesh), or 1 draw call for ALL agents with
// PenandaKerumunan (InstancedMesh). Geometry and material are shared.
// ═══════════════════════════════════════════════════════

import { bidangPoligon, bakeGeometri, gabungGeometri, cat } from '../geometri.js';

/**
 * ✦ gold (Desain §9.4, "Bisa direkrut", dark-surface value). Unlit: the ring is a
 * sign, not a surface — it must read the same in shade, at dusk and at night.
 */
export const WARNA_PENANDA = 0xF5B642;
/** Inner band: the world UI's dark ink (`--gw-tinta` #2A1F14). */
export const WARNA_PENANDA_GELAP = 0x2A1F14;

/**
 * Sizes in metres. The NPC body is Ø0,76 (NPC.js), so the ring starts outside it:
 * the band shows on every side from the default camera. Tips stick out 0,17 m.
 */
export const UKURAN_PENANDA = Object.freeze({
  dalam: 0.44, tengah: 0.50, luar: 0.59, ujung: 0.17, lebarUjung: 0.12, segmen: 24, tinggi: 0.015,
});

let _geo = null;
let _mat = null;

/** Ring + 4 tips, flat on y = 0, facing up. Shared by every agent. */
export function geometriPenanda() {
  if (_geo) return _geo;
  const { dalam, tengah, luar, ujung, lebarUjung, segmen } = UKURAN_PENANDA;
  const datarkan = (g) => bakeGeometri(g, { putar: [-Math.PI / 2, 0, 0] });
  const bagian = [
    cat(datarkan(new THREE.RingGeometry(dalam, tengah, segmen, 1)), WARNA_PENANDA_GELAP),
    cat(datarkan(new THREE.RingGeometry(tengah, luar, segmen, 1)), WARNA_PENANDA),
  ];
  // A tip drawn in XY pointing +Y, laid flat so it points −Z; then each copy is
  // turned about Y by b, which sends −Z to (−sin b, 0, −cos b) — and it is placed
  // at the ring's edge in that same direction, so every tip points OUTWARD.
  const datar = bakeGeometri(bidangPoligon([[-lebarUjung / 2, 0], [lebarUjung / 2, 0], [0, ujung]], { duaSisi: false }), { putar: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const b = (i * Math.PI) / 2;
    const r = luar - 0.01;
    bagian.push(cat(bakeGeometri(datar, { letak: [-Math.sin(b) * r, 0, -Math.cos(b) * r], putar: [0, b, 0] }), WARNA_PENANDA));
  }
  datar.dispose();
  _geo = gabungGeometri(bagian);
  _geo.name = 'penanda_agen';
  return _geo;
}

export function bahanPenanda() {
  if (_mat) return _mat;
  _mat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  _mat.name = 'penanda_agen';
  return _mat;
}

/**
 * Put the ✦ ring under one agent. `mesh` is the NPC's root group (its origin is
 * at the feet — NPC.js centres the body ball on the ground).
 * @param {THREE.Object3D} mesh
 * @returns {{ cincin: THREE.Mesh, lepas: () => void }}
 */
export function pasangPenandaAgen(mesh) {
  if (!mesh?.isObject3D) throw new Error('pasangPenandaAgen butuh THREE.Object3D (grup NPC)');
  if (mesh.userData.penandaAgen) return mesh.userData.penandaAgen;
  const cincin = new THREE.Mesh(geometriPenanda(), bahanPenanda());
  cincin.name = 'penanda_agen';
  cincin.position.y = UKURAN_PENANDA.tinggi;
  cincin.castShadow = false;
  cincin.receiveShadow = false;
  mesh.add(cincin);
  const pegangan = {
    cincin,
    lepas() {
      mesh.remove(cincin);
      delete mesh.userData.penandaAgen;
    },
  };
  mesh.userData.penandaAgen = pegangan;
  mesh.userData.agenAI = true;
  return pegangan;
}

/**
 * All rings in ONE draw call, for crowds (laporan 3D §6.8: 70 characters in a
 * Spot). Call `perbarui()` once per frame after the agents moved; it copies each
 * agent's world position (not its rotation or bob-free height: the ring lies
 * flat at the agent's feet).
 */
export class PenandaKerumunan {
  constructor(induk, kapasitas = 128) {
    this.kapasitas = kapasitas;
    /** @type {THREE.Object3D[]} */
    this.agen = [];
    this.mesh = new THREE.InstancedMesh(geometriPenanda(), bahanPenanda(), kapasitas);
    this.mesh.name = 'penanda_agen_kerumunan';
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    // r128 culls instances with the BASE geometry's sphere at the origin.
    this.mesh.frustumCulled = false;
    this._m = new THREE.Matrix4();
    this._p = new THREE.Vector3();
    induk?.add(this.mesh);
  }

  pasang(obj) {
    if (this.agen.includes(obj)) return true;
    if (this.agen.length >= this.kapasitas) return false;
    this.agen.push(obj);
    obj.userData.agenAI = true;
    this.perbarui();
    return true;
  }

  lepas(obj) {
    const i = this.agen.indexOf(obj);
    if (i < 0) return false;
    this.agen.splice(i, 1);
    this.perbarui();
    return true;
  }

  perbarui() {
    const n = this.agen.length;
    for (let i = 0; i < n; i++) {
      const o = this.agen[i];
      o.updateWorldMatrix(true, false);
      this._p.setFromMatrixPosition(o.matrixWorld);
      this.mesh.setMatrixAt(i, this._m.makeTranslation(this._p.x, this._p.y + UKURAN_PENANDA.tinggi, this._p.z));
    }
    this.mesh.count = n;
    this.mesh.visible = n > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
