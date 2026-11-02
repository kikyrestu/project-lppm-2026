# Fase 1 · 1-2 — Migrate: 18 tabel / 20 FK / 47 index

**Status:** ✅ Selesai
**Tanggal:** 2026-10-28
**Tool:** `prisma migrate dev`, `prisma migrate deploy`

## Migrasi yang diterapkan

| # | Nama | Isi |
|---|---|---|
| 1 | `20261028071954_init_18_tables` | 18 tabel + FK + index awal |
| 2 | `20261028095122_unique_form_field_config` | unique `(jenis_proposal, label)` — perbaikan bug di 1-3 |

## Verifikasi langsung ke MySQL

```sql
SELECT COUNT(*) FROM information_schema.tables
 WHERE table_schema='lppm' AND table_name<>'_prisma_migrations';
SELECT COUNT(*) FROM information_schema.table_constraints
 WHERE constraint_schema='lppm' AND constraint_type='FOREIGN KEY';
```

| Metrik | Nilai | Target ERD | Cocok? |
|---|---|---|---|
| Tabel LPPM | **18** | 18 | ✅ |
| FK constraint | **20** | 20 | ✅ **persis 1:1** |
| Index total | **47** (18 PRIMARY + 29 non-PK) | — | ✅ |
| Index unik non-PK | **9** | — | ✅ |

### 9 index unik non-PK (pengaman integritas data)
```text
users              -> users_nidn_key
user_roles         -> user_roles_user_id_role_key
program_studi      -> program_studi_kode_key
form_field_configs -> form_field_configs_jenis_proposal_label_key
documents          -> documents_proposal_id_key
reviews            -> reviews_proposal_id_urutan_reviewer_key
review_evaluations -> review_evaluations_proposal_id_key
verifications      -> verifications_proposal_id_tahap_key
proposal_members   -> proposal_members_proposal_id_user_id_key
```
Enam di antaranya **menutup celah duplikat logis**: NIDN ganda, role ganda, penomoran SK/ST ganda, review ganda, verifikasi ganda tahap, dan anggota tim ganda.

### Daftar 18 tabel
```text
 activity_logs      documents       form_field_configs  notifications
 berita             galeri          kuisioner_responses luaran
 periode_akademik   program_studi   proposal_members    proposals
 review_evaluations reviews         user_roles          users
 verifications      dokumen_publik
```

---

## 🐛 2 masalah yang ditemukan saat migrate (beserta solusi)

### 1. `P3014` — shadow database ditolak
```text
Error: P3014
Prisma Migrate could not create the shadow database.
Original error: Error code: P1010
User `lppm` was denied access on the database `lppm`
```
`prisma migrate dev` memakai *shadow database* untuk deteksi drift skema, dan user `lppm` belum punya izin `CREATE`.
**Solusi:** `GRANT CREATE, DROP ON *.*` + DB `lppm_shadow` + `SHADOW_DATABASE_URL`.

### 2. `P3018` — `ALTER command denied` di shadow DB buatan Prisma
```text
Database error code: 1142
ALTER command denied to user 'lppm'@'localhost'
  for table `prisma_migrate_shadow_db_6c302881-...`.`users`
```
**Akar masalah:** `SHADOW_DATABASE_URL` sudah ada di `.env`, **tapi tidak terbaca** karena blok `datasource` tidak menunjuknya. Prisma hanya membaca nilai shadow dari `schema.prisma`, bukan otomatis dari env var dengan nama itu.
```prisma
// sebelum
datasource db { provider = "mysql"; url = env("DATABASE_URL") }

// sesudah
datasource db {
  provider          = "mysql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")   // <- inilah yang hilang
}
```
Prisma lalu membuat `prisma_migrate_shadow_db_<uuid>` sendiri, di mana user `lppm` tidak punya hak apa pun.

## Kendala lingkungan: `migrate dev` butuh TTY
`prisma migrate dev` menolak berjalan di terminal non-interaktif:
```text
Error: Prisma Migrate has detected that the environment is non-interactive,
which is not supported.
```
**Solusi:** memakai jalur resmi non-interaktif — `migrate diff` untuk menghasilkan SQL, tulis folder migrasi, lalu **`migrate deploy`** (tidak memakai shadow DB, aman untuk CI/CD).

## Catatan drift yang terdeteksi
`migrate diff` juga menghasilkan dua perubahan yang tidak terduga:
```sql
ALTER TABLE `luaran`    MODIFY `field_tambahan` JSON NULL;
ALTER TABLE `proposals` MODIFY `field_tambahan` JSON NULL;
```
Artinya tipe kolom di migrasi awal tidak persis sama dengan skema saat ini. Perlu dipastikan sebelum produksi agar data lama tidak rusak saat ALTER.

## Kesimpulan
Skema ERD terpasang **penuh tanpa selisih** — 20 relasi di ERD = 20 FK constraint di database.
