# 5-4 · Mesin Tie-Breaker `evaluateCombinedReviews`

**Modul:** M3 — Verifikasi & Review · **Status:** selesai

## File

`src/modules/review/tieBreaker.js` — sengaja **bebas Prisma** seperti
`stateMachine.js`, supaya bisa diuji murni tanpa database.

## Matriks keputusan

| Reviewer 1 | Reviewer 2 | `hasilKombinasi` | Status proposal |
|---|---|---|---|
| TERIMA | TERIMA | `TERIMA_TERIMA` | **LOLOS** |
| ada REVISI | (sala satu) | `ADA_REVISI` | **PERLU_REVISI** |
| TERIMA | TOLAK | `TERIMA_TOLAK` | **PERLU_KEPUTUSAN** (rapat offline) |
| TOLAK | TOLAK | `TERIMA_TOLAK` | **DITOLAK** (tanpa rapat) |

**Urutan prioritas:** `REVISI` didahulukan — permintaan revisi dari salah satu
reviewer sudah cukup menggagalkan kelulusan otomatis, tanpa perlu rapat.

## Catatan keputusan desain

Skema hanya menyediakan tiga nilai `HasilKombinasi`, sehingga pasangan
`TOLAK+TOLAK` ikut ke bucket `TERIMA_TOLAK`. Keduanya **sama-sama sepakat
menolak — bukan sengketa** — sehingga tidak memerlukan rapat. Pembedanya adalah
`perluRapat: false` dan status akhir `DITOLAK`. Skema tidak diubah karena
migrasi sudah berjalan.

## Perluasan mesin status

Mesin Fase 4 belum memiliki transisi keluar dari `MENUNGGU_REVIEW` selain ke
`PERLU_KEPUTUSAN`, padahal tie-breaker membutuhkan dua lainnya:

```js
[S.MENUNGGU_REVIEW]: {
  [S.PERLU_KEPUTUSAN]: ['ADMIN', 'REVIEWER'],
  [S.LOLOS]:           ['ADMIN', 'REVIEWER'],   // ditambahkan
  [S.PERLU_REVISI]:    ['ADMIN', 'REVIEWER'],   // ditambahkan
},
```

## Hasil uji — ketiga skenario terbukti

```
=== A: TERIMA + TERIMA ===
  hasil kombinasi : TERIMA_TERIMA
  status proposal : LOLOS
=== B: TERIMA + REVISI ===
  hasil kombinasi : ADA_REVISI
  status proposal : PERLU_REVISI
=== C: TERIMA + TOLAK ===
  hasil kombinasi : TERIMA_TOLAK
  status proposal : PERLU_KEPUTUSAN
```

Hasil kombinasi dihitung **setelah setiap penilaian**, dan evaluasi baru dibentuk
saat kedua reviewer sudah menyelesaikan nilainya.

## Bukti

`screenshots/5-4-tie-breaker-rapat.png` — respons `200 OK` berisi
`hasilKombinasi: "TERIMA_TOLAK"` → `keputusanAkhir: "LOLOS"`.
