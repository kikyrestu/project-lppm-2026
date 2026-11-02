// GET    /api/public/kuisioner         — daftar kuisioner berstatus AKTIF (tanpa login)
// POST   /api/public/kuisioner/[id]/isi — kirim jawaban (tanpa login)
//
// Publik hanya melihat kuisioner AKTIF, dan hanya yang AKTIF yang menerima
// jawaban — DRAFT belum siap, SELESAI sudah ditutup.
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';
import { z } from 'zod';

export async function GET(req) {
  const daftar = await prisma.kuisioner.findMany({
    where: { status: 'AKTIF' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, judul: true, deskripsi: true, pertanyaan: true,
      updatedAt: true,
      _count: { select: { jawaban: true } },
    },
  });

  return ok({
    kuisioner: daftar.map((k) => ({
      id: k.id, judul: k.judul, deskripsi: k.deskripsi,
      pertanyaan: k.pertanyaan, updatedAt: k.updatedAt,
      jumlahPengisi: k._count.jawaban,
    })),
    jumlah: daftar.length,
  });
}
