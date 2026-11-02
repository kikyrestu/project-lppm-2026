#!/usr/bin/env python3
"""Pembangkit DOCX dokumentasi API — memakai palet warna yang sama dengan ERD."""
import os
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# Palet yang sama dengan ERD (diadaptasi untuk dokumen terang)
C = {
    "primary":   RGBColor(0x0F, 0x17, 0x2A),
    "secondary": RGBColor(0x47, 0x55, 0x69),
    "muted":     RGBColor(0x64, 0x74, 0x8B),
    "indigo":    RGBColor(0x63, 0x66, 0xF1),
    "emerald":   RGBColor(0x10, 0xB9, 0x81),
    "sky":       RGBColor(0x0E, 0xA5, 0xE9),
    "amber":     RGBColor(0xF5, 0x9E, 0x0B),
    "purple":    RGBColor(0xA8, 0x55, 0xF7),
    "pink":      RGBColor(0xEC, 0x48, 0x99),
    "code":      RGBColor(0x1E, 0x29, 0x3B),
}
WARNA_HEX = {
    "users": "6366F1", "master": "10B981", "proposal": "0EA5E9",
    "review": "F59E0B", "doc": "A855F7", "publik": "EC4899", "log": "14B8A6",
}
MONO = "Consolas"
SANS = "Calibri"


def _shade(par, hexcolor):
    """Warna latar belakang paragraf."""
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hexcolor)
    par._p.get_or_add_pPr().append(shd)


def _left_bar(par, hexcolor):
    """Garis vertikal di kiri paragraf — penanda kutipan/catatan."""
    pPr = par._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), "18")
    left.set(qn("w:space"), "8")
    left.set(qn("w:color"), hexcolor)
    pbdr.append(left)
    pPr.append(pbdr)


def code_block(doc, teks):
    par = doc.add_paragraph()
    par.paragraph_format.space_before = Pt(4)
    par.paragraph_format.space_after = Pt(8)
    par.paragraph_format.left_indent = Inches(0.08)
    _shade(par, "F1F5F9")
    run = par.add_run(teks)
    run.font.name = MONO
    run.font.size = Pt(8.5)
    run.font.color.rgb = C["code"]
    return par


def label(doc, teks, color=None):
    par = doc.add_paragraph()
    par.paragraph_format.space_before = Pt(9)
    par.paragraph_format.space_after = Pt(3)
    run = par.add_run(teks.upper())
    run.font.size = Pt(8)
    run.bold = True
    run.font.color.rgb = color or C["muted"]
    run.font.name = SANS
    return par


def notes(doc, daftar):
    for n in daftar:
        par = doc.add_paragraph(style="List Bullet")
        par.paragraph_format.space_after = Pt(3)
        # **tebal** sederhana
        sisa = n
        while "**" in sisa:
            a, b = sisa.split("**", 1)
            if a:
                r = par.add_run(a); r.font.size = Pt(10)
            if "**" in b:
                t, sisa = b.split("**", 1)
                r = par.add_run(t); r.bold = True; r.font.size = Pt(10)
            else:
                r = par.add_run(b); r.font.size = Pt(10)
                sisa = ""
        if not n.count("**") % 2 == 0 and sisa:
            r = par.add_run(sisa); r.font.size = Pt(10)


def tabel(doc, kolom, baris, lebar=None):
    t = doc.add_table(rows=1, cols=len(kolom))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, k in enumerate(kolom):
        hdr[i].text = ""
        p = hdr[i].paragraphs[0]
        r = p.add_run(k)
        r.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        r.font.name = SANS
        _shade(p, "1E293B")
    for baris_i in baris:
        cells = t.add_row().cells
        for i, v in enumerate(baris_i):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            p.paragraph_format.space_after = Pt(1)
            r = p.add_run(str(v))
            r.font.size = Pt(9)
            r.font.name = SANS
    return t


def build(grup, aturan, kode_err, outdir, proyek, institusi, versi, tanggal):
    doc = Document()

    # margin + gaya dasar
    for s in doc.sections:
        s.left_margin = s.right_margin = Inches(0.75)
        s.top_margin = s.bottom_margin = Inches(0.7)
    normal = doc.styles["Normal"]
    normal.font.name = SANS
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = C["primary"]

    n_ep = sum(len(g["endpoint"]) for g in grup)
    n_ok = sum(1 for g in grup for e in g["endpoint"] if e["status"] == "terverifikasi")

    # ---- Sampul ----
    p = doc.add_paragraph()
    r = p.add_run("DOKUMENTASI API")
    r.bold = True; r.font.size = Pt(9); r.font.color.rgb = C["indigo"]
    p.paragraph_format.space_after = Pt(2)

    p = doc.add_paragraph()
    r = p.add_run(proyek)
    r.bold = True; r.font.size = Pt(26); r.font.color.rgb = C["primary"]
    p.paragraph_format.space_after = Pt(2)

    p = doc.add_paragraph()
    r = p.add_run(institusi)
    r.font.size = Pt(13); r.font.color.rgb = C["secondary"]
    p.paragraph_format.space_after = Pt(16)

    tabel(doc, ["Item", "Keterangan"], [
        ["Versi dokumen", versi],
        ["Tanggal", tanggal],
        ["Basis URL", "http://localhost:3000"],
        ["Format data", "JSON"],
        ["Otentikasi", "Cookie httpOnly (JWT HS256), masa berlaku 8 jam"],
        ["Total endpoint", f"{n_ep} ({n_ok} terverifikasi, {n_ep-n_ok} rencana)"],
        ["Role pengguna", "7 — DOSEN, KAPRODI, REVIEWER, ADMIN, KETUA_STIKOM, KETUA_LPPM, PRODI"],
    ])

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    _left_bar(p, "6366F1")
    r = p.add_run("Endpoint yang sudah diuji end-to-end ditandai Terverifikasi. Sisanya masih dalam pengerjaan dan ditandai Rencana, agar tidak disalahartikan sebagai fitur yang sudah dapat dipakai.")
    r.font.size = Pt(10); r.italic = True; r.font.color.rgb = C["secondary"]

    doc.add_page_break()

    # ---- Daftar isi sederhana ----
    h = doc.add_heading("Daftar Isi", level=1)
    h.runs[0].font.color.rgb = C["primary"]
    for g in grup:
        par = doc.add_paragraph(style="List Bullet")
        r = par.add_run(f'{g["nama"]}  ({g["modul"]})')
        r.font.size = Pt(10.5)
    for jud in ["Konvensi Umum", "Matriks Otorisasi", "Kode Error"]:
        par = doc.add_paragraph(style="List Bullet")
        r = par.add_run(jud); r.font.size = Pt(10.5)

    # ---- Konvensi ----
    h = doc.add_heading("Konvensi Umum", level=1)
    h.runs[0].font.color.rgb = C["primary"]
    doc.add_paragraph(
        "Seluruh endpoint memakai satu bentuk respons yang sama, sehingga klien cukup "
        "memeriksa field ok untuk menentukan alur.")
    label(doc, "Sukses"); code_block(doc, '{ "ok": true, ...data }')
    label(doc, "Gagal");   code_block(doc, '{ "ok": false, "code": "...", "message": "..." }')
    label(doc, "Aturan yang berlaku")
    notes(doc, [
        "Semua body permintaan memakai **Content-Type: application/json**.",
        "Validasi memakai **Zod**; kegagalan menghasilkan **400 VALIDATION** beserta daftar pesan per field.",
        "Sesi dikirim sebagai **cookie httpOnly**, sehingga token tidak dapat dibaca script di browser.",
        "Masa berlaku sesi **8 jam**; setelah itu **401 SESSION_INVALID** dan cookie dibersihkan otomatis.",
        "Password disimpan sebagai **bcrypt cost 10** dan tidak pernah dikembalikan.",
    ])

    # ---- Matriks role ----
    h = doc.add_heading("Matriks Otorisasi per Rute", level=1)
    h.runs[0].font.color.rgb = C["primary"]
    doc.add_paragraph("Diterapkan di src/middleware.js, yaitu sebelum permintaan sampai ke handler mana pun.")
    tabel(doc, ["Prefix rute", "Role yang diizinkan", "Fungsi"],
          [[a, b, c] for a, b, c in aturan])
    label(doc, "Catatan")
    notes(doc, [
        "Daftar rute publik bersifat **eksplisit**, bukan pola longgar — mencegah rute baru tidak sengaja menjadi publik.",
        "Setelah token diverifikasi, middleware menyisipkan **x-user-id**, **x-user-nidn**, dan **x-user-roles** ke header.",
    ])

    doc.add_page_break()

    # ---- Endpoint per grup ----
    h = doc.add_heading("Daftar Endpoint", level=1)
    h.runs[0].font.color.rgb = C["primary"]

    for g in grup:
        # judul grup dengan warna kategori
        hp = doc.add_paragraph()
        hp.paragraph_format.space_before = Pt(14)
        hp.paragraph_format.space_after = Pt(3)
        _left_bar(hp, WARNA_HEX[g["warna"]])
        r = hp.add_run(g["nama"])
        r.bold = True; r.font.size = Pt(14); r.font.color.rgb = C["primary"]
        r2 = hp.add_run(f'   {g["modul"]}')
        r2.font.size = Pt(9); r2.font.color.rgb = C["muted"]

        par = doc.add_paragraph()
        rr = par.add_run(g["ringkas"])
        rr.font.size = Pt(10); rr.font.color.rgb = C["secondary"]
        par.paragraph_format.space_after = Pt(6)

        for e in g["endpoint"]:
            ep = doc.add_paragraph()
            ep.paragraph_format.space_before = Pt(10)
            ep.paragraph_format.space_after = Pt(4)
            rm = ep.add_run(f' {e["metode"]} ')
            rm.bold = True; rm.font.size = Pt(9); rm.font.name = MONO
            rm.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            _shade_run(rm, "0EA5E9" if e["metode"] == "GET" else "10B981")
            rp = ep.add_run(f'  {e["path"]}')
            rp.bold = True; rp.font.size = Pt(10); rp.font.name = MONO
            rp.font.color.rgb = C["primary"]

            st = ep.add_run(f'   [{"Terverifikasi" if e["status"]=="terverifikasi" else "Rencana"}]')
            st.font.size = Pt(8.5)
            st.font.color.rgb = C["emerald"] if e["status"] == "terverifikasi" else C["muted"]

            par = doc.add_paragraph()
            r = par.add_run(e["ringkas"])
            r.font.size = Pt(10); r.font.color.rgb = C["secondary"]
            par.paragraph_format.space_after = Pt(3)

            par = doc.add_paragraph()
            r = par.add_run("Autentikasi: "); r.bold = True; r.font.size = Pt(9)
            r = par.add_run(e["auth"]); r.font.size = Pt(9); r.font.color.rgb = C["indigo"]
            par.paragraph_format.space_after = Pt(3)

            if e.get("body"):
                label(doc, "Body permintaan")
                tabel(doc, ["Field", "Tipe", "Wajib", "Keterangan"],
                      [[n, t, w, d] for n, t, w, d in e.get("body")])

            if e.get("respons"):
                label(doc, "Kode respons")
                tabel(doc, ["Status", "Arti"], [[c, m] for c, m in e["respons"]])

            c = e.get("contoh") or {}
            if c.get("req"):
                label(doc, "Contoh permintaan"); code_block(doc, c["req"])
            if c.get("res"):
                label(doc, "Contoh respons sukses"); code_block(doc, c["res"])
            if c.get("gagal"):
                label(doc, "Contoh respons kegagalan"); code_block(doc, c["gagal"])

            if e.get("catatan"):
                label(doc, "Catatan"); notes(doc, e.get("catatan"))

    # ---- Kode error ----
    doc.add_page_break()
    h = doc.add_heading("Kode Error", level=1)
    h.runs[0].font.color.rgb = C["primary"]
    tabel(doc, ["Kode", "HTTP", "Arti"], [[c, s, m] for c, s, m in kode_err])

    # ---- Footer ----
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    _shade(p, "F1F5F9")
    r = p.add_run(f"{proyek} — {institusi}   ·   Dokumentasi API v{versi}   ·   {tanggal}\n"
                  "Dihasilkan otomatis dari sumber data bersama sehingga isi HTML, PDF, dan DOCX selalu identik.")
    r.font.size = Pt(8.5); r.font.color.rgb = C["muted"]

    path = os.path.join(outdir, "dokumentasi-api.docx")
    doc.save(path)
    print(f"DOCX : {path} ({os.path.getsize(path)} bytes)")
    return path


def _shade_run(run, hexcolor):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hexcolor)
    run._r.get_or_add_rPr().append(shd)
