# Galantara

**Pasar malam digital Indonesia di browser.** Jalan-jalan, ngobrol, nongkrong —
tanpa install, tanpa akun kalau cuma mau lihat-lihat.

Dunia 3D sosial yang settingnya Indonesia, bukan dunia generik yang diberi skin
Indonesia. **Oola** sebagai kota kedatangan, plus **enam Spot** berdasarkan
tempat nyata — Bogor, Monas, Malioboro, Losari, Kuta, Braga. Rumah adat dengan
proporsi terukur, siklus hari yang mengikuti waktu Nusantara, dan satu permainan
tangkap-tawan bernama **Benteng**.

**Status: pra-alpha.** Jujurnya: dunianya bisa dijalani dan enak dilihat, tapi
sebagian besar interaksinya belum ada. Lihat [Apa yang sudah dan belum](#apa-yang-sudah-dan-belum)
— tidak ada yang dilebihkan di sana.

- **Lisensi:** MIT
- **Versi:** 0.8.1 · [CHANGELOG](CHANGELOG.md)
- **Backlog jujur:** [docs/BACKLOG.md](docs/BACKLOG.md)
- **Keputusan teknis:** [docs/adr/](docs/adr/)
- **Catatan metode:** [PAPER.md](PAPER.md)
- **Lanjutkan pengembangan:** [HANDOFF.md](HANDOFF.md)

---

## Jalankan

Tidak ada langkah build. Tidak ada bundler. Klon, sajikan, buka.

```bash
npx serve -p 4000 .
```

Buka `http://localhost:4000`. Selesai — dunia jalan penuh sebagai tamu.

**Dengan multiplayer:**

```bash
npm run install:server
npm run dev
```

Buka `http://127.0.0.1:4000`. Mode ini menyajikan halaman, vendor lokal dan
Socket.io dari proses yang sama, hanya pada loopback. Jika proses dev sudah
berjalan sebelum pembaruan server, hentikan dari terminalnya lalu jalankan
`npm run dev` lagi. `GALANTARA_LOCAL_PORT` boleh diisi port lain; `0` memilih
port kosong dari OS dan port aktual ditampilkan saat server siap.

**Uji:**

```bash
npm test
```

62 uji di Node tanpa browser, **lalu pemeriksa tautan dokumen**. Termasuk tes
HTTP server sungguhan untuk aset vendor dan batas akses berkas. Pasang
dependency server melalui `npm run install:server` agar tes HTTP tidak skip.
Tes paket deploy hanya memeriksa kontrak workflow, bukan menjalankan deploy.
Pemeriksa tautan ikut karena di repo ini dokumentasi adalah hasil kerja, dan tautan rusak
tidak menghasilkan error apa pun — ia cuma membuat pembaca buntu, dan pembaca
yang buntu tidak melapor, ia pergi.

`npm run test:unit` kalau cuma mau ujinya.

### Offline

Semua pustaka klien ada di [`vendor/`](vendor/README.md): Three.js r128,
Socket.io 4.8.3, Supabase JS, dan font Nunito (subset latin). **Klien tidak
membuat satu pun permintaan pihak ketiga.** Diverifikasi, bukan diasumsikan —
lihat [ADR-0010](docs/adr/0010-vendor-semua-pustaka-klien-supabase-tetap-pengecualian-yan.md).

Dua pengecualian yang disebut terang-terangan:

| Apa | Kapan | Cara mematikan |
| --- | --- | --- |
| Google Analytics | Hanya di produksi, bukan localhost | `window.G_ANALITIK = false` di `index.html` |
| Layanan Supabase | Hanya untuk login, chat, preferensi avatar | Tidak perlu dimatikan — tanpanya dunia tetap jalan penuh sebagai tamu |

---

## Apa yang sudah dan belum

Bagian ini sengaja tidak dipoles. Dunia yang mengaku punya fitur yang belum ada
akan membuat orang datang sekali dan tidak kembali.

### Sudah jalan

| | |
| --- | --- |
| **Dunia & gerak** | Pulau melayang Oola, kamera isometrik terkunci, avatar chibi, 76 prop |
| **Siklus hari** | Delapan fase Nusantara (subuh sampai malam), lampu menyala saat magrib |
| **Enam Spot** | Bogor, Monas, Malioboro, Losari, Kuta, Braga — semuanya 3D, bukan kotak abu-abu |
| **Rumah adat** | Joglo, sulah nyanda, rumah panggung — dibangun dari proporsi terukur, bukan tebakan |
| **Multiplayer** | Lihat pemain lain, gerak tersinkron, chat, voice proximity |
| **Bubble chat** | Pesan muncul di atas kepala, hilang sendiri |
| **Meja Nongkrong** | Duduk bareng dengan `[F]`, keterisian kursi kelihatan |
| **Benteng** | Permainan tangkap-tawan lengkap dengan bot, harness balans, audit visual |
| **Tantangan harian** | Runtutan harian, tanpa hadiah palsu |

### Belum ada

| | |
| --- | --- |
| **Ekonomi** | Mighan Coin belum end-to-end. HUD menampilkan `0/500` yang belum berarti apa-apa |
| **Toko** | Empat katalog Spot masih toast "menyusul" |
| **Moderasi** | Report, block, mute — **belum ada sama sekali.** Ini kewajiban, bukan fitur |
| **Server-authoritative** | Benteng seluruhnya klien. Belum bisa dipercaya untuk kompetisi apa pun |
| **Builder** | Membuat Spot sendiri masih toast |
| **Deploy** | Belum ada server. Untuk sekarang jalan di lokal |

**Sepuluh titik interaksi di dalam Spot masih toast "menyusul".** Itu masalah
yang berbeda dari fitur yang belum ada: pemain sudah berjalan ke sana dan
menekan `[F]`. Menutupnya lebih berharga daripada menambah Spot ketujuh —
alasan lengkapnya di [BACKLOG](docs/BACKLOG.md).

---

## Bentuknya

51 modul, ~10.800 baris JavaScript, tanpa framework.

```
index.html          Titik masuk. Memuat vendor, lalu src/main.js sebagai modul.
benteng.html        Halaman terpisah untuk permainan Benteng (kanvas 2D).
src/
  core/Game.js      Perekat: loop, wiring, keadaan sesi.
  world/            Dunia, siklus hari, Spot, social node (MejaNongkrong).
  entities/         Avatar, NPC.
  multiplayer/      Socket, pemain remote, voice.
  ui/               Chat, bubble, HUD, panel, toast.
  games/benteng/    Aturan, bot, renderer, logger playtest.
  data/             Konfigurasi, peta, tantangan harian.
tools/              Perkakas milik sendiri (lihat di bawah).
vendor/             Pustaka pihak ketiga, disalin sengaja.
tests/              Uji Node murni, tanpa browser.
docs/adr/           Kenapa tiap keputusan diambil.
```

**Aturan yang mengikat** (pelanggarannya senyap, jadi disebut di sini):

1. `THREE` itu **global**. Jangan pernah `import 'three'` — modulnya akan mati
   tanpa satu pun pesan error. [ADR-0001](docs/adr/0001-three-global-lewat-script-tag-tanpa-build-step.md)
2. Jangan `scene.traverse()`. Catat referensi saat objek dibuat.
   [ADR-0002](docs/adr/0002-larangan-scene-traverse-kumpulkan-referensi-saat-objek-dib.md)
3. Kamera terkunci: theta 0–360°, phi 18–76°. Bukan selera — PRD BAB 2.4.

### Perkakas milik sendiri

Dibangun untuk proyek ini, disimpan di repo, bukan skrip sekali pakai:

| | |
| --- | --- |
| `tools/benteng-sim.mjs` | Harness balans headless, 7 arketipe pemain, sweep parameter |
| `tools/benteng-visual-audit.mjs` | Kontras WCAG + jarak warna ΔE di bawah tiga simulasi buta warna |
| `tools/rupa3d/*.py` | Pembangun rumah adat lewat Blender headless, dari konstanta bernama |
| `tools/tanya-gpt.mjs` | Pendapat kedua, bisa mengirim render sungguhan |
| `tools/penerima-render.mjs` | Mengeluarkan tangkapan render dari halaman ke berkas |
| `tools/periksa-tautan.mjs` | Memastikan tautan relatif dokumen menunjuk berkas yang ada |

---

## Cara kerja yang dipakai di sini

Tiga aturan yang lahir dari kesalahan nyata, bukan dari teori. Rinciannya di
[PAPER.md](PAPER.md).

**1. Periksa instrumennya sebelum percaya ukurannya.** Empat kali di proyek ini
angka hasil ukur diterima atau ditolak berdasarkan harapan, bukan berdasarkan
sehat-tidaknya alat ukurnya. Sekali menghasilkan klaim "bias 87%" yang murni
karangan harness.

**2. Jangan pernah menyembunyikan sesuatu atas dasar data yang belum diketahui.**
Nilai layout bisa terbaca `0` sebelum halaman selesai. Kode yang menyembunyikan
UI karena pembaginya nol menghasilkan fitur yang **diam-diam kosong** — dan itu
tidak akan pernah dilaporkan sebagai bug.

**3. Kalau angka mengejutkan, curigai alat ukurnya dulu. Kalau angka pas dengan
dugaan, curigai lebih keras lagi.**

---

## Technical summary (English)

Browser-based 3D social world set in Indonesia. Vanilla ES modules, no build
step, Three.js r128 as a global. Socket.io for multiplayer; Supabase for auth
only — the world runs fully as a guest without it.

**Run:** `npx serve -p 4000 .` · **Test:** `npm test` (62 Node tests; install server dependencies for the HTTP test)

Two patterns here may be of general interest, both documented with their
failure modes in [PAPER.md](PAPER.md):

- **Deriving shared social state from already-synchronised data.** Table seat
  occupancy is computed independently on every client from broadcast positions
  rather than tracked as server state. This removes a class of desync entirely,
  but converts determinism from a nice property into a correctness obligation —
  including a geometric invariant that must hold whenever furniture is moved.
- **Sizing HTML overlays by projected on-screen size, not world distance.**
  HTML overlays do not shrink with distance, so a fixed distance cut-off is
  wrong under any change of FOV or viewport. Deriving the threshold from the
  perspective projection makes it self-adjusting.

Neither is novel. Both are written up because the *failure modes* are subtle and
were found the hard way.

---

## Kontribusi

Pull request diterima. Tiga hal yang membantu:

- Baca [ADR](docs/adr/) yang relevan sebelum mengubah keputusan besar. Kalau
  tidak setuju, tulis ADR baru — jangan diam-diam mengembalikannya.
- Uji yang **menghitung** nilai yang diharapkan, bukan menghafalnya.
  [ADR-0012](docs/adr/0012-stub-uji-harus-memodelkan-perilaku-nyata-bukan-nilai-yang-.md)
- Kalau hasilnya biasa saja, tulis "hasilnya biasa saja". Dokumen di repo ini
  tidak melebih-lebihkan, dan itu properti yang perlu dijaga.

## Lisensi

[MIT](LICENSE) © 2026 Fahmi Ghani.

Pustaka pihak ketiga di `vendor/` memakai lisensinya masing-masing (MIT untuk
Three.js dan Socket.io, SIL OFL 1.1 untuk Nunito) — lihat
[`vendor/README.md`](vendor/README.md).
