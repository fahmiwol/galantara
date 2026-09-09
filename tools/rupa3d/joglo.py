"""
Joglo procedural — dibangun dari ANGKA BERNAMA, bukan nilai ajaib.

Dijalankan di dalam Blender headless lewat MCP Rupa3D (`rupa_skrip`).
Alur yang dipakai, bukan sekali tebak:

    bangun -> rupa_ukur (angka) -> rupa_lihat (mata) -> perbaiki KONSTANTA -> ulang

Kalau proporsinya salah, yang diubah konstanta di blok SPEK — bukan menambal
verteks. Itu yang membuat model ini bisa disetel ulang tanpa dibangun ulang.

DASAR BENTUK (lihat docs/RISET_3D_NUSANTARA.md §3 untuk rujukannya):
- pendhapa terbuka, empat *saka guru* lebih tebal daripada tiang tepi;
- alas rendah berundak;
- atap TIGA massa dari bawah ke atas: emper (lebar, landai) -> penanggap
  (mengecil, lebih curam) -> brunjung (paling curam, mahkota);
- kayu gelap-hangat, genting amber/terakota, alas batu krem.

JUJUR SOAL ANGKA: tapak dan tinggi di bawah adalah abstraksi supaya terbaca
di kamera Galantara (phi 18-76 derajat), BUKAN ukuran baku rumah Joglo. Yang
bersumber adalah SUSUNANNYA (tiga massa, empat saka guru, tumpangsari),
bukan rasio pastinya. Sudut atap dipilih agar urutan curam emper < penanggap
< brunjung terbaca jelas dari atas — itulah tanda pengenal siluet Joglo.
"""

import bpy
import math

# ══ SPEK — ubah DI SINI, jangan di badan kode ═══════════════════
TAPAK_X          = 4.80   # m, lebar tapak (sisi panjang)
TAPAK_Z          = 4.20   # m, kedalaman tapak
TINGGI_SASARAN   = 4.10   # m, tinggi total yang dituju

ALAS_TINGGI      = 0.26   # m, umpak/alas batu
ALAS_LUBER       = 0.34   # m, alas menonjol keluar dari tapak

SAKA_GURU_SISI   = 0.24   # m, sisi tiang utama (persegi)
SAKA_GURU_RENTANG_X = 1.90  # m, jarak antar saka guru arah X
SAKA_GURU_RENTANG_Z = 1.70  # m, jarak antar saka guru arah Z
SAKA_TEPI_SISI   = 0.14   # m, tiang tepi, sengaja lebih kurus
SAKA_TINGGI      = 1.62   # m, dari alas ke tepi bawah emper

# Tiga massa atap. Sudut menentukan tingginya — bukan sebaliknya.
EMPER_SUDUT      = 24.0   # derajat, paling landai
PENANGGAP_SUDUT  = 36.0   # derajat
BRUNJUNG_SUDUT   = 58.0   # derajat, paling curam (mahkota)

EMPER_SUSUT      = 0.46   # bagian lebar yang tersisa di puncak emper
PENANGGAP_SUSUT  = 0.52   # dari puncak emper ke puncak penanggap
BRUNJUNG_SUSUT   = 0.16   # brunjung menyempit jadi bubungan

# Tiap tingkat MENJOROK keluar dari puncak tingkat di bawahnya. Tanpa ini
# ketiga massa menyatu jadi satu lereng menerus — dan justru garis patahan
# antar tingkat itulah yang membuat siluet terbaca sebagai tumpangsari Joglo,
# bukan sekadar atap limas biasa. Diuji dengan render tampak depan.
TUMPANG_LUBER    = 1.22   # kali lebar puncak tingkat di bawahnya

TEBAL_ATAP       = 0.09   # m, tebal bidang genting (siluet, bukan nol)
BUBUNGAN_TINGGI  = 0.13   # m, wuwungan di puncak

WARNA = {
    "kayu":    (0.196, 0.118, 0.071, 1.0),  # jati gelap-hangat
    "genting": (0.678, 0.310, 0.161, 1.0),  # terakota
    "batu":    (0.839, 0.796, 0.702, 1.0),  # krem
}
# ════════════════════════════════════════════════════════════════


def bahan(nama, rgba, kekasaran=0.82):
    """Matte PBR sesuai PRD BAB 4.3: roughness tinggi, nyaris tanpa metal."""
    m = bpy.data.materials.get(nama) or bpy.data.materials.new(nama)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    if b:
        b.inputs["Base Color"].default_value = rgba
        b.inputs["Roughness"].default_value = kekasaran
        if "Metallic" in b.inputs:
            b.inputs["Metallic"].default_value = 0.0
    return m


def kotak(nama, sx, sy, sz, x, y, z, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    o = bpy.context.active_object
    o.name = nama
    o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    return o


def massa_atap(nama, lebar_x, lebar_y, sudut_deg, susut, z_bawah, mat):
    """
    Satu massa atap sebagai limas terpancung.

    Tingginya DIHITUNG dari sudut dan bentang, bukan diketik — supaya
    mengubah sudut benar-benar mengubah kecuraman, bukan cuma namanya.
    """
    setengah = min(lebar_x, lebar_y) / 2.0
    naik = setengah * (1.0 - susut) * math.tan(math.radians(sudut_deg))

    # Kerucut 4 sisi = limas. radius = jari-jari LINGKAR LUAR, jadi
    # sisi persegi s berarti radius s/2*sqrt(2); diputar 45 derajat supaya
    # bidangnya menghadap sumbu, bukan sudutnya.
    bpy.ops.mesh.primitive_cone_add(
        vertices=4,
        radius1=(1.0 / 2.0) * math.sqrt(2.0),
        radius2=(susut / 2.0) * math.sqrt(2.0),
        depth=1.0,
        location=(0, 0, 0),
    )
    o = bpy.context.active_object
    o.name = nama
    o.rotation_euler[2] = math.radians(45.0)
    bpy.ops.object.transform_apply(rotation=True)

    o.scale = (lebar_x, lebar_y, max(naik, 0.02))
    o.location = (0, 0, z_bawah + max(naik, 0.02) / 2.0)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    return o, naik


def bangun():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    m_kayu = bahan("joglo_kayu", WARNA["kayu"])
    m_genting = bahan("joglo_genting", WARNA["genting"], 0.88)
    m_batu = bahan("joglo_batu", WARNA["batu"], 0.9)

    # 1. Alas berundak
    kotak("joglo_alas", TAPAK_X + ALAS_LUBER * 2, TAPAK_Z + ALAS_LUBER * 2,
          ALAS_TINGGI, 0, 0, ALAS_TINGGI / 2, m_batu)
    kotak("joglo_lantai", TAPAK_X, TAPAK_Z, ALAS_TINGGI * 0.55,
          0, 0, ALAS_TINGGI + ALAS_TINGGI * 0.275, m_kayu)
    z_lantai = ALAS_TINGGI + ALAS_TINGGI * 0.55

    # 2. Empat saka guru — penanda Joglo, sengaja lebih tebal
    for i, (sx, sz) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)]):
        kotak(f"joglo_saka_guru_{i}", SAKA_GURU_SISI, SAKA_GURU_SISI, SAKA_TINGGI,
              sx * SAKA_GURU_RENTANG_X / 2, sz * SAKA_GURU_RENTANG_Z / 2,
              z_lantai + SAKA_TINGGI / 2, m_kayu)

    # 3. Tiang tepi di keempat sudut tapak, lebih kurus
    tepi_x = TAPAK_X / 2 - SAKA_TEPI_SISI
    tepi_z = TAPAK_Z / 2 - SAKA_TEPI_SISI
    for i, (sx, sz) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)]):
        kotak(f"joglo_saka_tepi_{i}", SAKA_TEPI_SISI, SAKA_TEPI_SISI,
              SAKA_TINGGI * 0.93, sx * tepi_x, sz * tepi_z,
              z_lantai + SAKA_TINGGI * 0.93 / 2, m_kayu)

    # 4. Tiga massa atap, ditumpuk dari hitungan tingginya sendiri
    z = z_lantai + SAKA_TINGGI
    _, naik_e = massa_atap("joglo_atap_emper", TAPAK_X + 0.55, TAPAK_Z + 0.55,
                           EMPER_SUDUT, EMPER_SUSUT, z, m_genting)
    z += naik_e

    lebar2_x = (TAPAK_X + 0.55) * EMPER_SUSUT * TUMPANG_LUBER
    lebar2_y = (TAPAK_Z + 0.55) * EMPER_SUSUT * TUMPANG_LUBER
    _, naik_p = massa_atap("joglo_atap_penanggap", lebar2_x, lebar2_y,
                           PENANGGAP_SUDUT, PENANGGAP_SUSUT, z - TEBAL_ATAP, m_genting)
    z += naik_p - TEBAL_ATAP

    lebar3_x = lebar2_x * PENANGGAP_SUSUT * TUMPANG_LUBER
    lebar3_y = lebar2_y * PENANGGAP_SUSUT * TUMPANG_LUBER
    _, naik_b = massa_atap("joglo_atap_brunjung", lebar3_x, lebar3_y,
                           BRUNJUNG_SUDUT, BRUNJUNG_SUSUT, z - TEBAL_ATAP, m_genting)
    z += naik_b - TEBAL_ATAP

    # 5. Bubungan
    kotak("joglo_bubungan", lebar3_x * BRUNJUNG_SUSUT * 1.35,
          lebar3_y * BRUNJUNG_SUSUT * 1.35, BUBUNGAN_TINGGI,
          0, 0, z + BUBUNGAN_TINGGI / 2, m_genting)

    return {
        "tinggi_hitung": round(z + BUBUNGAN_TINGGI, 3),
        "tinggi_sasaran": TINGGI_SASARAN,
        "naik_emper": round(naik_e, 3),
        "naik_penanggap": round(naik_p, 3),
        "naik_brunjung": round(naik_b, 3),
        "objek": len(bpy.data.objects),
    }
