# Fase 4 · 4-4 — State machine submit: DRAFT → MENUNGGU_VERIFIKASI_KAPRODI

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Next.js route handler, Prisma, curl

## Endpoint

`POST /api/proposal/:id/submit`

## Tiga pemeriksaan berurutan

1. **Otorisasi** — hanya ketua pengusul (atau ADMIN) yang boleh mengirim
2. **Mesin transisi** — status keluar harus sah dan role berwenang
3. **Validasi ulang field dinamis** — pertahanan berlapis karena konfigurasi M8 bisa berubah sejak proposal dibuat
4. **Periode masih aktif** — mencegah pengiriman pada periode yang sudah ditutup

Pemeriksaan mesin transisi dipasang **paling awal**, sebelum menyentuh
database, supaya permintaan tidak sah ditolak murah.

## Hasil pengujian

```
PASS  submit bukan oleh ketua                  -> 403
PASS  submit oleh ketua                        -> 200
PASS  status setelah submit                    -> MENUNGGU_VERIFIKASI_KAPRODI
PASS  submit dua kali                          -> 409
PASS  tambah anggota setelah terkirim          -> 409
```

Status berubah persis ke `MENUNGGU_VERIFIKASI_KAPRODI` — tahap pertama
sesuai pesanan verifikasi **Kaprodi → Admin**.

Submit kedua ditolak `409` dengan pesan:
> Proposal sudah berstatus MENUNGGU_VERIFIKASI_KAPRODI.

## Ringkasan pengujian Fase 4

**22 PASS / 0 FAIL** — validasi field (6), anggota tim (9), mesin transisi (5), daftar & akses (2).

Tiga bug nyata ditemukan dan diperbaiki selama pengerjaan:
1. Bentuk `opsi` di database objek, bukan array — semua select salah ditolak
2. Enum `JenisProposal` di route M8 tidak cocok dengan skema
3. `PROPOSAL_TERKUNCI` tidak dipetakan ke `409`

## Artefak
- `src/app/api/proposal/[id]/submit/route.js`
- `src/modules/proposal/stateMachine.js`
- Screenshot: `screenshots/4-4-statemachine.png`
