# Temuan sesi 2026-09-09 → 10

Ditulis supaya sesi berikutnya tidak mengulang jalan buntu yang sama.
Setiap poin punya bukti; yang belum terbukti ditandai jelas.

---

## 1. Kanon rupa yang sempat salah saya asumsikan

**Oola bukan kampung Nusantara.** PRD BAB 2.1 menyebut Oola *"pulau melayang
bergaya surga — penuh warna pastel, pohon-pohon fantasi"*, palet **putih /
emas / lavender**, suasana *surgawi, tenang, fantasi*. Oola cuma hub kedatangan.

**Ke-Nusantara-annya ada di Spot**, dan paletnya sudah dikunci di BAB 4.2
(Monas hijau-putih-emas · Kuta oranye-biru-krem · Malioboro batik amber-ungu ·
Braga abu-biru-teal-coral · Losari merah-oranye-navy).

Kalau ini tidak dibaca, mudah sekali "menambah rasa Indonesia" ke Oola dan
justru melanggar PRD.

## 2. Aturan teknis yang mengikat, dan satu yang sempat saya langgar

PRD BAB 2.4 (di bawah sistem kamera):

- **`scene.traverse` DILARANG.** Saya melanggarnya saat mendaftarkan lampu ke
  siklus hari. Diperbaiki di `72ae085`: `World` mengumpulkan lampu saat prop
  dibangun, selagi grupnya masih di tangan, lalu diserahkan ke `DayNight`.
- **Kamera terkunci**: theta 0–360°, phi **18–76°**, lerp posisi 0.18,
  rotasi 0.10.
- **`THREE` global**, bukan `import 'three'` — klien memuat `three.min.js`
  lewat tag script. Bare import mematikan modul tanpa error.

## 3. Oola itu scaffold, bukan "kelihatan AI"

Diukur, bukan dikira:

- `src/data/maps/default_oola.json` → **nol** `procedural_props`. Yang terlihat
  di layar cuma avatar, NPC, dan penanda zona.
- `proceduralMeshFactory.js` → 8 archetype, semuanya kotak dan silinder.
- Avatar masih kapsul (silinder + bola).

Konsekuensinya: **polish pencahayaan di atas greybox kosong tidak akan pernah
menyerupai referensi** — tidak ada apa pun untuk disinari. Isi dulu, baru cahaya.

## 4. sRGB + ACES: dicoba, memperburuk, dikembalikan

Saya menyalakan `outputEncoding = THREE.sRGBEncoding` +
`ACESFilmicToneMapping` di `Renderer.js`. Secara prinsip benar untuk r128.
Hasilnya **tersapu putih, lebih buruk dari sebelumnya**, karena seluruh
material dan level cahaya di scene disetel tanpa encoding. Mengimbangi dengan
exposure 0.78 / ambient 0.12 / sun 2.0 pun tetap pucat. Dikembalikan.

> Aturan: menyalakan colour pipeline adalah perubahan **satu paket** dengan
> pass ulang seluruh material dan intensitas cahaya. Bukan tiga baris.

Catatan API: di r128 namanya `outputEncoding`/`sRGBEncoding`. `outputColorSpace`
dari versi lebih baru **diam-diam tidak berefek** — tidak error, cuma tidak jalan.

## 5. Siklus hari Nusantara (dikerjakan, `5c50c47`)

Jamnya tetap mengikuti waktu asli — itu memang disengaja. Yang diubah isinya:
delapan fase (subuh, fajar, pagi, siang, sore, magrib, isya, malam).

Dua sifat khatulistiwa yang dibakukan:

1. **Magribnya pendek.** Matahari terbit/terbenam nyaris tetap sepanjang tahun
   (~05:45 / ~17:45) dan peralihannya cepat. Magrib karena itu dapat jendela
   tersempit (17:15–18:24) dan perubahan warna paling tajam.
2. **Malamnya tidak kosong.** Yang bikin syahdu bukan gelapnya tapi kolam
   cahaya di dalamnya. `DayNight` menggerakkan `lampGlow`; bohlam menaikkan
   emissive dan lampu titik tanpa bayangan menyala di bawah tiang. Langit
   malam biru tinta, bukan hitam.

`?jam=18.5` untuk mengintip fase mana pun tanpa menunggu.

## 6. Benteng — palet senja (`ae9984a`)

Keluhan "terlalu AI banget" punya sidik jari: paletnya **warna default
Tailwind mentah** (`#0ea5e9` sky-500, `#a855f7` purple-500, `#f59e0b`
amber-500, `#fb7185` rose-400) di atas navy, plus Syne+Nunito. Itu juga
melanggar kontrak gaya proyek sendiri yang meminta *"hangat dominan, bukan
abu-abu cinematic"*.

Diganti: palet senja bernama benda (tanah, kapur, bata, natrium, nila),
**Plus Jakarta Sans** (rancangan Tokotype, huruf identitas kota Jakarta, OFL)
+ Bitter, langit magrib gelap-di-puncak-terang-di-ufuk, grid neon → garis kapur.

Tanah hangat sempat **menggagalkan 3 ambang kontras**; tanah digelapkan dan
aura bawah diterangkan sampai lulus — ambangnya tidak diturunkan. Alasan tiap
warna: `docs/RISET_VISUAL_SENJA_90AN.md`.

## 7. Aset Mighan yang bisa dipakai ulang

- **`C:\Mighan-3D\server\blender-engine.js`** — Blender 4.2 headless
  procedural, param-driven, ekspor **GLB + preview PNG**, **tanpa GPU**.
  Kinds: building, house, tower, tree, crystal, prop. Ini jalur paling masuk
  akal untuk rumah adat, daripada menumpuk mesh procedural di klien.
- `C:\Mighan-3D\Mighan-3D-Studio` — builder Three.js v0.7.21 (logic cards,
  node-graph, FX, world/tile builder).
- `world-lite/` — viewer ringan, sudah punya RoomEnvironment IBL + ACES.
- Photo-to-3D / Text-to-3D, NPC/Avatar generator (relevan: avatar masih kapsul).

⚠️ Sebagian besar dulunya live di `ops.mighan.com` = **VPS-1 yang mati** sejak
2026-07-26. Kodenya lokal dan utuh; yang hilang servernya.

## 8. Codex — cara memakainya tanpa jalan buntu

Empat jebakan yang sudah memakan waktu, semuanya sudah terbukti:

| Masalah | Sebab | Jalan keluar |
|---|---|---|
| Config ditolak | `service_tier = "priority"` tidak dikenal | ganti `fast` (cadangan `.bak` dibuat) |
| Semua model ditolak | CLI bawaan aplikasi ChatGPT 0.130 terlalu tua | `npm i -g @openai/codex` → 0.153.4 |
| Semua MCP gagal | `approval: never` menolak tiap panggilan MCP | tulis di prompt: **jangan pakai MCP**, baca berkas langsung |
| Proses mati diam-diam | `nohup ... &` ikut mati saat tool call berakhir | pakai latar harness, bukan nohup |

Dua kesalahan pengamatan saya sendiri: `pgrep -f "codex exec"` tidak menemukan
apa-apa karena prosesnya bernama **`codex.exe`** (pakai
`ps -W | grep codex-win32-x64`), dan `codex exec ... | tail` menahan seluruh
output sampai proses selesai sehingga progres tidak terlihat.

MCP `codex-bridge` masih menunjuk binary **lama** — sampai diarahkan ulang,
panggil `codex` langsung lewat shell.

## 9. Gate Benteng — satu yang lulus tanpa pernah diuji

`tawanan menganggur <= 25 s` selalu terbaca **0,0 s** di harness, dan itu
bukan karena bagus: semua policy skrip menekan tarik-rantai tiap 20 tick dan
bot menariknya otomatis, jadi metriknya **tidak pernah bisa selain nol**.
Ditambah policy `pasrah` yang tidak pernah menarik — masih 0,0 s, karena
pemain skrip tidak pernah tertawan dalam 12 match (diukur).

> Status jujur gate ini: **BELUM TERVALIDASI**, bukan lulus. Di browser, sesi
> yang pemainnya benar-benar tertawan mencatat **115,87 s**.

---

## 10. Bubble chat di atas kepala — dan tiga temuan yang menyertainya

PRD BAB 5.1.1 meminta *"Pesan muncul sebagai bubble di atas kepala karakter.
Bubble menghilang setelah beberapa detik."* Dibangun di `src/ui/ChatBubble.js`,
satu lapisan untuk avatar lokal **dan** avatar pemain lain.

### 10.1 Rintisan mati yang hampir jadi mekanisme kedua

`src/entities/Avatar.js` sudah punya `showChat()` dan `updateBubble()`,
lengkap dengan komentar *"Dipanggil tiap frame dari Game.js"*. Ketiganya
bohong:

| Klaim di kode | Kenyataan (diukur) |
| --- | --- |
| `updateBubble` dipanggil tiap frame | `grep -rn "updateBubble" src/` → **0 pemanggil** |
| `showChat` dipakai chat | **0 pemanggil** |
| Elemen berkelas `.av-bubble` | **tidak ada** di `index.html` |

Jadi ia bukan "sudah ada, tinggal disambung" melainkan setengah rintisan yang
kalau dibiarkan menghasilkan **dua jalur proyeksi 3D→2D** untuk satu hal yang
sama. Dibuang.

> Pelajaran: komentar yang mengaku *"dipanggil dari X"* adalah klaim yang bisa
> diuji dengan satu `grep`. Uji sebelum membangun di atasnya.

### 10.2 Server sudah mengirim `socketId`; klien yang tidak membacanya

`galantara-server/index.js:243` sudah lama mengirim `{ socketId, name, msg }`,
tetapi `src/core/Game.js` hanya mengurai `{ name, msg }` dan memisahkan echo
pesan sendiri dengan **pencocokan nama**. Dua pemain bernama sama akan saling
menelan pesan. Sekarang pemetaan bubble dan penyaringan echo sama-sama pakai
`socketId`.

> Sebelum menambah field ke protokol, periksa apakah servernya memang belum
> mengirim — di sini datanya sudah ada selama ini.

### 10.3 Overlay HTML tidak mengecil dengan jarak

Bubble adalah `<div>`, bukan objek 3D. Pemain 400 unit jauhnya tetap mendapat
bubble seukuran penuh di atas titik sebesar piksel.

Menetapkan "jarak maksimum 50 unit" salah, karena tidak ikut berubah saat FOV
atau tinggi viewport berubah. Patokan yang benar diturunkan dari proyeksi
perspektifnya sendiri:

```
px_per_unit      = (tinggi_viewport / (2 * tan(fov/2))) / jarak
tinggi_tokoh_px  = 1.85 * px_per_unit          // 1.85 = tinggi tokoh (unit)
sembunyikan bila  tinggi_tokoh_px < 24         // ambang keterbacaan (lihat catatan)
```

> **Koreksi (pendapat kedua GPT-5.6, 10 Sep).** Angka 24 px semula saya sebut
> sebagai "ambang target minimum WCAG 2.5.8". Itu salah kutip: SC 2.5.8 mengatur
> **target interaktif**, sedangkan avatar di sini bukan target klik. Ambangnya
> tetap dipakai sebagai keputusan **keterbacaan**, dengan angka WCAG sebagai
> pembanding besaran — bukan klaim kepatuhan.

Terukur di browser (1280x720, fov 45) — ambangnya jatuh sendiri di ~67 unit:

| Jarak | Tinggi tokoh | Bubble | Toast |
| ---: | ---: | :---: | :---: |
| 13,4 u | 119,9 px | tampil | – |
| 36,0 u | 44,7 px | – (di luar layar, `sy` = -159) | tampil |
| 64,9 u | 24,8 px | – (di luar layar, `sy` = -339) | tampil |
| 84,6 u | 19,0 px | – (terlalu kecil) | tampil |
| 408,9 u | 3,9 px | – (terlalu kecil) | tampil |

### 10.4 Penjaga: nilai layout bisa 0

Aturan di atas memakai tinggi viewport sebagai pembagi. Saat diuji, **semua**
pembacaan ukuran mengembalikan 0 (`window.innerHeight`,
`document.documentElement.clientHeight`, `clientHeight` `#lbl-layer`, kanvas)
karena layout belum jadi. Akibatnya `px_per_unit = 0` dan **setiap** bubble
disembunyikan — chat mati total tanpa satu pun error.

> Aturan: nilai ukur yang bisa 0 tidak boleh dijadikan alasan **menyembunyikan**.
> Lewati ujinya dan tampilkan. Fitur yang diam-diam kosong tidak akan pernah
> dilaporkan sebagai bug — hanya dianggap "chatnya nggak jalan".

Dikunci oleh tes `viewport 0 tidak boleh membuat semua bubble hilang diam-diam`.

### 10.5 Satu pesan, tiga tampilan

Setelah bubble ada, pesan masuk tampil di bubble **dan** panel chat **dan**
toast. Toast kini hanya muncul bila bubble pengirimnya tidak terlihat.
Urutannya penting: `ucap()` dipanggil dulu (ia sekaligus memproyeksikan dan
menetapkan keterlihatan), baru toast diputuskan.

### 10.6 Instrumen tes yang mati (bukan fiturnya)

Tes pertama saya melaporkan bubble "tidak hilang setelah 3,8 detik". Hampir
saya catat sebagai bug. Diukur: **0 frame dalam 1 detik**, dan waktu simulasi
game hanya bertambah 0,31 detik selama 88 detik halaman terbuka —
`requestAnimationFrame` **beku** selama JS saya berjalan di Browser pane,
meski `document.visibilityState` = `"visible"`.

Dua cara yang benar, keduanya dipakai:
1. Panggil `layer.update(camera)` langsung — jalur produksi yang sama,
   deterministik, tidak bergantung frame.
2. Pisahkan pengamatan ke panggilan tool berbeda; di antaranya frame asli jalan.

> Sebelum menyimpulkan "fitur tidak jalan" di Browser pane: hitung frame dalam
> 1 detik. Kalau 0, instrumennya yang mati.

### 10.7 Hasil

`tests/chatBubble.test.mjs` — 10 uji, semuanya lulus. Total suite **31/31**.
Diperiksa di browser: bubble menempel di pemain yang benar di atas name-tag
masing-masing (jarak bersih 17–19 px), pesan 100 huruf membungkus dalam batas
lebar, pesan beruntun mengganti bukan menumpuk, elemennya benar-benar lepas
dari DOM setelah kedaluwarsa.

Warna `#FDF6E8` dengan tinta `#2A1F14` — kontras **14,9:1**, jauh di atas
ambang WCAG AA 4,5:1, dan tetap terbaca di langit siang maupun latar malam.

## 11. Codex buntu (10 Sep 2026)

Diminta pendapat kedua lewat `codex-bridge`; gagal. Bukan masalah versi CLI
seperti dugaan awal:

- `codex --version` → **0.153.4**; `npm view @openai/codex version` → **0.153.4**.
  `npm i -g` dan `codex update` sama-sama tidak menaikkan versi.
- Model di konfigurasi adalah `gpt-5.6-sol` → *"requires a newer version of
  Codex"*.
- Semua alternatif yang dicoba (`gpt-5-codex`, `gpt-5.1-codex-max`, `gpt-5.6`,
  `gpt-5.2`, `gpt-5`) → *"not supported when using Codex with a ChatGPT
  account"*.

Jadi CLI-nya terlalu tua untuk satu-satunya model yang boleh dipakai akun ini,
dan CLI yang lebih baru **belum ada di npm**. Dugaan jalur perbaikan: lewat
aplikasi desktop Codex (`codex app`) — **belum diverifikasi**.

MiganCore sebagai gantinya juga tidak bisa: Ollama di `127.0.0.1:11434` tidak
menjawab. Korpus OMIGA sendiri terbaca normal.
