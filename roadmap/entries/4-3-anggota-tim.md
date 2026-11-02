# Fase 4 · 4-3 — Anggota tim: tambah, hapus, dan batas kuota

**Status:** ✅ Selesai · **Tanggal:** 2026-10-28
**Tool:** Prisma, curl

## Endpoint

| Method | Path | Fungsi |
|---|---|---|
| `GET` | `/api/proposal/:id/anggota` | Daftar anggota + sisa kuota |
| `POST` | `/api/proposal/:id/anggota` | Tambah anggota (via NIDN) |
| `DELETE` | `/api/proposal/:id/anggota/:userId` | Keluarkan anggota |

## Aturan bisnis

| # | Aturan | Penolakan |
|---|---|---|
| 1 | Hanya **ketua pengusul** (atau ADMIN) yang boleh mengatur tim | `403` |
| 2 | NIDN harus menunjuk user **berperan DOSEN** | `400` |
| 3 | Akun harus berstatus `AKTIF` | `400` `ACCOUNT_DISABLED` |
| 4 | Ketua tidak boleh jadi anggota timnya sendiri | `400` |
| 5 | Tidak boleh duplikat — kunci unik `(proposalId, userId)` | `409` |
| 6 | Maksimal **3 orang** (di luar ketua) | `409` `LIMIT` |
| 7 | Proposal yang sudah terkirim **terkunci** | `409` `PROPOSAL_TERKUNCI` |

Kaprodi TI yang mencoba mengatur tim proposal MI ditolak `403` — verifikator
bukan pemilik proposal.

## Hasil pengujian — 9/9 lulus

```
PASS  tambah anggota 1 (DOSEN MI)              -> 201
PASS  anggota duplikat                         -> 409
PASS  bukan peran DOSEN (Kaprodi)              -> 400
PASS  ketua jadi anggota sendiri               -> 400
PASS  bukan DOSEN (ADMIN)                      -> 400
PASS  NIDN tidak ditemukan                     -> 404
PASS  tambah anggota 2 (multi-role)            -> 201
PASS  Kaprodi coba atur tim orang lain         -> 403
PASS  jumlah anggota                           -> 2
```

## Bug yang diperbaiki: pemetaan status HTTP

Rute awal memetakan kode error ke status HTTP, tetapi `PROPOSAL_TERKUNCI`
tidak ada dalam daftar sehingga jatuh ke default `400` (kesalahan input).
Proposal terkunci adalah **bentrok dengan keadaan data**, bukan input salah —
seharusnya `409`.

```js
const st = r.code === 'NOT_FOUND' ? 404
  : ['CONFLICT', 'LIMIT', 'PROPOSAL_TERKUNCI'].includes(r.code) ? 409
  : 400;
```

Teruji: `tambah anggota setelah terkirim -> 409` ✓

## Artefak
- `src/modules/proposal/service.js` (`anggotaService`)
- `src/app/api/proposal/[id]/anggota/route.js`
- `src/app/api/proposal/[id]/anggota/[userId]/route.js`
- Screenshot: `screenshots/4-3-anggota.png`
