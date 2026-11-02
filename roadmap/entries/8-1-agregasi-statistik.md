# 8-1 · Agregasi Statistik Ketua/Prodi + Filter Periode

**Modul:** M5 Rekap Eksekutif · **Status:** selesai

## Tanpa tabel agregat tersimpan

Angka rekap **dihitung ulang dari tabel proposal** setiap kali diminta, bukan
disimpan sebagai ringkasan. Ini memilih kepercayaan di atas kecepatan:

> Bila rekap disimpan dan proposal berubah, angka yang tersimpan bisa
> berbeda dari data rujukannya. Dengan menghitung ulang, angka dan daftar
> rinciannya tidak mungkin berselisih.

Untuk skala perguruan tinggi, harga menghitung ulang itu murah — satu query
agregat per bagian.

**File:** `src/modules/rekap/service.js`

## Bucket, bukan status mentah

Ada 9 status mentah. Bila ditampilkan apa adanya, rekap terpecah jadi belasan
baris dan sulit dibaca. Status dipetakan ke 6 bucket laporan:

```
Pra-Kirim            <- DRAFT
Menunggu Verifikasi  <- MENUNGGU_VERIFIKASI_KAPRODI, MENUNGGU_VERIFIKASI_ADMIN
Penilaian Reviewer   <- MENUNGGU_REVIEW, PERLU_KEPUTUSAN
Perlu Revisi         <- PERLU_REVISI
Lolos                <- LOLOS, MENUNGGU_SK_ST
Ditolak              <- DITOLAK
```

Urutan bucket tetap di setiap panggilan sehingga laporan selalu tersusun sama.

## Cakupan per role

| Endpoint | Role | Cakupan |
|---|---|---|
| `GET /api/admin/rekap` | ADMIN | Seluruh prodi |
| `GET /api/kaprodi/rekap` | KAPRODI | Prodi sendiri |
| `GET /api/rekap/periode` | ADMIN, KAPRODI | Daftar filter |

Untuk Kaprodi, `programStudiId` **diturunkan dari akunnya sendiri**, bukan dari
parameter klien:

```js
const u = await prisma.users.findUnique({
  where: { id: c.userId },
  select: { programStudiId: true },
});
```

Seorang Kaprodi tidak bisa meminta angka prodi lain karena nilainya tidak pernah
diambil dari permintaan.

## Perbaikan saat pengujian

Dua `500` ditemukan karena saya **mengarang nama kolom**. Kolom asli
`PeriodeAkademik` hanya `id, nama, tahunMulai, tahunSelesai, isActive` —
sedangkan saya memakai `tahunAkademik` dan `semester` yang tidak ada. Ditambah
`prisma.programStudis` (seharusnya `prisma.programStudi`, model tunggal).

Pesan `500` datang **tanpa body**, sehingga tidak bisa dibaca dari respons HTTP
saja — harus ditelusuri lewat pemanggilan langsung ke Prisma.

Ada pula cacat keputusan: tanpa `periodeId`, `findFirst` memilih periode
sembarangan. Kini defaultnya **periode aktif**.

## Hasil uji

```
PASS daftar periode akademik (200)
PASS periode tersimpan (9)
PASS ADMIN membaca rekap eksekutif (200)
PASS jumlah bucket perStatus = totalProposal (1)
PASS cakupan seluruh prodi (SEMUA_PRODI)
PASS KAPRODI membaca rekap prodi sendiri (200)
PASS cakupan terbatas satu prodi (PRODI)
PASS KAPRODI ditolak dari rekap eksekutif (403)
PASS ADMIN ditolak dari rekap prodi (403)
PASS DOSEN ditolak dari rekap (403)
```

## Bukti

`screenshots/8-1-rekap-eksekutif.png` — REST Client, respons `200 OK`
berisi objek `periode`, `totalProposal`, dan `perStatus`.
