# Fase 2 · 2-2 — `POST /api/auth/login`

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** zod 3.23.8, Prisma Client, bcryptjs

## Kontrak

| Aspek | Nilai |
|---|---|
| Method / path | `POST /api/auth/login` |
| Content-Type | `application/json` |
| Body | `{ "nidn": string(1..20), "password": string(1..200) }` |
| Sukses | `200` + cookie `lppm_token` (httpOnly) |
| Gagal | `400` validasi · `401` kredensial · `403` akun nonaktif |

## Dua langkah keamanan yang tidak terlihat

### 1. Pesan error seragam (anti user-enumeration)
NIDN tidak terdaftar dan password salah menghasilkan **pesan identik**:
```json
{"ok":false,"code":"UNAUTHORIZED","message":"NIDN atau password salah"}
```
Kalau pesannya berbeda ("akun tidak ditemukan" vs "password salah"), penyerang bisa mengenumerasi NIDN dosen yang valid.

### 2. Penyeimbang waktu
`verifyPassword` tetap dijalankan **walau user tidak ditemukan**, memakai hash dummy:
```js
const passOk = await verifyPassword(password, user?.passwordHash);
if (!user || !passOk) return fail(401, 'UNAUTHORIZED', GENERIC);
```
Tanpa ini, respons "NIDN tidak ada" jauh lebih cepat (0 ms) dibanding "password salah" (~80 ms karena bcrypt) — dan selisih itu terukur.

## Hasil pengujian
```text
{"ok":false,"code":"UNAUTHORIZED","message":"NIDN atau password salah"}   HTTP 401   <- NIDN tak dikenal
{"ok":false,"code":"UNAUTHORIZED","message":"NIDN atau password salah"}   HTTP 401   <- password salah
{"ok":false,"code":"VALIDATION","message":"Format permintaan tidak valid",
 "detail":["Expected string, received number","Required"]}                HTTP 400   <- nidn:123
{"ok":true,"message":"Login berhasil","user":{"nidn":"9999999001",
 "nama":"Admin LPPM","roles":["ADMIN"],
 "programStudi":{"kode":"TI","nama":"Teknik Informatika"}}}               HTTP 200
```

## Artefak
- `src/app/api/auth/login/route.js`
