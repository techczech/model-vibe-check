#!/bin/bash
# Full bench run: generate with installed models, then rerun (resumes) and judge.
# Usage:
#   ./run-full.sh <run-id> <model tags to pull...>   pull the tags in the background while the first pass runs
#   ./run-full.sh <run-id>                           no pulls, two passes
#   ./run-full.sh <run-id> --wait-pull <logfile>     pulls happen elsewhere; wait until <logfile> contains PULL-DONE
cd ~/gitrepos/model-vibe-check-spark
RID=$1; shift
if [ "$1" = "--wait-pull" ]; then
  LOG=$2
  python3 run.py --run-id $RID --phase gen > run-$RID.log 2>&1
  until grep -q PULL-DONE "$LOG" 2>/dev/null; do sleep 30; done
else
  ( for m in "$@"; do
      if ollama pull "$m" >/dev/null 2>&1; then echo "OK $m $(date +%H:%M)"; else echo "FAIL $m"; fi
    done; echo PULL-DONE ) > pull-$RID.log 2>&1 &
  PP=$!
  python3 run.py --run-id $RID --phase gen > run-$RID.log 2>&1
  wait $PP
fi
python3 run.py --run-id $RID --phase all >> run-$RID.log 2>&1
echo ALL-DONE $(date) >> run-$RID.log
