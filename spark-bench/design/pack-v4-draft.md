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

Revised twice on 2026-11-02 after Dominik's corrections. One sentence, two women (Natasha and her mother),
lengthened by adding modifiers to the same sentence (his model: "...when she called her on Sunday at the
dorm after her visit home to check if she'd had a safe journey"). Every pronoun is grammatically open to
both women; only what makes sense settles it (the dorm is Natasha's, the visit home is hers, the caller
checks on the traveller). Each length's gold key is a prefix of the full key.

### English (numbers for the gold key only; format C shows them)

- L1: Natasha was afraid that her(1) mother would be worried and that's why she(2) didn't tell her(3) about her(4) accident.
- L2: … accident when she(5) called her(6) at the dorm on Sunday.
- L3: … at the dorm on Sunday after her(7) visit home.
- L4: … after her(7) visit home to check if she(8) had had a safe journey back.
- L5: … safe journey back, even though she(9) could hear in her(10) voice that something was wrong and kept asking her(11) whether she(12) was eating properly.

Gold (N = Natasha, M = mother): 1 N · 2 N · 3 M · 4 N · 5 M · 6 N · 7 N · 8 N · 9 M · 10 N · 11 N · 12 N.
Pronouns per length: 4, 6, 7, 8, 12.

### Czech (gendered pronouns, no "své/svůj", no possessive "její" where the subject rule would settle it)

- L1: Nataša se bála, že nehoda matku vyděsí, a tak jí o ní neřekla.
- L2: … neřekla, když jí v neděli volala na kolej.
- L3: … na kolej, potom co byla doma na návštěvě.
- L4: … na návštěvě, aby zjistila, jestli dojela v pořádku.
- L5: … v pořádku, přestože jí na hlase poznala, že něco není v pořádku, a pořád se jí vyptávala, jestli pořádně jí.

Czech gold (overt pronouns and dropped subjects ∅): L1 jí M, o ní nehoda, ∅neřekla N · L2 ∅volala M, jí N ·
L3 ∅byla N · L4 ∅zjistila M, ∅dojela N · L5 jí (na hlase) N, ∅poznala M, ∅vyptávala M, jí N, ∅jí (eats) N.
Design notes: "po její návštěvě" was avoided because with the mother as subject "její" would point away
from her, the same give-away as "své"; the dropped subject in "byla doma" carries the ambiguity instead.
L5 ends on "jí" = eats, homonymous with the pronoun "jí". "o ní" needs the accident named first, so L1
names "nehoda" in its first clause.

Superseded: the ten-sentence three-person story and the five-clause chain (both tracked a narrative,
not ambiguity resolved by sense).

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

Count: 5 lengths × 3 formats × 2 languages = 30, plus 1 legacy = 31 items. Format B questions: whose accident, who called whom, who lives in the dorm, who had visited home, who travelled, whose voice, who was asked about eating.

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
