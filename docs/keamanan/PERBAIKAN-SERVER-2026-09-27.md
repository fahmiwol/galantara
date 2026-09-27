# Perbaikan server multiplayer — 27 September 2026 (RISIKO #9)

Keputusan dan alasannya: [ADR-0023](../adr/0023-server-multiplayer-berotoritas-atas-identitas-tamu-dan-gerak.md).
Cabang: `claude/amankan-server`. **Belum dideploy** — itu keputusan Fahmi.

## Masalahnya

Server Socket.IO (`galantara-server/index.js`) mempercayai apa pun yang dikirim
klien. Dari konsol browser, siapa pun bisa:

| Serangan | Dulu | Sekarang |
|---|---|---|
| `join` dengan `id` pemain lain | korban hilang dari roster semua orang | `id` diabaikan; id publik dibuat server |
| `join` dengan `guest:false` tanpa login | chat dan voice terbuka | tamu = tanpa token Supabase yang lolos verifikasi |
| Melihat socket.id pemain lain | disiarkan ke semua orang | yang disiarkan hanya id publik acak |
| `move` ke `{x:1e308}` / teleport / string | diteruskan apa adanya | angka hingga saja, batas dunia per Spot, 8,1 m/dtk |
| Banjir `move`/`chat` | diteruskan semua | ember token per jenis; > 100 pelanggaran / 10 dtk = diputus |
| Pesan 1 MB, teks pembalik arah, Zalgo | diteruskan | batas 64 KB per pesan; teks dibersihkan, chat ≤ 100 huruf |
| `sync` dengan nama room lain | daftar pemain room itu bocor | room dari payload diabaikan |
| Sinyal voice ke siapa saja | diteruskan | hanya antar warga di room yang sama, bidang SDP/ICE yang dikenal |
| Nama/pesan di panel chat | `innerHTML` + escape manual | `textContent` |

## Yang berubah

- **Server:** `galantara-server/index.js` (perekat), `penjaga.cjs` (batas gerak,
  laju, teks, payload), `identitas.cjs` (verifikasi token HS256 / JWKS).
- **Klien:** `src/multiplayer/Socket.js` mengirim token di `auth` jabat tangan dan
  memakai id dari `welcome`; `Game.js` tunduk pada status tamu dari server dan
  menampilkan `rejected`; `VoiceChat.js` membandingkan id publik kedua sisi;
  `Chat.js` memakai `textContent`; `auth.js` menambah `getAccessToken()`.
- **Deploy:** `tools/deploy-mp-galantara.sh` — `ISI` kini ikut mengirim
  `penjaga.cjs` dan `identitas.cjs`. Tanpa itu server di VPS crash saat mulai
  (`Cannot find module './penjaga.cjs'`). Dijaga `tests/deployAssets.test.mjs`,
  yang menelusuri semua `require('./…')` dari `index.js`.
- `package.json`: `--test-timeout=60000` supaya uji server yang macet gagal, bukan
  menggantung selamanya.

## Kompatibilitas protokol

| Kombinasi | Hasil |
|---|---|
| Klien baru + server lama | **Jalan.** Tanpa `welcome`, id jatuh ke `socket.id` dan status tamu dari klaim sendiri — perilaku lama. |
| Klien lama (tab belum dimuat ulang) + server baru | Bisa melihat dan bergerak. **Warga dianggap tamu** (tidak mengirim token); chat-nya ditolak diam-diam karena klien lama tidak mendengarkan `rejected`. Voice antar klien lama bisa tidak tersambung. Hilang setelah muat ulang (situs `Cache-Control: no-cache`). |
| Klien baru + server baru **tanpa kunci verifikasi** | Semua tamu: jalan-jalan saja, chat & voice mati, dengan pesan jelas. |
| Klien baru + server baru + kunci terpasang | Penuh. |

## Cara diuji

`npm ci --prefix galantara-server` lalu `npm test`.

| | Uji | Lulus | Gagal |
|---|---|---|---|
| Sebelum (commit `99c72c0`) | 198 | 197 | 1 |
| Sesudah | 243 | 243 | 0 |

Yang gagal sebelumnya **tidak terkait perubahan ini**: `tests/dailyChallenge.test.mjs`
"kunci unik mencegah hal yang sama dihitung dua kali" adalah bom waktu tanggal
(hari yang tantangannya ber-target 1, mis. 27 Sep = `main_benteng`). Diperbaiki di
cabang ini dengan mematok jam uji ke 14 Sep 2026 — sama seperti perbaikan di
galantara_world `17123db`.

45 uji baru: `tests/penjaga.test.mjs` (aturan murni, jalan tanpa dependensi
server), `tests/serverMultiplayer.test.mjs` (server **sungguhan** di port acak,
klien Socket.IO yang sama dengan browser), `tests/serverParitas.test.mjs` (angka
server = angka klien: Spot live, batas dunia, kecepatan, laju, panjang teks),
`tests/klienMultiplayer.test.mjs` (`Socket.js`, voice, panel chat), dan satu di
`tests/deployAssets.test.mjs`.

**Mutasi** — `node tools/mutasi-multiplayer.mjs`: setiap penjaga dicabut di salinan
repo, uji multiplayer harus merah. Kontrol tanpa mutasi hijau lebih dulu.
Hasil: **39/39 mutasi tertangkap** (identitas 7, token 9, gerbang tamu 3, laju 4,
gerak 4, input 7, klien 5). Putaran pertama 36/39: tiga yang lolos (HS256 saat
hanya JWKS, role selain `authenticated`, warna sembarang) kini punya uji; yang
pertama ternyata penjaga dua lapis, jadi mutasinya mencabut keduanya.

## Yang harus dilakukan Fahmi

1. **Pasang kunci verifikasi** di environment PM2 `galantara-mp` — lihat
   [DEPLOY.md §Verifikasi login](../DEPLOY.md#verifikasi-login-chat--voice--adr-0023):
   `SUPABASE_JWKS_URL` (proyek JWT Signing Keys) **atau** `SUPABASE_JWT_SECRET`
   (legacy HS256, rahasia), plus `SUPABASE_URL`. **Tanpa ini chat & voice mati di
   produksi begitu server baru jalan.**
2. **Urutan deploy: klien dulu, lalu server** — bukan sebaliknya. Klien baru jalan
   di server lama; server baru membuat klien lama yang login jadi tamu. Merge ke
   `main` mendeploy klien otomatis (`src/**`); lalu
   `bash tools/deploy-mp-galantara.sh coba`, kemudian `jalankan`.
3. Sesudah deploy: `pm2 logs galantara-mp` harus menulis `🔐 Verifikasi login
   aktif`; login di dua browser, kirim chat, coba voice; buka tab tanpa login dan
   pastikan chat ditolak dengan pesan.
4. Disarankan: CI (`deploy-vps.yml`) belum memasang dependensi server, jadi uji
   server sungguhan **dilewati di CI**. Menambah `npm ci --prefix galantara-server`
   sebelum `npm test` menutupnya (mengubah workflow memicu deploy — keputusan Fahmi).

## Yang belum

- Batas koneksi per IP (sekarang batas laju per koneksi saja).
- Status warga diperiksa saat jabat tangan saja; token kedaluwarsa di tengah
  koneksi tidak memutus koneksi.
- Tamu tidak punya identitas yang bertahan antar kunjungan (disengaja; lihat ADR).
