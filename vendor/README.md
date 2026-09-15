# vendor/

Pustaka pihak ketiga yang **disalin ke repo dengan sengaja**, bukan diambil
dari CDN saat halaman dibuka.

Alasannya ada tiga, dan ketiganya nyata:

1. **Klaim "self-hosted" harus benar.** Sebelum ini `index.html` memuat lima
   berkas dari lima domain berbeda. Dokumen yang mengaku self-hosted sementara
   kodenya memanggil CDN adalah dokumen yang bohong.
2. **Dev offline jadi mungkin.** Jalur lama menunjuk `/three.min.js` yang tidak
   pernah ada di repo ini, jadi ia **selalu** jatuh ke CDN.
3. **Privasi.** Google Fonts menerima alamat IP tiap pengunjung. Untuk dunia
   sosial, itu kebocoran yang tidak perlu.

| Berkas | Versi | Lisensi | Kenapa versi ini |
| --- | --- | --- | --- |
| `three.r128.min.js` | r128 (0.128.0) | MIT — `three.LICENSE.txt` | Dikunci r128 karena seluruh kode memakai `THREE` global dan API r128. Menaikkannya adalah pekerjaan tersendiri, bukan efek samping. |
| `socket.io.4.8.3.min.js` | 4.8.3 | MIT — `socket.io.LICENSE.txt` | **Sama persis dengan server.** Sebelumnya klien memuat 4.7.4 dari CDN sementara server 4.8.3 — satu kelas ketidakcocokan yang gejalanya membingungkan. |
| `supabase-js.2.min.js` | 2.x UMD | MIT | Pustakanya lokal. **Layanannya tetap komersial** — lihat `docs/adr/0010`. |
| `nunito.css` + `fonts/` | Nunito v32 | SIL OFL 1.1 — `fonts/OFL.txt` | Hanya subset **latin + latin-ext**. Bahasa Indonesia tidak memakai cyrillic maupun vietnamese; memuatnya hanya menambah berkas tanpa satu pun huruf yang dipakai. |
| `GLTFLoader.js` | r128 | MIT (bagian three.js) | Pasangan `three.r128`; dimuat lewat script tag sebagai `THREE.GLTFLoader`. |
| `rapier3d-compat.0.20.0.js` | @dimforge/rapier3d-compat 0.20.0 | Apache-2.0 — `rapier3d-compat.LICENSE.txt` | **Sama persis dengan Rupa3D**, yang mengukur proksi tabrakannya dengan versi ini. Varian `-compat` menanam WASM sebagai base64, jadi satu berkas tanpa `fetch` terpisah. SHA-256 `09a000be…f945eee0`, identik dengan `dist/rapier.mjs` di `node_modules` Rupa3D. Ekstensi `.js` walau aslinya `dist/rapier.mjs`: modul ES wajib dilayani dengan MIME JavaScript, dan tidak semua server memetakan `.mjs`. **Tidak dimuat bersama halaman** — lihat `docs/adr/0015`. |

Total 1,3 MB yang dimuat bersama halaman, ditambah Rapier 2,86 MB (1,08 MB
gzip) yang dimuat SETELAH dunia tampil. Itu harga yang dibayar sekali dan
diketahui, bukan permintaan lintas domain di tiap kunjungan.

**Memperbarui:** ganti berkasnya, perbarui nomor versi di tabel ini dan di
`index.html`, lalu jalankan `npm test` dan buka dunia sekali. Nama berkas
sengaja memuat versinya supaya pembaruan tidak pernah diam-diam.
