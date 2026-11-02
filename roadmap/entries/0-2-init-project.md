# Fase 0 · 0-2 — Inisialisasi project Next.js 14 + dependensi

**Status:** ✅ Selesai
**Tanggal:** 2026-10-28
**Tool:** npm 11.19.0, Node v24.20.0

## Keputusan teknis
Backend dibangun **baru total** — tidak memakai kode legacy `LPPM.rar` / Supabase apa pun. Struktur folder mengikuti kesepakatan jobdesk (`src/lib`, `src/modules`, `src/app/api`), tapi isinya ditulis dari nol.

## Dependensi inti

| Paket | Versi | Peran |
|---|---|---|
| `next` | 14.2.15 | App Router + API routes |
| `@prisma/client` / `prisma` | 5.22.0 | ORM MySQL |
| `zod` | 3.23.8 | Validasi input tiap service |
| `jose` | 5.9.6 | JWT HS256 (jalan di Edge runtime middleware) |
| `bcryptjs` | 2.4.3 | Hash password NIDN (pure JS, tanpa native build) |

## Hasil eksekusi

```text
$ npm install --no-audit --no-fund
npm warn deprecated next@14.2.15: This version has a security vulnerability...
added 34 packages in 15s
npm warn install-scripts 3 packages have install scripts not yet covered by allowScripts:
  @prisma/client, prisma, @prisma/engines
```

**34 paket terpasang.**

## ⚠️ Temuan keamanan (catatan untuk revisi)
`next@14.2.15` kena CVE — peringatan resmi npm mengarah ke security update 2025-12-11.
**Rekomendasi:** `npm i next@14.2.35` sebelum serah terima. Belum dieksekusi (menunggu konfirmasi, agar versi terkunci sama dengan yang dipakai saat pengujian).

## Kendala & penanganan
npm versi baru memblokir `install script` Prisma (postinstall tidak jalan) → Prisma Client tidak tergenerate otomatis. Ditangani di item **0-3** dengan generate manual.

## Artefak
- `package.json` (scripts: `db:migrate`, `db:seed`, `db:studio`, `dev`, `build`)
- `.env.example`
