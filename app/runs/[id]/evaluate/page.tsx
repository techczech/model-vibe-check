"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Check,
  Clock,
  SkipForward,
  Keyboard,
  FileText,
  GitCompare,
  ClipboardCheck,
  Bot,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { Run, Prompt, Model, Result, Evaluation } from "@/lib/types";

export default function EvaluatePage() {
  const params = useParams();
  const router = useRouter();
  const runId = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [prompts, setPrompts] = useState<Record<string, Prompt>>({});
  const [models, setModels] = useState<Record<string, Model>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Current evaluation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const [skipEvaluated, setSkipEvaluated] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const runRes = await fetch(`/api/runs/${runId}`);
      const runData = await runRes.json();
      setRun(runData.run || runData);

      const [promptsRes, modelsRes] = await Promise.all([
        fetch("/api/prompts"),
        fetch("/api/models"),
      ]);
      const promptsData = await promptsRes.json();
      const modelsData = await modelsRes.json();

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

  // Get results that need human evaluation
  const resultsToEvaluate = run?.results.filter((r) => {
    if (r.error) return false;
    
    const prompt = prompts[r.promptId];
    if (!prompt?.evaluationConfig.methods.includes("human")) return false;
    
    if (skipEvaluated) {
      const hasHumanEval = run.evaluations.some(
        (e) => e.resultId === r.id && e.method === "human"
      );
      if (hasHumanEval) return false;
    }
    
    return true;
  }) || [];

  const currentResult = resultsToEvaluate[currentIndex];
  const currentPrompt = currentResult ? prompts[currentResult.promptId] : null;
  const currentModel = currentResult ? models[currentResult.modelId] : null;

  // Get existing evaluation if any
  const existingEval = currentResult
    ? run?.evaluations.find(
        (e) => e.resultId === currentResult.id && e.method === "human"
      )
    : null;

  useEffect(() => {
    if (existingEval) {
      setScore(existingEval.humanScore || 5);
      setNotes(existingEval.humanNotes || "");
    } else {
      setScore(5);
      setNotes("");
    }
  }, [existingEval, currentIndex]);

  const saveEvaluation = useCallback(async () => {
    if (!currentResult || !run || saving) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/runs/${runId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultId: currentResult.id,
          score,
          notes,
        }),
      });

      if (res.ok) {
        // Move to next
        if (currentIndex < resultsToEvaluate.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
        // Reload data to get updated evaluations
        loadData();
      }
    } catch (error) {
      console.error("Failed to save evaluation:", error);
    } finally {
      setSaving(false);
    }
  }, [currentResult, run, saving, runId, score, notes, currentIndex, resultsToEvaluate.length, loadData]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < resultsToEvaluate.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, resultsToEvaluate.length]);

  const skip = useCallback(() => {
    goToNext();
  }, [goToNext]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in textarea
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        // Allow Enter in textarea for save
        if (e.key === "Enter" && e.ctrlKey) {
          e.preventDefault();
          saveEvaluation();
        }
        return;
      }

      // Score shortcuts: 1-9, 0 for 10
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        setScore(parseInt(e.key));
        return;
      }
      if (e.key === "0") {
        e.preventDefault();
        setScore(10);
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
        case "p":
        case "P":
          e.preventDefault();
          goToPrev();
          break;
        case "ArrowRight":
        case "n":
        case "N":
          e.preventDefault();
          goToNext();
          break;
        case "s":
        case "S":
          e.preventDefault();
          skip();
          break;
        case "Enter":
          e.preventDefault();
          saveEvaluation();
          break;
        case "?":
          e.preventDefault();
          setShowShortcuts((s) => !s);
          break;
        case "Escape":
          setShowShortcuts(false);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext, skip, saveEvaluation]);

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

  if (resultsToEvaluate.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/runs/${runId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Human Evaluation</h1>
        </div>

        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">All done!</h3>
            <p className="text-muted-foreground mb-4">
              {skipEvaluated
                ? "All results have been evaluated."
                : "No results need human evaluation."}
            </p>
            <div className="flex gap-2 justify-center">
              <Link href={`/runs/${runId}`}>
                <Button>Back to Run</Button>
              </Link>
              {skipEvaluated && (
                <Button
                  variant="outline"
                  onClick={() => setSkipEvaluated(false)}
                >
                  Re-evaluate All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShortcuts(false)}>
          <Card className="max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Set score 1-9</span>
                  <kbd className="px-2 py-1 bg-muted rounded">1</kbd> - <kbd className="px-2 py-1 bg-muted rounded">9</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Set score 10</span>
                  <kbd className="px-2 py-1 bg-muted rounded">0</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous</span>
                  <span><kbd className="px-2 py-1 bg-muted rounded">←</kbd> or <kbd className="px-2 py-1 bg-muted rounded">P</kbd></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Next / Skip</span>
                  <span><kbd className="px-2 py-1 bg-muted rounded">→</kbd> or <kbd className="px-2 py-1 bg-muted rounded">N</kbd></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skip</span>
                  <kbd className="px-2 py-1 bg-muted rounded">S</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Save & Next</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Save (in notes)</span>
                  <kbd className="px-2 py-1 bg-muted rounded">Ctrl+Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toggle this help</span>
                  <kbd className="px-2 py-1 bg-muted rounded">?</kbd>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => setShowShortcuts(false)}>
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/runs/${runId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Human Evaluation</h1>
            <p className="text-muted-foreground">
              {run.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <Badge variant="outline">
            {currentIndex + 1} of {resultsToEvaluate.length}
          </Badge>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipEvaluated}
              onChange={(e) => {
                setSkipEvaluated(e.target.checked);
                setCurrentIndex(0);
              }}
            />
            Skip evaluated
          </label>
        </div>
      </div>

      {/* Run Navigation */}
      <div className="flex gap-2 border-b pb-4">
        <Link href={`/runs/${runId}`}>
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Details
          </Button>
        </Link>
        <Link href={`/runs/${runId}/compare`}>
          <Button variant="ghost" size="sm">
            <GitCompare className="h-4 w-4 mr-2" />
            Compare
          </Button>
        </Link>
        <Button variant="secondary" size="sm" disabled>
          <ClipboardCheck className="h-4 w-4 mr-2" />
          Evaluate
        </Button>
        <Link href={`/runs/${runId}/judge`}>
          <Button variant="ghost" size="sm">
            <Bot className="h-4 w-4 mr-2" />
            LLM Judge
          </Button>
        </Link>
      </div>

      {/* Current Result */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{currentPrompt?.title || "Prompt"}</span>
              <Badge variant="outline">{currentPrompt?.category}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded whitespace-pre-wrap max-h-64 overflow-y-auto">
              {currentPrompt?.content}
            </pre>
            {currentPrompt?.expectedAnswer && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-1">Expected Answer</h4>
                <p className="text-sm text-muted-foreground">
                  {currentPrompt.expectedAnswer}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{currentModel?.displayName || "Response"}</span>
              <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                <Clock className="h-4 w-4" />
                {currentResult && formatDuration(currentResult.latencyMs)}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded whitespace-pre-wrap max-h-64 overflow-y-auto">
              {currentResult?.response}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Scoring */}
      <Card>
        <CardContent className="py-6">
          <div className="space-y-6">
            {/* Score slider with number buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Score <span className="text-muted-foreground text-xs">(press 1-9, 0=10)</span></Label>
                <span className="text-2xl font-bold">{score}/10</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setScore(n)}
                    className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                      score === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground text-xs">(Ctrl+Enter to save)</span></Label>
              <Textarea
                id="notes"
                placeholder="Any observations about this response..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  title="Previous (← or P)"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button variant="outline" onClick={skip} title="Skip (S)">
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEvaluation} disabled={saving} title="Save & Next (Enter)">
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {existingEval ? "Update" : "Save"} & Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${((currentIndex + 1) / resultsToEvaluate.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
