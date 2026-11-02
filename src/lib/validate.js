// src/lib/validate.js — pembungkus Zod agar format error seragam di semua modul.
// Dipakai tiap handler: const v = parseBody(Schema, await req.json());
import { fail } from '@/lib/api';

export function parseBody(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (!r.success) {
    return {
      ok: false,
      res: fail(400, 'VALIDATION', 'Format permintaan tidak valid', {
        detail: r.error.issues.map((i) => ({
          field: i.path.join('.') || '(root)',
          message: i.message,
        })),
      }),
    };
  }
  return { ok: true, data: r.data };
}

// Ubah error Prisma ke respons yang aman (tanpa membocorkan detail internal).
export function fromPrisma(e, { sumber = 'Data' } = {}) {
  if (e?.code === 'P2002') {
    const f = e.meta?.target?.join(', ') || 'kunci unik';
    return fail(409, 'CONFLICT', `${sumber} bentrok — nilai pada (${f}) sudah terpakai.`);
  }
  if (e?.code === 'P2025') {
    return fail(404, 'NOT_FOUND', `${sumber} tidak ditemukan.`);
  }
  if (e?.code === 'P2003') {
    return fail(409, 'IN_USE', `${sumber} masih dipakai data lain dan tidak boleh dihapus.`);
  }
  return fail(500, 'INTERNAL', 'Kesalahan pada server.');
}
