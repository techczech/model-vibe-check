#!/usr/bin/env python3
"""Build pack.json from ../data/prompts.json plus seeded generated cases."""
import json, random, os

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = 20261101
PACK_VERSION = 3
INSTR = "Read the following text and tell me what words are formed when reading each column from top to bottom:\n\n"

WORDS = ("river stone cloud paper garden window yellow silver market bridge candle forest "
         "orange pencil winter summer button flower island mirror ladder pocket rocket "
         "planet music happy table chair house water light green music story dream "
         "bread apple night world green heart").split()
PHRASES = ["good morning", "the quick brown fox", "open the window", "reverse this string",
           "hello world", "small language model", "a cup of tea", "never say never",
           "rain in spain", "vertical text", "coffee break", "silent night",
           "stay curious", "late for dinner", "blue sky thinking"]


VERT_SIZES = [1, 2, 3, 4, 6, 8, 12, 16, 24]
VERT_TEXT = {
    1: "river",
    2: "good morning",
    3: "the old bridge",
    4: "the cat sat quietly",
    6: "we walked along the quiet river",
    8: "the old lighthouse keeper watched ships pass slowly",
    12: "on a cold winter morning the baker opened her shop before sunrise",
    16: "when the market closed the children ran home through the narrow streets to eat warm bread",
    24: ("every evening the old man sat by the window and read the newspaper while his wife "
         "made tea in the small yellow kitchen downstairs"),
}
REV_SIZES = [3, 5, 8, 12, 16, 24, 32, 48, 64]
REAL_POOL = ("a an as at be by do go he if in is it me my no of on or so to up we the and for not but you all can her was one our "
             "out day get has him his how man new now old see two way who boy did its let put say she too use "
             "river stone cloud paper garden window yellow silver market bridge candle forest orange pencil winter summer "
             "button flower island mirror ladder pocket rocket planet music happy table chair house water light green "
             "story dream bread apple night world heart morning coffee never quick brown small language").split()


def real_string(rng, n):
    """Real English words joined by spaces, exactly n characters, ending on a word boundary where possible."""
    for _ in range(5000):
        out, left = [], n
        while left > 0:
            fit = [w for w in REAL_POOL if len(w) == left or len(w) + 2 <= left]
            if not fit:
                break
            w = rng.choice(fit)
            out.append(w)
            left -= len(w) + (1 if left > len(w) else 0)
        if left == 0:
            return " ".join(out)
    # fallback: exact length by trimming letters
    s = ""
    while len(s) < n:
        s += rng.choice(REAL_POOL) + " "
    return s[:n].rstrip() if s[:n].rstrip() and len(s[:n].rstrip()) == n else s[:n - 1] + "e"


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
    # 2. vertical size ladder: fixed sensible phrases, every column spaced the same (stride 2)
    for n in VERT_SIZES:
        ws = VERT_TEXT[n].split()
        assert len(ws) == n, (n, len(ws))
        grid = layout(ws, 2)
        assert derive_columns(grid, 2) == ws, "grid read-back mismatch at size %d" % n
        add("vertical-n%02d" % n, "vertical-ladder", "en", "auto", [INSTR + grid],
            expected_words=ws, stride=2, size=n)

    # 3. reversal ladder: w = real words (exact length), r = random letters
    letters = "abcdefghijklmnopqrstuvwxyz"
    for n in REV_SIZES:
        w = real_string(rng, n)
        assert len(w) == n, (n, w)
        r = "".join(rng.choice(letters) for _ in range(n))
        for pre, s_ in (("w", w), ("r", r)):
            add("reverse-%s%02d" % (pre, n), "reverse-" + pre, "en", "auto",
                ["Reverse this string exactly, character by character. Reply with the reversed string only, "
                 "no explanation: " + s_], input=s_, expected=s_[::-1], size=n)

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
    print([i for i in items if i["id"] == "vertical-n04"][0]["turns"][0])
    for i in items:
        if i["id"].startswith("reverse-w"):
            print(i["id"], repr(i["input"]))
    print(len(items), "items")


if __name__ == "__main__":
    main()
