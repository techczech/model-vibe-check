#!/usr/bin/env python3
"""Spark open-model vibe-check runner: generation pass + judge pass. Python 3 stdlib only.
Resumable: existing outputs/judgements without error are skipped."""
import glob, urllib.parse, argparse, datetime, fnmatch, hashlib, json, os, subprocess, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import score as scoremod  # noqa: E402

HOST = os.environ.get("OLLAMA_HOST_URL", "http://localhost:11434")
SEED = 20261101
GEN_OPTS = {"temperature": 0.6, "seed": SEED, "num_ctx": 16384, "num_predict": 8192}  # think off / n-a
GEN_OPTS_THINK = {"temperature": 0.6, "seed": SEED, "num_ctx": 24576, "num_predict": 16384}  # think on
JUDGE_OPTS = {"temperature": 0, "seed": SEED, "num_ctx": 16384, "num_predict": 2048}
CALL_TIMEOUT = 900


def http(path, payload=None, timeout=CALL_TIMEOUT):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(HOST + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def slug(s):
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in s.replace(":", "_"))


def fname(model, think, item):
    return "%s__%s__%s.json" % (slug(model), think, item)


def write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def matches(name, pats):
    return not pats or any(fnmatch.fnmatch(name, p) for p in pats)


# ---------- generation ----------
def gen_item(model, think, item, run_id, can_think):
    msgs, turns = [], []
    err, truncated = None, False
    t0 = time.time()
    for u in item["turns"]:
        msgs.append({"role": "user", "content": u})
        opts = GEN_OPTS_THINK if think == "on" else GEN_OPTS
        body = {"model": model, "messages": msgs, "stream": False, "options": opts}
        if can_think:
            body["think"] = (think == "on")
        t1 = time.time()
        try:
            r = http("/api/chat", body)
        except Exception as e:  # noqa
            err = "%s: %s" % (type(e).__name__, e)
            break
        m = r.get("message", {})
        ans = m.get("content", "") or ""
        dr = r.get("done_reason")
        truncated = truncated or dr == "length"
        turns.append({"user": u, "thinking": m.get("thinking", "") or "", "answer": ans, "done_reason": dr,
                      "eval_count": r.get("eval_count"), "prompt_eval_count": r.get("prompt_eval_count"),
                      "eval_duration_ns": r.get("eval_duration"), "prompt_eval_duration_ns": r.get("prompt_eval_duration"),
                      "load_duration_ns": r.get("load_duration"), "total_duration_ns": r.get("total_duration"),
                      "thinking_chars": len(m.get("thinking", "") or ""), "answer_chars": len(ans or ""),
                      "gen_tok_per_s": (round(r["eval_count"] / (r["eval_duration"] / 1e9), 2) if r.get("eval_count") and r.get("eval_duration") else None),
                      "wall_s": round(time.time() - t1, 2)})
        msgs.append({"role": "assistant", "content": ans})
    return {"run_id": run_id, "model": model, "think": think, "item": item["id"], "options": GEN_OPTS_THINK if think == "on" else GEN_OPTS,
            "turns": turns, "truncated": truncated, "error": err, "wall_s": round(time.time() - t0, 2)}



# ---------- Wikipedia lookups (reproducible check for off-checklist names) ----------
UA = {"User-Agent": "model-vibe-check-spark-bench/1.0 (research; contact: dominik)"}


def wget(url, timeout=30):
    err = None
    for k in range(6):
        time.sleep(0.7)  # be polite: Wikipedia rate-limits (429)
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa
            err = e
            time.sleep(3 * 2 ** k)
    raise err


def title_ok(title, name):
    nt = [t.rstrip(".") for t in scoremod.norm(name).replace(",", " ").split() if t]
    tt = set(t for t in scoremod.norm(title.split("(")[0]).replace(",", " ").split() if t)
    if not nt:
        return False
    sur, given = nt[-1], nt[:-1]
    if sur not in tt:
        return False
    return not given or any(g in tt for g in given)


def wiki_lookup(name):
    """Search cs then en Wikipedia; returns dict (found False => no page). Raises on network failure."""
    nt = name.split()
    queries = [name] + ([nt[0] + " " + nt[-1]] if len(nt) > 2 else [])
    for lang in ("cs", "en"):
        base = "https://%s.wikipedia.org/w/api.php" % lang
        for q in queries:
            r = wget(base + "?action=query&list=search&format=json&srlimit=5&srsearch=" + urllib.parse.quote(q))
            for h in r["query"]["search"]:
                if title_ok(h["title"], name):
                    pid = h["pageid"]
                    d = wget(base + "?action=query&format=json&prop=extracts|info&exintro=1&explaintext=1&pageids=%d" % pid)
                    pg = d["query"]["pages"][str(pid)]
                    ext = (pg.get("extract") or "").strip().split("\n\n")[0][:1500]
                    return {"name": name, "found": True, "lang": lang, "title": pg["title"], "pageid": pid,
                            "revid": pg.get("lastrevid"), "extract": ext}
    return {"name": name, "found": False}


def load_cache(run_dir):
    p = os.path.join(run_dir, "wikipedia-lookups.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}


def lookup_names(run_dir, names):
    """Fill the run's lookup cache; returns (cache, failed_names)."""
    cache = load_cache(run_dir)
    failed = []
    for n in names:
        k = scoremod.norm(n)
        if k in cache:
            continue
        try:
            e = wiki_lookup(n)
            e["looked_up"] = datetime.datetime.now().isoformat(timespec="seconds")
            cache[k] = e
            write_json(os.path.join(run_dir, "wikipedia-lookups.json"), cache)
        except Exception as ex:  # noqa
            failed.append(n)
            print("  lookup failed for %s: %s" % (n, ex), flush=True)
    return cache, failed




def judge_revival(judge, item, out, conv, res, prev, run_dir, lookup):
    base = "You are a strict, concise grader. Reply only with JSON matching the schema. "
    people = scoremod.load_checklist()
    ex = (prev or {}).get("extract")
    if ex is None:
        ex, e1 = judge_call(judge, base + "List every distinct person named in the answer as a normalised full name in nominative "
                            "(Czech diacritics kept, no titles). Return a deduplicated canonical list: the same person under two name "
                            "forms (e.g. with and without a middle given name) appears once, under the fullest form. "
                            "Do not add people who are not named.", conv, EXTRACT_SCHEMA)
        if not e1 and not (ex or {}).get("people"):  # empty list from the judge: retry once with a plainer prompt
            ex, e1 = judge_call(judge, base + "Extract the names of all people mentioned in the answer text. "
                                "One entry per person, in nominative, no titles. There is usually at least one.", conv, EXTRACT_SCHEMA)
            res["extract_retry"] = True
        if e1:
            res["extract"] = ex
            res["error"] = e1
            return res
    res["extract"] = ex
    _, off = scoremod.revival_names(ex, people)
    res["off_checklist"] = off
    cache, failed = lookup_names(run_dir, off) if lookup else (load_cache(run_dir), off)
    cls = []
    for n in off:
        e = cache.get(scoremod.norm(n))
        if e is None:
            continue
        if not e["found"]:
            cls.append({"name": n, "verdict": "fabricated_or_obscure", "wiki": None})
            continue
        j, err = judge_call(judge, base + "A model named the person below as a figure of the Czech National Revival (c. 1775-1848). "
                            "Using ONLY the Wikipedia intro given, decide: revival_figure (the person was an active participant in the Czech "
                            "National Revival: writers, philologists, historians, scientists, activists of that period) or "
                            "other_period_or_role (a real person from another period or with an unrelated role).",
                            "Name: %s\nWikipedia (%s) %s:\n%s" % (n, e["lang"], e["title"], e["extract"]), VERDICT_SCHEMA)
        w = {k: e[k] for k in ("lang", "title", "pageid", "revid")}
        if err or not j:
            res["error"] = err or "no verdict"
            continue
        cls.append({"name": n, "verdict": j["verdict"], "note": j.get("note"), "wiki": w})
    res["classify"] = cls
    if failed:
        res["error"] = "lookup pending: " + "; ".join(failed)
    return res

# ---------- judging ----------
def S(props, req=None):
    return {"type": "object", "properties": props, "required": req or list(props)}


INT, STR = {"type": "integer"}, {"type": "string"}
SCHEMAS = {
    "novel-sentence": S({"grammatical": INT, "meaningful": INT, "novelty": INT, "note": STR}),
    "rilke": S({"translation_given": STR, "modal_correct": INT, "quality": INT, "note": STR}),
    "coherence": S({"masaryk_named": INT, "benes_named": INT, "referent_kept": INT, "factual_errors": INT,
                    "language_matches": INT, "note": STR}),
    "pos": S({"stated_count": INT, "categories_listed": {"type": "array", "items": STR}, "reference_matched": INT,
              "wrong_examples": INT, "answer_in_czech": INT, "note": STR}),
    "totiz": S({"sentences": INT, "uses_covered": {"type": "array", "items": {"type": "string", "enum": ["explanatory", "causal", "corrective"]}},
                "unnatural": INT, "quality": INT, "note": STR}),
}
CLASSIFY_SCHEMA = S({"classifications": {"type": "array", "items": S({"name": STR, "class": {"type": "string",
                     "enum": ["real_revival_figure", "real_wrong_period_or_role", "fabricated"]}, "note": STR})}})
VERDICT_SCHEMA = S({"verdict": {"type": "string", "enum": ["revival_figure", "other_period_or_role"]}, "note": STR})
EXTRACT_SCHEMA = S({"people": {"type": "array", "items": S({"name": STR})}})

RUBRICS = {
    "novel-sentence": "Rate ONE sentence written by a model asked to write a sentence nobody has ever said before. "
        "grammatical: 1 if grammatical in its language, else 0. meaningful: 1 if it makes sense, else 0. "
        "novelty: 0 = a known phrase or cliche, 1 = unremarkable but probably unsaid, 2 = clearly original wording. "
        "You cannot verify that a sentence was never said; judge plausibility only and say so in note.",
    "rilke": "The prompt asks to translate the title of Rilke's poem 'Du mußt das Leben nicht verstehen'. In German 'nicht müssen' "
        "means 'need not' (Czech 'nemusíš'), NOT 'must not' (Czech 'nesmíš'). modal_correct: 1 if the translation of the title gets this "
        "right, 0 if it says must not / nesmíš or gives no translation. quality: 0 = poor or wrong, 1 = acceptable, 2 = good and natural "
        "in the target language. translation_given: the title translation the answer offers (empty if none).",
    "coherence": "The answer is a four-turn conversation about Czechoslovakia (turn 1 capital; turn 2 first president = Tomas Garrigue Masaryk; "
        "turn 3 his successor = Edvard Benes; turn 4 how the country changed). masaryk_named: 1 if turn 2 names Masaryk. benes_named: 1 if turn 3 "
        "names Benes. referent_kept: 1 if turns 3 and 4 keep the referent (successor of the first president; the country in question) without "
        "drifting. factual_errors: number of clear factual errors across turns. language_matches: 1 if every answer is in the language of the "
        "prompts (%LANG%).",
    "pos": "The prompt asks how many parts of speech Czech has, with a list and examples. The reference answer is 10: podstatná jména, "
        "přídavná jména, zájmena, číslovky, slovesa, příslovce, předložky, spojky, částice, citoslovce. stated_count: the number the answer "
        "states (-1 if none). categories_listed: the category names given. reference_matched: how many of the 10 reference categories the "
        "answer lists (any language, same meaning). wrong_examples: count of examples that are wrong for their category or not Czech. "
        "answer_in_czech: 1 if the answer is written in Czech.",
    "totiz": "The prompt asks for 10 Czech (or about Czech) sentences illustrating uses of the word 'totiž'. sentences: number of sentences "
        "given with the word. uses_covered: which of these distinct uses are illustrated: explanatory (namely / that is), causal (you see / because), "
        "corrective (or rather / actually / specifying). unnatural: count of sentences that are unnatural or ungrammatical Czech or misuse totiž "
        "(note totiž is never sentence-initial). quality: 0 = poor, 1 = weak, 2 = good, 3 = excellent overall.",
}


def fmt_conv(item, out, limit=12000):
    parts = []
    for i, t in enumerate(out["turns"], 1):
        parts.append("[USER %d]\n%s\n[ANSWER %d]\n%s" % (i, t["user"], i, t["answer"][:limit]))
    return "\n\n".join(parts)


def judge_call(judge, system, user, schema):
    body = {"model": judge, "stream": False, "think": False, "format": schema, "options": JUDGE_OPTS,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    last = None
    for _ in range(2):
        try:
            r = http("/api/chat", body)
            return json.loads(r["message"]["content"]), None
        except Exception as e:  # noqa
            last = "%s: %s" % (type(e).__name__, e)
    return None, last


def judge_one(judge, item, out, prev=None, run_dir=None, lookup=True):
    test = item["test"]
    base = "You are a strict, concise grader. Reply only with JSON matching the schema. "
    conv = fmt_conv(item, out)
    res = {"judge_model": judge, "options": JUDGE_OPTS, "model": out["model"], "think": out["think"], "item": item["id"]}
    if not any(t["answer"].strip() for t in out["turns"]):
        res.update(result=None, error="empty answer")
        return res
    if test == "revival":
        return judge_revival(judge, item, out, conv, res, prev, run_dir, lookup)
    rub = RUBRICS[test].replace("%LANG%", item["lang"])
    j, e = judge_call(judge, base + rub, conv, SCHEMAS[test])
    res["result"] = j
    if e:
        res["error"] = e
    return res


# ---------- main ----------
def git_commit():
    try:
        return subprocess.check_output(["git", "-C", HERE, "rev-parse", "HEAD"], stderr=subprocess.DEVNULL).decode().strip()
    except Exception:  # noqa
        p = os.path.join(HERE, "COMMIT")
        return open(p).read().strip() if os.path.exists(p) else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run-id")
    ap.add_argument("--models", help="comma-separated tags or globs")
    ap.add_argument("--items", help="comma-separated item ids or globs")
    ap.add_argument("--phase", choices=["gen", "judge", "lookup", "all"], default="all")
    ap.add_argument("--no-lookup", action="store_true", help="judge pass: do not hit Wikipedia (use cached lookups only)")
    ap.add_argument("--think", help="comma-separated think modes to run: on,off,na (default all)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    run_id = a.run_id or "spark-" + datetime.datetime.now().strftime("%Y%m%d-%H%M")
    mpat = a.models.split(",") if a.models else None
    ipat = a.items.split(",") if a.items else None

    if a.phase == "lookup":
        rd = os.path.join(HERE, "runs", run_id)
        people = scoremod.load_checklist()
        names = []
        for f in sorted(glob.glob(os.path.join(rd, "judgements", "*.json"))):
            j = json.load(open(f, encoding="utf-8"))
            if j.get("extract"):
                names += scoremod.revival_names(j["extract"], people)[1]
        names = sorted(set(names))
        cache, failed = lookup_names(rd, names)
        print("lookup: %d names, %d failed, cache %d entries" % (len(names), len(failed), len(cache)))
        return

    cfg = json.load(open(os.path.join(HERE, "models.json"), encoding="utf-8"))
    judge = cfg["judge_model"]
    pack = json.load(open(os.path.join(HERE, "pack.json"), encoding="utf-8"))
    items = [i for i in pack["items"] if matches(i["id"], ipat)]
    items_by_id = {i["id"]: i for i in pack["items"]}
    tags = {m["name"]: m for m in http("/api/tags", timeout=30)["models"]}
    version = http("/api/version", timeout=30).get("version")
    run_dir = os.path.join(HERE, "runs", run_id)
    od, jd = os.path.join(run_dir, "outputs"), os.path.join(run_dir, "judgements")

    models = []
    for m in cfg["models"]:
        if not matches(m["tag"], mpat):
            continue
        t = tags.get(m["tag"])
        if not t:
            print("SKIP (not installed): %s" % m["tag"])
            continue
        caps = http("/api/show", {"model": m["tag"]}, timeout=60).get("capabilities", [])
        models.append(dict(m, digest=t.get("digest"), capabilities=caps))

    plan = []
    for m in models:
        for think in (["on", "off"] if "thinking" in m["capabilities"] else ["na"]):
            if a.think and think not in a.think.split(","):
                continue
            for it in items:
                plan.append((m, think, it))
    todo = [p for p in plan if not (os.path.exists(os.path.join(od, fname(p[0]["tag"], p[1], p[2]["id"]))) and
            not json.load(open(os.path.join(od, fname(p[0]["tag"], p[1], p[2]["id"])))).get("error"))]
    print("run %s: %d models, %d items, %d generations planned, %d to do" % (run_id, len(models), len(items), len(plan), len(todo)))
    if a.dry_run:
        for m, th, it in todo:
            print("  gen  %s think=%s %s" % (m["tag"], th, it["id"]))
        n_j = sum(1 for m, th, it in plan if it["scoring"] != "auto")
        print("  judge pass would cover up to %d outputs with %s" % (n_j, judge))
        return

    os.makedirs(od, exist_ok=True)
    os.makedirs(jd, exist_ok=True)
    mp = os.path.join(run_dir, "manifest.json")
    man = json.load(open(mp)) if os.path.exists(mp) else {}
    known = {x["tag"]: x for x in man.get("models", [])}
    for m in models:
        known[m["tag"]] = {k: m[k] for k in ("tag", "family", "generation", "size_label", "params_b", "role", "arch", "active_params_b", "digest", "capabilities")}
    jt = tags.get(judge, {})
    man.update(run_id=run_id, ollama_version=version, pack_version=pack["pack_version"],
               pack_sha256=hashlib.sha256(open(os.path.join(HERE, "pack.json"), "rb").read()).hexdigest(),
               gen_options={"think_off_or_na": GEN_OPTS, "think_on": GEN_OPTS_THINK}, judge_model=judge, judge_digest=jt.get("digest"), judge_options=JUDGE_OPTS,
               runner_commit=git_commit(), call_timeout_s=CALL_TIMEOUT, models=list(known.values()),
               updated=datetime.datetime.now().isoformat(timespec="seconds"))
    write_json(mp, man)

    if a.phase in ("gen", "all"):
        k = 0
        for m, think, it in todo:
            k += 1
            t0 = time.time()
            out = gen_item(m["tag"], think, it, run_id, think != "na")
            out["digest"], out["ollama_version"] = m["digest"], version
            write_json(os.path.join(od, fname(m["tag"], think, it["id"])), out)
            print("[%d/%d] %s think=%s %s %.0fs%s%s" % (k, len(todo), m["tag"], think, it["id"], time.time() - t0,
                  " TRUNC" if out["truncated"] else "", " ERR " + out["error"] if out["error"] else ""), flush=True)

    if a.phase in ("judge", "all"):
        files = sorted(f for f in os.listdir(od) if f.endswith(".json"))
        jt_todo = []
        for f in files:
            out = json.load(open(os.path.join(od, f), encoding="utf-8"))
            it = items_by_id.get(out["item"])
            if not it or it["scoring"] == "auto" or not matches(it["id"], ipat):
                continue
            if mpat and not matches(out["model"], mpat):
                continue
            jp = os.path.join(jd, f)
            if out.get("error") and not out.get("turns"):
                continue
            prev = json.load(open(jp, encoding="utf-8")) if os.path.exists(jp) else None
            if prev and not prev.get("error"):
                continue
            jt_todo.append((f, out, it, prev))
        print("judge pass: %d to do with %s" % (len(jt_todo), judge))
        for k, (f, out, it, prev) in enumerate(jt_todo, 1):
            t0 = time.time()
            res = judge_one(judge, it, out, prev, run_dir, not a.no_lookup)
            write_json(os.path.join(jd, f), res)
            print("[judge %d/%d] %s %s %s %.0fs%s" % (k, len(jt_todo), out["model"], out["think"], it["id"], time.time() - t0,
                  " ERR " + res["error"] if res.get("error") else ""), flush=True)

    n = scoremod.score_run(run_dir)
    print("scores.jsonl: %d rows" % n)


if __name__ == "__main__":
    main()
