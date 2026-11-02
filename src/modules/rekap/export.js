// src/modules/rekap/export.js
// Export Excel (.xlsx) tanpa pustaka eksternal, dan PDF via chromium.
// .xlsx hanyalah arsip ZIP berisi XML — ditulis tangan agar tidak ada
// dependensi tambahan, dan hasilnya tetap dibuka normal di Excel/LibreOffice.
import AdmZipPkg from 'adm-zip';

const X = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Susun worksheet XML dari daftar baris (array objek). */
function lembarXml(nama, kolom, baris) {
  const sel = (i) => {
    let s = '', n = i;
    while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; }
    return s;
  };
  const kepala = kolom.map((k, i) =>
    `<c r="${sel(i)}1" t="inlineStr"><is><t>${X(k.label)}</t></is></c>`).join('');
  const isi = baris.map((b, ri) => {
    const c = kolom.map((k, i) => {
      const v = b[k.kunci];
      const angka = typeof v === 'number';
      return angka
        ? `<c r="${sel(i)}${ri + 2}"><v>${v}</v></c>`
        : `<c r="${sel(i)}${ri + 2}" t="inlineStr"><is><t>${X(v)}</t></is></c>`;
    }).join('');
    return `<row r="${ri + 2}">${c}</row>`;
  }).join('');
  const lebar = kolom.map((k, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${k.lebar ?? 22}" customWidth="1"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>${lebar}</cols><sheetData><row r="1">${kepala}</row>${isi}</sheetData></worksheet>`;
}

/**
 * Bangun berkas .xlsx dalam memori.
 * @param {string} namaLembar  nama tab
 * @param {Array}  kolom       [{kunci, label, lebar}]
 * @param {Array}  baris       array objek dengan kunci sesuai kolom
 */
export function buatXlsx({ judul, namaLembar = 'Data', kolom, baris }) {
  const zip = new AdmZipPkg();

  zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`));

  zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`));

  zip.addFile('docProps/core.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${X(judul)}</dc:title></cp:coreProperties>`));

  zip.addFile('xl/workbook.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${X(namaLembar)}" sheetId="1" r:id="rId1"/></sheets></workbook>`));

  zip.addFile('xl/_rels/workbook.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`));

  zip.addFile('xl/worksheets/sheet1.xml', Buffer.from(lembarXml(namaLembar, kolom, baris)));

  return zip.toBuffer();
}

/** Naskah rekap untuk dicetak ke PDF. */
export function htmlRekap({ judul, periode, total, perStatus, perJenis, perProdi }) {
  const baris = (r) => `<tr><td>${X(r.tahap ?? r.jenis ?? r.programStudi)}</td>
<td class="n">${r.jumlah}</td></tr>`;
  const blok = (nama, data) => `
    <h3>${nama}</h3>
    <table><thead><tr><th>Kategori</th><th class="n">Jumlah</th></tr></thead>
    <tbody>${data.map(baris).join('')}</tbody></table>`;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8">
<style>
@page { size: A4; margin: 16mm 15mm; }
body { font-family: "Liberation Sans", Arial, sans-serif; color: #111; font-size: 10.5pt; }
h1 { font-size: 15pt; margin: 0 0 2mm; }
.sub { color: #444; font-size: 9.5pt; margin-bottom: 5mm; }
h3 { font-size: 11pt; margin: 5mm 0 2mm; border-bottom: 1px solid #999; padding-bottom: 1mm; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #bbb; padding: 1.5mm 2mm; text-align: left; }
th { background: #eee; }
.n { text-align: right; }
.total { margin-top: 4mm; font-size: 11pt; }
</style></head><body>
<h1>Rekapitulasi Program LPPM</h1>
<div class="sub">${X(judul)} — ${X(periode)}</div>
<div class="total">Total proposal: <b>${total}</b></div>
${blok('Berdasarkan tahap', perStatus)}
${blok('Berdasarkan jenis', perJenis)}
${blok('Berdasarkan program studi', perProdi)}
</body></html>`;
}
