// /api/admin/periode — daftar & pembuatan periode akademik
// Aturan bisnis: tepat SATU periode aktif pada satu waktu.
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { periodeService } from '@/modules/master/service';
import { ok } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';

const Create = z.object({
  nama: z.string().trim().min(1).max(50),
  tahunMulai: z.number().int().min(2000).max(2100),
  tahunSelesai: z.number().int().min(2000).max(2100),
  isActive: z.boolean().default(false),
}).refine((d) => d.tahunSelesai >= d.tahunMulai, {
  message: 'tahunSelesai harus >= tahunMulai', path: ['tahunSelesai'],
});

export async function GET() {
  return ok({ periode: await periodeService.list() });
}

export async function POST(req) {
  const v = parseBody(Create, await req.json().catch(() => null));
  if (!v.ok) return v.res;
  try {
    return ok({ periode: await periodeService.create(v.data) }, { status: 201 });
  } catch (e) { return fromPrisma(e, { sumber: 'Periode' }); }
}
