"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Shuffle,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
} from "lucide-react";
import { ResponseViewer } from "@/components/response-viewer";
import { ModelFilterDropdown } from "@/components/response-viewer/model-filter-dropdown";
import {
  toViewerPrompt,
  getResponsesForPrompt,
  groupResponsesByIteration,
  getLatestResponsePerModel,
} from "@/lib/viewer-utils";
import type { Prompt, Model, Run } from "@/lib/types";

function PromptVibeContent() {
  const searchParams = useSearchParams();
  const initialPromptId = searchParams.get("prompt");

  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(initialPromptId);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [shuffled, setShuffled] = useState(false);
  const [iterationIndex, setIterationIndex] = useState(0);
  const [showAllIterations, setShowAllIterations] = useState(false);

  useEffect(() => {
    loadData();
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

      // Auto-select first prompt with responses if none selected
      if (!initialPromptId && promptsData.prompts?.length > 0) {
        const promptsWithResponses = promptsData.prompts.filter((p: Prompt) =>
          runsData.runs?.some((r: Run) =>
            r.results.some((res) => res.promptId === p.id)
          )
        );
        if (promptsWithResponses.length > 0) {
          setSelectedPromptId(promptsWithResponses[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Get responses for selected prompt
  const allResponses = useMemo(() => {
    if (!selectedPromptId) return [];
    return getResponsesForPrompt(selectedPromptId, { models, prompts, runs });
  }, [selectedPromptId, models, prompts, runs]);

  // Get models that have responses for this prompt
  const modelsWithResponses = useMemo(() => {
    const modelIds = new Set(allResponses.map((r) => r.modelId));
    return models.filter((m) => modelIds.has(m.id));
  }, [allResponses, models]);

  // Initialize selected models when prompt changes or models load
  useEffect(() => {
    if (modelsWithResponses.length > 0 && selectedModelIds.size === 0) {
      setSelectedModelIds(new Set(modelsWithResponses.map((m) => m.id)));
    }
  }, [modelsWithResponses, selectedModelIds.size]);

  // Reset model selection when prompt changes
  useEffect(() => {
    if (selectedPromptId) {
      // Will be repopulated by the effect above
      setSelectedModelIds(new Set());
    }
  }, [selectedPromptId]);

  // Group by iteration or get latest per model, then filter by selected models
  const { responses, maxIterations } = useMemo(() => {
    // First filter by selected models
    const modelFilteredResponses = selectedModelIds.size > 0
      ? allResponses.filter((r) => selectedModelIds.has(r.modelId))
      : allResponses;

    if (showAllIterations) {
      return { responses: modelFilteredResponses, maxIterations: 1 };
    }

    const grouped = groupResponsesByIteration(modelFilteredResponses);
    const iterations = Array.from(grouped.keys()).sort((a, b) => b - a);
    const maxIter = iterations.length;

    if (maxIter === 0) {
      return { responses: [], maxIterations: 0 };
    }

    const currentIteration = iterations[Math.min(iterationIndex, maxIter - 1)];
    let iterationResponses = grouped.get(currentIteration) || [];

    // Get one response per model for this iteration
    iterationResponses = getLatestResponsePerModel(iterationResponses);

    // Shuffle if requested
    if (shuffled) {
      iterationResponses = [...iterationResponses];
      for (let i = iterationResponses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [iterationResponses[i], iterationResponses[j]] = [iterationResponses[j], iterationResponses[i]];
      }
    }

    return { responses: iterationResponses, maxIterations: maxIter };
  }, [allResponses, selectedModelIds, iterationIndex, shuffled, showAllIterations]);

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);
  const viewerPrompt = selectedPrompt ? toViewerPrompt(selectedPrompt) : undefined;

  // Prompts that have responses
  const promptsWithResponses = prompts.filter((p) =>
    runs.some((r) => r.results.some((res) => res.promptId === p.id))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vibe-check">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Prompt Vibe</h1>
            <p className="text-sm text-muted-foreground">
              Compare how different models respond to the same prompt
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-md">
          <Select
            value={selectedPromptId || ""}
            onValueChange={(v) => {
              setSelectedPromptId(v);
              setIterationIndex(0);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a prompt" />
            </SelectTrigger>
            <SelectContent>
              {promptsWithResponses.map((prompt) => (
                <SelectItem key={prompt.id} value={prompt.id}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {prompt.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Iteration Navigation */}
        {maxIterations > 1 && !showAllIterations && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIterationIndex(Math.max(0, iterationIndex - 1))}
              disabled={iterationIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              Run {iterationIndex + 1} / {maxIterations}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIterationIndex(Math.min(maxIterations - 1, iterationIndex + 1))}
              disabled={iterationIndex >= maxIterations - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Button
          variant={shuffled ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShuffled(!shuffled)}
          title="Shuffle order to avoid position bias"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          {shuffled ? "Shuffled" : "Shuffle"}
        </Button>

        {/* Model Filter */}
        {modelsWithResponses.length > 0 && (
          <ModelFilterDropdown
            models={modelsWithResponses}
            selectedModelIds={selectedModelIds}
            onSelectionChange={setSelectedModelIds}
          />
        )}

        {selectedPromptId && (
          <Link href={`/prompts/${selectedPromptId}`}>
            <Button variant="ghost" size="sm">
              View Prompt
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>

      {/* Response Viewer */}
      {!selectedPromptId ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Select a prompt</h3>
          <p className="text-muted-foreground">
            Choose a prompt above to compare model responses
          </p>
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No responses yet</h3>
          <p className="text-muted-foreground mb-4">
            Run this prompt against some models first
          </p>
          <Link href={`/runs/new?prompts=${selectedPromptId}`}>
            <Button>Create Run</Button>
          </Link>
        </div>
      ) : (
        <ResponseViewer
          prompt={viewerPrompt}
          responses={responses}
          showToolbar={true}
          defaultExpanded={true}
        />
      )}
    </div>
  );
}

export default function PromptVibePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <PromptVibeContent />
    </Suspense>
  );
}
