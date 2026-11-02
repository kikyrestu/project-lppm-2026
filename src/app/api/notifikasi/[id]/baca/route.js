// POST /api/notifikasi/[id]/baca — tandai satu notifikasi sudah dibaca.
// Pemilik diperiksa di query, bukan hanya lewat cek status — sehingga
// notifikasi orang lain tidak bisa ditandai (dan tidak pula terbaca).
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';

export async function POST(req, { params }) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  // userId ikut dalam where: jika bukan milik sendiri, tidak ada baris yang cocok.
  const r = await prisma.notifications.updateMany({
    where: { id: params.id, userId: c.userId },
    data: { isRead: true },
  });

  if (r.count === 0) {
    return fail(404, 'NOT_FOUND', 'Notifikasi tidak ditemukan.');
  }

  const belumDibaca = await prisma.notifications.count({
    where: { userId: c.userId, isRead: false },
  });

  return ok({ ditandai: true, belumDibaca });
}
