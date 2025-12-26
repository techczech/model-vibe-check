"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Zap,
  RefreshCw,
  Check,
  AlertCircle,
} from "lucide-react";
import type { Run, Prompt, Evaluation } from "@/lib/types";

export default function JudgePage() {
  const params = useParams();
  const runId = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [prompts, setPrompts] = useState<Record<string, Prompt>>({});
  const [loading, setLoading] = useState(true);
  const [judging, setJudging] = useState(false);
  const [judgeModel, setJudgeModel] = useState("gpt-4o-mini");
  const [status, setStatus] = useState<{
    judged: number;
    remaining: number;
    total: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [runRes, promptsRes, statusRes] = await Promise.all([
        fetch(`/api/runs/${runId}`),
        fetch("/api/prompts"),
        fetch(`/api/runs/${runId}/judge`),
      ]);

      const runData = await runRes.json();
      const promptsData = await promptsRes.json();
      const statusData = await statusRes.json();

      setRun(runData.run || runData);
      setStatus(statusData);

      const promptIndex: Record<string, Prompt> = {};
      (promptsData.prompts || []).forEach((p: Prompt) => {
        promptIndex[p.id] = p;
      });
      setPrompts(promptIndex);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function startJudging() {
    setJudging(true);
    try {
      const res = await fetch(`/api/runs/${runId}/judge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeModel }),
      });
      const data = await res.json();
      console.log("Judge result:", data);
      loadData();
    } catch (error) {
      console.error("Judging failed:", error);
    } finally {
      setJudging(false);
    }
  }

  // Get LLM evaluations grouped by result
  const llmEvaluations = run?.evaluations.filter((e) => e.method === "llm-judge") || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="text-center py-12">
        <p>Run not found</p>
        <Link href="/runs" className="text-primary hover:underline">
          Back to runs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/runs/${runId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">LLM Judge</h1>
            <p className="text-muted-foreground">{run.name}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {status?.judged || 0}
              </div>
              <p className="text-sm text-muted-foreground">Judged</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {status?.remaining || 0}
              </div>
              <p className="text-sm text-muted-foreground">Remaining</p>
            </div>
            <div>
              <div className="text-2xl font-bold">{status?.total || 0}</div>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>

          {status && status.total > 0 && (
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${(status.judged / status.total) * 100}%`,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Judge Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>
            The LLM judge will evaluate each response against the prompt's
            configured rubric
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="judgeModel">Judge Model</Label>
            <Input
              id="judgeModel"
              value={judgeModel}
              onChange={(e) => setJudgeModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
            <p className="text-xs text-muted-foreground">
              Model used to evaluate responses. Must be available via OpenAI or
              OpenRouter.
            </p>
          </div>

          <Button
            onClick={startJudging}
            disabled={judging || (status?.remaining || 0) === 0}
            className="w-full"
          >
            {judging ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Judging...
              </>
            ) : (status?.remaining || 0) === 0 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                All Results Judged
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Judge {status?.remaining || 0} Results
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {llmEvaluations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Evaluations ({llmEvaluations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {llmEvaluations.slice(0, 10).map((evaluation) => {
                const result = run.results.find(
                  (r) => r.id === evaluation.resultId
                );
                const prompt = result ? prompts[result.promptId] : null;

                return (
                  <div
                    key={evaluation.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {prompt?.title || "Unknown prompt"}
                      </span>
                      <Badge
                        variant={
                          (evaluation.llmOverall || 0) >= 7
                            ? "default"
                            : (evaluation.llmOverall || 0) >= 4
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {evaluation.llmOverall}/10
                      </Badge>
                    </div>

                    {evaluation.llmScores && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(evaluation.llmScores).map(
                          ([dim, score]) => (
                            <Badge key={dim} variant="outline" className="text-xs">
                              {dim}: {score}
                            </Badge>
                          )
                        )}
                      </div>
                    )}

                    {evaluation.llmRationale && (
                      <p className="text-sm text-muted-foreground">
                        {evaluation.llmRationale}
                      </p>
                    )}
                  </div>
                );
              })}

              {llmEvaluations.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  Showing 10 of {llmEvaluations.length} evaluations
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
