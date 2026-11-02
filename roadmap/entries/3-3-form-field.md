# Fase 3 · 3-3 — FormFieldConfig: builder field dinamis

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Next.js route handler, Prisma, Zod, curl

## Peran
Modul ini adalah **konfigurasi form** yang akan dikonsumsi **M2 Proposal**. Dosen tidak mengisi form yang dikoding mati — field-nya ditentukan oleh admin lewat endpoint ini.

## Endpoint

| Method | Path | Fungsi |
|---|---|---|
| `GET` | `/api/admin/form-field?jenis=KKN` | Daftar field (bisa difilter per jenis) |
| `POST` | `/api/admin/form-field` | Tambah field |
| `GET`/`PUT`/`DELETE` | `/api/admin/form-field/:id` | Ubah / hapus |

## Aturan bisnis

### 1. Kunci unik `(jenisProposal, label)`
Berasal dari perbaikan di **Fase 1 (1-3)** — tanpa ini, `createMany(skipDuplicates)` jadi no-op dan field dobel.
```text
POST {"jenisProposal":"KKN","label":"Nama Dusun","tipeInput":"text",...}   HTTP 201
POST {"jenisProposal":"KKN","label":"Nama Dusun","tipeInput":"text",...}   HTTP 409
  {"ok":false,"code":"CONFLICT","message":"Field \"Nama Dusun\" sudah ada pada KKN."}
```

### 2. `select` wajib punya opsi
Dijaga di level Zod lewat `refine`, jadi tidak mungkin menyimpan field pilihan tanpa pilihan:
```text
POST {"jenisProposal":"KKN","label":"Pilih","tipeInput":"select"}          HTTP 400
  {"ok":false,"code":"VALIDATION","message":"Format permintaan tidak valid",
   "detail":[{"field":"opsi","message":"Tipe select wajib memiliki minimal satu opsi."}]}
```

### 3. Ganti nama label dicek ulang
Saat `PUT` mengubah `label`, duplikat diperiksa terhadap field **lain** pada jenis yang sama (id sendiri dikecualikan).

### 4. Filter `jenis` divalidasi
`GET ?jenis=XXX` dengan nilai di luar enum menghasilkan `400` beserta daftar pilihan yang sah, bukan `200` kosong yang menyesatkan.

## Hasil pengujian
```text
GET  /api/admin/form-field?jenis=KKN   -> field "Desa Sasaran"
POST {"label":"Nama Dusun",...}        -> HTTP 201
POST {"label":"Nama Dusun",...}        -> HTTP 409 (duplikat)
POST {"label":"Pilih","tipeInput":"select"} -> HTTP 400 (opsi wajib)
DELETE /api/admin/form-field/<id>      -> HTTP 200
field KKN akhir: ['Desa Sasaran']      <- kembali bersih
```

## Catatan untuk M2
Saat M2 dibangun, field yang dikembalikan `GET /api/admin/form-field?jenis=X` akan divalidasi terhadap `field_tambahan` (JSON) pada proposal. **Nilai dari klien tidak boleh diterima apa adanya** — hanya field yang terdaftar di konfigurasi ini yang valid.

## Artefak
- `src/app/api/admin/form-field/route.js` + `[id]/route.js`
- Screenshot: `screenshots/3-3-form-field.png`
