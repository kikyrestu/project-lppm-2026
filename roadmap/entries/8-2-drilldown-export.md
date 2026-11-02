# 8-2 · Drill-down & Export Excel/PDF

**Modul:** M5 Rekap Eksekutif · **Status:** selesai

## Drill-down: angka yang bisa diklik

`GET /api/admin/rekap/rincian?dimensi=status&nilai=Lolos`

| Dimensi | Mengembalikan |
|---|---|
| `status` | Proposal pada tahap itu |
| `jenis` | Proposal berdasarkan PENELITIAN/PENGABDIAN/KKN |
| `prodi` | Proposal satu prodi |
| `dosen` | Proposal sebagai pengusul, ketua, **atau anggota tim** |
| `reviewer` | Daftar penilaian reviewer itu |

Nilai `status` dikirim sebagai bucket, jadi diterjemahkan balik ke status
mentah sebelum dicari — inilah yang membuat angka rekap dan daftar rinciannya
selalu cocok.

Untuk `dosen`, pencarian memakai `OR` atas pengusul dan anggota tim, karena
seorang dosen bisa muncul di rekap dengan dua peran berbeda.

## Export Excel tanpa pustaka spreadsheet

`.xlsx` hanyalah arsip ZIP berisi XML. Ditulis tangan dengan `adm-zip`
(sekitar 300 KB) ketimbang pustaka spreadsheet berat.

Hasilnya diverifikasi dengan **pembaca xlsx sungguhan** (`openpyxl`), bukan
hanya dengan memeriksa apakah berkasnya berupa ZIP:

```
openpyxl OK — nama lembar: Rekap
ukuran : 9 baris x 3 kolom
  ('Kategori', 'Jenis', 'Jumlah')
  ('Pra-Kirim', 'Tahap', 0)
  ...
```

Semua sel terisi angka sebagai angka (tipe numerik), bukan teks.

## Export PDF

Naskah rekap dirender chromium lewat `puppeteer-core` — sama dengan yang
dipakai untuk SK/ST, sehingga tampilannya konsisten.

## Cakupan

Endpoint export mengikuti aturan rekap: `/api/admin/rekap/export` khusus
ADMIN, Kaprodi memakai rekapnya sendiri.

## Hasil uji

```
PASS drill-down status=Lolos (200)
PASS jumlah drill-down sama dengan angka rekap (1)
PASS drill-down dimensi=reviewer (200)
PASS DOSEN ditolak dari drill-down (403)
PASS export xlsx (200)   — 6 arsip, 9 baris, 27 sel, 2229 byte
PASS export pdf (200)    — 30783 byte, "Total proposal: 1"
PASS DOSEN ditolak export (403)
```

## Bukti

`screenshots/8-1-rekap-eksekutif.png` — endpoint drill-down.
