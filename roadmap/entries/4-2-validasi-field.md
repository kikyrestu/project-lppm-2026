# Fase 4 · 4-2 — Validasi field dinamis terhadap konfigurasi M8

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Prisma, Zod, curl

## Aturan inti

Nilai dari klien **tidak diterima apa adanya**. `fieldTambahan` divalidasi
terhadap tabel `form_field_configs`:

1. **Field wajib** (konfigurasi `wajib = true`) harus terisi
2. **Field tak terdaftar ditolak** — mencegah klien menyuntikkan kunci sembarang ke kolom Json
3. **Tipe nilai dicek** terhadap `tipeInput`
4. **Opsi `select` diverifikasi** terhadap daftar yang dikonfigurasi admin

## Konfigurasi yang dipakai pada pengujian

| jenis | label | tipe | wajib | opsi |
|---|---|---|---|---|
| PENELITIAN | Bidang Riset | select | ya | Informatika, Sistem Informasi, Data Science |
| PENELITIAN | Target Luaran | text | tidak | — |
| PENGABDIAN | Lokasi Pengabdian | text | ya | — |
| KKN | Desa Sasaran | text | ya | — |

## Hasil pengujian — 6/6 lulus

```
PASS  tanpa field wajib (Desa Sasaran)        -> 400
PASS  dengan field wajib terisi               -> 201
PASS  field tidak terdaftar                   -> 400
PASS  PENELITIAN tanpa Bidang Riset (wajib)   -> 400
PASS  select diisi opsi tak terdaftar         -> 400
PASS  PENELITIAN dengan opsi sah              -> 201
```

## Dua bug yang ditemukan dan diperbaiki saat pengerjaan

### 1. Bentuk `opsi` di database ternyata objek, bukan array
```json
{"pilihan":["Informatika","Sistem Informasi","Data Science"]}
```
Validasi awal menulis `Array.isArray(k.opsi) ? k.opsi : []` — karena nilai
berbentuk objek, hasilnya `[]`, sehingga **setiap nilai select selalu ditolak**
sebagai tidak sah. Diperbaiki dengan menormalkan bentuk:
```js
const opsi = Array.isArray(k.opsi) ? k.opsi
  : Array.isArray(k.opsi?.pilihan) ? k.opsi.pilihan
  : [];
```

### 2. Enum `JenisProposal` di route M8 tidak cocok dengan skema
Route `form-field` memakai 5 nilai (`PENGABDIAN_MASYARAKAT`, `PKM`), padahal
`enum JenisProposal` di skema hanya berisi 3 (`PENELITIAN`, `PENGABDIAN`,
`KKN`). Dampaknya: Zod menerima `PKM`, lalu Prisma melempar error menjadi
`500 INTERNAL` alih-alih `400` yang bersih.

```
jenis=PKM                    -> HTTP 400  VALIDATION
jenis=PENELITIAN_MASYARAKAT  -> HTTP 400  VALIDATION
jenis=KKN                    -> HTTP 201  OK
```

## Artefak
- `src/app/api/proposal/route.js`
- Screenshot: `screenshots/4-2-validasi.png`
