# Fase 1 · 1-4 — Prisma singleton (`src/lib/prisma.js`)

**Status:** ✅ Selesai
**Tanggal:** 2026-10-28
**Tool:** Node.js / Next.js runtime

## Masalah yang dicegah
Next.js dev server melakukan **hot-reload** pada setiap perubahan file. Jika `new PrismaClient()` dipanggil di banyak file, tiap reload membuka koneksi baru → *connection pool exhaustion* (`Too many connections` di MySQL) setelah beberapa kali edit.

## Solusi
Singleton yang menyimpan instance di `globalThis`, sehingga hanya satu instance dipakai lintas reload.

```js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## Peran dalam arsitektur
`src/lib/prisma.js` adalah **satu-satunya** jalur akses database. Seluruh service M1–M9 melakukan `import { prisma } from '@/lib/prisma'` — tidak ada module yang membuat client sendiri.

## Hasil
File dibuat di `src/lib/prisma.js`. Verifikasi implisit: seluruh query seed (1-3) dan query verifikasi (1-2) berjalan lewat Prisma Client tanpa error koneksi.

## Status akhir Fase 0–1

| Fase | Item | Status |
|---|---|---|
| Fase 0 | 0-1, 0-2, 0-3 | ✅ 3/3 |
| Fase 1 | 1-1, 1-2, 1-3, 1-4 | ✅ 4/4 |
