// GET    /api/admin/galeri      — daftar galeri (semua)
// POST   /api/admin/galeri      — tambah foto
// DELETE /api/admin/galeri/[id] — hapus foto
//
// Galeri tidak memerlukan tahap tinjauan: unggahan langsung tayang,
// berbeda dengan berita yang harus melalui REVIEW lebih dulu.
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';
import { z } from 'zod';

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const daftar = await prisma.galeri.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, judul: true, deskripsi: true, fotoPath: true,
              kategori: true, createdAt: true },
  });
  return ok({ galeri: daftar, jumlah: daftar.length });
}

const skema = z.object({
  judul: z.string().min(1, 'Judul wajib diisi.').max(200),
  deskripsi: z.string().nullish(),
  fotoPath: z.string().min(1, 'Path foto wajib diisi.').max(255),
  kategori: z.string().max(100).nullish(),
});

export async function POST(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const { ok: lolos, data: d, res } = parseBody(skema, await req.json());
  if (!lolos) return res;

  try {
    const baru = await prisma.galeri.create({
      data: { judul: d.judul, deskripsi: d.deskripsi ?? null,
              fotoPath: d.fotoPath, kategori: d.kategori ?? null },
      select: { id: true, judul: true, fotoPath: true, createdAt: true },
    });
    return ok({ galeri: baru, message: 'Foto ditambahkan ke galeri.' });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Galeri' });
  }
}
