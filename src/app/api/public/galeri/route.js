// GET    /api/public/galeri — daftar foto galeri (tanpa login)
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api';

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const halaman = Math.max(1, parseInt(q.get('halaman') || '1', 10) || 1);
  const perHalaman = Math.min(100, Math.max(1, parseInt(q.get('per') || '20', 10) || 20));
  const kategori = q.get('kategori');

  const where = kategori ? { kategori } : {};
  const [daftar, total] = await Promise.all([
    prisma.galeri.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
      select: { id: true, judul: true, deskripsi: true, fotoPath: true,
                kategori: true, createdAt: true },
    }),
    prisma.galeri.count({ where }),
  ]);

  return ok({ galeri: daftar, total, halaman, perHalaman });
}
