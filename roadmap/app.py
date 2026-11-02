#!/usr/bin/env python3
"""
Dashboard Progress Roadmap — Backend Sistem Informasi LPPM
Dibuat untuk dokumentasi Simagang: tiap item punya status + file MD hasil + screenshot.

Run:  python3 app.py
Port: 8899
"""
import json
import os
import time
import html as html_mod
from pathlib import Path

from flask import Flask, Response, abort, jsonify, render_template_string, send_from_directory
import markdown

BASE = Path(__file__).resolve().parent
DATA = BASE / "data" / "roadmap.json"

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False


def load_roadmap():
    with open(DATA, encoding="utf-8") as f:
        return json.load(f)


def stats(data):
    done = total = 0
    for ph in data["phases"]:
        for it in ph["items"]:
            total += 1
            if it.get("status") == "done":
                done += 1
    pct = round(done * 100 / total) if total else 0
    return {"done": done, "total": total, "pct": pct}


def phase_stats(ph):
    d = sum(1 for i in ph["items"] if i.get("status") == "done")
    t = len(ph["items"])
    return d, t, (round(d * 100 / t) if t else 0)


def find_item(data, item_id):
    for ph in data["phases"]:
        for it in ph["items"]:
            if it["id"] == item_id:
                return ph, it
    return None, None


def read_md(rel):
    if not rel:
        return None
    p = BASE / rel
    if not p.exists():
        return None
    return markdown.markdown(
        p.read_text(encoding="utf-8"),
        extensions=["fenced_code", "tables", "nl2br", "sane_lists"],
    )


# ---------------- CSS ----------------
CSS = """
:root{--bg:#0b0f19;--card:#131a26;--bd:#243247;--tx:#e6edf7;--mut:#7d8ba3;
--ok:#10b981;--pend:#f59e0b;--cy:#38bdf8;--pu:#8b5cf6;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,sans-serif;
-webkit-font-smoothing:antialiased}
a{color:var(--cy);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:20px 16px 80px}
.top{display:flex;align-items:center;gap:14px;flex-wrap:wrap;
border-bottom:1px solid var(--bd);padding-bottom:18px;margin-bottom:22px}
.badge{background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#fff;font-size:11px;
font-weight:700;padding:8px 10px;border-radius:8px;text-align:center;line-height:1.15}
h1{font-size:20px;margin:0}
.sub{color:var(--mut);font-size:12.5px;margin-top:3px}
.progbox{background:var(--card);border:1px solid var(--bd);border-radius:12px;
padding:16px 18px;margin-bottom:24px}
.pct{font-size:34px;font-weight:800;color:var(--ok)}
.pbar{height:11px;background:#0e1622;border:1px solid var(--bd);border-radius:99px;
overflow:hidden;margin:12px 0 8px}
.pfill{height:100%;background:linear-gradient(90deg,#10b981,#34d399);
border-radius:99px;transition:width .4s}
.meta{display:flex;gap:22px;flex-wrap:wrap;font-size:12.5px;color:var(--mut)}
.meta b{color:var(--tx);font-size:15px}
.phase{background:var(--card);border:1px solid var(--bd);border-radius:12px;
margin-bottom:16px;overflow:hidden}
.ph{display:flex;align-items:center;gap:12px;padding:14px 16px;
border-bottom:1px solid var(--bd);flex-wrap:wrap}
.ph .no{font-size:10.5px;font-weight:700;color:#fff;background:#334155;
padding:4px 8px;border-radius:6px;letter-spacing:.04em}
.ph .ti{font-size:15px;font-weight:700;flex:1;min-width:180px}
.ph .go{color:var(--mut);font-size:11.5px;width:100%;line-height:1.5}
.ph .cnt{font-size:11.5px;color:var(--mut);font-family:ui-monospace,monospace}
.mini{height:6px;background:#0e1622;border-radius:99px;overflow:hidden;width:110px}
.mini i{display:block;height:100%;background:var(--ok);border-radius:99px}
.item{display:flex;gap:12px;padding:11px 16px;border-bottom:1px solid #1a2434;
align-items:flex-start}
.item:last-child{border-bottom:none}
.dot{flex-shrink:0;width:17px;height:17px;border-radius:50%;margin-top:2px;
border:2px solid #475569}
.dot.done{background:var(--ok);border-color:var(--ok)}
.dot.done::after{content:"✓";display:block;color:#04110b;font-size:11px;
font-weight:900;text-align:center;line-height:13px}
.itxt{flex:1;min-width:0}
.itl{font-size:13.5px;font-weight:600}
.item.done .itl{color:#a7f3d0}
.itd{font-size:11.5px;color:var(--mut);margin-top:3px;line-height:1.55}
.tag{font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;
text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}
.t-done{background:rgba(16,185,129,.16);color:#34d399;
border:1px solid rgba(16,185,129,.4)}
.t-pend{background:rgba(245,158,11,.14);color:#fbbf24;
border:1px solid rgba(245,158,11,.35)}
.tools{font-size:10.5px;color:var(--mut);font-family:ui-monospace,monospace;
margin-top:5px;opacity:.85}
.back{display:inline-block;margin-bottom:16px;font-size:12.5px}
/* entry page */
.ent{background:var(--card);border:1px solid var(--bd);border-radius:12px;
padding:22px 24px;overflow-x:auto}
.ent h1{font-size:20px;margin:0 0 4px;color:#fff}
.ent h2{font-size:15px;margin:26px 0 10px;color:var(--cy);
border-bottom:1px solid var(--bd);padding-bottom:6px}
.ent h3{font-size:13.5px;margin:20px 0 8px;color:#c4b5fd}
.ent p,.ent li{font-size:13.5px;line-height:1.72;color:#cbd5e1}
.ent ul,.ent ol{padding-left:22px}
.ent li{margin:5px 0}
.ent strong{color:#fff}
.ent code{background:#0e1622;border:1px solid var(--bd);padding:1.5px 5px;
border-radius:4px;font-size:12px;color:#fbbf24;
font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.ent pre{background:#070c14;border:1px solid var(--bd);border-radius:8px;
padding:14px 16px;overflow-x:auto;margin:12px 0}
.ent pre code{background:none;border:none;padding:0;color:#a5f3fc;font-size:12px;
line-height:1.65}
.ent table{border-collapse:collapse;width:100%;margin:14px 0;font-size:12.5px;
display:block;overflow-x:auto}
.ent th,.ent td{border:1px solid var(--bd);padding:8px 11px;text-align:left;
vertical-align:top}
.ent th{background:#0e1622;color:#93c5fd;font-weight:700;white-space:nowrap}
.ent blockquote{border-left:3px solid var(--pu);margin:14px 0;padding:6px 16px;
background:rgba(139,92,246,.07);color:#c4b5fd;border-radius:0 6px 6px 0}
.shotwrap{margin-top:24px}
.shotwrap h2{border-bottom:1px solid var(--bd);color:var(--ok);
padding-bottom:6px}
.shot{width:100%;border:1px solid var(--bd);border-radius:10px;display:block;
background:#070c14}
.cap{font-size:11.5px;color:var(--mut);margin-top:8px;font-style:italic}
@media(max-width:640px){.ent{padding:16px 14px}.pct{font-size:30px}}
"""

# ---------------- TEMPLATES ----------------
TPL_LIST = """<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Roadmap Backend SI-LPPM</title><style>{{css}}</style></head><body><div class="wrap">
<div class="top">
  <div class="badge">LPPM<br>BACKEND</div>
  <div><h1>{{data.project}}</h1>
  <div class="sub">{{data.subtitle}} · Diperbarui {{data.updated}}</div>
  <div class="sub">PIC Backend: <b style="color:#e6edf7">{{data.owner}}</b>
   · Frontend: <b style="color:#e6edf7">{{data.partner}}</b></div></div>
  <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">
    <a href="/peta" style="background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#fff;
      padding:9px 14px;border-radius:9px;font-size:12.5px;font-weight:700;text-decoration:none">
      🗺️ Peta Jalan</a>
    <a href="/docs" style="background:#1a2334;border:1px solid #243247;color:#cbd5e1;
      padding:9px 14px;border-radius:9px;font-size:12.5px;text-decoration:none">
      📄 Dokumentasi API</a>
  </div>
</div>

<div class="progbox">
  <div class="sub" style="margin-bottom:2px">PROGRES KESELURUHAN BACKEND</div>
  <span class="pct">{{st.pct}}%</span>
  <div class="pbar"><div class="pfill" style="width:{{st.pct}}%"></div></div>
  <div class="meta">
    <span>Selesai <b style="color:#34d399">{{st.done}}</b> / {{st.total}} item</span>
    <span>Fase <b>{{data.phases|length}}</b></span>
    <span>MD hasil <b>{{mdcount}}</b> dokumen</span>
    <span>Screenshot <b>{{shotcount}}</b> gambar</span>
  </div>
</div>

{% for ph in data.phases %}
{% set d,t,p = ps(ph) %}
<div class="phase">
  <div class="ph">
    <span class="no">{{ph.no}}</span>
    <span class="ti">{{ph.title}}</span>
    <span class="cnt">{{d}}/{{t}}</span>
    <span class="mini"><i style="width:{{p}}%"></i></span>
    <span class="go">{{ph.goal}}</span>
  </div>
  {% for it in ph['items'] %}
  <div class="item {{it.status}}">
    <span class="dot {{'done' if it.status=='done' else ''}}"></span>
    <div class="itxt">
      <div class="itl">
        {% if it.entry %}<a href="/entry/{{it.id}}">{{it.id}} · {{it.title}}</a>
        {% else %}{{it.id}} · {{it.title}}{% endif %}
      </div>
      <div class="itd">{{it.summary}}</div>
      {% if it.tool %}<div class="tools">🔧 {{it.tool}}</div>{% endif %}
    </div>
    <span class="tag {{'t-done' if it.status=='done' else 't-pend'}}">
      {{'Selesai' if it.status=='done' else 'Pending'}}</span>
  </div>
  {% endfor %}
</div>
{% endfor %}
</div></body></html>"""

TPL_ENTRY = """<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ph.no}} · {{it.title}}</title><style>{{css}}</style></head><body><div class="wrap">
<a class="back" href="/">← Kembali ke Roadmap</a>
<div class="progbox" style="margin-bottom:18px">
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <span class="no" style="font-size:10.5px;font-weight:700;color:#fff;
      background:#334155;padding:4px 8px;border-radius:6px">{{ph.no}}</span>
    <h1 style="font-size:18px;margin:0">{{it.title}}</h1>
    <span class="tag {{'t-done' if it.status=='done' else 't-pend'}}">
      {{'Selesai' if it.status=='done' else 'Pending'}}</span>
  </div>
  <div class="sub" style="margin-top:8px">{{ph.goal}}</div>
  <div class="meta" style="margin-top:12px">
    {% if it.date %}<span>Tanggal <b>{{it.date}}</b></span>{% endif %}
    {% if it.tool %}<span>Tool <b>{{it.tool}}</b></span>{% endif %}
    <span>Fase <b>{{ph.no}}</b></span>
  </div>
</div>

<div class="ent">{{body|safe}}</div>

{% if shot %}
<div class="shotwrap">
  <h2>📸 Screenshot Bukti</h2>
  <img class="shot" src="/shot/{{it.id}}" alt="Screenshot {{it.title}}">
  <div class="cap">{{it.title}} — {{it.date or ''}}</div>
</div>
{% endif %}
</div></body></html>"""


# ---------------- ROUTES ----------------
@app.route("/")
def index():
    data = load_roadmap()
    mdcount = len(list((BASE / "entries").glob("*.md"))) if (BASE / "entries").exists() else 0
    shotcount = len(list((BASE / "screenshots").glob("*.png"))) if (BASE / "screenshots").exists() else 0
    return render_template_string(
        TPL_LIST, data=data, css=CSS, st=stats(data), ps=phase_stats,
        mdcount=mdcount, shotcount=shotcount,
    )


@app.route("/entry/<item_id>")
def entry(item_id):
    data = load_roadmap()
    ph, it = find_item(data, item_id)
    if not it:
        abort(404)
    body = read_md(it.get("entry"))
    if body is None:
        body = f"<p><em>File hasil belum tersedia untuk item {it['id']}.</em></p>"
    shot = bool(it.get("shot")) and (BASE / it["shot"]).exists()
    return render_template_string(
        TPL_ENTRY, css=CSS, ph=ph, it=it, body=body, shot=shot
    )


@app.route("/shot/<item_id>")
def shot(item_id):
    data = load_roadmap()
    _, it = find_item(data, item_id)
    if not it or not it.get("shot"):
        abort(404)
    d = BASE / it["shot"]
    if not d.exists():
        abort(404)
    return send_from_directory(d.parent, d.name)


@app.route("/md/<item_id>")
def md_raw(item_id):
    data = load_roadmap()
    _, it = find_item(data, item_id)
    if not it or not it.get("entry"):
        abort(404)
    d = BASE / it["entry"]
    if not d.exists():
        abort(404)
    return Response(d.read_text(encoding="utf-8"),
                    mimetype="text/markdown; charset=utf-8",
                    headers={"Content-Disposition":
                             f'inline; filename="{d.name}"'})


@app.route("/api/progress")
def api_progress():
    data = load_roadmap()
    out = {"overall": stats(data), "phases": []}
    for ph in data["phases"]:
        d, t, p = phase_stats(ph)
        out["phases"].append({
            "id": ph["id"], "no": ph["no"], "title": ph["title"],
            "goal": ph.get("goal", ""),
            "state": ph.get("state", ""),
            "done": d, "total": t, "pct": p,
            "items": [{"id": i["id"], "title": i["title"],
                       "status": i["status"],
                       "md": bool(i.get("entry")),
                       "shot": bool(i.get("shot"))} for i in ph["items"]],
        })
    return jsonify(out)


@app.route("/health")
def health():
    return jsonify(status="ok", project="SI-LPPM Backend Roadmap")


# ---------------- Realtime: Server-Sent Events ----------------
# Server mendorong pesan tiap roadmap.json berubah, sehingga peta di browser
# ikut ter-update tanpa refresh. Tidak butuh koneksi balik ke asisten —
# jalurnya: pemberi tugas menulis roadmap.json -> file mtime berubah ->
# stream ini mendeteksinya lalu memberi tahu browser.
STREAM_TTL = 600   # detik; koneksi diakhiri lalu browser menyambung ulang sendiri


@app.route("/api/stream")
def stream():
    def gen():
        last = None
        t0 = time.time()
        while time.time() - t0 < STREAM_TTL:
            try:
                st = DATA.stat()
                cur = (st.st_mtime_ns, st.st_size)
            except OSError:
                cur = (0, 0)
            # pesan "siap" saat koneksi baru, supaya klien tahu stream hidup
            if last is None:
                yield f"retry: 2000\ndata: {json.dumps({'tipe': 'sambung', 'rev': cur[0]})}\n\n"
            elif cur != last:
                payload = {"tipe": "berubah", "rev": cur[0],
                           "statistik": stats(load_roadmap())}
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
            last = cur
            time.sleep(1.2)
        yield f"data: {json.dumps({'tipe': 'tutup'})}\n\n"

    return Response(gen(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",   # cegah buffer proxy (termasuk tunnel)
        "Connection": "keep-alive",
    })


@app.route("/peta")
def peta():
    p = BASE / "peta.html"
    if not p.exists():
        abort(404)
    return Response(p.read_text(encoding="utf-8"),
                    mimetype="text/html; charset=utf-8")


# ---------------- Dokumentasi API ----------------
DOCS_DIR = BASE.parent / "docs"
DOCS_FILES = {
    "html": ("dokumentasi-api.html", "text/html; charset=utf-8"),
    "pdf":  ("dokumentasi-api.pdf",  "application/pdf"),
    "docx": ("dokumentasi-api.docx",
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
}


@app.route("/docs")
def docs_index():
    rows = "".join(
        f'<a class="doc" href="/docs/{k}"><b>{k.upper()}</b><span>{fn}</span>'
        f'<em>{(DOCS_DIR / fn).stat().st_size if (DOCS_DIR / fn).exists() else 0} bytes</em></a>'
        for k, (fn, _) in DOCS_FILES.items()
    )
    return f"""<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dokumentasi API — SI-LPPM</title><style>{{
 body{{background:#0b0f17;color:#f1f5f9;margin:0;
  font-family:'Plus Jakarta Sans',system-ui,sans-serif}}
 .wrap{{max-width:760px;margin:0 auto;padding:40px 20px}}
 h1{{font-size:22px;margin:0 0 4px}} .sub{{color:#94a3b8;font-size:13px;margin-bottom:26px}}
 a.doc{{display:flex;align-items:center;gap:14px;background:#131a26;border:1px solid #243247;
  border-radius:12px;padding:16px 18px;margin-bottom:12px;text-decoration:none;color:#f1f5f9}}
 a.doc:hover{{border-color:#3d5477;background:#172132}}
 a.doc b{{font-family:'JetBrains Mono',monospace;font-size:13px;background:linear-gradient(135deg,#4f46e5,#06b6d4);
  color:#fff;padding:8px 10px;border-radius:7px}}
 a.doc span{{flex:1;font-size:14px}}
 a.doc em{{color:#64748b;font-size:11.5px;font-style:normal;
  font-family:'JetBrains Mono',monospace}}
 .back{{color:#94a3b8;font-size:13px;text-decoration:none}}
 .note{{color:#94a3b8;font-size:12.5px;margin-top:24px;line-height:1.7}}
}}</style></head><body><div class="wrap">
<a class="back" href="/">← Kembali ke Roadmap</a>
<h1 style="margin-top:16px">Dokumentasi API</h1>
<div class="sub">Sistem Informasi LPPM — 20 endpoint (4 terverifikasi, 16 rencana) · 7 role</div>
{rows}
<div class="note">HTML memakai desain yang sama dengan dokumen ERD. PDF dihasilkan dari
HTML yang sama lewat Chromium, dan DOCX dari sumber data yang sama — sehingga isi
ketiganya selalu identik.</div>
</div></body></html>"""


@app.route("/docs/<fmt>")
def docs_get(fmt):
    if fmt not in DOCS_FILES:
        abort(404)
    fn, mime = DOCS_FILES[fmt]
    p = DOCS_DIR / fn
    if not p.exists():
        abort(404)
    disp = "inline" if fmt == "html" else "attachment"
    return Response(p.read_bytes(), mimetype=mime,
                    headers={"Content-Disposition": f'{disp}; filename="{fn}"'})


if __name__ == "__main__":
    print("Roadmap server → http://0.0.0.0:8899")
    app.run(host="0.0.0.0", port=8899, debug=False)
