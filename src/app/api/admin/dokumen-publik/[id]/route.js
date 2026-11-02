// DELETE /api/admin/dokumen-publik/[id]
import { prisma } from '@/lib/prisma';
import { ok, fail, ctx } from '@/lib/api';
import { fromPrisma } from '@/lib/validate';

export async function DELETE(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) return fail(403, 'FORBIDDEN', 'Khusus role ADMIN.');

  try {
    await prisma.dokumenPublik.delete({ where: { id: params.id } });
    return ok({ terhapus: true, message: 'Dokumen dihapus.' });
  } catch (e) {
    return fromPrisma(e, { sumber: 'DokumenPublik' });
  }
}
