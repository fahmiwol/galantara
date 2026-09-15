// ═══════════════════════════════════════════════════════
// Karakter.js — pengendali pemain kinematik, porting dari Rupa3D/karakter.mjs
//
// Logikanya DIPORTING, bukan ditulis ulang, supaya perilakunya sama dengan
// yang sudah diuji di Rupa3D. Yang berbeda ukurannya (avatar chibi Galantara
// bukan manusia 1,7 m) dan tiga hal yang Rupa3D belum butuhkan: langkah
// waktu tetap, keadaan duduk, dan pencarian titik berdiri.
//
// ── Kenapa kinematik, bukan badan dinamis (dari Rupa3D) ────────────────
// Karakter yang digerakkan gaya terpeleset di tanjakan, terpental di tangga,
// dan terguling saat menabrak. Karakter kinematik naik anak tangga, menempel
// di lereng, dan tidak pernah jatuh terguling — itu yang dirasakan pemain
// sebagai "kontrolnya enak". Ini juga bentuk yang dipakai Godot
// (CharacterBody3D.move_and_slide), Unity (CharacterController), dan Unreal
// (CharacterMovementComponent): gerakan yang diinginkan disapu terhadap
// dunia, lalu MELUNCUR di sepanjang permukaan yang ditabrak.
//
// ── Kenapa LANGKAH TETAP, bukan dt bingkai ─────────────────────────────
// Rupa3D menjepit dt; itu mencegah tembus, tapi jarak per detik tetap
// bergantung pada laju bingkai dan gravitasi/menempel-tanah berperilaku beda
// di 30 dan 144 fps. Godot (physics_ticks_per_second), Unity (fixedDeltaTime),
// dan Unreal (substepping) sama-sama memisahkan jam fisika dari jam render.
// Di sini: fisika selalu 1/60 detik per langkah, bingkai render mengumpulkan
// waktunya, dan posisi yang DIGAMBAR diinterpolasi antara dua langkah terakhir
// supaya layar 120 Hz tidak tersendat. Biayanya satu langkah keterlambatan
// visual (≤ 16,7 ms) — sama dengan interpolasi Rigidbody di Unity.
//
// ── Kenapa logikanya lepas dari rAF (juga dari Rupa3D) ─────────────────
// rAF menyala NOL kali per detik saat tab tidak dilukis. Galantara sudah
// lima kali tertipu oleh itu. Di sini langkahnya dipanggil sendiri dengan dt,
// jadi uji di Node benar-benar menjalankan 60 langkah per detik, deterministik.
//
// ── Perbaikan sampingan yang nyata ─────────────────────────────────────
// Gerak lama memakai SPEED = 0.09 PER BINGKAI, bukan per detik. Di ponsel 30 fps
// avatar berjalan setengah kecepatan. Di sini kecepatan dalam m/s.
// ═══════════════════════════════════════════════════════

/** 0.09 unit per bingkai × 60 fps — mempertahankan rasa gerak lama di 60 fps. */
export const KECEPATAN = 5.4;
/** Lebih tajam dari 9,81 — dari Rupa3D, terasa lebih enak. */
export const GRAVITASI = 18;
/** Satu langkah fisika. */
export const LANGKAH = 1 / 60;
/**
 * Langkah maksimum per bingkai. Bingkai yang lebih lambat dari 12 fps
 * membuang sisa waktunya alih-alih menumpuk — tanpa ini satu bingkai macet
 * memicu lebih banyak langkah, yang membuat bingkai berikutnya lebih macet
 * ("spiral of death").
 */
export const LANGKAH_MAKS_PER_BINGKAI = 5;
/** Di bawah ketinggian ini pemain dianggap jatuh dari dunia dan dikembalikan. */
export const BATAS_JATUH = -6;

/**
 * Ukuran kapsul avatar chibi.
 *
 * Badan bola jari-jari 0,45 berpusat di tanah, kepala sampai 1,23 m. Jari-jari
 * kapsul 0,40 — sedikit lebih kecil dari badan, supaya pemain bisa mendekati
 * meja atau pohon tanpa merasa tertahan terlalu jauh. Tinggi 1,30 menutup
 * sampai ubun-ubun.
 *
 * Dinyatakan dalam kosakata Rupa3D (ukuran PENUH): [diameter, tinggi, diameter].
 */
export const UKURAN_KAPSUL = Object.freeze([0.80, 1.30, 0.80]);

/**
 * Parameter pengendali. Semua angka dari Rupa3D/karakter.mjs kecuali yang
 * disebut. Naik tangga 0,35 m cukup untuk batu pijak (≤ 0,045), tikar
 * (0,016), dan anak tangga rumah panggung (0,17).
 *
 * AKIBATNYA: benda pendek yang tidak boleh dinaiki (bangku 0,30 m, dulang
 * 0,16 m) harus diberi collider yang LEBIH TINGGI dari mesh-nya. Collider
 * adalah volume permainan, bukan salinan bentuk visual — sama dengan
 * "simple collision" Unreal.
 *
 * AMBANG NYATA ≠ naikTangga, dan harus disapu dari SEMUA arah. Pendekatan
 * lurus memanjat sampai 0,40 m (agen Spot Bogor); pendekatan serong 32 arah ×
 * 5 geser memanjat sampai 0,50 m, dan silinder sempit sekali di 0,60 (agen
 * Spot Braga; tools/fisika/sapu-panjat.mjs). Aturan kerjanya: yang tidak boleh
 * dinaiki ≥ 0,70 m; yang memang untuk didaki ≤ 0,35 m per undak, dengan tapak
 * yang cukup lebar — tangga 0,21 m per tapak tidak bisa didaki kapsul 0,80.
 */
export const PARAM = Object.freeze({
  offset: 0.02,
  naikTangga: 0.35,
  lebarTangga: 0.2,
  tempelTanah: 0.35,
  lerengMaks: 50,
  lerengGeser: 35,
  /**
   * Dorongan kecil menjauhi normal kontak. Bawaan Rapier 1e-4 membuat kapsul
   * yang menyentuh tanah DAN dinding bersamaan menembus dinding sesaat —
   * terukur sampai 7,03 cm, 1.090 dari 230.400 langkah lebih dari 2 cm
   * (ditemukan agen Spot Malioboro). Diukur lima nilai di dua set titik awal
   * (tools/fisika/ukur-tembus-dinding.mjs):
   *   1e-4  7,03 cm · 1.090 langkah > 2 cm
   *   3e-3  0,97 / 0,00 cm · 0 · tanpa tersendat, tanpa getar   ← dipakai
   *   5e-3  2,41 cm · 2 · getar 0,38 mm di dinding
   *   7e-3  6,30 cm · 7        1e-2  4,74 cm · 7
   * Tidak monoton — karena itu diuji di dua set lintasan, bukan satu.
   */
  dorongNormal: 3e-3,
  /** Batas dt satu langkah — jaring pengaman kalau langkahKarakter dipanggil
   *  langsung dengan dt besar. */
  dtMaks: 1 / 20,
});

/**
 * Buat karakter di dunia Fisika yang SUDAH SIAP.
 *
 * @param {import('./Fisika.js').Fisika} fisika
 * @param {{ x:number, z:number, y?:number }} kaki posisi telapak kaki
 */
export function buatKarakter(fisika, kaki = { x: 0, y: 0, z: 0 }) {
  if (!fisika?.siap) throw new Error('buatKarakter: dunia fisika belum siap — panggil fisika.muat() dulu');
  const { R, w } = fisika;
  const [diameter, tinggi] = UKURAN_KAPSUL;
  const jari = diameter / 2;
  const setengahBatang = Math.max(tinggi / 2 - jari, 1e-6);

  const kendali = w.createCharacterController(PARAM.offset);
  kendali.enableAutostep(PARAM.naikTangga, PARAM.lebarTangga, true);
  kendali.enableSnapToGround(PARAM.tempelTanah);
  kendali.setMaxSlopeClimbAngle((PARAM.lerengMaks * Math.PI) / 180);
  kendali.setMinSlopeSlideAngle((PARAM.lerengGeser * Math.PI) / 180);
  kendali.setNormalNudgeFactor(PARAM.dorongNormal);

  // Pusat kapsul = telapak kaki + setengah tinggi (+ offset, supaya kapsul
  // tidak mulai BERSENTUHAN dengan tanah dan dianggap menembus).
  const badan = w.createRigidBody(
    R.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(kaki.x, (kaki.y ?? 0) + tinggi / 2 + PARAM.offset, kaki.z),
  );
  const collider = w.createCollider(R.ColliderDesc.capsule(setengahBatang, jari), badan);
  fisika._kotor = true;

  const awal = { x: kaki.x, y: kaki.y ?? 0, z: kaki.z };
  return {
    fisika, kendali, badan, collider, tinggi, jari, setengahBatang,
    vY: 0, menapak: false, aktif: true,
    /** Sisa waktu yang belum dijadikan langkah. */
    sisa: 0,
    /** Kaki di dua langkah terakhir, untuk interpolasi gambar. */
    sebelum: { ...awal },
    sekarang: { ...awal },
  };
}

/**
 * Satu langkah kendali dengan dt TETAP. Dipakai `majukanKarakter` dan uji.
 *
 * @param {ReturnType<typeof buatKarakter>} k
 * @param {{ dt:number, arah?:[number,number], kecepatan?:number }} opsi
 *   `arah` di ruang dunia (XZ), dinormalkan di dalam.
 */
export function langkahKarakter(k, { dt, arah = [0, 0], kecepatan = KECEPATAN }) {
  if (!k.aktif) return { menapak: k.menapak, gerak: [0, 0, 0], kaki: kakiKarakter(k) };
  const d = Math.min(Math.max(dt, 0), PARAM.dtMaks);
  let [mx, mz] = arah;
  const p = Math.hypot(mx, mz);
  if (p > 1e-9) { mx /= p; mz /= p; } else { mx = 0; mz = 0; }

  // Collider yang baru didaftarkan belum terlihat sampai step — lihat Fisika.segarkan.
  k.fisika.segarkan();

  const menapak = k.kendali.computedGrounded();
  let gerakY;
  if (menapak && k.vY <= 0) {
    // Menapak: TIDAK didorong gravitasi. Rupa3D mendorong −vY·dt tiap langkah
    // (5 mm di 60 Hz); dorongan itu kadang masuk ke "kulit" offset tanpa
    // terdeteksi, lalu beberapa langkah kemudian tanah terbaca toi = 0 dan
    // pengendali membuang SELURUH gerak, termasuk yang horizontal. Terukur di
    // lantai datar: 12 dari 596 langkah tersendat, 1,04 m hilang per 10 detik.
    // Tanpa dorongan: 0 tersendat, 53,99 dari 54,00 m. Turun anak tangga tetap
    // menempel karena snap-to-ground yang menanganinya, bukan gravitasi.
    // (tools/fisika/ukur-tersendat.mjs, 15 Sep 2026)
    k.vY = 0;
    gerakY = 0;
  } else {
    k.vY -= GRAVITASI * d;
    gerakY = k.vY * d;
  }

  k.kendali.computeColliderMovement(k.collider, {
    x: mx * kecepatan * d, y: gerakY, z: mz * kecepatan * d,
  });
  const g = k.kendali.computedMovement();
  const t = k.badan.translation();
  k.badan.setNextKinematicTranslation({ x: t.x + g.x, y: t.y + g.y, z: t.z + g.z });

  // Menabrak langit-langit (dari Rupa3D): tanpa ini pemain menempel di
  // bawahnya sampai kecepatan naiknya habis.
  if (k.vY > 0 && g.y < k.vY * d * 0.5) k.vY = 0;

  k.fisika.w.step();
  k.menapak = menapak;
  return { menapak, gerak: [g.x, g.y, g.z], kaki: kakiKarakter(k) };
}

/**
 * Majukan karakter sebanyak waktu satu BINGKAI render.
 *
 * Mengumpulkan waktu, menjalankan 0..5 langkah tetap 1/60, dan mengembalikan
 * posisi yang sudah DIINTERPOLASI untuk digambar. Jarak tempuh per detik sama
 * di 30, 60, 120, dan 144 fps — dijaga uji.
 *
 * @param {ReturnType<typeof buatKarakter>} k
 * @param {number} dtBingkai detik sejak bingkai lalu
 * @param {[number, number]} [arah]
 * @param {number} [kecepatan]
 * @returns {{ kaki:{x:number,y:number,z:number}, menapak:boolean, langkah:number }}
 */
export function majukanKarakter(k, dtBingkai, arah = [0, 0], kecepatan = KECEPATAN) {
  if (!k.aktif) return { kaki: kakiKarakter(k), menapak: k.menapak, langkah: 0 };
  k.sisa += Math.max(0, dtBingkai || 0);
  let n = 0;
  // Epsilon: 1/144 dijumlah 144 kali tidak persis 1,0 dalam float. Tanpa
  // toleransi, satu langkah per detik bisa hilang di layar 144 Hz (terukur).
  while (k.sisa >= LANGKAH - 1e-9 && n < LANGKAH_MAKS_PER_BINGKAI) {
    k.sebelum = k.sekarang;
    k.sekarang = langkahKarakter(k, { dt: LANGKAH, arah, kecepatan }).kaki;
    k.sisa = Math.max(0, k.sisa - LANGKAH);
    n++;
  }
  // Bingkai sangat lambat: buang sisanya, jangan ditumpuk ke bingkai berikutnya.
  if (n === LANGKAH_MAKS_PER_BINGKAI && k.sisa >= LANGKAH) k.sisa = 0;

  const a = Math.min(k.sisa / LANGKAH, 1);
  const s = k.sebelum;
  const c = k.sekarang;
  return {
    kaki: { x: s.x + (c.x - s.x) * a, y: s.y + (c.y - s.y) * a, z: s.z + (c.z - s.z) * a },
    menapak: k.menapak,
    langkah: n,
  };
}

/** Lupakan waktu yang terkumpul — setelah tab kembali dari latar belakang,
 *  atau setelah teleport, supaya tidak ada interpolasi dari tempat lama. */
export function resetWaktuKarakter(k) {
  const kaki = kakiKarakter(k);
  k.sisa = 0;
  k.sebelum = { ...kaki };
  k.sekarang = { ...kaki };
}

/** Posisi telapak kaki dari pusat kapsul. */
export function kakiKarakter(k) {
  const t = k.badan.translation();
  return { x: t.x, y: t.y - k.tinggi / 2 - PARAM.offset, z: t.z };
}

/**
 * Pindahkan karakter seketika — untuk warp antar-Spot dan untuk BERDIRI dari
 * kursi. Kecepatan vertikal di-nol-kan: warp tidak boleh membawa momentum
 * jatuh dari tempat lama.
 */
export function teleportKarakter(k, kaki) {
  const pos = { x: kaki.x, y: (kaki.y ?? 0) + k.tinggi / 2 + PARAM.offset, z: kaki.z };
  k.badan.setTranslation(pos, true);
  k.badan.setNextKinematicTranslation(pos);
  // Collider baru mengikuti badan saat step atau propagasi berikutnya. Agen
  // Spot Bogor melaporkan kapsul yang diteleport keluar dari dalam warung
  // terangkat 0,37 m karena pengendali membaca collider di posisi LAMA.
  // Belum tereproduksi di tools/fisika/ukur-ambang-naik.mjs; dipasang karena
  // murah dan membuat collider konsisten seketika.
  k.fisika.w.propagateModifiedBodyPositionsToColliders();
  k.vY = 0;
  resetWaktuKarakter(k);
}

/**
 * DUDUK: pengendali berhenti dan kapsulnya dimatikan.
 *
 * Bukan cuma berhenti membaca tombol — kapsul yang tetap hidup di lokasi lama
 * adalah penghalang tak terlihat, dan kapsul yang dibiarkan di dalam dudukan
 * tidak pernah keluar sendiri: Codex mengukur kapsul di dalam dudukan masih
 * beririsan setelah 60 langkah. Pengendali Rapier tidak mendepenetrasi.
 */
export function nonaktifkanKarakter(k) {
  k.aktif = false;
  k.vY = 0;
  k.collider.setEnabled(false);
}

/**
 * BERDIRI: hidupkan kembali di titik yang SUDAH diperiksa bebas.
 * @param {{x:number,y?:number,z:number}} kaki
 */
export function aktifkanKarakter(k, kaki) {
  k.collider.setEnabled(true);
  k.aktif = true;
  teleportKarakter(k, kaki);
}

/**
 * Apakah kapsul pemain muat berdiri di sebuah titik: tidak beririsan dengan
 * collider mana pun, ada tanah di bawahnya, dan tanah itu SETINGGI lantai
 * tempat pemain berada — bukan permukaan dudukan atau daun meja.
 *
 * Syarat ketiga ditemukan uji, bukan dipikirkan duluan: sinar ke bawah di atas
 * dingklik mengenai DUDUKANNYA (0,40 m), kapsul di atasnya memang bebas, dan
 * pemain didirikan di atas dingklik. Jadi tanah hanya sah dalam jangkauan
 * naik-tangga dari tinggi acuan.
 *
 * Kapsul uji sedikit dikecilkan (2 cm) dan diangkat (4 cm): kapsul yang tepat
 * MENYENTUH lantai atau dinding tetap dihitung beririsan oleh Rapier, padahal
 * itu posisi berdiri yang sah.
 *
 * @param {ReturnType<typeof buatKarakter>} k
 * @param {{x:number,z:number,y?:number}} titik `y` = tinggi lantai acuan;
 *   kalau tidak ada, dipakai tinggi kaki karakter sekarang
 * @returns {{ bebas:boolean, tanahY:number|null, sebab?:string }}
 */
export function ruangBebas(k, titik) {
  const f = k.fisika;
  f.segarkan();
  const acuanY = titik.y ?? kakiKarakter(k).y;
  const tanahY = f.tanahDi(titik.x, titik.z, { dari: acuanY + 1.5, jarak: 3.5, abaikan: k.collider });
  if (tanahY == null) return { bebas: false, tanahY: null, sebab: 'tanpa-tanah' };
  if (tanahY > acuanY + PARAM.naikTangga) return { bebas: false, tanahY, sebab: 'terlalu-tinggi' };
  if (tanahY < acuanY - PARAM.tempelTanah - 0.25) return { bebas: false, tanahY, sebab: 'terlalu-rendah' };
  const bentuk = new f.R.Capsule(k.setengahBatang, k.jari - 0.02);
  const pusat = { x: titik.x, y: tanahY + k.tinggi / 2 + PARAM.offset + 0.04, z: titik.z };
  const kena = f.w.intersectionWithShape(pusat, { x: 0, y: 0, z: 0, w: 1 }, bentuk, undefined, undefined, k.collider);
  return kena ? { bebas: false, tanahY, sebab: 'terhalang' } : { bebas: true, tanahY };
}

/**
 * Titik berdiri pertama yang bebas dari daftar calon, berurutan.
 *
 * Urutan calon adalah KEPUTUSAN desain milik pemanggil (mis. mundur dari meja
 * dulu, baru ke samping). Fungsi ini hanya menolak yang tidak muat.
 *
 * @param {ReturnType<typeof buatKarakter>} k
 * @param {{x:number,z:number,y?:number}[]} calon
 * @param {{ boleh?: (p:{x:number,z:number}) => boolean }} [opsi]
 *   `boleh` menolak titik karena alasan permainan, mis. terlalu dekat kursi
 *   lain — keterisian kursi diturunkan dari posisi, jadi berdiri di radius
 *   kursi berarti klien lain tetap melihat kita duduk.
 * @returns {{x:number,y:number,z:number}|null}
 */
export function cariTempatBerdiri(k, calon, { boleh } = {}) {
  for (const c of calon) {
    if (boleh && !boleh(c)) continue;
    const r = ruangBebas(k, c);
    if (r.bebas) return { x: c.x, y: r.tanahY, z: c.z };
  }
  return null;
}

/**
 * Calon titik melingkar di sekitar sebuah posisi, dari yang terdekat — untuk
 * titik muncul dan saat fisika baru menyambung sementara pemain sudah berjalan
 * dengan gerak lama (bisa sedang berdiri di dalam batang pohon).
 *
 * @param {{x:number,z:number}} pusat
 * @returns {{x:number,z:number}[]}
 */
export function calonMelingkar(pusat, { jariMaks = 3, jarak = 0.3, perCincin = 12 } = {}) {
  const out = [{ x: pusat.x, z: pusat.z }];
  for (let r = jarak; r <= jariMaks + 1e-9; r += jarak) {
    const n = Math.max(perCincin, Math.round((2 * Math.PI * r) / jarak));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push({ x: pusat.x + Math.sin(a) * r, z: pusat.z + Math.cos(a) * r });
    }
  }
  return out;
}

/** Jalankan `detik` detik dengan masukan tetap, 60 langkah per detik. Deterministik. */
export function jalanKarakter(k, { detik, arah = [0, 0], kecepatan = KECEPATAN }) {
  const n = Math.round(detik * 60);
  let hasil = null;
  let pernahMenapak = false;
  for (let i = 0; i < n; i++) {
    hasil = langkahKarakter(k, { dt: LANGKAH, arah, kecepatan });
    pernahMenapak = pernahMenapak || hasil.menapak;
  }
  return { ...hasil, langkah: n, pernahMenapak };
}

/** Lepas karakter dari dunia. */
export function lepasKarakter(k) {
  if (!k) return;
  k.fisika.w.removeCharacterController(k.kendali);
  k.fisika.w.removeRigidBody(k.badan);
}
