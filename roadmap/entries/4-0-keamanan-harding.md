# Penguatan Keamanan — Next.js 14.2.35 + Hardening Terarah

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** npm audit, Next.js config, Edge middleware, curl

## 1. Upgrade Next.js

`next@14.2.15` → **`next@14.2.35`** (rilis terakhir cabang 14.2.x).

## 2. Mengapa TIDAK upgrade ke Next 16

`npm audit` masih menandai `next` sebagai **critical** dengan rentang
`9.3.4-canary.0 - 16.3.0-preview.10` — seluruh baris 14.x dan 15.x ikut kena,
dan satu-satunya perbaikan yang ditawarkan npm adalah `next@16.4.3`
(**perubahan mayor, dua versi sekaligus**).

Audit advisory perlu dinilai terhadap arsitektur nyata, bukan hanya angka:

| Advisory | Jangkauan di proyek ini |
|---|---|
| RCE di server Windows (CVSS 9) | ❌ Tidak — server Linux |
| RCE Image Optimization API (×2) | ❌ Tidak — nol pemakaian `next/image` |
| DoS Server Actions + payload tak terbatas (×2) | ❌ Tidak — nol Server Actions |
| SSRF via `rewrites` | ❌ Tidak — tidak ada `next.config` sebelumnya |
| Unauth disclosure endpoint Server Function | ❌ Tidak — tidak dipakai |
| **Cache confusion body request** | ⚠️ **Relevan** — rute POST-heavy |
| **zod `GHSA-mrhx-c7xc-m3w5`** (CVSS 7.5) | ⚠️ **Relevan** — validasi input klien |

Kesimpulan: pindah ke Next 16 tidak membeli keamanan berarti untuk kasus ini
tetapi merusak build. Mitigasi terarah lebih rasional.

## 3. Hardening yang dipasang

### `next.config.js` (baru)
```js
poweredByHeader: false,           // sembunyikan identitas framework
images: { unoptimized: true },    // pemangkas gambar tidak pernah dijalankan
productionBrowserSourceMaps: false,
```
Ditambah header respons: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
`X-Permitted-Cross-Domain-Policies: none`.

### Guard ukuran body di `src/middleware.js`
`MAX_BODY_BYTES = 1 MB`, ditegakkan **paling awal** sebelum body dibaca.
Mengurangi risiko `GHSA-mrhx-c7xc-m3w5` (validasi Zod menghabiskan memori)
dan advisory payload tak terbatas.

Tolak juga body terkompresi (`Content-Encoding != identity`) dan permintaan
chunked tanpa `Content-Length` — keduanya menyembunyikan ukuran asli.

### Masa berlaku token
`MAX_AGE` 8 jam → **4 jam**. Alasan: JWT kita stateless, jadi token yang bocor
tetap sah sampai kedaluwarsa; jendela lebih pendek memperkecil dampaknya.

## 4. Hasil pengujian regresi — 26 PASS / 0 FAIL

| Bagian | Hasil |
|---|---|
| M1 Auth (11 tes) | termasuk `sesi setelah logout -> 401` ✓ |
| M8 Master (12 tes) | prodi/periode/form-field lengkap ✓ |
| Guard 413 (3 tes) | 1,5 MB → `413`, terkompresi → `413`, normal → `201` ✓ |

Header respons terverifikasi: `nosniff`, `DENY`, `no-referrer` hadir;
`x-powered-by` **tidak ada** ✓.

## 5. Temuan yang belum ditutup

### Pencabutan token server-side
Route logout hanya memanggil `clearAuthCookie()` — menghapus cookie di klien,
tetapi **JWT tidak dicabut di server**. Teruji:

```
token lama dipakai ulang SETELAH logout : 200   ← masih sah
```

Belum ada tabel `Session` (dicek: 18 model, tidak ada satu pun yang menyimpan
sesi). Perbaikan bertumpu pada `MAX_AGE` yang lebih pendek.

**Kendala desain:** middleware berjalan di Edge runtime sehingga Prisma/MySQL
tidak tersedia di sana (alasan pemakaian `jose` alih-alih `jsonwebtoken`).
Karena itu pemeriksaan revokasi tidak bisa ditaruh di middleware; harus di
lapis handler/rute. Ini keputusan arsitektur — dicadangkan untuk M9.

### Perbaikan tes regresi
Dua kegagalan selama pengujian berasal dari skrip tes, bukan aplikasi:
1. Logout diuji dengan `curl -b` tanpa `-c`, sehingga file cookie jar tidak
   diperbarui dan token lama dikirim ulang — seolah sesi masih hidup.
2. Tes logout menghapus sesi pada jar, sehingga seluruh tes M8 berikutnya
   berjalan tanpa sesi (`401` massal) sampai ditambahkan login ulang.

Keduanya diperbaiki; aplikasi sejak awal berperilaku benar.

## Artefak
- `next.config.js`
- `src/middleware.js` (guard `MAX_BODY_BYTES`)
- `src/lib/auth.js` (`MAX_AGE = 4 jam`)
- Screenshot: `screenshots/4-0-keamanan-harding.png`
