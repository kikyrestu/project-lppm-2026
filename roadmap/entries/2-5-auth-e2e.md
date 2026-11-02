# Fase 2 · 2-5 — Pengujian end-to-end M1 Auth

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Next.js dev server (port 3100), curl

## Ruang lingkup
Seluruh alur diuji lewat HTTP sungguhan terhadap server berjalan — bukan unit test terhadap fungsi terisolasi.

| # | Skenario | Diharapkan | Hasil |
|---|---|---|---|
| 1 | NIDN tidak terdaftar | `401` | ✅ `401` |
| 2 | Password salah | `401`, **pesan sama** dengan #1 | ✅ |
| 3 | `nidn` bukan string | `400` VALIDATION | ✅ |
| 4 | Login admin | `200` + cookie httpOnly | ✅ |
| 5 | `/api/auth/me` dengan sesi | `200` + data user | ✅ |
| 6 | `/api/auth/me` tanpa sesi | `401` | ✅ |
| 7 | Login reviewer | `200` | ✅ |
| 8 | Reviewer → `/api/admin` | `403` FORBIDDEN | ✅ |
| 9 | Admin → `/api/admin` | `200` | ✅ |
| 10 | Token palsu `abc.def.ghi` | `401` SESSION_INVALID | ✅ |
| 11 | Logout | `200` | ✅ |
| 12 | `/me` setelah logout | `401` | ✅ |

**12/12 lulus.**

## ⚠️ Catatan jujur: pengujian role baru sebagian
Uji role di atas baru mencakup **ADMIN** dan **REVIEWER**. Lima role lain (`DOSEN`, `KAPRODI`, `PRODI`, `KETUA_STIKOM`, `KETUA_LPPM`) **belum** diuji lintas-rute, karena route-handler untuk modulnya sendiri belum dibuat (M8–M9 menyusul).

Yang sudah terbukti: **tabel aturan role bekerja** (403 vs 200) dan **token rusak ditolak**. Pengujian menyeluruh 7 role dijadwalkan di **Fase 9 (Cutover & Pengujian)**, saat seluruh route tersedia.

## Langkah reproduksi
```bash
npm run dev -- --port 3100
bash rp2_2-5.sh
```

## Artefak
- Screenshot: `screenshots/2-5-auth-e2e.png`
- Skrip uji: `/home/kali/.hermes/cache/scratch/rp2_2-5.sh`
