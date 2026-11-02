// DELETE /api/proposal/[id]/anggota/[userId] — keluarkan anggota dari tim
import { prisma } from '@/lib/prisma';
import { anggotaService } from '@/modules/proposal/service';
import { ok, fail, ctx } from '@/lib/api';

export async function DELETE(req, { params }) {
  const c = ctx(req);

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, dosenId: true, status: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');
  if (p.dosenId !== c.userId && !c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Hanya ketua pengusul yang boleh mengatur anggota tim.');
  }

  const r = await anggotaService.hapus({
    proposalId: params.id, userId: params.userId, proposal: p,
  });
  if (!r.boleh) {
    const st = r.code === 'NOT_FOUND' ? 404
      : r.code === 'PROPOSAL_TERKUNCI' ? 409 : 400;
    return fail(st, r.code, r.alasan);
  }
  return ok({ message: 'Anggota dikeluarkan dari tim.' });
}
