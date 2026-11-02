// GET /api/proposal/[id]/riwayat — timeline audit satu proposal
// Dapat dilihat ketua pengusul, Kaprodi, dan Admin.
import { prisma } from '@/lib/prisma';
import { ringkasLog } from '@/modules/audit/service';
import { ok, fail, ctx } from '@/lib/api';

export async function GET(req, { params }) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, judul: true, status: true, dosenId: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  // Ketua pengusul selalu boleh; selain itu khusus Kaprodi / Admin.
  const boleh = p.dosenId === c.userId
    || c.hasRole('ADMIN') || c.hasRole('KAPRODI');
  if (!boleh) {
    return fail(403, 'FORBIDDEN',
      'Riwayat proposal hanya dapat dilihat ketua pengusul, Kaprodi, dan Admin.');
  }

  const baris = await prisma.activityLogs.findMany({
    where: { proposalId: params.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, aksi: true, keterangan: true, createdAt: true,
      user: { select: { nidn: true, nama: true } },
      proposal: { select: { id: true, judul: true, status: true } },
    },
  });

  return ok({
    proposal: { id: p.id, judul: p.judul, status: p.status },
    jumlah: baris.length,
    riwayat: baris.map(ringkasLog),
  });
}
