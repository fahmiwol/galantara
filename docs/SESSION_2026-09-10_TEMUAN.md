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
