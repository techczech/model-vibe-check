#!/usr/bin/env python3
"""Build one self-contained showcase page: size ladders per item, from whatever outputs exist.
Usage: python3 showcase.py --run-dir runs/<run-id> [--out showcase.html]
Reads outputs/ and judgements/ only; never writes into the run folder."""
import argparse, glob, html, json, os, sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import score as scoremod  # noqa: E402

KNOWLEDGE = ["revival-en", "revival-cs", "coherence-en", "coherence-cs", "pos-cs", "rilke-en", "totiz-cs"]
OPERATIONS = ["vertical-n01", "vertical-n02", "vertical-n04", "vertical-n08",
              "reverse-w08", "reverse-r08", "reverse-r16", "reverse-r32"]
FAMILY_ORDER = ["Gemma 4", "Gemma 3", "Qwen 3.5", "Qwen 2.5", "Llama 3.2", "Granite 4"]
FOLD_CHARS = 700  # collapse long answers (~12 lines)


def esc(s):
    return html.escape(str(s if s is not None else ""))


def fnum(x):
    return ("%g" % x) if x is not None else "?"


def size_text(mi):
    tot, act = mi.get("params_b"), mi.get("active_params_b")
    if mi.get("arch") == "moe":
        return "%sB total / %sB active (mixture of experts)" % (fnum(tot), fnum(act))
    return "%sB" % fnum(tot)


def load_run(run_dir):
    """Reuses score.score_record in memory (score.score_run would write scores.jsonl into the run)."""
    pack = json.load(open(os.path.join(HERE, "pack.json"), encoding="utf-8"))
    items = {i["id"]: i for i in pack["items"]}
    meta = {m["tag"]: m for m in json.load(open(os.path.join(HERE, "models.json"), encoding="utf-8"))["models"]}
    man = json.load(open(os.path.join(run_dir, "manifest.json"), encoding="utf-8"))
    minfo = {}
    for m in man.get("models", []):
        minfo[m["tag"]] = dict(meta.get(m["tag"], {}), **{k: v for k, v in m.items() if v is not None})
    for t, m in meta.items():
        minfo.setdefault(t, m)
    people = scoremod.load_checklist()
    judge_tag = man.get("judge_model", "gemma4:31b")
    cells = {}  # (model, think, item) -> dict(out, rec)
    for p in sorted(glob.glob(os.path.join(run_dir, "outputs", "*.json"))):
        try:
            out = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        item = items.get(out.get("item"))
        if not item:
            continue
        jp = os.path.join(run_dir, "judgements", os.path.basename(p))
        try:
            jud = json.load(open(jp, encoding="utf-8")) if os.path.exists(jp) else None
        except Exception:
            jud = None
        if out.get("error") and not out.get("turns"):
            rec = {"status": "fail", "headline": None, "label": "error", "metrics": {}, "judged": False,
                   "truncated": False, "error": out["error"], "test": item["test"]}
        else:
            try:
                rec = scoremod.score_record(out, item, jud, judge_tag, people)
            except Exception:  # judgement in an older format: show as unjudged
                rec = scoremod.score_record(out, item, None, judge_tag, people)
        cells[(out["model"], "on" if out["think"] == "on" else "off", out["item"])] = {"out": out, "rec": rec}
    return man, items, minfo, cells


# ---------- badges ----------
def band(h):
    if h is None:
        return "none"
    return "pass" if h >= 0.75 else ("partial" if h >= 0.4 else "fail")


def badge(rec, item_id):
    """Returns (css band, literal text)."""
    t = rec.get("test")
    m = rec.get("metrics") or {}
    if rec.get("error") and not m:
        return "fail", "error: " + str(rec["error"])[:80]
    if rec.get("status"):  # auto ladder items
        st = rec["status"]
        if t == "vertical-ladder":
            return st, "%s: %d of %d words in order" % (st, m.get("matched", 0), m.get("expected", 0))
        return st, "%s%s" % (st, " (right string appears somewhere in the answer)" if st == "partial" else "")
    if not rec.get("judged") or rec.get("headline") is None:
        return "none", "not judged yet"
    b = band(rec["headline"])
    if t == "revival":
        return b, "named %d · on checklist %d · invented %d" % (m.get("named", 0), m.get("on_checklist", 0), m.get("fabricated_or_obscure", 0))
    if t == "coherence":
        return b, "%s of 6 checks · factual errors %d" % (fnum(round(m.get("masaryk", 0) + m.get("benes", 0) + m.get("referent_kept", 0) + m.get("language_matches", 0) + (1 if m.get("turn1_one_word") else 0) + (1 if m.get("turn1_prague") else 0))), m.get("factual_errors", 0))
    if t == "pos":
        return b, "stated count %s · reference categories %d of 10 · wrong examples %d" % (fnum(m.get("stated_count")), m.get("reference_matched", 0), m.get("wrong_examples", 0))
    if t == "rilke":
        return b, "%s · quality %d of 2" % ("modal verb correct" if m.get("modal_correct") else "modal verb wrong", m.get("quality", 0))
    if t == "totiz":
        return b, "sentences %d · uses covered %d of 3 · unnatural %d · quality %d of 3" % (m.get("sentences", 0), m.get("uses_covered", 0), m.get("unnatural", 0), m.get("quality", 0))
    return b, rec.get("label", "")


def points(rec):
    """0..1 for the summary, None when not scorable yet."""
    if rec.get("status"):
        return {"pass": 1.0, "partial": 0.5, "fail": 0.0}[rec["status"]]
    if not rec.get("judged"):
        return None
    return rec.get("headline")


# ---------- html pieces ----------
def answer_html(out):
    parts = []
    turns = out.get("turns", [])
    for i, t in enumerate(turns):
        a = (t.get("answer") or "").strip() or "(empty answer)"
        if len(turns) > 1:
            parts.append('<div class="turnq">Turn %d: %s</div>' % (i + 1, esc(t.get("user", ""))))
        fold = len(a) > FOLD_CHARS or a.count("\n") > 12
        parts.append('<pre class="ans%s">%s</pre>' % (" fold" if fold else "", esc(a)))
        if fold:
            parts.append('<button type="button" class="more">Show all</button>')
    return "".join(parts)


def cell_html(model, mi, think, item_id, c):
    head = '<div class="mh"><b>%s</b> <span class="sz">%s</span></div>' % (esc(mi.get("size_label") or model), esc(size_text(mi)))
    tag = '<div class="tag">%s%s</div>' % (esc(model), "" if think == "off" else " · thinking on")
    if not c:
        return '<div class="card nodata t-%s">%s%s<div class="badge none">not run yet</div></div>' % (think, head, tag)
    rec, out = c["rec"], c["out"]
    b, txt = badge(rec, item_id)
    flags = ""
    if out.get("truncated"):
        flags += ' <span class="flag">answer cut off at the token limit</span>'
    if out.get("error") and out.get("turns"):
        flags += ' <span class="flag">error: %s</span>' % esc(str(out["error"])[:80])
    ans = answer_html(out)
    return '<div class="card t-%s">%s%s<div class="badge %s">%s</div>%s%s</div>' % (think, head, tag, b, esc(txt), flags, ans)


def fam_sorted(minfo, models):
    fams = defaultdict(list)
    for m in models:
        fams[minfo[m].get("family", "Other")].append(m)
    order = [f for f in FAMILY_ORDER if f in fams] + sorted(f for f in fams if f not in FAMILY_ORDER)
    return [(f, sorted(fams[f], key=lambda m: (minfo[m].get("params_b") or 0, m))) for f in order]


def summary_table(part_items, minfo, cells, fams, think, ops):
    rows = []
    for fam, models in fams:
        tds, any_data = [], False
        for m in models:
            recs = [cells[(m, think, i)]["rec"] for i in part_items if (m, think, i) in cells]
            if not recs:
                tds.append('<td class="none"><b>%s</b><br>not run yet</td>' % esc(minfo[m].get("size_label")))
                continue
            any_data = True
            pts = [p for p in (points(r) for r in recs) if p is not None]
            if not pts:
                tds.append('<td class="none"><b>%s</b><br>not judged yet</td>' % esc(minfo[m].get("size_label")))
                continue
            mean = sum(pts) / len(pts)
            if ops:
                passed = sum(1 for r in recs if r.get("status") == "pass")
                txt = "%d of %d passed" % (passed, len(recs))
            else:
                txt = "%d%% (%d of %d judged)" % (round(100 * mean), len(pts), len(part_items))
            tds.append('<td class="%s"><b>%s</b><br>%s</td>' % (band(mean), esc(minfo[m].get("size_label")), esc(txt)))
        if any_data:
            rows.append("<tr><th scope='row'>%s</th>%s</tr>" % (esc(fam), "".join(tds)))
    if not rows:
        return "<p>No data for this view yet.</p>"
    return '<div class="scroll"><table class="sum">%s</table></div>' % "".join(rows)


def item_block(item, ids_models, minfo, cells, think_modes):
    it = item
    prompt = "\n\n".join(it["turns"]) if len(it["turns"]) == 1 else "\n\n".join("Turn %d: %s" % (i + 1, t) for i, t in enumerate(it["turns"]))
    exp = ""
    if it.get("expected_words"):
        exp = '<p class="exp"><b>Expected answer (the words, read down the columns):</b> %s</p>' % esc(" ".join(it["expected_words"]))
    elif it.get("expected"):
        exp = '<p class="exp"><b>Input:</b> <code>%s</code><br><b>Expected answer (reversed):</b> <code>%s</code></p>' % (esc(it.get("input")), esc(it["expected"]))
    out = ['<section class="item"><h3>%s</h3><details open class="prompt"><summary>Prompt</summary><pre>%s</pre></details>%s' % (esc(it["id"]), esc(prompt), exp)]
    for think in ("off", "on"):
        fam_html = []
        for fam, models in ids_models:
            have = [m for m in models if (m, think, it["id"]) in cells]
            if think == "on" and not have:
                continue
            cards = "".join(cell_html(m, minfo[m], think, it["id"], cells.get((m, think, it["id"]))) for m in models
                            if think == "off" or (m, think, it["id"]) in cells)
            fam_html.append('<div class="fam"><h4>%s</h4><div class="grid">%s</div></div>' % (esc(fam), cards))
        out.append('<div class="mode m-%s">%s</div>' % (think, "".join(fam_html)))
    out.append("</section>")
    return "".join(out)


CSS = """
body{font:19px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;margin:0 auto;padding:16px;max-width:1500px;color:#111;background:#fff}
h1{font-size:1.6em;margin:.2em 0}h2{font-size:1.4em;margin-top:1.6em;border-bottom:3px solid #223;padding-bottom:4px}h3{font-size:1.2em;margin:.2em 0}h4{margin:.6em 0 .3em;font-size:1em;color:#223}
.meta{color:#444;font-size:.8em}.ctl{margin:12px 0;padding:8px 12px;background:#eef;border-radius:6px}.ctl label{margin-right:18px;cursor:pointer}
.scroll{overflow-x:auto}table.sum{border-collapse:collapse;margin:6px 0 14px}table.sum td,table.sum th{border:1px solid #bbb;padding:5px 9px;text-align:center;font-size:.85em;white-space:nowrap}
table.sum th{text-align:left;background:#f1f1f1}
.pass{background:#bfe8bf}.partial{background:#ffe39a}.fail{background:#f4b4b4}.none{background:#eee;color:#555}
section.item{border:1px solid #ccc;border-radius:8px;padding:10px 14px;margin:18px 0}
pre{white-space:pre-wrap;word-break:break-word;font:15px/1.4 ui-monospace,Menlo,Consolas,monospace;background:#f6f6f6;padding:8px;margin:6px 0;border-radius:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.card{border:1px solid #bbb;border-radius:6px;padding:8px;background:#fff;min-width:0}.card.nodata{background:#fafafa;color:#777}
.mh{font-size:1em}.sz{color:#333;font-size:.8em}.tag{font-size:.7em;color:#666}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.85em;margin:4px 0;font-weight:600}
.flag{color:#a00;font-size:.8em}.turnq{font-size:.8em;color:#444;margin-top:6px;font-style:italic}
pre.ans.fold{max-height:17em;overflow:hidden}pre.ans.fold.open{max-height:none}button.more{font:inherit;font-size:.8em;padding:2px 10px;cursor:pointer}
.exp{background:#fff8e1;padding:6px 10px;border-radius:4px;margin:6px 0}code{font:15px ui-monospace,Menlo,monospace}
.mode.m-on{display:none}body.think-on .mode.m-on{display:block}body.think-on .mode.m-off{display:none}
.sumbox.s-on{display:none}body.think-on .sumbox.s-on{display:block}body.think-on .sumbox.s-off{display:none}
summary{cursor:pointer;font-weight:600}
@media (max-width:600px){body{font-size:17px;padding:8px}.grid{grid-template-columns:1fr}}
"""

JS = """
document.addEventListener('click',function(e){var b=e.target.closest('button.more');if(b){var p=b.previousElementSibling;
var o=p.classList.toggle('open');b.textContent=o?'Show less':'Show all';}});
document.querySelectorAll('input[name=think]').forEach(function(r){r.addEventListener('change',function(){
document.body.classList.toggle('think-on',document.querySelector('input[name=think]:checked').value==='on');});});
"""


def build(run_dir):
    man, items, minfo, cells = load_run(run_dir)
    run_models = sorted({m for (m, _, _) in cells})
    manifest_models = [m["tag"] for m in man.get("models", [])]
    # models shown: everything in the manifest plus anything with output (so unrun ones read "not run yet")
    shown = list(dict.fromkeys(manifest_models + run_models))
    shown = [m for m in shown if m in minfo]
    fams = fam_sorted(minfo, shown)
    n_models = len(run_models)
    n_on = len({m for (m, t, _) in cells if t == "on"})
    n_items = len({i for (_, _, i) in cells if i in KNOWLEDGE + OPERATIONS})
    parts = [("Knowledge", KNOWLEDGE, False), ("Mental operations", OPERATIONS, True)]

    body = ["<h1>Model size: knowledge and mental operations</h1>",
            '<p class="meta">Run %s · Ollama %s · %d models with outputs (%d with thinking on) · %d of %d showcase items have at least one answer · answers only, thinking text is not shown · judged items are scored by %s (self-judged where that model answers).</p>' % (
                esc(man.get("run_id")), esc(man.get("ollama_version")), n_models, n_on, n_items, len(KNOWLEDGE + OPERATIONS), esc(man.get("judge_model"))),
            '<div class="ctl"><b>Thinking:</b> <label><input type="radio" name="think" value="off" checked> off, or not available (default)</label>'
            '<label><input type="radio" name="think" value="on"> on (only models that have it)</label></div>']
    body.append("<h2>Summary</h2>")
    body.append("<p class='meta'>One row per model family, smallest to largest. Colour: green high, amber middle, red low, grey no score yet. "
                "Knowledge cells are the mean of the judged items (%s). Operations cells count exact passes (%s).</p>" % (", ".join(KNOWLEDGE), ", ".join(OPERATIONS)))
    for name, ids, ops in parts:
        body.append("<h3>%s</h3>" % name)
        for think in ("off", "on"):
            body.append('<div class="sumbox s-%s">%s</div>' % (think, summary_table(ids, minfo, cells, fams, think, ops)))
    for name, ids, ops in parts:
        body.append("<h2>%s</h2>" % name)
        for i in ids:
            body.append(item_block(items[i], fams, minfo, cells, ("off", "on")))
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            "<title>Model size showcase %s</title><style>%s</style></head><body class=\"think-off\">%s<script>%s</script></body></html>") % (
        esc(man.get("run_id")), CSS, "".join(body), JS)
    return page, {"models": n_models, "think_on_models": n_on, "items": n_items}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-dir", required=True)
    ap.add_argument("--out", default="showcase.html")
    a = ap.parse_args()
    page, st = build(a.run_dir.rstrip("/"))
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(page)
    print("wrote %s (%d bytes); %s" % (a.out, len(page), st))


if __name__ == "__main__":
    main()
