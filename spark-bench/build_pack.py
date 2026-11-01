#!/usr/bin/env python3
"""Build pack.json from ../data/prompts.json plus seeded generated cases."""
import json, random, os

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = 20261101
PACK_VERSION = 2
INSTR = "Read the following text and tell me what words are formed when reading each column from top to bottom:\n\n"

WORDS = ("river stone cloud paper garden window yellow silver market bridge candle forest "
         "orange pencil winter summer button flower island mirror ladder pocket rocket "
         "planet music happy table chair house water light green music story dream "
         "bread apple night world green heart").split()
PHRASES = ["good morning", "the quick brown fox", "open the window", "reverse this string",
           "hello world", "small language model", "a cup of tea", "never say never",
           "rain in spain", "vertical text", "coffee break", "silent night",
           "stay curious", "late for dinner", "blue sky thinking"]


def derive_columns(text, stride):
    rows = text.split("\n")
    width = max(len(r) for r in rows)
    rows = [r.ljust(width) for r in rows]
    words = []
    for c in range(0, width, stride):
        col = "".join(r[c] for r in rows)
        words.extend(col.split())
    return words


def layout(words, stride):
    """Columns of words (top to bottom), separated by stride spaces."""
    h = max(len(w) for w in words)
    lines = []
    for r in range(h):
        cells = [(w[r] if r < len(w) else " ") for w in words]
        lines.append((" " * (stride - 1)).join(cells).rstrip())
    return "\n".join(lines)


def main():
    src = json.load(open(os.path.join(HERE, "..", "data", "prompts.json"), encoding="utf-8"))
    P = {p["id"]: p for p in src["prompts"]}
    items = []

    def add(id, test, lang, scoring, turns, **kw):
        d = dict(id=id, test=test, lang=lang, scoring=scoring, turns=turns)
        d.update(kw)
        items.append(d)

    def pc(pid):
        return P[pid]["content"]

    # 1. vertical
    for n, stride in ((1, 4), (2, 2), (3, 3)):
        p = P["vertical-text-%d" % n]
        grid = p["content"].split("\n\n", 1)[1]
        extra = {}
        if n == 3:
            extra = dict(score_first_n=31, partial_scoring="first 31 words; legacy grid ragged after 'Large'")
        add("vertical-%d" % n, "vertical", "en", "auto", [p["content"]],
            expected_words=derive_columns(grid, stride), stride=stride,
            source_expected_answer=p.get("expectedAnswer"), source_id=p["id"], **extra)

    rng = random.Random(SEED)
    # 2. generated vertical
    for i in range(1, 7):
        k = rng.randint(3, 8)
        ws = rng.sample(WORDS, k)
        grid = layout(ws, 2)
        add("vertical-gen-%02d" % i, "vertical", "en", "auto", [INSTR + grid],
            expected_words=ws, stride=2)

    long_ws = rng.sample(WORDS, 25)
    add("vertical-gen-long", "vertical", "en", "auto", [INSTR + layout(long_ws, 2)],
        expected_words=long_ws, stride=2)

    # 3. reverse
    letters = "abcdefghijklmnopqrstuvwxyz"
    lengths = [5, 9, 13, 18, 22, 26, 30, 34, 37, 40]
    for i in range(1, 11):
        n = lengths[i - 1]
        if i % 2:  # real words/phrases
            s = rng.choice(PHRASES)
            while len(s) < n and rng.random() < 0.6:
                s += " " + rng.choice(WORDS)
            s = s[:n].rstrip()
            if len(s) < 5:
                s = "stay curious"
        else:
            s = "".join(rng.choice(letters) for _ in range(n))
        add("reverse-%02d" % i, "reverse", "en", "auto",
            ["Reverse this string exactly, character by character. Reply with the reversed string only, "
             "no explanation: " + s], input=s, expected=s[::-1])

    # 4-9 judged
    add("novel-sentence-en", "novel-sentence", "en", "judge", ["Write a sentence nobody has ever said before."])
    add("novel-sentence-cs", "novel-sentence", "cs", "judge", ["Napiš větu, kterou ještě nikdo nikdy neřekl."])
    add("rilke-en", "rilke", "de", "hybrid", [pc("german-rilke")], source_id="german-rilke")
    add("rilke-cs", "rilke", "cs", "hybrid", ["Přelož do češtiny název Rilkovy básně: Du mußt das Leben nicht verstehen"])
    add("coherence-en", "coherence", "en", "hybrid",
        [pc("small-model-q%d" % i) for i in range(1, 5)])
    add("coherence-cs", "coherence", "cs", "hybrid", [
        "Jaké je hlavní město České republiky? Odpověz jedním slovem.",
        "Kdo byl prvním prezidentem samostatného Československa?",
        "Kdo byl jeho nástupcem?",
        "Jak se země od té doby změnila?"])
    add("pos-en", "pos", "en", "judge", [pc("small-model-multilingual")], source_id="small-model-multilingual")
    add("pos-cs", "pos", "cs", "judge", ["Kolik je v češtině slovních druhů? Udělej seznam s příklady."])
    add("totiz-en", "totiz", "en", "judge", [pc("czech-metalanguage-en")], source_id="czech-metalanguage-en")
    add("totiz-cs", "totiz", "cs", "judge", [pc("czech-metalanguage-cs")], source_id="czech-metalanguage-cs")
    add("revival-en", "revival", "en", "hybrid", ["What are the key figures of the Czech National Revival?"])
    add("revival-cs", "revival", "cs", "hybrid", ["Jaké jsou hlavní postavy českého národního obrození?"])

    pack = {"pack_version": PACK_VERSION, "seed": SEED, "items": items}
    with open(os.path.join(HERE, "pack.json"), "w", encoding="utf-8") as f:
        json.dump(pack, f, ensure_ascii=False, indent=1)
    for it in items[:3]:
        print(it["id"], it["expected_words"], "| source:", it["source_expected_answer"])
    print(len(items), "items")


if __name__ == "__main__":
    main()
