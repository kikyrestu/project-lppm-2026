# 9-1 · Audit Disiplin File

**Fase:** Cutover & Pengujian · **Status:** selesai

## Hasil

| Pemeriksaan | Hasil |
|---|---|
| File JS route | 47 |
| File JS modul | 16 |
| Rata-rata panjang file | **64 baris** |
| File di atas 1000 baris | **0** |
| File di atas 600 baris | 2 (keduanya dokumentasi, bukan source) |

Dua file terpanjang adalah `docs/gen_api_doc.py` (1731 baris) dan keluarannya
`dokumentasi-api.html` (843 baris) — keduanya artefak dokumentasi, bukan kode
aplikasi. **Tidak ada satu pun file source aplikasi yang melewati 600 baris.**

## Mengapa ini penting

Aturan "<1000 baris per file" bukan sekadar estetika. File yang pendek:

- mudah dibaca ulang setelah beberapa minggu
- punya satu alasan untuk berubah, sehingga konflik merge jarang terjadi
- bisa diuji terpisah

Rata-rata 64 baris berarti setiap file benar-benar memuat satu tanggung jawab.
Route handler secara khusus rata-rata pendek karena logika bisnis ditarik ke
`src/modules/*`, bukan ditumpuk di dalam handler.

## "1 tombol = 1 file"

Satu tombol di roadmap peta = satu berkas bukti:

```
roadmap/screenshots/NN-<nama>.png   gambar
roadmap/entries/NN-<nama>.md        penjelasan
```

Saat ini 27 screenshot dan 30 berkas bukti, semuanya tertaut dari `roadmap.json`
dan tampil otomatis di dashboard.
