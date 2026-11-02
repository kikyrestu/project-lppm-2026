// GET /api/proposal/[id]/dokumen/sk.pdf — unduh Surat Keputusan
// GET /api/proposal/[id]/dokumen/st.pdf — unduh Surat Tugas
// Di-render saat diminta lewat chromium sistem (puppeteer-core).
import { prisma } from '@/lib/prisma';
import { templateSk, templateSt } from '@/modules/dokumen/pdf-template';
import { JENIS_DOKUMEN } from '@/modules/dokumen/pdf-template';
import { fail, ctx } from '@/lib/api';

const JENIS_PROPOSAL = {
  PENELITIAN: 'Penelitian',
  PENGABDIAN: 'Pengabdian kepada Masyarakat',
  KKN: 'Kuliah Kerja Nyata',
};

// Ambil seluruh data yang dibutuhkan templat dalam satu kali baca.
async function ambilData(proposalId) {
  return prisma.proposals.findUnique({
    where: { id: proposalId },
    select: {
      judul: true, jenis: true, anggaran: true, sumberDana: true,
      programStudi: { select: { kode: true, nama: true } },
      periode: { select: { nama: true } },
      dosen: { select: { nidn: true, nama: true } },
      anggota: { select: { user: { select: { nidn: true, nama: true } } } },
    },
  });
}

async function renderPdf(html) {
  const puppeteer = (await import('puppeteer-core')).default;
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
  } finally {
    await browser.close();
  }
}

async function serve(req, { params }, jenis) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  const dok = await prisma.documents.findUnique({
    where: { proposalId: params.id },
    select: {
      nomorSk: true, nomorSt: true, tanggalTerbit: true,
      pembuat: { select: { nidn: true, nama: true } },
    },
  });
  if (!dok) return fail(404, 'DOKUMEN_TIDAK_ADA', 'Dokumen belum diterbitkan untuk proposal ini.');

  const nomor = jenis === 'SK' ? dok.nomorSk : dok.nomorSt;
  if (!nomor) return fail(404, 'NOMOR_BELUM_ADA', `${JENIS_DOKUMEN[jenis]} belum terbit.`);

  const p = await ambilData(params.id);
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  const payload = {
    nomorSk: dok.nomorSk, nomorSt: dok.nomorSt,
    tanggalTerbit: dok.tanggalTerbit,
    // Tahun terbit diambil dari tanggal terbit, bukan dari input klien.
    tahun: dok.tanggalTerbit ? new Date(dok.tanggalTerbit).getFullYear()
                             : new Date().getFullYear(),
    judul: p.judul,
    jenisLabel: JENIS_PROPOSAL[p.jenis] ?? p.jenis,
    ketuaNama: p.dosen?.nama, ketuaNidn: p.dosen?.nidn,
    prodi: p.programStudi ? `${p.programStudi.nama} (${p.programStudi.kode})` : '-',
    periode: p.periode?.nama ?? '-',
    sumberDanaLabel: p.sumberDana ?? '-',
    anggaran: p.anggaran,
    anggota: (p.anggota ?? []).map((a) => a.user),
    // Pejabat penandatanganan mengikuti siapa yang menerbitkan dokumen.
    penandatanganNama: dok.pembuat?.nama, penandatanganNidn: dok.pembuat?.nidn,
  };

  const pdf = await renderPdf(jenis === 'SK' ? templateSk(payload) : templateSt(payload));
  const namaFile = `${nomor.replace(/\//g, '-')}.pdf`;

  return new Response(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdf.length),
      'Content-Disposition': `inline; filename="${namaFile}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req, { params }) {
  return serve(req, { params }, 'SK');
}
