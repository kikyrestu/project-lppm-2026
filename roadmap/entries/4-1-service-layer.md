# Fase 4 · 4-1 — Lapis layanan & mesin transisi M2

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Next.js App Router, Prisma, Zod

## Pemisahan berkas

| Berkas | Tugas |
|---|---|
| `src/modules/proposal/stateMachine.js` | Aturan transisi status — **bebas Prisma** |
| `src/modules/proposal/service.js` | Aturan bisnis + akses database |
| `src/app/api/proposal/**` | Parse body, panggil service, susun respons |

`stateMachine.js` sengaja tidak menyentuh database sehingga bisa diuji murni
tanpa MySQL — peta transisi murni data, bukan logika tersebar di banyak rute.

## Peta transisi (sumber kebenaran: use-case narrative)

Pesanan verifikasi yang benar: **Kaprodi lebih dulu, lalu Admin**.

```
DRAFT ────────────────┐
                      ▼
PERLU_REVISI ──► MENUNGGU_VERIFIKASI_KAPRODI
                      │ SETUJU (KAPRODI/ADMIN)
                      ▼
                 MENUNGGU_VERIFIKASI_ADMIN
                      │ SETUJU (ADMIN)
                      ▼
                 MENUNGGU_REVIEW ──► PERLU_KEPUTUSAN
                                        │
                        ┌───────────────┼──────────────┐
                        ▼               ▼              ▼
                MENUNGGU_SK_ST       LOLOS          DITOLAK
                        │ SELESAI
                        ▼
                    SELESAI
```

Setiap transisi memuat **daftar role yang boleh memicunya**. Menu REVISI dan
TOLAK tersedia di kedua tahap verifikasi.

## Fungsi utama

`cekTransisi({ dari, ke, roles })` mengembalikan `{ boleh, alasan }`.

Empat penolakan diurutkan dari yang paling spesifik:

| Kondisi | Hasil |
|---|---|
| `dari === ke` | "Proposal sudah berstatus X." |
| status akhir (`LOLOS`/`DITOLAK`/`SELESAI`) | "bersifat akhir dan tidak dapat diubah" |
| `ke` tidak ada di peta | daftar tujuan yang diizinkan |
| role tidak berwenang | daftar role yang berwenang |

Status `LOLOS`, `DITOLAK`, `SELESAI` ditandai **akhir** — tidak bisa digeser
lagi, termasuk oleh ADMIN.

## Artefak
- `src/modules/proposal/stateMachine.js`
- `src/modules/proposal/service.js`
- Screenshot: `screenshots/4-1-service.png`
