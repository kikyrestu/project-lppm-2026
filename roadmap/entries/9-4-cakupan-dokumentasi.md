# Cakupan Dokumentasi API — 67 dari 67 Rute

**Status:** cakupan 100%, seluruh rute nyata terdokumentasi

## Tiga format, satu generator

| Berkas | Ukuran |
|---|---|
| `docs/dokumentasi-api.html` | 129.784 byte |
| `docs/dokumentasi-api.pdf` | 1.740.640 byte |
| `docs/dokumentasi-api.docx` | 58.091 byte |

Gaya visual mengikuti dokumen ERD — token warna latar `#0b0f17`, kartu
`#131a26`, header `#1a2334`, garis `#243247`, penanda PK `#f59e0b`, FK
`#38bdf8`, dengan Plus Jakarta Sans dan JetBrains Mono.

Generator: `docs/gen_api_doc.py`

## Pemeriksaan cakupan otomatis

Cakupan tidak diklaim dari ingatan — dihitung membandingkan daftar rute nyata
(baca setiap `route.js`, ambil `export function GET|POST|PUT|PATCH|DELETE`)
dengan entri di generator:

```
rute nyata    : 67
terdokumentasi: 67
belum         : 0
```

## Isi tiap entri

Setiap endpoint memuat:

- **metode & path** — dengan parameter dinamis (`:id`, `:userId`)
- **ringkas** — satu kalimat fungsi
- **auth** — role yang diizinkan
- **body** — tiap field: nama, tipe, wajib/tidak, keterangan
- **respons** — tiap kode status beserta artinya
- **contoh** — permintaan dan respons sukses dalam bentuk JSON nyata
- **contoh gagal** — respons error lengkap dengan `code` dan `message`
- **catatan** — keputusan desain yang perlu diketahui pembaca

Contoh catatan yang disertakan:

> Berita DRAFT/REVIEW mengembalikan **404, bukan 403** — bila memakai 403,
> responsnya sendiri membocorkan keberadaan tulisan yang belum tayang.

> `userId` ikut dalam `where`: notifikasi orang lain tidak menghasilkan baris
> yang cocok, sehingga jawabannya `404` — sama seperti yang memang tidak ada.

## Bagian yang ditambahkan

| Grup | Endpoint |
|---|---|
| M5 Rekap Eksekutif & Drill-down | 6 |
| M6 Konten Publik (CMS Berita/Galeri/Dokumen) | 16 |
| M7 & M9 Notifikasi dan Jejak Audit | 5 |
| M8 bagian per item (form-field, periode, prodi) | 8 |
| M2 bagian per item (anggota tim, ST.pdf, reviewer) | 5 |

Ditambah 6 entri lama yang sudah diperbaiki jalurnya (M4 dokumen), total
penambahan **40 endpoint** dari dokumentasi sebelumnya.

## Enam entri "rencana" yang tersisa

Entri berstatus `rencana` adalah bagian dari desain awal yang memang belum
dibangun sebagai API tersendiri — bukan rute yang hilang. Seluruh **67 rute
yang benar-benar ada sudah terdokumentasi**.

## Regenerasi

```bash
cd docs
python3 gen_api_doc.py                                  # HTML + DOCX
chromium --headless --disable-gpu --no-sandbox \
  --print-to-pdf=dokumentasi-api.pdf --no-pdf-header-footer \
  file://$PWD/dokumentasi-api.html                      # PDF
```
