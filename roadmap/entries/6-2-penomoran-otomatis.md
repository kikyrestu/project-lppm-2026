# 6-2 · Penomoran Otomatis SK & ST

**Modul:** M4 — Penerbitan Dokumen SK & ST · **Status:** selesai

## Bentuk nomor

```
SK/LPPM/0001/2026      Surat Keputusan
ST/LPPM/0001/2026      Surat Tugas
```

Urutan dihitung per tahun. **SK dan ST memakai deret terpisah**, sehingga
`SK/LPPM/0002/2026` bisa berdampingan dengan `ST/LPPM/0001/2026` untuk
proposal yang berbeda.

**File:** `src/modules/dokumen/service.js` · rute `POST /api/proposal/[id]/dokumen`

## Jaminan keunikan — bukan sekadar dihitung

Cara lemah: hitung baris lalu tambah satu. Itu rapuh bila dua admin menekan
"terbitkan" bersamaan, karena keduanya menghitung nilai yang sama.

Yang dipakai di sini:

```prisma
@@unique([nomorSk])
@@unique([nomorSt])
```

Migrasi `20261029_unique_nomor_sk_st` membuat index unique di database. Jadi
percobaan serentak **tidak pernah menghasilkan nomor ganda** — hanya satu yang
berhasil, yang kalah mendapat `P2002` lalu diminta mengulang (dan sistem akan
memilih nomor berikutnya).

Nomor tertinggi diambil lewat satu query gabungan atas `nomor_sk` dan
`nomor_st`, sehingga deret tiap prefix tetap akurat.

## Aturan yang dijalankan

1. Khusus role **ADMIN**.
2. Proposal harus `LOLOS` atau `MENUNGGU_SK_ST`.
3. **Sumber dana wajib terisi** sebelum dokumen terbit (`409 SUMBER_DANA_KOSONG`)
   — nomor SK/ST tidak boleh lahir tanpa sumber anggaran.
4. **ST mensyaratkan SK lebih dulu** (`409 SK_BELUM_TERBIT`) — surat tugas tidak
   mendahului keputusan.
5. Penerbitan ganda ditolak (`409 SK_SUDAH_TERBIT` / `ST_SUDAH_TERBIT`).
6. Seluruh pemeriksaan dan penulisan berada **di dalam satu transaksi**.

## Hasil uji

```
PASS ST ditolak sebelum SK terbit (409 SK_BELUM_TERBIT)
PASS DOSEN ditolak menerbitkan (403)
PASS SK terbit (201)                  -> SK/LPPM/0003/2026
PASS SK ganda ditolak (409 SK_SUDAH_TERBIT)
PASS ST terbit setelah SK (201)       -> ST/LPPM/0002/2026
PASS nomor urut naik berurutan (3 -> 4)
PASS tidak ada nomor SK kembar (0)
```

## Bukti

`screenshots/6-2-penomoran-otomatis.png` — REST Client, respons `200 OK`
berisi nomor dokumen.
