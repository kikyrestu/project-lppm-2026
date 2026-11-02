# Fase 2 · 2-3 — `GET /api/auth/me` + `POST /api/auth/logout`

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Prisma Client, `next/headers`

## Kontrak

| Endpoint | Method | Fungsi | Status |
|---|---|---|---|
| `/api/auth/me` | `GET` | Tampilkan sesi berjalan | `200` / `401` |
| `/api/auth/logout` | `POST` | Hapus cookie sesi | `200` |

`/me` membaca **langsung dari database**, bukan sekadar mempercayai isi JWT — supaya perubahan status akun (mis. dinonaktifkan Admin) langsung berlaku tanpa menunggu token kedaluwarsa.

## Hasil pengujian
```text
--- GET /api/auth/me (sesi admin) ---
{"ok":true,"user":{"id":"a779dadb-...","nidn":"9999999001","nama":"Admin LPPM",
 "status":"AKTIF","programStudi":{"kode":"TI","nama":"Teknik Informatika"},
 "roles":["ADMIN"]}}                                       HTTP 200

--- GET /api/auth/me (tanpa sesi) ---
{"ok":false,"code":"UNAUTHENTICATED","message":"Belum login"}   HTTP 401

--- POST /api/auth/logout ---
{"ok":true,"message":"Berhasil logout"}                          HTTP 200

--- GET /api/auth/me (setelah logout) ---
{"ok":false,"code":"UNAUTHENTICATED","message":"Belum login"}   HTTP 401
```

Logout membuktikan **seluruh siklus**: buat sesi → pakai → hapus → sesi tidak bisa dipakai lagi.

## Artefak
- `src/app/api/auth/me/route.js`
- `src/app/api/auth/logout/route.js`
