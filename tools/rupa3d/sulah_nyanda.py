"""
Sulah Nyanda procedural — rumah tradisional Baduy/Kanekes, Banten.

Pola sama dengan joglo.py: bangun dari ANGKA BERNAMA, buktikan dengan
rupa_ukur, lihat dengan rupa_lihat, perbaiki KONSTANTA (bukan verteks).

DASAR BENTUK (docs/RISET_3D_NUSANTARA.md §4):
- rumah panggung, tiang berdiri di atas batu umpak mengikuti kontur;
- rangka kayu, lantai dan dinding bambu, atap daun/ijuk;
- persegi panjang dengan atap kampung dan SOSORAN di salah satu sisi;
  "nyanda" merujuk kesan bidang yang bersandar/merebah — sosoran itulah
  yang membuat profilnya terbaca dari samping.

PENEMPATAN: archetype Sunda-Banten/Baduy. BUKAN ikon Braga/Bandung —
hubungannya belum punya dasar. Jangan dipakai sebagai "rumah khas Bandung".

BELUM DIKLAIM: hiasan atau motif khusus pada dinding belum punya sumber,
jadi tidak dibuat. Dinding bambu ditunjukkan lewat WARNA dan beberapa bilah
besar, bukan pola anyaman berfrekuensi tinggi yang akan mahal dan mengarang.
"""

import bpy
import math

# ══ SPEK ════════════════════════════════════════════════════════
TAPAK_X          = 4.40   # m, sisi panjang
TAPAK_Z          = 3.00   # m, sisi pendek
TINGGI_SASARAN   = 3.60   # m

KOLONG_TINGGI    = 0.62   # m, badan terangkat dari tanah
UMPAK_TINGGI     = 0.16   # m, batu di bawah tiang
UMPAK_SISI       = 0.26   # m
TIANG_SISI       = 0.11   # m
TIANG_KOLOM      = 3      # tiang arah X
TIANG_BARIS      = 2      # tiang arah Z
KONTUR_GOYANG    = 0.05   # m, beda tinggi umpak antar tiang (kesan kontur)

BADAN_TINGGI     = 1.24   # m, dinding bambu
LANTAI_TEBAL     = 0.10   # m

# Atap pelana curam sebagai massa utama.
ATAP_SUDUT       = 37.1   # derajat — dihitung mundur dari TINGGI_SASARAN,
                          # bukan ditebak: atan(1,48 / 1,96). Ubah tinggi sasaran,
                          # hitung ulang, jangan geser angka ini sembarangan.
ATAP_LUBER_X     = 0.42   # m, overhang arah panjang
ATAP_LUBER_Z     = 0.46   # m, overhang arah pendek
ATAP_TEBAL       = 0.10   # m

# Sosoran: bidang lebih rendah dan memanjang di satu sisi. Inilah yang
# membuat siluet "bersandar" terbaca — tanpa ini bangunannya cuma rumah
# pelana biasa.
SOSORAN_SUDUT    = 22.0   # derajat, jauh lebih landai dari atap utama
SOSORAN_PANJANG  = 1.30   # m, seberapa jauh menjulur ke depan
SOSORAN_TURUN    = 0.34   # m, pangkalnya di bawah bubungan utama

BILAH_JUMLAH     = 4      # bilah besar penanda dinding bambu

WARNA = {
    "kayu":   (0.286, 0.180, 0.106, 1.0),  # rangka kayu
    "bambu":  (0.796, 0.729, 0.522, 1.0),  # dinding/lantai bambu terang
    "ijuk":   (0.325, 0.259, 0.196, 1.0),  # atap daun/ijuk, coklat kusam
    "batu":   (0.616, 0.596, 0.561, 1.0),  # umpak
}
# ════════════════════════════════════════════════════════════════


def bahan(nama, rgba, kekasaran=0.86):
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


def prisma_pelana(nama, panjang_x, bentang_z, tinggi, x, y, z_bawah, mat):
    """
    Atap pelana sebagai prisma segitiga.

    Dibuat dari verteks langsung, bukan kubus yang dipahat — lebih murah
    (8 segitiga) dan bentuknya pasti.
    """
    hx, hz = panjang_x / 2.0, bentang_z / 2.0
    verts = [
        (-hx, -hz, 0), (hx, -hz, 0), (hx, hz, 0), (-hx, hz, 0),   # alas
        (-hx, 0.0, tinggi), (hx, 0.0, tinggi),                     # bubungan
    ]
    faces = [
        (0, 1, 5, 4),   # sisi -Z
        (2, 3, 4, 5),   # sisi +Z
        (0, 4, 3),      # gable kiri
        (1, 2, 5),      # gable kanan
        (0, 3, 2, 1),   # alas
    ]
    mesh = bpy.data.meshes.new(nama)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    o = bpy.data.objects.new(nama, mesh)
    bpy.context.collection.objects.link(o)
    o.location = (x, y, z_bawah)
    o.data.materials.append(mat)
    return o


def bangun():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    m_kayu = bahan("sn_kayu", WARNA["kayu"])
    m_bambu = bahan("sn_bambu", WARNA["bambu"])
    m_ijuk = bahan("sn_ijuk", WARNA["ijuk"], 0.92)
    m_batu = bahan("sn_batu", WARNA["batu"], 0.9)

    # 1. Umpak + tiang. Tinggi umpak digoyang sedikit supaya terbaca
    #    "menyesuaikan kontur" tanpa perlu membuat medan palsu.
    n = 0
    for i in range(TIANG_KOLOM):
        for j in range(TIANG_BARIS):
            fx = (i / max(TIANG_KOLOM - 1, 1) - 0.5) * (TAPAK_X - TIANG_SISI * 3)
            fz = (j / max(TIANG_BARIS - 1, 1) - 0.5) * (TAPAK_Z - TIANG_SISI * 3)
            goyang = ((i * 3 + j * 5) % 3 - 1) * KONTUR_GOYANG
            u_t = UMPAK_TINGGI + goyang
            kotak(f"sn_umpak_{n}", UMPAK_SISI, UMPAK_SISI, u_t, fx, fz, u_t / 2, m_batu)
            t_t = KOLONG_TINGGI - goyang
            kotak(f"sn_tiang_{n}", TIANG_SISI, TIANG_SISI, t_t,
                  fx, fz, u_t + t_t / 2, m_kayu)
            n += 1

    z_lantai = UMPAK_TINGGI + KOLONG_TINGGI

    # 2. Lantai + badan dinding bambu
    kotak("sn_lantai", TAPAK_X, TAPAK_Z, LANTAI_TEBAL,
          0, 0, z_lantai + LANTAI_TEBAL / 2, m_bambu)
    z_badan = z_lantai + LANTAI_TEBAL
    kotak("sn_badan", TAPAK_X, TAPAK_Z, BADAN_TINGGI,
          0, 0, z_badan + BADAN_TINGGI / 2, m_bambu)

    # 3. Bilah besar penanda anyaman — sengaja SEDIKIT dan BESAR.
    for b in range(BILAH_JUMLAH):
        bx = (b / max(BILAH_JUMLAH - 1, 1) - 0.5) * (TAPAK_X * 0.82)
        kotak(f"sn_bilah_{b}", 0.07, TAPAK_Z + 0.02, BADAN_TINGGI * 0.9,
              bx, 0, z_badan + BADAN_TINGGI / 2, m_kayu)

    z_atap = z_badan + BADAN_TINGGI

    # 4. Atap pelana utama — tinggi dihitung dari sudut, bukan diketik.
    bentang = TAPAK_Z + ATAP_LUBER_Z * 2
    naik = (bentang / 2.0) * math.tan(math.radians(ATAP_SUDUT))
    prisma_pelana("sn_atap", TAPAK_X + ATAP_LUBER_X * 2, bentang, naik,
                  0, 0, z_atap, m_ijuk)

    # 5. Sosoran — bidang MIRING YANG MENEMPEL pada tepi atap utama, lalu
    #    turun menjauh. Ini "nyanda"-nya: kesan bidang yang bersandar.
    #
    #    Versi pertama membuatnya sebagai prisma pelana kedua yang diletakkan
    #    di samping, dan hasilnya MELAYANG terpisah dari rumahnya — cacat yang
    #    tidak muncul di angka mana pun, cuma terlihat di render tampak kiri.
    #    Sekarang: satu bidang tebal, dirotasi pada sumbu X, pangkalnya tepat
    #    di tepi bawah atap utama.
    sos_turun = SOSORAN_PANJANG * math.tan(math.radians(SOSORAN_SUDUT))
    sos_miring = math.hypot(SOSORAN_PANJANG, sos_turun)
    sos = kotak("sn_sosoran", TAPAK_X + ATAP_LUBER_X * 2, sos_miring, ATAP_TEBAL,
                0, 0, 0, m_ijuk)
    sos.rotation_euler[0] = math.radians(SOSORAN_SUDUT)
    # pangkal menempel di tepi atap utama (-Z), lalu menjulur keluar
    sos.location = (
        0,
        -(bentang / 2.0 + SOSORAN_PANJANG / 2.0),
        z_atap - SOSORAN_TURUN - sos_turun / 2.0,
    )
    bpy.ops.object.select_all(action='DESELECT')
    sos.select_set(True)
    bpy.context.view_layer.objects.active = sos
    bpy.ops.object.transform_apply(rotation=True, location=True)
    sos_naik = sos_turun

    return {
        "tinggi_hitung": round(z_atap + naik, 3),
        "tinggi_sasaran": TINGGI_SASARAN,
        "naik_atap": round(naik, 3),
        "naik_sosoran": round(sos_naik, 3),
        "z_lantai": round(z_lantai, 3),
        "objek": len(bpy.data.objects),
    }
