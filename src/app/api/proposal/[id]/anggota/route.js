// POST /api/proposal/[id]/anggota — tambah anggota tim
// DELETE melalui /api/proposal/[id]/anggota/[userId]
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { proposalService, anggotaService, BATAS_ANGGOTA } from '@/modules/proposal/service';
import { ok, fail, ctx } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';

const Tambah = z.object({ nidn: z.string().trim().min(1).max(20) });

export async function GET(req, { params }) {
  const anggota = await anggotaService.daftar(params.id);
  return ok({ anggota, total: anggota.length, batas: BATAS_ANGGOTA });
}

export async function POST(req, { params }) {
  const c = ctx(req);
  const v = parseBody(Tambah, await req.json().catch(() => null));
  if (!v.ok) return v.res;

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, dosenId: true, status: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  // Hanya ketua pengusul yang boleh mengatur anggota timnya.
  if (p.dosenId !== c.userId && !c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Hanya ketua pengusul yang boleh mengatur anggota tim.');
  }

  const r = await anggotaService.tambah({ proposalId: params.id, proposal: p, nidn: v.data.nidn });
  if (!r.boleh) {
    // 409 = bentrok dengan keadaan data sekarang (duplikat, kuota penuh,
    // proposal terkunci); 404 = rujukan tidak ada; 400 = input tidak sah.
    const st = r.code === 'NOT_FOUND' ? 404
      : ['CONFLICT', 'LIMIT', 'PROPOSAL_TERKUNCI'].includes(r.code) ? 409
      : 400;
    return fail(st, r.code, r.alasan);
  }
  try {
    return ok({
      anggota: r.anggota,
      daftar: await anggotaService.daftar(params.id),
      sisaKuota: r.sisaKuota,
      batas: BATAS_ANGGOTA,
    }, { status: 201 });
  } catch (e) { return fromPrisma(e, { sumber: 'Anggota' }); }
}

export { Tambah };
