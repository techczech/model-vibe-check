# Spark open-model bench

Runs selected Model Vibe Check prompts against open models on the DGX Spark (Ollama, localhost:11434).
Python 3 stdlib only. Spec: `SPEC.md`. Models: `models.json` (edit this to add models). Items: `pack.json`
(rebuild with `python3 build_pack.py`, which reads `../data/prompts.json`).

## Sync to the Spark (the Spark has no GitHub credentials)

    git rev-parse HEAD > COMMIT   # optional, recorded in the manifest
    rsync -a --exclude runs/ --exclude smoke/ ./ spark-dominik:gitrepos/model-vibe-check-spark/

## Pull models (on the Spark)

    ssh spark-dominik
    for m in gemma4:e2b gemma4:26b-a4b qwen3.5:0.8b qwen3.5:2b qwen3.5:27b qwen3.5:35b-a3b; do ollama pull $m; done

Models in `models.json` that are not installed are skipped with a message.

## Launch / resume

    cd ~/gitrepos/model-vibe-check-spark
    nohup python3 run.py --run-id spark-20261101-1200 > run.log 2>&1 &
    tail -f run.log

Resume: run the same command with the same `--run-id`; finished outputs and judgements are skipped
(outputs with an error are retried). Flags: `--models tag,glob`, `--items id,glob`, `--phase gen|judge|all`, `--dry-run`.
The judge pass looks up off-checklist revival names on Wikipedia (`wikipedia-lookups.json` in the run folder) and then asks
`gemma4:31b` for verdicts. The Spark can reach Wikipedia; if it ever cannot, run `python3 run.py --run-id X --phase lookup` on the Mac
against the run folder synced back (needs no Ollama), rsync `wikipedia-lookups.json` to the Spark, and run the judge pass with `--no-lookup`.
Judge pass uses `gemma4:31b` and ends by writing `runs/<run-id>/scores.jsonl`.

`./run-full.sh <run-id> --wait-pull <logfile>` runs the first pass, waits until the pull log contains `PULL-DONE`, then runs the second pass and judge.

## Report

    python3 report.py runs/<run-id>        # writes runs/<run-id>/results.html
    scp spark-dominik:gitrepos/model-vibe-check-spark/runs/<run-id>/results.html .

## Archive

    rsync -a spark-dominik:gitrepos/model-vibe-check-spark/runs/<run-id>/ \
      ~/gitrepos/02_writing-creation/ai-creations/tools/benchmark-results/runs/<run-id>/
