# 5-2 · Penugasan Reviewer 1 & 2 (`urutan_reviewer`)

**Modul:** M3 — Verifikasi & Review · **Status:** selesai

## Apa yang dibangun

Penugasan dua reviewer dengan kolom **`urutan_reviewer` (1 | 2)** yang
menggantikan kolom lama `reviewer2_id` yang bermasalah. Satu reviewer dapat
menilai banyak proposal tanpa perlu mencocokkan baris.

`@@unique([proposalId, urutanReviewer])` menjamin tiap urutan terisi tepat satu orang.

**File:** `src/app/api/proposal/[id]/reviewer/route.js`

## Aturan yang dijalankan

1. Khusus role **ADMIN**.
2. Proposal harus berstatus `MENUNGGU_REVIEW` (sudah lolos verifikasi 2 tahap).
3. Tepat dua entri, urutan `1` dan `2` — urutan kembar ditolak.
4. **Reviewer 1 dan 2 harus orang berbeda.**
5. Pengusul tidak boleh menjadi reviewer proposalnya sendiri (`409`).
6. Calon reviewer wajib ber-role `REVIEWER`.

## Perbaikan nyata saat pengujian

Query awal menulis `roles: { select: { role: { select: { nama: true } } } }` —
menganggap `role` sebagai relasi ke tabel `roles`. Padahal di skema,
`UserRoles.role` adalah **enum skalar `RoleName`**. Akibatnya setiap reviewer
dilaporkan `tidak memiliki role REVIEWER`.

```js
// salah
roles: { select: { role: { select: { nama: true } } } }
// benar
roles: { select: { role: true } }
// dan konsumennya juga ikut diperbaiki
u.roles.map((x) => x.role)      // bukan x.role.nama
```

## Hasil uji

```
PASS DOSEN ditolak menugaskan reviewer (403)
PASS urutanReviewer kembar ditolak (400)
PASS pengusul tak boleh jadi reviewer (409)
PASS R1 & R2 ditugaskan (201)   -> tercatat 2 baris
```

## Bukti

`screenshots/5-2-penugasan-reviewer.png` — respons `201 Created` berisi
proposal + daftar reviewer yang baru ditugaskan.
