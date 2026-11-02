// GET /api/proposal/[id]/dokumen/st.pdf — unduh Surat Tugas
// Logika render sama dengan sk.pdf; hanya templat & jenis yang berbeda.
import { prisma } from '@/lib/prisma';
import { templateSt } from '@/modules/dokumen/pdf-template';
import { fail, ctx } from '@/lib/api';

const JENIS_PROPOSAL = {
  PENELITIAN: 'Penelitian',
  PENGABDIAN: 'Pengabdian kepada Masyarakat',
  KKN: 'Kuliah Kerja Nyata',
};

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

export async function GET(req, { params }) {
  const c = ctx(req);
  if (!c.userId) return fail(401, 'UNAUTHENTICATED', 'Sesi tidak ditemukan.');

  const dok = await prisma.documents.findUnique({
    where: { proposalId: params.id },
    select: { nomorSk: true, nomorSt: true, tanggalTerbit: true },
  });
  if (!dok) return fail(404, 'DOKUMEN_TIDAK_ADA', 'Dokumen belum diterbitkan untuk proposal ini.');
  if (!dok.nomorSt) return fail(404, 'NOMOR_BELUM_ADA', 'Surat Tugas belum terbit.');

  const p = await prisma.proposals.findUnique({
    where: { id: params.id },
    select: {
      judul: true, jenis: true, anggaran: true, sumberDana: true,
      programStudi: { select: { kode: true, nama: true } },
      periode: { select: { nama: true } },
      dosen: { select: { nidn: true, nama: true } },
      anggota: { select: { user: { select: { nidn: true, nama: true } } } },
    },
  });
  if (!p) return fail(404, 'NOT_FOUND', 'Proposal tidak ditemukan.');

  const pembuat = await prisma.documents.findUnique({
    where: { proposalId: params.id },
    select: { pembuat: { select: { nidn: true, nama: true } } },
  });

  const pdf = await renderPdf(templateSt({
    nomorSk: dok.nomorSk, nomorSt: dok.nomorSt,
    tanggalTerbit: dok.tanggalTerbit,
    judul: p.judul,
    jenisLabel: JENIS_PROPOSAL[p.jenis] ?? p.jenis,
    ketuaNama: p.dosen?.nama, ketuaNidn: p.dosen?.nidn,
    prodi: p.programStudi ? `${p.programStudi.nama} (${p.programStudi.kode})` : '-',
    periode: p.periode?.nama ?? '-',
    sumberDanaLabel: p.sumberDana ?? '-',
    anggaran: p.anggaran,
    anggota: (p.anggota ?? []).map((a) => a.user),
    penandatanganNama: pembuat?.pembuat?.nama,
    penandatanganNidn: pembuat?.pembuat?.nidn,
  }));

  const namaFile = `${dok.nomorSt.replace(/\//g, '-')}.pdf`;
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
