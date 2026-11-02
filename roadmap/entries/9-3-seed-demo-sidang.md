# 9-3 · Seed Demo Sidang

**Fase:** Cutover & Pengujian · **Status:** selesai

Berkas: `seed_demo_sidang.py` (dijalankan dari root proyek)

## Apa yang disiapkan

### 8 akun demo — seluruh role siap

```
OK  ADMIN          9999999001  Admin LPPM         ADMIN
OK  KAPRODI        0412345678  Kaprodi TI         KAPRODI
OK  DOSEN          0412345680  Dr. Dosen Satu     DOSEN
OK  REVIEWER 1     0412345682  Reviewer Utama     REVIEWER
OK  REVIEWER 2     0412345683  Reviewer Dua       REVIEWER
OK  KETUA_STIKOM   9999999002  Ketua STIKOM       KETUA_STIKOM
OK  KETUA_LPPM     9999999003  Ketua LPPM         KETUA_LPPM
OK  PRODI          9999999004  Prodi TI           PRODI
-> 8/8 akun siap
```

### Satu proposal untuk tiap status alur

```
DRAFT                              1  belum disubmit
MENUNGGU_VERIFIKASI_KAPRODI        1  menunggu Kaprodi
MENUNGGU_VERIFIKASI_ADMIN          1  menunggu Admin
MENUNGGU_REVIEW                    1  dalam penilaian reviewer
PERLU_REVISI                       1  diminta revisi
PERLU_KEPUTUSAN                    1  menunggu keputusan akhir
MENUNGGU_SK_ST                     1  SK terbit, menunggu ST
LOLOS                              1  selesai, menunggu ST
DITOLAK                            1  ditolak
SELESAI                            1  seluruh tahap tuntas
```

Sebelumnya hanya ada satu proposal berstatus `LOLOS`. Dengan sepuluh status
terisi, peragaan dapat dimulai dari titik mana pun dalam alur tanpa harus
menjalani seluruh tahap dari awal.

### Pembersihan sisa uji

Skrip menghapus dua baris uji yang tidak layak dipakai pada sidang:

- kuisioner `"Kosong"` (tanpa pertanyaan, dibuat saat menguji penolakan)
- kuisioner uji ganda — sisakan yang terbaru bila judulnya sama

Pembersihan dilakukan dengan syarat pada judulnya, bukan truncate seluruh
tabel, sehingga data uji yang masih diperlukan tidak ikut terhapus.

## Temuan: enum status asli berbeda dari dugaan

Percobaan pertama gagal dengan `DataError: Data truncated for column 'status'`.
Penyebabnya: daftar status yang saya pakai ditulis dari ingatan.

Enum sebenarnya:

```
DRAFT, MENUNGGU_VERIFIKASI_KAPRODI, MENUNGGU_VERIFIKASI_ADMIN,
PERLU_REVISI, MENUNGGU_REVIEW, PERLU_KEPUTUSAN, MENUNGGU_SK_ST,
LOLOS, DITOLAK, SELESAI
```

Dua nilai yang salah: `DALAM_REVIEW` seharusnya `MENUNGGU_REVIEW`, dan
`REVISI` seharusnya `PERLU_REVISI`. MySQL menolak dengan `1265 Data truncated`
bukan `2003` atau error koneksi — artinya koneksi benar, hanya isinya yang
tidak cocok dengan ENUM.

## Verifikasi RBAC pada data demo

Proposal berstatus `MENUNGGU_REVIEW` dibaca oleh lima akun berbeda:

```
ADMIN          HTTP 200  OK
KETUA_STIKOM   HTTP 200  OK
KETUA_LPPM     HTTP 200  OK
PRODI          HTTP 403  FORBIDDEN
DOSEN (lain)   HTTP 403  FORBIDDEN
```

Ini memperkuat hasil uji RBAC di 9-2: pengawasan pimpinan diizinkan, sedangkan
role di luar alur verifikasi tetap tertutup.

## Urutan peragaan yang disarankan

```
 1. DOSEN        0412345680   buat proposal -> submit -> menunggu Kaprodi
 2. KAPRODI      0412345678   verifikasi    -> setujui -> lanjut Admin
 3. ADMIN        9999999001   verifikasi    -> tugaskan reviewer
 4. REVIEWER     0412345682   beri skor     (blind: tak bisa baca riwayat)
 5. REVIEWER     0412345683   beri skor     -> hasil kombinasi muncul
 6. ADMIN        9999999001   putuskan      -> SK -> ST -> notifikasi
 7. KETUA_STIKOM 9999999002   baca semua proposal (pengawasan)
 8. KETUA_LPPM   9999999003   baca semua proposal (pengawasan)
 9. PRODI        9999999004   ditolak baca proposal -> 403 (bukti RBAC)
10. PUBLIK       tanpa login  berita, galeri, dokumen, kuisioner
```

## Keamanan skrip

Kredensial database dibaca dari `.env` melalui regex di dalam skrip dan tidak
pernah dicetak maupun ditulis ke dalam berkas. Host di `.env` memuat port
(`localhost:3306`), sehingga dipisahkan sebelum dikirim ke `pymysql` —
tanpa pemisahan ini koneksi gagal dengan `Name or service not known`.
