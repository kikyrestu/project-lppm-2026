# 5-1 · Verifikasi Berjenjang Kaprodi → Admin

**Modul:** M3 — Verifikasi & Review · **Status:** selesai

## Apa yang dibangun

Verifikasi dua tahap yang pesanannya ketat: **Kaprodi (TI/MI) memverifikasi lebih
dulu, baru Admin LPPM.** Tahap **tidak pernah diambil dari body permintaan** —
diturunkan dari status proposal, sehingga klien tidak bisa melompati tahap.

| File | Peran |
|---|---|
| `src/modules/verifikasi/service.js` | `validasiVerifikasi()` + `catatVerifikasi()` |
| `src/app/api/proposal/[id]/verifikasi/route.js` | `POST` (keputusan) · `GET` (riwayat) |

## Aturan yang dijalankan

1. **Tahap ditentukan server.** `MENUNGGU_VERIFIKASI_KAPRODI` → tahap KAPRODI,
   `MENUNGGU_VERIFIKASI_ADMIN` → tahap ADMIN. Status lain → ditolak.
2. **Role harus cocok tahap.** KAPRODI hanya boleh menyentuh tahap KAPRODI,
   ADMIN hanya tahap ADMIN.
3. **Catatan wajib** saat `REVISI` atau `TOLAK`.
4. **Tahap ADMIN menuntut tahap Kaprodi sudah `SETUJUI`** — dicek ulang dari
   tabel `verifications`, bukan dari status semata.
5. Satu record per tahap per proposal dijaga `@@unique([proposalId, tahap])`.
6. Perubahan status lewat mesin transisi `cekTransisi()`.

## Hasil uji (16 PASS · 0 FAIL)

```
PASS ADMIN tak bisa memverifikasi tahap Kaprodi (403)
PASS catatan wajib saat REVISI (403)
PASS catatan wajib saat TOLAK (403)
PASS keputusan di luar enum ditolak Zod (400)
PASS Kaprodi menyetujui tahap 1 (200)
PASS status -> MENUNGGU_VERIFIKASI_ADMIN
PASS Admin menyetujui tahap 2 (200)
PASS status -> MENUNGGU_REVIEW
```

Catatan: pesan penolakan `403 VERIFIKASI_TIDAK_SAHIH` menampilkan tahap aktif dan
role pemohon, bukan sekadar "dilarang", agar mudah didiagnosis tanpa membocorkan
data internal.

## Bukti

`screenshots/5-1-verifikasi-berjenjang.png` — VS Code + REST Client, respons
`403 Forbidden`: *"Tahap KAPRODI khusus role KAPRODI. Role Anda: ADMIN."*
