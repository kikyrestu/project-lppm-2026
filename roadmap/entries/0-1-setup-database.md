# Fase 0 · 0-1 — Setup database MySQL & user khusus

**Status:** ✅ Selesai
**Tanggal:** 2026-10-28
**Tool:** MariaDB (systemd), `prisma db execute`, openssl

## Tujuan
Menyediakan database terisolasi khusus proyek SI-LPPM beserta user ber-privilege minimum, termasuk izin *shadow database* yang dibutuhkan Prisma saat `migrate`.

## Masalah yang ditemukan & solusi

| # | Masalah | Bukti error | Solusi |
|---|---|---|---|
| 1 | User OS `kali` ditolak masuk MySQL | `ERROR 1045 (28000): Access denied for user 'kali'@'localhost'` | Buat user aplikasi khusus `lppm` |
| 2 | `sudo` butuh password, dan heredoc berebut stdin | `sudo: a password is required` — gagal **diam-diam**, output hilang | `sudo -S -v < file` untuk cache credential **sebelum** menjalankan mysql |
| 3 | Prisma gagal bikin shadow DB | `P3014` / `P1010 — User lppm was denied access` | `GRANT CREATE, DROP ON *.*` + siapkan `lppm_shadow` |

### Catatan perangkap pada poin 2
Script `sudo mysql <<SQL ... SQL` **terlihat berhasil** padahal gagal, karena `sudo` membaca password dari stdin yang justru diambil oleh heredoc. Gejalanya hanya *output yang tiba-tiba hilang*. Pemisahan dua tahap diperlukan:
```bash
sudo -S -v < "$PW_FILE"    # cache credential, password dibaca dari file
sudo -n mysql <<SQL        # sekarang pakai -n: tidak lagi meminta password
CREATE DATABASE IF NOT EXISTS lppm ...;
SQL
```

## Hasil eksekusi (dari screenshot proses)

```text
[1/6] mysqladmin ping     -> Access denied for user 'kali'@'localhost'
[2/6] sudo -S -v          -> sudo OK
[3/6] CREATE DATABASE/USER-> database & user siap (password 32 char acak)
[4/6] GRANT CREATE,DROP   -> memperbaiki P3014
[5/6] ls -l .env          -> -rw------- 1 kali:kali 282 bytes
[6/6] verifikasi          -> MySQL OK | database lppm : 19 tabel
                            PRISMA_CONNECT_OK
```
> 19 baris di `information_schema.tables` = **18 tabel LPPM** + `_prisma_migrations`.

## Grant yang diberikan

```sql
GRANT ALL PRIVILEGES ON `lppm`.*        TO `lppm`@`localhost`;
GRANT ALL PRIVILEGES ON `lppm_shadow`.* TO `lppm`@`localhost`;
GRANT CREATE, DROP ON *.*               TO `lppm`@`localhost`;  -- shadow DB Prisma
CREATE DATABASE lppm        CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE lppm_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Keputusan keamanan
- Password DB **32 karakter acak** (`openssl rand -hex 16`) — bukan default.
- `.env` ditulis dengan permission **600** (hanya pemilik).
- Nilai secret **tidak pernah** muncul di laporan maupun screenshot proses.
- MariaDB hanya listen di `127.0.0.1:3306` (bukan `0.0.0.0`).

## Artefak
- `.env` → `DATABASE_URL`, `SHADOW_DATABASE_URL`, `JWT_SECRET`
- Database: `lppm`, `lppm_shadow`
