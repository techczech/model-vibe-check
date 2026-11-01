#!/usr/bin/env python3
"""Build a self-contained results.html from a run folder.
Usage: python3 report.py runs/<run-id> [out.html]"""
import html, json, os, sys, statistics
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import score as scoremod  # noqa: E402

JUDGED = [("novel-sentence", "Novel sentence"), ("rilke", "Rilke title"), ("coherence", "Coherence"),
          ("pos", "Parts of speech"), ("totiz", "Totiž"), ("revival", "Revival figures")]
LADDERS = [("vertical-ladder", "Vertical ladder"), ("reverse-w", "Reverse (words)"), ("reverse-r", "Reverse (random)")]
LANGS = ["en", "cs"]
LINEAGE_ORDER = ["Gemma", "Qwen", "Llama", "Granite"]


def run_slug(m):
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in m.replace(":", "_"))


def esc(s):
    return html.escape(str(s if s is not None else ""))


def colour(h):
    if h is None:
        return "#eee"
    return "rgb(%d,%d,130)" % (int(240 - 110 * h), int(120 + 100 * h))


def lang_of(rec):
    if rec["test"] == "rilke":
        return "cs" if rec["item"].endswith("-cs") else "en"
    return rec["lang"]


def pre(s):
    return "<pre>%s</pre>" % esc(s)


def fnum(x, nd=1):
    return "-" if x is None else (("%." + str(nd) + "f") % x)


def med(xs):
    xs = [x for x in xs if x is not None]
    return statistics.median(xs) if xs else None


def item_detail(rec, out, judgement, item):
    h = ["<h3>%s &middot; %s &middot; think %s</h3>" % (esc(rec["model"]), esc(rec["item"]), esc(rec["think"]))]
    flags = []
    if rec["truncated"]:
        flags.append("TRUNCATED (hit num_predict)")
    if rec["self_judged"]:
        flags.append("SELF-JUDGED (gemma4:31b judging itself)")
    if rec.get("error"):
        flags.append("ERROR: " + str(rec["error"]))
    if rec.get("judge_error"):
        flags.append("JUDGE ERROR: " + str(rec["judge_error"]))
    if flags:
        h.append('<p class="flag">%s</p>' % esc(" | ".join(flags)))
    h.append("<p><b>Score:</b> %s (headline %s)</p>" % (esc(rec["label"]), esc(rec["headline"])))
    h.append("<details><summary>metrics</summary>%s</details>" % pre(json.dumps(rec["metrics"], ensure_ascii=False, indent=1)))
    if item.get("partial_scoring"):
        h.append('<p class="flag">Partial scoring: %s</p>' % esc(item["partial_scoring"]))
    if item.get("expected_words"):
        h.append("<p><b>Expected:</b> %s</p>" % esc(" ".join(item["expected_words"][:item.get("score_first_n") or None])))
    if item.get("expected"):
        h.append("<p><b>Expected:</b> <code>%s</code></p>" % esc(item["expected"]))
    for t in (out or {}).get("turns", []):
        h.append("<div class='turn'><b>Prompt</b>%s" % pre(t["user"]))
        if t.get("thinking"):
            h.append("<details><summary>thinking (%d chars)</summary>%s</details>" % (len(t["thinking"]), pre(t["thinking"])))
        h.append("<b>Answer</b> <small>(%s, %s tokens, %s tok/s, %ss)</small>%s</div>" % (
            esc(t.get("done_reason")), esc(t.get("eval_count")), esc(t.get("gen_tok_per_s")), esc(t.get("wall_s")), pre(t["answer"])))
    if judgement:
        h.append("<details open><summary>judge output</summary>%s</details>" % pre(json.dumps(
            {k: v for k, v in judgement.items() if k not in ("options",)}, ensure_ascii=False, indent=1)))
    return "".join(h)


def main():
    run_dir = sys.argv[1].rstrip("/")
    outp = sys.argv[2] if len(sys.argv) > 2 else os.path.join(run_dir, "results.html")
    scoremod.score_run(run_dir)
    pack = json.load(open(os.path.join(HERE, "pack.json"), encoding="utf-8"))
    items = {i["id"]: i for i in pack["items"]}
    man = json.load(open(os.path.join(run_dir, "manifest.json"), encoding="utf-8"))
    meta = {m["tag"]: m for m in json.load(open(os.path.join(HERE, "models.json"), encoding="utf-8"))["models"]}
    minfo = {}
    for m in man["models"]:
        minfo[m["tag"]] = dict(meta.get(m["tag"], {}), **{k: v for k, v in m.items() if v is not None})
    recs = [json.loads(l) for l in open(os.path.join(run_dir, "scores.jsonl"), encoding="utf-8") if l.strip()]
    by = defaultdict(list)  # (model, think, test, lang) -> recs
    byt = defaultdict(list)  # (model, think) -> recs
    for r in recs:
        by[(r["model"], r["think"], r["test"], lang_of(r) if r["test"] in dict(JUDGED) else "")].append(r)
        byt[(r["model"], r["think"])].append(r)

    # speed stats from outputs
    speed = defaultdict(lambda: defaultdict(list))
    outs = {}
    odir = os.path.join(run_dir, "outputs")
    for fn in sorted(os.listdir(odir)):
        if not fn.endswith(".json"):
            continue
        o = json.load(open(os.path.join(odir, fn), encoding="utf-8"))
        outs[(o["model"], o["think"], o["item"])] = o
        sp = speed[(o["model"], o["think"])]
        sp["wall"].append(o.get("wall_s") or 0)
        for t in o.get("turns", []):
            sp["tps"].append(t.get("gen_tok_per_s"))
            sp["tok"].append(t.get("eval_count"))
            sp["thc"].append(t.get("thinking_chars") if t.get("thinking_chars") is not None else len(t.get("thinking", "")))
            sp["anc"].append(t.get("answer_chars") if t.get("answer_chars") is not None else len(t.get("answer", "")))

    def sortkey(mt):
        i = minfo.get(mt[0], {})
        return (i.get("role") != "ladder", i.get("family", "zzz"), i.get("params_b", 0), mt[0], mt[1])

    rows = sorted(byt, key=sortkey)
    detail = {}

    def detail_for(key, rs):
        if key in detail:
            return
        body = []
        for r in sorted(rs, key=lambda x: (x.get("size") or 0, x["item"])):
            o = outs.get((r["model"], r["think"], r["item"]))
            jp = os.path.join(run_dir, "judgements", "%s__%s__%s.json" % (run_slug(r["model"]), r["think"], r["item"]))
            jud = json.load(open(jp, encoding="utf-8")) if os.path.exists(jp) else None
            body.append(item_detail(r, o, jud, items[r["item"]]))
        detail[key] = "<hr>".join(body)

    def flags_of(rs):
        f = ""
        if any(r["truncated"] for r in rs):
            f += ' <span class="tr" title="truncated">T</span>'
        if any(r["self_judged"] for r in rs):
            f += ' <span class="sj" title="self-judged">S</span>'
        if any(r.get("error") or r.get("judge_error") for r in rs):
            f += ' <span class="er" title="error">!</span>'
        return f

    def bp(model, think, test):
        return scoremod.break_points(by.get((model, think, test, ""), []))

    def bp_text(b):
        if not b["n"]:
            return "-"
        return "max %s / fail %s" % (b["max_pass"] if b["max_pass"] is not None else "none", b["first_fail"] if b["first_fail"] is not None else "none")

    def strip_cell(model, think, test):
        rs = by.get((model, think, test, ""), [])
        if not rs:
            return '<td class="na">-</td>'
        key = "%s|%s|%s" % (model, think, test)
        detail_for(key, rs)
        sizes = sorted({r["size"] for r in rs})
        st = {r["size"]: r["status"] for r in rs}
        bar = "".join('<i class="s-%s" title="size %d: %s">%d</i>' % (st[z], z, st[z], z) for z in sizes)
        return '<td class="c" data-k="%s"><div class="strip">%s</div><small>%s</small>%s</td>' % (esc(key), bar, esc(bp_text(bp(model, think, test))), flags_of(rs))

    def legacy_cell(model, think):
        rs = by.get((model, think, "vertical", ""), [])
        if not rs:
            return '<td class="na">-</td>'
        key = "%s|%s|vertical" % (model, think)
        detail_for(key, rs)
        hs = [r["headline"] for r in rs if r["headline"] is not None]
        avg = sum(hs) / len(hs) if hs else None
        summ = " ".join("%s" % r["label"] for r in sorted(rs, key=lambda x: x["item"]))
        return '<td class="c" style="background:%s" data-k="%s">%s%s</td>' % (colour(avg), esc(key), esc(summ), flags_of(rs))

    def judged_cell(model, think, test, lang):
        rs = by.get((model, think, test, lang), [])
        if not rs:
            return '<td class="na">-</td>'
        key = "%s|%s|%s|%s" % (model, think, test, lang)
        detail_for(key, rs)
        hs = [r["headline"] for r in rs if r["headline"] is not None]
        avg = sum(hs) / len(hs) if hs else None
        summ = "<br>".join(esc(r["label"]) for r in rs)
        if len(hs) < len(rs):
            summ += " (unjudged)"
        return '<td class="c" style="background:%s" data-k="%s">%s%s</td>' % (colour(avg), esc(key), summ, flags_of(rs))

    # ---- section 1: overview matrix
    ncols = 3 + 1 + len(JUDGED) * 2
    head1 = ("<tr><th rowspan=2>Model</th><th rowspan=2>think</th><th rowspan=2>Vertical (legacy 3)</th>" +
             "".join('<th rowspan=2>%s</th>' % c for _, c in LADDERS) +
             "".join('<th colspan=2>%s</th>' % c for _, c in JUDGED) + "</tr>")
    head2 = "<tr>" + "".join("<th>%s</th>" % l for _ in JUDGED for l in LANGS) + "</tr>"
    body, last = [], None
    for model, think in rows:
        mi = minfo.get(model, {})
        fam = "%s (%s)" % (mi.get("family", "?"), mi.get("role", "?"))
        if fam != last:
            body.append('<tr class="fam"><td colspan="%d">%s</td></tr>' % (ncols + 2, esc(fam)))
            last = fam
        tds = [legacy_cell(model, think)] + [strip_cell(model, think, t) for t, _ in LADDERS]
        tds += [judged_cell(model, think, t, l) for t, _ in JUDGED for l in LANGS]
        body.append("<tr><td class='m'>%s <small>%s</small></td><td>%s</td>%s</tr>" % (esc(model), esc(mi.get("size_label", "")), esc(think), "".join(tds)))
    overview = "<table>%s%s%s</table>" % (head1, head2, "".join(body))

    # ---- section 2: speed + break points (sortable)
    def stat_row(model, think):
        sp = speed.get((model, think), {})
        mi = minfo.get(model, {})
        bv, bw, br = bp(model, think, "vertical-ladder"), bp(model, think, "reverse-w"), bp(model, think, "reverse-r")
        vals = [
            (model, model), (think, think), (mi.get("params_b"), fnum(mi.get("params_b"), 2)),
            (bv["max_pass"] if bv["max_pass"] is not None else -1, bp_text(bv)),
            (bw["max_pass"] if bw["max_pass"] is not None else -1, bp_text(bw)),
            (br["max_pass"] if br["max_pass"] is not None else -1, bp_text(br)),
            (med(sp.get("tps", [])), fnum(med(sp.get("tps", [])))),
            (med(sp.get("tok", [])), fnum(med(sp.get("tok", [])), 0)),
            (sum(x or 0 for x in sp.get("tok", [])), fnum(sum(x or 0 for x in sp.get("tok", [])), 0)),
            (med(sp.get("thc", [])), fnum(med(sp.get("thc", [])), 0)),
            (med(sp.get("anc", [])), fnum(med(sp.get("anc", [])), 0)),
            (sum(sp.get("wall", [])), fnum(sum(sp.get("wall", [])), 0)),
        ]
        return "<tr>" + "".join('<td data-v="%s">%s</td>' % (esc(v if v is not None else ""), esc(t)) for v, t in vals) + "</tr>"

    sh = ["Model", "think", "Params B", "Vertical break", "Reverse-w break", "Reverse-r break", "Median tok/s", "Median out tok",
          "Total out tok", "Median thinking chars", "Median answer chars", "Total wall s"]
    speed_tbl = '<table class="sortable"><tr>%s</tr>%s</table>' % ("".join("<th>%s</th>" % h for h in sh), "".join(stat_row(m, t) for m, t in rows))

    # ---- shared compact row (moe section, generation view)
    def compact_row(model, think, extra=""):
        mi = minfo.get(model, {})
        cells = []
        v = [r["headline"] for r in by.get((model, think, "vertical", ""), []) if r["headline"] is not None]
        cells.append(fnum(sum(v) / len(v), 2) if v else "-")
        for t, _ in LADDERS:
            cells.append(esc(bp_text(bp(model, think, t))))
        for t, _ in JUDGED:
            hs = [r["headline"] for l in LANGS for r in by.get((model, think, t, l), []) if r["headline"] is not None]
            cells.append(fnum(sum(hs) / len(hs), 2) if hs else "-")
        cells.append(fnum(med(speed.get((model, think), {}).get("tps", []))))
        return ("<tr><td class='m'>%s%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td>%s</tr>" % (
            esc(model), extra, esc(think), esc(mi.get("arch", "?")), fnum(mi.get("params_b"), 2), fnum(mi.get("active_params_b"), 2),
            "".join("<td>%s</td>" % c for c in cells)))

    ch = ["Model", "think", "arch", "total B", "active B", "Vertical legacy"] + [c for _, c in LADDERS] + [c for _, c in JUDGED] + ["tok/s"]
    chead = "<tr>%s</tr>" % "".join("<th>%s</th>" % h for h in ch)
    have = {}
    for m, t in rows:
        have.setdefault(m, []).append(t)

    # ---- section 3: MoE vs dense, pairs derived from models.json metadata
    fams = defaultdict(list)
    for m in have:
        fams[minfo.get(m, {}).get("family", "?")].append(m)
    moe_html = []
    for fam in sorted(fams):
        ms = fams[fam]
        moes = [m for m in ms if minfo.get(m, {}).get("arch") == "moe"]
        dense = [m for m in ms if minfo.get(m, {}).get("arch") == "dense"]
        if not moes or not dense:
            continue
        chosen, seen = [], set()
        for mo in sorted(moes, key=lambda m: minfo[m].get("params_b", 0)):
            tot, act = minfo[mo].get("params_b", 0), minfo[mo].get("active_params_b", 0)
            near_t = min(dense, key=lambda d: abs(minfo[d].get("params_b", 0) - tot))
            near_a = min(dense, key=lambda d: abs(minfo[d].get("params_b", 0) - act))
            for m, note in ((mo, ""), (near_t, " (dense, nearest total)"), (near_a, " (dense, nearest active)")):
                if m not in seen:
                    seen.add(m)
                    chosen.append((m, note))
        trs = "".join(compact_row(m, t, "<small>%s</small>" % note) for m, note in chosen for t in sorted(have[m]))
        moe_html.append("<h3>%s</h3><table>%s%s</table>" % (esc(fam), chead, trs))
    moe_sec = "".join(moe_html) or "<p>No family with both a mixture-of-experts and a dense model in this run.</p>"

    # ---- section 4: generation view by lineage
    def gen_key(m):
        i = minfo.get(m, {})
        try:
            g = float(i.get("generation", 0))
        except ValueError:
            g = 0
        return (g, i.get("family", ""), i.get("params_b", 0), m)

    lin = defaultdict(list)
    for m in have:
        first = minfo.get(m, {}).get("family", "?").split()[0]
        lin[first].append(m)
    order = [l for l in LINEAGE_ORDER if l in lin] + sorted(l for l in lin if l not in LINEAGE_ORDER)
    gen_html = []
    for l in order:
        trs, lastg = [], None
        for m in sorted(lin[l], key=gen_key):
            fam = minfo.get(m, {}).get("family", "?")
            if fam != lastg:
                trs.append('<tr class="fam"><td colspan="%d">%s</td></tr>' % (len(ch), esc(fam)))
                lastg = fam
            trs.extend(compact_row(m, t) for t in sorted(have[m]))
        gen_html.append("<h3>%s</h3><table>%s%s</table>" % (esc(l), chead, "".join(trs)))

    dj = json.dumps(detail, ensure_ascii=False).replace("</", "<\\/")
    css = """body{font:14px system-ui,sans-serif;margin:16px}table{border-collapse:collapse;margin-bottom:12px}td,th{border:1px solid #ccc;padding:3px 6px;text-align:center;vertical-align:top}
td.c{cursor:pointer;font-size:12px}td.m{text-align:left;white-space:nowrap}tr.fam td{background:#223;color:#fff;text-align:left;font-weight:bold}
#panel{margin-top:20px;border-top:3px solid #223;padding-top:8px;max-width:1000px}pre{white-space:pre-wrap;background:#f6f6f6;padding:6px;margin:4px 0}
.flag{color:#b00;font-weight:bold}.tr{background:#fc0;padding:0 3px}.sj{background:#9cf;padding:0 3px}.er{background:#f66;padding:0 3px}.na{color:#aaa}
.strip{display:flex;gap:1px}.strip i{font-style:normal;font-size:9px;padding:1px 2px;min-width:12px;color:#000}
.s-pass{background:#6c6}.s-partial{background:#fc4}.s-fail{background:#e66}
table.sortable th{cursor:pointer;background:#eef}h2{margin-top:28px}"""
    js = """var D=%s;document.addEventListener('click',function(e){var c=e.target.closest('td.c');if(c&&D[c.dataset.k]){document.getElementById('panel').innerHTML=D[c.dataset.k];return;}
var th=e.target.closest('table.sortable th');if(th){var t=th.closest('table'),i=th.cellIndex,asc=th.dataset.asc!=='1';th.dataset.asc=asc?'1':'0';
var rs=Array.prototype.slice.call(t.rows,1);rs.sort(function(a,b){var x=a.cells[i].dataset.v,y=b.cells[i].dataset.v,nx=parseFloat(x),ny=parseFloat(y);
var r=(!isNaN(nx)&&!isNaN(ny))?nx-ny:String(x).localeCompare(String(y));return asc?r:-r;});rs.forEach(function(r){t.tBodies[0].appendChild(r);});}});""" % dj
    page = ("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Spark vibe-check %s</title><style>%s</style></head><body>"
            "<h1>Spark open-model vibe check</h1><p>Run <b>%s</b> &middot; Ollama %s &middot; pack v%s &middot; judge %s &middot; click a cell for full answers and judge notes. "
            "Flags: <span class=\"tr\">T</span> truncated, <span class=\"sj\">S</span> self-judged, <span class=\"er\">!</span> error. "
            "Ladder strips: <i class=\"strip s-pass\">pass</i> <i class=\"strip s-partial\">partial</i> <i class=\"strip s-fail\">fail</i> per size; break point = largest size passed exactly / first size failed.</p>"
            "<h2>Overview</h2>%s<h2>Break points, speed and tokens (click a header to sort)</h2>%s"
            "<h2>Mixture-of-experts vs dense</h2>%s<h2>Generations</h2>%s<div id=\"panel\"></div><script>%s</script></body></html>") % (
        esc(man["run_id"]), css, esc(man["run_id"]), esc(man.get("ollama_version")), esc(man.get("pack_version")), esc(man.get("judge_model")),
        overview, speed_tbl, moe_sec, "".join(gen_html), js)
    with open(outp, "w", encoding="utf-8") as f:
        f.write(page)
    print("wrote", outp, len(page), "bytes")


if __name__ == "__main__":
    main()
