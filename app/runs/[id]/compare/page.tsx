"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  RefreshCw,
  Check,
  Trophy,
  Equal,
} from "lucide-react";
import type { Run, Prompt, Model, Result, PairwiseComparison } from "@/lib/types";

interface ComparisonPair {
  promptId: string;
  resultA: Result;
  resultB: Result;
  displayOrder: [string, string]; // [left, right] after randomization
}

export default function ComparePage() {
  const params = useParams();
  const runId = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [prompts, setPrompts] = useState<Record<string, Prompt>>({});
  const [models, setModels] = useState<Record<string, Model>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [runRes, promptsRes, modelsRes] = await Promise.all([
        fetch(`/api/runs/${runId}`),
        fetch("/api/prompts"),
        fetch("/api/models"),
      ]);

      const runData = await runRes.json();
      const promptsData = await promptsRes.json();
      const modelsData = await modelsRes.json();

      setRun(runData.run || runData);

      const promptIndex: Record<string, Prompt> = {};
      (promptsData.prompts || []).forEach((p: Prompt) => {
        promptIndex[p.id] = p;
      });
      setPrompts(promptIndex);

      const modelIndex: Record<string, Model> = {};
      (modelsData.models || []).forEach((m: Model) => {
        modelIndex[m.id] = m;
      });
      setModels(modelIndex);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate comparison pairs: for each prompt, compare each pair of models
  const comparisonPairs = useMemo(() => {
    if (!run) return [];

    const pairs: ComparisonPair[] = [];

    for (const promptId of run.promptIds) {
      // Get results for this prompt (first iteration only)
      const promptResults = run.results.filter(
        (r) => r.promptId === promptId && r.iteration === 0 && !r.error
      );

      // Create pairs of different models
      for (let i = 0; i < promptResults.length; i++) {
        for (let j = i + 1; j < promptResults.length; j++) {
          const resultA = promptResults[i];
          const resultB = promptResults[j];

          // Check if this comparison already exists
          const existingComparison = run.comparisons.find(
            (c) =>
              c.promptId === promptId &&
              ((c.resultAId === resultA.id && c.resultBId === resultB.id) ||
                (c.resultAId === resultB.id && c.resultBId === resultA.id))
          );

          if (!existingComparison) {
            // Randomize display order
            const flip = Math.random() > 0.5;
            pairs.push({
              promptId,
              resultA,
              resultB,
              displayOrder: flip
                ? [resultB.id, resultA.id]
                : [resultA.id, resultB.id],
            });
          }
        }
      }
    }

    return pairs;
  }, [run]);

  const currentPair = comparisonPairs[currentIndex];

  async function vote(winner: "left" | "right" | "tie") {
    if (!currentPair || !run) return;

    setSaving(true);
    try {
      // Determine actual winner based on display order
      let actualWinner: "a" | "b" | "tie";
      if (winner === "tie") {
        actualWinner = "tie";
      } else if (winner === "left") {
        actualWinner =
          currentPair.displayOrder[0] === currentPair.resultA.id ? "a" : "b";
      } else {
        actualWinner =
          currentPair.displayOrder[1] === currentPair.resultA.id ? "a" : "b";
      }

      await fetch(`/api/runs/${runId}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultAId: currentPair.resultA.id,
          resultBId: currentPair.resultB.id,
          promptId: currentPair.promptId,
          winner: actualWinner,
        }),
      });

      // Move to next
      if (currentIndex < comparisonPairs.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }

      loadData();
    } catch (error) {
      console.error("Failed to save comparison:", error);
    } finally {
      setSaving(false);
    }
  }

  function getResultById(id: string): Result | undefined {
    return run?.results.find((r) => r.id === id);
  }

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

  const completedComparisons = run.comparisons.length;
  const totalPossible =
    comparisonPairs.length + completedComparisons;

  if (comparisonPairs.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/runs/${runId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Pairwise Comparison</h1>
        </div>

        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">All comparisons done!</h3>
            <p className="text-muted-foreground mb-4">
              {completedComparisons} comparisons completed
            </p>
            <Link href={`/runs/${runId}`}>
              <Button>Back to Run</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Show completed comparisons summary */}
        {run.comparisons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Results Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {run.modelIds.map((modelId) => {
                  const wins = run.comparisons.filter((c) => {
                    const resultA = run.results.find((r) => r.id === c.resultAId);
                    const resultB = run.results.find((r) => r.id === c.resultBId);
                    return (
                      (c.winner === "a" && resultA?.modelId === modelId) ||
                      (c.winner === "b" && resultB?.modelId === modelId)
                    );
                  }).length;

                  const losses = run.comparisons.filter((c) => {
                    const resultA = run.results.find((r) => r.id === c.resultAId);
                    const resultB = run.results.find((r) => r.id === c.resultBId);
                    return (
                      (c.winner === "a" && resultB?.modelId === modelId) ||
                      (c.winner === "b" && resultA?.modelId === modelId)
                    );
                  }).length;

                  const ties = run.comparisons.filter((c) => {
                    const resultA = run.results.find((r) => r.id === c.resultAId);
                    const resultB = run.results.find((r) => r.id === c.resultBId);
                    return (
                      c.winner === "tie" &&
                      (resultA?.modelId === modelId || resultB?.modelId === modelId)
                    );
                  }).length;

                  return (
                    <div
                      key={modelId}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="font-medium">
                        {models[modelId]?.displayName || modelId}
                      </span>
                      <div className="flex gap-2">
                        <Badge variant="default" className="bg-green-500">
                          {wins}W
                        </Badge>
                        <Badge variant="secondary">{ties}T</Badge>
                        <Badge variant="destructive">{losses}L</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const leftResult = getResultById(currentPair.displayOrder[0]);
  const rightResult = getResultById(currentPair.displayOrder[1]);
  const currentPrompt = prompts[currentPair.promptId];

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
            <h1 className="text-2xl font-bold">Pairwise Comparison</h1>
            <p className="text-muted-foreground">{run.name}</p>
          </div>
        </div>
        <Badge variant="outline">
          {currentIndex + 1} of {comparisonPairs.length}
        </Badge>
      </div>

      {/* Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{currentPrompt?.title || "Prompt"}</span>
            <Badge variant="outline">{currentPrompt?.category}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-4 rounded whitespace-pre-wrap max-h-32 overflow-y-auto">
            {currentPrompt?.content}
          </pre>
        </CardContent>
      </Card>

      {/* Side by side responses */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left (A) */}
        <Card className="border-2 hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Response A</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded whitespace-pre-wrap max-h-96 overflow-y-auto">
              {leftResult?.response}
            </pre>
          </CardContent>
        </Card>

        {/* Right (B) */}
        <Card className="border-2 hover:border-primary transition-colors">
          <CardHeader>
            <CardTitle className="text-base">Response B</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded whitespace-pre-wrap max-h-96 overflow-y-auto">
              {rightResult?.response}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Voting */}
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground mb-4">
            Which response is better?
          </p>
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              variant="outline"
              onClick={() => vote("left")}
              disabled={saving}
              className="min-w-32"
            >
              <Trophy className="h-4 w-4 mr-2" />
              A Wins
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => vote("tie")}
              disabled={saving}
              className="min-w-32"
            >
              <Equal className="h-4 w-4 mr-2" />
              Tie
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => vote("right")}
              disabled={saving}
              className="min-w-32"
            >
              <Trophy className="h-4 w-4 mr-2" />
              B Wins
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${((currentIndex + 1) / comparisonPairs.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
