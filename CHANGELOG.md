# GALANTARA — Changelog
> Semua perubahan signifikan dicatat di sini.
> Format: `[versi] YYYY-MM-DD — Deskripsi`

## [Unreleased]

### Added
- **Deploy otomatis galantara.io** (ADR-0020): push ke `main` → uji → paket →
  penerima root di server → hash live dibandingkan dengan blob. Kunci CI hanya bisa
  memanggil penerima (`command=…,restrict`). **Aktif setelah Fahmi menjalankan
  `bash tools/deploy/pasang-kunci-ci.sh` sekali**; sampai itu, deploy dilewati
  dengan notice dan job tetap hijau (run `35011915971`).
- `tools/deploy-mp-galantara.sh`: deploy server multiplayer dengan staging,
  uji asap handshake, tukar direktori atomik, dan pemulihan.
- **ADR-0019: kontrak collider GLB lintas produk** `asset.extras.rupa3d.collider`
  v1, diterima Rupa3D; penulis sertifikat Rupa3D kini mempertahankan `collider`.

### Fixed
- **Server multiplayer produksi crash setiap pemain putus.** Kodenya lebih tua dari
  commit awal repo: `removePlayer` memanggil `_broadcastCount` yang hanya ada di
  dalam handler koneksi, sehingga `ReferenceError` terjadi setiap tenggang 8 detik
  habis (118 kali di log galat) dan PM2 me-restart berulang. Kini HEAD, yang juga
  berhenti menghitung pemain ganda saat pindah Spot.

### Changed
- `galantara-server`: `three` dan `galantara-repo` (`file:..`) jadi
  devDependencies, karena hanya dipakai mode `--local`.
- `tests/deployAssets.test.mjs`: kontrak lama ("tanpa pemicu otomatis") diganti
  kontrak baru. Workflow, skrip manual, dan penerima wajib mengirim daftar yang
  sama; terbukti merah saat daftar penerima dikurangi.

### Koreksi
- **CI lama gagal bukan karena port 22.** Web root dipindah ke VPS-2 pada 7 Mei
  2026 (waktu lahir berkas), dan kunci deploy April tidak terdaftar di VPS-2.
  Klaim "port 22" di [0.10.0], ADR-0018, dan commit `4a9c6d2` adalah dugaan yang
  tidak diperiksa.

## [0.10.0] · 2026-09-16
> **Live di galantara.io** — deploy pertama sejak 13 April 2026 (`dfe86d2`, dikirim
> ulang sebagai `4a9c6d2` karena paket pertama ber-CRLF).
> Semua kerja September (fisika, cahaya, enam Spot, chat, Meja Nongkrong,
> vendor) sampai ke pemain hari ini, bukan cuma di GitHub.

### Deploy
- **galantara.io ternyata tidak pernah tanpa server.** Hidup di VPS-2 dengan SSH
  di port 2222; CI gagal karena mencoba port 22. ADR-0018 mengoreksi ADR-0007.
- `tools/deploy-galantara.sh` (`coba` / `jalankan` / `pulihkan`): paket dari HEAD
  yang sudah di-push, backup, sinkron folder lalu HTML, verifikasi bita per bita.
  Runbook: `docs/DEPLOY.md`.
- Vhost: `Cache-Control: no-cache` (tanpa itu build lama dianggap segar ~15 hari)
  dan gzip JS/CSS/JSON — Rapier 2,86 → 1,08 MB, three 603 → 149 KB di kabel.
- `git archive` di Windows mengubah HTML/JS jadi CRLF; skrip kini memaksa LF
  dan membandingkan live dengan blob commit, bukan working tree.
- Belum: server multiplayer masih kode April (protokol klien sama).

### Added
- **Keenam Spot menyatakan tanah, batas, dan collider-nya sendiri** — Bogor
  38, Braga 39, Kuta 27, Losari 35, Malioboro 41, Monas 41 (termasuk collider
  GLB). Bangunan tidak lagi bisa ditembus, dan pemain berhenti di tepi
  alun-alun, plaza, pantai, dan jalan yang terlihat, bukan di cincin 17 m
  bawaan.
- **GLB dari manifest Spot mendapat collider**: berkas pendamping
  `<nama>.collider.json` atau `asset.extras.rupa3d.collider` di GLB-nya.
  Bentuknya sama dengan usulan kontrak Rupa3D — kontraknya **belum
  diputuskan**.
- **Anggaran isi Spot dijaga uji** (`tests/anggaranSpot.test.mjs`): segitiga
  ≤ 20.000, draw call pass utama ≤ 150, PointLight ≤ 3. `tools/anggaran-spot.mjs`
  menampilkan angkanya, termasuk kaster bayangan yang belum dianggarkan.
- `docs/brief/suasana/KEPUTUSAN.md`: delapan bentrok antar-brief suasana
  diputuskan dengan angka sebelum ada yang dibangun dari brief.

### Changed
- **Siklus cahaya jadi tabel keyframe yang dikalibrasi terhadap piksel**:
  siang `#addca6`, jam emas `#b7ae57` dengan matahari hangat rendah, magrib
  `#61555e`, malam biru tinta `#283b4c` dengan kolam cahaya lampu yang terbaca.
  Ambient dan warna cahaya isi (mengikuti langit) ikut dikendalikan.
- **Suasana Oola** (brief gpt-5.6-sol + sintesis, 0 segitiga baru): tiga bangku
  lempeng tanpa kaki dihapus; lima petak bunga jadi tiga rumpun di dekat papan,
  meja, dan bangku; kanopi pohon ungu diredam; Dev Hub bergaya palet Oola
  (layar `#5E8C7A`, bukan usulan brief `#BFE3D0` yang hanya Delta-E 17,4);
  halo jadi busur 225° yang diam.
- **PointLight per Spot paling banyak tiga**: Oola 8 → 3, Braga 10 → 3,
  Malioboro 10 → 3, Losari 5 → 3. Bohlam sisanya tetap menyala sebagai
  emissive. r128 menghitung setiap PointLight di shader tiap material walau
  intensitasnya 0. Cahaya dipasang untuk tempat orang berhenti (warung, kios,
  gerobak pisang epe), bukan untuk ritme hiasan.
- **Aturan panjat diukur dari semua arah**: benda rendah yang tidak boleh
  dinaiki kini ≥ 0,70 m. Dari depan kapsul menaiki 0,40 m, dari arah miring
  0,50 m, dan sekali 0,60 m pada silinder sempit (32 arah × 5 geseran).
  Dingklik, dulang lesehan, bangku, dan alas portal jadi 0,70.
- **Petak bunga 8 → 2 draw call** (InstancedMesh dengan warna per instans);
  Oola 153 → 123, letak dan warna tiap bunga tidak berubah.

### Fixed
- **Pulau dirender PUTIH sepanjang siang.** Diukur dari piksel: tanah
  `#a8d5a2` tampil `#ffffff` jam 12:00–13:30 dan `#ffffeb`/`#f8ffe7` jam 09:00 dan
  15:30. Penyebabnya `AmbientLight` 0,6 di Renderer yang tidak pernah disentuh
  siklus hari. ADR-0017.
- **Langit tidak pernah berganti warna.** DayNight menerima kubah langit
  sebelum World membangunnya; kubah macet di `#87ceeb`.
- **Kapsul menembus dinding sesaat** sampai 7 cm saat menapak sambil menyentuh
  dinding. `normalNudgeFactor` 3e-3, dipilih dari dua set lintasan: 0 langkah
  > 2 cm, tanpa tersendat, tanpa getar.
- **Monas:** atap miring rumah kebaya terpasang terbalik, tiang teras tidak
  menopang apa pun, tugu melayang 8 cm.
- **Losari:** rumah panggung menabrak portal dan tangganya menghadap tepi
  darat.
- **Malioboro:** kios tidak lagi gelap di malam hari.

### Known issues
- **Braga:** kedua deret ruko menghadap portal (+Z), bukan ke jalan; kanopi
  menembus punggung tetangga 0,1–0,3 m di enam celah.
- **Kuta:** pasir menutupi laut 2,2 m; tangga gerbang naik menjauhi gerbang
  dan melayang; kelapa condong sejajar pantai; kursi tanpa kaki.
- **Rumah GLB tidak memancarkan bayangan** — `AssetLibrary` tidak menyalakan
  `castShadow`.
- **Pass bayangan belum dianggarkan.** Satu bingkai Oola dari kamera ikhtisar
  = 139 draw call pass utama + 70 pass bayangan. Belum ada angka dari ponsel.

### Tests
- `tests/dayNight.test.mjs`: model Lambert r128 dijangkarkan ke piksel terukur
  (±6 %), lalu menjaga tidak ada jam dengan kanal ≥ 250, siang hijau, malam biru.
- `tests/fisikaSpot-*.test.mjs` untuk keenam Spot: titik muncul, 16 arah,
  titik berdiri tiap kursi, pelepasan kelompok, lampu.
- `tests/panjat.test.mjs`: ambang panjat disapu dari deskriptor produksi.
- `tests/assetCollider.test.mjs`: kontrak collider GLB, skala, dan generasi
  muat yang dibatalkan.
- `tests/anggaranSpot.test.mjs`: anggaran tujuh Spot dan petak bunga.

## [0.9.0] · 2026-09-15
> **Dunia yang bisa ditabrak.** Pemain tidak lagi menembus pohon, rumah, dan
> meja; mereka meluncur di sepanjang permukaannya, seperti di Godot, Unity, dan
> Unreal. Mesinnya sama dengan Rupa3D.

### Added
- **Fisika Rapier 0.20** (`src/fisika/`), dimuat SETELAH dunia tampil. Selama
  memuat atau kalau gagal, gerak lama tetap jalan. ADR-0015.
- **Pengendali karakter kinematik**: sapu-lalu-meluncur, naik anak tangga
  ≤ 0,35 m, menempel tanah, langkah tetap 1/60 dengan interpolasi.
- **Collider untuk semua prop Oola** — 62 buah: tanah, cincin tepi, 8 prop
  native, 14 prop prosedural, meja warung. Tiap builder prosedural menyatakan
  collider-nya sendiri (`userData.fisika`). ADR-0016.
- **Titik berdiri dari kursi** per gaya meja (warung, lesehan, kafe, bangku),
  diuji ruang kapsulnya sebelum dipakai.
- **Tampilan collider**: `?kolisi` di URL atau `G_Fisika.lihat()`; status di
  `G_Fisika.status()`.
- **Tanah dan batas bawaan** untuk Spot yang belum menyatakan miliknya — sama
  dengan perilaku lama, supaya fisika tidak membuat Spot mana pun lebih buruk.
- `tools/fisika/` — tiga alat ukur yang menjadi bukti ADR-0015.
- `tools/brief-suasana.sh` + `docs/brief/suasana/` — brief suasana tujuh Spot
  dari gpt-5.6-sol, dengan prompt yang disimpan supaya bisa diulang.

### Fixed
- **Berdiri tetap terlihat duduk di layar orang lain.** `berdiri()` dulu tidak
  memindahkan posisi, padahal keterisian kursi diturunkan dari posisi.
- **Kecepatan bergantung laju bingkai**: `SPEED = 0.09` per bingkai membuat
  pemain ponsel 30 fps berjalan setengah kecepatan. Sekarang 5,4 m/s.
- **Tombol arah tersangkut** saat jendela kehilangan fokus — pemain berjalan
  sendiri. Input di-reset saat `blur`/tab tersembunyi.
- **Warp sambil duduk** membawa status duduk ke Spot baru.
- `tools/tanya-gpt.mjs` memakai `node:https` dengan batas 20 menit; `fetch`
  Node memutus permintaan bernalar panjang setelah 5 menit tanpa pesan jelas.

### Temuan yang mengubah rancangan (angka di ADR-0015)
- Pola gravitasi Rupa3D membuat **12 dari 596 langkah bergerak nol** di lantai
  datar; tanpa gravitasi saat menapak: 0.
- Collider **baru** tidak terlihat pengendali Rapier sebelum `world.step()`;
  gerak 2 m menembus dinding baru.
- Batas hull 8.000 titik di rancangan pertama salah — Rupa3D memakai 4.096.
- Raycast tanah mengenai dudukan dingklik: rancangan pertama mendirikan pemain
  DI ATAS dingklik. Ditangkap uji.

### Tests
- `tests/fisika.test.mjs` (25) dan `tests/fisikaDunia.test.mjs` (24) memakai
  Rapier dan THREE r128 asli. **115/115 lulus.**
- Browser (Chrome, localhost): muat Rapier 235 ms pertama / 23 ms cache, init
  WASM 17–24 ms; jalan ke pohon ungu berhenti 0,895 m dari sumbu batang; duduk
  lalu berdiri memindahkan 0,62 m dan hint meja kembali 0/4; Oola → Malioboro →
  Oola mengembalikan jumlah collider ke 62.

### Batas verifikasi
- **Ponsel belum diukur.** 1,08 MB gzip = ±8,6 detik di 1 Mbps.
- Spot selain Oola baru memakai tanah dan batas bawaan; bangunannya belum
  punya collider, dan Spot jalanan masih bisa dijalani di luar jalannya.
- Tinggi kaki (anak tangga, terasering) belum disinkronkan ke pemain lain.
- Collider dari GLB belum dibaca; konvensinya menunggu keputusan.
- Tidak di-deploy. galantara.io masih melayani build April.

## [0.8.1] · 2026-09-11

Hasilnya kecil: menutup celah penyajian aset lokal, bukan fitur pemain baru.

### Fixed
- Server `npm run dev` kini menyajikan `vendor/`. Sebelumnya index terbuka
  tetapi pustaka/font vendor 404; tes unit lama tidak memeriksa jalur HTTP ini.
  Allowlist tetap terbatas dan dotfile/berkas internal tetap tidak disajikan.
- Paket deploy statis menyertakan seluruh `vendor/`, termasuk font/lisensi.
  Pemicu tetap **manual-only** dan deploy tidak dijalankan; belum ada server.

### Tests & tooling
- Tes HTTP menjalankan server lokal sungguhan di port OS-assigned, mencocokkan
  byte aset dan memeriksa penolakan path internal. `GALANTARA_LOCAL_PORT=0`
  untuk tes; pemakaian biasa tetap `127.0.0.1:4000`, health memakai port aktual.
- Tes kontrak struktur workflow menjaga kelengkapan aset dan trigger manual.
  Bukan uji SSH/rsync/deploy nyata. Terbukti merah sebelum perbaikan vendor.
- **62/62 tes lulus, 0 skip** pada lingkungan dengan dependency server terpasang;
  tes HTTP memberi skip jelas bila dependency server belum dipasang.
- Root package dan metadata paket link lokal di lockfile selaras **0.8.1**.

### Batas verifikasi
- Smoke browser Oola → Benteng → masuk arena → Oola berhasil tanpa console
  error/warning. Tidak mengklaim validasi gameplay realtime, login, voice,
  multiplayer dua pemain, instalasi bersih atau deploy. Proses lama port 4000
  tidak dimatikan; mulai ulang `npm run dev` untuk memakai patch server.

## [0.8.0] · 2026-09-11
> **Berkumpul, dan berdiri sendiri.** Bubble chat, Meja Nongkrong, dan seluruh
> pustaka klien dipindah ke dalam repo sehingga Galantara jalan tanpa satu pun
> permintaan pihak ketiga.

### Dokumentasi & persistensi (FASE 7)
- **`LICENSE`** — MIT.
- **`PAPER.md`** — catatan metode, dalam bahasa Inggris. Dibuka dengan
  pernyataan bahwa ini **bukan riset baru**, dan ditutup dengan bagian kritik
  diri yang menyebut apa yang masih lemah.
- **`docs/adr/`** — 14 keputusan teknis, tiap satu dengan bagian *Yang dibayar*
  dan *Alternatif yang ditolak*. Aturannya: kalau bagian *Yang dibayar* kosong,
  ADR-nya belum selesai dipikirkan.
- **`docs/LIVING_LOG.md`** — catatan berjalan.
- **`README.md`** ditulis ulang, dengan tabel **"Belum ada"** yang sengaja tidak
  dipoles.
- **Versi**: `package.json` ditetapkan sebagai satu-satunya sumber kebenaran
  versi (ADR-0014), dinaikkan 0.5.1 → 0.8.0.

#### Diperbaiki di CHANGELOG ini sendiri
Berkas ini punya **dua blok bernomor `v0.7.2`** dengan isi berbeda, dan **empat
blok `[Unreleased]`**. Dinomori ulang jadi monoton mengikuti urutan berkas:
"Benteng bernuansa senja" 09-09 menjadi **v0.7.1**, "near-miss 0,5" 09-09
menjadi **v0.7.2**, dan seluruh pekerjaan 10–11 Sep menjadi **0.8.0** ini.
Dicatat di sini, bukan diam-diam.

### Status deploy: belum ada server

#### Changed
- Pemicu otomatis `.github/workflows/deploy-vps.yml` **dimatikan**; tinggal
  `workflow_dispatch`. Belum ada server tujuan, jadi setiap push menghasilkan
  CI merah yang tidak menandakan apa pun selain "server belum ada" — dan CI
  yang selalu merah mengajari semua orang berhenti membacanya.
- Workflow-nya **tidak dihapus**. Isinya sudah diperbaiki di `87f4451`
  (`benteng.html` dan seluruh `assets/` dulu tidak pernah ikut ter-rsync, jadi
  3 GLB rumah adat dan 6 manifest Spot akan 404 begitu deploy jalan). Perbaikan
  itu menunggu di sana. Begitu servernya ada: kembalikan blok `push:` dan isi
  Secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `REMOTE_PATH`.
- `tmp/` masuk `.gitignore` — tangkapan render untuk review visual tidak perlu
  ikut ke repo.

#### Catatan
Sementara ini Galantara dibangun dan diperiksa **di lokal**: `npx serve -p 4000 .`
lalu `http://localhost:4000/index.html`; multiplayer `npm run install:server`
sekali, lalu `npm run dev`. GitHub adalah tempat penyimpanan yang berlaku
sekarang — commit, bukan live.

### Meja Nongkrong: arahan seni, dan dua alat baru

Arah seninya diserahkan ke GPT-5.6 lewat API langsung, dengan RENDER ASLINYA
sebagai masukan — bukan deskripsi. Untuk itu dibangun dua alat, disimpan di repo.

#### Added
- `tools/tanya-gpt.mjs` — minta pendapat kedua ke OpenAI dari dalam repo.
  Peran siap pakai (`seni`, `desain`, `kode`), bisa menyertakan berkas dan
  GAMBAR. Kunci dibaca dari env, tidak pernah masuk berkas atau chat. Ada
  karena Codex CLI buntu di mesin ini sementara API langsung tidak.
- `tools/penerima-render.mjs` — terima tangkapan layar dari halaman, tulis ke
  berkas. Perlu karena `toDataURL()` pada renderer aplikasi mengembalikan
  kosong (WebGL membuang drawing buffer), unduhan mati di sandbox pratinjau,
  dan menarik dataURL lewat hasil tool berarti ~200 ribu karakter sia-sia.
- Lampu boleh menyatakan `userData.kuatRelatif`. Bawaannya 1, jadi lampu lama
  tidak berubah. Ini yang membuat KOMPOSISI cahaya mungkin: satu pusat terang
  dengan pendamping yang jauh lebih lemah terbaca sebagai tempat yang hangat;
  semua lampu sama terang terbaca sebagai penerangan umum.

#### Changed — bentuk mejanya, atas temuan art director
Diagnosis yang paling tajam: **daun bundar + kaki tengah + dingklik bundar +
lampu globe adalah bahasa visual set patio / kafe taman**, dan teko gerabah
saja tidak mengubahnya jadi Indonesia.

- Daun jadi **persegi panjang 1,10 × 0,72 m dari tiga papan bercelah**, dengan
  4 kaki sudut 0,06 m, apron 0,11 m, dan pengaku H. Itu konstruksi tukang kayu.
- Dingklik jadi **dudukan kotak 0,28 m berkaki empat membuka 5°** dengan palang
  bawah. Dingklik "jamur" itu bangku bar, bukan bangku warung.
- Ditambah **termos pompa** — siluetnya yang paling langsung terbaca sebagai
  warung 90-an. Gelas dikurangi jadi dua: meja penuh gelas terlihat seperti
  display, bukan meja yang sedang dipakai.
- **Meja diberi WILAYAH, bukan ukuran lebih besar** — ukurannya sudah benar
  terhadap avatar. Bidang tanah terinjak berbentuk poligon tak beraturan
  (oval tertutup terbaca sebagai panggung), jalur tanah menerus 0,58 × 1,70 m
  dengan 7 batu pijak lebar-datar-tertanam, dan 6 batu tepi kecil-tinggi
  berwarna lebih dingin supaya jalur terbaca sebagai jalur.
- **Susunan kursi 2 + 1 + 1, satu sisi panjang sengaja dikosongkan.** Avatar
  chibi berkepala besar: empat orang tersebar merata akan menutup seluruh daun
  meja dari kamera atas-serong, berapa pun ukuran mejanya. Toleransi kursi ikut
  turun 0,45 → 0,34 m karena dua kursi sesisi hanya berjarak 0,76 m.
- **Atap sengkuap menaungi meja.** Dua tiang + palang tanpa atap terbaca
  sebagai gawang atau ayunan taman bermain.

#### Fixed
- Arah rotasi letak kursi berlawanan dengan rotasi Three.js
  (`x' = x·cos + z·sin`, bukan `x·cos − z·sin`). Akibatnya letak kursi
  tercermin terhadap dingklik yang digambar — di meja Oola yang diputar 45°,
  pemain didudukkan di SEBELAH bangkunya. Diverifikasi terhadap
  `THREE.Object3D` asli, dan dikunci oleh uji regresi.
- Koordinat lokal kursi sempat ikut diputar padahal grup mesh-nya juga diputar
  — dingklik kena rotasi dua kali.
- Bidang tanah menghadap ke BAWAH (`rotation.x = +π/2` memutar normal +Z jadi
  −Y) sehingga tidak pernah terlihat sama sekali.

#### Catatan: satu angka arahan seni sengaja ditimpa
Arahan aslinya meminta atap pelana DANGKAL, nok 2,12 m di atas bibir 1,92 m —
kemiringan 20°. Dicoba dua kali dan dilihat hasilnya: dari jarak kamera
Galantara kemiringan itu tidak terbaca sama sekali dan atapnya tampak sebagai
papan nama mendatar, persis siluet yang sedang dihindari. Pelana juga menuntut
tiang depan supaya tidak melayang, dan tiang depan berdiri tepat di tempat
orang duduk. Diganti **sengkuap** — ditopang dua tiang belakang yang sudah ada,
menjulur menaungi meja, dan kemiringannya terbaca karena tepi depannya jelas
lebih rendah. Itu juga bentuk yang paling lazim untuk warung dan kaki lima.

### Meja Nongkrong v1

Social node pertama. PRD `GALANTARA_BUILDER_SYSTEM` §SocialNode registry:
*"warung, bangku, panggung = node pertama, bukan dekorasi terakhir"*, dan
`RESOURCES_RESEARCH` menaruh "InteractionVolume + satu aksi (bangku duduk)"
sebagai **P1** dengan alasan *"jadi betah tanpa nambah mesh"*.

#### Added
- `src/world/MejaNongkrong.js` — meja bundar rendah + 4 dingklik + teko dan
  gelas, dengan lampu gantung sendiri yang ikut siklus magrib. Ukurannya nyata
  (meja 68 cm, dingklik 38 cm): meja warung Indonesia rendah, dan itulah yang
  membuat orang duduk membungkuk **mendekat**, bukan bersandar menjauh seperti
  kursi kafe. Dingklik dan gelas pakai `InstancedMesh` — 4 kursi = 2 draw call.
- **Ikut nimbrung dengan `[F]`**. Avatar di-snap ke kursi kosong terdekat dan
  diputar menghadap pusat meja, supaya orang-orang di satu meja benar-benar
  berhadapan. Menekan tombol arah **membangunkan**, bukan menggeser — memaksa
  orang menekan `[F]` lagi membuat mereka merasa terjebak di kursi.
- Indikator keterisian di hint: `🍵 Meja Nongkrong · 3/4 — [F] ikut nimbrung`,
  berubah jadi `[F] berdiri` kalau kamu yang duduk dan `penuh, tunggu ada yang
  berdiri` kalau tidak ada tempat.
- `tests/mejaNongkrong.test.mjs` — 13 uji.

#### Changed
- Oola sekarang bisa punya `InteractionVolume`. Sebelumnya hanya Spot runtime
  yang boleh; Oola cuma punya `ZONES` statis dari config, sehingga social node
  tidak mungkin ada di kota kedatangan — tempat yang justru paling ramai.
- Hint interaksi boleh berubah walau volumenya sama, karena keterisian meja
  bergerak saat orang datang dan pergi. Yang dijaga adalah tidak menulis ulang
  teks yang **sama**, bukan tidak pernah menulis ulang.
- `RemotePlayers` menurunkan badan pemain yang sedang duduk, dilerp bukan
  dipatok. Tanpa ini kamu melihat dirimu duduk sementara orang lain melihatmu
  berdiri di atas dingklik.

#### Fixed
- Posisi hanya dikirim saat `isMoving`. Duduk membuat `isMoving` false padahal
  posisinya baru saja di-snap ke kursi — klien lain akan melihat orang itu
  tetap berdiri di tempat lamanya. Sekarang duduk dan berdiri memaksa satu emit.
- Radius interaksi meja 1,92 m → 2,37 m. Kursi ada di 1,02 m dan meja+dingklik
  memakan ~1,2 m, jadi hint lama baru muncul ketika orang sudah berdiri di
  antara dingklik — terlambat untuk jadi ajakan.

#### Catatan jujur
- **Keterisian kursi tidak memakai state server.** Posisi tiap pemain sudah
  disiarkan lewat `player_move`, jadi tiap klien menghitung sendiri siapa duduk
  di kursi mana. Aman hanya karena aturannya deterministik — pasangan
  (pemain, kursi) terdekat menang lebih dulu, seri dipatahkan kunci socketId
  yang terurut. Itu yang diuji paling keras di `mejaNongkrong.test.mjs`:
  masukan yang sama dalam urutan apa pun menghasilkan peta kursi yang sama.
- **Chat radius meja BELUM ada.** Usulan aslinya menyebutkan itu, tapi chat
  sekarang disiarkan ke seluruh room oleh server; membuatnya per-meja butuh
  perubahan server, bukan trik klien. Tidak dipalsukan.
- Yang dilihat baru meja di Oola. Braga — Spot nongkrong menurut
  `RISET_3D_NUSANTARA` §14 — belum diberi meja.

### Polish overlay

- Bubble mengukur ulang kotaknya saat resize/font mengubah layout; cache tetap
  dipakai saat stabil. Snapshot ukuran lapisan dibaca sekali per update, ukur
  kotak dibatch sebelum tulis gaya, dan nilai gaya yang sama tidak ditulis ulang.
- Callback animasi tertunda tidak menyalakan bubble yang sudah dibuang.
- Label pemain remote memakai ulang satu Vector3, mengikuti ukuran lapisan
  overlay, serta tersembunyi di luar viewport dan near/far plane. Aturan
  gameplay, gerakan, autentikasi, dan relay multiplayer tidak diubah.
- Suite **45/45**: Benteng 14, chatBubble 21, dailyChallenge 7, remotePlayers 3.
  Tes resource memakai Three.js asli dan mengunci dispose tepat sekali.
- Rincian QA dan kelanjutan Claude: `docs/HANDOFF-GPT-POLISH-2026-09-10.md`.
  Belum push/deploy; Meja Nongkrong v1 tetap backlog.

---

### Bubble chat di atas kepala — PRD BAB 5.1.1

#### Added
- `src/ui/ChatBubble.js` — satu lapisan bubble untuk avatar lokal **dan** avatar
  pemain lain, jadi hanya ada satu jalur proyeksi 3D→2D yang harus dijaga benar.
  Bubble dipetakan lewat `socketId`, bukan pencocokan nama; nama bisa kembar.
- Lama tampil **2,4 detik + 0,045 detik per huruf**, dijepit maksimal 7 detik.
  Pesan panjang butuh waktu baca; pesan pendek yang menggantung lama menutupi
  dunia. Pesan beruntun dari orang yang sama **mengganti**, tidak menumpuk.
- Bubble disembunyikan bila tokohnya lebih kecil dari **24 px** di layar —
  keputusan keterbacaan yang memakai ukuran target minimum WCAG 2.5.8 sebagai
  *pembanding besaran*, **bukan** klaim kepatuhan (SC 2.5.8 mengatur target
  interaktif; avatar di sini bukan target klik). Dihitung dari proyeksi perspektif
  `px_per_unit = (tinggi_viewport / (2·tan(fov/2))) / jarak` — bukan jarak
  karangan, supaya ikut menyesuaikan FOV dan viewport. Pada 1280×720 fov 45,
  ambangnya jatuh di ~67 unit. Tanpa ini, `<div>` yang tidak mengecil dengan
  jarak jadi papan besar di atas titik sebesar piksel.
- `RemotePlayers.posisiBubble(socketId)` — titik gantung dari mesh yang sedang
  di-lerp, jadi bubble ikut bergerak halus; `null` bila pemainnya sudah keluar.
- `MultiplayerSocket.id` — socketId sendiri, untuk memisahkan echo dengan pasti.
- `tests/chatBubble.test.mjs` — 10 uji mengunci durasi, ambang 24 px, daur hidup
  (kedaluwarsa → transisi keluar → lepas dari DOM), dan penjaga viewport 0.

#### Changed
- Toast `💬 nama: pesan` kini **hanya** muncul bila bubble pengirimnya tidak
  terlihat (di luar layar, di belakang kamera, terlalu jauh, atau belum ada di
  roster). Sebelumnya satu pesan tampil tiga kali sekaligus: bubble, panel chat,
  dan toast — dan toast menutupi dunia justru saat pemain sedang menatap orang
  yang bicara.
- Dua salinan logika kirim chat di `Game.js` disatukan jadi `_kirimChat()`.
  Salinan itulah yang membuat fitur seperti ini mudah terpasang di satu jalur
  lalu diam di jalur lain.
- Warna bubble `#FDF6E8` dengan tinta `#2A1F14` — kontras **14,9:1**, mengikuti
  arah visual "Nusantara syahdu 90-an s.d. awal 2000-an". Menghormati
  `prefers-reduced-motion`.

#### Removed
- `Avatar.showChat()` / `Avatar.updateBubble()` beserta field `_bubble`.
  Komentarnya mengaku *"Dipanggil tiap frame dari Game.js"*, padahal `grep`
  menemukan **nol** pemanggil dan CSS `.av-bubble` tidak pernah ada.
  Mempertahankannya berarti dua mekanisme untuk satu hal.

#### Fixed
- Nilai layout yang terbaca `0` (layout belum jadi) tidak lagi menyembunyikan
  **semua** bubble. Uji ukuran dilewati bila tinggi viewport tidak diketahui —
  fitur yang diam-diam kosong tidak akan pernah dilaporkan sebagai bug.

---

## [v0.7.2] · 2026-09-09
> **Benteng — near-miss 0,5 dan polish keterbacaan yang terukur**

#### Changed
- `nearMiss.distance` **0,3 → 0,5**. Radius tag 0,6 m, jadi pita lama 0,6-0,9 m
  dilintasi dalam ~60 ms (±4 frame) pada 5 m/detik — terlalu singkat untuk
  terbaca. Near-miss 2,20 → **3,50 per match**; **kelima gate Fase 0 lulus**.
- Lantai tipografi HUD **7 px → 10/11 px** (18 aturan CSS). Acuan: Material 3
  label-small 11sp, Apple HIG minimum 11pt.
- Roster dilebarkan 105/120/152 → 126/132/140 px dan nama panjang ter-ellipsis,
  karena teks yang lebih besar menjebolkannya 4 px.
- Nama tawanan tidak lagi digambar di arena. Tawanan berjajar ~44,7 px di layar
  sementara "Rajawali" selebar 49 px — labelnya menyatu jadi satu gumpalan.
  Identitasnya sudah terbaca di roster lewat ikon rantai.

#### Added
- `nearMiss.slowOnlyForPlayer` (default **true**). Diukur 40 match: 100%
  near-miss terjadi antar-bot, nol melibatkan pemain — menghentikan waktu untuk
  kejadian yang pemain tak lihat terbaca sebagai tersendat, bukan hadiah.
  Percikan dan kilau lokal tetap muncul untuk semua near-miss.
- `PlaytestLogger.playerNearMisses` — dilacak terpisah, sengaja **tidak** masuk
  CSV karena kontrak 14 kolom sudah dikunci.
- `tools/benteng-visual-audit.mjs` (`npm run audit:visual`) — kontras WCAG 2.2
  plus jarak warna CIE76 di bawah simulasi protanopia/deuteranopia/tritanopia
  (matriks Machado dkk. 2009). Ambang dE >= 20 untuk kategori yang harus
  dibedakan sekilas.
- Area sentuh **44x44** (Apple HIG · WCAG 2.2 SC 2.5.5) lewat `::after` yang
  melebar, tanpa membesarkan kotak yang terlihat.
- `npm run sim:benteng` sebagai jalan pintas ke gate Fase 0.

#### Fixed
- Zoom halaman tidak lagi dikunci. `maximum-scale=1,user-scalable=no` melanggar
  WCAG 2.2 SC 1.4.4 (Resize Text 200%). Tombol diberi `touch-action:manipulation`
  supaya jeda tap-ganda 300 ms tetap hilang.
- Satu target sentuh 21x32 px di bawah ambang WCAG 2.2 SC 2.5.8 (24x24).

### Tidak diubah — dan itu disengaja
- **Palet tetap.** Audit menunjukkan warna tim dan tangga aura lolos semua
  ambang di ketiga jenis buta warna; yang paling tipis `sedang → rendah` di
  deuteranopia (dE 24,2). Palet sesi sebelumnya sudah kuat.

---

## [v0.7.1] · 2026-09-09
> **Benteng bernuansa senja 90-an** — palet, huruf, dan lapangan

### Kenapa
Fahmi: *"UI-nya terlalu AI banget. Bikin lebih Indonesia, suasana tahun 90 –
awal 2000-an yang syahdu."* Keluhannya punya bukti: palet lama adalah **warna
default Tailwind mentah** (`#0ea5e9` sky-500, `#a855f7` purple-500,
`#f59e0b` amber-500, `#fb7185` rose-400) di atas navy `#111936`, dengan
Syne+Nunito. Itu juga **melanggar kontrak gaya proyek sendiri**, yang menulis
"hangat dominan, golden hour, **bukan abu-abu cinematic**".

Arahannya juga tepat secara isi: bentengan adalah permainan anak di tanah
lapang, dan waktunya memang sore sampai magrib.

### Added
- `docs/RISET_VISUAL_SENJA_90AN.md` — dasar tiap warna dan bentuk. Sumber
  rupa (langit magrib, tanah lapang, garis kapur, lampu natrium, pergeseran
  warna cetakan C41), pilihan huruf, dan pagar yang tidak boleh ditembus estetika.
- `visual.ground` di `config.js` — latar arena kini satu sumber, dan alat
  audit membacanya dari sana alih-alih menguji latar yang sudah tidak dipakai.
- `BentengRenderer._chalkLine()` / `_chalkRect()` — garis kapur dengan
  simpangan dan ketebalan tidak rata, deterministik dari koordinat sehingga
  tidak bergetar tiap frame.

### Changed
- **Palet**: seluruh warna Tailwind disapu. Tim `#7fb2e5` nila / `#f08a6a`
  bata; aura kapur → natrium → bara → abu; latar `#3a2b20` tanah dalam bayangan.
- **Huruf**: Syne+Nunito → **Plus Jakarta Sans** (rancangan Tokotype, huruf
  identitas kota Jakarta, SIL OFL — asal-usul Indonesia yang nyata, bukan
  klaim rasa) + **Bitter** untuk angka dan judul.
- **Langit**: gelap merata → gradien magrib, gelap di puncak dan terang di ufuk.
- **Lapangan**: gradien toska–magenta + grid neon → tanah dengan bercak rumput
  kering dan garis kapur.

### Terukur (bukan dikira)
- `tools/benteng-visual-audit.mjs`: latar hangat sempat **menggagalkan 3 ambang**
  (tim merah 2,96 · aura rendah 2,15 · aura habis 1,35 terhadap minimum 3:1).
  Tanah digelapkan dan aura bawah diterangkan sampai **semua lulus** —
  ambangnya tidak diturunkan.
- Kontras teks **41/41 lulus** WCAG 2.2 AA sesudah penggantian palet.
- Font terkecil tetap 10 px; area tangkap tetap 44 px (diverifikasi dengan
  `elementFromPoint`, bukan `getBoundingClientRect` yang tidak melihat `::after`).
- `node --test tests/benteng.test.mjs` 14/14 lulus.

### Belum
Dunia 3D Oola (`World.js`, `proceduralMeshFactory.js`) belum disentuh, aset
Blender belum dibuat, dan pembedaan rupa antar-Spot belum dirumuskan.

---

## [v0.7.0] · 2026-09-09
> **Benteng Fase 0 — peran bot nyata, dan alat ukurnya**

### Added
- `src/games/benteng/BotDirector.js` — otak bot terpisah dari aturan main.
  Peran (`penjaga` / `penyerang`) ditentukan tiap tick dari roster hidup,
  bukan dari ID unit. Serbu hanya dilakukan kalau muatan sanggup membayar
  perjalanan **plus** 3 detik channel di benteng lawan. Bot terpojok memotong
  di depan pengejar alih-alih lari pulang.
- `tools/benteng-sim.mjs` — harness balance headless: 100 match tanpa browser,
  6 arketipe pemain (termasuk `--policy bot` sebagai kontrol setara), gate
  Fase 0 yang bisa diukur mesin, `--set` / `--sweep` untuk menguji dial tanpa
  menyentuh `config.js`, dan `--csv`.
- `config.match.startJitter` — sebaran posisi awal berseed. Default **0**
  (perilaku lama); harness menaikkannya supaya sederet match jadi sampel nyata,
  bukan satu lintasan yang diulang.
- 5 test baru untuk BotDirector: jumlah penjaga, rotasi peran, unit bebas
  terakhir berhenti jaga, kelayakan serbu, dan simetri elak antar tim.

### Changed
- `BentengGame` mendelegasikan keputusan bot ke `BotDirector`; `_chooseBotTarget`
  menyusut dari ~85 baris jadi 9.
- Peran ditetapkan saat `reset()` supaya frame pembuka sudah punya penjaga.
- Profil temperamen bot kini identik untuk kedua tim (`BOT_PROFILE_ORDER`);
  sebelumnya diturunkan dari indeks unit sehingga komposisi kedua tim berbeda.

### Fixed
- Penjaga tidak lagi dikunci ke `unit.id === 'B1' || unit.id === 'M0'` —
  tambalan yang gagal begitu jumlah pemain berubah, dan tetap meninggalkan
  benteng kosong.
- Efek domino "satu tim habis dalam 10 detik": selesai-karena-tim-habis turun
  dari **60% → 2%**, durasi median naik **77 s → 180 s**.
- Keputusan pulang-saat-kritis naik **2,0% → 29,0%** — inti Sistem Muatan
  praktis tidak pernah terpicu sebelumnya.

### Belum lulus
- Near-miss **2,20/match** dari target 3. Melebarkan `nearMiss.distance` ke 0,5
  akan lulus (3,60) tapi itu melonggarkan definisi, bukan memperbaiki permainan —
  keputusan rasa, menunggu Fahmi. Lihat `docs/BENTENG_BALANCE_LOG.md`.

---

## [v0.6.6] · 2026-04-13
> **Spot visual registry + Monas POC** — satu jalur `Game._spotRuntime`

### Added
- `src/world/spotVisualRegistry.js` — map `bogor` / `monas` → kelas runtime.
- `src/world/spots/MonasSpotRuntime.js` — plaza + obelisk stilized + volume foto / kiosk.
- `assets/spots/monas/manifest.json` — manifest GLB kosong (konsisten Bogor).

### Changed
- `SpotRuntime.js` — typedef **`ISpotRuntime`** dilengkapi (`root`, `interactionVolumes`, dll.).
- `Game.js` — `_bogorSpot` → **`_spotRuntime`**; `_syncSpotVisuals` memakai registry + manifest `assets/spots/<id>/manifest.json`.

---

## [v0.6.5] · 2026-04-13
> **Avatar warna persist + export peta unduhan**

### Added
- `src/data/avatarPreferences.js` — `localStorage` indeks warna avatar (`galantara_avatar_color_idx`).

### Changed
- `Avatar.js` — terapkan warna tersimpan saat `build()`; `setColor` menulis ke `localStorage`.
- `Panels.js` — swatch profil selaras `colorIdx`; tamu tanpa login tetap bisa buka profil & ganti warna; `_syncProfileColorSwatches`.
- `World.js` — muat `mapData.procedural_props` (generator) saat rebuild island.
- `MapBuilder.js` — tiap penempatan menambah entri ke `mapData.procedural_props` (dengan `paletteId`).
- `Game.js` — `exportMap` mengunduh `galantara_map_<timestamp>.json` (Blob), bukan hanya `console.log`.

---

## [v0.6.4] · 2026-04-13
> **README publik** — value prop disepakati (builder + open + realistis soal art)

### Added
- `README.md` (root) — tagline, ID + EN, bullet diferensiator, tautan ke `docs/PUBLIC_VALUE_PROP.md` & dokumen arah.

---

## [v0.6.3] · 2026-04-13
> **Interaksi Spot + manifest aset** — fondasi builder (volume + GLB path)

### Added
- `src/interaction/InteractionVolume.js` — zona **sphere/box** di XZ; `onUse` + hint untuk **[F]**.
- `src/world/AssetLibrary.js` — fetch **manifest** JSON, load `glbs[]` via **GLTFLoader**, `detachBatch` saat unload Spot.
- `assets/spots/bogor/manifest.json` — schema v1 (`glbs` kosong; siap isi URL GLB).

### Changed
- `BogorSpotRuntime` — volume **warung** + **bangku**; `mount(scene, { toast })`.
- `Game.js` — `_updateSpotInteractions`, prioritas **[F]** ke volume Spot lalu zona Oola; `AssetLibrary.applyManifest` saat Bogor; `Zones.suspendForSpotWorld()` saat masuk Bogor (hindari hint portal Oola di koordinat sama).
- `Zones.js` — `suspendForSpotWorld()`.
- `src/main.js` — muat **GLTFLoader** r128 dari CDN setelah `THREE` siap.

### Documentation
- `TODO.md` — centang InteractionVolume + AssetLibrary/manifest backlog arsitektur.

---

## [v0.6.2] · 2026-04-13
> **Modular Spot visual (POC)** — `worldRoot` + dispose; scene ringkas **Bogor** saat warp / `?spot=bogor`

### Added
- `src/world/SpotRuntime.js` — kontrak modul Spot (base tipis).
- `src/world/spots/BogorSpotRuntime.js` — plaza hijau + warung + bangku + pohon (low poly).
- `config.spotIdFromSocketRoom()` — parse id dari room Socket.

### Changed
- `World.js` — konten island di `worldRoot`; `disposeContent()` / `rebuildContent()`; sky tetap di scene.
- `Game.js` — `_syncSpotVisuals` + `getPlacementRaycastTargets`; warp & logout & load awal selaras visual ↔ room.
- `MapBuilder.js` — raycast ke target dari `Game` saat Bogor aktif.
- `NPC.js` — `setHubVisible()` sembunyikan NPC Oola di Spot Bogor.

### Documentation
- `docs/RESOURCES_RESEARCH.md` — kurasi link (Three.js dispose, glTF, Socket.io rooms, Supabase) + prioritas lanjut & tema riset; dirujuk dari `AGENT_SHARED_KNOWLEDGE.md` & `GALANTARA_BUILDER_SYSTEM.md`.
- `docs/GALANTARA_BUILDER_SYSTEM.md` **v1.2** — § *Utara produk*: arah **game engine + game builder**; tabel lapisan (render kernel / engine / builder / platform); final goal diperjelas.
- `docs/RESOURCES_RESEARCH.md` — intro & §2 diselaraskan dengan utara engine/builder.
- `docs/RESOURCES_RESEARCH.md` — § **2A Jadwal belajar** (kurikulum praktik menuju engine + builder).
- `docs/GALANTARA_BUILDER_SYSTEM.md` **v1.3** — § **Visi creator**: peta builder (Main & Terbit, Tanah & Jalur, Dunia & Spot, Prop & Avatar, Gerak & Emote, Cahaya); 13 pilar tambahan (logic, UI, commerce, audio, wizard, template, a11y, kolab, moderasi, versi, l10n, analitik); lapisan AI; metrik no-code.
- `docs/RESOURCES_RESEARCH.md` — intro utara diselaraskan ke v1.3 no-code.
- `docs/LEARNINGS_LOG.md` — log **2026-04-13**: sintesis pembelajaran hari ini; Blender sebagai backbone **produksi** vs Three **runtime**; Babylon, PlayCanvas, Needle, Godot, Mixamo, USD; rujukan ke sumber yang sudah dibaca.
- `docs/LEARNINGS_LOG.md` § **E** + `RESOURCES_RESEARCH.md` § **Visual logic** — Unity/Unreal (node) vs **Construct** (event sheet); preferensi founder; `GALANTARA_BUILDER_SYSTEM` v1.3: logic builder = **Construct-style** dulu, node opsional.

---

## [v0.6.1] · 2026-04-13
> **Sprint 5 (partial)** — multiplayer **room per Spot**, deep link `?spot=`, warp dari peta

### Added
- `index.html` — overlay `#warp-overlay`, label `#hud-spot` di HUD.
- `src/ui/HUD.js` — `setSpotLabel()` untuk nama room / Spot.
- `src/entities/Avatar.js` — `teleport(x, z, facing)` untuk reset posisi setelah warp.
- `G_UI.warpToSpot` / `G_UI.warpToOolaHub` — transisi singkat, matikan voice, reconnect Socket dengan room baru.

### Changed
- `src/core/Game.js` — room dari `parseInitialSocketRoomFromUrl()`; toast join pakai `spotLabelFromSocketRoom`; guest & login pakai `this._socketRoom`.
- `src/ui/Panels.js` — kartu **Oola Hub** di atas daftar Spot; warp live memanggil `G_UI.warpToSpot`.
- `galantara-server/index.js` — (lanjutan Sprint 5) pindah room: leave room lama + broadcast count.

### Notes
- Dunia 3D masih map Oola; isolasi multiplayer per Spot sudah jalan. Reload map per Spot mengikuti teardown `World` (backlog).

---

## [v0.6.0] · 2026-04-13
> **Oola Builder & Indonesian Assets** — God Mode map builder + Indonesian procedural props

### Added
- `src/tools/MapBuilder.js` — Sistem penempatan objek real-time dengan grid snapping (God Mode).
- `src/world/World.js` — Refactor ke sistem data-driven; memuat map dari `src/data/maps/default_oola.json`.
- `src/tools/proceduralMeshFactory.js` — Archetype baru: **Gerobak Bakso, Gazebo Bambu, Pagar Kayu, Pohon Kelapa**.
- `index.html` — Tombol **Pasang di Dunia** di generator panel dan **Export Map JSON** di Dev Hub.
- `docs/AGENT_SHARED_KNOWLEDGE.md` — Inisialisasi dokumentasi pengetahuan bersama antar AI Agen.

### Changed
- `src/core/Game.js` — Integrasi `MapBuilder`, expose `G_UI.placeInWorld` dan `G_UI.exportMap`.
- `src/data/styleTokens.js` — Registrasi pendaftaran archetype baru.

---

## [v0.5.10] · 2026-04-13
> **3D Generator MVP** — procedural stylized + preview WebGL + export JSON + prompt stub AI

### Added
- `src/data/styleTokens.js` — palet slot (`jakarta_warm`, `kampung_green`, `coastal_calm`), factory material matte PBR
- `src/tools/proceduralMeshFactory.js` — archetype: pohon bulat, warung blok, bangku, tiang lampu (seed + skala)
- `src/tools/Generator3DPanel.js` — panel preview terpisah, indikator tri/style vs budget 5k, salin prompt, unduh JSON preset
- `index.html` — panel `#generator3d-panel`, CSS `.pbox-wide` / `.gen3d-*`
- Developer Hub: tombol **3D Generator (MVP)** menggantikan toast “coming soon”

### Changed
- `src/ui/Panels.js` — `openPanel`: hentikan preview generator saat panel lain dibuka
- `src/core/Game.js` — `Generator3DPanel`, `G_UI.openGenerator3D`, `stopGeneratorPreview`, `closeGenerator3dPanel`, `exportGeneratorPreset`, `copyGeneratorAiPrompt`

---

## [v0.5.9] · 2026-04-13
> Dokumentasi — selaras dengan sesi Claude (Sprint 4 polish, ERD, migrations)

### Changed
- `SPRINT_LOG.md` — status deploy chat/voice; blok polish (sidebar, collapse height, WASD `stopPropagation`, fog); Sprint 5–7 realign ke commerce path + Bogor POC; Known Issues & stack DB
- `docs/ARCHITECTURE_ERD.md` — §10 jadi **keputusan MVP terkunci** + referensi `supabase/migrations/` (bukan daftar pertanyaan terbuka)
- `docs/SESSION_LOG.md` — catatan sinkron Claude → Cursor

---

## [v0.5.8] · 2026-04-13
> Landing **about.html** — narasi movement, struktur storytelling, tone visioner

### Changed
- `about.html` — hero & alur: problem → visi → beda → siapa → status → build in public → kontribusi → dewan → investor → changelog → FOMO → kotak saran + gate penutup; tipografi Syne + grid halus; Three.js diselaraskan warna cyan/violet; CTA ke `index.html`, mailto early/kontributor/support, placeholder Discord/GitHub

---

## [v0.5.7] · 2026-04-13
> Landing **Tentang** (tema Oola + Three.js) + **Konsol maintainer** + API admin server

### Added
- `about.html` — ulang: suasana malam / pulau terapung, hero **Three.js** (pulau + orb + partikel, parallax pointer), dewan kontributor dari `data/contributors.json`, link ke konsol
- `admin.html` — panel maintainer: token `ADMIN_API_TOKEN`, ringkasan room online & (opsional) hitung user Supabase Auth
- `data/contributors.json` — daftar maintainer/kontributor untuk landing + konsol
- `galantara-server` — `GET /api/admin/summary` (Bearer token), CORS untuk `/api/*`, opsional `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

### Changed
- `apps/web/README-DEPLOY.md` — deploy sertakan `about.html`, `admin.html`, folder `data/`

---

## [v0.5.6] · 2026-04-13
> Halaman **Tentang** (landing statis) + wiring menu & zona

### Added
- `about.html` — landing: penjelasan proyek, changelog ringkas, kontribusi, sponsor/donasi, kotak saran (mailto), CTA kembali ke game

### Changed
- `src/data/config.js` — item menu **Tentang Galantara** membuka `about.html` (bukan toast)
- `src/core/Game.js` — zona **Papan Informasi** (`info`) dan **Kotak Saran** (`saran`): [F] mengarah ke `about.html` / `#kotak-saran`; toast hint saat memasuki zona

---

## [v0.5.5] · 2026-04-13
> Dokumentasi — `AGENT_SHARED_KNOWLEDGE`: §6 snippet API + §7 template prompt agent

### Changed
- `docs/AGENT_SHARED_KNOWLEDGE.md` — tambah kontrak Socket join/move, guard tamu server, hook Supabase, placeholder ledger; template prompt singkat / tugas / ekonomi

---

## [v0.5.4] · 2026-04-13
> Dokumentasi — pengetahuan bersama untuk agent lain / reuse proyek

### Added
- `docs/AGENT_SHARED_KNOWLEDGE.md` — perubahan kunci, skill continual-learning, temuan, referensi dokumen, artefak (index, npm), modul `src/` + server; tanpa rahasia

### Changed
- `docs/AGENT_HANDOFF_CURSOR.md`, `CLAUDE_NOTES.md` — pointer ke file di atas

---

## [v0.5.3] · 2026-04-13
> Dokumentasi saja — status **Mighan Coin & wallet belum selesai** (bukan bug baru)

### Changed
- `CLAUDE_NOTES.md`, `TODO.md`, `docs/SESSION_LOG.md`, `docs/AGENT_HANDOFF_CURSOR.md` — catatan eksplisit: ledger/wallet/top-up belum terhubung ke game; `bank-tiranyx-temp/` di repo ini minimal

---

## [v0.5.2] · 2026-04-13
> Dependency hygiene — satu entry point npm di root, lockfile server

### Added
- `package.json` (repo root, nama paket `galantara-repo` agar tidak bentrok npm di Windows) — `engines.node >=18`, scripts `install:server`, `server`, `server:dev` memakai `cd galantara-server && …`
- `.gitignore` — `node_modules/`, `.env*`, log umum

### Changed
- `galantara-server/package.json` — `private`, `engines`, pin `express@4.21.2` + `socket.io@4.7.4` (selaras CDN client di `index.html`)
- `galantara-server/package-lock.json` — hasil `npm install` (reproducible install)

---

## [v0.5.1] · 2026-04-13
> Guest multiplayer — PRD “jalan-jalan dulu” tanpa login wall untuk presence

### Added
- `src/data/guestIdentity.js` — `guest:` id stabil + nama `Tamu ####` di `localStorage`
- `G_Auth.init` opsi `onInitialNoUser` — panggil setelah `getSession` jika tidak ada session Supabase

### Changed
- `src/core/Game.js` — auth init dipindah setelah `_initMultiplayer` + `chat.onSend`; tamu auto-`mp.connect`; login/logout swap koneksi; chat input disabled untuk tamu
- `src/multiplayer/Socket.js` — disconnect socket lama sebelum connect baru; `join` kirim `guest`; `setSpawnSnapshot` + emit posisi awal
- `galantara-server/index.js` — simpan `guest` per socket; tamu tidak bisa `chat`; WebRTC tidak di-relay jika pengirim atau penerima tamu
- `index.html` — teks login-gate menjelaskan boleh lihat warga dulu

---

## [v0.6.0-pre] · 2026-04-12
> Architecture & Database Design Sprint — Foundation sebelum Sprint 5 (Spot Instance System)

### Added
- `docs/ARCHITECTURE_ERD.md` — Full database architecture document: 2-engine (Supabase + bank-tiranyx), ERD ASCII, 13 SQL blocks, 38 tabel, revenue flow diagram, migration order, RLS policies, 8 open questions
- `docs/SESSION_LOG.md` — Technical documentation: cara kerja sistem, flow diagram, skills table, architecture tree
- `supabase/migrations/` — 15 migration files Supabase PostgreSQL siap deploy:
  - `001` cosmetics & product categories (dengan seed data default)
  - `002` users & auth (trigger auto-create profile, updated_at triggers)
  - `003` spots & world (seed Bogor Alun-Alun sebagai MVP spot)
  - `004` land system (min sewa 3 hari, GIST exclude overlap, phone verify check)
  - `005` booth & products (max 20/100 produk via function, unique primary image)
  - `006` orders (state machine, COD code 6-digit, escrow 3 hari, auto-timeline, rating trigger)
  - `007` travel system (`check_spot_access()` function, privacy-first location hash)
  - `008` advertisements (review wajib, `active_advertisements` view)
  - `009` sawer (BERLIAN MVP, leaderboard view)
  - `010` gamification (quests, achievements, dungeons rank-based reward)
  - `011` developer ecosystem (70/30 revenue share)
  - `012` moderation (auto-suspend 3 laporan, ban escalation)
  - `013` notifications & analytics (platform_revenue_summary view, notify triggers)
  - `014` indexes (35+ performance indexes dengan COMMENT)
  - `015` RLS policies (semua tabel, prinsip minimal access)
- `supabase/README.md` — Panduan setup, environment variables, aturan emas

### Decisions Made
| # | Keputusan | Nilai |
|---|-----------|-------|
| Platform fee | 5% per transaksi | `CEIL(subtotal × 0.05)` |
| Travel fee | 1 PERAK default | Konfigurasi per spot |
| Min sewa | 3 hari | DB constraint |
| KYC sewa | Phone verify wajib | DB function |
| Max produk | 20 / 100 merchant | App-layer function |
| Sawer MVP | BERLIAN saja | PERAK diaktifkan Sprint 7+ |
| Dungeon | Rank-based reward | Semua dapat participation 10 BERLIAN |
| Escrow | 3 hari auto-release | Trigger + cron job |

---

## [v0.5.0] · 2026-04-12
> Sprint 4: Multiplayer real-time, text chat sidebar, proximity voice, WASD fix, fog polish

### Added
- `src/ui/Chat.js` — Full chat panel dengan message history, badge notif, max 60 pesan, HTML sanitization
- `src/multiplayer/VoiceChat.js` — WebRTC P2P proximity voice, radius 8 unit, volume falloff linear, AudioContext gainNode per-peer
- `galantara-server/index.js` — WebRTC relay events: `rtc_offer`, `rtc_answer`, `rtc_ice`
- `galantara-server/index.js` — `sync` event untuk session recovery tanpa re-join
- Voice button 🎤 di chat bar dengan pulse animation saat aktif
- `#chat-panel` — Full panel (bukan sekadar bar), muncul dari bawah layar
- Badge notif pada chat toggle button saat ada pesan baru dan panel tertutup

### Changed
- `src/core/Game.js` — Import + init `Chat` dan `VoiceChat`, exposed `toggleChat` dan `toggleVoice` ke `window.G_UI`
- `index.html` — Ganti `#chat-bar` dengan `#chat-panel`, tambah voice button, refactor bottom bar

### Fixed
- Ghost avatar bug: tambah grace period 8s + `connectionStateRecovery` + `socket.recovered` check

### Changed (polishing session)
- Chat panel: dari bottom-center popup → **left sidebar bottom-anchored**
- Collapse behavior: slide kiri → **height transition dari atas ke bawah**
- WASD fix: `document.activeElement` check → **`e.stopPropagation()`** (lebih reliable)
- Fog density: 0.012 → **0.006** (world lebih jelas)
- Chat tab icon: `❮❯` → `▼▲ OOLA CHAT`

### QA
- Verified via `preview_eval`: WASD blocked ✅, collapsed height 148px ✅, height transition ✅
- Deployed ke galantara.io ✅

---

## [v0.4.0] · 2026-04-12
> Sprint 3: Modular architecture refactor + Auth nyata

### Added
- `src/auth/auth.js` — G_Auth module singleton (Supabase Google OAuth)
- `src/core/Renderer.js` — Three.js WebGL setup
- `src/core/Camera.js` — Orbital camera + lerp + clamp
- `src/core/Game.js` — Orchestrator: game loop, state machine, semua module terikat
- `src/world/World.js` — Oola island scene
- `src/world/DayNight.js` — Cycle siang/malam + stars
- `src/world/Zones.js` — Proximity zone detection
- `src/entities/Avatar.js` — Player avatar chibi
- `src/entities/NPC.js` — NPC manager + patrol
- `src/ui/Toast.js` — Notifikasi popup
- `src/ui/HUD.js` — Heads-up display + hamburger menu
- `src/ui/LoginModal.js` — Modal login Supabase
- `src/ui/Panels.js` — Profile, settings, dan panel-panel lain
- `src/multiplayer/Socket.js` — Socket.io client wrapper (reconnect Infinity)
- `src/multiplayer/RemotePlayers.js` — Render avatar player lain + LERP 0.15
- `src/main.js` — Bootstrap entry point
- `galantara-server/index.js` — Socket.io server port 3005, PM2, nginx proxy `/mp/`
- Grace period 8s pada disconnect player
- Deduplication by `user.id` saat reconnect
- `connectionStateRecovery` maxDisconnectionDuration 2 menit

### Changed
- Arsitektur: dari monolith single HTML (`wrapcity-nexus-v3.html`) → modular ES6 modules
- Server port: 3001 → **3005** (3001 dipakai tiranyx Next.js)
- Multiplayer server menggunakan Socket.io v4.7.4 (bukan Fastify)

### Removed
- `wrapcity-nexus-v3.html` — monolith digantikan oleh `index.html` + `src/`

---

## [v0.3.0] · 2026-04-09
> Sprint 2: World enrichment + Deploy ke production

### Added
- Day/night cycle mengikuti timezone user (`new Date().getHours()`)
- Stars di langit malam
- 6 NPC dengan dialog tree multi-step (Guide, Budi, Maya, Sari, Dev, Dewi)
- Warp Portal ke 6 kota Indonesia: Bogor, Monas, Kuta, Malioboro, Braga, Losari
- Ambient sound toggle (looping)
- Dungeon countdown timer (FOMO mechanic)
- Google Analytics GA4 — `G-WNDQL8J455`
- SEO meta tags + OpenGraph tags
- **galantara.io LIVE** — SSL Let's Encrypt, aaPanel, Nginx

### Changed
- Fog, skybox, lighting — sesuai waktu nyata
- Warp Portal menampilkan info merchant count, vibe, dan status kota

---

## [v0.2.0] · 2026-04-09
> Sprint 1: Avatar identity + komunikasi dasar

### Added
- Profile Panel — klik user icon → nama + avatar color picker 8 preset
- Avatar label dinamis dari `G.displayName`
- Chat bar post-login — bubble percakapan di atas avatar (local, belum broadcast)
- Dev Hub → AI 3D Studio button

---

## [v0.1.0] · 2026-04-09
> Sprint 0: Prototype foundation

### Added
- Isometric 3D world dengan Three.js r128
- Avatar chibi low-poly (torso, head, eyes, cheeks, legs, arms)
- Movement relatif kamera (sin/cos dari theta) + grid snap 1×1
- Proximity zones (trigger event saat avatar dekat objek)
- Login gate bottom bar (non-blocking)
- Camera clamp PHI `Math.PI * 0.18` → `Math.PI * 0.42`
- Camera lerp 0.18 (gerak) / 0.10 (diam)

### Rebranding
- WRAP City → **Galantara**
- The Nexus → **Oola**
- WRC/WRP → **Mighan Coin**

---

## Versi Roadmap (Target)

| Versi | Sprint | Target |
|-------|--------|--------|
| v0.5.0 | Sprint 4 | ✅ Chat + Voice — perlu deploy |
| v0.6.0 | Sprint 5 | Spot Monas + Mapbox |
| v0.7.0 | Sprint 6 | Avatar visual polish + emote |
| v0.8.0 | Sprint 7 | Mighan Coin + Commerce |
| v0.9.0 | Sprint 8 | Object "Jiwa" + SDK |
| v1.0.0 | Sprint 9-10 | Developer Ecosystem + Live → **Public Launch** |
