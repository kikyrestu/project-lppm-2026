// GET /api/admin/audit — jejak audit global (khusus ADMIN)
// Append-only: endpoint ini hanya membaca, tidak pernah mengubah atau menghapus.
import { prisma } from '@/lib/prisma';
import { ringkasLog, AKSI } from '@/modules/audit/service';
import { ok, fail, ctx } from '@/lib/api';

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Jejak audit khusus role ADMIN.');
  }

  const url = new URL(req.url);
  const halaman = Math.max(1, parseInt(url.searchParams.get('halaman') || '1', 10) || 1);
  const perHalaman = Math.min(200, Math.max(1, parseInt(url.searchParams.get('per') || '50', 10) || 50));
  const aksi = url.searchParams.get('aksi');
  const proposalId = url.searchParams.get('proposalId');
  const nidn = url.searchParams.get('nidn');

  const where = {
    ...(aksi ? { aksi } : {}),
    ...(proposalId ? { proposalId } : {}),
    ...(nidn ? { user: { nidn } } : {}),
  };

  const [daftar, total] = await Promise.all([
    prisma.activityLogs.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
      select: {
        id: true, aksi: true, keterangan: true, createdAt: true,
        user: { select: { nidn: true, nama: true } },
        proposal: { select: { id: true, judul: true, status: true } },
      },
    }),
    prisma.activityLogs.count({ where }),
  ]);

  return ok({
    audit: daftar.map(ringkasLog),
    total,
    halaman,
    perHalaman,
    pilihanAksi: Object.values(AKSI),
  });
}
