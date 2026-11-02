// GET /api/public/dokumen — daftar dokumen publik (tanpa login)
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api';

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const kategori = q.get('kategori');

  const daftar = await prisma.dokumenPublik.findMany({
    where: kategori ? { kategori } : {},
    orderBy: { createdAt: 'desc' },
    select: { id: true, nama: true, filePath: true, kategori: true, createdAt: true },
  });

  return ok({ dokumen: daftar, total: daftar.length });
}
