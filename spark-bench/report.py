#!/usr/bin/env python3
"""Build a self-contained results.html from a run folder.
Usage: python3 report.py runs/<run-id> [out.html]"""
import html, json, os, sys, glob
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import score as scoremod  # noqa: E402

# column = (test, header, [langs]); langs None -> single aggregate
COLS = [("vertical", "Vertical text", None), ("reverse", "Reverse string", None),
        ("novel-sentence", "Novel sentence", ["en", "cs"]), ("rilke", "Rilke title", ["en", "cs"]),
        ("coherence", "Coherence", ["en", "cs"]), ("pos", "Parts of speech", ["en", "cs"]),
        ("totiz", "Totiž", ["en", "cs"]), ("revival", "Revival figures", ["en", "cs"])]
SUFFIX = {"en", "cs", "de"}


def run_slug(m):
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in m.replace(":", "_"))


def esc(s):
    return html.escape(str(s if s is not None else ""))


def colour(h):
    if h is None:
        return "#eee"
    r = int(240 - 110 * h)
    g = int(120 + 100 * h)
    return "rgb(%d,%d,%d)" % (r, g, 130)


def lang_of(rec):
    i = rec["item"]
    if rec["test"] in ("rilke",):
        return "cs" if i.endswith("-cs") else "en"
    return rec["lang"]


def pre(s):
    return "<pre>%s</pre>" % esc(s)


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
        h.append("<p><b>Expected:</b> %s</p>" % esc(" ".join(item["expected_words"])))
    if item.get("expected"):
        h.append("<p><b>Expected:</b> <code>%s</code></p>" % esc(item["expected"]))
    for t in (out or {}).get("turns", []):
        h.append("<div class='turn'><b>Prompt</b>%s" % pre(t["user"]))
        if t.get("thinking"):
            h.append("<details><summary>thinking (%d chars)</summary>%s</details>" % (len(t["thinking"]), pre(t["thinking"])))
        h.append("<b>Answer</b> <small>(%s, %s tokens, %ss)</small>%s</div>" % (esc(t.get("done_reason")), esc(t.get("eval_count")), esc(t.get("wall_s")), pre(t["answer"])))
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
    minfo = {m["tag"]: m for m in man["models"]}
    recs = [json.loads(l) for l in open(os.path.join(run_dir, "scores.jsonl"), encoding="utf-8") if l.strip()]
    by = defaultdict(list)  # (model, think, test, lang) -> recs
    for r in recs:
        by[(r["model"], r["think"], r["test"], lang_of(r) if r["test"] != "vertical" and r["test"] != "reverse" else "")].append(r)

    rows = sorted({(r["model"], r["think"]) for r in recs},
                  key=lambda mt: (minfo.get(mt[0], {}).get("role") != "ladder", minfo.get(mt[0], {}).get("family", "zzz"),
                                  minfo.get(mt[0], {}).get("params_b", 0), mt[0], mt[1]))
    detail = {}

    def cell(model, think, test, lang):
        rs = by.get((model, think, test, lang), [])
        if not rs:
            return '<td class="na">-</td>'
        key = "%s|%s|%s|%s" % (model, think, test, lang)
        # summary
        hs = [r["headline"] for r in rs if r["headline"] is not None]
        pending = len(rs) - len(hs)
        if test == "vertical":
            fixed = [r for r in rs if r["item"].startswith("vertical-") and not r["item"].startswith("vertical-gen")]
            gen = [r for r in rs if r["item"].startswith("vertical-gen")]
            f = lambda L: (sum(r["headline"] or 0 for r in L) / len(L)) if L else None
            summ = "src %s<br>gen %s<br>exact %d/%d" % (("%.2f" % f(fixed)) if fixed else "-", ("%.2f" % f(gen)) if gen else "-",
                                                         sum(1 for r in rs if r["metrics"].get("exact_all")), len(rs))
            avg = sum(hs) / len(hs) if hs else None
        elif test == "reverse":
            ex = sum(1 for r in rs if r["metrics"].get("exact"))
            summ = "%d/%d exact" % (ex, len(rs))
            avg = ex / len(rs)
        else:
            summ = "<br>".join(esc(r["label"]) for r in rs)
            avg = sum(hs) / len(hs) if hs else None
        flags = ""
        if any(r["truncated"] for r in rs):
            flags += ' <span class="tr" title="truncated">T</span>'
        if any(r["self_judged"] for r in rs):
            flags += ' <span class="sj" title="self-judged">S</span>'
        if any(r.get("error") or r.get("judge_error") for r in rs):
            flags += ' <span class="er" title="error">!</span>'
        if pending and test not in ("vertical", "reverse"):
            summ += " (unjudged)"
        body = []
        for r in sorted(rs, key=lambda x: x["item"]):
            fn = "%s__%s__%s.json" % (run_slug(model), think, r["item"])
            op = os.path.join(run_dir, "outputs", fn)
            out = json.load(open(op, encoding="utf-8")) if os.path.exists(op) else None
            jp = os.path.join(run_dir, "judgements", fn)
            jud = json.load(open(jp, encoding="utf-8")) if os.path.exists(jp) else None
            body.append(item_detail(r, out, jud, items[r["item"]]))
        detail[key] = "<hr>".join(body)
        return '<td style="background:%s" data-k="%s" class="c">%s%s</td>' % (colour(avg), esc(key), summ, flags)

    head1 = "<tr><th rowspan=2>Model</th><th rowspan=2>think</th>" + "".join(
        '<th colspan="%d">%s</th>' % (len(l) if l else 1, c) for _, c, l in COLS) + "</tr>"
    head2 = "<tr>" + "".join("<th>%s</th>" % x for _, _, l in COLS for x in (l or [""])) + "</tr>"
    body, last_fam = [], None
    for model, think in rows:
        mi = minfo.get(model, {})
        fam = "%s (%s)" % (mi.get("family", "?"), mi.get("role", "?"))
        if fam != last_fam:
            body.append('<tr class="fam"><td colspan="%d">%s</td></tr>' % (2 + sum(len(l) if l else 1 for _, _, l in COLS), esc(fam)))
            last_fam = fam
        tds = []
        for test, _, langs in COLS:
            for lg in (langs or [""]):
                tds.append(cell(model, think, test, lg))
        body.append("<tr><td class='m'>%s <small>%s</small></td><td>%s</td>%s</tr>" % (esc(model), esc(mi.get("size_label", "")), esc(think), "".join(tds)))

    dj = json.dumps(detail, ensure_ascii=False).replace("</", "<\\/")
    page = """<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Spark vibe-check %s</title>
<style>body{font:14px system-ui,sans-serif;margin:16px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:3px 6px;text-align:center;vertical-align:top}
td.c{cursor:pointer;font-size:12px}td.m{text-align:left;white-space:nowrap}tr.fam td{background:#223;color:#fff;text-align:left;font-weight:bold}
#panel{margin-top:20px;border-top:3px solid #223;padding-top:8px;max-width:1000px}pre{white-space:pre-wrap;background:#f6f6f6;padding:6px;margin:4px 0}
.flag{color:#b00;font-weight:bold}.tr{background:#fc0;padding:0 3px}.sj{background:#9cf;padding:0 3px}.er{background:#f66;padding:0 3px}.na{color:#aaa}</style></head><body>
<h1>Spark open-model vibe check</h1><p>Run <b>%s</b> &middot; Ollama %s &middot; pack v%s &middot; judge %s &middot; click a cell for full answers and judge notes.
Flags: <span class="tr">T</span> truncated, <span class="sj">S</span> self-judged, <span class="er">!</span> error.</p>
<table>%s%s%s</table><div id="panel"></div>
<script>var D=%s;document.addEventListener('click',function(e){var c=e.target.closest('td.c');if(c)document.getElementById('panel').innerHTML=D[c.dataset.k];});</script>
</body></html>""" % (esc(man["run_id"]), esc(man["run_id"]), esc(man.get("ollama_version")), esc(man.get("pack_version")), esc(man.get("judge_model")),
                     head1, head2, "".join(body), dj)
    with open(outp, "w", encoding="utf-8") as f:
        f.write(page)
    print("wrote", outp, len(page), "bytes")


if __name__ == "__main__":
    main()
