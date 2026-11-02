// POST /api/proposal — buat proposal baru (status DRAFT)
// GET  /api/proposal — daftar proposal sesuai peran pemohon
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { proposalService, validasiFieldDinamis } from '@/modules/proposal/service';
import { S } from '@/modules/proposal/stateMachine';
import { ok, fail, ctx } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';

const JENIS = ['PENELITIAN', 'PENGABDIAN', 'KKN'];

const Create = z.object({
  judul: z.string().trim().min(5).max(255),
  jenis: z.enum(JENIS),
  programStudiId: z.string().min(1),
  periodeId: z.string().min(1),
  abstrak: z.string().max(5000).optional(),
  anggaran: z.number().nonnegative().optional(),
  fieldTambahan: z.record(z.any()).optional(),
});

export async function GET(req) {
  const c = ctx(req);
  const saya = await prisma.users.findUnique({
    where: { id: c.userId },
    select: { programStudiId: true },
  });
  const daftar = await proposalService.list({
    userId: c.userId,
    roles: c.roles,
    programStudiId: saya?.programStudiId ?? null,
  });
  return ok({ proposals: daftar, total: daftar.length });
}

export async function POST(req) {
  const c = ctx(req);
  const v = parseBody(Create, await req.json().catch(() => null));
  if (!v.ok) return v.res;
  const d = v.data;

  // Periode harus aktif — mencegah pengusulan di luar periode berjalan.
  const periode = await prisma.periodeAkademik.findUnique({ where: { id: d.periodeId } });
  if (!periode) return fail(404, 'NOT_FOUND', 'Periode akademik tidak ditemukan.');
  if (!periode.isActive) {
    return fail(409, 'PERIODE_TIDAK_AKTIF',
      `Periode "${periode.nama}" tidak aktif. Pengusulan hanya bisa dilakukan pada periode berjalan.`);
  }

  const prodi = await prisma.programStudi.findUnique({ where: { id: d.programStudiId } });
  if (!prodi) return fail(404, 'NOT_FOUND', 'Program studi tidak ditemukan.');

  // Validasi field dinamis terhadap konfigurasi M8 — nilai klien tidak dipercaya.
  const vf = await validasiFieldDinamis({ jenis: d.jenis, fieldTambahan: d.fieldTambahan });
  if (!vf.boleh) {
    return fail(400, 'VALIDATION', vf.alasan, {
      field: vf.field, detail: vf.detail,
    });
  }

  try {
    const p = await proposalService.create({
      dosenId: c.userId,
      programStudiId: d.programStudiId,
      periodeId: d.periodeId,
      jenis: d.jenis,
      judul: d.judul,
      abstrak: d.abstrak,
      anggaran: d.anggaran,
      fieldTambahan: d.fieldTambahan,
    });
    return ok({ proposal: p }, { status: 201 });
  } catch (e) {
    return fromPrisma(e, { sumber: 'Proposal' });
  }
}

export { S };
