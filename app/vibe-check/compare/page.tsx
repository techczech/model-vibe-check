"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  SkipForward,
  FileText,
  Trophy,
  Equal,
  ThumbsDown,
} from "lucide-react";
import { ResponseViewer } from "@/components/response-viewer";
import { toViewerPrompt, getResponsesForPrompt, getLatestResponsePerModel } from "@/lib/viewer-utils";
import type { Prompt, Model, Run, ViewerResponse } from "@/lib/types";

interface ComparisonResult {
  pairKey: string;
  winner: "A" | "B" | "tie-good" | "tie-bad";
  timestamp: string;
}

export default function HeadToHeadPage() {
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);

  useEffect(() => {
    loadData();
    // Load saved results from localStorage
    const saved = localStorage.getItem("headToHeadResults");
    if (saved) {
      setResults(JSON.parse(saved));
    }
  }, []);

  async function loadData() {
    try {
      const [promptsRes, modelsRes, runsRes] = await Promise.all([
        fetch("/api/prompts"),
        fetch("/api/models"),
        fetch("/api/runs"),
      ]);
      const [promptsData, modelsData, runsData] = await Promise.all([
        promptsRes.json(),
        modelsRes.json(),
        runsRes.json(),
      ]);
      setPrompts(promptsData.prompts || []);
      setModels(modelsData.models || []);
      setRuns(runsData.runs || []);

      // Auto-select first prompt with multiple model responses
      const promptsWithMultipleModels = (promptsData.prompts || []).filter((p: Prompt) => {
        const modelIds = new Set<string>();
        for (const run of runsData.runs || []) {
          for (const r of run.results) {
            if (r.promptId === p.id) modelIds.add(r.modelId);
          }
        }
        return modelIds.size >= 2;
      });
      if (promptsWithMultipleModels.length > 0) {
        setSelectedPromptId(promptsWithMultipleModels[0].id);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Generate comparison pairs for selected prompt
  const { pairs, viewerPrompt } = useMemo(() => {
    if (!selectedPromptId) return { pairs: [], viewerPrompt: undefined };

    const prompt = prompts.find(p => p.id === selectedPromptId);
    if (!prompt) return { pairs: [], viewerPrompt: undefined };

    // Get responses for this prompt
    const allResponses = getResponsesForPrompt(selectedPromptId, { models, prompts, runs });
    const latestResponses = getLatestResponsePerModel(allResponses);

    if (latestResponses.length < 2) return { pairs: [], viewerPrompt: toViewerPrompt(prompt) };

    // Generate all unique pairs
    const pairsList: { a: ViewerResponse; b: ViewerResponse; key: string }[] = [];

    for (let i = 0; i < latestResponses.length; i++) {
      for (let j = i + 1; j < latestResponses.length; j++) {
        // Randomly assign A and B to avoid position bias
        const swap = Math.random() > 0.5;
        const a = swap ? latestResponses[j] : latestResponses[i];
        const b = swap ? latestResponses[i] : latestResponses[j];
        const key = [a.id, b.id].sort().join("-");
        pairsList.push({ a, b, key });
      }
    }

    // Shuffle pairs
    for (let i = pairsList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairsList[i], pairsList[j]] = [pairsList[j], pairsList[i]];
    }

    return { pairs: pairsList, viewerPrompt: toViewerPrompt(prompt) };
  }, [selectedPromptId, models, prompts, runs]);

  // Filter out already compared pairs
  const remainingPairs = useMemo(() => {
    const compared = new Set(results.map((r) => r.pairKey));
    return pairs.filter((p) => !compared.has(p.key));
  }, [pairs, results]);

  const currentPair = remainingPairs[currentPairIndex];
  const progressPercent = pairs.length > 0 ? ((pairs.length - remainingPairs.length) / pairs.length) * 100 : 100;

  // Calculate scores
  const scores = useMemo(() => {
    const modelScores = new Map<string, number>();
    
    for (const pair of pairs) {
      const result = results.find((r) => r.pairKey === pair.key);
      if (!result) continue;

      if (result.winner === "A") {
        modelScores.set(pair.a.modelId, (modelScores.get(pair.a.modelId) || 0) + 1);
      } else if (result.winner === "B") {
        modelScores.set(pair.b.modelId, (modelScores.get(pair.b.modelId) || 0) + 1);
      }
    }

    return modelScores;
  }, [pairs, results]);

  const handleVote = useCallback((winner: "A" | "B" | "tie-good" | "tie-bad") => {
    if (!currentPair) return;

    const newResult: ComparisonResult = {
      pairKey: currentPair.key,
      winner,
      timestamp: new Date().toISOString(),
    };

    const newResults = [...results, newResult];
    setResults(newResults);
    localStorage.setItem("headToHeadResults", JSON.stringify(newResults));

    // Move to next pair
    setRevealed(false);
    if (currentPairIndex < remainingPairs.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    } else {
      setCurrentPairIndex(0);
    }
  }, [currentPair, results, currentPairIndex, remainingPairs.length]);

  const handleSkip = useCallback(() => {
    setRevealed(false);
    if (currentPairIndex < remainingPairs.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    }
  }, [currentPairIndex, remainingPairs.length]);

  // Prompts with multiple model responses
  const promptsWithPairs = prompts.filter((p) => {
    const modelIds = new Set<string>();
    for (const run of runs) {
      for (const r of run.results) {
        if (r.promptId === p.id) modelIds.add(r.modelId);
      }
    }
    return modelIds.size >= 2;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vibe-check">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Head-to-Head</h1>
            <p className="text-sm text-muted-foreground">
              Pick the better response in pairwise comparisons
            </p>
          </div>
        </div>
        <Button
          variant={revealed ? "secondary" : "outline"}
          onClick={() => setRevealed(!revealed)}
        >
          {revealed ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Models
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Reveal Models
            </>
          )}
        </Button>
      </div>

      {/* Prompt Selector */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedPromptId || ""}
          onValueChange={(v) => {
            setSelectedPromptId(v);
            setCurrentPairIndex(0);
            setRevealed(false);
          }}
        >
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Select a prompt" />
          </SelectTrigger>
          <SelectContent>
            {promptsWithPairs.map((prompt) => (
              <SelectItem key={prompt.id} value={prompt.id}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {prompt.title}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPromptId && (
          <Badge variant="secondary">
            {pairs.length} matchups · {pairs.length - remainingPairs.length} completed
          </Badge>
        )}
      </div>

      {/* Progress */}
      {pairs.length > 0 && (
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {Math.round(progressPercent)}% complete
          </p>
        </div>
      )}

      {/* Comparison View */}
      {!selectedPromptId ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Select a prompt</h3>
          <p className="text-muted-foreground">
            Choose a prompt with multiple model responses to compare
          </p>
        </div>
      ) : remainingPairs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-lg font-semibold mb-2">All comparisons complete!</h3>
            <p className="text-muted-foreground mb-6">
              You've compared all {pairs.length} matchups for this prompt.
            </p>

            {/* Results Summary */}
            {scores.size > 0 && (
              <div className="max-w-sm mx-auto">
                <h4 className="font-medium mb-3">Results</h4>
                <div className="space-y-2">
                  {Array.from(scores.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([modelId, wins], index) => {
                      const model = models.find((m) => m.id === modelId);
                      return (
                        <div
                          key={modelId}
                          className="flex items-center justify-between p-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                            <span>{model?.displayName || modelId}</span>
                          </div>
                          <Badge variant="secondary">{wins} wins</Badge>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                // Clear results for this prompt
                const newResults = results.filter((r) => {
                  const pairKeys = pairs.map((p) => p.key);
                  return !pairKeys.includes(r.pairKey);
                });
                setResults(newResults);
                localStorage.setItem("headToHeadResults", JSON.stringify(newResults));
                setCurrentPairIndex(0);
              }}
            >
              Reset & Compare Again
            </Button>
          </CardContent>
        </Card>
      ) : currentPair ? (
        <>
          {/* Prompt Display */}
          {viewerPrompt && (
            <Card className="bg-muted/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{viewerPrompt.title}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap line-clamp-3">
                  {viewerPrompt.content}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Side by Side Comparison using ResponseViewer */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Response A */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  Response A
                </Badge>
                {revealed && (
                  <Badge variant="secondary">{currentPair.a.modelName}</Badge>
                )}
              </div>
              <ResponseViewer
                responses={[currentPair.a]}
                isBlind={!revealed}
                showToolbar={false}
              />
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
                onClick={() => handleVote("A")}
              >
                <Trophy className="h-4 w-4 mr-2" />
                A is better
              </Button>
            </div>

            {/* Response B */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-red-600 border-red-600">
                  Response B
                </Badge>
                {revealed && (
                  <Badge variant="secondary">{currentPair.b.modelName}</Badge>
                )}
              </div>
              <ResponseViewer
                responses={[currentPair.b]}
                isBlind={!revealed}
                showToolbar={false}
              />
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
                onClick={() => handleVote("B")}
              >
                <Trophy className="h-4 w-4 mr-2" />
                B is better
              </Button>
            </div>
          </div>

          {/* Tie Options */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" onClick={() => handleVote("tie-good")}>
              <Equal className="h-4 w-4 mr-2" />
              Tie — Both good
            </Button>
            <Button variant="outline" onClick={() => handleVote("tie-bad")}>
              <ThumbsDown className="h-4 w-4 mr-2" />
              Tie — Both bad
            </Button>
            <Button variant="ghost" onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-2" />
              Skip
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
