# ADR-0020 — Deploy otomatis lewat kunci ber-perintah-paksa ke satu penerima di server

**Status:** Diterima — menggantikan keputusan 2 ADR-0018 ("pemicu CI tetap mati")
**Tanggal:** 2026-09-16
**Konteks proyek:** Galantara — dunia 3D sosial Indonesia di browser

## Konteks

- ADR-0018 mematikan CI karena dua alasan: menaruh kunci server bersama (19
  aplikasi) di GitHub Secrets berisiko besar, dan workflow lama tidak punya
  backup maupun verifikasi. Fahmi, 16 Sep: "Boleh, silahkan aja buatkan."
- **Penyebab CI lama gagal (koreksi ADR-0018):** web root galantara.io **lahir di
  VPS-2 pada 7 Mei 2026** (`stat %w`); mtime April terbawa saat migrasi. Secret CI
  diisi 13 April untuk server sebelumnya, dan sidik jari kunci deploy April tidak
  ada di `authorized_keys` VPS-2. Mengganti port saja tidak akan membuatnya
  berhasil.
- Server multiplayer produksi menjalankan kode yang lebih tua dari commit awal
  repo. Kode itu crash dengan `ReferenceError: _broadcastCount is not defined`
  setiap tenggang putus pemain (8 detik) habis: 118 kali di log galat, dan PM2
  me-restart-nya berulang.

## Keputusan

1. **Satu penerima root di server**, `/usr/local/sbin/terima-deploy-galantara`
   (sumber `tools/deploy/terima-deploy-galantara.sh`), dipakai deploy manual
   maupun CI.
2. **Kunci CI khusus** di `authorized_keys` root dengan
   `command="/usr/local/sbin/terima-deploy-galantara",restrict`. Kunci itu hanya
   bisa mengirim paket ke penerima (`coba`/`jalankan`); tanpa shell, tanpa
   forwarding, tanpa `pulihkan`.
3. **Kunci dibuat dan dipasang oleh Fahmi** dengan `tools/deploy/pasang-kunci-ci.sh`.
   Agen tidak membuat kredensial dan tidak mengisi secret.
4. **Workflow:** push ke `main` pada path yang dikirim → uji → deploy. Kalau kunci
   belum dikonfigurasi, deploy dilewati dengan notice dan job tetap hijau. Host key
   dipatok lewat `vars.SSH_KNOWN_HOSTS`. Hash live dibandingkan dengan blob commit.
5. **Multiplayer dideploy manual** dengan `tools/deploy-mp-galantara.sh`:
   staging + `npm ci --omit=dev` + uji asap handshake, `pm2 stop`, tukar
   direktori atomik, `pm2 start` kalau masih stopped, lalu tunggu handshake publik
   sampai 300 detik. Belum masuk CI.

## Konsekuensi

### Yang didapat

- Push ke `main` menjadi live dengan backup dan verifikasi bita.
- Kunci CI yang bocor tidak memberi shell; ia hanya bisa men-deploy isi yang lolos
  whitelist penerima.
- Manual dan CI tidak bisa mengirim paket yang berbeda: daftar di workflow, skrip
  manual, dan penerima dijaga `tests/deployAssets.test.mjs`, yang terbukti merah
  saat daftar penerima sengaja dikurangi.
- Crash multiplayer tiap pemain putus hilang; pindah Spot tidak lagi menghitung
  pemain ganda.

### Yang dibayar

- **Penerima berjalan sebagai root.** Kesalahan validasi di skrip itu adalah celah
  root. Diredam dengan: tanpa `eval`, whitelist anggota tar, hanya berkas biasa dan
  direktori, batas 64 MiB, dan `flock`. Setiap perubahan skrip ini perlu ditinjau
  seperti kode keamanan.
- **Kunci yang bocor tetap bisa mengganti isi galantara.io** dengan apa pun yang
  lolos whitelist. GitHub Secrets menjadi batas kepercayaan situs ini.
- Deploy multiplayer memutus pemain. 16 Sep: sekitar 7 menit, karena sakelar
  sempat terjebak dan load VPS-2 62 di 4 vCPU membuat proses baru butuh sekitar
  160 detik untuk membuka port.
- Job CI hijau pertama sejak April hijau karena deploy **dilewati**. Deploy CI
  sungguhan belum terbukti sampai kuncinya dipasang.

## Alternatif yang ditolak

**Kunci root penuh di Secrets.** Ditolak: satu kebocoran membuka 19 aplikasi.

**User deploy terbatas + hak tulis web root.** Diusulkan lebih dulu di chat, lalu
ditolak. User itu tetap punya shell; web root milik `sidix` harus diubah
kepemilikan/ACL-nya; backup ke `/root` tidak bisa. Perintah paksa lebih ketat
(tanpa shell sama sekali) dengan perubahan keamanan server yang lebih sedikit.

**rrsync.** Ditolak: tanpa backup, verifikasi, dan log.

**Server menarik dari GitHub (cron `git pull`).** Ditolak: server butuh akses
repo, dan tidak ada gerbang uji sebelum live.

## Bukti

- Penerima terpasang, SHA-256 `16f56c1c…`; `coba` lewat penerima: 102 berkas,
  0 beda.
- CI run `35011915971`: `uji` ✓ 17 detik; `deploy` ✓ dilewati dengan
  "Deploy dilewati: jalankan tools/deploy/pasang-kunci-ci.sh".
- Multiplayer `6650744`: handshake publik `0{"sid":…}`, browser live "1 online",
  0 permintaan gagal. `DEPLOY.log`: baris `gagal-bangun` (batas tunggu skrip 90
  detik) diikuti baris KOREKSI (berhasil).
- Journal sakelar: `19:14:52 SUDAH JALAN (tak di-start ulang)` →
  `19:17:22 GAGAL SIAP` → `19:18:19 BANGUNKAN`; load `62.22 55.04 42.72`.
