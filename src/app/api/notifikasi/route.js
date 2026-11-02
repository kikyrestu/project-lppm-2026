// GET  /api/notifikasi          — daftar notifikasi milik sendiri + jumlah belum dibaca
// POST /api/notifikasi/[id]/baca      — tandai satu sudah dibaca
// POST /api/notifikasi/baca-semua     — tandai semua sudah dibaca
//
// Setiap query dibatasi `userId = pengguna saat ini` di level query,
// sehingga tidak mungkin membaca notifikasi orang lain.
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';

const TAMPIL = {
  id: true, judul: true, pesan: true, link: true, isRead: true, createdAt: true,
};

export async function GET(req) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  const url = new URL(req.url);
  const halaman = Math.max(1, parseInt(url.searchParams.get('halaman') || '1', 10) || 1);
  const perHalaman = Math.min(100, Math.max(1, parseInt(url.searchParams.get('per') || '20', 10) || 20));
  const hanyaBelum = url.searchParams.get('belumDibaca') === 'true';

  const where = { userId: c.userId, ...(hanyaBelum ? { isRead: false } : {}) };

  const [daftar, total, belumDibaca] = await Promise.all([
    prisma.notifications.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
      select: TAMPIL,
    }),
    prisma.notifications.count({ where }),
    prisma.notifications.count({ where: { userId: c.userId, isRead: false } }),
  ]);

  return ok({
    notifikasi: daftar,
    total,
    halaman,
    perHalaman,
    belumDibaca,
  });
}
