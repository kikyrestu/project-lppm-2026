// /api/admin/form-field/[id] — ubah & hapus konfigurasi field
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { formFieldService } from '@/modules/master/service';
import { ok, fail } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';

// Nilai enum HARUS sama dengan `enum JenisProposal` di prisma/schema.prisma.
// Sumber kebenaran adalah skema, bukan daftar ini — bila skema bertambah,
// perbarui keduanya. Sebelumnya daftar ini memuat PENGABDIAN_MASYARAKAT dan PKM
// yang tidak ada di skema: lolos Zod lalu jatuh ke error 500 dari Prisma.
const JENIS = ['PENELITIAN', 'PENGABDIAN', 'KKN'];
const TIPE = ['text', 'number', 'date', 'select', 'textarea', 'file'];

const Update = z.object({
  label: z.string().trim().min(1).max(150).optional(),
  tipeInput: z.enum(TIPE).optional(),
  opsi: z.union([z.array(z.string()), z.null()]).optional(),
  wajib: z.boolean().optional(),
  urutan: z.number().int().min(0).optional(),
});

export async function GET(req, { params }) {
  const f = await formFieldService.byId(params.id);
  if (!f) return fail(404, 'NOT_FOUND', 'Field tidak ditemukan.');
  return ok({ field: f });
}

export async function PUT(req, { params }) {
  const v = parseBody(Update, await req.json().catch(() => null));
  if (!v.ok) return v.res;

  const lama = await formFieldService.byId(params.id);
  if (!lama) return fail(404, 'NOT_FOUND', 'Field tidak ditemukan.');

  if (v.data.tipeInput === 'select' && (!v.data.opsi || !v.data.opsi.length)) {
    return fail(400, 'VALIDATION', 'Tipe select wajib memiliki opsi.', {
      detail: [{ field: 'opsi', message: 'wajib diisi' }],
    });
  }
  if (v.data.label && v.data.label !== lama.label) {
    const dup = await formFieldService.cekDuplikat(lama.jenisProposal, v.data.label, params.id);
    if (dup) {
      return fail(409, 'CONFLICT', `Label "${v.data.label}" sudah dipakai di ${lama.jenisProposal}.`);
    }
  }
  try {
    return ok({ field: await formFieldService.update(params.id, v.data) });
  } catch (e) { return fromPrisma(e, { sumber: 'Field' }); }
}

export async function DELETE(req, { params }) {
  try {
    await formFieldService.remove(params.id);
    return ok({ message: 'Field dihapus.' });
  } catch (e) { return fromPrisma(e, { sumber: 'Field' }); }
}
