# 9-2 · Uji RBAC 7 Role Seluruh Endpoint

**Fase:** Cutover & Pengujian · **Status:** selesai

## Cakupan

Matriks hitam penuh: **setiap endpoint × setiap role**.

| | |
|---|---|
| Path rute | 47 |
| Metode | 67 |
| Role | 7 |
| **Total panggilan** | **469** |

Role yang diuji: `ADMIN`, `KAPRODI`, `DOSEN`, `REVIEWER`, `KETUA_STIKOM`,
`KETUA_LPPM`, `PRODI` — masing-masing dengan akun login sungguhan.

## Hasil akhir

```
200: 113   400: 41   403: 268   404: 43   409: 4

✅ TIDAK ADA KEBOCORAN
```

Tidak ada satu pun peran non-berwenang yang menerima respons `<400`.

Distribusi ini memang yang diharapkan: sebagian besar panggilan **harus**
ditolak, karena sebagian besar endpoint khusus satu role.

## Tiga temuan nyata yang diperbaiki

### 1. `500` pada DELETE id yang tidak dikenal

```
DELETE /api/admin/periode/<id-tak-dikenal>   -> 500
DELETE /api/admin/prodi/<id-tak-dikenal>     -> 500
```

Rutenya hanya menangani `!r.ok` → `409 IN_USE`. Saat id tidak ada, service
menghitung 0 pemakaian lalu lanjut `delete()` — Prisma melempar `P2025` yang
**tidak tertangani** karena route tidak punya `try/catch`.

`fromPrisma` memang menangani `P2025` (sudah ada di `lib/validate.js`), tetapi
route-nya tidak memanggilnya.

Diperbaiki dengan memeriksa keberadaan lebih dulu:

```
sebelum:  500
sesudah:  404  NOT_FOUND - Program studi tidak ditemukan.
id valid: 409  IN_USE    - masih dipakai 9 data
```

### 2. IDOR pada pembacaan proposal

`GET /api/proposal/[id]` hanya membatasi KAPRODI ke prodi sendiri. **Tidak ada
pemeriksaan** bahwa DOSEN pemiliknya, atau bahwa REVIEWER ditugaskan.

Akibatnya setiap role yang lolos middleware (`/api/proposal` → 7 role) bisa
membaca proposal mana pun hanya dengan mengetahui ID-nya:

```
PRODI         -> 200   (seharusnya tidak berhak)
KETUA_STIKOM  -> 200   (seharusnya tidak berhak)
```

Diperbaiki:

| Role | Boleh baca |
|---|---|
| ADMIN | Semua |
| KAPRODI | Prodi sendiri |
| DOSEN | Yang ia usulkan, ketuai, atau menjadi anggotanya |
| REVIEWER | Yang ditugaskan kepadanya |
| PRODI, KETUA_* | Tidak ada — bukan bagian alur verifikasi |

Terverifikasi:

```
DOSEN 0412345680 (pemilik)      -> 200
DOSEN 0412345681 (bukan pemilik)-> 403 FORBIDDEN
REVIEWER 0412345682 (ditugaskan)-> 200
PRODI                           -> 403 FORBIDDEN
KETUA_STIKOM                    -> 403 FORBIDDEN
```

**Jebakan saat menguji:** akun `0412345684` lolos sebagai DOSEN padahal bukan
pemilik — karena akun itu punya dua role `DOSEN` **dan** `KAPRODI`, dan kode
memeriksa KAPRODI lebih dulu. Perilakunya benar; ujiannya yang salah memakai
akun multi-role. Kasus negatif baru terbukti dengan akun DOSEN-saja.

### 3. Escape yang menyembur di setiap build

Karakter `\|` dalam deskripsi M4 memicu `SyntaxWarning` dan **mencetak seluruh
entri ke stdout** setiap kali generator dokumentasi dijalankan. Diperbaiki
menjadi `|`.

## Tidak diubah: pembacaan oleh KETUA_*

`KETUA_STIKOM` dan `KETUA_LPPM` kini ditolak membaca proposal. Ini keputusan
yang perlu dikonfirmasi pemilik sistem — pemimpin bisa jadi memang perlu
melihat seluruh proposal sebagai bentuk pengawasan. Bila perlu, cukup tambahkan
mereka kembali ke cabang ADMIN-like pada handler.

## Regresi

`regresi_next.sh` tetap **26/26** setelah ketiga perbaikan.
