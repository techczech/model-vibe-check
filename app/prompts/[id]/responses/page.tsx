"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Bot,
  User,
  Sparkles,
  Shuffle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ResponseViewer } from "@/components/response-viewer";
import { 
  toViewerPrompt, 
  getResponsesForPrompt,
  groupResponsesByIteration,
  getLatestResponsePerModel,
} from "@/lib/viewer-utils";
import { EvaluationForm } from "@/components/evaluation-form";
import { useToast } from "@/hooks/use-toast";
import type { Prompt, Model, Run, Rubric, RubricEvaluation, ViewerResponse } from "@/lib/types";

function PromptResponsesContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const promptId = params.id as string;
  const { toast } = useToast();

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [rubricEvaluations, setRubricEvaluations] = useState<RubricEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  // View controls
  const [showLatestOnly, setShowLatestOnly] = useState(true);
  const [shuffleOrder, setShuffleOrder] = useState(false);
  const [currentIteration, setCurrentIteration] = useState(0);

  // Evaluation state
  const [evaluatingResponseId, setEvaluatingResponseId] = useState<string | null>(null);
  const [selectedRubricId, setSelectedRubricId] = useState<string | null>(null);
  const [judging, setJudging] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Load all data
        const [promptsRes, modelsRes, runsRes, rubricsRes, evalsRes] = await Promise.all([
          fetch("/api/prompts"),
          fetch("/api/models"),
          fetch("/api/runs"),
          fetch("/api/rubrics"),
          fetch("/api/evaluations"),
        ]);
        
        const [promptsData, modelsData, runsData, rubricsData, evalsData] = await Promise.all([
          promptsRes.json(),
          modelsRes.json(),
          runsRes.json(),
          rubricsRes.json(),
          evalsRes.json(),
        ]);

        const allPrompts = promptsData.prompts || [];
        const allModels = modelsData.models || [];
        const allRuns = runsData.runs || [];
        const allRubrics = rubricsData.rubrics || [];
        const allEvals = evalsData.evaluations || [];

        setPrompts(allPrompts);
        setModels(allModels);
        setRuns(allRuns);
        setRubrics(allRubrics);
        setRubricEvaluations(allEvals);

        // Find the specific prompt
        const foundPrompt = allPrompts.find((p: Prompt) => p.id === promptId);
        setPrompt(foundPrompt || null);

        // Set default rubric
        const defaultRubric = allRubrics.find(
          (r: Rubric) => r.id === foundPrompt?.rubricId
        ) || allRubrics.find((r: Rubric) => r.id === "general-quality");
        if (defaultRubric) {
          setSelectedRubricId(defaultRubric.id);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [promptId]);

  // Get all responses for this prompt
  const allResponses = useMemo(() => {
    return getResponsesForPrompt(promptId, { 
      models, 
      prompts, 
      runs, 
      evaluations: rubricEvaluations.map(e => ({
        responseId: e.responseId,
        impressionScore: e.impressionScore,
      }))
    });
  }, [promptId, models, prompts, runs, rubricEvaluations]);

  // Group by iteration
  const iterationGroups = useMemo(() => {
    return groupResponsesByIteration(allResponses);
  }, [allResponses]);

  // Get responses to display
  const displayResponses = useMemo(() => {
    let responses: ViewerResponse[];
    
    if (showLatestOnly) {
      responses = getLatestResponsePerModel(allResponses);
    } else if (iterationGroups.size > 0) {
      responses = iterationGroups.get(currentIteration) || [];
    } else {
      responses = allResponses;
    }
    
    if (shuffleOrder) {
      // Fisher-Yates shuffle with stable seed based on promptId
      const shuffled = [...responses];
      const seed = promptId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      let m = shuffled.length;
      let t, i;
      let random = seed;
      while (m) {
        random = (random * 1103515245 + 12345) & 0x7fffffff;
        i = random % m--;
        t = shuffled[m];
        shuffled[m] = shuffled[i];
        shuffled[i] = t;
      }
      return shuffled;
    }
    
    return responses;
  }, [allResponses, showLatestOnly, shuffleOrder, iterationGroups, currentIteration, promptId]);

  // Viewer prompt
  const viewerPrompt = useMemo(() => {
    return prompt ? toViewerPrompt(prompt) : undefined;
  }, [prompt]);

  // Evaluation stats
  const evalStats = useMemo(() => {
    const humanEvaluatedIds = new Set(
      rubricEvaluations.filter((e) => e.evaluatorType === "human").map((e) => e.responseId)
    );
    const llmEvaluatedIds = new Set(
      rubricEvaluations.filter((e) => e.evaluatorType === "llm").map((e) => e.responseId)
    );
    const responseIds = new Set(allResponses.map((r) => r.id));
    const evaluated = [...responseIds].filter(
      (id) => humanEvaluatedIds.has(id) || llmEvaluatedIds.has(id)
    );
    return {
      human: [...responseIds].filter((id) => humanEvaluatedIds.has(id)).length,
      llm: [...responseIds].filter((id) => llmEvaluatedIds.has(id)).length,
      total: evaluated.length,
      pending: responseIds.size - evaluated.length,
    };
  }, [allResponses, rubricEvaluations]);

  // Unevaluated response IDs
  const unevaluatedIds = useMemo(() => {
    const evaluatedIds = new Set(rubricEvaluations.map((e) => e.responseId));
    return allResponses
      .filter((r) => !evaluatedIds.has(r.id))
      .map((r) => r.id);
  }, [allResponses, rubricEvaluations]);

  const goToNextUnevaluated = useCallback(() => {
    if (unevaluatedIds.length === 0) return;
    
    if (evaluatingResponseId) {
      const currentIndex = unevaluatedIds.indexOf(evaluatingResponseId);
      const nextIndex = (currentIndex + 1) % unevaluatedIds.length;
      setEvaluatingResponseId(unevaluatedIds[nextIndex]);
    } else {
      setEvaluatingResponseId(unevaluatedIds[0]);
    }
  }, [unevaluatedIds, evaluatingResponseId]);

  async function submitEvaluation(evaluation: Omit<RubricEvaluation, "id" | "createdAt">) {
    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evaluation),
    });
    const data = await res.json();
    if (data.evaluation) {
      setRubricEvaluations((prev) => [...prev, data.evaluation]);
      toast({
        type: "success",
        title: "Evaluation saved",
        description: "Your evaluation has been recorded.",
      });
    } else {
      toast({
        type: "error",
        title: "Failed to save",
        description: data.error || "Something went wrong.",
      });
      throw new Error(data.error || "Failed to save evaluation");
    }
  }

  async function runLLMJudge(responseId: string) {
    if (!selectedRubricId) return;
    
    const judgeModel = models.find((m) => m.isActive);
    if (!judgeModel) {
      toast({
        type: "error",
        title: "No models available",
        description: "Configure at least one active model to use as a judge.",
      });
      return;
    }

    setJudging(responseId);
    try {
      const res = await fetch("/api/evaluations/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId,
          rubricId: selectedRubricId,
          judgeModelId: judgeModel.id,
        }),
      });
      const data = await res.json();
      if (data.evaluation) {
        setRubricEvaluations((prev) => [...prev, data.evaluation]);
        toast({
          type: "success",
          title: "LLM judge complete",
          description: `Evaluated by ${judgeModel.displayName}`,
        });
      } else if (data.error) {
        toast({
          type: "error",
          title: "Judge failed",
          description: data.error,
        });
      }
    } catch (error) {
      toast({
        type: "error",
        title: "Judge failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setJudging(null);
    }
  }

  const currentRubric = rubrics.find((r) => r.id === selectedRubricId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Prompt not found</p>
        <Link href="/prompts" className="text-primary hover:underline">
          Back to prompts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/prompts/${promptId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{prompt.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{prompt.category}</Badge>
              <span className="text-sm text-muted-foreground">
                {allResponses.length} responses from {new Set(allResponses.map(r => r.modelId)).size} models
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/vibe-check/prompt?prompt=${promptId}`}>
            <Button variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Full Vibe Check
            </Button>
          </Link>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: View controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select
                  value={showLatestOnly ? "latest" : "iteration"}
                  onValueChange={(v) => setShowLatestOnly(v === "latest")}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest per model</SelectItem>
                    <SelectItem value="iteration">By iteration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {!showLatestOnly && iterationGroups.size > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentIteration(Math.max(0, currentIteration - 1))}
                    disabled={currentIteration === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Iteration {currentIteration + 1} of {iterationGroups.size}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentIteration(Math.min(iterationGroups.size - 1, currentIteration + 1))}
                    disabled={currentIteration === iterationGroups.size - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button
                variant={shuffleOrder ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShuffleOrder(!shuffleOrder)}
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Shuffle
              </Button>
            </div>

            {/* Right: Evaluation controls */}
            <div className="flex items-center gap-3">
              {rubrics.length > 0 && (
                <Select
                  value={selectedRubricId || ""}
                  onValueChange={setSelectedRubricId}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select rubric" />
                  </SelectTrigger>
                  <SelectContent>
                    {rubrics.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                {evalStats.human > 0 && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />{evalStats.human}
                  </span>
                )}
                {evalStats.llm > 0 && (
                  <span className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />{evalStats.llm}
                  </span>
                )}
                <span>{evalStats.total}/{allResponses.length} evaluated</span>
              </span>

              {unevaluatedIds.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextUnevaluated}
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Evaluate ({unevaluatedIds.length})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses */}
      {allResponses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No responses yet for this prompt.</p>
            <Link href="/runs/new">
              <Button>Run a Vibe Check</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ResponseViewer
          prompt={viewerPrompt}
          responses={displayResponses}
          showToolbar={true}
          defaultExpanded={true}
        />
      )}

      {/* Evaluation Modal */}
      {evaluatingResponseId && currentRubric && prompt && (() => {
        const evaluatingResponse = allResponses.find(r => r.id === evaluatingResponseId);
        if (!evaluatingResponse) return null;
        
        const existingEval = rubricEvaluations.find(
          (e) => e.responseId === evaluatingResponseId && e.evaluatorType === "human"
        );
        
        return (
          <EvaluationForm
            responseId={evaluatingResponseId}
            response={{
              content: evaluatingResponse.content,
              modelName: evaluatingResponse.modelName,
              provider: evaluatingResponse.provider || "unknown",
              runDate: evaluatingResponse.runDate || "",
              iteration: evaluatingResponse.iteration || 0,
              latencyMs: evaluatingResponse.latencyMs ?? 0,
              tokensOutput: evaluatingResponse.tokensOutput ?? 0,
            }}
            promptContent={prompt.content}
            rubric={currentRubric}
            existingEvaluation={existingEval}
            onSubmit={submitEvaluation}
            onClose={() => setEvaluatingResponseId(null)}
            onNext={goToNextUnevaluated}
            hasNext={unevaluatedIds.length > 1 || (unevaluatedIds.length === 1 && unevaluatedIds[0] !== evaluatingResponseId)}
          />
        );
      })()}
    </div>
  );
}

export default function PromptResponsesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <PromptResponsesContent />
    </Suspense>
  );
}
