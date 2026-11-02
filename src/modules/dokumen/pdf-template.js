// src/modules/dokumen/pdf-template.js
// Templat HTML SK & ST mengikuti tata naskah dinas:
// kop surat, nomor, pembukaan, table berisi, penutup, blok tanda tangan.
// Di-render ke PDF lewat chromium sistem (puppeteer-core) sehingga hasilnya
// identik dengan yang terlihat di layar.

const css = `
  @page { size: A4; margin: 22mm 20mm 20mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", "Liberation Serif", serif;
         font-size: 12pt; line-height: 1.55; color: #000; margin: 0; }
  .kop { text-align: center; border-bottom: 3.5px double #000;
         padding-bottom: 7px; margin-bottom: 16px; }
  .kop .k1 { font-size: 13pt; font-weight: 700; letter-spacing: .02em; }
  .kop .k2 { font-size: 13pt; font-weight: 700; }
  .kop .k3 { font-size: 11.5pt; }
  .kop .k4 { font-size: 10.5pt; font-style: italic; }
  h1 { text-align: center; font-size: 14pt; margin: 18px 0 2px;
       text-transform: uppercase; letter-spacing: .04em; }
  .nomor { text-align: center; font-size: 12pt; margin-bottom: 18px; }
  .blok { margin: 0 0 14px; text-align: justify; }
  table.rinci { width: 100%; border-collapse: collapse; margin: 12px 0 16px;
                font-size: 11.5pt; }
  table.rinci td, table.rinci th { border: 1px solid #000; padding: 6px 9px;
                                   text-align: left; vertical-align: top; }
  table.rinci th { width: 32%; background: #f2f2f2; font-weight: 700; }
  ol.dasar { margin: 4px 0 16px 22px; padding: 0; }
  ol.dasar li { margin: 3px 0; text-align: justify; }
  .ttd { margin-top: 26px; width: 100%; }
  .ttd td { vertical-align: top; font-size: 11.5pt; }
  .ttd .kanan { text-align: center; width: 45%; }
  .ttd .sp { height: 74px; }
  .nama { font-weight: 700; text-decoration: underline; }
  .nip { font-size: 11pt; }
  .f { page-break-inside: avoid; }
`;

function kop() {
  return `<div class="kop">
    <div class="k1">PEMERINTAH KABUPATEN BANYUWANGI</div>
    <div class="k2">LEMBAGA PENELITIAN DAN PENGABDIAN KEPADA MASYARAKAT</div>
    <div class="k3">STIKOM PGRI BANYUWANGI</div>
    <div class="k4">Jalan Jaksa Agung R. Suprapto No. 25, Banyuwangi 68413</div>
  </div>`;
}

function entri(label, nilai) {
  return `<tr><th>${label}</th><td>${nilai ?? '-'}</td></tr>`;
}

function ttdTangan({ jabatan, nama, nidn }) {
  return `<table class="ttd"><tr>
    <td></td>
    <td class="kanan">
      <div>${jabatan},</div>
      <div class="sp"></div>
      <div class="nama">${nama ?? '___________________'}</div>
      <div class="nip">NIDN. ${nidn ?? '______________'}</div>
    </td>
  </tr></table>`;
}

const terbilangBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function tanggalPanjang(d) {
  const t = d ? new Date(d) : new Date();
  return `${t.getDate()} ${terbilangBulan[t.getMonth()]} ${t.getFullYear()}`;
}

const rupiah = (n) => n == null ? '-'
  : 'Rp ' + Number(n).toLocaleString('id-ID', { minimumFractionDigits: 0 });

function html({ judul, isi, kopHtml }) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<style>${css}</style></head><body>${kopHtml}${isi}</body></html>`;
}

/** Surat Keputusan (SK) penunjukan ketua pelaksana. */
export function templateSk(d) {
  const isi = `
  <h1>Surat Keputusan</h1>
  <div class="nomor">Nomor: <b>${d.nomorSk ?? 'SK/LPPM/…/…'}</b></div>

  <p class="blok">Dalam rangka pelaksanaan program
  ${d.jenisLabel} Tahun ${d.tahun}, Lembaga Penelitian dan Pengabdian kepada
  Masyarakat STIKOM PGRI Banyuwangi menetapkan keputusan sebagai berikut:</p>

  <p class="blok"><b>MENETAPKAN :</b></p>
  <table class="rinci">
    ${entri('Judul', d.judul)}
    ${entri('Jenis', d.jenisLabel)}
    ${entri('Ketua Pelaksana', `${d.ketuaNama} (NIDN. ${d.ketuaNidn})`)}
    ${entri('Program Studi', d.prodi)}
    ${entri('Periode', d.periode)}
    ${entri('Sumber Dana', d.sumberDanaLabel)}
    ${entri('Anggaran', rupiah(d.anggaran))}
    ${entri('Tanggal Terbit', tanggalPanjang(d.tanggalTerbit))}
  </table>

  <p class="blok">Keputusan ini berlaku sejak tanggal ditetapkan dan dapat
  dipertanggungjawabkan secara hukum. Atas perhatian dan kerja samanya,
  kami ucapkan terima kasih.</p>

  ${ttdTangan({ jabatan: 'Ketua LPPM', nama: d.penandatanganNama, nidn: d.penandatanganNidn })}
  <div class="f"></div>`;
  return html({ judul: 'SK', isi, kopHtml: kop() });
}

/** Surat Tugas (ST) pelaksanaan. */
export function templateSt(d) {
  const isi = `
  <h1>Surat Tugas</h1>
  <div class="nomor">Nomor: <b>${d.nomorSt ?? 'ST/LPPM/…/…'}</b></div>

  <p class="blok">Dasar : Surat Keputusan Nomor <b>${d.nomorSk ?? '-'}</b>
  tanggal ${tanggalPanjang(d.tanggalTerbit)}.</p>

  <p class="blok">Diberikan tugas kepada:</p>
  <table class="rinci">
    ${entri('Nama Ketua', `${d.ketuaNama} (NIDN. ${d.ketuaNidn})`)}
    ${entri('Judul', d.judul)}
    ${entri('Jenis Kegiatan', d.jenisLabel)}
    ${entri('Periode Pelaksanaan', d.periode)}
    ${entri('Sumber Dana', d.sumberDanaLabel)}
    ${entri('Anggaran', rupiah(d.anggaran))}
  </table>

  <p class="blok">Untuk melaksanakan kegiatan tersebut sebagaimana dimaksud
  dalam Surat Keputusan di atas, dengan penuh tanggung jawab.</p>

  ${d.anggota?.length ? `
  <p class="blok"><b>Tim Pelaksana:</b></p>
  <table class="rinci">
    <tr><th style="width:8%">No</th><th style="width:36%">Nama</th><th>NIDN</th></tr>
    ${d.anggota.map((a, i) =>
      `<tr><td>${i + 1}</td><td>${a.nama}</td><td>${a.nidn}</td></tr>`).join('')}
  </table>` : ''}

  <p class="blok">Demikian surat tugas ini dibuat untuk dipergunakan sebagaimana
  mestinya.</p>

  ${ttdTangan({ jabatan: 'Ketua LPPM', nama: d.penandatanganNama, nidn: d.penandatanganNidn })}
  <div class="f"></div>`;
  return html({ judul: 'ST', isi, kopHtml: kop() });
}

export const JENIS_DOKUMEN = { SK: 'Surat Keputusan', ST: 'Surat Tugas' };
