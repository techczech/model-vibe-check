"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Play,
  RefreshCw,
  AlertCircle,
  Download,
  MessageSquare,
  FileText,
  Cpu,
  Calendar,
  Hash,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Eye,
  GitCompare,
  ClipboardCheck,
  Bot,
  Square,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import { ResponseViewer } from "@/components/response-viewer";
import { toViewerPrompt, getResponsesForPrompt } from "@/lib/viewer-utils";
import { ConversationThread, groupSequenceResults } from "@/components/conversation-thread";
import type { Run, Prompt, Model, ViewerResponse, PromptSequence } from "@/lib/types";

export default function RunDetailPage() {
  const params = useParams();
  const runId = params.id as string;

  const [run, setRun] = useState<Run | null>(null);
  const [prompts, setPrompts] = useState<Record<string, Prompt>>({});
  const [models, setModels] = useState<Record<string, Model>>({});
  const [sequences, setSequences] = useState<Record<string, PromptSequence>>({});
  const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [allSequences, setAllSequences] = useState<PromptSequence[]>([]);
  const [allRuns, setAllRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Expanded prompt for inline viewing
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [expandedResponses, setExpandedResponses] = useState<ViewerResponse[]>([]);

  const loadData = useCallback(async () => {
    try {
      // Load run
      const runRes = await fetch(`/api/runs/${runId}`);
      const runData = await runRes.json();
      setRun(runData.run || runData);

      // Load prompts, models, sequences for display names
      const [promptsRes, modelsRes, sequencesRes, runsRes] = await Promise.all([
        fetch("/api/prompts"),
        fetch("/api/models"),
        fetch("/api/sequences"),
        fetch("/api/runs"),
      ]);
      const promptsData = await promptsRes.json();
      const modelsData = await modelsRes.json();
      const sequencesData = await sequencesRes.json();
      const runsData = await runsRes.json();

      const promptsList = promptsData.prompts || [];
      const modelsList = modelsData.models || [];
      const sequencesList = sequencesData.sequences || [];
      const runsList = runsData.runs || [];

      setAllPrompts(promptsList);
      setAllModels(modelsList);
      setAllSequences(sequencesList);
      setAllRuns(runsList);

      // Index by ID
      const promptIndex: Record<string, Prompt> = {};
      promptsList.forEach((p: Prompt) => {
        promptIndex[p.id] = p;
      });
      setPrompts(promptIndex);

      const modelIndex: Record<string, Model> = {};
      modelsList.forEach((m: Model) => {
        modelIndex[m.id] = m;
      });
      setModels(modelIndex);

      const sequenceIndex: Record<string, PromptSequence> = {};
      sequencesList.forEach((s: PromptSequence) => {
        sequenceIndex[s.id] = s;
      });
      setSequences(sequenceIndex);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll for updates while running
  useEffect(() => {
    if (run?.status === "running") {
      const interval = setInterval(loadData, 2000);
      return () => clearInterval(interval);
    }
  }, [run?.status, loadData]);

  // Load responses for expanded prompt
  useEffect(() => {
    if (expandedPromptId && run) {
      const prompt = prompts[expandedPromptId];
      if (prompt) {
        // Filter runs to only this run
        const thisRun = [run];
        const responses = getResponsesForPrompt(
          expandedPromptId,
          { models: allModels, prompts: allPrompts, runs: thisRun }
        );
        setExpandedResponses(responses);
      }
    }
  }, [expandedPromptId, run, prompts, allModels, allPrompts]);

  async function executeRun() {
    setExecuting(true);
    try {
      const res = await fetch(`/api/runs/${runId}/execute`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.run) {
        setRun(data.run);
      }
    } catch (error) {
      console.error("Execution failed:", error);
    } finally {
      setExecuting(false);
      loadData();
    }
  }

  async function cancelRun() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/runs/${runId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (error) {
      console.error("Cancel failed:", error);
    } finally {
      setCancelling(false);
    }
  }

  function downloadExport(format: "csv" | "json") {
    window.open(`/api/runs/${runId}/stats?format=${format}`, "_blank");
  }

  // Get response counts per prompt
  function getResponseCountForPrompt(promptId: string): number {
    return run?.results.filter((r) => r.promptId === promptId).length || 0;
  }

  // Get response counts per model
  function getResponseCountForModel(modelId: string): number {
    return run?.results.filter((r) => r.modelId === modelId).length || 0;
  }

  // Toggle expanded prompt
  function toggleExpandPrompt(promptId: string) {
    if (expandedPromptId === promptId) {
      setExpandedPromptId(null);
      setExpandedResponses([]);
    } else {
      setExpandedPromptId(promptId);
    }
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
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Run not found</h2>
        <Link href="/runs" className="text-primary hover:underline">
          Back to runs
        </Link>
      </div>
    );
  }

  const totalCombinations = run.promptIds.length * run.modelIds.length * run.iterations;
  const completedCount = run.results.length;
  const errorCount = run.results.filter((r) => r.error).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/runs">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{run.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(run.createdAt)}</span>
              <span>•</span>
              <Hash className="h-4 w-4" />
              <span>{run.iterations} iteration{run.iterations !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        <Badge
          variant={
            run.status === "completed"
              ? "default"
              : run.status === "failed"
              ? "destructive"
              : run.status === "running"
              ? "secondary"
              : run.status === "cancelled"
              ? "warning"
              : "outline"
          }
        >
          {run.status === "running" && (
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          )}
          {run.status === "cancelled" && (
            <Square className="h-3 w-3 mr-1" />
          )}
          {run.status}
        </Badge>
      </div>

      {/* Run Navigation */}
      {run.results.length > 0 && (
        <div className="flex gap-2 border-b pb-4">
          <Button variant="secondary" size="sm" disabled>
            <FileText className="h-4 w-4 mr-2" />
            Details
          </Button>
          <Link href={`/runs/${runId}/compare`}>
            <Button variant="ghost" size="sm">
              <GitCompare className="h-4 w-4 mr-2" />
              Compare
            </Button>
          </Link>
          <Link href={`/runs/${runId}/evaluate`}>
            <Button variant="ghost" size="sm">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Evaluate
            </Button>
          </Link>
          <Link href={`/runs/${runId}/judge`}>
            <Button variant="ghost" size="sm">
              <Bot className="h-4 w-4 mr-2" />
              LLM Judge
            </Button>
          </Link>
        </div>
      )}

      {/* Run Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-2xl font-bold">{run.promptIds.length}</div>
              <p className="text-sm text-muted-foreground">Prompts</p>
            </div>
            <div>
              <div className="text-2xl font-bold">{run.modelIds.length}</div>
              <p className="text-sm text-muted-foreground">Models</p>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {completedCount}
                <span className="text-base font-normal text-muted-foreground">
                  /{totalCombinations}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Responses
                {errorCount > 0 && (
                  <span className="text-destructive"> ({errorCount} errors)</span>
                )}
              </p>
            </div>
            <div>
              <div className="text-2xl font-bold">{run.evaluations.length}</div>
              <p className="text-sm text-muted-foreground">Evaluations</p>
            </div>
          </div>
          {run.status === "running" && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Execution Progress</span>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} error{errorCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <Progress
                value={(completedCount / totalCombinations) * 100}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{completedCount} of {totalCombinations} responses</span>
                <span>{Math.round((completedCount / totalCombinations) * 100)}%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(run.status === "pending" || run.status === "failed") && (
                <Button onClick={executeRun} disabled={executing}>
                  {executing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      {run.status === "failed" ? "Retry" : "Execute Run"}
                    </>
                  )}
                </Button>
              )}
              {run.status === "running" && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 max-w-md">
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Progress
                        value={(completedCount / totalCombinations) * 100}
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{completedCount} of {totalCombinations} complete</span>
                        <span>{Math.round((completedCount / totalCombinations) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {errorCount} error{errorCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelRun}
                    disabled={cancelling || run.cancelRequested}
                  >
                    {cancelling ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : run.cancelRequested ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Stopping...
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Cancel
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {run.results.length > 0 && (
                <>
                  <Link href={`/vibe-check/prompt?run=${runId}`}>
                    <Button variant="outline" size="sm">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Vibe Check
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => downloadExport("csv")}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadExport("json")}>
                    <Download className="h-4 w-4 mr-2" />
                    JSON
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors Section */}
      {errorCount > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Errors ({errorCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {run.results
                .filter((r) => r.error)
                .slice(0, 20)
                .map((result) => {
                  const model = models[result.modelId];
                  const prompt = prompts[result.promptId];
                  return (
                    <div
                      key={result.id}
                      className="text-sm p-2 bg-destructive/5 rounded border border-destructive/20"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <span className="font-medium">
                          {model?.displayName || result.modelId}
                        </span>
                        <span>•</span>
                        <span className="truncate">
                          {prompt?.title || result.promptId}
                        </span>
                        {run.iterations > 1 && (
                          <>
                            <span>•</span>
                            <span>Iteration {result.iteration + 1}</span>
                          </>
                        )}
                      </div>
                      <p className="text-destructive text-xs font-mono">
                        {result.error}
                      </p>
                    </div>
                  );
                })}
              {errorCount > 20 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  ... and {errorCount - 20} more errors
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Browse Responses */}
      {run.results.length > 0 && (
        <>
          {/* By Prompt */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Prompts in this Run
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {run.promptIds.map((promptId) => {
                const prompt = prompts[promptId];
                const count = getResponseCountForPrompt(promptId);
                const isExpanded = expandedPromptId === promptId;
                
                return (
                  <div key={promptId} className="border rounded-lg">
                    <div
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => toggleExpandPrompt(promptId)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {prompt?.title || promptId}
                        </p>
                        {prompt?.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {prompt.category}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {count} response{count !== 1 ? "s" : ""}
                        </Badge>
                        <Link 
                          href={`/vibe-check/prompt?prompt=${promptId}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <Sparkles className="h-4 w-4 mr-1" />
                            Compare
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Inline ResponseViewer */}
                    {isExpanded && expandedResponses.length > 0 && (
                      <div className="border-t p-4 bg-muted/30">
                        <ResponseViewer
                          prompt={prompt ? toViewerPrompt(prompt) : undefined}
                          responses={expandedResponses}
                          showToolbar={true}
                          defaultExpanded={false}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* By Model */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Models in this Run
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {run.modelIds.map((modelId) => {
                const model = models[modelId];
                const count = getResponseCountForModel(modelId);
                
                return (
                  <div
                    key={modelId}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {model?.displayName || modelId}
                      </p>
                      {model?.provider && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {model.provider}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        {count} response{count !== 1 ? "s" : ""}
                      </Badge>
                      <Link href={`/vibe-check/model?model=${modelId}`}>
                        <Button variant="ghost" size="sm">
                          <Sparkles className="h-4 w-4 mr-1" />
                          Explore
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Sequences in this Run */}
          {run.sequenceIds && run.sequenceIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Sequences in this Run
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  // Get sequence results grouped by sequence/model/iteration
                  const sequenceResults = run.results.filter((r) => r.sequenceId);
                  const grouped = groupSequenceResults(
                    sequenceResults,
                    allSequences,
                    run.evaluations,
                    (modelId) => models[modelId]?.displayName || modelId
                  );

                  if (grouped.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No sequence results yet
                      </p>
                    );
                  }

                  return grouped.map((group, idx) => (
                    <ConversationThread
                      key={`${group.sequence.id}-${group.modelId}-${group.iteration}-${idx}`}
                      sequence={group.sequence}
                      results={group.results}
                      evaluations={group.evaluations}
                      modelName={group.modelName}
                      defaultExpanded={grouped.length <= 3}
                    />
                  ));
                })()}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty state for pending runs */}
      {run.status === "pending" && run.results.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Ready to run</h3>
            <p className="text-muted-foreground mb-4">
              This will generate {totalCombinations} responses
              ({run.promptIds.length} prompts × {run.modelIds.length} models × {run.iterations} iterations)
            </p>
            <Button onClick={executeRun} disabled={executing}>
              <Play className="h-4 w-4 mr-2" />
              Execute Run
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
