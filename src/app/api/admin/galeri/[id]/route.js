// DELETE /api/admin/galeri/[id] — hapus satu foto galeri
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';
import { fromPrisma } from '@/lib/validate';

export async function DELETE(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  try {
    await prisma.galeri.delete({ where: { id: params.id } });
    return ok({ terhapus: true, message: 'Foto dihapus dari galeri.' });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Galeri' });
  }
}
