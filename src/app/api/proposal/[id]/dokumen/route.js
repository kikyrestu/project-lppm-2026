// POST /api/proposal/[id]/dokumen — terbitkan SK atau ST (penomoran otomatis)
// GET  /api/proposal/[id]/dokumen — baca status dokumen proposal
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { terbitkanDokumen, STATUS_BOLEH_TERMINBIT } from '@/modules/dokumen/service';
import { ok, fail, ctx } from '@/lib/api';
import { beritahu, ketuaProposal, PESAN } from '@/modules/notifikasi/service';
import { catat, AKSI } from '@/modules/audit/service';
import { parseBody, fromPrisma } from '@/lib/validate';

const Terbit = z.object({
  jenis: z.enum(['SK', 'ST']),
  tahun: z.number().int().min(2020).max(2100).optional(),
});

export async function POST(req, { params }) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Penerbitan dokumen khusus role ADMIN.');
  }

  const v = parseBody(Terbit, await req.json().catch(() => null));
  if (!v.ok) return v.res;

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: {
      id: true, judul: true, status: true, jenis: true, sumberDana: true,
    },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  if (!STATUS_BOLEH_TERMINBIT.includes(p.status)) {
    return fail(409, 'STATUS_BELUM_SIAP',
      `Proposal berstatus ${p.status}. Dokumen hanya diterbitkan setelah lolos penilaian reviewer (status ${STATUS_BOLEH_TERMINBIT.join(' atau ')}).`);
  }
  // Sumber dana wajib terisi — nomor SK/ST tidak boleh terbit tanpa sumber anggaran.
  if (!p.sumberDana) {
    return fail(409, 'SUMBER_DANA_KOSONG',
      'Isi sumber dana terlebih dahulu sebelum menerbitkan dokumen.');
  }

  try {
    const hasil = await terbitkanDokumen({
      proposal: p,
      jenis: v.data.jenis,
      userId: c.userId,
      tahun: v.data.tahun ?? new Date().getFullYear(),
    });
    if (hasil.gagal) return fail(hasil.gagal, hasil.code, hasil.pesan);

    // Efek samping: kabari ketua + audit penerbitan.
    const nomor = hasil.nomorSk || hasil.nomorSt;
    const ketua = await ketuaProposal(p.id);
    await beritahu(ketua, PESAN.dokumenTerbit(p.judul, nomor));
    await catat({
      proposalId: p.id, userId: c.userId,
      aksi: v.data.jenis === 'SK' ? AKSI.TERBIT_SK : AKSI.TERBIT_ST,
      keterangan: `${v.data.jenis === 'SK' ? 'SK' : 'ST'} terbit dengan nomor ${nomor}.`,
    });

    return ok({
      dokumen: hasil.dokumen,
      ...(hasil.nomorSk ? { nomorSk: hasil.nomorSk } : {}),
      ...(hasil.nomorSt ? { nomorSt: hasil.nomorSt } : {}),
      message: `${v.data.jenis === 'SK' ? 'Surat Keputusan' : 'Surat Tugas'} terbit dengan nomor ${hasil.nomorSk || hasil.nomorSt}.`,
      unduh: v.data.jenis === 'SK' ? `/api/proposal/${p.id}/dokumen/sk.pdf`
                                   : `/api/proposal/${p.id}/dokumen/st.pdf`,
    }, { status: 201 });
  } catch (e) {
    // P2002 = dua permintaan serentak berebut nomor yang sama.
    // Unique index menahan keduanya; salah satu diulang akan mendapat nomor berikutnya.
    if (e?.code === 'P2002') {
      return fail(409, 'NOMOR_BENTROK',
        'Nomor yang sama baru saja dipakai permintaan lain. Coba terbitkan ulang — sistem akan memilih nomor berikutnya.');
    }
    return fromPrisma(e, { sumber: 'Dokumen' });
  }
}

export async function GET(req, { params }) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: { id: true, judul: true, status: true, sumberDana: true },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  const d = await prisma.documents.findUnique({
    where: { proposalId: params.id },
    select: {
      id: true, nomorSk: true, nomorSt: true, tanggalTerbit: true,
      pembuat: { select: { nidn: true, nama: true } },
    },
  });

  return ok({
    proposal: { id: p.id, judul: p.judul, status: p.status, sumberDana: p.sumberDana },
    dokumen: d ?? null,
    dapatTerbit: STATUS_BOLEH_TERMINBIT.includes(p.status),
    unduh: d ? {
      sk: d.nomorSk ? `/api/proposal/${p.id}/dokumen/sk.pdf` : null,
      st: d.nomorSt ? `/api/proposal/${p.id}/dokumen/st.pdf` : null,
    } : null,
  });
}
