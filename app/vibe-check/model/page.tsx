"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
  Bot,
  Star,
  Filter,
  ExternalLink,
} from "lucide-react";
import { ResponseViewer } from "@/components/response-viewer";
import { 
  toViewerPrompt, 
  getResponsesForModel,
  getLatestResponsePerModel,
} from "@/lib/viewer-utils";
import { getModelMetadata, getSizeClassLabel, getSizeClassColor, getReasoningLabel } from "@/lib/model-metadata";
import type { Prompt, Model, Run, ViewerResponse } from "@/lib/types";

function ModelVibeContent() {
  const searchParams = useSearchParams();
  const initialModelId = searchParams.get("model");

  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(initialModelId);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [shuffled, setShuffled] = useState(false);

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

      // Auto-select first model with responses if none selected
      if (!initialModelId && modelsData.models?.length > 0) {
        const modelsWithResponses = modelsData.models.filter((m: Model) =>
          runsData.runs?.some((r: Run) =>
            r.results.some((res) => res.modelId === m.id)
          )
        );
        if (modelsWithResponses.length > 0) {
          setSelectedModelId(modelsWithResponses[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Get responses for selected model
  const allResponses = useMemo(() => {
    if (!selectedModelId) return [];
    return getResponsesForModel(selectedModelId, { models, prompts, runs });
  }, [selectedModelId, models, prompts, runs]);

  // Get unique responses per prompt (latest only)
  const responses = useMemo(() => {
    // Filter by category
    const promptMap = new Map(prompts.map(p => [p.id, p]));
    let filtered = allResponses;
    
    if (categoryFilter !== "all") {
      const promptIdsInCategory = prompts
        .filter(p => p.category === categoryFilter)
        .map(p => p.id);
      filtered = allResponses.filter(r => {
        // Find prompt for this response
        for (const run of runs) {
          const result = run.results.find(res => res.id === r.id);
          if (result && promptIdsInCategory.includes(result.promptId)) {
            return true;
          }
        }
        return false;
      });
    }
    
    // Get latest per prompt
    const latestByPrompt = new Map<string, ViewerResponse>();
    for (const response of filtered) {
      // Find the promptId
      for (const run of runs) {
        const result = run.results.find(res => res.id === response.id);
        if (result) {
          const existing = latestByPrompt.get(result.promptId);
          if (!existing || new Date(response.runDate) > new Date(existing.runDate)) {
            latestByPrompt.set(result.promptId, response);
          }
          break;
        }
      }
    }
    
    let result = Array.from(latestByPrompt.values());
    
    // Shuffle if requested
    if (shuffled) {
      result = [...result];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
    }
    
    return result;
  }, [allResponses, categoryFilter, shuffled, prompts, runs]);

  // Get categories from all responses
  const categories = useMemo(() => {
    const cats = new Set<string>();
    const promptMap = new Map(prompts.map(p => [p.id, p]));
    
    for (const response of allResponses) {
      for (const run of runs) {
        const result = run.results.find(res => res.id === response.id);
        if (result) {
          const prompt = promptMap.get(result.promptId);
          if (prompt) cats.add(prompt.category);
          break;
        }
      }
    }
    return Array.from(cats).sort();
  }, [allResponses, prompts, runs]);

  // Models that have responses
  const modelsWithResponses = models.filter((m) =>
    runs.some((r) => r.results.some((res) => res.modelId === m.id))
  );

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const modelMetadata = selectedModel 
    ? getModelMetadata(selectedModel.modelId, selectedModel.provider)
    : null;

  // Calculate stats
  const totalScore = responses.filter((r) => r.score).reduce((sum, r) => sum + (r.score || 0), 0);
  const scoredCount = responses.filter((r) => r.score).length;
  const avgScore = scoredCount > 0 ? totalScore / scoredCount : undefined;

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
            <h1 className="text-2xl font-bold">Model Vibe</h1>
            <p className="text-sm text-muted-foreground">
              Explore how a model performs across different prompts
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-md">
          <Select
            value={selectedModelId || ""}
            onValueChange={setSelectedModelId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {modelsWithResponses.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    {model.displayName}
                    <Badge variant="outline" className="ml-2 text-xs">
                      {model.provider}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={shuffled ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShuffled(!shuffled)}
          title="Shuffle order"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          {shuffled ? "Shuffled" : "Shuffle"}
        </Button>
      </div>

      {/* Model Stats Card */}
      {selectedModel && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                  <Bot className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h2 className="font-semibold">{selectedModel.displayName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {selectedModel.provider}
                    </Badge>
                    {modelMetadata && modelMetadata.sizeClass !== 'unknown' && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getSizeClassColor(modelMetadata.sizeClass)}`}
                      >
                        {modelMetadata.parameters || getSizeClassLabel(modelMetadata.sizeClass)}
                      </Badge>
                    )}
                    {modelMetadata && modelMetadata.reasoningCapability !== 'none' && (
                      <Badge variant="secondary" className="text-xs">
                        {getReasoningLabel(modelMetadata.reasoningCapability)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold">{responses.length}</div>
                  <div className="text-muted-foreground">Prompts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {responses.filter((r) => r.evaluated).length}
                  </div>
                  <div className="text-muted-foreground">Evaluated</div>
                </div>
                {avgScore !== undefined && (
                  <div className="text-center">
                    <div className="text-2xl font-bold flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                      {avgScore.toFixed(1)}
                    </div>
                    <div className="text-muted-foreground">Avg Score</div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Viewer */}
      {!selectedModelId ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Select a model</h3>
          <p className="text-muted-foreground">
            Choose a model above to explore its responses
          </p>
        </div>
      ) : responses.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No responses yet</h3>
          <p className="text-muted-foreground mb-4">
            Run some prompts with this model first
          </p>
          <Link href={`/runs/new?models=${selectedModelId}`}>
            <Button>Create Run</Button>
          </Link>
        </div>
      ) : (
        <ResponseViewer
          responses={responses}
          showToolbar={true}
          defaultExpanded={true}
        />
      )}
    </div>
  );
}

export default function ModelVibePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ModelVibeContent />
    </Suspense>
  );
}
