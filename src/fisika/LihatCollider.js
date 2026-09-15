// ═══════════════════════════════════════════════════════
// LihatCollider.js — tampilkan semua collider, seperti "Visible Collision
// Shapes" di Godot atau "Show Collision" di Unreal
//
// Collider tidak terlihat, jadi collider yang salah juga tidak terlihat —
// sampai ada pemain yang tersangkut di udara atau berjalan menembus rumah.
// Satu-satunya cara memeriksa volume permainan terhadap mesh-nya adalah
// melihat keduanya bersamaan. Dipakai saat membangun prop dan saat menguji
// proksi dari Rupa3D.
//
// Nyalakan: `?kolisi` di URL, atau `G_Fisika.lihat()` dari konsol.
// Garisnya dibuat Rapier sendiri (`world.debugRender()`), jadi yang terlihat
// adalah yang BENAR-BENAR ada di dunia fisika — bukan tafsiran ulang dari
// deskriptor, yang bisa salah dengan cara yang sama seperti kodenya.
// ═══════════════════════════════════════════════════════

export class LihatCollider {
  /**
   * @param {THREE.Scene} scene
   * @param {import('./Fisika.js').Fisika} fisika
   */
  constructor(scene, fisika) {
    this.scene = scene;
    this.fisika = fisika;
    this.nyala = false;
    /** @type {THREE.LineSegments | null} */
    this.garis = null;
    this._kapasitas = 0;
  }

  /** @param {boolean} [nyala] */
  setel(nyala = !this.nyala) {
    this.nyala = nyala;
    if (nyala && !this.garis) this._buat();
    if (this.garis) this.garis.visible = nyala;
    if (nyala) this.perbarui();
    return nyala;
  }

  _buat() {
    const geo = new THREE.BufferGeometry();
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      // Terlihat MENEMBUS mesh: collider yang tertanam di dalam dinding justru
      // yang paling perlu dilihat.
      depthTest: false,
      transparent: true,
      opacity: 0.85,
    });
    this.garis = new THREE.LineSegments(geo, mat);
    this.garis.name = 'debug:collider';
    this.garis.renderOrder = 999;
    this.garis.frustumCulled = false;
    this.scene.add(this.garis);
  }

  /** Salin garis terbaru dari Rapier. Murah untuk ratusan collider. */
  perbarui() {
    if (!this.nyala || !this.garis) return;
    const data = this.fisika.garisDebug();
    if (!data) return;
    const { vertices, colors } = data;
    const n = vertices.length / 3;
    const geo = this.garis.geometry;
    if (n > this._kapasitas) {
      this._kapasitas = Math.ceil(n * 1.5);
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this._kapasitas * 3), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this._kapasitas * 3), 3));
    }
    const pos = geo.getAttribute('position');
    const warna = geo.getAttribute('color');
    pos.array.set(vertices);
    // Rapier memberi RGBA; r128 cukup RGB.
    for (let i = 0; i < n; i++) {
      warna.array[i * 3] = colors[i * 4];
      warna.array[i * 3 + 1] = colors[i * 4 + 1];
      warna.array[i * 3 + 2] = colors[i * 4 + 2];
    }
    pos.needsUpdate = true;
    warna.needsUpdate = true;
    geo.setDrawRange(0, n);
  }

  dispose() {
    if (!this.garis) return;
    this.scene.remove(this.garis);
    this.garis.geometry.dispose();
    this.garis.material.dispose();
    this.garis = null;
    this._kapasitas = 0;
  }
}
