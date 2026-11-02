# 6-1 · Input Sumber Dana (Internal / Eksternal / Mandiri)

**Modul:** M4 — Penerbitan Dokumen SK & ST · **Status:** selesai

## Apa yang dibangun

`proposals.sumberDana` diisi **menjelang cetak**, bukan saat pengusulan. Ini
sengaja: pada tahap proposal masih diajukan, sumber anggaran belum pasti.

**File:** `src/app/api/proposal/[id]/sumber-dana/route.js` · `PUT` / `GET`

## Aturan yang dijalankan

1. Khusus role **ADMIN** (`403` untuk DOSEN).
2. Nilai dibatasi enum skema: `INTERNAL | EKSTERNAL | MANDIRI` — di luar itu
   ditolak Zod (`400`).
3. Proposal harus sudah lolos penilaian reviewer, yaitu status `LOLOS` atau
   `MENUNGGU_SK_ST`. Status lain → `409 STATUS_BELUM_SIAP`.
4. `GET` melaporkan `pilihan` dan `dapatDiisi`, sehingga antarmuka bisa
   menonaktifkan isian sebelum waktunya tanpa menebak.

## Hasil uji

```
PASS DOSEN ditolak mengisi sumber dana (403)
PASS nilai di luar enum ditolak Zod (400)
PASS ADMIN mengisi sumber dana (200)
PASS tersimpan di database (EKSTERNAL)
```

## Bukti

`screenshots/6-1-sumber-dana.png` — VS Code + REST Client.
