# 7-1 · Notifikasi Otomatis Setiap Transisi Status

**Modul:** M7 — Notifikasi & M9 Log Aktivitas · **Status:** selesai

## Cakupan penerima

| Transisi | Penerima |
|---|---|
| Dosen kirim proposal | Kaprodi prodi terkait |
| Kaprodi SETUJUI | Ketua pengusul |
| Tahap KAPRODI/ADMIN minta REVISI atau TOLAK | Ketua pengusul |
| Admin SETUJUI → masuk review | Ketua pengusul |
| Penugasan reviewer | Tiap reviewer yang ditugaskan |
| Reviewer kedua selesai | Ketua pengusul |
| Keputusan rapat offline | Ketua pengusul |
| SK/ST terbit | Ketua pengusul |

**File:** `src/modules/notifikasi/service.js` · titik sambung di `submit`, `verifikasi`, `reviewer`, `review`, `keputusan`, `dokumen`

## Keputusan desain: notifikasi adalah efek samping

Kegagalan menulis notifikasi **tidak menggagalkan transaksi utama**:

```js
try {
  const r = await prisma.notifications.createMany({ ... });
  return r.count;
} catch (e) {
  console.error('[notifikasi] gagal mencatat:', e?.message);
  return 0;          // aksi tetap dianggap sah
}
```

Alasannya: notifikasi adalah kabar tambahan, bukan syarat keabsahan aksi.
Bila `beritahu()` dibiarkan melempar error, satu kegagalan sekunder pada tabel
notifications akan membatalkan verifikasi yang sah — padahal verifikasinya
sudah benar dan tersimpan. Pesan baku dikumpulkan dalam objek `PESAN` supaya
nada dan isi seragam di seluruh route.

## Hasil uji

```
PASS Kaprodi menerima notifikasi submit (1)
PASS ketua diberi tahu tahap Kaprodi selesai (1)
PASS reviewer menerima notifikasi penugasan (1)
```

Isi yang benar-benar tercatat di database:

```
0412345678  Proposal menunggu verifikasi      Proposal "Pemanfaatan Machine Learning…
0412345680  Menunggu verifikasi Admin         Kaprodi menyetujui proposal "…
0412345680  Proposal masuk tahap review       Proposal "… telah lolos verifikasi…
0412345682  Anda ditugaskan sebagai Reviewer 1  Anda ditugaskan menilai proposal…
0412345680  Hasil penilaian: LOLOS            Penilaian reviewer selesai…
```

## Cacat yang ditemukan saat pengujian

Pada route penugasan reviewer, `select` hasil tidak menyertakan `reviewerId`
(hanya `reviewer.nidn`/`nama`). Akibatnya penerima bernilai `undefined` dan
**notifikasi terkirim tanpa penerima** — gagal senyap yang lolos semua pemeriksaan
status HTTP karena tidak ada error. Diperbaiki dengan menambahkan `reviewerId`
ke `select`.

Ini menunjukkan mengapa pengujian berhenti pada keberadaan HTTP `200` tidak
cukup: kegagalan semacam ini tidak pernah terlihat dari kode status.

## Bukti

`screenshots/7-1-notifikasi-otomatis.png` — VS Code + REST Client, daftar
notifikasi Kaprodi dengan `belumDibaca`.
