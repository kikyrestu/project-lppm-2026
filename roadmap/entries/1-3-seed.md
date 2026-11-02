# Fase 1 · 1-3 — Seed data awal (7 role, 11 users, multi-role)

**Status:** ✅ Selesai
**Tanggal:** 2026-10-28
**Tool:** `prisma db seed` (`prisma/seed.mjs`, bcryptjs)

## Isi seed

| Tabel | Jumlah | Keterangan |
|---|---|---|
| `program_studi` | 2 | TI (Teknik Informatika), MI (Sistem Informasi) |
| `periode_akademik` | 1 | 2026/2027 Ganjil (`isActive: true`) |
| `form_field_configs` | **4** | Field dinamis per jenis proposal |
| `users` | **11** | Semua `status: AKTIF` |
| `user_roles` | **12** | 11 user + 1 akun multi-role |

## Distribusi role (7 role lengkap)

| Role | Jumlah | Akun |
|---|---|---|
| DOSEN | 3 | 0412345680, 0412345681, 0412345684 |
| KAPRODI | 3 | 0412345678 (TI), 0412345679 (MI), 0412345684 |
| REVIEWER | 2 | 0412345682, 0412345683 |
| ADMIN | 1 | 9999999001 |
| KETUA_STIKOM | 1 | 9999999002 |
| KETUA_LPPM | 1 | 9999999003 |
| PRODI | 1 | 9999999004 |

> `Prof. Multi Role` (0412345684) memegang **DOSEN + KAPRODI** → untuk menguji *dashboard selector* multi-role pada M1.

---

## 🐛 Bug yang ketahuan lewat screenshot proses

Bagian ini yang paling penting untuk laporan. Awalnya seed **tidak idempotent**, dan itu ketahuan **bukan dari membaca kode**, tapi dari membandingkan angka di screenshot proses: `form_field_configs` muncul **8**, padahal seharusnya **4**.

### Gejala
```text
awal            : form_field_configs = 4
setelah diulang : form_field_configs = 8   <- dobel
```

### Akar masalah
`prisma/seed.mjs` memakai:
```js
await prisma.formFieldConfig.createMany({ data: f, skipDuplicates: true });
```
`skipDuplicates: true` **hanya** bekerja ketika ada **unique constraint** yang bentrok. Model `FormFieldConfig` saat itu **tidak punya unique key sama sekali** — hanya `@@index([jenisProposal, urutan])` yang non-unique, dan `id` UUID selalu baru. Akibatnya tidak pernah ada bentrokan → semua baris di-insert lagi.

Bukti di database (dua baris identik, ID berbeda):
```text
KKN / Desa Sasaran / text / wajib=1 / urutan=1   id=537aeff4-...
KKN / Desa Sasaran / text / wajib=1 / urutan=1   id=8d2c9719-...   <- duplikat
```

### Perbaikan
1. Tambah unique constraint di `schema.prisma`:
   ```prisma
   @@unique([jenisProposal, label])
   ```
2. Hapus baris duplikat yang sudah terlanjur ada (multi-table `DELETE`).
3. Buat migrasi `20261028095122_unique_form_field_config`.
4. Ubah seed dari `createMany` menjadi **`upsert`** di kunci `(jenisProposal, label)` — sekaligus bisa meng-*update* konfigurasi lama bila labelnya berubah.
5. `npx prisma generate` ulang, karena key gabungan `jenisProposal_label` baru tersedia setelah client di-regenerate. (Tanpa ini muncul `PrismaClientValidationError`.)

### Hasil — idempoten terbukti
Seed dijalankan **3 kali berturut-turut**, seluruh jumlah konstan:
```text
sebelum  : users=11 roles=12 fields=4 prodi=2
seed ke-1: users=11 roles=12 fields=4 prodi=2
seed ke-2: users=11 roles=12 fields=4 prodi=2
seed ke-3: users=11 roles=12 fields=4 prodi=2
IDEMPOTEN TERBUKTI - fields tetap 4 (tidak dobel)
```

Sekarang duplikat **ditolak database**, bukan cuma dicegah aplikasi:
```text
ERROR 1062 (23000): Duplicate entry 'KKN-Desa Sasaran'
  for key 'form_field_configs_jenis_proposal_label_key'
```

---

## Catatan keamanan
Password demo `LppmDemo123!` di-hash bcrypt (cost 10) dan **wajib diganti** sebelum demo sidang / deployment.
