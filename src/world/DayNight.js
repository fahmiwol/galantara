// ═══════════════════════════════════════════════════════
// DayNight.js — Day/night cycle mengikuti timezone user
// ═══════════════════════════════════════════════════════

export class DayNight {
  constructor(renderer) {
    this.renderer = renderer; // { sun, hemi, renderer (THREE.WebGLRenderer), skyDome }
  }

  // Dipanggil setiap frame — t = elapsed seconds
  update(t) {
    const hour = new Date().getHours() + new Date().getMinutes() / 60;
    this._applyTime(hour);
  }

  _applyTime(hour) {
    const { sun, hemi, renderer: r, skyDome } = this.renderer;

    // Tentukan fase hari
    let skyColor, fogColor, sunIntensity, hemiIntensity, sunPosY, sunPosX;

    if (hour >= 5 && hour < 7) {
      // Fajar
      const t = (hour - 5) / 2;
      skyColor      = this._lerp(0x1a1a2e, 0xFFB347, t);
      sunIntensity  = 0.3 + t * 0.7;
      hemiIntensity = 0.2 + t * 0.3;
      sunPosY       = 5 + t * 15;
      sunPosX       = -15 + t * 5;
    } else if (hour >= 7 && hour < 17) {
      // Siang
      const t = (hour - 7) / 10;
      skyColor      = 0x87CEEB;
      sunIntensity  = 1.0 + Math.sin(t * Math.PI) * 0.3;
      hemiIntensity = 0.5;
      sunPosY       = 20;
      sunPosX       = -10 + t * 20;
    } else if (hour >= 17 && hour < 19) {
      // Senja
      const t = (hour - 17) / 2;
      skyColor      = this._lerp(0x87CEEB, 0xFF6B35, t);
      sunIntensity  = 1.0 - t * 0.8;
      hemiIntensity = 0.5 - t * 0.3;
      sunPosY       = 20 - t * 18;
      sunPosX       = 10 + t * 5;
    } else if (hour >= 19 && hour < 21) {
      // Malam awal
      const t = (hour - 19) / 2;
      skyColor      = this._lerp(0xFF6B35, 0x0a0a2e, t);
      sunIntensity  = 0.2 - t * 0.15;
      hemiIntensity = 0.2 - t * 0.1;
      sunPosY       = 2 - t * 10;
      sunPosX       = 15;
    } else {
      // Malam
      skyColor      = 0x0a0a2e;
      sunIntensity  = 0.05;
      hemiIntensity = 0.1;
      sunPosY       = -10;
      sunPosX       = 0;
    }

    // Apply
    if (sun) {
      sun.intensity = sunIntensity;
      sun.position.set(sunPosX, sunPosY, 10);
    }
    if (hemi)      hemi.intensity = hemiIntensity;
    if (r?.renderer) r.renderer.setClearColor(skyColor, 1);
    if (skyDome)   skyDome.material.color.setHex(skyColor);

    // Sync fog color ke sky
    if (r?.scene?.fog) r.scene.fog.color.setHex(skyColor);

    // Stars — muncul saat gelap
    const isNight = (hour < 5 || hour >= 19);
    if (this._stars) this._stars.visible = isNight;
  }

  // Build bintang-bintang (dipanggil sekali)
  buildStars(scene) {
    const count = 300;
    const geo   = new THREE.BufferGeometry();
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.5; // upper hemisphere only
      const r     = 120;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this._stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true }),
    );
    this._stars.visible = false;
    scene.add(this._stars);
    return this;
  }

  // Lerp antara dua hex colors
  _lerp(from, to, t) {
    const fr = (from >> 16) & 0xff, fg = (from >> 8) & 0xff, fb = from & 0xff;
    const tr = (to   >> 16) & 0xff, tg = (to   >> 8) & 0xff, tb = to   & 0xff;
    const r = Math.round(fr + (tr - fr) * t);
    const g = Math.round(fg + (tg - fg) * t);
    const b = Math.round(fb + (tb - fb) * t);
    return (r << 16) | (g << 8) | b;
  }
}
