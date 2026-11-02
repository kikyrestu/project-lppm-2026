# 5-3 · Blind Review — Isolasi Nilai di Level Query

**Modul:** M3 — Verifikasi & Review · **Status:** selesai

## Prinsip

Reviewer 1 tidak boleh melihat nilai Reviewer 2, dan sebaliknya. Isolasi ini
**ditegakkan di level query**, bukan sekadar disembunyikan dari tampilan:

```js
// tidak pernah ada query yang membaca baris reviewer lain
const milikSaya = await prisma.reviews.findFirst({
  where: { proposalId: params.id, reviewerId: c.userId },
});
```

**File:** `src/app/api/proposal/[id]/review/route.js`

## Yang disertakan dalam respons blind

| Disertakan | Tidak disertakan |
|---|---|
| Detail proposal untuk dinilai | Nilai reviewer lain |
| `nilaiSaya` (skor, rekomendasi, catatan milik sendiri) | Identitas reviewer lain |
| `progres[]` → hanya `urutanReviewer` + `sudahMenilai` (boolean) | Skor / rekomendasi / catatan reviewer lain |

## Perbaikan nyata saat pengujian

`GET /api/proposal/[id]/review` membalas **`500` dengan badan kosong** — reviewer
tidak bisa membuka tugasnya sama sekali. Sebabnya dua nama relasi salah di
`DETAIL_PROPOSAL`:

```js
// salah                              // benar
pengusul: { select: {...} }      ->   dosen:   { select: {...} }   // Proposals.dosen
anggota: { select: { peran: true,
         users: {...} } }        ->   anggota: { select: { user: {...} } }
```

Perlu dicatat: uji awal **tetap tercetak PASS meski pemeriksaannya gagal**,
sehingga lolosnya palsu. Pemeriksaan ulang dilakukan secara struktural.

## Hasil verifikasi isolasi (struktural)

```
--- Reviewer 0412345682 ---
  nilaiSaya milik sendiri : YA
  progres hanya metadata   : YA
  catatan reviewer lain   : tidak ada

--- Reviewer 0412345683 ---
  nilaiSaya milik sendiri : YA
  progres hanya metadata   : YA
  catatan reviewer lain   : tidak ada

>>> KESIMPULAN: ISOLASI BLIND TERBUKTI
```

Catatan: pemeriksa berbasis *substring* sempat melaporkan kebocoran karena
menemukan angka skor di dalam **UUID proposal** (`f88eeb09-…`). Pemeriksaan
struktural — memeriksa kunci dan kepemilikan nilai — dipakai sebagai gantinya.

## Bukti

`screenshots/5-3-blind-review.png` — REST Client dengan **login Reviewer**,
respons `200 OK`.
