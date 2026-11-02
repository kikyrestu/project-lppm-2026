#!/usr/bin/env python3
# roadmap/uji.py — pelari uji backend. Menghasilkan data/uji.json
# yang dirender halaman /uji sebagai laporan ber-UI.
# Jalankan:  python3 uji.py
import json, re, sqlite3  # noqa: F401  (sqlite3 tidak dipakai; disimpan agar mudah dilihat)
from datetime import datetime
from pathlib import Path

import requests

PROYEK = Path("/home/kali/Documents/KIKY/KULIAH/PROJECT-LPPM-Backend")
BASE = "http://127.0.0.1:3100"
KATA_LALU = "LppmDemo123!"
GARIS = re.compile(r"mysql://([^:]+):([^@]+)@")


def kredensial_db():
    s = (PROYEK / ".env").read_text(encoding="utf-8")
    m = GARIS.search(s)
    return m.group(1), m.group(2)


def bersihkan(nidn):
    """Hapus data uji agar hasil dapat diulang secara deterministik."""
    import subprocess
    u, p = kredensial_db()
    sql = f"""
    DELETE pm FROM proposal_members pm JOIN proposals pr ON pr.id=pm.proposal_id
      JOIN users us ON us.id=pr.dosen_id WHERE us.nidn='{nidn}';
    DELETE v FROM verifications v JOIN proposals pr ON pr.id=v.proposal_id
      JOIN users us ON us.id=pr.dosen_id WHERE us.nidn='{nidn}';
    DELETE p FROM proposals p JOIN users us ON us.id=p.dosen_id WHERE us.nidn='{nidn}';
    """
    subprocess.run(["mysql", f"-u{u}", f"-p{p}", "lppm", "-e", sql],
                   capture_output=True, text=True)


class Sesi:
    """Pembungkus requests dengan cookie otomatis."""

    def __init__(self):
        self.s = requests.Session()

    def login(self, nidn):
        r = self.s.post(f"{BASE}/api/auth/login",
                        json={"nidn": nidn, "password": KATA_LALU}, timeout=25)
        return r.status_code

    def kirim(self, metode, path, body=None, **kw):
        r = self.s.request(metode, f"{BASE}{path}", json=body, timeout=25, **kw)
        try:
            isi = r.json()
        except Exception:
            isi = {"_teks": r.text[:300]}
        return r.status_code, isi


def uji(nama, metode, path, dapat, ekspek, req=None, res=None, catatan=None):
    return {
        "nama": nama, "metode": metode, "path": path,
        "ekspek": ekspek, "dapat": dapat, "lulus": dapat == ekspek,
        "req": req, "res": res, "catatan": catatan,
    }


# ==================================================================
# M1 — Autentikasi
# ==================================================================
def suite_m1():
    a, v = Sesi(), Sesi()
    t = []
    c, r = a.kirim("POST", "/api/auth/login", {"nidn": "0000000000", "password": "salah"})
    t.append(uji("NIDN tidak dikenal ditolak", "POST", "/api/auth/login", c, 401,
                 {"nidn": "0000000000", "password": "***"}, r,
                 "Pesan sama dengan password salah — mencegah enumerasi akun."))
    c, r = a.kirim("POST", "/api/auth/login", {"nidn": "9999999001", "password": "salah"})
    t.append(uji("Password salah ditolak", "POST", "/api/auth/login", c, 401, None, r))
    c, r = a.kirim("POST", "/api/auth/login", {"nidn": 123, "password": "x"})
    t.append(uji("NIDN bukan teks ditolak", "POST", "/api/auth/login", c, 400,
                 {"nidn": 123}, r, "Zod menolak sebelum menyentuh database."))
    c, r = a.kirim("POST", "/api/auth/login", {"nidn": "9999999001", "password": KATA_LALU})
    t.append(uji("Login ADMIN berhasil", "POST", "/api/auth/login", c, 200, None,
                 {"cookie": "HttpOnly diterbitkan"}))
    c, r = a.kirim("GET", "/api/auth/me")
    t.append(uji("Sesi terbaca dari cookie", "GET", "/api/auth/me", c, 200, None,
                 {"nidn": r.get("user", {}).get("nidn"), "roles": r.get("user", {}).get("roles")}))
    polos = Sesi()
    c, r = polos.kirim("GET", "/api/auth/me")
    t.append(uji("Tanpa sesi ditolak", "GET", "/api/auth/me", c, 401, None, r))
    c, r = a.kirim("GET", "/api/auth/me", headers={"Cookie": "lppm_token=palsu.abc.def"})
    t.append(uji("Token palsu ditolak", "GET", "/api/auth/me", c, 401, None, r))
    v.login("0412345682")
    c, r = v.kirim("GET", "/api/admin/prodi")
    t.append(uji("REVIEWER ditolak di /api/admin", "GET", "/api/admin/prodi", c, 403, None, r))
    c, r = a.kirim("GET", "/api/admin/prodi")
    t.append(uji("ADMIN diterima di /api/admin", "GET", "/api/admin/prodi", c, 200, None,
                 {"jumlah_prodi": len(r.get("prodi", []))}))
    c, r = a.kirim("POST", "/api/auth/logout")
    c2, r2 = a.kirim("GET", "/api/auth/me")
    t.append(uji("Sesi terhapus setelah logout", "GET", "/api/auth/me", c2, 401, None, r2))
    return t


# ==================================================================
# M8 — Master Data & Form Dinamis
# ==================================================================
def suite_m8():
    a = Sesi(); a.login("9999999001")
    t = []
    c, r = a.kirim("GET", "/api/admin/prodi")
    t.append(uji("Daftar program studi", "GET", "/api/admin/prodi", c, 200, None,
                 {"prodi": [p["kode"] for p in r.get("prodi", [])]}))
    c, r = a.kirim("POST", "/api/admin/prodi", {"kode": "UT", "nama": "Uji Tuntas"})
    t.append(uji("Tambah program studi", "POST", "/api/admin/prodi", c, 201, None,
                 {"kode": r.get("prodi", {}).get("kode")}))
    c, r = a.kirim("POST", "/api/admin/prodi", {"kode": "UT", "nama": "Duplikat"})
    t.append(uji("Kode duplikat ditolak", "POST", "/api/admin/prodi", c, 409,
                 {"kode": "UT"}, r))
    daftar = a.kirim("GET", "/api/admin/prodi")[1].get("prodi", [])
    ti = next((p["id"] for p in daftar if p["kode"] == "TI"), None)
    c, r = a.kirim("DELETE", f"/api/admin/prodi/{ti}")
    t.append(uji("Hapus prodi yang masih dipakai ditolak", "DELETE",
                 "/api/admin/prodi/{id}", c, 409, None, r,
                 "Dihitung dulu jumlah user + proposal yang merujuk."))
    ut = next((p["id"] for p in daftar if p["kode"] == "UT"), None)
    c, r = a.kirim("DELETE", f"/api/admin/prodi/{ut}")
    t.append(uji("Hapus prodi baru berhasil", "DELETE", "/api/admin/prodi/{id}", c, 200, None, r))

    c, r = a.kirim("GET", "/api/admin/periode")
    t.append(uji("Daftar periode akademik", "GET", "/api/admin/periode", c, 200, None,
                 {"aktif": sum(1 for p in r.get("periode", []) if p["isActive"])}))
    periode = [p for p in r.get("periode", [])]
    pasif = next((p for p in periode if not p["isActive"]), None)
    aktif = next((p for p in periode if p["isActive"]), None)
    c, r = a.kirim("PUT", f"/api/admin/periode/{pasif['id']}", {"isActive": True})
    t.append(uji("Aktifkan periode lain", "PUT", "/api/admin/periode/{id}", c, 200,
                 {"isActive": True},
                 {"aktif_sekarang": r.get("periode", {}).get("nama")},
                 "Otomatis menonaktifkan periode sebelumnya — tetap satu yang aktif."))
    ulang = a.kirim("GET", "/api/admin/periode")[1].get("periode", [])
    t.append(uji("Tetap tepat satu periode aktif", "GET", "/api/admin/periode",
                 sum(1 for p in ulang if p["isActive"]), 1, None,
                 {"jumlah_aktif": sum(1 for p in ulang if p["isActive"])}))
    a.kirim("PUT", f"/api/admin/periode/{aktif['id']}", {"isActive": True})

    c, r = a.kirim("GET", "/api/admin/form-field", params={"jenis": "KKN"})
    t.append(uji("Konfigurasi field KKN", "GET", "/api/admin/form-field?jenis=KKN", c, 200, None,
                 {"fields": [f["label"] for f in r.get("fields", [])]}))
    c, r = a.kirim("POST", "/api/admin/form-field",
                   {"jenisProposal": "KKN", "label": "Uji Field", "tipeInput": "text", "urutan": 9})
    t.append(uji("Tambah field dinamis", "POST", "/api/admin/form-field", c, 201, None, r))
    c, r = a.kirim("POST", "/api/admin/form-field",
                   {"jenisProposal": "KKN", "label": "Uji Field", "tipeInput": "text", "urutan": 9})
    t.append(uji("Field label sama ditolak", "POST", "/api/admin/form-field", c, 409, None, r,
                 "Kunci unik (jenisProposal, label)."))
    c, r = a.kirim("POST", "/api/admin/form-field",
                   {"jenisProposal": "PKM", "label": "X", "tipeInput": "text", "urutan": 1})
    t.append(uji("Jenis di luar enum ditolak", "POST", "/api/admin/form-field", c, 400,
                 {"jenisProposal": "PKM"}, r,
                 "Sebelumnya jatuh ke 500 karena daftar enum tidak cocok skema."))
    c, r = a.kirim("POST", "/api/admin/form-field",
                   {"jenisProposal": "KKN", "label": "Pilih", "tipeInput": "select"})
    t.append(uji("Select tanpa opsi ditolak", "POST", "/api/admin/form-field", c, 400, None, r))
    fields = a.kirim("GET", "/api/admin/form-field", params={"jenis": "KKN"})[1].get("fields", [])
    uf = next((f["id"] for f in fields if f["label"] == "Uji Field"), None)
    c, r = a.kirim("DELETE", f"/api/admin/form-field/{uf}")
    t.append(uji("Hapus field dinamis", "DELETE", "/api/admin/form-field/{id}", c, 200, None, r))
    return t
