// PUT /api/proposal/[id]/sumber-dana — isi sumber dana menjelang cetak SK/ST
// GET /api/proposal/[id]/sumber-dana
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { SUMBER_DANA, STATUS_BOLEH_TERMINBIT } from '@/modules/dokumen/service';
import { ok, fail, ctx } from '@/lib/api';
import { catat, AKSI } from '@/modules/audit/service';
import { parseBody, fromPrisma } from '@/lib/validate';

const SumberDana = z.object({
  sumberDana: z.enum(SUMBER_DANA),
});

export async function PUT(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Pengisian sumber dana khusus role ADMIN.');
  }

  const v = parseBody(SumberDana, await req.json().catch(() => null));
  if (!v.ok) return v.res;

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, judul: true, status: true, sumberDana: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  // Sumber dana diisi menjelang cetak — bukan saat pengusulan.
  if (!STATUS_BOLEH_TERMINBIT.includes(p.status)) {
    return fail(409, 'STATUS_BELUM_SIAP',
      `Proposal berstatus ${p.status}. Sumber dana diisi setelah lolos penilaian reviewer (status ${STATUS_BOLEH_TERMINBIT.join(' atau ')}).`);
  }

  try {
    const baru = await prisma.proposals.update({
      where: { id: p.id },
      data: { sumberDana: v.data.sumberDana },
      select: { id: true, judul: true, status: true, sumberDana: true, updatedAt: true },
    });
    await catat({
      proposalId: p.id, userId: c.userId, aksi: AKSI.SUMBER_DANA,
      keterangan: `Sumber dana disetel ${p.sumberDana ?? '(kosong)'} -> ${v.data.sumberDana}.`,
    });
    return ok({ proposal: baru, message: `Sumber dana disetel ${v.data.sumberDana}.` });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Sumber dana' });
  }
}

export async function GET(req, { params }) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');
  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, sumberDana: true, status: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');
  return ok({
    sumberDana: p.sumberDana,
    pilihan: SUMBER_DANA,
    dapatDiisi: STATUS_BOLEH_TERMINBIT.includes(p.status),
  });
}
