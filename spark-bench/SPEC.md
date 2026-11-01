---
title: Spark open-model vibe-check bench — spec
created: 2026-11-01
owner: Dominik (decisions), Opus (coordination)
status: approved plan, built; amended 2026-11-01 (pack v2)
---

# Spark open-model vibe-check bench

Reproducible re-run of selected Model Vibe Check prompts against open models served by
Ollama on the DGX Spark. Runner is plain Python 3 (stdlib only, no pip), lives in this folder,
runs on the Spark in the `dominik` account against `http://localhost:11434`.

## Decisions (Dominik, 2026-11-01)

- All text models on the Spark, organised around two families with full size ladders so the
  bench can grow: **Gemma 4** and **Qwen 3.5**. Other installed models run as "other".
- Every Czech-related prompt is asked in English and in Czech, so language-of-prompt effects show.
- Thinking on and off for every model that supports thinking.
- One overall results page first; split pages per test type later.
- Phase 2 (not this build): older generations of the same families at ~4B, ~8B, ~12B, 20B+
  (Gemma 3 / Gemma 2, Qwen 3 / Qwen 2.5) to show improvement over time. The model list is a
  config file so phase 2 is a config change, not a code change.

## Model set (`models.json`)

Each entry: `tag`, `family`, `generation`, `size_label`, `params_b` (number, for sorting), `role`
(`ladder` | `other`). The runner records the Ollama digest from `/api/tags` and capabilities
from `/api/show` at run time.

- Gemma 4 ladder: `gemma4:e2b` (pull), `gemma4:e4b`, `gemma4:12b`, `gemma4:26b-a4b` (pull), `gemma4:31b`
- Qwen 3.5 ladder: `qwen3.5:0.8b` (pull), `qwen3.5:2b` (pull), `qwen3.5:4b`, `qwen3.5:9b`,
  `qwen3.5:27b` (pull), `qwen3.5:35b-a3b` (pull)
- Other (already installed): `qwen3:1.7b`, `qwen3:4b`, `qwen3:8b`, `qwen3:14b`, `qwen3:30b`,
  `qwen3.6:27b`, `qwen3.6:35b-a3b`, `qwen3.8:27b-mtp-q4_K_M`, `granite4:350m`, `granite4:1b`,
  `granite4:3b`, `granite4.2:8b`, `granite3.3:8b`, `ministral-3:8b`, `lfm2.5:8b`
- Excluded: `bge-m3` (embedding), `granite3.2-vision` (vision), `qwen3.6:latest` (duplicate digest).

## Generation settings (recorded per output)

- `/api/chat`, `stream: false`, options `temperature: 0.6`, `seed: 20261101`; think off or n/a:
  `num_ctx: 16384`, `num_predict: 8192`; think on: `num_ctx: 24576`, `num_predict: 16384` (both recorded in
  the manifest and each output); `think: true` and `think: false` as separate runs when the model's
  capabilities include `thinking`, else one run with `think_mode: "n/a"`.
- Record: ollama version, model digest, options, think mode, thinking text, answer text,
  `done_reason` (flag `length` as truncated), eval/prompt token counts, wall time, errors.
- Per-call timeout 15 min. Resumable: an existing output file for the same
  (run-id, model, think mode, item) is skipped.
- Order: all items for one model (both think modes) before moving to the next model, to avoid
  reloading. Judge pass runs after all generations.

## Test items (`pack.json`, versioned `pack_version: 1`)

Prompt text copied verbatim from `data/prompts.json` (key `prompts`) unless stated. Each item has
`id`, `test` (grouping for the results page), `lang` (`en`|`cs`|`de`), `scoring` (`auto`|`judge`|`hybrid`),
`turns` (list of user messages; multi-turn items run as one conversation).

### Automatically checked
1. `vertical-1..3` — the three `vertical-text-*` prompts. Expected answer derived
   programmatically by reading the grid columns top to bottom (store the derived expected
   words in the pack; Opus will eyeball them). vertical-3 is scored on its first 31 derived words only (legacy grid is ragged after 'Large'; prompt kept verbatim). Score: fraction of expected words present in
   order in the answer (case-insensitive), plus exact-all flag.
2. `vertical-gen-01..06` plus `vertical-gen-long` (25 words) — seeded generated variants (seed 20261101): pick 3–8 common English
   words, lay them out as columns padded with spaces, same instruction text as vertical-text-1.
   Store the generated cases in the pack.
3. `reverse-01..10` — seeded strings (seed 20261101), lengths 5–40, half real English words or
   short phrases, half random lowercase letters. Prompt: `Reverse this string exactly, character
   by character. Reply with the reversed string only, no explanation: <s>`. Score: exact match of
   the last non-empty line stripped of quotes/backticks; also record whether the expected string
   appears anywhere.

### Judged by `gemma4:31b` (think off, temperature 0, seed 20261101, JSON output via `format` schema)
4. `novel-sentence-en` — "Write a sentence nobody has ever said before." (typo fixed).
   `novel-sentence-cs` — "Napiš větu, kterou ještě nikdo nikdy neřekl."
   Judge: grammatical (0/1), meaningful (0/1), plausibly novel (0–2), note. Judge cannot verify
   novelty; rubric says so.
5. `rilke-en` — verbatim existing prompt. `rilke-cs` — "Přelož do češtiny název Rilkovy básně:
   Du mußt das Leben nicht verstehen". Auto pre-check: flag answers containing "must not" /
   "mustn't" / "nesmíš". Judge: modal correct (nicht müssen = need not / nemusíš) 0/1, quality 0–2.
6. `coherence-en` — the four `small-model-q1..q4` turns as one conversation.
   `coherence-cs` — "Jaké je hlavní město České republiky? Odpověz jedním slovem." / "Kdo byl
   prvním prezidentem samostatného Československa?" / "Kdo byl jeho nástupcem?" / "Jak se země od
   té doby změnila?". Auto: turn 1 is one word and is Prague/Praha. Judge: Masaryk 0/1, Beneš 0/1,
   turns 3–4 keep the referent 0/1, factual errors count, answer language matches prompt 0/1.
7. `pos-en` — verbatim `small-model-multilingual`. `pos-cs` — "Kolik je v češtině slovních
   druhů? Udělej seznam s příklady." Judge: stated count, is it 10, listed categories vs the
   reference list (podstatná jména, přídavná jména, zájmena, číslovky, slovesa, příslovce,
   předložky, spojky, částice, citoslovce), wrong examples count, answer in Czech 0/1.
8. `totiz-en`, `totiz-cs` — verbatim `czech-metalanguage-en` / `-cs`. Judge: number of sentences,
   distinct uses covered among {explanatory "namely/that is", causal "you see/because",
   corrective/specifying "or rather/actually"}, unnatural or ungrammatical Czech sentences count,
   quality 0–3.
9. `revival-en` — "What are the key figures of the Czech National Revival?"
   `revival-cs` — "Jaké jsou hlavní postavy českého národního obrození?"
   Hybrid scoring against `revival-checklist.json` (below):
   - Judge extracts every person named as a deduplicated canonical list; code also dedupes (same surname,
     overlapping given names).
   - Code matches names to the checklist (diacritic-insensitive, surname + first-name/initial; Jungmann Josef vs
     Antonín, Presl Jan Svatopluk vs Karel Bořivoj, Thám Václav vs Karel Ignác, Nejedlý Vojtěch vs Jan told apart).
     A bare ambiguous surname maps to the primary person (Jungmann→Josef, Presl→Jan Svatopluk, Thám→Václav,
     Nejedlý→Vojtěch; map in `revival-checklist.json`).
   - Every unique off-checklist name is looked up on cs.wikipedia (fallback en) by API: a hit whose title matches
     surname and a given name counts as a page. Results cached in `runs/<run-id>/wikipedia-lookups.json` (title,
     pageid, revid). No page → `fabricated_or_obscure`. Page found → gemma4:31b decides `revival_figure` vs
     `other_period_or_role` from the page's intro paragraph.
   - Metrics: named, correct (= on checklist + revival_figure), on_checklist, fabricated_or_obscure,
     other_period_or_role, missing key (= checklist people not named), checklist recall.

## Revival checklist (`revival-checklist.json`)

Source: cs.wikipedia.org "České národní obrození", revision 26314651, section "Periodizace národního
obrození" (person links only; Alexander Bach excluded as an opponent, manuscripts excluded).
Store revision id, URL, retrieval date and phase per person.

- Obranná fáze (1775–1805): Gelasius Dobner, František Martin Pelcl, Josef Dobrovský, Václav Matěj
  Kramerius, Václav Thám, Karel Ignác Thám, Prokop Šedivý, Antonín Jaroslav Puchmajer, Šebastián
  Hněvkovský, Vojtěch Nejedlý, Jan Nejedlý
- Ofenzivní fáze (1805–1830): Václav Kliment Klicpera, Matěj Kopecký, Jan Nepomuk Štěpánek, Josef
  Jungmann, Milota Zdirad Polák, Antonín Marek, Jan Evangelista Purkyně, Jan Svatopluk Presl, Karel
  Bořivoj Presl, Antonín Jungmann, František Palacký, Pavel Josef Šafařík, Ján Kollár, František
  Ladislav Čelakovský
- Vyvrcholení (1830–1848): Karel Hynek Mácha, Božena Němcová

## Outputs

- Run id `spark-YYYYMMDD-HHMM`. On the Spark: `~/gitrepos/model-vibe-check-spark/runs/<run-id>/`
  with `manifest.json` (ollama version, models + digests, pack version, settings, git commit of the
  runner), `outputs/<model-slug>__<think>__<item>.json`, `judgements/…json`, `scores.jsonl`.
- `report.py` builds one self-contained `results.html` (no external assets): overview matrix of
  models (grouped by family, sorted by size; think on/off as sub-rows) × tests; EN vs CS columns
  side by side for Czech tests; click-through to full answers and judge notes; self-judged cells
  (gemma4:31b) marked; truncated answers marked.
- Archive: copy the run folder into
  `~/gitrepos/02_writing-creation/ai-creations/tools/benchmark-results/runs/<run-id>/`.

## Not in this build

- Split pages per test type; phase-2 older models; Sonnet spot-check of ~15% of judgements
  (Opus dispatches after the run); publication on semanticmachines.fyi.
- Separate follow-up test (Dominik, 2026-11-01): the reversal and vertical-text ladders with tool use
  allowed (e.g. a code tool), compared against the no-tool results.
