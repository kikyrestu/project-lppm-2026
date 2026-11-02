# 6-3 · Generator PDF SK & ST

**Modul:** M4 — Penerbitan Dokumen SK & ST · **Status:** selesai

## Pilihan teknologi

| | Alasan |
|---|---|
| **chromium sistem + `puppeteer-core`** | Naskah dinas penuh kop surat, tabel, dan blok tanda tangan — jauh lebih setia bila digambar dengan HTML/CSS ketimbang disusun per-satuan dengan pustaka PDF murni JS |
| `puppeteer-core` (bukan `puppeteer`) | Hanya sekitar 3 MB karena memakai chromium yang sudah terpasang; tidak mengunduh browser sendiri |

Hasilnya identik dengan yang terlihat di layar, termasuk garis ganda kop surat.

**File:**
- `src/modules/dokumen/pdf-template.js` — templat SK & ST
- `src/app/api/proposal/[id]/dokumen/sk.pdf/route.js`
- `src/app/api/proposal/[id]/dokumen/st.pdf/route.js`

## Isi templat

- Kop surat: instansi, lembaga, alamat
- Judul + nomor
- Dasar hukum (ST merujuk nomor SK)
- Tabel rinci: judul, jenis, ketua, prodi, periode, sumber dana, anggaran
- Daftar tim pelaksana (bila ada anggota)
- Paragraf penutup + blok tanda tangan

## Perbaikan nyata saat pengujian

`pdftotext` menangkap teks `program Penelitian Tahun **undefined**` — field
`tahun` tidak pernah dikirim ke templat. Diperbaiki dengan menurunkannya dari
`tanggalTerbit`, bukan dari input klien:

```js
tahun: dok.tanggalTerbit
  ? new Date(dok.tanggalTerbit).getFullYear()
  : new Date().getFullYear(),
```

Setelah diperbaiki: nol kecocokan `undefined`/`null` di kedua dokumen.

Cacat kedua ada pada rute `sk.pdf`: payload memakai `dok.pembuat` untuk tanda
tangan, tetapi `select` tidak menyertakannya sehingga tanda tangan kosong.

## Hasil uji

```
PASS sk.pdf -> 200, 47010 byte, PDF document
PASS st.pdf -> 200, 45419 byte, PDF document
isi teks SK: SK/LPPM/0003/2026
isi teks ST: ST/LPPM/0002/2026
```

Verifikasi visual memastikan kop surat, nomor, tabel, penutup, dan blok tanda
tangan tersusun rapi — tanpa tumpang tindih, tanpa teks terpotong, tanpa
placeholder liar. Tanda tangan diisi oleh **pejabat yang menerbitkan dokumen**.

## Bukti

`screenshots/6-3-pdf-sk.png` — hasil render SK menjadi gambar halaman pertama.

Total Fase 6: **13 uji lolos, 0 gagal.**
