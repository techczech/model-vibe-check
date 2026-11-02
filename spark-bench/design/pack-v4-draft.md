---
title: Spark bench pack v4 — draft items for Dominik's check
created: 2026-11-02
status: draft — Czech texts and gold keys await Dominik's correction
decisions: coherence ladder accepted (Hodonín stays: it measures depth of knowledge); pronoun task in all three formats plus the legacy table; ambiguous and world-knowledge sentences newly written; Prague spires added as a knows-vs-uses test
---

# Pack v4 draft

Runs as a supplementary pass over all models in run `spark-20261101-2310` (same settings, think on/off).
Items in v3 stay unchanged so earlier results remain comparable.

## 1. Coherence ladder (multi-turn, one conversation)

| Turn | English | Czech | Gold (code-scored) |
|---|---|---|---|
| 1 | What is the capital of the Czech Republic? Answer in one word. | Jaké je hlavní město České republiky? Odpověz jedním slovem. | Prague / Praha, one word |
| 2 | Who was the first president of its first republic? | Kdo byl první prezident její první republiky? | Masaryk (trap: Havel) |
| 3 | Who succeeded him? | Kdo byl jeho nástupce? | Beneš |
| 4 | What is 17 times 3? | Kolik je 17 krát 3? | 51 (distractor turn) |
| 5 | Going back to the first president: where was he born? | Vraťme se k prvnímu prezidentovi: kde se narodil? | Hodonín |
| 6 | How has the country changed since then? | Jak se země od té doby změnila? | judged |

## 2. Pronoun resolution: one long Natasha sentence

Revised 2026-11-02 after Dominik's correction. Not a story with many people: one sentence, two women
(Natasha and her mother), extended clause by clause. Every pronoun is grammatically open to both women
(and in Czech often to a feminine noun as well); only what makes sense settles it. The length ladder
uses the five cumulative lengths L1–L5; each gold key is a prefix of the full key.

### English (numbers are for the gold key only; format C shows them)

- L1: Natasha was afraid that her(1) mother would be worried and that's why she(2) didn't tell her(3) about her(4) accident,
- L2: but when she(5) rang her(6) on Sunday to ask whether she(7) was still coming home for Christmas, she(8) heard in her(9) voice that something was wrong,
- L3: so she(10) kept asking until she(11) admitted that she(12) had broken her(13) arm falling off her(14) bike,
- L4: and although she(15) promised her(16) that it(17) was nothing serious and that she(18) would be back at work in a week, she(19) got into her(20) car that same evening and drove three hours to see her(21),
- L5: and when she(22) saw her(23) in the doorway with her(24) arm in a cast, she(25) hugged her(26) so tightly that she(27) yelped, because she(28) had completely forgotten about it(29).

Gold (N = Natasha, M = mother): 1 N · 2 N · 3 M · 4 N · 5 M · 6 N · 7 N · 8 M · 9 N · 10 M · 11 N · 12 N ·
13 N · 14 N · 15 N · 16 M · 17 the injury · 18 N · 19 M · 20 M · 21 N · 22 M · 23 N · 24 N · 25 M · 26 N ·
27 N (the one in pain) · 28 M · 29 the arm. Pronouns per length: 4, 9, 14, 21, 29.

### Czech (gendered pronouns throughout, no "své/svůj"; nehoda, ruka are feminine, so ní/ni can also mean them)

- L1: Nataša se bála, že nehoda matku vyděsí, a tak jí o ní neřekla,
- L2: ale když jí v neděli volala, jestli přijede na Vánoce domů, poznala jí na hlase, že něco není v pořádku,
- L3: a tak se jí vyptávala tak dlouho, až jí přiznala, že si zlomila ruku, když spadla z kola,
- L4: a přestože ji ujišťovala, že to nic vážného není a že se za týden vrátí do práce, ještě ten večer sedla do auta a jela za ní tři hodiny,
- L5: a když ji uviděla ve dveřích s rukou v sádře, objala ji tak pevně, že vykřikla, protože na ni úplně zapomněla.

Czech gold (overt pronouns and dropped subjects ∅): L1 jí M, o ní nehoda, ∅neřekla N · L2 ∅volala M, jí N,
∅přijede N, ∅poznala M, jí (na hlase) N · L3 ∅vyptávala M, jí N, ∅přiznala N, jí M, ∅zlomila N, ∅spadla N ·
L4 ∅ujišťovala N, ji M, to the injury, ∅vrátí N, ∅sedla M, za ní N · L5 ∅uviděla M, ji N, ∅objala M, ji N,
∅vykřikla N, ∅zapomněla M, na ni ruka (not Nataša).
Note: Dominik's "a tak jí o ní neřekla" needs the accident named earlier for "o ní" to point to it, so L1
introduces "nehoda" in the first clause.

Superseded: the ten-sentence three-person story (tracked coreference across sentences, not the point).

### Three formats per length (each item = one format × one prefix × one language)

- A. Rewrite: "Rewrite this text, replacing every pronoun with the name or noun it refers to." /
  "Přepiš tento text tak, že každé zájmeno (i nevyjádřený podmět) nahradíš jménem osoby nebo věci, ke které odkazuje."
  Scored by the judge against the gold key: the number of correct resolutions.
- B. Comprehension questions with single-name answers, scored by code. Example for 10 sentences: Whose accident
  was it? Who did the hospital call? Who was a terrible liar? Who did the mother phone? Who drove to the flat?
  Whose arm was in a cast? Whose birthday was it? Who apologised to whom? Who said she would have done the same?
- C. Pronouns marked in advance: the text with each pronoun followed by [n]. "For each numbered pronoun,
  give the person or thing it refers to, one per line as n: answer." Scored by code. In Czech, only overt
  pronouns are marked; dropped subjects are covered by B.
- Legacy: the original table prompt, English only, unchanged.

Count: 5 lengths × 3 formats × 2 languages = 30, plus 1 legacy = 31 items. Format B questions follow the clauses: whose accident, who rang whom, whose voice, who broke an arm, who drove, who yelped, what was forgotten.

## 3. Ambiguity and world knowledge (new sentences)

Prompt: "Who or what does the word in capitals refer to? If it could be either, say it is ambiguous." Code-scored.
Czech pairs use same-gender nouns, so grammatical agreement does not give the answer away.

| id | English | Gold | Czech | Gold |
|---|---|---|---|---|
| wk-pot-a | The pot wouldn't fit under the tap because IT was too tall. | pot | Hrnec se nevešel pod kohoutek, protože BYL moc vysoký. | hrnec |
| wk-pot-b | The pot wouldn't fit under the tap because IT was too low. | tap | Hrnec se nevešel pod kohoutek, protože BYL moc nízko. | kohoutek |
| wk-violin-a | The violinist couldn't hear the drummer because SHE was wearing earplugs. | violinist | Houslistka neslyšela bubenici, protože MĚLA v uších špunty. | houslistka |
| wk-violin-b | The violinist couldn't hear the drummer because SHE had stopped playing. | drummer | Houslistka neslyšela bubenici, protože PŘESTALA hrát. | bubenice |
| amb-librarian | The librarian told the new intern that SHE would be in charge of the archive from Monday. | ambiguous | Knihovnice řekla nové praktikantce, že od pondělí BUDE mít na starosti archiv. | ambiguous |
| amb-senator | When the senator met the ambassador, HE was visibly nervous. | ambiguous | Když se senátor setkal s velvyslancem, BYL viditelně nervózní. | ambiguous |

Scoring note: the "a/b" pairs count only when both are right (Winograd-style), so a model that always picks
the first noun gets no credit.

## 4. Prague: knowing the nickname vs using it

| id | English | Czech | Scoring |
|---|---|---|---|
| prague-moniker | Prague has a well-known nickname that refers to its architecture. What is it? | Praha má známou přezdívku, která souvisí s její architekturou. Jaká? | code: "hundred spires"/"stověžatá"/"sto věží" |
| prague-nickname | What is Prague's nickname? (legacy) | Jak se přezdívá Praze? (legacy) | code: which nicknames appear (spires, golden, mother of cities…) |
| prague-spires | How many spires are there in Prague? (legacy) | Kolik je v Praze věží? (legacy) | code: mentions the nickname; judge: treats "hundred" as a nickname rather than a count, and gives a plausible real figure |

Report view: a two-by-two grid for each model, "knows the moniker" × "uses it when asked to count spires".

## Run size

Coherence 2 + pronouns 31 + ambiguity 12 + Prague 6 = 51 items. Most answers are short. On top of the
current run, roughly another day of Spark time.
