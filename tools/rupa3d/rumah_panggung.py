"""
Rumah panggung pesisir — rumpun Bugis–Makassar, Spot Losari.

Pola sama dengan joglo.py dan sulah_nyanda.py: bangun dari ANGKA BERNAMA,
buktikan dengan rupa_ukur, lihat dengan rupa_lihat, perbaiki KONSTANTA.

DASAR BENTUK (docs/RISET_3D_NUSANTARA.md §5):
- rumah panggung dengan atap pelana;
- pembagian vertikal: kolong/tiang -> badan -> atap;
- bidang segitiga di ujung atap disebut TIMPALAJA;
- kolong tinggi dan terbuka, enam sampai delapan tiang;
- tangga depan yang jelas terbaca dari kamera orbit;
- overhang atap besar.

BATAS YANG DISENGAJA: jumlah susunan timpalaja dapat menandai status sosial.
Model generik Galantara TIDAK BOLEH memberi pangkat sosial palsu, jadi
timpalaja dibuat sebagai DUA LIS SEDERHANA yang memperjelas bidang gable —
bukan jumlah susunan yang mengaku mewakili status tertentu.

BELUM DIKLAIM: bentuk ukiran lokal tertentu belum punya dasar, jadi tidak
dibuat.
"""

import bpy
import math

# ══ SPEK ════════════════════════════════════════════════════════
TAPAK_X          = 4.20   # m, sisi panjang (muka rumah)
TAPAK_Z          = 3.00   # m, kedalaman
TINGGI_SASARAN   = 4.20   # m

# Kolong tinggi dan terbuka — ini penanda rumah panggung pesisir.
KOLONG_TINGGI    = 1.35   # m, jauh lebih tinggi daripada Sulah Nyanda (0,62)
TIANG_SISI       = 0.15   # m
TIANG_KOLOM      = 4      # 4 x 2 = 8 tiang, batas atas rentang "enam sampai delapan"
TIANG_BARIS      = 2

LANTAI_TEBAL     = 0.14   # m
BADAN_TINGGI     = 1.30   # m

ATAP_LUBER_X     = 0.55   # m, overhang besar arah panjang
ATAP_LUBER_Z     = 0.62   # m, overhang besar arah kedalaman
ATAP_TEBAL       = 0.10   # m

TANGGA_ANAK      = 5      # jumlah anak tangga
TANGGA_LEBAR     = 0.95   # m
TANGGA_JULUR     = 1.05   # m, seberapa jauh menjulur ke depan

TIMPALAJA_LIS    = 2      # DUA lis saja — lihat catatan status sosial di atas
TIMPALAJA_TEBAL  = 0.10   # m
TIMPALAJA_LUBER  = 0.05   # m, lis diletakkan DI LUAR bidang gable, bukan di dalamnya.
                          # Versi pertama menaruhnya 4 cm ke DALAM dengan tebal 7 cm,
                          # jadi hampir seluruhnya terkubur di mesh atap dan cuma
                          # tersisa titik kecil di render. Sekarang menempel di muka.

WARNA = {
    "kayu":     (0.412, 0.196, 0.118, 1.0),  # kayu merah-oranye (palet Losari)
    "kayu_tua": (0.263, 0.145, 0.098, 1.0),  # tiang & rangka, lebih tua
    "atap":     (0.353, 0.310, 0.290, 1.0),  # atap gelap
    "pasir":    (0.855, 0.804, 0.706, 1.0),  # aksen pasir pucat
}
# ════════════════════════════════════════════════════════════════


def bahan(nama, rgba, kekasaran=0.85):
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
    """Atap pelana sebagai prisma segitiga — 8 segitiga, bentuknya pasti."""
    hx, hz = panjang_x / 2.0, bentang_z / 2.0
    verts = [
        (-hx, -hz, 0), (hx, -hz, 0), (hx, hz, 0), (-hx, hz, 0),
        (-hx, 0.0, tinggi), (hx, 0.0, tinggi),
    ]
    faces = [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]
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

    m_kayu = bahan("rp_kayu", WARNA["kayu"])
    m_tua = bahan("rp_kayu_tua", WARNA["kayu_tua"])
    m_atap = bahan("rp_atap", WARNA["atap"], 0.9)
    m_pasir = bahan("rp_pasir", WARNA["pasir"], 0.88)

    # 1. Kolong terbuka — tiang saja, tanpa dinding. Itu intinya.
    n = 0
    for i in range(TIANG_KOLOM):
        for j in range(TIANG_BARIS):
            fx = (i / max(TIANG_KOLOM - 1, 1) - 0.5) * (TAPAK_X - TIANG_SISI * 2)
            fz = (j / max(TIANG_BARIS - 1, 1) - 0.5) * (TAPAK_Z - TIANG_SISI * 2)
            kotak(f"rp_tiang_{n}", TIANG_SISI, TIANG_SISI, KOLONG_TINGGI,
                  fx, fz, KOLONG_TINGGI / 2, m_tua)
            n += 1

    # 2. Lantai + badan
    kotak("rp_lantai", TAPAK_X, TAPAK_Z, LANTAI_TEBAL,
          0, 0, KOLONG_TINGGI + LANTAI_TEBAL / 2, m_kayu)
    z_badan = KOLONG_TINGGI + LANTAI_TEBAL
    kotak("rp_badan", TAPAK_X, TAPAK_Z, BADAN_TINGGI,
          0, 0, z_badan + BADAN_TINGGI / 2, m_kayu)
    z_atap = z_badan + BADAN_TINGGI

    # 3. Atap pelana. Sudut DIHITUNG MUNDUR dari tinggi sasaran, bukan
    #    ditebak — cara yang sama dipakai di sulah_nyanda.py setelah versi
    #    pertamanya meleset 15%.
    bentang = TAPAK_Z + ATAP_LUBER_Z * 2
    naik = max(TINGGI_SASARAN - z_atap, 0.3)
    sudut = math.degrees(math.atan(naik / (bentang / 2.0)))
    prisma_pelana("rp_atap", TAPAK_X + ATAP_LUBER_X * 2, bentang, naik,
                  0, 0, z_atap, m_atap)

    # 4. Timpalaja — dua lis horizontal di muka gable. Menonjol sedikit
    #    supaya kena bayangan dan bidangnya terbaca dari kamera orbit.
    #    CATATAN ARAH — ini sempat salah dan cuma render yang menunjukkannya:
    #    di prisma_pelana, bubungan membujur arah X (verteks puncak di
    #    (+-hx, 0, tinggi)). Jadi bidang MIRING ada di +-Y, dan segitiga
    #    GABLE ada di +-X. Versi pertama menaruh lis di +-Y — hasilnya dua
    #    garis melintang di tengah atap, bukan timpalaja.
    panjang_atap = TAPAK_X + ATAP_LUBER_X * 2
    muka_x = panjang_atap / 2.0
    for k in range(TIMPALAJA_LIS):
        bagian = (k + 1) / (TIMPALAJA_LIS + 1)          # 1/3, 2/3 tinggi gable
        z_lis = z_atap + naik * bagian
        # Segitiga gable menyempit ke arah Y seiring naik, bukan ke arah X.
        lebar_y = bentang * (1.0 - bagian) * 0.94
        for sisi in (-1, 1):
            kotak(f"rp_timpalaja_{k}_{'kiri' if sisi < 0 else 'kanan'}",
                  TIMPALAJA_TEBAL, lebar_y, TIMPALAJA_TEBAL * 1.6,
                  sisi * (muka_x + TIMPALAJA_LUBER), 0, z_lis, m_pasir)

    # 5. Tangga depan — harus terbaca dari kamera orbit (phi 18-76 derajat),
    #    jadi anak tangganya sedikit tapi besar.
    for a in range(TANGGA_ANAK):
        t = (a + 1) / TANGGA_ANAK
        tinggi_anak = (KOLONG_TINGGI + LANTAI_TEBAL) * t
        kotak(f"rp_tangga_{a}", TANGGA_LEBAR, TANGGA_JULUR / TANGGA_ANAK,
              tinggi_anak, 0,
              -(TAPAK_Z / 2 + TANGGA_JULUR) + (a + 0.5) * (TANGGA_JULUR / TANGGA_ANAK),
              tinggi_anak / 2, m_kayu)

    return {
        "tinggi_hitung": round(z_atap + naik, 3),
        "tinggi_sasaran": TINGGI_SASARAN,
        "sudut_atap_hitung": round(sudut, 1),
        "naik_atap": round(naik, 3),
        "tinggi_kolong": KOLONG_TINGGI,
        "jumlah_tiang": n,
        "objek": len(bpy.data.objects),
    }
