// POST /api/public/kuisioner/[id]/isi — kirim jawaban kuisioner (tanpa login)
//
// Jawaban divalidasi terhadap daftar pertanyaan yang tersimpan di database,
// bukan terhadap bentuk yang dikirim klien. Klien tidak bisa memaksa
// pertanyaan tambahan, dan pertanyaan wajib tidak bisa dilewati.
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { parseBody, fromPrisma } from '@/lib/validate';
import { z } from 'zod';

const skema = z.object({
  namaPengisi: z.string().min(1, 'Nama pengisi wajib diisi.').max(150),
  jawaban: z.record(z.string(), z.any()),
});

export async function POST(req, { params }) {
  const k = await prisma.kuisioner.findUnique({
    where: { id: params.id },
    select: { id: true, judul: true, status: true, pertanyaan: true },
  });
  // Kuisioner yang bukan AKTIF menghasilkan 404 — bukan 403 — agar tidak
  // membocorkan keberadaan kuisioner yang belum tayang atau sudah ditutup.
  if (!k || k.status !== 'AKTIF') {
    return fail(404, 'NOT_FOUND', 'Kuisioner tidak ditemukan.');
  }

  const { ok: lolos, data: d, res } = parseBody(skema, await req.json());
  if (!lolos) return res;

  const daftar = Array.isArray(k.pertanyaan) ? k.pertanyaan : [];

  // 1. tolak kunci jawaban yang tidak ada dalam daftar pertanyaan
  const kunciSah = new Set(daftar.map((t) => t.kode));
  const asing = Object.keys(d.jawaban).filter((x) => !kunciSah.has(x));
  if (asing.length) {
    return fail(400, 'PERTANYAAN_TIDAK_DIKENAL',
      `Jawaban untuk pertanyaan yang tidak ada: ${asing.join(', ')}.`);
  }

  // 2. pastikan pertanyaan wajib terjawab
  const kosong = daftar
    .filter((t) => t.wajib)
    .filter((t) => {
      const v = d.jawaban[t.kode];
      return v === undefined || v === null || String(v).trim() === '';
    })
    .map((t) => t.kode);
  if (kosong.length) {
    return fail(400, 'JAWABAN_WAJIB_KOSONG',
      `Pertanyaan wajib belum dijawab: ${kosong.join(', ')}.`);
  }

  try {
    const baru = await prisma.kuisionerResponse.create({
      data: {
        kuisionerId: k.id, namaPengisi: d.namaPengisi, dataJawaban: d.jawaban,
      },
      select: { id: true, namaPengisi: true, createdAt: true },
    });
    return ok({ jawaban: baru, message: `Jawaban untuk "${k.judul}" tercatat.` });
  } catch (e) {
    return fromPrisma(e, { sumber: 'KuisionerResponse' });
  }
}
