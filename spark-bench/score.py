#!/usr/bin/env python3
"""Auto scores plus judge-JSON combination. Writes <run>/scores.jsonl.
Usage: python3 score.py runs/<run-id>"""
import json, os, re, sys, glob, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))


def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower()


def words_of(s):
    return [w for w in re.split(r"[^0-9a-zA-Z.]+", norm(s)) if w]


def clean_word(w):
    return re.sub(r"[^0-9a-z]", "", norm(w))


# ---------- auto scorers ----------
def score_vertical(item, answer):
    exp = [clean_word(w) for w in item["expected_words"][:item.get("score_first_n") or None]]
    toks = [clean_word(t) for t in re.split(r"\s+", answer) if clean_word(t)]
    pos = hit = 0
    for e in exp:
        try:
            j = toks.index(e, pos)
        except ValueError:
            continue
        hit += 1
        pos = j + 1
    frac = hit / len(exp) if exp else 0
    return {"fraction": round(frac, 4), "matched": hit, "expected": len(exp), "exact_all": hit == len(exp)}


def score_reverse(item, answer):
    exp = item["expected"]
    lines = [l for l in answer.splitlines() if l.strip()]
    last = lines[-1].strip().strip("`'\"“”‘’ ").strip() if lines else ""
    return {"exact": last == exp, "contains": exp in answer, "got": last}


def rilke_precheck(answer):
    a = answer.lower()
    return bool(re.search(r"must not|mustn't|nesmíš|nesmis", a))


def coherence_turn1(item, answer):
    ws = [w for w in re.split(r"\s+", answer.strip()) if clean_word(w)]
    one = len(ws) == 1
    ok = bool(re.search(r"\b(prague|praha|praze|prahu)\b", norm(answer)))
    return {"turn1_one_word": one, "turn1_prague": ok}


# ---------- revival matching ----------
_CL = {}


def _cl():
    if not _CL:
        _CL.update(json.load(open(os.path.join(HERE, "revival-checklist.json"), encoding="utf-8")))
    return _CL


def load_checklist():
    return _cl()["people"]


def primary_for(sur, people):
    """Bare ambiguous surname -> index of the primary person (checklist map), else None."""
    for k, full in _cl().get("bare_surname_primary", {}).items():
        if norm(k) == sur:
            for i, p in enumerate(people):
                if p["name"] == full:
                    return i
    return None


def match_person(name, people):
    """Return index of checklist person or None. Diacritic-insensitive; surname + given/initial."""
    toks = [t for t in re.split(r"[\s,]+", norm(name).replace(".", ". ")) if t]
    if not toks:
        return None
    toks = [t for t in toks if t not in ("dr", "dr.", "prof", "prof.", "pan")]
    if not toks:
        return None
    # Handle "Surname, Given" by trying both ends as surname
    cands = []
    for sur_i in (len(toks) - 1, 0):
        sur = toks[sur_i].rstrip(".")
        given = [t.rstrip(".") for k, t in enumerate(toks) if k != sur_i]
        same = [i for i, p in enumerate(people) if norm(p["surname"]) == sur]
        if not same:
            continue
        ok = []
        for i in same:
            pg = [norm(g) for g in people[i]["given"]]
            if all(any(g == x or (len(g) == 1 and x.startswith(g)) for x in pg) for g in given):
                ok.append(i)
        if len(same) == 1:
            return ok[0] if ok else None
        if given and len(ok) == 1:
            return ok[0]
        if given and ok:  # e.g. "Karel Thám" fine; ambiguous remaining
            return None
        return primary_for(sur, people)  # bare ambiguous surname -> primary person
    return None


def dedupe_off(names):
    """Merge off-checklist names with the same surname and overlapping given names
    (a bare surname merges into a unique same-surname group). Returns canonical (longest) names."""
    groups = []  # dict(sur, given:set, name)
    for n in names:
        toks = [t.rstrip(".") for t in re.split(r"[\s,]+", norm(n)) if t]
        if not toks:
            continue
        sur, given = toks[-1], set(toks[:-1])
        for g in groups:
            if g["sur"] == sur and (not given or not g["given"] or given & g["given"]):
                g["given"] |= given
                if len(n) > len(g["name"]):
                    g["name"] = n
                break
        else:
            groups.append({"sur": sur, "given": set(given), "name": n})
    return [g["name"] for g in groups]


def revival_names(extract, people):
    """Returns (matched {idx: name}, canonical off-checklist names)."""
    names, seen = [], set()
    for p in (extract or {}).get("people", []):
        n = (p.get("name") or "").strip()
        if n and norm(n) not in seen:
            seen.add(norm(n))
            names.append(n)
    matched, off = {}, []
    for n in names:
        i = match_person(n, people)
        if i is None:
            off.append(n)
        else:
            matched.setdefault(i, n)
    return matched, dedupe_off(off)


def revival_metrics(extract, classify, people):
    matched, off = revival_names(extract, people)
    cls = {norm(c.get("name", "")): c.get("verdict") for c in (classify or [])}
    rev = fab = other = unclassified = 0
    for n in off:
        c = cls.get(norm(n))
        if c == "revival_figure":
            rev += 1
        elif c == "fabricated_or_obscure":
            fab += 1
        elif c == "other_period_or_role":
            other += 1
        else:
            unclassified += 1
    missing = [p["name"] for i, p in enumerate(people) if i not in matched]
    return {"named": len(matched) + len(off), "on_checklist": len(matched), "correct": len(matched) + rev,
            "revival_off_checklist": rev, "fabricated_or_obscure": fab, "other_period_or_role": other,
            "unclassified": unclassified, "missing_key": len(missing), "recall": round(len(matched) / len(people), 4),
            "matched_names": [people[i]["name"] for i in sorted(matched)], "missing_names": missing,
            "off_checklist": off}


# ---------- combine ----------
def b(x):
    return 1 if x in (1, True) else 0


def num(x, default=0):
    try:
        return float(x)
    except Exception:
        return default


def score_record(out, item, judgement, judge_tag, people):
    turns = out.get("turns", [])
    answer = turns[-1].get("answer", "") if turns else ""
    m, head, label = {}, None, ""
    test = item["test"]
    if test == "vertical":
        m = score_vertical(item, answer)
        head, label = m["fraction"], "%d/%d%s" % (m["matched"], m["expected"], " ✓" if m["exact_all"] else "")
    elif test == "reverse":
        m = score_reverse(item, answer)
        head, label = (1.0 if m["exact"] else 0.0), ("✓" if m["exact"] else ("~" if m["contains"] else "✗"))
    else:
        j = (judgement or {}).get("result")
        if test == "novel-sentence":
            if j:
                m = {"grammatical": b(j.get("grammatical")), "meaningful": b(j.get("meaningful")), "novelty": num(j.get("novelty"))}
                head = (m["grammatical"] + m["meaningful"] + m["novelty"] / 2) / 3
                label = "G%d M%d N%d" % (m["grammatical"], m["meaningful"], m["novelty"])
        elif test == "rilke":
            m = {"precheck_must_not": rilke_precheck(answer)}
            if j:
                m.update(modal_correct=b(j.get("modal_correct")), quality=num(j.get("quality")))
                head = (m["modal_correct"] + m["quality"] / 2) / 2
                label = ("OK" if m["modal_correct"] else "modal ✗") + " q%d" % m["quality"]
            elif m["precheck_must_not"]:
                label = "must-not?"
        elif test == "coherence":
            m = coherence_turn1(item, turns[0].get("answer", "") if turns else "")
            if j:
                m.update(masaryk=b(j.get("masaryk_named")), benes=b(j.get("benes_named")), referent_kept=b(j.get("referent_kept")),
                         factual_errors=num(j.get("factual_errors")), language_matches=b(j.get("language_matches")))
                parts = [b(m["turn1_one_word"]), b(m["turn1_prague"]), m["masaryk"], m["benes"], m["referent_kept"], m["language_matches"]]
                head = max(0.0, sum(parts) / 6 - 0.1 * m["factual_errors"])
                label = "%d/6 err%d" % (sum(parts), m["factual_errors"])
        elif test == "pos":
            if j:
                sc = num(j.get("stated_count"), -1)
                m = {"stated_count": sc, "is_10": sc == 10, "reference_matched": num(j.get("reference_matched")),
                     "wrong_examples": num(j.get("wrong_examples")), "answer_in_czech": b(j.get("answer_in_czech"))}
                head = ((1 if m["is_10"] else 0) + min(m["reference_matched"], 10) / 10 + m["answer_in_czech"]) / 3
                label = "n=%d ref%d w%d" % (sc, m["reference_matched"], m["wrong_examples"])
        elif test == "totiz":
            if j:
                uses = j.get("uses_covered") or []
                m = {"sentences": num(j.get("sentences")), "uses_covered": len(set(uses)), "unnatural": num(j.get("unnatural")), "quality": num(j.get("quality"))}
                head = (min(m["uses_covered"], 3) / 3 + m["quality"] / 3 + (1 if m["sentences"] == 10 else 0) + max(0, 1 - m["unnatural"] / 10)) / 4
                label = "s%d u%d bad%d q%d" % (m["sentences"], m["uses_covered"], m["unnatural"], m["quality"])
        elif test == "revival":
            if judgement and judgement.get("extract") is not None and not judgement.get("error"):
                m = revival_metrics(judgement["extract"], judgement.get("classify"), people)
                head = m["recall"]
                label = "%d/%d fab%d" % (m["on_checklist"], len(people), m["fabricated_or_obscure"])
    return {"run_id": out.get("run_id"), "model": out["model"], "think": out["think"], "item": item["id"], "test": test,
            "lang": item["lang"], "scoring": item["scoring"], "truncated": bool(out.get("truncated")),
            "error": out.get("error"), "judged": bool(judgement and not judgement.get("error")),
            "judge_error": (judgement or {}).get("error"),
            "self_judged": bool(judgement) and out["model"] == judge_tag, "metrics": m,
            "headline": None if head is None else round(head, 4), "label": label}


def score_run(run_dir):
    pack = json.load(open(os.path.join(HERE, "pack.json"), encoding="utf-8"))
    items = {i["id"]: i for i in pack["items"]}
    manifest = {}
    mp = os.path.join(run_dir, "manifest.json")
    if os.path.exists(mp):
        manifest = json.load(open(mp))
    judge_tag = manifest.get("judge_model", "gemma4:31b")
    people = load_checklist()
    n = 0
    with open(os.path.join(run_dir, "scores.jsonl"), "w", encoding="utf-8") as f:
        for p in sorted(glob.glob(os.path.join(run_dir, "outputs", "*.json"))):
            out = json.load(open(p, encoding="utf-8"))
            item = items.get(out["item"])
            if not item:
                continue
            jp = os.path.join(run_dir, "judgements", os.path.basename(p))
            judgement = json.load(open(jp, encoding="utf-8")) if os.path.exists(jp) else None
            if out.get("error") and not out.get("turns"):
                rec = {"run_id": out.get("run_id"), "model": out["model"], "think": out["think"], "item": item["id"], "test": item["test"],
                       "lang": item["lang"], "scoring": item["scoring"], "truncated": False, "error": out["error"], "judged": False,
                       "self_judged": False, "metrics": {}, "headline": None, "label": "error"}
            else:
                rec = score_record(out, item, judgement, judge_tag, people)
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
            n += 1
    return n


if __name__ == "__main__":
    rd = sys.argv[1]
    print(score_run(rd), "scores written")
