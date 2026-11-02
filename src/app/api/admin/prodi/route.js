// /api/admin/prodi — daftar & pembuatan program studi
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { prodiService } from '@/modules/master/service';
import { ok, fail } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';

const Create = z.object({
  kode: z.string().trim().min(1).max(20),
  nama: z.string().trim().min(1).max(100),
});

export async function GET() {
  return ok({ prodi: await prodiService.list() });
}

export async function POST(req) {
  const v = parseBody(Create, await req.json().catch(() => null));
  if (!v.ok) return v.res;

  const ada = await prisma.programStudi.findUnique({ where: { kode: v.data.kode } });
  if (ada) return fail(409, 'CONFLICT', `Kode "${v.data.kode}" sudah dipakai.`);

  try {
    return ok({ prodi: await prodiService.create(v.data) }, { status: 201 });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Program studi' });
  }
}
