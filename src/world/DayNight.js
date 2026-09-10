// ═══════════════════════════════════════════════════════
// DayNight.js — Day/night cycle mengikuti timezone user
// ═══════════════════════════════════════════════════════

/**
 * Fase hari khas Nusantara. Dua hal yang membedakannya dari siklus generik:
 *
 * 1. **Senjanya pendek.** Indonesia di khatulistiwa — matahari terbit dan
 *    terbenam nyaris jam yang sama sepanjang tahun (~05:45 dan ~17:45), dan
 *    peralihan terang-gelap berlangsung cepat, bukan berlarut seperti di
 *    lintang tinggi. Magrib karena itu diberi jendela sempit dan perubahan
 *    warna paling tajam di seluruh siklus.
 * 2. **Malamnya tidak kosong.** Yang membuat malam kampung terasa syahdu
 *    bukan gelapnya, tapi kolam-kolam cahaya hangat di dalam gelap itu:
 *    lampu warung, bohlam teras, tiang lampu. Karena itu DayNight juga
 *    menggerakkan `lampGlow`, bukan cuma menggelapkan langit.
 *
 * Untuk melihat fase tertentu tanpa menunggu: `?jam=18.5`.
 */
export class DayNight {
  constructor(renderer) {
    this.renderer = renderer; // { sun, hemi, renderer, skyDome }
    this.lampGlow = 0;        // 0 = padam, 1 = menyala penuh
    this._lampu = [];         // bohlam emissive yang ikut dinyalakan
  }

  /**
   * Terima daftar lampu yang sudah dikumpulkan World saat prop dibangun.
   * Sengaja TIDAK menyapu scene: PRD BAB 2.4 melarang `scene.traverse`.
   */
  pakaiLampu(daftar) {
    this._lampu = Array.isArray(daftar) ? daftar : [];
    return this._lampu.length;
  }

  // Dipanggil setiap frame — t = elapsed seconds
  update(t) {
    const paksa = typeof location !== 'undefined'
      && new URLSearchParams(location.search).get('jam');
    const hour = paksa !== null && paksa !== undefined && paksa !== ''
      && Number.isFinite(Number(paksa))
      ? Number(paksa)
      : new Date().getHours() + new Date().getMinutes() / 60;
    this._applyTime(hour);
  }

  _applyTime(hour) {
    const { sun, hemi, renderer: r, skyDome } = this.renderer;

    // Tentukan fase hari. Nilai lampGlow: kapan lampu warung menyala.
    let skyColor, sunIntensity, hemiIntensity, sunPosY, sunPosX, lampGlow;

    if (hour >= 4.5 && hour < 5.5) {
      // Subuh — biru tua keunguan, langit belum pecah, udara paling dingin.
      const t = (hour - 4.5);
      skyColor      = this._lerp(0x14182e, 0x33405e, t);
      sunIntensity  = 0.08 + t * 0.12;
      hemiIntensity = 0.14 + t * 0.12;
      sunPosY       = -2 + t * 4;
      sunPosX       = -18;
      lampGlow      = 1 - t * 0.45;
    } else if (hour >= 5.5 && hour < 6.75) {
      // Fajar — ufuk memerah cepat, kabut tipis di lembah.
      const t = (hour - 5.5) / 1.25;
      skyColor      = this._lerp(0x33405e, 0xe8a77a, t);
      sunIntensity  = 0.2 + t * 0.7;
      hemiIntensity = 0.26 + t * 0.19;
      sunPosY       = 2 + t * 7;
      sunPosX       = -18 + t * 4;
      lampGlow      = 0.55 - t * 0.55;
    } else if (hour >= 6.75 && hour < 10) {
      // Pagi — jernih, bayangan masih panjang, hijau paling segar.
      const t = (hour - 6.75) / 3.25;
      skyColor      = this._lerp(0xe8a77a, 0x9fc6de, Math.min(1, t * 1.6));
      sunIntensity  = 0.9 + t * 0.15;
      hemiIntensity = 0.45;
      sunPosY       = 9 + t * 8;
      sunPosX       = -14 + t * 8;
      lampGlow      = 0;
    } else if (hour >= 10 && hour < 15) {
      // Siang — matahari nyaris tegak lurus di khatulistiwa, bayangan pendek,
      // udara berkabut panas sehingga langit sedikit pudar.
      const t = (hour - 10) / 5;
      skyColor      = this._lerp(0x9fc6de, 0xb4cfdd, Math.sin(t * Math.PI));
      sunIntensity  = 1.0 + Math.sin(t * Math.PI) * 0.3;
      hemiIntensity = 0.5;
      sunPosY       = 17 + Math.sin(t * Math.PI) * 5;
      sunPosX       = -6 + t * 12;
      lampGlow      = 0;
    } else if (hour >= 15 && hour < 17.25) {
      // Sore — jam emas. Bayangan memanjang, semuanya menghangat.
      // Ini jam bermain di halaman sebelum dipanggil pulang.
      const t = (hour - 15) / 2.25;
      skyColor      = this._lerp(0xb4cfdd, 0xf2c48a, t);
      sunIntensity  = 1.0 - t * 0.25;
      hemiIntensity = 0.5 - t * 0.08;
      sunPosY       = 15 - t * 8;
      sunPosX       = 6 + t * 8;
      lampGlow      = t * 0.2;
    } else if (hour >= 17.25 && hour < 18.4) {
      // Magrib — jendela paling sempit dan paling tajam perubahannya.
      // Jingga ke ungu dalam waktu singkat; lampu mulai dinyalakan.
      const t = (hour - 17.25) / 1.15;
      skyColor      = this._lerp(0xf2c48a, 0x6d4a6b, t);
      sunIntensity  = 0.75 - t * 0.6;
      hemiIntensity = 0.42 - t * 0.2;
      sunPosY       = 7 - t * 7;
      sunPosX       = 14 + t * 4;
      lampGlow      = 0.2 + t * 0.7;
    } else if (hour >= 18.4 && hour < 19.75) {
      // Isya — langit biru tinta, tapi belum hitam. Lampu sudah berkuasa.
      const t = (hour - 18.4) / 1.35;
      skyColor      = this._lerp(0x6d4a6b, 0x232a4a, t);
      sunIntensity  = 0.15 - t * 0.1;
      hemiIntensity = 0.22 - t * 0.08;
      sunPosY       = 0 - t * 6;
      sunPosX       = 18;
      lampGlow      = 0.9 + t * 0.1;
    } else {
      // Malam — biru tinta, bukan hitam. Gelap total membuat dunia mati;
      // yang dicari adalah gelap yang masih punya warna.
      skyColor      = 0x1b2140;
      sunIntensity  = 0.06;
      hemiIntensity = 0.18;
      sunPosY       = -8;
      sunPosX       = 0;
      lampGlow      = 1;
    }

    // CATATAN SKALA: angka di atas hidup di pipeline TANPA sRGB encoding /
    // tone mapping (lihat Renderer.js). Sempat saya naikkan untuk pipeline
    // sRGB+ACES, lalu pipeline itu dikembalikan tapi angkanya tidak — dan
    // hasilnya seluruh dunia tersapu putih. Kalau colour pipeline dinyalakan
    // lagi, angka di sini WAJIB ikut disetel ulang, bukan dibiarkan.
    this.lampGlow = lampGlow;
    for (const lampu of this._lampu) {
      // Sebuah lampu boleh menyatakan dirinya lebih redup dari yang lain lewat
      // userData.kuatRelatif. Itu yang membuat komposisi cahaya mungkin —
      // satu pusat terang dengan pendamping yang jauh lebih lemah membaca
      // sebagai tempat yang hangat; semua lampu sama terang membaca sebagai
      // penerangan umum. Bawaannya 1, jadi lampu lama tidak berubah.
      const kuat = lampu.userData?.kuatRelatif ?? 1;
      if (lampu.isLight) {
        lampu.intensity = lampGlow * 1.6 * kuat;
      } else if (lampu.material) {
        // Bohlam padam pun tetap terlihat sebagai benda, jadi sisakan sedikit.
        lampu.material.emissiveIntensity = (0.12 + lampGlow * 1.5) * kuat;
      }
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
