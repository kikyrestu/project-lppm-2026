// GET  /api/auth/me  — tampilkan sesi berjalan
// POST /api/auth/me  — alias logout (DELETE disediakan juga di route logout)
import { getSession, clearAuthCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';

export async function GET() {
  const session = await getSession();
  if (!session) return fail(401, 'UNAUTHENTICATED', 'Belum login');

  const user = await prisma.users.findUnique({
    where: { id: session.sub },
    select: {
      id: true, nidn: true, nama: true, status: true,
      programStudi: { select: { kode: true, nama: true } },
      roles: { select: { role: true } },
    },
  });
  if (!user) return fail(401, 'UNAUTHENTICATED', 'Pengguna tidak ditemukan');

  return ok({ user: { ...user, roles: user.roles.map((r) => r.role) } });
}
