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

## 2. Pronoun resolution: the Natasha story

One story, ten sentences. The length ladder uses prefixes of it: 1, 2, 4, 7 and 10 sentences. The gold
key for a prefix is the first part of the full key, so results are comparable across lengths.

### English (pronouns numbered for the gold key; the prompt text has no numbers except in format C)

1. Natasha was afraid that her(1) mother would be worried, and that's why she(2) didn't tell her(3) about her(4) accident.
2. Her(5) sister Vera found out anyway, because the hospital had called her(6) by mistake.
3. She(7) promised Natasha that she(8) would keep it(9) a secret, but she(10) was a terrible liar.
4. When their(11) mother phoned on Sunday, she(12) asked her(13) why she(14) sounded so nervous.
5. Vera told her(15) everything, and she(16) drove to Natasha's flat that same evening.
6. Natasha opened the door with her(17) arm in a cast, and her(18) face fell when she(19) saw who it was.
7. Her(20) mother did not shout at her(21); she(22) just hugged her(23) and asked why she(24) had kept it(25) from her(26).
8. Natasha said she(27) hadn't wanted to spoil her(28) sixtieth birthday, which was the following week.
9. Her(29) mother laughed and said that the only thing that would have spoiled it(30) was finding out from Vera.
10. Later, Vera apologised to her(31) sister, but she(32) told her(33) not to worry, because she(34) would have done the same.

Gold: 1 N · 2 N · 3 M · 4 N · 5 N · 6 V · 7 V · 8 V · 9 the accident · 10 V · 11 N+V · 12 M · 13 V · 14 V ·
15 M · 16 M · 17 N · 18 N · 19 N · 20 N · 21 N · 22 M · 23 N · 24 N · 25 the accident · 26 M · 27 N ·
28 M (sixtieth: world knowledge) · 29 N · 30 the birthday · 31 V · 32 N · 33 V · 34 N
(N = Natasha, V = Vera, M = the mother). The hardest points are 13–14 (whom the mother phoned: inferred
from "terrible liar"), 15–16 (topic switch to the mother), 28 (whose birthday) and 32–34.

### Czech (written natively, not translated; no reflexive possessives, so "své/svůj" never settles a referent)

1. Nataša se bála, že by to matku vyděsilo, a tak jí o nehodě neřekla.
2. Věra se to stejně dozvěděla, protože jí omylem volali z nemocnice.
3. Slíbila Nataše, že to nikomu neřekne, jenže lhát nikdy neuměla.
4. Když jim matka v neděli volala, ptala se jí, proč je tak nervózní.
5. Věra jí všechno řekla a ona ještě ten večer jela za Natašou.
6. Nataša otevřela dveře s rukou v sádře, a když ji uviděla, zbledla.
7. Matka na ni nekřičela, jen ji objala a zeptala se, proč jí to tajila.
8. Nataša řekla, že jí nechtěla kazit šedesáté narozeniny.
9. Matka se zasmála, že by jí je zkazilo jedině to, kdyby se to dozvěděla od Věry.
10. Věra se pak Nataše omluvila, ale ta jí řekla, ať si nedělá starosti, protože by udělala totéž.

Czech gold covers overt pronouns and dropped subjects (∅). Examples: s1 jí = M, ∅neřekla = N; s3 ∅ ×3 = V;
s4 jim = N+V, ∅ptala = M, jí = V, ∅je = V; s5 jí = M, ona = M; s6 ji = M, ∅zbledla = N;
s7 ni = N, ji = N, jí = M, ∅tajila = N; s8 jí = M; s9 jí = M, je = narozeniny, ∅dozvěděla = M;
s10 ta = N, jí = V, ∅nedělá = V, ∅udělala = N.
Open for Dominik: "ona" (s5) and "ta" (s10) are natural Czech cues that help resolution. Keep them,
or rewrite to make Czech as hard as English?

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

Count: 5 lengths × 3 formats × 2 languages = 30, plus 1 legacy = 31 items.

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
