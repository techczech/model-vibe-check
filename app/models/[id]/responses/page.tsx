"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  Sparkles,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";
import { ResponseViewer } from "@/components/response-viewer";
import { 
  getResponsesForModel,
} from "@/lib/viewer-utils";
import { getModelMetadata, getSizeClassLabel, getReasoningLabel } from "@/lib/model-metadata";
import type { Prompt, Model, Run, RubricEvaluation, ViewerResponse } from "@/lib/types";

function ModelResponsesContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const modelId = params.id as string;

  const [model, setModel] = useState<Model | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [rubricEvaluations, setRubricEvaluations] = useState<RubricEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
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

        const allPrompts = promptsData.prompts || [];
        const allModels = modelsData.models || [];
        const allRuns = runsData.runs || [];
        const allEvals = evalsData.evaluations || [];

        setPrompts(allPrompts);
        setModels(allModels);
        setRuns(allRuns);
        setRubricEvaluations(allEvals);

        const foundModel = allModels.find((m: Model) => m.id === modelId);
        setModel(foundModel || null);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [modelId]);

  // Get responses for this model
  const allResponses = useMemo(() => {
    if (!model) return [];
    
    return getResponsesForModel(modelId, {
      models,
      prompts,
      runs,
      evaluations: rubricEvaluations.map(e => ({
        responseId: e.responseId,
        impressionScore: e.impressionScore,
      })),
    });
  }, [modelId, model, models, prompts, runs, rubricEvaluations]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(allResponses.map(r => r.promptCategory).filter((c): c is string => Boolean(c)));
    return Array.from(cats).sort();
  }, [allResponses]);

  // Filter responses by category
  const displayResponses = useMemo(() => {
    if (categoryFilter === "all") {
      return allResponses;
    }
    return allResponses.filter(r => r.promptCategory === categoryFilter);
  }, [allResponses, categoryFilter]);

  // Model metadata
  const modelMetadata = useMemo(() => {
    if (!model) return null;
    return getModelMetadata(model.modelId);
  }, [model]);

  // Stats
  const stats = useMemo(() => {
    const evaluated = allResponses.filter(r => r.evaluated).length;
    const avgScore = allResponses
      .filter(r => r.score !== undefined)
      .reduce((sum, r, _, arr) => sum + (r.score || 0) / arr.length, 0);
    
    return {
      total: allResponses.length,
      evaluated,
      avgScore: avgScore || undefined,
      prompts: new Set(allResponses.map(r => r.promptId)).size,
    };
  }, [allResponses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Model not found</p>
        <Link href="/models" className="text-primary hover:underline">
          Back to models
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/models">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{model.displayName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{model.provider}</Badge>
              {modelMetadata && (
                <>
                  <Badge variant="secondary">
                    {getSizeClassLabel(modelMetadata.sizeClass)}
                  </Badge>
                  {modelMetadata.reasoningCapability !== "none" && (
                    <Badge variant="secondary">
                      {getReasoningLabel(modelMetadata.reasoningCapability)}
                    </Badge>
                  )}
                </>
              )}
              <span className="text-sm text-muted-foreground">
                {stats.total} responses across {stats.prompts} prompts
              </span>
            </div>
          </div>
        </div>

        {/* Vibe Check Links */}
        <div className="flex gap-2">
          <Link href={`/vibe-check/model?model=${modelId}`}>
            <Button variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Model Vibe
            </Button>
          </Link>
          <Link href={`/vibe-check/blind`}>
            <Button variant="outline">
              <EyeOff className="h-4 w-4 mr-2" />
              Blind Review
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats & Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Stats */}
            <div className="flex items-center gap-6">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Responses</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.evaluated}</div>
                <div className="text-sm text-muted-foreground">Evaluated</div>
              </div>
              {stats.avgScore !== undefined && (
                <div>
                  <div className="text-2xl font-bold">{stats.avgScore.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Avg Score</div>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              {categories.length > 1 && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Viewer */}
      {displayResponses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No responses yet from this model.</p>
            <Link href="/runs/new">
              <Button>Run a Vibe Check</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ResponseViewer
          responses={displayResponses}
          showToolbar={true}
          defaultExpanded={true}
        />
      )}
    </div>
  );
}

export default function ModelResponsesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <ModelResponsesContent />
    </Suspense>
  );
}
