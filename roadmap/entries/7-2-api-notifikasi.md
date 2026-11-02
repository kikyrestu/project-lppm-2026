# 7-2 · API Lonceng Notifikasi (Daftar & Tandai Dibaca)

**Modul:** M7 — Notifikasi & M9 Log Aktivitas · **Status:** selesai

## Endpoint

| Metode | Path | Fungsi |
|---|---|---|
| GET | `/api/notifikasi` | Daftar milik sendiri + `belumDibaca` |
| POST | `/api/notifikasi/[id]/baca` | Tandai satu sudah dibaca |
| POST | `/api/notifikasi/baca-semua` | Tandai semua sudah dibaca |

## Isolasi: dibatasi di level query

Query selalu membawa `userId = pengguna saat ini` **di dalam `where`**, bukan
sebagai pemeriksaan terpisah:

```js
const r = await prisma.notifications.updateMany({
  where: { id: params.id, userId: c.userId },   // <-- pemilik disaring di sini
  data: { isRead: true },
});

if (r.count === 0) {
  return fail(404, 'NOT_FOUND', 'Notifikasi tidak ditemukan.');
}
```

Konsekuensinya: notifikasi orang lain tidak menghasilkan baris yang cocok,
sehingga `count = 0` dan jawabannya `404` — sama seperti notifikasi yang memang
tidak ada. Tidak ada jalan untuk membedakan "ada tapi bukan milik Anda" lewat
respons, sehingga endpoint ini tidak membocorkan keberadaan notifikasi orang lain.

## Hasil uji

```
PASS Kaprodi membaca daftar notifikasi (200)
PASS jumlah belum dibaca terhitung (belumDibaca: 1)
PASS tandai satu notifikasi sudah dibaca (200)
PASS jumlah belum dibaca berkurang (1 -> 0)
PASS notifikasi orang lain tidak bisa ditandai (404)
PASS tandai semua sudah dibaca (200, jumlah ditandai: 2)
```

## Bukti

`screenshots/7-1-notifikasi-otomatis.png` — tangkapan yang sama dengan 7-1
karena memperlihatkan endpoint lonceng beserta hitungan `belumDibaca`.
