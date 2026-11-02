# 8-3 · CMS Berita Draft→Review→Publish + Galeri/Dokumen

**Modul:** M6 Konten Publik · **Status:** selesai

## Alur berita berjenjang

```
DRAFT ──ajukan──▶ REVIEW ──terbit──▶ TERBIT
  ▲                 │                  │
  └─────tarik───────┴──────tarik───────┘
```

**File:** `src/app/api/admin/berita/`

Lompatan `DRAFT → TERBIT` **ditolak** (`409 TRANSISI_TIDAK_SAH`). Inilah isi
butir 8-3: penulis mengajukan, penerbit menerbitkan — dua kegiatan terpisah,
sehingga tidak ada tulisan yang langsung tayang tanpa pemeriksaan.

## Tiga keputusan yang menentukan perilaku

**1. Berita TERBIT tidak bisa disunting.**
Harus ditarik ke DRAFT lebih dulu. Bila tidak, versi yang tayang bisa berubah
diam-diam di bawah kaki pembaca yang sedang membacanya.

**2. Publik hanya melihat TERBIT.**
Berita DRAFT/REVIEW menghasilkan **`404`, bukan `403`** — kalau memakai 403,
responsnya sendiri membocorkan keberadaan tulisan yang belum tayang.

**3. `publishedAt` hanya terisi saat terbit, dan dikosongkan saat ditarik.**
Sehingga urutan tayang di publik selalu mengikuti waktu terbit sebenarnya,
bukan waktu pembuatan.

## Galeri & Dokumen Publik

Berbeda dengan berita, keduanya **tidak punya tahap tinjauan** — unggahan
langsung tayang. Perbedaan ini disengaja: foto kegiatan dan dokumen panduan
bukan tulisan opini.

## Perbaikan saat pengujian

**Middleware tidak mengenali rute publik.** `PUBLIC_PREFIX` memuat `/api/publik`
(bahasa Indonesia), sedangkan rute yang dibuat `/api/public/...` (Inggris) —
sehingga semua rute publik mengembalikan `401`. Diperbaiki dengan menambah
`/api/public`.

**`PATCH` ditaruh di rute yang salah.** Ada di `berita/route.js`, padahal
permintaan `PATCH /api/admin/berita/<id>` jatuh ke `berita/[id]/route.js`
yang belum ada — jadi `404`.

**`select` tidak menyertakan `status`** di rute rincian publik, padahal kode
memeriksa `b.status !== 'TERBIT'`. Tanpa kolom itu nilainya `undefined`, jadi
**semua berita akan 404**.

**Ketidakkonsistenan kunci respons** — galeri dan berita memakai `total`,
dokumen memakai `jumlah`. Disamakan ke `total`.

## Hasil uji

```
PASS tulis berita, status awal DRAFT
PASS publishedAt masih kosong
PASS lompatan DRAFT -> TERBIT ditolak (409)
PASS ajukan ke REVIEW / terbitkan dari REVIEW
PASS publishedAt terisi saat terbit
PASS daftar berita publik tanpa login (200)
PASS berita DRAFT tidak terbaca publik (404)
PASS sunting berita TERBIT ditolak (409)
PASS tarik dari tayangan; hilang dari publik (404)
PASS DOSEN ditolak daftar & menulis berita (403)
PASS Galeri: tambah, tampil, hapus, hilang
PASS Dokumen publik: unggah, tampil, RBAC
```

## Regresi

Middleware disentuh untuk membuka rute publik. Regresi M1–M9 + hardening tetap
**26/26**.

## Bukti

`screenshots/8-3-kms-berita.png` — REST Client, daftar berita publik.

Total Fase 8: **45 uji lolos, 0 gagal** (17 M5 + 28 CMS).
