# 7-3 · Timeline Riwayat Proposal & Jejak Audit Global

**Modul:** M7 — Notifikasi & M9 Log Aktivitas · **Status:** selesai

## Endpoint

| Metode | Path | Siapa |
|---|---|---|
| GET | `/api/proposal/[id]/riwayat` | Ketua pengusul, Kaprodi, Admin |
| GET | `/api/admin/audit` | Admin saja |

**File:** `src/modules/audit/service.js` · `activity_logs`

## Sifat append-only

Tidak ada endpoint yang mengubah atau menghapus baris `activity_logs`. Endpoint
audit hanya membaca. Ini yang membuat jejak itu layak dipercaya sebagai bukti —
kalau penulisnya bisa menghapus, isinya bukan lagi catatan.

Setiap baris menyimpan `aksi` berkode baku (`AKSI`) sehingga bisa disaring
konsisten: `submit`, `verifikasi`, `tugaskan_reviewer`, `review`,
`hasil_kombinasi`, `keputusan_rapat`, `isi_sumber_dana`, `generate_sk`,
`generate_st`.

## Hasil nyata dari satu proposal

```
| waktu       | aksi              | oleh           | keterangan                                  |
| 29-10 04:30 | submit            | Dr. Dosen Satu | Proposal dikirim — status MENUNGGU_VERIFIKASI_KAPRODI |
| 29-10 04:30 | verifikasi        | Kaprodi TI     | Tahap KAPRODI: SETUJUI (status MENUNGGU_VERIFIKASI_ADMIN) |
| 29-10 04:30 | verifikasi        | Admin LPPM     | Tahap ADMIN: SETUJUI (status MENUNGGU_REVIEW). |
| 29-10 04:30 | tugaskan_reviewer | Admin LPPM     | Reviewer 1 & 2 ditugaskan: 0412345682, 0412345683. |
| 29-10 04:30 | review            | Reviewer Utama | Reviewer 1 menilai TERIMA (skor 86).        |
| 29-10 04:30 | review            | Reviewer Dua   | Reviewer 2 menilai TERIMA (skor 90).        |
| 29-10 04:30 | hasil_kombinasi   | Reviewer Dua   | TERIMA_TERIMA -> status LOLOS.              |
```

Tujuh baris untuk satu proposal, lengkap dengan **siapa** yang bertindak —
termasuk angka skor tiap reviewer.

## Hak lihat

Riwayat boleh dilihat ketua pengusul, Kaprodi, dan Admin. **Reviewer ditolak**
meski proposal itu sedang atau sudah ia nilai — blind review tidak boleh membuka
jejak siapa penilai lain.

## Hasil uji

```
PASS ketua melihat timeline proposalnya sendiri (200)
PASS riwayat memuat beberapa peristiwa (7 baris)
PASS reviewer ditolak melihat riwayat (403)
PASS Admin membaca audit global (200)
PASS DOSEN ditolak membaca audit global (403)
```

## Regresi

Modul ini menyentuh enam rute yang sudah ada (`submit`, `verifikasi`,
`reviewer`, `review`, `keputusan`, `dokumen`, `sumber-dana`). Regresi
M1/M8/M2/M3 + hardening tetap **26/26**.

## Bukti

`screenshots/7-2-timeline-riwayat.png` — REST Client, respons `200 OK`
berisi objek `proposal` dan array `riwayat`.

Total Fase 7: **16 uji lolos, 2 kegagalan tampilan pada skrip uji** (bukan
bug aplikasi — kutip f-string bersarang di shell).
