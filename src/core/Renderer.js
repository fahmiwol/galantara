// ═══════════════════════════════════════════════════════
// Renderer.js — Three.js scene setup & render loop
// Self-contained: scene, camera, lights, renderer
// ═══════════════════════════════════════════════════════

export class Renderer {
  constructor(canvasId = 'c') {
    this.canvas   = document.getElementById(canvasId);
    this.scene    = new THREE.Scene();
    this.clock    = new THREE.Clock();
    this.renderer = null;
    this.camera   = null; // set oleh Camera.js
  }

  init() {
    const W = window.innerWidth, H = window.innerHeight;

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(W, H);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x87CEEB, 1);

    // Fog — bikin world terasa dalam & island melayang
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.006);

    // Lights
    this._buildLights();

    // Resize handler
    window.addEventListener('resize', () => this._onResize());

    return this;
  }

  _buildLights() {
    // Ambient — soft fill
    const ambient = new THREE.AmbientLight(0xfff4e0, 0.6);
    this.scene.add(ambient);

    // Sun — directional dengan shadow
    this.sun = new THREE.DirectionalLight(0xfff4c0, 1.2);
    this.sun.position.set(10, 20, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width  = 1024;
    this.sun.shadow.mapSize.height = 1024;
    this.sun.shadow.camera.near   = 0.1;
    this.sun.shadow.camera.far    = 100;
    this.sun.shadow.camera.left   = -30;
    this.sun.shadow.camera.right  =  30;
    this.sun.shadow.camera.top    =  30;
    this.sun.shadow.camera.bottom = -30;
    this.scene.add(this.sun);

    // Hemisphere — sky/ground fill
    this.hemi = new THREE.HemisphereLight(0x87CEEB, 0xA8D5A2, 0.4);
    this.scene.add(this.hemi);
  }

  setCamera(threeCamera) {
    this.camera = threeCamera;
  }

  render() {
    if (this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  getDelta() {
    return this.clock.getDelta();
  }

  _onResize() {
    const W = window.innerWidth, H = window.innerHeight;
    if (this.camera) {
      this.camera.aspect = W / H;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.setSize(W, H);
  }

  // ── HELPERS: Material factories ───────────────────
  static mat(color, opts = {}) {
    return new THREE.MeshLambertMaterial({ color, ...opts });
  }

  static matS(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...opts });
  }

  // Lighten / darken a hex color
  static lighten(color, amount) {
    const r = ((color >> 16) & 0xff) + amount;
    const g = ((color >> 8)  & 0xff) + amount;
    const b = ( color        & 0xff) + amount;
    return (Math.max(0, Math.min(255, r)) << 16) |
           (Math.max(0, Math.min(255, g)) << 8)  |
            Math.max(0, Math.min(255, b));
  }
}
