#!/usr/bin/env python3
"""
Seed demo sidang — memeriksa kesiapan data simulasi STIKOM agar kedelapan
role dapat dipresentasikan berurutan.

Dijalankan:
    python3 seed_demo_sidang.py

Kredensial database dibaca dari .env dan tidak pernah dicetak.
"""
import os
import re
import sys

PROJ = os.path.dirname(os.path.abspath(__file__))

import pymysql  # noqa: E402

env = open(os.path.join(PROJ, ".env"), encoding="utf-8").read()
m = re.search(r"mysql://([^:]+):([^@]+)@([^/]+)/(\w+)", env)
# Host di .env sudah memuat port ("localhost:3306") — pisahkan agar pymysql
# tidak menerima string host yang tidak bisa di-resolve.
_host = m.group(3)
if ":" in _host:
    _h, _p = _host.rsplit(":", 1)
    _port = int(_p)
else:
    _h, _port = _host, 3306
DB = dict(host=_h, port=_port, user=m.group(1), password=m.group(2),
          database=m.group(4), charset="utf8mb4",
          cursorclass=pymysql.cursors.DictCursor)

AKUN = [
    ("9999999001", "ADMIN"),
    ("0412345678", "KAPRODI"),
    ("0412345680", "DOSEN"),
    ("0412345682", "REVIEWER 1"),
    ("0412345683", "REVIEWER 2"),
    ("9999999002", "KETUA_STIKOM"),
    ("9999999003", "KETUA_LPPM"),
    ("9999999004", "PRODI"),
]
ALUR = [
    ("LOLOS", "selesai, menunggu ST"),
    ("MENUNGGU_SK_ST", "SK terbit, menunggu ST"),
    ("MENUNGGU_VERIFIKASI_KAPRODI", "menunggu Kaprodi"),
    ("MENUNGGU_VERIFIKASI_ADMIN", "menunggu Admin"),
    ("MENUNGGU_REVIEW", "dalam penilaian reviewer"),
    ("PERLU_REVISI", "diminta revisi"),
    ("PERLU_KEPUTUSAN", "menunggu keputusan akhir"),
    ("DITOLAK", "ditolak"),
    ("DRAFT", "belum disubmit"),
    ("SELESAI", "seluruh tahap tuntas"),
]


def q(cur, sql, args=None):
    cur.execute(sql, args or ())
    return cur.fetchall()


def satu(cur, sql, args=None):
    r = q(cur, sql, args)
    return r[0] if r else None


def buat_proposal_demo(cur, conn):
    """Buat satu proposal per status yang masih kosong, agar alur dapat
    diperagakan dari titik mana pun tanpa harus memulai dari nol."""
    import uuid

    # Referensi yang dibutuhkan proposal
    dosen = satu(cur, "SELECT id, program_studi_id FROM users WHERE nidn='0412345680'")
    periode = satu(cur, "SELECT id FROM periode_akademik WHERE is_active=1")
    if not dosen or not periode:
        print("    referensi tidak lengkap — proposal demo tidak dibuat")
        return

    dibuat = 0
    for st, ket in ALUR:
        if st in ("LOLOS",):          # sudah ada
            continue
        ada = satu(cur, "SELECT COUNT(*) n FROM proposals WHERE status=%s", (st,))["n"]
        if ada:
            continue
        judul = "[DEMO] Contoh proposal berstatus %s" % st
        cur.execute("""
            INSERT INTO proposals
              (id, judul, abstrak, jenis, status, dosen_id, program_studi_id,
               periode_id, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW(),NOW())""",
            (str(uuid.uuid4()), judul,
             "Proposal contoh untuk memperagakan alur kerja pada status %s." % st,
             "PENELITIAN", st, dosen["id"], dosen["program_studi_id"], periode["id"]))
        dibuat += 1
    conn.commit()
    if dibuat:
        print("    %d proposal demo dibuat (prefix [DEMO])" % dibuat)


def bersihkan_uji(cur, conn):
    """Hapus sisa uji otomatis yang tidak layak dipakai pada demo sidang."""
    n = 0
    for judul in ("Kosong",):
        cur.execute("DELETE FROM kuisioner WHERE judul=%s", (judul,))
        n += cur.rowcount
    # kuisioner uji ganda: sisakan yang terbaru saja bila judulnya sama
    cur.execute("""
        DELETE k FROM kuisioner k
        JOIN (SELECT judul, MAX(created_at) mx FROM kuisioner
              GROUP BY judul HAVING COUNT(*)>1) d
          ON d.judul = k.judul AND k.created_at < d.mx""")
    n += cur.rowcount
    conn.commit()
    if n:
        print("    %d baris sisa uji dibersihkan" % n)


def main():
    conn = pymysql.connect(**DB)
    cur = conn.cursor()

    print("\n[0] membersihkan sisa uji")
    bersihkan_uji(cur, conn)
    print("\n[0b] melengkapi proposal demo")
    buat_proposal_demo(cur, conn)

    print("=" * 64)
    print("  SEED DEMO SIDANG — Sistem Informasi LPPM STIKOM PGRI Banyuwangi")
    print("=" * 64)

    print("\n[1] akun demo")
    ada = 0
    for nidn, label in AKUN:
        r = satu(cur, """
            SELECT u.nama, GROUP_CONCAT(ur.role) roles
            FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
            WHERE u.nidn = %s GROUP BY u.id""", (nidn,))
        if r:
            print("    OK  %-14s %s  %-22s %s" % (label, nidn, r["nama"][:20], r["roles"]))
            ada += 1
        else:
            print("    --  %-14s %s  TIDAK ADA" % (label, nidn))
    print("    -> %d/%d akun siap" % (ada, len(AKUN)))

    print("\n[2] referensi")
    ps = q(cur, "SELECT kode FROM program_studi ORDER BY kode")
    print("    program studi : %d — %s" % (len(ps), ", ".join(x["kode"] for x in ps)))
    per = satu(cur, "SELECT nama FROM periode_akademik WHERE is_active = 1")
    print("    periode aktif : %s" % (per["nama"] if per else "BELUM ADA"))
    jp = q(cur, "SELECT jenis, COUNT(*) n FROM proposals GROUP BY jenis")
    print("    proposal      : %s" % (", ".join("%s=%s" % (x["jenis"], x["n"]) for x in jp) or "0"))

    print("\n[3] proposal per status (urutan alur)")
    ada_status = False
    for st, ket in ALUR:
        n = satu(cur, "SELECT COUNT(*) n FROM proposals WHERE status = %s", (st,))["n"]
        if n:
            print("    %-32s %3d  %s" % (st, n, ket))
            ada_status = True
    if not ada_status:
        print("    belum ada proposal sama sekali")

    print("\n[4] kuisioner")
    kuis = q(cur, "SELECT id, judul, status FROM kuisioner ORDER BY created_at")
    if not kuis:
        print("    belum ada — buat lewat POST /api/admin/kuisioner")
    for k in kuis:
        jw = satu(cur, "SELECT COUNT(*) n FROM kuisioner_responses WHERE kuisioner_id=%s",
                  (k["id"],))["n"]
        print("    [%-7s] %-46s %d jawaban" % (k["status"], k["judul"][:44], jw))

    print("\n[5] bukti jejak")
    for tabel, label in [("notifications", "notifikasi"),
                         ("activity_logs", "activity_logs"),
                         ("documents", "dokumen SK/ST"),
                         ("verifications", "jejak verifikasi"),
                         ("reviews", "penilaian reviewer"),
                         ("berita", "berita"),
                         ("galeri", "galeri")]:
        print("    %-16s: %s" % (label, satu(cur, "SELECT COUNT(*) n FROM " + tabel)["n"]))

    print("\n[6] cakupan uji")
    n_prop = satu(cur, "SELECT COUNT(*) n FROM proposals")["n"]
    print("    proposal tersedia : %s" % n_prop)
    print("    ekspektasi RBAC    : PRODI -> 403, KETUA_STIKOM/KETUA_LPPM -> 200")

    print("\n" + "=" * 64)
    print("  URUTAN PERAGAAN")
    print("=" * 64)
    print("""
  1. DOSEN        0412345680   buat proposal -> submit -> menunggu Kaprodi
  2. KAPRODI      0412345678   verifikasi    -> setujui -> lanjut Admin
  3. ADMIN        9999999001   verifikasi    -> tugaskan reviewer
  4. REVIEWER     0412345682   beri skor     (blind: tak bisa baca riwayat)
  5. REVIEWER     0412345683   beri skor     -> hasil kombinasi muncul
  6. ADMIN        9999999001   putuskan      -> SK -> ST -> notifikasi
  7. KETUA_STIKOM 9999999002   baca semua proposal (pengawasan)
  8. KETUA_LPPM   9999999003   baca semua proposal (pengawasan)
  9. PRODI        9999999004   ditolak baca proposal -> 403 (bukti RBAC)
 10. PUBLIK       tanpa login  berita, galeri, dokumen, kuisioner
""")
    conn.close()


if __name__ == "__main__":
    main()
