#!/usr/bin/env python3
"""
Generator Dokumentasi API — Sistem Informasi LPPM
Menghasilkan HTML (gaya ERD), PDF (via chromium headless), dan DOCX.
Satu sumber data -> tiga format, supaya isinya tidak pernah menyimpang.
"""
import os
import subprocess
import sys

BASE = "/home/kali/Documents/KIKY/KULIAH/PROJECT-LPPM-Backend"
OUT = os.path.join(BASE, "docs")
os.makedirs(OUT, exist_ok=True)

PROYEK = "Sistem Informasi LPPM"
INSTITUSI = "STIKOM PGRI Banyuwangi"
VERSI = "1.0"
TANGGAL = "28 Oktober 2026"

# ---------------------------------------------------------------
# Sumber data: definisi endpoint
# status: "terverifikasi" | "rencana"
# ---------------------------------------------------------------
GRUP = [
    {
        "kode": "auth",
        "nama": "Autentikasi & Sesi",
        "warna": "users",          # -> --cat-users #6366f1
        "modul": "M1",
        "status": "terverifikasi",
        "ringkas": "Login NIDN, pembacaan sesi, dan logout. Sesi disimpan sebagai cookie httpOnly berumur 8 jam.",
        "endpoint": [
            {
                "metode": "POST",
                "path": "/api/auth/login",
                "status": "terverifikasi",
                "ringkas": "Autentikasi pengguna dengan NIDN dan password.",
                "auth": "Tidak perlu (publik)",
                "body": [
                    ("nidn", "string", "ya", "1–20 karakter. NIDN dosen/pegawai."),
                    ("password", "string", "ya", "1–200 karakter."),
                ],
                "respons": [
                    ("200", "Login berhasil. Cookie `lppm_token` (httpOnly, path=/) disetel."),
                    ("400", "Body tidak lolos validasi Zod."),
                    ("401", "NIDN tidak dikenal ATAU password salah."),
                    ("403", "Kredensial benar tetapi akun berstatus NONAKTIF."),
                ],
                "contoh": {
                    "req": '{"nidn": "9999999001", "password": "LppmDemo123!"}',
                    "res": '{\n  "ok": true,\n  "message": "Login berhasil",\n  "user": {\n    "id": "a779dadb-caa3-4ac6-82a4-55dd07405de8",\n    "nidn": "9999999001",\n    "nama": "Admin LPPM",\n    "roles": ["ADMIN"],\n    "programStudi": { "kode": "TI", "nama": "Teknik Informatika" }\n  }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "UNAUTHORIZED",\n  "message": "NIDN atau password salah"\n}',
                },
                "catatan": [
                    "Pesan kegagalan **sengaja dibuat sama** untuk NIDN tak dikenal dan password salah, agar akun tidak bisa ditebak keberadaannya (user-enumeration).",
                    "Bcrypt tetap dijalankan memakai hash dummy ketika NIDN tidak ditemukan, sehingga waktu respons identik (mencegah pembocoran lewat timing).",
                    "Cookie bersifat httpOnly sehingga token tidak dapat dibaca script browser akibat XSS.",
                ],
            },
            {
                "metode": "GET",
                "path": "/api/auth/me",
                "status": "terverifikasi",
                "ringkas": "Tampilkan sesi berjalan beserta role aktif.",
                "auth": "Perlu sesi (semua role)",
                "body": [],
                "respons": [
                    ("200", "Data pengguna dan daftar role."),
                    ("401", "Tidak ada sesi, token kedaluwarsa, atau token rusak."),
                ],
                "contoh": {
                    "req": "(tanpa body)",
                    "res": '{\n  "ok": true,\n  "user": {\n    "id": "a779dadb-...",\n    "nidn": "9999999001",\n    "nama": "Admin LPPM",\n    "status": "AKTIF",\n    "programStudi": { "kode": "TI", "nama": "Teknik Informatika" },\n    "roles": ["ADMIN"]\n  }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "UNAUTHENTICATED",\n  "message": "Belum login"\n}',
                },
                "catatan": [
                    "Data dibaca **langsung dari database**, bukan sekadar isi JWT — penonaktifan akun langsung berlaku tanpa menunggu token kedaluwarsa.",
                ],
            },
            {
                "metode": "POST",
                "path": "/api/auth/logout",
                "status": "terverifikasi",
                "ringkas": "Hapus cookie sesi.",
                "auth": "Perlu sesi",
                "body": [],
                "respons": [("200", "Sesi dihapus.")],
                "contoh": {
                    "req": "(tanpa body)",
                    "res": '{\n  "ok": true,\n  "message": "Berhasil logout"\n}',
                    "gagal": "",
                },
                "catatan": [],
            },
        ],
    },
    {
        "kode": "admin",
        "nama": "Administrasi Sistem",
        "warna": "doc",
        "modul": "M8 (selesai) / M9 (rencana)",
        "status": "terverifikasi",
        "ringkas": "Master data, periode akademik, dan form dinamis — **M8 sudah dibangun dan teruji nyata**. Akun pengguna dan log aktivitas menyusul di M9.",
        "endpoint": [
            {
                "metode": "GET", "path": "/api/admin/contoh", "status": "terverifikasi",
                "ringkas": "Rute uji untuk memastikan guard role ADMIN bekerja.",
                "auth": "ADMIN", "body": [],
                "respons": [("200", "Terotorisasi."), ("403", "Role tidak berwenang."), ("401", "Belum login.")],
                "contoh": {"req": "(tanpa body)",
                           "res": '{\n  "ok": true,\n  "message": "Terverifikasi sebagai ADMIN",\n  "sebagai": { "nidn": "9999999001", "roles": ["ADMIN"] }\n}',
                           "gagal": '{\n  "ok": false,\n  "code": "FORBIDDEN",\n  "message": "Rute ini khusus role: ADMIN"\n}'},
                "catatan": ["Uji nyata: reviewer menerima 403, admin menerima 200."],
            },
            {"metode": "GET", "path": "/api/admin/prodi", "status": "terverifikasi", "ringkas": "Daftar program studi.", "auth": "ADMIN", "body": [], "respons": [("200", "Daftar program studi.")], "contoh": {"req": "(tanpa body)", "res": '{\n  "ok": true,\n  "prodi": [\n    { "id": "…", "kode": "MI", "nama": "Manajemen Informatika" },\n    { "id": "…", "kode": "TI", "nama": "Teknik Informatika" }\n  ]\n}', "gagal": ""}, "catatan": []},
            {"metode": "POST", "path": "/api/admin/prodi", "status": "terverifikasi", "ringkas": "Tambah program studi.", "auth": "ADMIN", "body": [("kode", "string", "ya", "Maks. 20 karakter, wajib unik."), ("nama", "string", "ya", "Maks. 100 karakter.")], "respons": [("201", "Dibuat."), ("409", "Kode sudah terpakai."), ("400", "Validasi gagal.")], "contoh": {"req": '{ "kode": "SJ", "nama": "Sistem Jaringan" }', "res": '{\n  "ok": true,\n  "prodi": { "id": "…", "kode": "SJ", "nama": "Sistem Jaringan" }\n}', "gagal": '{\n  "ok": false,\n  "code": "CONFLICT",\n  "message": "Kode \\"SJ\\" sudah dipakai."\n}'}, "catatan": ["Duplikat ditolak **sebelum** menyentuh database, bukan mengandalkan error mentah Prisma."]},
            {"metode": "DELETE", "path": "/api/admin/prodi/:id", "status": "terverifikasi", "ringkas": "Hapus program studi.", "auth": "ADMIN", "body": [], "respons": [("200", "Dihapus."), ("409", "Masih dipakai.")], "contoh": {"req": "(tanpa body)", "res": '{\n  "ok": true,\n  "message": "Program studi dihapus."\n}', "gagal": '{\n  "ok": false,\n  "code": "IN_USE",\n  "message": "Program studi masih dipakai 8 data dan tidak dapat dihapus."\n}'}, "catatan": ["Penghitungan user + proposal dilakukan **sebelum** hapus, sehingga pesannya jelas, bukan error FK 500."]},
            {"metode": "GET", "path": "/api/admin/periode", "status": "terverifikasi", "ringkas": "Daftar periode akademik.", "auth": "ADMIN", "body": [], "respons": [("200", "Daftar periode.")], "contoh": {"req": "(tanpa body)", "res": '{\n  "ok": true,\n  "periode": [\n    { "id": "…", "nama": "2026/2027 Ganjil", "tahunMulai": 2026, "tahunSelesai": 2027, "isActive": true }\n  ]\n}', "gagal": ""}, "catatan": ["Urutan: yang aktif dulu, lalu tahun terbaru."]},
            {"metode": "POST", "path": "/api/admin/periode", "status": "terverifikasi", "ringkas": "Tambah periode akademik.", "auth": "ADMIN", "body": [("nama", "string", "ya", "Maks. 50 karakter."), ("tahunMulai", "number", "ya", "2000–2100."), ("tahunSelesai", "number", "ya", "Harus ≥ tahunMulai."), ("isActive", "boolean", "tidak", "Default false.")], "respons": [("201", "Dibuat."), ("400", "Validasi gagal.")], "contoh": {"req": '{ "nama": "2027/2028 Ganjil", "tahunMulai": 2027, "tahunSelesai": 2028, "isActive": true }', "res": '{\n  "ok": true,\n  "periode": { "id": "…", "nama": "2027/2028 Ganjil", "isActive": true }\n}', "gagal": '{\n  "ok": false,\n  "code": "VALIDATION",\n  "message": "Format permintaan tidak valid",\n  "detail": [{ "field": "tahunSelesai", "message": "harus >= tahunMulai" }]\n}'}, "catatan": []},
            {"metode": "PUT", "path": "/api/admin/periode/:id", "status": "terverifikasi", "ringkas": "Ubah periode — termasuk mengaktifkannya.", "auth": "ADMIN", "body": [("isActive", "boolean", "tidak", "Mengaktifkan otomatis menonaktifkan periode lain.")], "respons": [("200", "Diperbarui."), ("400", "Validasi gagal."), ("404", "Periode tidak ada.")], "contoh": {"req": '{ "isActive": true }', "res": '{\n  "ok": true,\n  "periode": { "id": "…", "nama": "2026/2027 Ganjil", "isActive": true }\n}', "gagal": ""}, "catatan": ["**Jaminan bisnis: tepat satu periode aktif.** Dijalankan dalam satu transaksi Prisma — semua periode lain dinonaktifkan lebih dulu. Teruji: mengaktifkan periode kedua otomatis menonaktifkan yang pertama (jumlah tetap 1)."]},
            {"metode": "GET", "path": "/api/admin/form-field", "status": "terverifikasi", "ringkas": "Konfigurasi field dinamis per jenis proposal.", "auth": "ADMIN", "body": [], "respons": [("200", "Daftar konfigurasi field."), ("400", "`jenis` di luar enum.")], "contoh": {"req": "GET /api/admin/form-field?jenis=KKN", "res": '{\n  "ok": true,\n  "fields": [\n    { "id": "…", "jenisProposal": "KKN", "label": "Desa Sasaran",\n      "tipeInput": "text", "opsi": null, "wajib": true, "urutan": 1 }\n  ]\n}', "gagal": '{\n  "ok": false,\n  "code": "VALIDATION",\n  "message": "jenis tidak dikenal. Pilihan: PENELITIAN, PENGABDIAN, KKN, …"\n}'}, "catatan": ["Kunci unik `(jenisProposal, label)` menjamin tidak ada field ganda — akar perbaikan pada Fase 1.", "Nilai dari klien pada M2 **tidak diterima apa adanya**; hanya field terdaftar di sini yang valid."]},
            {"metode": "POST", "path": "/api/admin/form-field", "status": "terverifikasi", "ringkas": "Tambah konfigurasi field.", "auth": "ADMIN", "body": [("jenisProposal", "enum", "ya", "PENELITIAN | PENGABDIAN | KKN | PENGABDIAN_MASYARAKAT | PKM"), ("label", "string", "ya", "Maks. 150, wajib unik per jenis."), ("tipeInput", "enum", "ya", "text | number | date | select | textarea | file"), ("opsi", "array", "kondisional", "Wajib untuk select; opsi lain null."), ("wajib", "boolean", "tidak", "Default false."), ("urutan", "number", "tidak", "Urutan tampil di form.")], "respons": [("201", "Dibuat."), ("409", "Label sama."), ("400", "Validasi gagal.")], "contoh": {"req": '{ "jenisProposal": "KKN", "label": "Nama Dusun", "tipeInput": "text", "wajib": true, "urutan": 5 }', "res": '{\n  "ok": true,\n  "field": { "id": "…", "label": "Nama Dusun", "urutan": 5 }\n}', "gagal": '{\n  "ok": false,\n  "code": "VALIDATION",\n  "message": "Format permintaan tidak valid",\n  "detail": [{ "field": "opsi", "message": "Tipe select wajib memiliki minimal satu opsi." }]\n}'}, "catatan": ["`select` tanpa opsi ditolak **di level validasi** — mustahil tersimpan field pilihan tanpa pilihan."]},
            {"metode": "DELETE", "path": "/api/admin/form-field/:id", "status": "terverifikasi", "ringkas": "Hapus konfigurasi field.", "auth": "ADMIN", "body": [], "respons": [("200", "Dihapus."), ("404", "Field tidak ada.")], "contoh": {"req": "(tanpa body)", "res": '{\n  "ok": true,\n  "message": "Field dihapus."\n}', "gagal": ""}, "catatan": []},
            {"metode": "POST", "path": "/api/admin/akun", "status": "rencana", "ringkas": "Buat akun dosen/kaprodi/reviewer.", "auth": "ADMIN", "body": [("nidn", "string", "ya", "Unik."), ("nama", "string", "ya", ""), ("role", "enum", "ya", "Salah satu dari RoleName."), ("password", "string", "ya", "Disimpan sebagai bcrypt cost 10.")], "respons": [], "contoh": {"req": "", "res": "", "gagal": ""}, "catatan": []},
        ],
    },
    {
        "kode": "proposal",
        "nama": "Proposal & Tim",
        "warna": "proposal",
        "modul": "M2",
        "status": "rencana",
        "ringkas": "Pengusulan proposal, keanggotaan tim, dan perpindahan status.",
        "endpoint": [
            {"metode": "POST", "path": "/api/proposal", "status": "rencana", "ringkas": "Buat proposal baru (status DRAFT).", "auth": "Semua role", "body": [("judul", "string", "ya", ""), ("jenisProposal", "enum", "ya", "PENELITIAN | PENGABDIAN | KKN | PENGABDIAN_MASYARAKAT | PKM"), ("fieldTambahan", "object", "tidak", "Divalidasi terhadap konfigurasi dari M8."), ("anggota", "array", "tidak", "NIDN anggota tim.")], "respons": [], "contoh": {"req": "", "res": "", "gagal": ""}, "catatan": ["Field tambahan divalidasi terhadap `form_field_configs` — bukan diterima apa adanya."]},
            {"metode": "GET", "path": "/api/proposal", "status": "rencana", "ringkas": "Daftar proposal sesuai role pemohon.", "auth": "Semua role", "body": [], "respons": [], "contoh": {"req": "", "res": "", "gagal": ""}, "catatan": []},
            {"metode": "POST", "path": "/api/proposal/:id/submit", "status": "rencana", "ringkas": "Kirim proposal -> MENUNGGU_VERIFIKASI_KAPRODI.", "auth": "DOSEN", "body": [], "respons": [], "contoh": {"req": "", "res": "", "gagal": ""}, "catatan": ["Transisi status divalidasi terhadap state machine."]},
            {"metode": "GET", "path": "/api/proposal/:id", "status": "rencana", "ringkas": "Detail proposal + riwayat status.", "auth": "Semua role", "body": [], "respons": [], "contoh": {"req": "", "res": "", "gagal": ""}, "catatan": []},
        ],
    },
    {
        "kode": "verifikasi",
        "nama": "Verifikasi & Review (Tie-Breaker)",
        "warna": "review",
        "modul": "M3",
        "status": "terverifikasi",
        "ringkas": "Verifikasi 2 tahap (Kaprodi lalu Admin), penugasan reviewer, penilaian blind, dan keputusan rapat offline.",
        "endpoint": [
            {"metode": "POST", "path": "/api/proposal/:id/verifikasi", "status": "terverifikasi", "ringkas": "Catat keputusan verifikasi tahap berjalan.", "auth": "KAPRODI, ADMIN", "body": [("keputusan", "enum", "ya", "SETUJUI | REVISI | TOLAK."), ("catatan", "string", "kondisional", "Wajib bila REVISI atau TOLAK.")], "respons": [("200", "Keputusan tercatat, status proposal bergeser."), ("403", "Tahap tidak sesuai role atau sudah lewat."), ("400", "`keputusan` di luar enum.")], "contoh": {"req": "POST /api/proposal/2995014c…/verifikasi\n{\n  \"keputusan\": \"SETUJUI\"\n}", "res": '{\n  "ok": true,\n  "tahap": "KAPRODI",\n  "verifikasi": { "keputusan": "SETUJUI", "catatan": null },\n  "proposal": { "status": "MENUNGGU_VERIFIKASI_ADMIN" }\n}', "gagal": '{\n  "ok": false,\n  "code": "VERIFIKASI_TIDAK_SAHIH",\n  "message": "Tahap KAPRODI khusus role KAPRODI. Role Anda: ADMIN."\n}'}, "catatan": ["**Tahap tidak pernah diambil dari body** — diturunkan dari status proposal, sehingga klien tidak bisa melompati tahap.", "Tahap ADMIN menuntut tahap Kaprodi sudah `SETUJUI`, dicek ulang dari tabel `verifications`."]},
            {"metode": "GET", "path": "/api/proposal/:id/verifikasi", "status": "terverifikasi", "ringkas": "Riwayat verifikasi berurutan.", "auth": "ADMIN, KAPRODI", "body": [], "respons": [("200", "Daftar riwayat verifikasi."), ("403", "Role selain ADMIN/KAPRODI.")], "contoh": {"req": "GET /api/proposal/2995014c…/verifikasi", "res": '{\n  "ok": true,\n  "jumlah": 1,\n  "riwayat": [ { "tahap": "KAPRODI", "keputusan": "SETUJUI",\n    "verifikator": { "nidn": "0412345678", "nama": "Kaprodi TI" } } ]\n}', "gagal": ""}, "catatan": []},
            {"metode": "POST", "path": "/api/proposal/:id/reviewer", "status": "terverifikasi", "ringkas": "Tugaskan Reviewer 1 dan 2 sekaligus.", "auth": "ADMIN", "body": [("reviewer", "array", "ya", "Tepat 2 entri: `{ urutanReviewer, nidn }`, urutan 1 dan 2, orang berbeda.")], "respons": [("201", "Kedua reviewer tercatat."), ("400", "Urutan kembar atau reviewer sama."), ("409", "Pengusul jadi reviewer / bukan role REVIEWER."), ("409", "Status proposal belum `MENUNGGU_REVIEW`.")], "contoh": {"req": "POST /api/proposal/5f9f44cc…/reviewer\n{\n  \"reviewer\": [\n    { \"urutanReviewer\": 1, \"nidn\": \"0412345682\" },\n    { \"urutanReviewer\": 2, \"nidn\": \"0412345683\" }\n  ]\n}", "res": '{\n  "ok": true,\n  "proposal": { "status": "MENUNGGU_REVIEW" },\n  "reviewer": [ { "urutanReviewer": 1, "reviewer": { "nidn": "0412345682" } } ]\n}', "gagal": '{\n  "ok": false,\n  "code": "REVIEWER_KONFLIK_KEPENTINGAN",\n  "message": "NIDN 0412345680 adalah pengusul proposal ini."\n}'}, "catatan": ["`urutan_reviewer` (1|2) **menggantikan kolom lama `reviewer2_id`** yang bermasalah.", "`@@unique([proposalId, urutanReviewer])` menjamin tiap urutan terisi tepat satu orang."]},
            {"metode": "GET", "path": "/api/proposal/:id/review", "status": "terverifikasi", "ringkas": "Tampilan penilaian (BLIND) — hanya nilai milik sendiri.", "auth": "REVIEWER", "body": [], "respons": [("200", "Detail proposal + `nilaiSaya` + `progres`."), ("404", "Pemohon bukan reviewer proposal ini.")], "contoh": {"req": "GET /api/proposal/5f9f44cc…/review", "res": '{\n  "ok": true,\n  "proposal": { "judul": "…", "dosen": { "nidn": "0412345680" } },\n  "nilaiSaya": { "urutanReviewer": 1, "skor": 85, "rekomendasi": "TERIMA" },\n  "progres": [ { "urutanReviewer": 1, "sudahMenilai": true },\n              { "urutanReviewer": 2, "sudahMenilai": false } ],\n  "blind": true\n}', "gagal": ""}, "catatan": ["**Isolasi dijaga di lapis query**: `where { proposalId, reviewerId: user }` — tidak pernah ada query yang membaca baris reviewer lain.", "`progres` hanya memuat `urutanReviewer` + boolean; tanpa skor, tanpa identitas reviewer lain."]},
            {"metode": "POST", "path": "/api/proposal/:id/review", "status": "terverifikasi", "ringkas": "Kirim nilai; memicu tie-breaker bila kedua reviewer selesai.", "auth": "REVIEWER", "body": [("skor", "number", "ya", "0–100."), ("rekomendasi", "enum", "ya", "TERIMA | REVISI | TOLAK."), ("catatan", "string", "tidak", "")], "respons": [("200", "Nilai tercatat; bila lengkap, `hasilKombinasi` terbentuk."), ("404", "Bukan reviewer proposal ini."), ("409", "Status proposal bukan `MENUNGGU_REVIEW`.")], "contoh": {"req": "POST /api/proposal/5f9f44cc…/review\n{\n  \"skor\": 85,\n  \"rekomendasi\": \"TERIMA\"\n}", "res": '{\n  "ok": true,\n  "nilaiSaya": { "skor": 85, "rekomendasi": "TERIMA" },\n  "menungguReviewerLain": true,\n  "pesan": "Nilai Anda tercatat. Menunggu Reviewer lain."\n}', "gagal": '{\n  "ok": false,\n  "code": "BUKAN_REVIEWER_PROPOSAL_INI",\n  "message": "Anda tidak ditugaskan menilai proposal ini."\n}'}, "catatan": ["Nilai reviewer lain ikut dibaca **oleh sistem** untuk menghitung kombinasi — bukan oleh reviewer.", "Status proposal berubah otomatis mengikuti hasil kombinasi."]},
            {"metode": "POST", "path": "/api/proposal/:id/keputusan", "status": "terverifikasi", "ringkas": "Keputusan rapat offline (skenario sengketa).", "auth": "ADMIN", "body": [("keputusanAkhir", "enum", "ya", "LOLOS | REVISI | DITOLAK."), ("catatan", "string", "tidak", "Catatan rapat.")], "respons": [("200", "Keputusan tercatat, status proposal bergeser."), ("403", "Role selain ADMIN."), ("409", "Status bukan `PERLU_KEPUTUSAN` atau skenario bukan `TERIMA_TOLAK`.")], "contoh": {"req": "POST /api/proposal/fca0a2cf…/keputusan\n{\n  \"keputusanAkhir\": \"LOLOS\",\n  \"catatan\": \"Rapat 29 Okt: inovasi menutupi kelemahan anggaran.\"\n}", "res": '{\n  "ok": true,\n  "evaluasi": { "hasilKombinasi": "TERIMA_TOLAK", "keputusanAkhir": "LOLOS",\n                 "pejabat": { "nidn": "9999999001", "nama": "Admin LPPM" } },\n  "proposal": { "status": "LOLOS" }\n}', "gagal": '{\n  "ok": false,\n  "code": "PUTUSAN_TIDAK_DIPERLUKAN",\n  "message": "Proposal berstatus LOLOS. Rapat offline hanya untuk skenario PERLU_KEPUTUSAN."\n}'}, "catatan": ["Dipakai **hanya** saat `hasilKombinasi = TERIMA_TOLAK`; skenario lain sudah diputuskan otomatis.", "`diputuskanOleh` dicatat sebagai jejak audit keputusan rapat."]},
            {"metode": "GET", "path": "/api/proposal/:id/keputusan", "status": "terverifikasi", "ringkas": "Baca hasil kombinasi reviewer.", "auth": "Semua role (nilai rinci hanya ADMIN & KAPRODI)", "body": [], "respons": [("200", "Hasil evaluasi; `detail` hanya untuk ADMIN & KAPRODI.")], "contoh": {"req": "GET /api/proposal/fca0a2cf…/keputusan", "res": '{\n  "ok": true,\n  "evaluasi": { "hasilKombinasi": "TERIMA_TOLAK", "keputusanAkhir": "LOLOS" },\n  "detail": [ { "urutanReviewer": 1, "skor": 85, "rekomendasi": "TERIMA" } ]\n}', "gagal": ""}, "catatan": ["Pembatasan `detail` berdasarkan kepentingan — reviewer tidak melihat nilai rinci lewat endpoint ini."]},
        ],
    },
    {
        "kode": "dokumen",
        "nama": "Penerbitan Dokumen SK & ST",
        "warna": "doc",
        "modul": "M4",
        "status": "terverifikasi",
        "ringkas": "Sumber dana menjelang cetak, penomoran otomatis tahunan, dan generator PDF.",
        "endpoint": [
            {"metode": "PUT", "path": "/api/proposal/:id/sumber-dana", "status": "terverifikasi", "ringkas": "Isi sumber dana menjelang cetak SK/ST.", "auth": "ADMIN", "body": [("sumberDana", "enum", "ya", "INTERNAL | EKSTERNAL | MANDIRI.")], "respons": [("200", "Sumber dana tersimpan."), ("403", "Role selain ADMIN."), ("400", "Nilai di luar enum."), ("409", "Status belum lolos penilaian reviewer.")], "contoh": {"req": "PUT /api/proposal/2093cc76…/sumber-dana\n{\n  \"sumberDana\": \"EKSTERNAL\"\n}", "res": '{\n  "ok": true,\n  "proposal": { "id": "2093cc76…", "status": "LOLOS", "sumberDana": "EKSTERNAL" },\n  "message": "Sumber dana disetel EKSTERNAL."\n}', "gagal": '{\n  "ok": false,\n  "code": "STATUS_BELUM_SIAP",\n  "message": "Proposal berstatus MENUNGGU_REVIEW. Sumber dana diisi setelah lolos penilaian reviewer."\n}'}, "catatan": ["Diisi **menjelang cetak**, bukan saat pengusulan — sumber anggaran belum pasti pada tahap proposal diajukan.", "Status yang boleh: `LOLOS` atau `MENUNGGU_SK_ST`."]},
            {"metode": "GET", "path": "/api/proposal/:id/sumber-dana", "status": "terverifikasi", "ringkas": "Baca sumber dana beserta pilihan yang tersedia.", "auth": "Semua role", "body": [], "respons": [("200", "Nilai saat ini, daftar pilihan, dan flag `dapatDiisi`.")], "contoh": {"req": "GET /api/proposal/2093cc76…/sumber-dana", "res": '{\n  "ok": true,\n  "sumberDana": "EKSTERNAL",\n  "pilihan": ["INTERNAL", "EKSTERNAL", "MANDIRI"],\n  "dapatDiisi": true\n}', "gagal": ""}, "catatan": ["`dapatDiisi` memungkinkan antarmuka menonaktifkan isian sebelum waktunya tanpa menebak aturan."]},
            {"metode": "POST", "path": "/api/proposal/:id/dokumen", "status": "terverifikasi", "ringkas": "Terbitkan SK atau ST dengan penomoran otomatis.", "auth": "ADMIN", "body": [("jenis", "enum", "ya", "SK | ST."), ("tahun", "number", "tidak", "Default tahun berjalan.")], "respons": [("201", "Dokumen terbit dengan nomor."), ("403", "Role selain ADMIN."), ("409", "SK ganda / ST sebelum SK / sumber dana kosong / status belum siap."), ("409", "Nomor bentrok akibat penerbitan serentak — ulangi.")], "contoh": {"req": "POST /api/proposal/2093cc76…/dokumen\n{\n  \"jenis\": \"SK\"\n}", "res": '{\n  "ok": true,\n  "dokumen": { "nomorSk": "SK/LPPM/0003/2026", "nomorSt": null,\n                "tanggalTerbit": "2026-10-29" },\n  "nomorSk": "SK/LPPM/0003/2026",\n  "unduh": "/api/proposal/2093cc76…/dokumen/sk.pdf"\n}', "gagal": '{\n  "ok": false,\n  "code": "SK_BELUM_TERBIT",\n  "message": "Surat Tugas hanya dapat diterbitkan setelah SK terbit."\n}'}, "catatan": ["Bentuk nomor: `{SK|ST}/LPPM/{urut 4 digit}/{tahun}` — **deret terpisah per prefix**.", "Keunikan dijamin `@@unique([nomorSk])` + `@@unique([nomorSt])`, sehingga penerbitan serentak tidak pernah menghasilkan nomor ganda.", "Seluruh pemeriksaan berada di dalam satu transaksi."]},
            {"metode": "GET", "path": "/api/proposal/:id/dokumen", "status": "terverifikasi", "ringkas": "Baca status dokumen proposal.", "auth": "Semua role", "body": [], "respons": [("200", "Nomor SK/ST, tanggal terbit, pembuat, dan tautan unduh.")], "contoh": {"req": "GET /api/proposal/2093cc76…/dokumen", "res": '{\n  "ok": true,\n  "proposal": { "status": "LOLOS", "sumberDana": "EKSTERNAL" },\n  "dokumen": { "nomorSk": "SK/LPPM/0003/2026", "nomorSt": "ST/LPPM/0002/2026" },\n  "dapatTerbit": true,\n  "unduh": { "sk": "…/dokumen/sk.pdf", "st": "…/dokumen/st.pdf" }\n}', "gagal": ""}, "catatan": []},
            {"metode": "GET", "path": "/api/proposal/:id/dokumen/sk.pdf", "status": "terverifikasi", "ringkas": "Unduh Surat Keputusan (PDF A4).", "auth": "Semua role", "body": [], "respons": [("200", "`application/pdf` — naskah dinas: kop surat, nomor, tabel rinci, blok tanda tangan."), ("404", "Dokumen atau nomor belum terbit.")], "contoh": {"req": "GET /api/proposal/2093cc76…/dokumen/sk.pdf", "res": "(berkas PDF, 47.010 byte, halaman A4)", "gagal": '{\n  "ok": false,\n  "code": "NOMOR_BELUM_ADA",\n  "message": "Surat Keputusan belum terbit."\n}'}, "catatan": ["Dirender saat diminta lewat chromium sistem (`puppeteer-core`) sehingga hasil identik dengan tampilan layar.", "Tahun terbit diturunkan dari `tanggalTerbit`, bukan dari input klien.", "Tanda tangan diisi oleh pejabat yang menerbitkan dokumen."]},
        ],
    },
    {
        "kode": "m5-rekap",
    "nama": "Rekap Eksekutif & Drill-down",
    "warna": "doc",
    "modul": "M5",
    "status": "terverifikasi",
    "ringkas": "Agregasi statistik LPPM dengan filter periode akademik, drill-down ke rincian, serta export Excel dan PDF. Semua sudah dibangun dan teruji nyata.",
    "endpoint": [
        {
            "metode": "GET",
            "path": "/api/rekap/periode",
            "status": "terverifikasi",
            "ringkas": "Daftar periode akademik untuk mengisi filter rekap.",
            "auth": "Semua role terautentikasi",
            "body": [],
            "respons": [
                [
                    "200",
                    "Daftar periode terurut tahun terbaru."
                ],
                [
                    "401",
                    "Belum login."
                ]
            ],
            "contoh": {
                "req": "GET /api/rekap/periode",
                "res": "{\n  \"ok\": true,\n  \"periode\": [\n    {\n      \"id\": \"7bd43fe1-…\",\n      \"nama\": \"2027/2028 Ganjil\",\n      \"tahunMulai\": 2027,\n      \"tahunSelesai\": 2028,\n      \"isActive\": true\n    }\n  ],\n  \"jumlah\": 9\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"UNAUTHENTICATED\",\n  \"message\": \"Sesi tidak ditemukan.\"\n}"
            },
            "catatan": [
                "Urutan: tahun mulai terbaru, lalu nama.",
                "Kolom asli model hanya tahunMulai/tahunSelesai — tidak ada tahunAkademik."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/admin/rekap",
            "status": "terverifikasi",
            "ringkas": "Rekap eksekutif seluruh program studi.",
            "auth": "ADMIN",
            "body": [
                [
                    "periodeId",
                    "string",
                    "tidak",
                    "ID periode akademik."
                ],
                [
                    "tahunAkademik",
                    "number",
                    "tidak",
                    "Tahun mulai; alternatif bila periodeId kosong."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Objek rekap lengkap."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ],
                [
                    "404",
                    "Periode tidak ditemukan."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/rekap?periodeId=7bd43fe1-…",
                "res": "{\n  \"ok\": true,\n  \"periode\": { \"nama\": \"2027/2028 Ganjil\", \"isActive\": true },\n  \"totalProposal\": 12,\n  \"perStatus\": [\n    { \"tahap\": \"Pra-Kirim\", \"jumlah\": 1 },\n    { \"tahap\": \"Menunggu Verifikasi\", \"jumlah\": 2 },\n    { \"tahap\": \"Penilaian Reviewer\", \"jumlah\": 3 },\n    { \"tahap\": \"Perlu Revisi\", \"jumlah\": 1 },\n    { \"tahap\": \"Lolos\", \"jumlah\": 4 },\n    { \"tahap\": \"Ditolak\", \"jumlah\": 1 }\n  ],\n  \"perJenis\": [ { \"jenis\": \"PENELITIAN\", \"jumlah\": 8 } ],\n  \"perProdi\": [ { \"programStudi\": \"Teknik Informatika\", \"jumlah\": 7 } ],\n  \"jumlahPenilaianReviewer\": 14,\n  \"cakupan\": \"SEMUA_PRODI\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"FORBIDDEN\",\n  \"message\": \"Rekap eksekutif khusus role ADMIN.\"\n}"
            },
            "catatan": [
                "Angka dihitung ulang dari tabel proposal — tidak ada tabel agregat tersimpan, sehingga tidak mungkin usang.",
                "9 status mentah dipetakan ke 6 bucket agar laporan tidak terpecah jadi belasan baris.",
                "Tanpa parameter, memakai periode aktif — bukan baris sembarang.",
                "Jumlah bucket perStatus selalu sama dengan totalProposal."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/admin/rekap/rincian",
            "status": "terverifikasi",
            "ringkas": "Drill-down: angka rekap menjadi daftar proposal, dosen, atau reviewer.",
            "auth": "ADMIN",
            "body": [
                [
                    "dimensi",
                    "enum",
                    "ya",
                    "status | jenis | prodi | dosen | reviewer"
                ],
                [
                    "nilai",
                    "string",
                    "ya",
                    "Nilai yang diklik pada rekap."
                ],
                [
                    "periodeId",
                    "string",
                    "tidak",
                    "Batasi satu periode."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Jumlah dan daftar rincian."
                ],
                [
                    "400",
                    "dimensi/nilai tidak diisi."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/rekap/rincian?dimensi=status&nilai=Lolos",
                "res": "{\n  \"ok\": true,\n  \"dimensi\": \"status\",\n  \"nilai\": \"Lolos\",\n  \"jumlah\": 4,\n  \"rincian\": [\n    {\n      \"id\": \"…\",\n      \"judul\": \"Sistem Informasi Kearsipan Digital\",\n      \"jenis\": \"PENELITIAN\",\n      \"status\": \"MENUNGGU_SK_ST\",\n      \"pengusul\": \"0412345680 Dr. Dosen Satu\",\n      \"programStudi\": \"Teknik Informatika\",\n      \"terakhirDiubah\": \"2026-10-29T04:30:00.000Z\"\n    }\n  ]\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"PARAMETER_KURANG\",\n  \"message\": \"Parameter dimensi dan nilai wajib diisi.\"\n}"
            },
            "catatan": [
                "Nilai status dikirim sebagai bucket, lalu diterjemahkan balik ke status mentah sebelum dicari — inilah yang membuat angka rekap dan rinciannya selalu cocok.",
                "Dimensi dosen memakai OR atas pengusul dan anggota tim, karena satu dosen bisa muncul dengan dua peran.",
                "Jumlah dihitung ulang dari baris yang benar-benar dikembalikan."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/kaprodi/rekap",
            "status": "terverifikasi",
            "ringkas": "Rekap untuk program studi sendiri.",
            "auth": "KAPRODI",
            "body": [
                [
                    "periodeId",
                    "string",
                    "tidak",
                    "ID periode akademik."
                ],
                [
                    "tahunAkademik",
                    "number",
                    "tidak",
                    "Tahun mulai."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Objek rekap dengan cakupan PRODI."
                ],
                [
                    "400",
                    "Akun belum terikat prodi."
                ],
                [
                    "403",
                    "Role selain KAPRODI."
                ],
                [
                    "404",
                    "Periode tidak ditemukan."
                ]
            ],
            "contoh": {
                "req": "GET /api/kaprodi/rekap",
                "res": "{\n  \"ok\": true,\n  \"cakupan\": \"PRODI\",\n  \"programStudi\": \"Teknik Informatika\",\n  \"totalProposal\": 7,\n  \"perStatus\": [ … ],\n  \"perProdi\": [ { \"programStudi\": \"Teknik Informatika\", \"jumlah\": 7 } ]\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"PRODI_BELUM_DISET\",\n  \"message\": \"Akun ini belum terikat pada program studi, sehingga rekap tidak dapat dihitung.\"\n}"
            },
            "catatan": [
                "programStudiId diturunkan dari akun, bukan dari parameter klien — Kaprodi tidak bisa meminta angka prodi lain."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/kaprodi/rekap/rincian",
            "status": "terverifikasi",
            "ringkas": "Drill-down terbatas prodi sendiri.",
            "auth": "KAPRODI",
            "body": [
                [
                    "dimensi",
                    "enum",
                    "ya",
                    "status | jenis | prodi | dosen | reviewer"
                ],
                [
                    "nilai",
                    "string",
                    "ya",
                    "Nilai yang diklik."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Rincian terbatas prodi sendiri."
                ],
                [
                    "403",
                    "Role selain KAPRODI."
                ]
            ],
            "contoh": {
                "req": "GET /api/kaprodi/rekap/rincian?dimensi=jenis&nilai=PENELITIAN",
                "res": "{\n  \"ok\": true,\n  \"cakupan\": \"PRODI\",\n  \"dimensi\": \"jenis\",\n  \"jumlah\": 5,\n  \"rincian\": [ … ]\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"FORBIDDEN\",\n  \"message\": \"Rincian rekap khusus role KAPRODI.\"\n}"
            },
            "catatan": [
                "Pembatasan prodi diterapkan di query, bukan lewat cek terpisah."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/admin/rekap/export",
            "status": "terverifikasi",
            "ringkas": "Export rekap ke Excel (.xlsx) atau PDF.",
            "auth": "ADMIN",
            "body": [
                [
                    "format",
                    "enum",
                    "tidak",
                    "xlsx (default) | pdf"
                ],
                [
                    "periodeId",
                    "string",
                    "tidak",
                    "ID periode akademik."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Berkas unduhan."
                ],
                [
                    "400",
                    "Format tidak didukung."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ],
                [
                    "404",
                    "Periode tidak ditemukan."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/rekap/export?format=xlsx",
                "res": "(berkas .xlsx — 6 arsip ZIP+XML, lembar Rekap, 3 kolom: Kategori, Jenis, Jumlah)",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"FORMAT_TIDAK_DIDUKUNG\",\n  \"message\": \"Format export hanya xlsx atau pdf.\"\n}"
            },
            "catatan": [
                "Excel ditulis tangan sebagai arsip ZIP+XML lewat adm-zip sekitar 300 KB, bukan pustaka spreadsheet berat.",
                "Diverifikasi dengan pembaca xlsx sungguhan (openpyxl): sel numerik terbaca sebagai angka, bukan teks.",
                "PDF dirender chromium sehingga tampilannya konsisten dengan SK/ST.",
                "Berkas dikirim dengan Content-Disposition: attachment."
            ]
        }
    ],
    },
    {
        "kode": "m6-konten",
    "nama": "Konten Publik (CMS Berita, Galeri, Dokumen)",
    "warna": "doc",
    "modul": "M6",
    "status": "terverifikasi",
    "ringkas": "CMS berita berjenjang Draft, Review, Publish, ditambah galeri dan dokumen publik tanpa tahap tinjauan. Sudah dibangun dan teruji nyata.",
    "endpoint": [
        {
            "metode": "GET",
            "path": "/api/admin/berita",
            "status": "terverifikasi",
            "ringkas": "Daftar berita beserta hitungan per status.",
            "auth": "ADMIN",
            "body": [
                [
                    "status",
                    "enum",
                    "tidak",
                    "DRAFT | REVIEW | TERBIT — kosongkan untuk semua."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Daftar berita dan hitungan per status."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/berita?status=DRAFT",
                "res": "{\n  \"ok\": true,\n  \"berita\": [\n    {\n      \"id\": \"…\",\n      \"judul\": \"Workshop Metodologi 2026\",\n      \"kategori\": \"Kegiatan\",\n      \"gambar\": null,\n      \"status\": \"DRAFT\",\n      \"publishedAt\": null,\n      \"createdAt\": \"2026-10-29T04:30:00.000Z\",\n      \"penulis\": { \"nidn\": \"9999999001\", \"nama\": \"Admin LPPM\" }\n    }\n  ],\n  \"jumlah\": 1,\n  \"perStatus\": { \"DRAFT\": 1, \"TERBIT\": 3 }\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"FORBIDDEN\",\n  \"message\": \"Khusus role ADMIN.\"\n}"
            },
            "catatan": [
                "Konten sengaja tidak ikut di daftar — hanya diambil saat satu berita dibuka, agar daftar ringan."
            ]
        },
        {
            "metode": "POST",
            "path": "/api/admin/berita",
            "status": "terverifikasi",
            "ringkas": "Tulis berita baru — selalu mulai sebagai DRAFT.",
            "auth": "ADMIN",
            "body": [
                [
                    "judul",
                    "string",
                    "ya",
                    "Maks. 255 karakter."
                ],
                [
                    "konten",
                    "text",
                    "ya",
                    "Isi berita."
                ],
                [
                    "kategori",
                    "string",
                    "tidak",
                    "Maks. 100 karakter."
                ],
                [
                    "gambar",
                    "string",
                    "tidak",
                    "Path gambar, maks. 255 karakter."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Berita tersimpan sebagai DRAFT."
                ],
                [
                    "400",
                    "Validasi gagal."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "POST /api/admin/berita dengan body { judul, konten, kategori }",
                "res": "{\n  \"ok\": true,\n  \"berita\": { \"id\": \"…\", \"status\": \"DRAFT\", \"publishedAt\": null },\n  \"message\": \"Berita disimpan sebagai DRAFT.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"VALIDASI_GAGAL\",\n  \"message\": \"Judul wajib diisi.\"\n}"
            },
            "catatan": [
                "Status selalu DRAFT — klien tidak bisa menentukan status awal.",
                "Penulis diambil dari sesi, bukan dari body."
            ]
        },
        {
            "metode": "PATCH",
            "path": "/api/admin/berita/:id",
            "status": "terverifikasi",
            "ringkas": "Sunting isi berita yang belum tayang.",
            "auth": "ADMIN",
            "body": [
                [
                    "judul",
                    "string",
                    "tidak",
                    "Maks. 255 karakter."
                ],
                [
                    "konten",
                    "text",
                    "tidak",
                    "Isi berita."
                ],
                [
                    "kategori",
                    "string",
                    "tidak",
                    "Maks. 100 karakter."
                ],
                [
                    "gambar",
                    "string",
                    "tidak",
                    "Path gambar."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Berita diperbarui."
                ],
                [
                    "404",
                    "Berita tidak ditemukan."
                ],
                [
                    "409",
                    "Berita sudah TERBIT — tarik dulu ke DRAFT."
                ]
            ],
            "contoh": {
                "req": "PATCH /api/admin/berita/ab12… dengan body { judul: 'Judul Baru' }",
                "res": "{\n  \"ok\": true,\n  \"berita\": { \"id\": \"…\", \"judul\": \"Judul Baru\", \"status\": \"DRAFT\" },\n  \"message\": \"Berita diperbarui.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"SUDAH_TAYANG\",\n  \"message\": \"Berita yang sudah terbit tidak dapat disunting. Tarik dulu ke DRAFT.\"\n}"
            },
            "catatan": [
                "Berita TERBIT tidak bisa disunting: versi yang tayang tidak boleh berubah diam-diam di bawah kaki pembaca yang sedang membacanya."
            ]
        },
        {
            "metode": "POST",
            "path": "/api/admin/berita/:id/ajukan",
            "status": "terverifikasi",
            "ringkas": "Ajukan berita dari DRAFT ke REVIEW.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Berita masuk tahap REVIEW."
                ],
                [
                    "404",
                    "Berita tidak ditemukan."
                ],
                [
                    "409",
                    "Transisi tidak sah."
                ]
            ],
            "contoh": {
                "req": "POST /api/admin/berita/ab12…/ajukan",
                "res": "{\n  \"ok\": true,\n  \"berita\": { \"id\": \"…\", \"status\": \"REVIEW\" },\n  \"message\": \"Berita diajukan untuk ditinjau.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"TRANSISI_TIDAK_SAH\",\n  \"message\": \"Berita berstatus TERBIT tidak dapat diubah langsung menjadi REVIEW.\"\n}"
            },
            "catatan": [
                "Lompatan DRAFT ke TERBIT ditolak — tinjauan mendahului terbit."
            ]
        },
        {
            "metode": "POST",
            "path": "/api/admin/berita/:id/terbit",
            "status": "terverifikasi",
            "ringkas": "Terbitkan berita dari REVIEW — mulai tayang di publik.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Berita terbit; publishedAt terisi."
                ],
                [
                    "404",
                    "Berita tidak ditemukan."
                ],
                [
                    "409",
                    "Bukan dari REVIEW."
                ]
            ],
            "contoh": {
                "req": "POST /api/admin/berita/ab12…/terbit",
                "res": "{\n  \"ok\": true,\n  \"berita\": {\n    \"id\": \"…\",\n    \"status\": \"TERBIT\",\n    \"publishedAt\": \"2026-10-29T04:30:00.000Z\"\n  },\n  \"message\": \"Berita terbit dan tayang di publik.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"TRANSISI_TIDAK_SAH\",\n  \"message\": \"Berita berstatus DRAFT. Terbit hanya boleh dari REVIEW.\"\n}"
            },
            "catatan": [
                "publishedAt diisi saat terbit, dan dikosongkan saat ditarik — urutan tayang selalu mengikuti waktu terbit sebenarnya."
            ]
        },
        {
            "metode": "POST",
            "path": "/api/admin/berita/:id/tarik",
            "status": "terverifikasi",
            "ringkas": "Cabut berita dari tayangan publik.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Berita kembali DRAFT; hilang dari publik."
                ],
                [
                    "404",
                    "Berita tidak ditemukan."
                ],
                [
                    "409",
                    "Sudah berstatus DRAFT."
                ]
            ],
            "contoh": {
                "req": "POST /api/admin/berita/ab12…/tarik",
                "res": "{\n  \"ok\": true,\n  \"berita\": { \"id\": \"…\", \"status\": \"DRAFT\", \"publishedAt\": null },\n  \"message\": \"Berita ditarik dan tidak lagi tayang.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"TRANSISI_TIDAK_SAH\",\n  \"message\": \"Berita sudah berstatus DRAFT.\"\n}"
            },
            "catatan": [
                "Berlaku untuk TERBIT maupun REVIEW."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/public/berita",
            "status": "terverifikasi",
            "ringkas": "Daftar berita tayang — tanpa login.",
            "auth": "Publik",
            "body": [
                [
                    "halaman",
                    "number",
                    "tidak",
                    "Nomor halaman, default 1."
                ],
                [
                    "per",
                    "number",
                    "tidak",
                    "Per halaman, default 10, maks. 50."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Daftar berita berstatus TERBIT."
                ]
            ],
            "contoh": {
                "req": "GET /api/public/berita",
                "res": "{\n  \"ok\": true,\n  \"berita\": [\n    {\n      \"id\": \"…\",\n      \"judul\": \"Workshop Metodologi 2026\",\n      \"kategori\": \"Kegiatan\",\n      \"gambar\": null,\n      \"publishedAt\": \"2026-10-29T04:30:00.000Z\",\n      \"penulis\": { \"nama\": \"Admin LPPM\" }\n    }\n  ],\n  \"total\": 3,\n  \"halaman\": 1,\n  \"perHalaman\": 10\n}",
                "gagal": ""
            },
            "catatan": [
                "Hanya status TERBIT. Berita DRAFT/REVIEW tidak pernah muncul."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/public/berita/:id",
            "status": "terverifikasi",
            "ringkas": "Rincian satu berita tayang — tanpa login.",
            "auth": "Publik",
            "body": [],
            "respons": [
                [
                    "200",
                    "Berita lengkap beserta konten."
                ],
                [
                    "404",
                    "Berita tidak ditemukan atau belum tayang."
                ]
            ],
            "contoh": {
                "req": "GET /api/public/berita/ab12…",
                "res": "{\n  \"ok\": true,\n  \"berita\": {\n    \"id\": \"…\",\n    \"judul\": \"Workshop Metodologi 2026\",\n    \"konten\": \"LPPM menggelar workshop metodologi…\",\n    \"kategori\": \"Kegiatan\",\n    \"gambar\": null,\n    \"publishedAt\": \"2026-10-29T04:30:00.000Z\",\n    \"penulis\": { \"nama\": \"Admin LPPM\" }\n  }\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"NOT_FOUND\",\n  \"message\": \"Berita tidak ditemukan.\"\n}"
            },
            "catatan": [
                "Berita DRAFT/REVIEW mengembalikan 404, bukan 403 — bila memakai 403, responsnya sendiri membocorkan keberadaan tulisan yang belum tayang."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/admin/galeri",
            "status": "terverifikasi",
            "ringkas": "Daftar foto galeri (semua).",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Daftar foto."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/galeri",
                "res": "{\n  \"ok\": true,\n  \"galeri\": [\n    {\n      \"id\": \"…\",\n      \"judul\": \"Kegiatan Pengabdian Desa\",\n      \"deskripsi\": null,\n      \"fotoPath\": \"/uploads/galeri/desa-2026.jpg\",\n      \"kategori\": \"Pengabdian\",\n      \"createdAt\": \"2026-10-29T04:30:00.000Z\"\n    }\n  ],\n  \"jumlah\": 1\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"FORBIDDEN\",\n  \"message\": \"Khusus role ADMIN.\"\n}"
            },
            "catatan": [
                "Galeri tidak punya tahap tinjauan — unggahan langsung tayang."
            ]
        },
        {
            "metode": "POST",
            "path": "/api/admin/galeri",
            "status": "terverifikasi",
            "ringkas": "Tambah foto ke galeri.",
            "auth": "ADMIN",
            "body": [
                [
                    "judul",
                    "string",
                    "ya",
                    "Maks. 200 karakter."
                ],
                [
                    "fotoPath",
                    "string",
                    "ya",
                    "Path berkas, maks. 255 karakter."
                ],
                [
                    "deskripsi",
                    "text",
                    "tidak",
                    "Keterangan foto."
                ],
                [
                    "kategori",
                    "string",
                    "tidak",
                    "Maks. 100 karakter."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Foto ditambahkan."
                ],
                [
                    "400",
                    "Validasi gagal."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "POST /api/admin/galeri dengan body { judul, fotoPath, kategori }",
                "res": "{\n  \"ok\": true,\n  \"galeri\": { \"id\": \"…\", \"judul\": \"Kegiatan Pengabdian Desa\", \"fotoPath\": \"/uploads/galeri/desa-2026.jpg\" },\n  \"message\": \"Foto ditambahkan ke galeri.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"VALIDASI_GAGAL\",\n  \"message\": \"Path foto wajib diisi.\"\n}"
            },
            "catatan": [
                "fotoPath adalah lokasi berkas; unggahan berkasnya sendiri ditangani di luar API ini."
            ]
        },
        {
            "metode": "DELETE",
            "path": "/api/admin/galeri/:id",
            "status": "terverifikasi",
            "ringkas": "Hapus satu foto galeri.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Foto dihapus."
                ],
                [
                    "404",
                    "Foto tidak ditemukan."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "DELETE /api/admin/galeri/cd34…",
                "res": "{\n  \"ok\": true,\n  \"terhapus\": true,\n  \"message\": \"Foto dihapus dari galeri.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"NOT_FOUND\",\n  \"message\": \"Data tidak ditemukan.\"\n}"
            },
            "catatan": []
        },
        {
            "metode": "GET",
            "path": "/api/public/galeri",
            "status": "terverifikasi",
            "ringkas": "Daftar foto galeri publik — tanpa login.",
            "auth": "Publik",
            "body": [
                [
                    "halaman",
                    "number",
                    "tidak",
                    "Nomor halaman."
                ],
                [
                    "per",
                    "number",
                    "tidak",
                    "Per halaman, default 20, maks. 100."
                ],
                [
                    "kategori",
                    "string",
                    "tidak",
                    "Saring per kategori."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Daftar foto."
                ]
            ],
            "contoh": {
                "req": "GET /api/public/galeri?kategori=Pengabdian",
                "res": "{\n  \"ok\": true,\n  \"galeri\": [ { \"id\": \"…\", \"judul\": \"Kegiatan Pengabdian Desa\", \"fotoPath\": \"/uploads/galeri/desa-2026.jpg\" } ],\n  \"total\": 1,\n  \"halaman\": 1,\n  \"perHalaman\": 20\n}",
                "gagal": ""
            },
            "catatan": []
        },
        {
            "metode": "GET",
            "path": "/api/admin/dokumen-publik",
            "status": "terverifikasi",
            "ringkas": "Daftar dokumen publik (khusus ADMIN).",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Daftar dokumen."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/dokumen-publik",
                "res": "{\n  \"ok\": true,\n  \"dokumen\": [\n    {\n      \"id\": \"…\",\n      \"nama\": \"Panduan Penulisan Proposal\",\n      \"filePath\": \"/uploads/dok/panduan.pdf\",\n      \"kategori\": \"Panduan\",\n      \"createdAt\": \"2026-10-29T04:30:00.000Z\"\n    }\n  ],\n  \"jumlah\": 1\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"FORBIDDEN\",\n  \"message\": \"Khusus role ADMIN.\"\n}"
            },
            "catatan": []
        },
        {
            "metode": "POST",
            "path": "/api/admin/dokumen-publik",
            "status": "terverifikasi",
            "ringkas": "Tambah dokumen publik.",
            "auth": "ADMIN",
            "body": [
                [
                    "nama",
                    "string",
                    "ya",
                    "Maks. 200 karakter."
                ],
                [
                    "filePath",
                    "string",
                    "ya",
                    "Path berkas, maks. 255 karakter."
                ],
                [
                    "kategori",
                    "string",
                    "tidak",
                    "Maks. 100 karakter."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Dokumen ditambahkan."
                ],
                [
                    "400",
                    "Validasi gagal."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "POST /api/admin/dokumen-publik dengan body { nama, filePath, kategori }",
                "res": "{\n  \"ok\": true,\n  \"dokumen\": { \"id\": \"…\", \"nama\": \"Panduan Penulisan Proposal\" },\n  \"message\": \"Dokumen ditambahkan.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"VALIDASI_GAGAL\",\n  \"message\": \"Path berkas wajib diisi.\"\n}"
            },
            "catatan": []
        },
        {
            "metode": "DELETE",
            "path": "/api/admin/dokumen-publik/:id",
            "status": "terverifikasi",
            "ringkas": "Hapus dokumen publik.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Dokumen dihapus."
                ],
                [
                    "404",
                    "Tidak ditemukan."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "DELETE /api/admin/dokumen-publik/ef56…",
                "res": "{\n  \"ok\": true,\n  \"terhapus\": true,\n  \"message\": \"Dokumen dihapus.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"NOT_FOUND\",\n  \"message\": \"Data tidak ditemukan.\"\n}"
            },
            "catatan": []
        },
        {
            "metode": "GET",
            "path": "/api/public/dokumen",
            "status": "terverifikasi",
            "ringkas": "Daftar dokumen publik — tanpa login.",
            "auth": "Publik",
            "body": [
                [
                    "kategori",
                    "string",
                    "tidak",
                    "Saring per kategori."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Daftar dokumen."
                ]
            ],
            "contoh": {
                "req": "GET /api/public/dokumen",
                "res": "{\n  \"ok\": true,\n  \"dokumen\": [ { \"id\": \"…\", \"nama\": \"Panduan Penulisan Proposal\", \"filePath\": \"/uploads/dok/panduan.pdf\" } ],\n  \"total\": 1\n}",
                "gagal": ""
            },
            "catatan": [
                "Kunci hitungan memakai total — sama dengan /api/public/berita dan /api/public/galeri."
            ]
        }
    ],
    },
    {
        "kode": "m7-m9",
    "nama": "Notifikasi & Jejak Audit",
    "warna": "doc",
    "modul": "M7 & M9",
    "status": "terverifikasi",
    "ringkas": "Notifikasi in-app otomatis pada setiap transisi status, lonceng notifikasi, serta jejak audit append-only. Sudah dibangun dan teruji nyata.",
    "endpoint": [
        {
            "metode": "GET",
            "path": "/api/notifikasi",
            "status": "terverifikasi",
            "ringkas": "Daftar notifikasi milik sendiri + jumlah belum dibaca.",
            "auth": "Semua role terautentikasi",
            "body": [
                [
                    "halaman",
                    "number",
                    "tidak",
                    "Nomor halaman, default 1."
                ],
                [
                    "per",
                    "number",
                    "tidak",
                    "Per halaman, default 20, maks. 100."
                ],
                [
                    "belumDibaca",
                    "boolean",
                    "tidak",
                    "true untuk menyaring yang belum dibaca."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Daftar notifikasi dan belumDibaca."
                ],
                [
                    "401",
                    "Belum login."
                ]
            ],
            "contoh": {
                "req": "GET /api/notifikasi?belumDibaca=true",
                "res": "{\n  \"ok\": true,\n  \"notifikasi\": [\n    {\n      \"id\": \"…\",\n      \"judul\": \"Anda ditugaskan sebagai Reviewer 1\",\n      \"pesan\": \"Anda ditugaskan menilai proposal \\\"…\\\" sebagai Reviewer 1 (blind review).\",\n      \"link\": \"/review\",\n      \"isRead\": false,\n      \"createdAt\": \"2026-10-29T04:30:00.000Z\"\n    }\n  ],\n  \"total\": 1,\n  \"halaman\": 1,\n  \"perHalaman\": 20,\n  \"belumDibaca\": 1\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"UNAUTHENTICATED\",\n  \"message\": \"Sesi tidak ditemukan.\"\n}"
            },
            "catatan": [
                "Seluruh query membawa userId = pengguna saat ini di level where — tidak mungkin membaca notifikasi orang lain."
            ]
        },
        {
            "metode": "POST",
            "path": "/api/notifikasi/:id/baca",
            "status": "terverifikasi",
            "ringkas": "Tandai satu notifikasi sudah dibaca.",
            "auth": "Semua role terautentikasi",
            "body": [],
            "respons": [
                [
                    "200",
                    "ditandai true dan belumDibaca terbaru."
                ],
                [
                    "404",
                    "Notifikasi tidak ditemukan atau bukan milik sendiri."
                ]
            ],
            "contoh": {
                "req": "POST /api/notifikasi/12ab…/baca",
                "res": "{\n  \"ok\": true,\n  \"ditandai\": true,\n  \"belumDibaca\": 0\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"NOT_FOUND\",\n  \"message\": \"Notifikasi tidak ditemukan.\"\n}"
            },
            "catatan": [
                "userId ikut dalam where: notifikasi orang lain tidak menghasilkan baris yang cocok, sehingga jawabannya 404 — sama seperti yang memang tidak ada. Endpoint ini tidak membocorkan keberadaan notifikasi orang lain."
            ]
        },
        {
            "metode": "POST",
            "path": "/api/notifikasi/baca-semua",
            "status": "terverifikasi",
            "ringkas": "Tandai seluruh notifikasi milik sendiri sudah dibaca.",
            "auth": "Semua role terautentikasi",
            "body": [],
            "respons": [
                [
                    "200",
                    "Jumlah notifikasi yang ditandai."
                ]
            ],
            "contoh": {
                "req": "POST /api/notifikasi/baca-semua",
                "res": "{\n  \"ok\": true,\n  \"jumlah\": 2,\n  \"message\": \"2 notifikasi ditandai sudah dibaca.\"\n}",
                "gagal": ""
            },
            "catatan": [
                "Hanya menyentuh milik sendiri — where selalu memuat userId."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/proposal/:id/riwayat",
            "status": "terverifikasi",
            "ringkas": "Timeline audit satu proposal.",
            "auth": "Ketua pengusul, Kaprodi, ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Daftar peristiwa terurut waktu."
                ],
                [
                    "403",
                    "Bukan ketua, Kaprodi, atau Admin."
                ],
                [
                    "404",
                    "Proposal tidak ditemukan."
                ]
            ],
            "contoh": {
                "req": "GET /api/proposal/2093cc76…/riwayat",
                "res": "{\n  \"ok\": true,\n  \"proposal\": { \"id\": \"…\", \"judul\": \"…\", \"status\": \"LOLOS\" },\n  \"jumlah\": 7,\n  \"riwayat\": [\n    {\n      \"id\": \"…\",\n      \"waktu\": \"2026-10-29T04:30:00.000Z\",\n      \"aksi\": \"submit\",\n      \"keterangan\": \"Proposal dikirim — status MENUNGGU_VERIFIKASI_KAPRODI.\",\n      \"oleh\": { \"nidn\": \"0412345680\", \"nama\": \"Dr. Dosen Satu\" },\n      \"proposal\": { \"status\": \"LOLOS\" }\n    },\n    { \"aksi\": \"hasil_kombinasi\", \"keterangan\": \"TERIMA_TERIMA -> status LOLOS.\" }\n  ]\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"FORBIDDEN\",\n  \"message\": \"Riwayat proposal hanya dapat dilihat ketua pengusul, Kaprodi, dan Admin.\"\n}"
            },
            "catatan": [
                "Reviewer ditolak meski proposal itu sudah ia nilai — blind review tidak boleh membuka jejak siapa penilai lain.",
                "Ketua pengusul selalu boleh melihat riwayat proposalnya sendiri."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/admin/audit",
            "status": "terverifikasi",
            "ringkas": "Jejak audit global, terurut waktu terbaru.",
            "auth": "ADMIN",
            "body": [
                [
                    "halaman",
                    "number",
                    "tidak",
                    "Nomor halaman, default 1."
                ],
                [
                    "per",
                    "number",
                    "tidak",
                    "Per halaman, default 50, maks. 200."
                ],
                [
                    "aksi",
                    "string",
                    "tidak",
                    "Saring per kode aksi."
                ],
                [
                    "proposalId",
                    "string",
                    "tidak",
                    "Saring per proposal."
                ],
                [
                    "nidn",
                    "string",
                    "tidak",
                    "Saring per pelaku."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Daftar log, total, dan pilihanAksi."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/audit?aksi=verifikasi&nidn=0412345678",
                "res": "{\n  \"ok\": true,\n  \"audit\": [\n    {\n      \"id\": \"…\",\n      \"waktu\": \"2026-10-29T04:30:00.000Z\",\n      \"aksi\": \"verifikasi\",\n      \"keterangan\": \"Tahap KAPRODI: SETUJUI (status MENUNGGU_VERIFIKASI_ADMIN).\",\n      \"oleh\": { \"nidn\": \"0412345678\", \"nama\": \"Kaprodi TI\" },\n      \"proposal\": { \"id\": \"…\", \"judul\": \"…\", \"status\": \"MENUNGGU_REVIEW\" }\n    }\n  ],\n  \"total\": 1,\n  \"halaman\": 1,\n  \"perHalaman\": 50,\n  \"pilihanAksi\": [\n    \"submit\", \"verifikasi\", \"tugaskan_reviewer\", \"review\",\n    \"hasil_kombinasi\", \"keputusan_rapat\", \"isi_sumber_dana\",\n    \"generate_sk\", \"generate_st\", \"buat_proposal\"\n  ]\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"FORBIDDEN\",\n  \"message\": \"Jejak audit khusus role ADMIN.\"\n}"
            },
            "catatan": [
                "Append-only: tidak ada endpoint yang mengubah atau menghapus activity_logs. Kalau penulisnya bisa menghapus catatannya, isinya bukan lagi bukti.",
                "pilihanAksi mengembalikan kode aksi baku sehingga filter antarmuka tidak perlu menebak."
            ]
        }
    ],
    },
    {
        "kode": "m8-sisanya",
    "nama": "Master Data & Form Dinamis (bagian per item)",
    "warna": "doc",
    "modul": "M8",
    "status": "terverifikasi",
    "ringkas": "Endpoint per-item untuk form field, periode, dan program studi. Bagian daftar sudah tercatat di modul M1/M8.",
    "endpoint": [
        {
            "metode": "GET",
            "path": "/api/admin/form-field/:id",
            "status": "terverifikasi",
            "ringkas": "Baca satu konfigurasi field.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Konfigurasi field."
                ],
                [
                    "404",
                    "Tidak ditemukan."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/form-field/ab12…",
                "res": "{\n  \"ok\": true,\n  \"field\": {\n    \"id\": \"…\",\n    \"kode\": \"bidang_riset\",\n    \"label\": \"Bidang Riset\",\n    \"tipe\": \"select\",\n    \"wajib\": true,\n    \"opsi\": { \"pilihan\": [ \"Informatika\", \"Sistem Informasi\" ] }\n  }\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"NOT_FOUND\",\n  \"message\": \"Data tidak ditemukan.\"\n}"
            },
            "catatan": []
        },
        {
            "metode": "PUT",
            "path": "/api/admin/form-field/:id",
            "status": "terverifikasi",
            "ringkas": "Ubah konfigurasi field.",
            "auth": "ADMIN",
            "body": [
                [
                    "label",
                    "string",
                    "tidak",
                    "Nama tampilan."
                ],
                [
                    "wajib",
                    "boolean",
                    "tidak",
                    "Wajib diisi atau tidak."
                ],
                [
                    "opsi",
                    "object",
                    "tidak",
                    "Untuk tipe select/checkbox: { pilihan: [...] }."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Field diperbarui."
                ],
                [
                    "400",
                    "Validasi gagal."
                ],
                [
                    "404",
                    "Tidak ditemukan."
                ],
                [
                    "409",
                    "Tipe tidak mendukung opsi."
                ]
            ],
            "contoh": {
                "req": "PUT /api/admin/form-field/ab12… dengan body { wajib: false }",
                "res": "{\n  \"ok\": true,\n  \"field\": { \"id\": \"…\", \"label\": \"Bidang Riset\", \"wajib\": false }\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"OPSITIDAK_RELEVAN\",\n  \"message\": \"Field bertipe teks tidak memerlukan opsi pilihan.\"\n}"
            },
            "catatan": [
                "Mengubah wajib tidak membatalkan proposal yang sudah ada — hanya berlaku untuk pengisian berikutnya."
            ]
        },
        {
            "metode": "DELETE",
            "path": "/api/admin/form-field/:id",
            "status": "terverifikasi",
            "ringkas": "Hapus konfigurasi field.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Field dihapus."
                ],
                [
                    "404",
                    "Tidak ditemukan."
                ],
                [
                    "409",
                    "Masih dipakai nilai pengisian proposal."
                ]
            ],
            "contoh": {
                "req": "DELETE /api/admin/form-field/ab12…",
                "res": "{\n  \"ok\": true,\n  \"message\": \"Field dihapus.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"IN_USE\",\n  \"message\": \"Field masih dipakai 8 data dan tidak dapat dihapus.\"\n}"
            },
            "catatan": [
                "Penghitungan dipakai dilakukan lebih dulu sehingga pesannya jelas, bukan error FK 500."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/admin/periode/:id",
            "status": "terverifikasi",
            "ringkas": "Baca satu periode akademik.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Periode."
                ],
                [
                    "404",
                    "Tidak ditemukan."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/periode/7bd43fe1…",
                "res": "{\n  \"ok\": true,\n  \"periode\": {\n    \"id\": \"…\",\n    \"nama\": \"2027/2028 Ganjil\",\n    \"tahunMulai\": 2027,\n    \"tahunSelesai\": 2028,\n    \"isActive\": true\n  }\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"NOT_FOUND\",\n  \"message\": \"Data tidak ditemukan.\"\n}"
            },
            "catatan": []
        },
        {
            "metode": "PUT",
            "path": "/api/admin/periode/:id",
            "status": "terverifikasi",
            "ringkas": "Ubah periode akademik.",
            "auth": "ADMIN",
            "body": [
                [
                    "nama",
                    "string",
                    "tidak",
                    "Nama tampilan, maks. 50 karakter."
                ],
                [
                    "tahunMulai",
                    "number",
                    "tidak",
                    "Tahun mulai."
                ],
                [
                    "tahunSelesai",
                    "number",
                    "tidak",
                    "Tahun selesai."
                ],
                [
                    "isActive",
                    "boolean",
                    "tidak",
                    "Jadikan periode aktif."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Periode diperbarui."
                ],
                [
                    "400",
                    "Validasi gagal — tahunSelesai harus lebih besar."
                ],
                [
                    "404",
                    "Tidak ditemukan."
                ]
            ],
            "contoh": {
                "req": "PUT /api/admin/periode/7bd43fe1… dengan body { isActive: true }",
                "res": "{\n  \"ok\": true,\n  \"periode\": { \"id\": \"…\", \"nama\": \"2027/2028 Ganjil\", \"isActive\": true }\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"TAHUN_TIDAK_SAH\",\n  \"message\": \"tahunSelesai harus lebih besar dari tahunMulai.\"\n}"
            },
            "catatan": [
                "Menjadikan satu periode aktif otomatis menonaktifkan periode lain — selalu ada tepat satu yang aktif."
            ]
        },
        {
            "metode": "DELETE",
            "path": "/api/admin/periode/:id",
            "status": "terverifikasi",
            "ringkas": "Hapus periode akademik.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Periode dihapus."
                ],
                [
                    "404",
                    "Tidak ditemukan."
                ],
                [
                    "409",
                    "Masih dipakai proposal."
                ]
            ],
            "contoh": {
                "req": "DELETE /api/admin/periode/7bd43fe1…",
                "res": "{\n  \"ok\": true,\n  \"message\": \"Periode dihapus.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"IN_USE\",\n  \"message\": \"Periode masih dipakai 12 proposal dan tidak dapat dihapus.\"\n}"
            },
            "catatan": []
        },
        {
            "metode": "GET",
            "path": "/api/admin/prodi/:id",
            "status": "terverifikasi",
            "ringkas": "Baca satu program studi.",
            "auth": "ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Program studi."
                ],
                [
                    "404",
                    "Tidak ditemukan."
                ],
                [
                    "403",
                    "Role selain ADMIN."
                ]
            ],
            "contoh": {
                "req": "GET /api/admin/prodi/3e374d05…",
                "res": "{\n  \"ok\": true,\n  \"prodi\": { \"id\": \"…\", \"kode\": \"TI\", \"nama\": \"Teknik Informatika\" }\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"NOT_FOUND\",\n  \"message\": \"Data tidak ditemukan.\"\n}"
            },
            "catatan": []
        },
        {
            "metode": "PUT",
            "path": "/api/admin/prodi/:id",
            "status": "terverifikasi",
            "ringkas": "Ubah program studi.",
            "auth": "ADMIN",
            "body": [
                [
                    "kode",
                    "string",
                    "tidak",
                    "Maks. 20 karakter, wajib unik."
                ],
                [
                    "nama",
                    "string",
                    "tidak",
                    "Maks. 100 karakter."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Program studi diperbarui."
                ],
                [
                    "400",
                    "Validasi gagal."
                ],
                [
                    "404",
                    "Tidak ditemukan."
                ],
                [
                    "409",
                    "Kode sudah terpakai."
                ]
            ],
            "contoh": {
                "req": "PUT /api/admin/prodi/3e374d05… dengan body { nama: 'Teknologi Informasi' }",
                "res": "{\n  \"ok\": true,\n  \"prodi\": { \"id\": \"…\", \"kode\": \"TI\", \"nama\": \"Teknologi Informasi\" }\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"CONFLICT\",\n  \"message\": \"Kode \\\"MI\\\" sudah dipakai.\"\n}"
            },
            "catatan": []
        }
    ],
    },
    {
        "kode": "m2-sisanya",
    "nama": "Proposal & Tim (bagian per item)",
    "warna": "doc",
    "modul": "M2",
    "status": "terverifikasi",
    "ringkas": "Pengelolaan anggota tim dan baca dokumen per proposal.",
    "endpoint": [
        {
            "metode": "GET",
            "path": "/api/proposal/:id/anggota",
            "status": "terverifikasi",
            "ringkas": "Daftar anggota tim satu proposal.",
            "auth": "Semua role terautentikasi",
            "body": [],
            "respons": [
                [
                    "200",
                    "Daftar anggota terurut urutan."
                ],
                [
                    "404",
                    "Proposal tidak ditemukan."
                ]
            ],
            "contoh": {
                "req": "GET /api/proposal/2093cc76…/anggota",
                "res": "{\n  \"ok\": true,\n  \"anggota\": [\n    {\n      \"urutan\": 1,\n      \"peran\": \"ANGGOTA\",\n      \"user\": { \"nidn\": \"0412345680\", \"nama\": \"Dr. Dosen Satu\" }\n    },\n    {\n      \"urutan\": 2,\n      \"peran\": \"ANGGOTA\",\n      \"user\": { \"nidn\": \"0412345681\", \"nama\": \"Dr. Dosen Dua\" }\n    }\n  ],\n  \"jumlah\": 2\n}",
                "gagal": ""
            },
            "catatan": [
                "Ketua pengusul tidak tampil sebagai anggota — dia sudah tercatat di field dosenId."
            ]
        },
        {
            "metode": "POST",
            "path": "/api/proposal/:id/anggota",
            "status": "terverifikasi",
            "ringkas": "Tambah anggota tim.",
            "auth": "Hanya ketua pengusul",
            "body": [
                [
                    "nidn",
                    "string",
                    "ya",
                    "NIDN dosen yang ditambahkan."
                ],
                [
                    "peran",
                    "enum",
                    "tidak",
                    "ANGGOTA (default)."
                ]
            ],
            "respons": [
                [
                    "200",
                    "Anggota ditambahkan."
                ],
                [
                    "400",
                    "Validasi gagal — dosen tidak ada."
                ],
                [
                    "403",
                    "Bukan ketua pengusul."
                ],
                [
                    "409",
                    "Sudah menjadi anggota atau ketua."
                ],
                [
                    "412",
                    "Proposal sudah terkirim."
                ]
            ],
            "contoh": {
                "req": "POST /api/proposal/2093cc76…/anggota dengan body { nidn: '0412345681' }",
                "res": "{\n  \"ok\": true,\n  \"anggota\": { \"urutan\": 2, \"peran\": \"ANGGOTA\", \"user\": { \"nidn\": \"0412345681\" } },\n  \"message\": \"Anggota ditambahkan.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"SUDAH_ANGGOTA\",\n  \"message\": \"Dosen tersebut sudah menjadi anggota tim.\"\n}"
            },
            "catatan": [
                "Urutan dihitung otomatis dari jumlah anggota, bukan dikirim klien.",
                "Hanya ketua pengusul boleh mengubah susunan tim."
            ]
        },
        {
            "metode": "DELETE",
            "path": "/api/proposal/:id/anggota/:userId",
            "status": "terverifikasi",
            "ringkas": "Keluarkan satu anggota tim.",
            "auth": "Hanya ketua pengusul",
            "body": [],
            "respons": [
                [
                    "200",
                    "Anggota dikeluarkan."
                ],
                [
                    "403",
                    "Bukan ketua pengusul."
                ],
                [
                    "404",
                    "Anggota tidak ditemukan."
                ],
                [
                    "412",
                    "Proposal sudah terkirim."
                ]
            ],
            "contoh": {
                "req": "DELETE /api/proposal/2093cc76…/anggota/9f21…",
                "res": "{\n  \"ok\": true,\n  \"message\": \"Anggota dikeluarkan.\"\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"PROPOSAL_Terkirim\",\n  \"message\": \"Anggota tim hanya dapat diubah sebelum proposal dikirim.\"\n}"
            },
            "catatan": []
        },
        {
            "metode": "GET",
            "path": "/api/proposal/:id/dokumen/st.pdf",
            "status": "terverifikasi",
            "ringkas": "Unduh Surat Tugas (PDF A4).",
            "auth": "Semua role terautentikasi",
            "body": [],
            "respons": [
                [
                    "200",
                    "application/pdf — naskah dinas."
                ],
                [
                    "404",
                    "Dokumen atau nomor belum terbit."
                ]
            ],
            "contoh": {
                "req": "GET /api/proposal/2093cc76…/dokumen/st.pdf",
                "res": "(berkas PDF, sekitar 45 KB, halaman A4)",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"NOMOR_BELUM_ADA\",\n  \"message\": \"Surat Tugas belum terbit.\"\n}"
            },
            "catatan": [
                "ST mensyaratkan SK terbit lebih dulu — surat tugas tidak mendahului keputusan.",
                "Dasar hukum di dalamnya merujuk nomor SK."
            ]
        },
        {
            "metode": "GET",
            "path": "/api/proposal/:id/reviewer",
            "status": "terverifikasi",
            "ringkas": "Baca penugasan reviewer proposal.",
            "auth": "Khusus REVIEWER & ADMIN",
            "body": [],
            "respons": [
                [
                    "200",
                    "Penugasan reviewer 1 dan 2."
                ],
                [
                    "403",
                    "Role selain REVIEWER/ADMIN."
                ],
                [
                    "404",
                    "Proposal tidak ditemukan."
                ]
            ],
            "contoh": {
                "req": "GET /api/proposal/2093cc76…/reviewer",
                "res": "{\n  \"ok\": true,\n  \"penugasan\": [\n    { \"urutanReviewer\": 1, \"nilaiSaya\": 88, \"rekomendasiSaya\": \"TERIMA\", \"progres\": { \"sudahDinilai\": 1 } },\n    { \"urutanReviewer\": 2, \"nilaiSaya\": null, \"rekomendasiSaya\": null, \"progres\": { \"sudahDinilai\": 0 } }\n  ]\n}",
                "gagal": "{\n  \"ok\": false,\n  \"code\": \"FORBIDDEN\",\n  \"message\": \"Rute ini khusus role: REVIEWER, ADMIN\"\n}"
            },
            "catatan": [
                "Reviewer tidak melihat identitas maupun nilai reviewer lain — blind review.",
                "progres hanya berisi jumlah, bukan skor."
            ]
        }
    ],

    },
    {
        "kode": "kuisioner",
        "nama": "Kuisioner Publik",
        "warna": "publik",
        "modul": "M6",
        "status": "terverifikasi",
        "ringkas": "Kuisioner ditulis ADMIN, dibuka untuk diisi publik, lalu ditutup. Jawaban divalidasi terhadap daftar pertanyaan yang tersimpan di database — bukan terhadap bentuk yang dikirim klien.",
        "endpoint": [
            {
                "metode": "GET",
                "path": "/api/admin/kuisioner",
                "status": "terverifikasi",
                "ringkas": "Daftar seluruh kuisioner beserta jumlah jawabannya.",
                "auth": "ADMIN",
                "respons": [
                    ("200", "Daftar kuisioner diterima, lengkap dengan `perStatus` berisi hitung per status."),
                ],
                "contoh": {
                    "req": "",
                    "res": '{\n  "ok": true,\n  "data": {\n    "kuisioner": [\n      {\n        "id": "9a1f2c44-0000-0000-0000-000000000001",\n        "judul": "Kepuasan Mahasiswa terhadap Layanan LPPM 2026",\n        "deskripsi": "Isilah sesuai pengalaman Anda.",\n        "pertanyaan": [\n          { "kode": "q1", "pertanyaan": "Bagaimana kecepatan layanan?", "tipe": "skala", "wajib": true }\n        ],\n        "status": "AKTIF",\n        "pembuat": { "nidn": "9999999001", "nama": "Administrator LPPM" },\n        "_count": { "jawaban": 3 }\n      }\n    ],\n    "jumlah": 1,\n    "perStatus": { "AKTIF": 1 }\n  }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "FORBIDDEN",\n  "message": "Khusus role ADMIN."\n}',
                },
                "catatan": [
                    "`_count.jawaban` datang dari relasi Prisma, bukan dihitung manual di lapisan aplikasi — angkanya tidak mungkin berbeda dari isi tabel.",
                ],
            },
            {
                "metode": "POST",
                "path": "/api/admin/kuisioner",
                "status": "terverifikasi",
                "ringkas": "Buat kuisioner baru dalam status DRAFT.",
                "auth": "ADMIN",
                "body": [
                    ("judul", "string", "ya", "1–200 karakter."),
                    ("deskripsi", "string|null", "tidak", "Tampilan di halaman publik."),
                    ("pertanyaan", "array", "tidak", "Daftar pertanyaan; kosong bila disusun belakangan."),
                ],
                "respons": [
                    ("200", "Kuisioner dibuat sebagai DRAFT."),
                    ("400", "Field wajib kosong atau tipe tidak sesuai."),
                ],
                "contoh": {
                    "req": '{"judul": "Kepuasan Mahasiswa terhadap Layanan LPPM 2026", "deskripsi": "Isilah sesuai pengalaman Anda.", "pertanyaan": [{"kode": "q1", "pertanyaan": "Bagaimana kecepatan layanan?", "tipe": "skala", "wajib": true}, {"kode": "q2", "pertanyaan": "Aspek apa yang perlu diperbaiki?", "tipe": "pilihan_ganda", "pilihan": ["Kecepatan", "Kejelasan informasi", "SOP"], "wajib": true}, {"kode": "q3", "pertanyaan": "Saran tambahan", "tipe": "isian_panjang"}]}',
                    "res": '{\n  "ok": true,\n  "data": {\n    "kuisioner": {\n      "id": "9a1f2c44-0000-0000-0000-000000000001",\n      "judul": "Kepuasan Mahasiswa terhadap Layanan LPPM 2026",\n      "status": "DRAFT",\n      "pembuat": { "nidn": "9999999001", "nama": "Administrator LPPM" },\n      "_count": { "jawaban": 0 }\n    },\n    "message": "Kuisioner dibuat sebagai DRAFT."\n  }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "ZOD_ERROR",\n  "message": "Data tidak valid.",\n  "errors": [\n    { "path": "judul", "message": "Judul wajib diisi." }\n  ]\n}',
                },
                "catatan": [
                    "Kuisioner baru **selalu DRAFT**. Tidak ada cara membuatnya langsung AKTIF — pertanyaan harus diperiksa dulu lewat endpoint aktifkan.",
                    "Bentuk pertanyaan didukung: `pilihan_ganda`, `skala`, `isian_pendek`, `isian_panjang`.",
                ],
            },
            {
                "metode": "PATCH",
                "path": "/api/admin/kuisioner/:id",
                "status": "terverifikasi",
                "ringkas": "Ubah judul, deskripsi, atau daftar pertanyaan.",
                "auth": "ADMIN",
                "body": [
                    ("judul", "string", "tidak", "1–200 karakter."),
                    ("deskripsi", "string|null", "tidak", "Boleh dikosongkan."),
                    ("pertanyaan", "array", "tidak", "Mengganti seluruh daftar, bukan menambah per item."),
                ],
                "respons": [
                    ("200", "Kuisioner diperbarui."),
                    ("404", "Kuisioner tidak ditemukan."),
                    ("409", "Sudah ada jawaban, kuisioner terkunci."),
                ],
                "contoh": {
                    "req": '{"judul": "Kepuasan Mahasiswa terhadap Layanan LPPM (Revisi)"}',
                    "res": '{\n  "ok": true,\n  "data": {\n    "kuisioner": { "id": "9a1f…", "judul": "Kepuasan Mahasiswa terhadap Layanan LPPM (Revisi)", "status": "DRAFT" },\n    "message": "Kuisioner diperbarui."\n  }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "SUDAH_ADA_JAWABAN",\n  "message": "Kuisioner sudah diisi 3 orang dan tidak dapat disunting."\n}',
                },
                "catatan": [
                    "Begitu ada satu jawaban masuk, kuisioner tidak dapat disunting — mengubah pertanyaan akan membuat jawaban lama kehilangan artinya.",
                    "Daftar diganti seluruhnya, bukan ditambah per item, supaya tidak ada pertanyaan yatim yang masih menunjuk kode lama.",
                ],
            },
            {
                "metode": "POST",
                "path": "/api/admin/kuisioner/:id/aktifkan",
                "status": "terverifikasi",
                "ringkas": "Buka kuisioner agar publik dapat mengisinya.",
                "auth": "ADMIN",
                "respons": [
                    ("200", "Kuisioner berstatus AKTIF."),
                    ("404", "Kuisioner tidak ditemukan."),
                    ("409", "Sudah AKTIF, atau belum punya pertanyaan."),
                ],
                "contoh": {
                    "req": "",
                    "res": '{\n  "ok": true,\n  "data": {\n    "kuisioner": { "id": "9a1f…", "judul": "Kepuasan Mahasiswa terhadap Layanan LPPM 2026", "status": "AKTIF" },\n    "message": "Kuisioner dibuka untuk diisi publik."\n  }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "BELUM_ADA_PERTANYAAN",\n  "message": "Kuisioner belum memiliki pertanyaan dan tidak dapat dibuka untuk diisi."\n}',
                },
                "catatan": [
                    "Kuisioner tanpa pertanyaan ditolak — mengaktifkan halaman kosong hanya membingungkan pengisi.",
                    "Jalur transisi: DRAFT → AKTIF dan SELESAI → AKTIF. Tidak ada lompatan lain.",
                ],
            },
            {
                "metode": "POST",
                "path": "/api/admin/kuisioner/:id/selesaikan",
                "status": "terverifikasi",
                "ringkas": "Tutup penerimaan jawaban.",
                "auth": "ADMIN",
                "respons": [
                    ("200", "Kuisioner berstatus SELESAI."),
                    ("404", "Kuisioner tidak ditemukan."),
                    ("409", "Bukan dari status AKTIF."),
                ],
                "contoh": {
                    "req": "",
                    "res": '{\n  "ok": true,\n  "data": {\n    "kuisioner": { "id": "9a1f…", "status": "SELESAI" },\n    "message": "Kuisioner ditutup; jawaban tak lagi diterima."\n  }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "TRANSISI_TIDAK_SAH",\n  "message": "Kuisioner berstatus DRAFT tidak dapat dibuka."\n}',
                },
                "catatan": [
                    "SELESAI dapat diaktifkan kembali bila ternyata masa isian diperpanjang.",
                ],
            },
            {
                "metode": "DELETE",
                "path": "/api/admin/kuisioner/:id",
                "status": "terverifikasi",
                "ringkas": "Hapus kuisioner beserta seluruh jawabannya.",
                "auth": "ADMIN",
                "respons": [
                    ("200", "Kuisioner dihapus."),
                    ("404", "Kuisioner tidak ditemukan."),
                    ("409", "Sudah ada jawaban, tidak dapat dihapus."),
                ],
                "contoh": {
                    "req": "",
                    "res": '{\n  "ok": true,\n  "data": { "terhapus": true, "message": "Kuisioner dihapus." }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "SUDAH_ADA_JAWABAN",\n  "message": "Kuisioner sudah diisi 3 orang dan tidak dapat dihapus."\n}',
                },
                "catatan": [
                    "Jawaban adalah data pengumpulan. Menghapus kuisioner berarti membuangnya, sehingga ditolak begitu ada satu jawaban.",
                ],
            },
            {
                "metode": "GET",
                "path": "/api/admin/kuisioner/:id/hasil",
                "status": "terverifikasi",
                "ringkas": "Ringkasan jawaban per pertanyaan.",
                "auth": "ADMIN",
                "respons": [
                    ("200", "Ringkasan jawaban diterima."),
                    ("404", "Kuisioner tidak ditemukan."),
                ],
                "contoh": {
                    "req": "",
                    "res": '{\n  "ok": true,\n  "data": {\n    "kuisioner": { "id": "9a1f…", "judul": "Kepuasan Mahasiswa terhadap Layanan LPPM 2026", "status": "SELESAI" },\n    "jumlahPengisi": 3,\n    "perPertanyaan": [\n      { "kode": "q1", "tipe": "skala", "jumlahDijawab": 3, "jumlahKosong": 0, "frekuensi": { "4": 2, "5": 1 }, "contohJawaban": null },\n      { "kode": "q3", "tipe": "isian_panjang", "jumlahDijawab": 2, "jumlahKosong": 1, "frekuensi": null, "contohJawaban": ["Tolong upload panduan PDF.", "Tambah jam konsultasi"] }\n    ]\n  }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "NOT_FOUND",\n  "message": "Kuisioner tidak ditemukan."\n}',
                },
                "catatan": [
                    "Pilihan ganda dan skala dihitung frekuensinya; isian panjang dikumpulkan apa adanya (maks 5 contoh) — frekuensi teks bebas tidak bermakna.",
                    "`jumlahKosong` adalah selisih jumlah pengisi dengan yang menjawab pertanyaan ini, sehingga pertanyaan opsional yang banyak dilewati langsung terlihat.",
                ],
            },
            {
                "metode": "GET",
                "path": "/api/public/kuisioner",
                "status": "terverifikasi",
                "ringkas": "Daftar kuisioner berstatus AKTIF beserta pertanyaannya.",
                "auth": "Tidak perlu (publik)",
                "respons": [
                    ("200", "Daftar kuisioner AKTIF diterima; kosong bila tidak ada yang aktif."),
                ],
                "contoh": {
                    "req": "",
                    "res": '{\n  "ok": true,\n  "data": {\n    "kuisioner": [\n      {\n        "id": "9a1f…",\n        "judul": "Kepuasan Mahasiswa terhadap Layanan LPPM 2026",\n        "deskripsi": "Isilah sesuai pengalaman Anda.",\n        "pertanyaan": [\n          { "kode": "q1", "pertanyaan": "Bagaimana kecepatan layanan?", "tipe": "skala", "wajib": true },\n          { "kode": "q2", "pertanyaan": "Aspek apa yang perlu diperbaiki?", "tipe": "pilihan_ganda", "pilihan": ["Kecepatan", "Kejelasan informasi", "SOP"], "wajib": true }\n        ],\n        "updatedAt": "2026-10-29T09:14:02.550Z",\n        "jumlahPengisi": 3\n      }\n    ],\n    "jumlah": 1\n  }\n}',
                    "gagal": "",
                },
                "catatan": [
                    "DRAFT dan SELESAI tidak ikut tampil — mengembalikan daftar kosong, bukan error.",
                    "Daftar pertanyaan ikut dikirim ke publik sehingga halaman pengisian tidak perlu memanggil endpoint lain.",
                ],
            },
            {
                "metode": "POST",
                "path": "/api/public/kuisioner/:id/isi",
                "status": "terverifikasi",
                "ringkas": "Kirim jawaban kuisioner.",
                "auth": "Tidak perlu (publik)",
                "body": [
                    ("namaPengisi", "string", "ya", "1–150 karakter."),
                    ("jawaban", "object", "ya", "Peta kode pertanyaan \u2192 nilai jawaban."),
                ],
                "respons": [
                    ("200", "Jawaban tercatat."),
                    ("400", "Pertanyaan tak dikenal ATAU pertanyaan wajib kosong."),
                    ("404", "Kuisioner tidak ditemukan atau bukan AKTIF."),
                ],
                "contoh": {
                    "req": '{"namaPengisi": "Budi Santoso", "jawaban": {"q1": "4", "q2": "Kejelasan informasi", "q3": "Tolong upload panduan PDF."}}',
                    "res": '{\n  "ok": true,\n  "data": {\n    "jawaban": {\n      "id": "b7c2a100-0000-0000-0000-000000000002",\n      "namaPengisi": "Budi Santoso",\n      "createdAt": "2026-10-29T09:20:44.118Z"\n    },\n    "message": "Jawaban untuk \"Kepuasan Mahasiswa terhadap Layanan LPPM 2026\" tercatat."\n  }\n}',
                    "gagal": '{\n  "ok": false,\n  "code": "JAWABAN_WAJIB_KOSONG",\n  "message": "Pertanyaan wajib belum dijawab: q2."\n}',
                },
                "catatan": [
                    "Jawaban divalidasi terhadap daftar pertanyaan yang tersimpan di database, bukan terhadap bentuk yang dikirim klien \u2014 klien tidak bisa memaksa pertanyaan tambahan, dan pertanyaan wajib tidak bisa dilewati.",
                    "Kuisioner bukan AKTIF menghasilkan **404, bukan 403** \u2014 bila memakai 403, responsnya sendiri membocorkan keberadaan kuisioner yang belum tayang atau sudah ditutup.",
                ],
            },
        ],
    },
]

ATURAN_ROLE = [
    ("/api/admin", "ADMIN", "Master data, akun, dan konfigurasi sistem."),
    ("/api/ketua", "KETUA_STIKOM, KETUA_LPPM", "Rekap eksekutif dan persetujuan akhir."),
    ("/api/kaprodi", "KAPRODI", "Verifikasi tahap pertama untuk program studinya."),
    ("/api/prodi", "PRODI", "Rekap per program studi."),
    ("/api/reviewer", "REVIEWER", "Penilaian proposal yang ditugaskan."),
    ("/api/verifikasi", "KAPRODI, ADMIN", "Proses verifikasi dua tahap."),
    ("/api/proposal", "Semua role (7)", "Pengusulan dan pelacakan proposal."),
    ("/api/akun", "ADMIN", "Pengelolaan akun pengguna."),
    ("/api/publik, /berita, /galeri, /dokumen-publik", "Tanpa sesi", "Konten publik."),
]

KODE_ERROR = [
    ("VALIDATION", "400", "Body permintaan tidak lolos validasi Zod."),
    ("UNAUTHORIZED", "401", "Kredensial salah (NIDN atau password)."),
    ("UNAUTHENTICATED", "401", "Tidak ada sesi pada permintaan yang dilindungi."),
    ("SESSION_INVALID", "401", "Token kedaluwarsa atau rusak. Cookie dibersihkan otomatis."),
    ("FORBIDDEN", "403", "Sesi valid tetapi role tidak berwenang."),
    ("ACCOUNT_DISABLED", "403", "Akun berstatus NONAKTIF."),
    ("NOT_FOUND", "404", "Sumber daya tidak ditemukan."),
    ("CONFLICT", "409", "Bentrokan kunci unik (duplikat)."),
    ("INTERNAL", "500", "Kesalahan tak terduga di sisi server."),
]

if __name__ == "__main__":
    import api_doc_html as H
    import api_doc_docx as D
    H.build(GRUP, ATURAN_ROLE, KODE_ERROR, OUT, PROYEK, INSTITUSI, VERSI, TANGGAL)
    D.build(GRUP, ATURAN_ROLE, KODE_ERROR, OUT, PROYEK, INSTITUSI, VERSI, TANGGAL)
    print("generator siap - jalankan build()")
