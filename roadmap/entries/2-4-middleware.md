# Fase 2 · 2-4 — `src/middleware.js`: verifikasi JWT + guard role

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Next.js Edge Middleware, jose

## Peran
Satu lapis pertahanan yang menutup **semua** rute sebelum sampai ke handler. Dua pekerjaan sekaligus:

1. **Autentikasi** — token diverifikasi; bila tidak ada/rusak, permintaan diblokir.
2. **Otorisasi** — role dibandingkan dengan aturan per prefix rute.

## Tabel aturan role

| Prefix rute | Role yang diizinkan |
|---|---|
| `/api/admin` | `ADMIN` |
| `/api/ketua` | `KETUA_STIKOM`, `KETUA_LPPM` |
| `/api/kaprodi` | `KAPRODI` |
| `/api/prodi` | `PRODI` |
| `/api/reviewer` | `REVIEWER` |
| `/api/verifikasi` | `KAPRODI`, `ADMIN` |
| `/api/proposal` | semua role (7) |
| `/api/akun` | `ADMIN` |
| `/api/publik`, `/berita`, `/galeri`, `/dokumen-publik` | publik (tanpa sesi) |

## Rute publik
Sengaja dibuat **daftar eksplisit**, bukan pola `startsWith('/api/')` yang longgar. Kalau pakai pola longgar, satu rute yang lupa didaftarkan otomatis jadi publik — celah yang sering tidak disadari.

## Sisipkan identitas ke header
Setelah token valid, middleware meneruskan identitas ke handler tanpa decode ulang:
```js
headers.set('x-user-id', payload.sub);
headers.set('x-user-nidn', payload.nidn);
headers.set('x-user-roles', roles.join(','));
```
`ctx(req)` di `src/lib/api.js` membaca header ini. Keuntungannya: handler **tidak perlu** memanggil `verifyToken` lagi, dan ada satu titik keputusan otorisasi.

## Token kedaluwarsa → cookie dibersihkan
```js
const res = deny(req, 401, 'SESSION_INVALID', 'Sesi kedaluwarsa, silakan login ulang');
res.cookies.delete(COOKIE_NAME);
```
Tanpa ini, browser terus mengirim token mati di setiap permintaan.

## Matcher — aset statis dilewati
```js
matcher: ['/((?!_next/static|_next/image|favicon\.ico|.*\.(?:png|jpg|jpeg|svg|webp|css|js)$).*)']
```
Tanpa pengecualian ini, setiap gambar dan berkas CSS ikut diverifikasi → memperlambat muat halaman.

## Hasil pengujian
```text
reviewer -> /api/admin/contoh   {"ok":false,"code":"FORBIDDEN","message":"Rute ini khusus role: ADMIN"}   HTTP 403
admin    -> /api/admin/contoh   {"ok":true,"message":"Terverifikasi sebagai ADMIN",...}                    HTTP 200
token palsu abc.def.ghi         {"ok":false,"code":"SESSION_INVALID","message":"Sesi kedaluwarsa..."}      HTTP 401
```

## Artefak
- `src/middleware.js`
- `src/app/api/admin/contoh/route.js` (rute uji guard role)
