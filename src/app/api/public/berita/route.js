// GET /api/public/berita — daftar berita yang sudah TERBIT (tanpa login)
// Kolom `konten` sengaja tidak ikut di daftar; baru diambil saat satu berita
// dibuka, agar daftar tetap ringan.
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api';

export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const halaman = Math.max(1, parseInt(q.get('halaman') || '1', 10) || 1);
  const perHalaman = Math.min(50, Math.max(1, parseInt(q.get('per') || '10', 10) || 10));

  const where = { status: 'TERBIT' };
  const [daftar, total] = await Promise.all([
    prisma.berita.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
      select: {
        id: true, judul: true, kategori: true, gambar: true,
        publishedAt: true, createdAt: true,
        penulis: { select: { nama: true } },
      },
    }),
    prisma.berita.count({ where }),
  ]);

  return ok({ berita: daftar, total, halaman, perHalaman });
}

