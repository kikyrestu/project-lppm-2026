# Fase 2 · 2-1 — `src/lib/auth.js`: hashing & JWT

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** bcryptjs 2.4.3, jose 5.9.6, Next.js `next/headers`

## Peran
Satu-satunya tempat password di-hash dan token dibuat/diverifikasi. Dipakai oleh route auth (M1) dan diverifikasi ulang oleh `src/middleware.js`.

## Keputusan teknis

| Pilihan | Alasan |
|---|---|
| **`jose`** (bukan `jsonwebtoken`) | `jsonwebtoken` butuh modul native (`crypto`) yang **tidak tersedia di Edge runtime** tempat middleware berjalan |
| **bcrypt cost 10** | Setara dengan hash seed; cukup untuk 11–ratusan akun dosen |
| **JWT HS256** | Satu secret (`JWT_SECRET`); tidak butuh keypair untuk skala kampus |
| **Masa berlaku 8 jam** | Sesuai siklus kerja operasional — melebihi itu sesi harus diulang |
| **Cookie `httpOnly`** | Token **tidak bisa dibaca** `document.cookie` → script jahat akibat XSS tidak bisa mencuri sesi |

## Potongan kode inti

```js
export const COOKIE_NAME = 'lppm_token';
export const MAX_AGE = 60 * 60 * 8; // 8 jam

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export function setAuthCookie(token) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}
```

## 🐛 Bug yang ditemukan & diperbaiki
Hash dummy untuk penyeimbang waktu semula ditulis sebagai string **palsu** (`$2a$10$CwTycUXWue0Thq9StjUM0uJ8i9OFvHtQ3c6D3q1q1q1q1q1q1q1q`) — bukan hash bcrypt valid. Kalau dipakai, `bcrypt.compare` bisa melempar error dan membuat login gagal untuk NIDN yang tidak ada.

**Perbaikan:** diganti hash bcrypt asli hasil `bcrypt.hashSync('dummy-timing-equalizer', 10)` (60 karakter).

## Artefak
- `src/lib/auth.js`
- `src/lib/api.js` (pembungkus respons seragam + `ctx(req)` pembaca header middleware)
- `jsconfig.json` (alias `@/*` → `./src/*`)
