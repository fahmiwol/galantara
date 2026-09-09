# Brief — bangun 3D Galantara sungguhan

Kamu mengambil alih arah dan pembangunan **3D** Galantara. Sesimu baru: baca
dulu, jangan langsung menulis kode.

## Siapa kamu di tugas ini
Game developer + game designer + seniman Indonesia (modeling dan lukis) yang
paham betul rupa Nusantara. Bukan pembuat aset generik yang menempel batik.

## Keadaan sekarang — ini yang harus kamu perbaiki

`index.html` + `src/` sudah jalan: Three.js **r128 dengan `THREE` global**,
kamera orbit, avatar, NPC, siklus hari, multiplayer Socket.io. Tapi dunianya
**scaffold**:

- `src/data/maps/default_oola.json` punya **NOL** `procedural_props`. Yang
  terlihat di layar cuma avatar, NPC, dan penanda zona. Bukan pemandangan.
- `src/tools/proceduralMeshFactory.js` (289 baris) baru punya 8 archetype
  bentuk dasar: `tree_round`, `warung_block`, `bench_park`, `lamp_post`,
  `gerobak_bakso`, `gazebo_bambu`, `pagar_kayu`, `pohon_kelapa`. Semuanya
  kotak dan silinder polos.
- Avatar masih kapsul (silinder + bola).

Jadi ini **bukan** pekerjaan repaint. Ini membangun isinya.

## BACA DULU — urut, jangan dilewati

1. `Galantara PRD utama Read Me.md` — **BAB 2** (Oola), **BAB 3** (Spot
   System), **BAB 4** (Visual Style). Ini mengikat.
2. `CHANGELOG.md` — entri teratas, supaya nyambung dengan yang baru dikerjakan.
3. `docs/GALANTARA_STYLE_CONTRACT_v0.md` + `src/data/styleTokens.js`
4. `docs/RISET_VISUAL_SENJA_90AN.md` — riset rupa yang sudah ada untuk Benteng.
5. `AGENTS.md` — aturan kerja.
6. Kode: `src/world/World.js`, `src/tools/proceduralMeshFactory.js`,
   `src/core/Renderer.js`, `src/world/DayNight.js`, `src/entities/Avatar.js`.

## Yang PRD sudah kunci — jangan ditawar

**Oola BUKAN kampung Nusantara.** PRD BAB 2.1: Oola adalah *"pulau melayang
bergaya surga — penuh warna pastel, pohon-pohon fantasi, suasana tenang tapi
hidup"*. Palet Oola: **putih / emas / lavender**, suasana *surgawi, tenang,
fantasi*. Oola cuma **kota kedatangan**.

**Ke-Nusantara-annya ada di SPOT**, dan tiap kota punya palet sendiri (BAB 4.2):

| Kota | Primer | Sekunder | Aksen | Suasana |
|---|---|---|---|---|
| Monas (Jakarta) | Hijau | Putih | Emas | Metropolitan, monumental |
| Kuta (Bali) | Oranye | Biru | Krem | Pantai, tropis, santai |
| Malioboro (Yogya) | Batik Amber | Ungu | — | Tradisional, batik, keraton |
| Braga (Bandung) | Abu-biru | Teal | Coral | Art deco, kafe, kreatif |
| Losari (Makassar) | Merah-oranye | Biru Navy | — | Sunset, pelabuhan, maritim |

**Gaya (BAB 4.1):** Soft · Bubbly · Playful · Low Poly · Semi-3D · Chibi.
Rujukan: Spline.design — bersih, halus, pastel.

**Material (BAB 4.3):** PBR roughness tinggi (matte), hindari kilau tajam,
lighting environment warm (sore hari default), soft shadow.

## Referensi rupa dari Fahmi (dikirim langsung)

- **Bellemont Peaks** — city-builder diorama, atap genting terakota, miniatur,
  cahaya lembut, UI berbingkai kayu/plakat.
  https://80.lv/articles/relaxing-city-builder-game-with-stylized-graphics-fairytale-vibes
- **Rumah adat Nusantara 3D** — Joglo (Jawa) dan Sulah Nyanda (Sunda),
  disajikan sebagai **diorama di atas alas bundar**, latar polos, berlabel.
- **Poster wisata Ubud / Bedugul** — miniatur sawah terasering, Pura Ulun
  Danu, kabut tipis, pastel hangat, plakat kayu.
- **Chibi Sunda** — anak berikat kepala, proporsi chibi, ornamen tepi.

Kata Fahmi: *"landscapenya harus Nusantara banget"*, dan suasana
**90-an – awal 2000-an yang syahdu**.

## Yang saya minta

### 1. Riset dulu → `docs/RISET_3D_NUSANTARA.md`
Riset bertumpu sumber, bukan klise. Rumah adat yang mana untuk Spot yang mana,
proporsi atapnya, bahan, ornamen, vegetasi khas, bentuk lahan. Sertakan rujukan.
Kalau tidak punya dasar, tulis **"belum punya dasarnya"** — jangan mengarang
nama motif atau daerah.

### 2. Archetype rumah adat di `proceduralMeshFactory.js`
Minimal: **joglo** (Jawa), **sulah nyanda** (Sunda), **rumah panggung** pesisir.
Procedural, ber-seed, hemat poligon. Atap adalah siluetnya — di situ kerjanya.
Tambah vegetasi: pisang, bambu rumpun, padi/terasering.

### 3. Alas diorama
Seluruh referensi Fahmi duduk di alas bundar/oval bertepi. Satu perubahan ini
yang paling mengubah kesan jadi miniatur.

### 4. Isi petanya
`default_oola.json` harus benar-benar berisi. Oola tetap surgawi-pastel sesuai
PRD — jangan dijadikan kampung.

### 5. Blender kalau perlu
Ada engine Blender procedural yang sudah jalan di
`C:\Mighan-3D\server\blender-engine.js` (headless, param-driven, ekspor GLB +
preview PNG, tanpa GPU). Pelajari, dan pakai kalau memang lebih baik daripada
mesh procedural di klien. Ada juga MCP `Blender` dan `rupa3d` kalau terdaftar.
Aset berat → GLB; jangan bengkakkan bundel klien.

## PAGAR — jangan ditembus

1. **`scene.traverse` DILARANG** (PRD BAB 2.4). Kumpulkan referensi saat objek
   dibuat. Saya baru saja memperbaiki satu pelanggaran ini — jangan diulang.
2. **`THREE` global, bukan `import 'three'`.** Klien memuat `three.min.js`
   lewat tag script. Bare import akan mematikan modulnya diam-diam.
3. **Kamera terkunci** (BAB 2.4): theta 0–360, phi **18–76 derajat**,
   lerp posisi 0.18, rotasi 0.10. Jangan diubah.
4. **JANGAN sentuh** `src/games/benteng/` — arena itu baru selesai disetel dan
   lulus lima gate terukur. Kecuali `benteng.css`/palet kalau memang perlu
   diselaraskan, dan itu pun harus lulus `node tools/benteng-visual-audit.mjs`.
5. `node --test tests/benteng.test.mjs` harus tetap **14/14**.
6. **Performa: HP kelas menengah.** Draw call dan poligon dijaga. Lampu titik
   tanpa shadow. Kontrak gaya menyebut ≤5k tri untuk prop kecil.
7. Jangan tambah dependency baru; jangan tarik aset dari CDN yang bisa mati.
8. **Peringatan yang sudah saya buktikan sendiri:** saya sempat menyalakan
   `outputEncoding = sRGBEncoding` + `ACESFilmicToneMapping` di `Renderer.js`.
   Secara prinsip benar, tapi seluruh material dan level cahaya di scene ini
   disetel TANPA itu, jadi hasilnya tersapu pucat — lebih buruk dari sebelumnya,
   dan saya kembalikan. Kalau kamu mau menyalakannya, **wajib sekalian pass
   ulang seluruh material dan intensitas cahaya**, dan buktikan dengan
   tangkapan layar sebelum/sesudah. Jangan setengah jalan.

## Cara kerja
- Catat di `CHANGELOG.md` (format sudah ada, terbaru di atas).
- Commit kecil dan bermakna. Bahasa Indonesia untuk dokumen, Inggris untuk
  komentar kode.
- Kalau tidak setuju dengan salah satu pagar, **tulis alasannya**, jangan
  diam-diam dilanggar.
- Kalau waktu habis: riset → archetype rumah adat → alas diorama → isi peta.
  Tulis sisanya di akhir dokumen riset.
