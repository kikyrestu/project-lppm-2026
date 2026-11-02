# Fase 3 · 3-2 — CRUD Program Studi & Periode Akademik

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Next.js route handler, Prisma, curl

## Endpoint

| Method | Path | Fungsi |
|---|---|---|
| `GET` | `/api/admin/prodi` | Daftar program studi |
| `POST` | `/api/admin/prodi` | Tambah program studi |
| `GET`/`PUT`/`DELETE` | `/api/admin/prodi/:id` | Ubah / hapus |
| `GET` | `/api/admin/periode` | Daftar periode akademik |
| `POST` | `/api/admin/periode` | Tambah periode |
| `GET`/`PUT`/`DELETE` | `/api/admin/periode/:id` | Ubah (termasuk aktivasi) / hapus |

Semua rute dijaga middleware `ADMIN`.

## Aturan bisnis yang diterapkan

### 1. Kode program studi unik
Duplikat ditolak sebelum sampai ke database:
```text
POST {"kode":"SJ","nama":"Sistem Jaringan"}     HTTP 201
POST {"kode":"SJ","nama":"Duplikat"}            HTTP 409
  {"ok":false,"code":"CONFLICT","message":"Kode \"SJ\" sudah dipakai."}
```

### 2. Tidak boleh menghapus program studi yang masih dipakai
Dihitung dulu jumlah user + proposal yang merujuk, bukan menunggu error FK:
```text
DELETE /api/admin/prodi/<id TI>
  HTTP 409
  {"ok":false,"code":"IN_USE","message":"Program studi masih dipakai 8 data dan tidak dapat dihapus."}
```

### 3. Tepat SATU periode aktif
Ini aturan paling penting untuk M2 — kalau ada dua periode aktif, filter laporan jadi ambigu.

Diimplementasikan dengan **transaction**: sebelum mengaktifkan satu periode, semua periode lain dinonaktifkan.
```js
async update(id, d) {
  return prisma.$transaction(async (tx) => {
    if (d.isActive) {
      await tx.periodeAkademik.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      });
    }
    return tx.periodeAkademik.update({ where: { id }, data: d });
  });
}
```

### Hasil pengujian — invarian terbukti
```text
POST  /api/admin/periode {"nama":"2027/2028 Ganjil",...,"isActive":true}   HTTP 201
periode aktif: 1 dari 3
PUT   /api/admin/periode/<periode lama> {"isActive":true}                    HTTP 200
periode aktif: 1 dari 3
```
Mengaktifkan periode kedua **otomatis menonaktifkan** yang pertama. Jumlah tetap 1, bukan 2.

## Artefak
- `src/app/api/admin/prodi/route.js` + `[id]/route.js`
- `src/app/api/admin/periode/route.js` + `[id]/route.js`
- Screenshot: `screenshots/3-2-crud-master.png`
