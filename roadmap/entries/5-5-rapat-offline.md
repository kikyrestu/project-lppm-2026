# 5-5 · API Rapat Offline (Keputusan Akhir)

**Modul:** M3 — Verifikasi & Review · **Status:** selesai

## File

`src/app/api/proposal/[id]/keputusan/route.js` — `POST` (memutuskan) · `GET` (membaca)

## Kapan dipakai

**Hanya** pada skenario sengketa `TERIMA+TOLAK`, ketika mesin tie-breaker
menetapkan `PERLU_KEPUTUSAN` dan tidak ada keputusan otomatis. Keputusan diambil
rapat oleh **ADMIN bersama KAPRODI** dan dicatat ke `review_evaluations`.

## Aturan yang dijalankan

1. Khusus role **ADMIN** — KAPRODI dan DOSEN ditolak (`403`).
2. Proposal harus berstatus `PERLU_KEPUTUSAN`; status lain → `409`.
3. Evaluasi harus benar-benar berupa `TERIMA_TOLAK`; skenario yang sudah
   diputuskan otomatis ditolak (`409 SKENARIO_SALAH`).
4. `keputusanAkhir` dipetakan ke status proposal: `LOLOS` / `REVISI` / `DITOLAK`.
5. `diputuskanOleh` dicatat untuk jejak audit.
6. Nilai rinci hanya disertakan untuk **ADMIN & KAPRODI**; reviewer tidak
   melihatnya lewat endpoint ini.

## Hasil uji

```
=== Skenario C: TERIMA + TOLAK -> PERLU_KEPUTUSAN + rapat offline ===
  PASS rapat offline ditolak pada skenario ADA_REVISI (409)
  PASS DOSEN ditolak memutuskan rapat (403)
  PASS KAPRODI ditolak memutuskan rapat (403)
  PASS reviewer tidak melihat nilai rinci lewat /keputusan (tidak ada)
  PASS ADMIN memutuskan rapat offline (200)
  keputusan akhir : LOLOS
  diputuskan oleh : 9999999001
  status proposal : LOLOS
=== Putusan kedua ditolak ===
  PASS putusan kedua ditolak setelah status keluar dari PERLU_KEPUTUSAN (409)
```

Total Fase 5: **28 uji lolos, 0 gagal** (16 Fase 5-1/5-2 + 12 skenario).

## Bukti

`screenshots/5-4-tie-breaker-rapat.png` — `POST /keputusan` dengan
`keputusanAkhir: "LOLOS"` dan catatan rapat, respons `200 OK`.
