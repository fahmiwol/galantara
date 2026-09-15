#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# brief-suasana.sh — brief suasana tiap Spot dari GPT, paralel, lalu satu
# sintesis lintas Spot.
#
# KENAPA ADA: rasa "betah" tidak lahir dari menambah prop acak. Tiap Spot
# butuh cerita tempat yang spesifik dulu, baru diterjemahkan ke elemen 3D
# dengan angka (ukuran, hex, segitiga, padat/tembus). Brief-nya diminta ke
# model lain supaya selera tidak cuma dari satu kepala — dan disimpan di repo
# supaya bisa dikritik, bukan hilang di jendela obrolan.
#
# KUNCI tidak pernah ditulis ke berkas ini; dibaca dari berkas lokal saat jalan
# dan hanya hidup di env proses ini.
#
# PEMAKAIAN
#   bash tools/brief-suasana.sh            # 7 Spot paralel + sintesis
#   MODEL=gpt-5.6-terra bash tools/brief-suasana.sh
#   HANYA_SINTESIS=1 bash tools/brief-suasana.sh   # brief sudah ada, ulang sintesisnya
# ═══════════════════════════════════════════════════════
set -u
cd "$(dirname "$0")/.."

export OPENAI_API_KEY="$(tr -d ' \r\n' < "C:/omiga/.openAI_tokens.txt")"
MODEL="${MODEL:-gpt-5.6-sol}"
MODEL_SINTESIS="${MODEL_SINTESIS:-gpt-6-astra}"
KELUAR=docs/brief/suasana
mkdir -p "$KELUAR/log"

TEMPLATE="$(sed -n '/^TUGAS:/,$p' "$KELUAR/PROMPT.md")"
BERSAMA=(--berkas docs/GALANTARA_STYLE_CONTRACT_v0.md --berkas docs/RISET_VISUAL_SENJA_90AN.md)

brief() { # id nama vibe tema catatan berkas-spot...
  local id="$1" nama="$2" vibe="$3" tema="$4" catatan="$5"; shift 5
  local tanya="$TEMPLATE"
  tanya="${tanya//\{NAMA\}/$nama}"
  tanya="${tanya//\{VIBE\}/$vibe}"
  tanya="${tanya//\{TEMA\}/$tema}"
  tanya="${tanya//\{CATATAN\}/$catatan}"
  local lampiran=()
  for f in "$@"; do lampiran+=(--berkas "$f"); done
  node tools/tanya-gpt.mjs --peran seni --model "$MODEL" --nalar medium --maks 16000 \
    "${BERSAMA[@]}" "${lampiran[@]}" --tanya "$tanya" --simpan "$KELUAR/$id.md" \
    > "$KELUAR/log/$id.log" 2>&1 \
    && echo "selesai: $id" || echo "GAGAL: $id (lihat $KELUAR/log/$id.log)"
}

if [ "${HANYA_SINTESIS:-0}" != "1" ]; then
brief oola "Oola Hub" "Hub kedatangan: taman pulau melayang tempat semua pemain muncul, pintu ke Spot-Spot kota" \
  "putih gading, emas, lavender (PRD BAB 4.2); tanah hijau pastel #a8d5a2" \
  "Oola BUKAN tempat nyata di Indonesia: ia taman surgawi yang ramah, tempat pertama yang dilihat pemain baru. Rasa Indonesianya datang dari kebiasaan berkumpul, bukan dari landmark." \
  src/world/World.js src/data/maps/default_oola.json &
brief bogor "Alun-alun Bogor" "Kuliner lokal, tanaman hias, suasana hijau" "#10B981 primer, #06B6D4 sekunder" \
  "Bogor = kota hujan: sore basah, kabut tipis, pohon kenari tua, tukang tanaman hias." \
  src/world/spots/BogorSpotRuntime.js &
brief braga "Braga Bandung" "Kafe vintage, fashion, kuliner kreatif, seni" "#5B7A8C primer, #2E8B84 sekunder, #E8836B aksen" \
  "Braga = trotoar art deco kolonial, kafe dan toko lama, udara Bandung yang sejuk." \
  src/world/spots/BragaSpotRuntime.js &
brief malioboro "Malioboro Yogyakarta" "Batik, kerajinan perak, kuliner Jawa, budaya" "#B45309 primer, #6B4C8A sekunder" \
  "Malioboro = jalan panjang, lesehan malam, andong, pengamen, lampu jalan antik." \
  src/world/spots/MalioboroSpotRuntime.js &
brief kuta "Pantai Kuta Bali" "Pantai, surf culture, kerajinan lokal, sunset" "#E2703A primer, #3D8FB8 sekunder, #EFE2C8 aksen" \
  "Kuta = pasir, ombak, penjual kelapa muda, papan selancar disandarkan, sesajen canang di undakan." \
  src/world/spots/KutaSpotRuntime.js &
brief losari "Pantai Losari Makassar" "Seafood, sunset Makassar, kuliner khas Sulawesi" "#C2410C primer, #1E3A5F sekunder" \
  "Losari = anjungan tepi laut, pisang epe, perahu pinisi di kejauhan, matahari tenggelam di laut." \
  src/world/spots/LosariSpotRuntime.js &
brief monas "Monas Jakarta" "Landmark bersejarah, pasar oleh-oleh, street food" "#2F6B3A primer, #F4F1E8 sekunder, #D4A537 aksen" \
  "Monas = lapangan luas, pedagang kerak telor, rusa di taman, keluarga piknik Minggu pagi." \
  src/world/spots/MonasSpotRuntime.js &
wait
fi

# ── Sintesis lintas Spot ─────────────────────────────────────────────
ADA=()
for id in oola bogor braga malioboro kuta losari monas; do
  [ -s "$KELUAR/$id.md" ] && ADA+=(--berkas "$KELUAR/$id.md")
done
if [ "${#ADA[@]}" -gt 0 ]; then
  SINTESIS='Kamu menerima brief suasana untuk beberapa Spot Galantara, masing-masing ditulis terpisah. Tugasmu MENYATUKAN dan MENGKRITIK, bukan merangkum.

1. KIT BETAH BERSAMA: elemen yang muncul di beberapa brief dan sebaiknya dibangun SEKALI sebagai prop prosedural bersama (nama archetype snake_case, parameter, ukuran, segitiga, PADAT/TEMBUS). Maksimal 8.
2. BENTROK: di mana brief saling bertentangan atau melanggar batas teknis (20.000 segitiga/Spot, 3 PointLight tanpa bayangan, tanpa post-processing). Sebut Spot dan barisnya.
3. KLISE YANG LOLOS: usulan yang terlalu brosur wisata atau generik, walau brief-nya sendiri melarang klise.
4. URUTAN BANGUN: 10 langkah pertama lintas Spot, diurut dari rasa-betah-per-segitiga tertinggi. Tiap langkah: Spot, apa, perkiraan segitiga, kenapa lebih dulu.
5. SATU KALIMAT per Spot: identitas rasa yang harus dijaga, supaya tujuh Spot tidak terasa seperti satu kota yang diganti warnanya.

Jujur. Kalau sebuah brief lemah, katakan brief mana dan kenapa.'
  node tools/tanya-gpt.mjs --peran seni --model "$MODEL_SINTESIS" --nalar high --maks 24000 \
    "${ADA[@]}" --berkas "$KELUAR/PROMPT.md" --tanya "$SINTESIS" --simpan "$KELUAR/SINTESIS.md" \
    > "$KELUAR/log/sintesis.log" 2>&1 \
    && echo "selesai: sintesis ($MODEL_SINTESIS)" \
    || { echo "sintesis $MODEL_SINTESIS gagal — mencoba $MODEL"; \
         node tools/tanya-gpt.mjs --peran seni --model "$MODEL" --nalar high --maks 24000 \
           "${ADA[@]}" --berkas "$KELUAR/PROMPT.md" --tanya "$SINTESIS" --simpan "$KELUAR/SINTESIS.md" \
           >> "$KELUAR/log/sintesis.log" 2>&1 && echo "selesai: sintesis ($MODEL)" || echo "GAGAL: sintesis"; }
fi
grep -h "pemakaian" -A1 "$KELUAR"/log/*.log | grep model
