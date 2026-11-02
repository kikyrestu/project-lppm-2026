// /api/admin/prodi/[id] — ubah & hapus program studi
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { prodiService } from '@/modules/master/service';
import { ok, fail } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';

const Update = z.object({
  kode: z.string().trim().min(1).max(20).optional(),
  nama: z.string().trim().min(1).max(100).optional(),
});

export async function GET(req, { params }) {
  const p = await prodiService.byId(params.id);
  if (!p) return fail(404, 'NOT_FOUND', 'Program studi tidak ditemukan.');
  return ok({ prodi: p });
}

export async function PUT(req, { params }) {
  const v = parseBody(Update, await req.json().catch(() => null));
  if (!v.ok) return v.res;
  try {
    return ok({ prodi: await prodiService.update(params.id, v.data) });
  } catch (e) { return fromPrisma(e, { sumber: 'Program studi' }); }
}

export async function DELETE(req, { params }) {
  // Keberadaan diperiksa lebih dulu: tanpa ini, delete pada id yang tidak ada
  // melempar P2025 yang tak tertangani dan berujung 500, bukan 404.
  const ada = await prisma.programStudi.findUnique({
    where: { id: params.id }, select: { id: true },
  });
  if (!ada) {
    return fail(404, 'NOT_FOUND', 'Program studi tidak ditemukan.');
  }

  const r = await prodiService.remove(params.id);
  if (!r.ok) {
    return fail(409, 'IN_USE',
      `Program studi masih dipakai ${r.terpakai} data dan tidak dapat dihapus.`);
  }
  return ok({ message: 'Program studi dihapus.' });
}
