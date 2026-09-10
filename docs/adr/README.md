# Architecture Decision Records

Catatan keputusan teknis Galantara. Satu berkas per keputusan, tidak pernah
dihapus — kalau sebuah keputusan dibatalkan, ADR baru ditulis yang menggantikan
yang lama, dan yang lama diberi status **Digantikan oleh ADR-XXXX**.

## Kenapa ada

Kode menunjukkan **apa**, komentar menunjukkan **bagaimana**, tetapi keduanya
buruk dalam menyimpan **kenapa** — terutama kenapa alternatif yang tampak lebih
jelas justru ditolak. Tanpa itu, orang berikutnya (atau saya, tiga bulan lagi)
akan "memperbaiki" sesuatu kembali ke bentuk yang sudah pernah gagal.

Setiap ADR di sini punya bagian **Yang dibayar** dan **Alternatif yang ditolak**.
Kalau sebuah ADR tidak bisa menyebut apa yang dikorbankan, kemungkinan besar itu
bukan keputusan, cuma preferensi.

## Daftar

| # | Keputusan | Inti |
| --- | --- | --- |
| [0001](0001-three-global-lewat-script-tag-tanpa-build-step.md) | THREE global, tanpa build step | `import 'three'` mematikan modul **tanpa error** |
| [0002](0002-larangan-scene-traverse-kumpulkan-referensi-saat-objek-dib.md) | Larangan `scene.traverse` | Masalahnya kepemilikan, bukan performa |
| [0003](0003-keterisian-kursi-diturunkan-dari-posisi-bukan-state-server.md) | Kursi diturunkan dari posisi | Determinisme jadi **syarat kebenaran**, bukan bonus |
| [0004](0004-overlay-html-disembunyikan-berdasarkan-ukuran-di-layar-buk.md) | Overlay dinilai ukuran layar | Overlay HTML tidak mengecil dengan jarak |
| [0005](0005-satu-pesan-satu-kanal-toast-hanya-cadangan.md) | Satu pesan, satu kanal | Satu pesan sempat tampil tiga kali |
| [0006](0006-daily-challenge-tanpa-koin-sampai-ekonominya-nyata.md) | Daily challenge tanpa koin | Hadiah palsu mengajari bahwa mata uangnya tak berarti |
| [0007](0007-pemicu-deploy-ci-dimatikan-sampai-ada-server.md) | Pemicu deploy dimatikan | CI yang selalu merah melatih orang mengabaikannya |
| [0008](0008-lampu-boleh-menyatakan-kuat-relatif.md) | Lampu punya kuat relatif | Hangat = satu pusat terang + tepi gelap |
| [0009](0009-atap-sengkuap-menolak-arahan-pelana-dangkal.md) | Sengkuap, bukan pelana | **Menolak arahan seni sendiri**, dengan alasan |
| [0010](0010-vendor-semua-pustaka-klien-supabase-tetap-pengecualian-yan.md) | Vendor semua pustaka klien | Klaim self-hosted harus benar |
| [0011](0011-jarak-warna-delta-e-menggantikan-kontras-luminansi-untuk-k.md) | ΔE, bukan kontras luminansi | Alat ukur yang salah memberi vonis yang salah |
| [0012](0012-stub-uji-harus-memodelkan-perilaku-nyata-bukan-nilai-yang-.md) | Stub uji memodelkan perilaku | Stub longgar = uji hijau yang tak menguji apa pun |
| [0013](0013-pendapat-kedua-lewat-api-openai-langsung-bukan-codex-cli.md) | Pendapat kedua lewat API | Codex CLI buntu; batasan komersial disebut jujur |
| [0014](0014-versi-semantik-dan-satu-sumber-kebenaran-versi.md) | Versi semantik | Dua angka versi yang menyimpang diam-diam |

## Format

```
# ADR-NNNN — Judul

**Status:** Diterima | Digantikan oleh ADR-XXXX | Ditolak
**Tanggal:**

## Konteks       — keadaan yang memaksa keputusan. Fakta, bukan pembenaran.
## Keputusan     — apa yang dipilih.
## Konsekuensi   — Yang didapat / Yang dibayar. Bagian kedua wajib diisi.
## Alternatif    — yang ditolak, dan kenapa.
## Bukti         — berkas, commit, angka hasil pengukuran.
```

**Aturan:** kalau bagian *Yang dibayar* kosong, ADR-nya belum selesai dipikirkan.
