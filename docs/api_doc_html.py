#!/usr/bin/env python3
"""Pembangkit HTML dokumentasi API dengan design token yang sama persis dengan ERD."""
import html as H

# --- Design token hasil ekstraksi dari "ERD — Sistem Informasi LPPM.html" ---
CSS = """
:root{
  --bg-canvas:#0b0f17;
  --bg-grid:radial-gradient(circle,#1e293b 1.2px,transparent 1.2px);
  --bg-card:#131a26;
  --bg-card-header:#1a2334;
  --bg-card-hover:#172132;
  --bg-pill:rgba(255,255,255,.06);
  --border-card:#243247;
  --border-card-hover:#3d5477;
  --border-active:#6366f1;
  --border-hairline:#1c2738;
  --text-primary:#f1f5f9;
  --text-secondary:#94a3b8;
  --text-muted:#64748b;
  --text-code:#e2e8f0;
  --pk-color:#f59e0b;
  --fk-color:#38bdf8;
  --line-default:#475569;
  --line-active:#6366f1;
  --cat-master:#10b981;
  --cat-users:#6366f1;
  --cat-proposal:#0ea5e9;
  --cat-review:#f59e0b;
  --cat-doc:#a855f7;
  --cat-log:#14b8a6;
  --cat-publik:#ec4899;
  --toolbar-bg:rgba(19,26,38,.92);
  --card-shadow:0 10px 25px -5px rgba(0,0,0,.55),0 8px 10px -6px rgba(0,0,0,.5);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;background:var(--bg-canvas);color:var(--text-primary);
  font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;
  font-size:14.5px;line-height:1.65;-webkit-font-smoothing:antialiased;
}
code,pre,.mono{font-family:'JetBrains Mono',ui-monospace,monospace}

/* --- toolbar --- */
.toolbar{
  position:sticky;top:0;z-index:50;
  background:var(--toolbar-bg);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border-card);
  padding:14px 28px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;
}
.toolbar .mark{
  font-family:'JetBrains Mono',monospace;font-weight:700;font-size:13px;
  color:#fff;background:linear-gradient(135deg,#4f46e5,#06b6d4);
  padding:8px 11px;border-radius:8px;line-height:1.1;text-align:center;
}
.toolbar h1{font-size:16px;margin:0;font-weight:700}
.toolbar .sub{font-size:11.5px;color:var(--text-muted);margin-top:2px}
.toolbar nav{margin-left:auto;display:flex;gap:14px;flex-wrap:wrap}
.toolbar nav a{color:var(--text-secondary);font-size:12px;text-decoration:none}
.toolbar nav a:hover{color:var(--text-primary)}

.wrap{max-width:1060px;margin:0 auto;padding:28px 24px 90px}

/* --- hero --- */
.hero{
  background:var(--bg-card);border:1px solid var(--border-card);border-radius:14px;
  padding:26px 28px;margin-bottom:26px;box-shadow:var(--card-shadow);
}
.hero h2{margin:0 0 6px;font-size:23px;font-weight:800;letter-spacing:-.2px}
.hero p{margin:0;color:var(--text-secondary);font-size:13.5px;max-width:760px}
.meta-row{display:flex;gap:26px;flex-wrap:wrap;margin-top:18px;
  padding-top:16px;border-top:1px solid var(--border-hairline)}
.meta-row div span{display:block;font-size:10px;text-transform:uppercase;
  letter-spacing:.09em;color:var(--text-muted);margin-bottom:3px}
.meta-row div b{font-size:14px;font-weight:600;color:var(--text-primary)}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:26px}
.stat{background:var(--bg-card);border:1px solid var(--border-card);border-radius:11px;padding:14px 16px}
.stat b{display:block;font-size:25px;font-weight:800;line-height:1.15}
.stat span{font-size:11px;color:var(--text-muted)}

h3.sec{
  font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;
  color:var(--text-secondary);text-transform:uppercase;letter-spacing:.1em;
  margin:36px 0 14px;padding-bottom:9px;border-bottom:1px solid var(--border-card);
}

/* --- grup endpoint --- */
.grup{background:var(--bg-card);border:1px solid var(--border-card);
  border-radius:13px;margin-bottom:18px;overflow:hidden;box-shadow:var(--card-shadow)}
.grup-head{background:var(--bg-card-header);padding:15px 20px;
  border-bottom:1px solid var(--border-card);display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.grup-head .bar{width:4px;height:26px;border-radius:2px;flex-shrink:0}
.grup-head h4{margin:0;font-size:15.5px;font-weight:700}
.grup-head .modul{font-family:'JetBrains Mono',monospace;font-size:10.5px;
  background:var(--bg-pill);border:1px solid var(--border-hairline);
  padding:3px 8px;border-radius:5px;color:var(--text-secondary)}
.grup-head .ringkas{width:100%;font-size:12.5px;color:var(--text-secondary);margin-top:2px}

/* --- kartu endpoint --- */
.ep{border-bottom:1px solid var(--border-hairline);padding:18px 20px}
.ep:last-child{border-bottom:none}
.ep-line{display:flex;align-items:center;gap:11px;flex-wrap:wrap;margin-bottom:9px}
.met{font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:700;
  padding:4px 9px;border-radius:5px;letter-spacing:.05em;color:#fff;flex-shrink:0}
.m-GET{background:#0ea5e9}.m-POST{background:#10b981}.m-PUT{background:#f59e0b}
.m-PATCH{background:#f59e0b}.m-DELETE{background:#ef4444}
.path{font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--text-code);
  background:#0a0e16;border:1px solid var(--border-hairline);
  padding:4px 10px;border-radius:6px;word-break:break-all}
.badge{font-size:9.5px;font-weight:700;padding:3px 8px;border-radius:20px;
  text-transform:uppercase;letter-spacing:.04em}
.b-ok{background:rgba(16,185,129,.14);color:#34d399;border:1px solid rgba(16,185,129,.35)}
.b-plan{background:rgba(148,163,184,.12);color:var(--text-muted);border:1px solid var(--border-card)}
.b-auth{background:rgba(99,102,241,.14);color:#a5b4fc;border:1px solid rgba(99,102,241,.35)}
.ep > p.desc{margin:0 0 12px;color:var(--text-secondary);font-size:13px}

table{width:100%;border-collapse:collapse;margin:9px 0;font-size:12.5px}
th,td{border:1px solid var(--border-card);padding:8px 11px;text-align:left;vertical-align:top}
th{background:var(--bg-card-header);color:var(--text-secondary);font-weight:600;
  font-size:11px;text-transform:uppercase;letter-spacing:.05em}
td code{background:#0a0e16;border:1px solid var(--border-hairline);
  padding:1.5px 5px;border-radius:4px;font-size:11.5px;color:#fbbf24}
.req-y{color:#f87171;font-weight:700}
.req-n{color:var(--text-muted)}

pre{
  background:#070c14;border:1px solid var(--border-card);border-radius:9px;
  padding:14px 16px;overflow-x:auto;margin:10px 0;
}
pre code{font-size:11.8px;line-height:1.62;color:#a5f3fc;white-space:pre}
.lbl{font-size:10px;text-transform:uppercase;letter-spacing:.09em;
  color:var(--text-muted);margin:14px 0 0;font-weight:600}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:760px){.two{grid-template-columns:1fr}}

ul.notes{margin:9px 0 0;padding-left:20px}
ul.notes li{font-size:12.5px;color:var(--text-secondary);margin:5px 0}
ul.notes li strong{color:var(--text-primary)}

footer{margin-top:44px;padding-top:20px;border-top:1px solid var(--border-card);
  font-size:11.5px;color:var(--text-muted);text-align:center}

@media print{
  body{background:#fff;color:#111}
  .toolbar{position:static;background:#fff;border-bottom:2px solid #111}
  .toolbar nav{display:none}
  .grup,.hero,.stat{box-shadow:none;break-inside:avoid}
  .grup{border-color:#bbb}.ep{break-inside:avoid}
  pre{background:#f6f8fa;border-color:#ddd}
  pre code{color:#111}
  th{background:#eee;color:#333}
  td,th{border-color:#ccc}
  .path{background:#f2f2f2;color:#111;border-color:#ddd}
  .m-GET,.m-POST{color:#fff}
}
"""

def esc(s): return H.escape(str(s))

def tbl_baru(rows, kolom):
    if not rows: return ""
    h = "<table><thead><tr>" + "".join(f"<th>{esc(c)}</th>" for c in kolom) + "</tr></thead><tbody>"
    for r in rows:
        h += "<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>"
    return h + "</tbody></table>"


def render_endpoint(e):
    o = []
    o.append('<div class="ep">')
    st = "b-ok" if e["status"] == "terverifikasi" else "b-plan"
    stt = "Terverifikasi" if e["status"] == "terverifikasi" else "Rencana"
    o.append(f'<div class="ep-line"><span class="met m-{e["metode"]}">{e["metode"]}</span>'
             f'<span class="path">{esc(e["path"])}</span>'
             f'<span class="badge {st}">{stt}</span>'
             f'<span class="badge b-auth">{esc(e["auth"])}</span></div>')
    o.append(f'<p class="desc">{esc(e["ringkas"])}</p>')

    if e.get("body"):
        rows = [(f'<code>{esc(n)}</code>', f"<code>{esc(t)}</code>",
                 '<span class="req-y">ya</span>' if w == "ya" else '<span class="req-n">tidak</span>',
                 esc(d)) for n, t, w, d in e.get("body")]
        o.append('<div class="lbl">Body permintaan</div>')
        o.append(tbl_baru(rows, ["Field", "Tipe", "Wajib", "Keterangan"]))

    if e["respons"]:
        rows = [(f'<code>{c}</code>', esc(m)) for c, m in e["respons"]]
        o.append('<div class="lbl">Kode respons</div>')
        o.append(tbl_baru(rows, ["Status", "Arti"]))

    c = e.get("contoh") or {}
    if c.get("req") or c.get("res"):
        o.append('<div class="lbl">Contoh</div><div class="two">')
        o.append(f'<div><div class="lbl" style="margin-top:0">Permintaan</div>'
                 f'<pre><code>{esc(c.get("req") or "-")}</code></pre></div>')
        if c.get("res"):
            o.append(f'<div><div class="lbl" style="margin-top:0">Respons sukses</div>'
                     f'<pre><code>{esc(c["res"])}</code></pre></div>')
        o.append('</div>')
        if c.get("gagal"):
            o.append(f'<div class="lbl">Respons kegagalan</div>'
                     f'<pre><code>{esc(c["gagal"])}</code></pre>')

    if e.get("catatan"):
        o.append('<div class="lbl">Catatan</div><ul class="notes">'
                 + "".join(f"<li>{n}</li>" for n in e["catatan"]) + "</ul>")
    o.append('</div>')
    return "".join(o)


def build(grup, aturan, kode_err, outdir, proyek, institusi, versi, tanggal):
    n_ep = sum(len(g["endpoint"]) for g in grup)
    n_ok = sum(1 for g in grup for e in g["endpoint"] if e["status"] == "terverifikasi")
    n_plan = n_ep - n_ok

    p = []
    p.append(f"""<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dokumentasi API — {esc(proyek)}</title>
<style>{CSS}</style></head><body>
<div class="toolbar">
  <div class="mark">LPPM<br>API</div>
  <div><h1>Dokumentasi API — {esc(proyek)}</h1>
    <div class="sub">{esc(institusi)}</div></div>
  <nav><a href="#ringkas">Ringkas</a><a href="#konvensi">Konvensi</a>
    <a href="#role">Role</a><a href="#endpoint">Endpoint</a><a href="#error">Error</a></nav>
</div>
<div class="wrap">""")

    p.append(f"""<div class="hero" id="ringkas">
  <h2>Dokumentasi Antarmuka Programming (API)</h2>
  <p>Dokumen ini menjelaskan seluruh endpoint backend {esc(proyek)}. Setiap endpoint
  disertai kontrak permintaan, kode respons, contoh nyata, dan catatan keamanan.
  Endpoint yang sudah diuji end-to-end ditandai <b>Terverifikasi</b>; sisanya masih
  dalam pengerjaan dan ditandai <b>Rencana</b> agar tidak disalahartikan sebagai
  fitur yang sudah tersedia.</p>
  <div class="meta-row">
    <div><span>Versi</span><b>{esc(versi)}</b></div>
    <div><span>Tanggal</span><b>{esc(tanggal)}</b></div>
    <div><span>Basis URL</span><b class="mono">http://localhost:3000</b></div>
    <div><span>Format data</span><b>JSON</b></div>
    <div><span>Otentikasi</span><b>Cookie httpOnly (JWT HS256)</b></div>
  </div>
</div>""")

    p.append(f"""<div class="stats">
  <div class="stat"><b>{n_ep}</b><span>Total endpoint terdaftar</span></div>
  <div class="stat"><b style="color:#34d399">{n_ok}</b><span>Terverifikasi end-to-end</span></div>
  <div class="stat"><b style="color:var(--text-muted)">{n_plan}</b><span>Rencana (belum dibuat)</span></div>
  <div class="stat"><b>7</b><span>Role pengguna</span></div>
</div>""")

    # Konvensi
    p.append('<h3 class="sec" id="konvensi">Konvensi umum</h3><div class="grup"><div class="ep">')
    p.append("""<p class="desc">Seluruh endpoint memakai satu bentuk respons yang sama,
    sehingga klien cukup memeriksa field <code>ok</code> untuk menentukan alur.</p>
    <div class="two">
      <div><div class="lbl" style="margin-top:0">Sukses</div>
        <pre><code>{ "ok": true, ...data }</code></pre></div>
      <div><div class="lbl" style="margin-top:0">Gagal</div>
        <pre><code>{ "ok": false, "code": "...", "message": "..." }</code></pre></div>
    </div>
    <div class="lbl">Aturan yang berlaku</div>
    <ul class="notes">
      <li>Semua body permintaan memakai <strong>Content-Type: application/json</strong>.</li>
      <li>Validasi memakai <strong>Zod</strong>; kegagalan validasi menghasilkan <strong>400 VALIDATION</strong> beserta daftar pesan per field.</li>
      <li>Sesi dikirim sebagai <strong>cookie httpOnly</strong>, sehingga token tidak dapat dibaca script di browser.</li>
      <li>Masa berlaku sesi <strong>8 jam</strong>; setelah itu permintaan menghasilkan <strong>401 SESSION_INVALID</strong> dan cookie dibersihkan otomatis.</li>
      <li>Password disimpan sebagai <strong>bcrypt cost 10</strong> dan tidak pernah dikembalikan dalam bentuk apa pun.</li>
    </ul></div></div>""")

    # Role
    p.append('<h3 class="sec" id="role">Matriks otorisasi per rute</h3><div class="grup"><div class="ep">')
    p.append('<p class="desc">Aturan ini diterapkan di <code>src/middleware.js</code>, yaitu sebelum permintaan sampai ke handler mana pun.</p>')
    p.append(tbl_baru([(f"<code>{esc(a)}</code>", esc(b), esc(c)) for a, b, c in aturan],
                      ["Prefix rute", "Role yang diizinkan", "Fungsi"]))
    p.append("""<div class="lbl">Catatan</div><ul class="notes">
      <li>Daftar rute publik bersifat <strong>eksplisit</strong>, bukan pola longgar — mencegah rute baru tidak sengaja menjadi publik.</li>
      <li>Setelah token diverifikasi, middleware menyisipkan <code>x-user-id</code>, <code>x-user-nidn</code>, dan <code>x-user-roles</code> ke header permintaan.</li>
    </ul></div></div>""")

    # Endpoint
    p.append('<h3 class="sec" id="endpoint">Daftar endpoint</h3>')
    for g in grup:
        p.append(f'<div class="grup"><div class="grup-head">'
                 f'<div class="bar" style="background:var(--cat-{g["warna"]})"></div>'
                 f'<h4>{esc(g["nama"])}</h4>'
                 f'<span class="modul">{esc(g["modul"])}</span>'
                 f'<div class="ringkas">{esc(g["ringkas"])}</div></div>')
        for e in g["endpoint"]:
            p.append(render_endpoint(e))
        p.append('</div>')

    # Error
    p.append('<h3 class="sec" id="error">Kode error</h3><div class="grup"><div class="ep">')
    p.append(tbl_baru([(f"<code>{esc(c)}</code>", f"<code>{esc(s)}</code>", esc(m))
                       for c, s, m in kode_err], ["Kode", "HTTP", "Arti"]))
    p.append("</div></div>")

    p.append(f"""<footer>{esc(proyek)} — {esc(institusi)} · Dokumentasi API v{esc(versi)} · {esc(tanggal)}<br>
    Dihasilkan otomatis dari sumber data bersama sehingga isi HTML, PDF, dan DOCX selalu identik.</footer>
</div></body></html>""")

    path = os.path.join(outdir, "dokumentasi-api.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(p))
    print(f"HTML : {path} ({os.path.getsize(path)} bytes)")
    return path


import os
