"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { ResponseViewer } from "@/components/response-viewer";
import { toViewerPrompt, getUnevaluatedResponses } from "@/lib/viewer-utils";
import type { Prompt, Model, Run, ViewerResponse } from "@/lib/types";

export default function BlindReviewPage() {
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [evaluatedIds, setEvaluatedIds] = useState<Set<string>>(new Set());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [promptsRes, modelsRes, runsRes, evalsRes] = await Promise.all([
        fetch("/api/prompts"),
        fetch("/api/models"),
        fetch("/api/runs"),
        fetch("/api/evaluations"),
      ]);
      const [promptsData, modelsData, runsData, evalsData] = await Promise.all([
        promptsRes.json(),
        modelsRes.json(),
        runsRes.json(),
        evalsRes.json(),
      ]);
      setPrompts(promptsData.prompts || []);
      setModels(modelsData.models || []);
      setRuns(runsData.runs || []);

      // Track which responses have been evaluated
      const evaluated = new Set<string>();
      for (const run of runsData.runs || []) {
        for (const e of run.evaluations) {
          evaluated.add(e.resultId);
        }
      }
      // Also check rubric evaluations
      for (const e of evalsData.evaluations || []) {
        evaluated.add(e.responseId);
      }
      setEvaluatedIds(evaluated);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Build queue of unevaluated responses (shuffled)
  const queue = useMemo(() => {
    const responses = getUnevaluatedResponses({ models, prompts, runs });
    // Filter out skipped responses
    return responses.filter(r => !skipped.has(r.id) && !evaluatedIds.has(r.id));
  }, [models, prompts, runs, skipped, evaluatedIds]);

  const currentResponse = queue[currentIndex];
  const progressPercent = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 100;

  // Get prompt for current response
  const currentPrompt = useMemo(() => {
    if (!currentResponse) return undefined;
    // Find the prompt ID from runs
    for (const run of runs) {
      const result = run.results.find(r => r.id === currentResponse.id);
      if (result) {
        const prompt = prompts.find(p => p.id === result.promptId);
        return prompt ? toViewerPrompt(prompt) : undefined;
      }
    }
    return undefined;
  }, [currentResponse, runs, prompts]);

  const handleNext = useCallback(() => {
    setRevealed(false);
    setSelectedScore(null);
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, queue.length]);

  const handlePrev = useCallback(() => {
    setRevealed(false);
    setSelectedScore(null);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleSkip = useCallback(() => {
    if (currentResponse) {
      setSkipped((prev) => new Set([...prev, currentResponse.id]));
    }
    handleNext();
  }, [currentResponse, handleNext]);

  const handleScore = async (score: number) => {
    if (!currentResponse || saving) return;

    setSelectedScore(score);
    setSaving(true);

    try {
      // Save the evaluation
      const evaluation = {
        id: `blind-${currentResponse.id}-${Date.now()}`,
        responseId: currentResponse.id,
        rubricId: "quick-score",
        evaluatedBy: "human",
        evaluatedAt: new Date().toISOString(),
        impressionScore: score,
        itemResults: [],
        notes: "Blind review quick score",
      };

      await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evaluation),
      });

      // Mark as evaluated
      setEvaluatedIds((prev) => new Set([...prev, currentResponse.id]));

      // Brief delay to show the selection, then move to next
      setTimeout(() => {
        handleNext();
      }, 300);
    } catch (error) {
      console.error("Failed to save evaluation:", error);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Number keys 1-9 for scoring
      if (e.key >= "1" && e.key <= "9" && !revealed) {
        handleScore(parseInt(e.key));
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          handlePrev();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "r":
        case "R":
          setRevealed(!revealed);
          break;
        case "s":
        case "S":
          handleSkip();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleSkip, revealed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vibe-check">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Blind Review</h1>
            <p className="text-sm text-muted-foreground">
              Rate responses without knowing which model produced them
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
              Hide Model
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Reveal Model
            </>
          )}
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {currentIndex + 1} of {queue.length} responses
          </span>
          <span className="text-muted-foreground">
            {evaluatedIds.size} evaluated total
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Main Content */}
      {queue.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground mb-4">
              No more responses to review. Run more prompts to generate new responses.
            </p>
            <Link href="/runs/new">
              <Button>Create New Run</Button>
            </Link>
          </CardContent>
        </Card>
      ) : currentResponse ? (
        <>
          {/* Response Viewer (single response, blind mode) */}
          <ResponseViewer
            prompt={currentPrompt}
            responses={[currentResponse]}
            isBlind={!revealed}
            showToolbar={false}
            defaultExpanded={true}
          />

          {/* Scoring */}
          <Card>
            <CardContent className="py-4">
              <p className="text-sm font-medium mb-3 text-center">
                Rate this response (1-9):
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((score) => (
                  <Button
                    key={score}
                    variant={selectedScore === score ? "default" : "outline"}
                    size="lg"
                    className="w-12 h-12 text-lg font-semibold"
                    onClick={() => handleScore(score)}
                    disabled={saving}
                  >
                    {score}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Press 1-9 on keyboard to score quickly
              </p>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Button variant="ghost" onClick={handleSkip}>
              <SkipForward className="h-4 w-4 mr-2" />
              Skip for now
            </Button>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentIndex >= queue.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Keyboard hints */}
          <p className="text-xs text-center text-muted-foreground">
            Keyboard: ← Previous · → Next · R Reveal · S Skip · 1-9 Score
          </p>
        </>
      ) : null}
    </div>
  );
}
