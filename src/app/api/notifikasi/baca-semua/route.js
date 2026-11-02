// POST /api/notifikasi/baca-semua — tandai seluruh notifikasi milik sendiri
//                                 sudah dibaca.
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';

export async function POST(req) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  const r = await prisma.notifications.updateMany({
    where: { userId: c.userId, isRead: false },
    data: { isRead: true },
  });

  return ok({ jumlah: r.count, message: `${r.count} notifikasi ditandai sudah dibaca.` });
}
