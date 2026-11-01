#!/bin/bash
# Quick "size matters" slice first (think off / n-a, full family ladders, a few telling items),
# then hand over to the full run in the same run id (finished outputs are skipped).
# Usage: ./run-showcase.sh <run-id> <pull-log>
cd ~/gitrepos/model-vibe-check-spark
RID=$1; PULL=$2
MODELS='qwen3.5:*,gemma4:*,gemma3:*,granite4:350m,granite4:1b,granite4:3b,qwen2.5:*,llama3.2:*'
ITEMS='revival-en,revival-cs,coherence-en,coherence-cs,pos-cs,rilke-en,totiz-cs,vertical-n01,vertical-n02,vertical-n04,vertical-n08,reverse-w08,reverse-r08,reverse-r16,reverse-r32'
python3 run.py --run-id $RID --phase all --think off,na --models "$MODELS" --items "$ITEMS" > showcase-$RID.log 2>&1
echo SHOWCASE-DONE $(date) >> showcase-$RID.log
exec ./run-full.sh $RID --wait-pull $PULL
