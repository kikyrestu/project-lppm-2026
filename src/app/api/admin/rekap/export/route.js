// GET /api/admin/rekap/export?format=xlsx|pdf&periodeId=…
// Export rekap eksekutif. Khusus ADMIN.
//
// Excel ditulis tangan sebagai arsip ZIP+XML lewat adm-zip, tanpa pustaka
// spreadsheet berat. PDF dirender chromium supaya hasilnya identik dengan
// tampilan layar.
import { rekap } from '@/modules/rekap/service';
import { buatXlsx, htmlRekap } from '@/modules/rekap/export';
import { fail, ctx } from '@/lib/api';

export async function GET(req) {
  const c = ctx(req);
  if (!c.hasRole('ADMIN')) {
    return fail(403, 'FORBIDDEN', 'Export rekap khusus role ADMIN.');
  }

  const q = new URL(req.url).searchParams;
  const format = (q.get('format') || 'xlsx').toLowerCase();

  const r = await rekap({
    periodeId: q.get('periodeId') || undefined,
    tahunAkademik: q.get('tahunAkademik') || undefined,
  });
  if (!r) return fail(404, 'PERIODE_TIDAK_DITEMUKAN', 'Periode akademik tidak ditemukan.');

  const namaPeriode = r.periode.nama.replace(/[^\w]+/g, '-').toLowerCase();

  if (format === 'xlsx') {
    const kolom = [
      { kunci: 'kategori', label: 'Kategori', lebar: 30 },
      { kunci: 'jenis', label: 'Jenis', lebar: 16 },
      { kunci: 'jumlah', label: 'Jumlah', lebar: 12 },
    ];
    // Satu lembar berisi ketiga potongan rekap, disambung dengan penanda bagian.
    const baris = [
      ...r.perStatus.map((x) => ({ kategori: x.tahap, jenis: 'Tahap', jumlah: x.jumlah })),
      ...r.perJenis.map((x) => ({ kategori: x.jenis, jenis: 'Jenis', jumlah: x.jumlah })),
      ...r.perProdi.map((x) => ({ kategori: x.programStudi, jenis: 'Prodi', jumlah: x.jumlah })),
    ];
    const buf = buatXlsx({
      judul: `Rekap LPPM ${r.periode.nama}`,
      namaLembar: 'Rekap',
      kolom,
      baris,
    });
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="rekap-lppm-${namaPeriode}.xlsx"`,
        'Content-Length': String(buf.length),
      },
    });
  }

  if (format === 'pdf') {
    const { default: puppeteer } = await import('puppeteer-core');
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    const html = htmlRekap({
      judul: 'Rekapitulasi Program LPPM',
      periode: r.periode.nama,
      total: r.totalProposal,
      perStatus: r.perStatus,
      perJenis: r.perJenis,
      perProdi: r.perProdi,
    });
    await page.setContent(html, { waitUntil: 'load' });
    const buf = Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
    await browser.close();

    return new Response(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rekap-lppm-${namaPeriode}.pdf"`,
        'Content-Length': String(buf.length),
      },
    });
  }

  return fail(400, 'FORMAT_TIDAK_DIDUKUNG',
    'Format export hanya xlsx atau pdf.');
}
