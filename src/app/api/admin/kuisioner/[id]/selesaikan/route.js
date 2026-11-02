// POST /api/admin/kuisioner/[id]/selesaikan — tutup penerimaan jawaban
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';

const TAMPIL = {
  id: true, judul: true, deskripsi: true, pertanyaan: true,
  status: true, createdAt: true, updatedAt: true,
  pembuat: { select: { nidn: true, nama: true } },
  _count: { select: { jawaban: true } },
};

export async function POST(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  const k = await prisma.kuisioner.findUnique({
    where: { id: params.id }, select: TAMPIL,
  });
  if (!k) return fail(404, 'NOT_FOUND', 'Kuisioner tidak ditemukan.');
  if (k.status !== 'AKTIF') {
    return fail(409, 'TRANSISI_TIDAK_SAH',
      `Kuisioner berstatus ${k.status}. Penutupan hanya berlaku dari AKTIF.`);
  }

  const r = await prisma.kuisioner.update({
    where: { id: params.id }, data: { status: 'SELESAI' }, select: TAMPIL,
  });
  return ok({ kuisioner: r, message: 'Kuisioner ditutup; jawaban tak lagi diterima.' });
}
