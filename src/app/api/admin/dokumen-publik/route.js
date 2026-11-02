// GET    /api/admin/dokumen-publik      — daftar (khusus ADMIN)
// POST   /api/admin/dokumen-publik      — tambah dokumen
// DELETE /api/admin/dokumen-publik/[id] — hapus
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';
import { z } from 'zod';

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const daftar = await prisma.dokumenPublik.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, nama: true, filePath: true, kategori: true, createdAt: true },
  });
  return ok({ dokumen: daftar, jumlah: daftar.length });
}

const skema = z.object({
  nama: z.string().min(1, 'Nama dokumen wajib diisi.').max(200),
  filePath: z.string().min(1, 'Path berkas wajib diisi.').max(255),
  kategori: z.string().max(100).nullish(),
});

export async function POST(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const { ok: lolos, data: d, res } = parseBody(skema, await req.json());
  if (!lolos) return res;

  try {
    const baru = await prisma.dokumenPublik.create({
      data: { nama: d.nama, filePath: d.filePath, kategori: d.kategori ?? null },
      select: { id: true, nama: true, filePath: true, createdAt: true },
    });
    return ok({ dokumen: baru, message: 'Dokumen ditambahkan.' });
  } catch (e) {
    return fromPrisma(e, { sumber: 'DokumenPublik' });
  }
}
