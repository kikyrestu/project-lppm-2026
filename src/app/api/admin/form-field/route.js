// /api/admin/form-field — konfigurasi field dinamis form proposal
// Aturan bisnis: kunci unik (jenisProposal, label) mencegah field ganda.
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

const Create = z.object({
  jenisProposal: z.enum(JENIS),
  label: z.string().trim().min(1).max(150),
  tipeInput: z.enum(TIPE),
  opsi: z.union([z.array(z.string()), z.null()]).optional().default(null),
  wajib: z.boolean().default(false),
  urutan: z.number().int().min(0).default(0),
}).refine((d) => {
  // select/radio wajib punya opsi, tipe lain tidak boleh punya opsi.
  if (d.tipeInput === 'select') return Array.isArray(d.opsi) && d.opsi.length > 0;
  return true;
}, { message: 'Tipe select wajib memiliki minimal satu opsi.', path: ['opsi'] });

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const jenis = searchParams.get('jenis');
  if (jenis && !JENIS.includes(jenis)) {
    return fail(400, 'VALIDATION', `jenis tidak dikenal. Pilihan: ${JENIS.join(', ')}`);
  }
  return ok({ fields: await formFieldService.list(jenis || null) });
}

export async function POST(req) {
  const v = parseBody(Create, await req.json().catch(() => null));
  if (!v.ok) return v.res;

  const dup = await formFieldService.cekDuplikat(v.data.jenisProposal, v.data.label);
  if (dup) {
    return fail(409, 'CONFLICT',
      `Field "${v.data.label}" sudah ada pada ${v.data.jenisProposal}.`);
  }
  try {
    return ok({ field: await formFieldService.create(v.data) }, { status: 201 });
  } catch (e) { return fromPrisma(e, { sumber: 'Field' }); }
}
