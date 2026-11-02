// /api/admin/periode/[id] — ubah (termasuk aktivasi), hapus
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { periodeService } from '@/modules/master/service';
import { ok, fail } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';

const Update = z.object({
  nama: z.string().trim().min(1).max(50).optional(),
  tahunMulai: z.number().int().min(2000).max(2100).optional(),
  tahunSelesai: z.number().int().min(2000).max(2100).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req, { params }) {
  const p = await periodeService.byId(params.id);
  if (!p) return fail(404, 'NOT_FOUND', 'Periode tidak ditemukan.');
  return ok({ periode: p });
}

export async function PUT(req, { params }) {
  const v = parseBody(Update, await req.json().catch(() => null));
  if (!v.ok) return v.res;
  const lama = await periodeService.byId(params.id);
  if (!lama) return fail(404, 'NOT_FOUND', 'Periode tidak ditemukan.');

  const gabung = { ...lama, ...v.data };
  if (gabung.tahunSelesai < gabung.tahunMulai) {
    return fail(400, 'VALIDATION', 'tahunSelesai harus >= tahunMulai', {
      detail: [{ field: 'tahunSelesai', message: 'harus >= tahunMulai' }],
    });
  }
  try {
    return ok({ periode: await periodeService.update(params.id, v.data) });
  } catch (e) { return fromPrisma(e, { sumber: 'Periode' }); }
}

export async function DELETE(req, { params }) {
  // Sama seperti prodi: cek keberadaan dulu agar id tak dikenal -> 404, bukan 500.
  const ada = await prisma.periodeAkademik.findUnique({
    where: { id: params.id }, select: { id: true },
  });
  if (!ada) {
    return fail(404, 'NOT_FOUND', 'Periode akademik tidak ditemukan.');
  }

  const r = await periodeService.remove(params.id);
  if (!r.ok) {
    return fail(409, 'IN_USE',
      `Periode masih dipakai ${r.terpakai} proposal dan tidak dapat dihapus.`);
  }
  return ok({ message: 'Periode dihapus.' });
}
