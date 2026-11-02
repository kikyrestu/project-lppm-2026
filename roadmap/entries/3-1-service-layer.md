# Fase 3 · 3-1 — Pola service layer (cetakan modul M2–M9)

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Prisma Client, Zod, Next.js App Router

## Mengapa dipisah
Sebelumnya semua akses database ada di dalam route handler. Untuk modul sebesar M2–M9 itu bermasalah: aturan bisnis jadi tercampur dengan penanganan HTTP, dan aturan yang sama (mis. "satu periode aktif") akan ditulis ulang di banyak tempat.

Pembagian yang dipakai sekarang:

| Lapis | Berkas | Tugas |
|---|---|---|
| Route handler | `src/app/api/**/route.js` | Parse body, panggil service, susun respons HTTP |
| Service | `src/modules/[modul]/service.js` | Aturan bisnis + akses Prisma |
| Validasi | `src/lib/validate.js` | Bungkus Zod + peta error Prisma |

## Dua helper yang dipakai lintas modul

### `parseBody(schema, data)`
Mengubah kegagalan Zod menjadi respons 400 dengan format tetap:
```json
{"ok":false,"code":"VALIDATION","message":"Format permintaan tidak valid",
 "detail":[{"field":"opsi","message":"Tipe select wajib memiliki minimal satu opsi."}]}
```

### `fromPrisma(e)`
Menerjemahkan kode error Prisma menjadi respons yang **aman** — tanpa membocorkan detail internal basis data:

| Kode Prisma | Arti | Respons |
|---|---|---|
| `P2002` | bentrok kunci unik | `409 CONFLICT` |
| `P2025` | record tidak ada | `404 NOT_FOUND` |
| `P2003` | masih dirujuk FK | `409 IN_USE` |

> Tanpa penerjemah ini, error mentah Prisma bisa tampil ke klien dan memperlihatkan struktur database.

## Layanan yang dibuat
`src/modules/master/service.js` berisi `prodiService`, `periodeService`, `formFieldService` — lengkap dengan `list`, `byId`, `create`, `update`, `remove`.

## Artefak
- `src/modules/master/service.js`
- `src/lib/validate.js`
