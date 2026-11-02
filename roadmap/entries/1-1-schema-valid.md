# Fase 1 · 1-1 — schema.prisma: 18 model tervalidasi

**Status:** ✅ Selesai
**Tanggal:** 2026-10-28
**Tool:** `prisma validate` (Prisma CLI 5.22.0)

## Ruang lingkup
`prisma/schema.prisma` diturunkan **langsung dari ERD v4** (18 entitas / 20 relasi) tanpa menambah atau mengurangi tabel.

| Aspek | Jumlah |
|---|---|
| Model / tabel | **18** |
| Enum state-machine | **10** |
| `@relation` (FK) | **25** |
| `@@index` | 17 |
| `@@unique` | 5 |

### 18 model
`ProgramStudi`, `PeriodeAkademik`, `FormFieldConfig`, `Users`, `UserRoles`, `Proposals`, `ProposalMembers`, `Luaran`, `Verifications`, `Reviews`, `ReviewEvaluations`, `Documents`, `Notifications`, `ActivityLogs`, `Berita`, `DokumenPublik`, `Galeri`, `KuisionerResponse`

### 10 enum
`StatusProposal` (9 state), `JenisProposal`, `TahapVerifikasi` (KAPRODI|ADMIN), `Keputusan`, `RekomendasiReviewer`, `HasilKombinasi`, `KeputusanAkhir`, `SumberDana`, `RoleName` (7 role), `StatusUser`

## 🐛 3 bug ditemukan lewat pengujian nyata (bukan sekadar ditulis)

Schema lolos **bukan** karena mulus dari awal. Dua bug pertama ketahuan dari `prisma validate`, bug ketiga justru ketahuan **setelah schema valid**, saat seed dijalankan.

| # | Gejala | Penyebab | Perbaikan |
|---|---|---|---|
| 1 | 28× `Expected a constant literal value ... "createdAt"` | `@@index(["createdAt"])` — Prisma minta **nama field polos**, bukan string | → `@@index([createdAt])` |
| 2 | 1× `Attribute not known: "@date"` | `@date` bukan native type MySQL | → `@db.Date` |
| 3 | `form_field_configs` dobel (8 baris, seharusnya 4) | `FormFieldConfig` **tidak punya unique key** → `createMany(skipDuplicates)` jadi no-op | → `@@unique([jenisProposal, label])` |

### Proses perbaikan bug 1 & 2
```text
pass 1 (validate):  Validation Error Count: 28   ← semua @@index/@@unique
pass 2 (fix):       sisa kutip di @@index/@@unique: 0
pass 3 (validate):  Validation Error Count: 1     ← tinggal @date
pass 4 (fix):       @date → @db.Date
pass 5 (validate):  Validation Error Count: 0
```

> **Pelajaran penting untuk laporan:** bug ke-3 **tidak terdeteksi** oleh `prisma validate`. Skema bisa lolos validasi dengan sempurna tetapi tetap punya cacat integritas data. Dia baru ketahuan ketika seed dijalankan dan hasilnya dibandingkan dengan harapan. Detail perbaikan di **1-3**.

## Hasil akhir

```text
$ DATABASE_URL='mysql://...@localhost:3306/lppm' npx prisma validate
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid 🚀
```

## Catatan desain: kenapa 25 `@relation` padahal ERD 20 relasi?
ERD menggambar FK satu arah (proposal → users). Prisma **wajib** punya relasi balik (`Users.proposalsUsul`, `Users.notifikasinya`, dst.) supaya bisa `include`. Ini kebutuhan sintaks ORM, **bukan** penambahan tabel — ERD tetap 18 entitas.

## Catatan `shadowDatabaseUrl`
Blok `datasource` harus merujuk `SHADOW_DATABASE_URL` secara eksplisit:
```prisma
datasource db {
  provider          = "mysql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```
Tanpa baris `shadowDatabaseUrl`, Prisma **tidak** membaca env var tersebut walau namanya persis, lalu membuat `prisma_migrate_shadow_db_<uuid>` sendiri yang user aplikasi tidak punya hak aksesnya. Detail di **1-2**.

## State machine `StatusProposal`
```text
DRAFT → MENUNGGU_VERIFIKASI_KAPRODI → MENUNGGU_VERIFIKASI_ADMIN
      → MENUNGGU_REVIEW → (PERLU_KEPUTUSAN | PERLU_REVISI | MENUNGGU_SK_ST)
      → LOLOS → SELESAI
              ↘ DITOLAK
```

## Artefak
- `prisma/schema.prisma`
