# Prompt brief suasana Spot

Dipakai `tools/brief-suasana.sh` untuk meminta GPT menggambarkan tiap Spot
sebagai TEMPAT, lalu menerjemahkannya jadi elemen 3D yang bisa dibangun.
Disimpan di repo supaya hasilnya bisa diulang dan dikritik — prompt yang
hilang membuat jawaban yang tidak bisa diperiksa.

Penanda yang diganti per Spot: `{NAMA}`, `{VIBE}`, `{TEMA}`, `{CATATAN}`.

---

TUGAS: Gambarkan Spot "{NAMA}" di Galantara sebagai TEMPAT yang membuat orang betah — lalu terjemahkan gambaran itu menjadi elemen 3D yang bisa langsung dibangun.

KONTEKS GALANTARA
- Dunia 3D sosial Indonesia di browser, untuk semua usia termasuk anak. Avatar chibi setinggi 1,23 m (badan bola + kepala besar). Kamera orbit semi-isometrik, jarak 16 m, sudut pandang 32°–76° dari atas. 1 unit = 1 meter.
- Gaya "Galantara Soft City": low-poly stylized, siluet tebal, matte (roughness 0,65–0,9), hangat dominan, golden hour sebagai acuan emosi. Nusantara syahdu era 90-an sampai awal 2000-an. Bukan brosur wisata.
- Tujuan pengalaman: RELAKS dan NYAMAN. Orang datang untuk nongkrong, ngobrol, duduk, melihat. Bukan untuk dikejar misi.
- Batas teknis: three.js r128, WebGL di ponsel kelas menengah. Tambahan per Spot ≤ 20.000 segitiga, ≤ 3 PointLight baru tanpa bayangan, tanpa post-processing, tanpa partikel berat. Geometri prosedural (Box/Cylinder/Cone/Sphere/Shape) atau GLB kecil dari Rupa3D. Belum ada sistem audio suasana — kalau mengusulkan suara, tandai "(nanti)".
- Tiap benda padat punya collider: pemain tidak bisa menembusnya. Benda lebih rendah dari 0,35 m bisa dinaiki. Untuk tiap elemen, sebut PADAT atau TEMBUS.
- Tempat duduk yang bisa diduduki (warung + dingklik, lesehan tikar, meja kafe, bangku) sudah dibangun `MejaNongkrong.js`. Jangan diusulkan ulang; boleh usul penempatan atau apa yang ada di sekitarnya.
- Kode Spot yang SUDAH ADA dilampirkan. Baca dulu apa yang sudah dibangun; jangan mengusulkan ulang yang sudah ada, dan jangan mengarang yang tidak ada di kode.
- Palet Spot: {TEMA}. Vibe tertulis: "{VIBE}".
- {CATATAN}

JAWAB DENGAN STRUKTUR INI (Markdown):

## 1. Cerita tempat
Maksimal 120 kata. Satu sore di tempat ini dari mata orang yang datang untuk duduk. Spesifik: siapa ada di sana, apa yang mereka pegang, apa yang terdengar, apa yang tercium. Tanpa kata sifat promosi.

## 2. Suasana
Waktu terbaik, arah dan warna cahaya (hex), gerak lambat yang terasa (daun, kain, air, asap), kepadatan, dan satu hal kecil yang membuat orang merasa "ini tempat nyata".

## 3. Yang kurang di kode sekarang
Maksimal 5 butir. Tiap butir menunjuk bagian kode yang ada dan kenapa itu belum terasa betah.

## 4. Terjemahan 3D
Tabel: Elemen | Peran (hero/pendukung/detail) | Bentuk low-poly | Ukuran (m) | Warna (hex) | ± segitiga | Gerak | PADAT/TEMBUS | Letak relatif terhadap kode yang ada
8–14 baris. Angka, bukan kata sifat.

## 5. Cahaya dan waktu
Siang vs magrib vs malam — konkret: intensitas relatif, warna hex, lampu mana.

## 6. Tiga langkah termurah dengan dampak rasa terbesar
Urut. Tiap langkah: apa, kenapa, perkiraan segitiga.

## 7. Jangan
Maksimal 5 klise yang harus dihindari untuk Spot ini, dan kenapa.
