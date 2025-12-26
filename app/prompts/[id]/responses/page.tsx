"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
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
  GitCompare,
  Calendar,
  Hash,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Plus,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Prompt, Model, Evaluation } from "@/lib/types";

interface ResponseWithMeta {
  id: string;
  promptId: string;
  modelId: string;
  iteration: number;
  response: string;
  latencyMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  error?: string;
  createdAt: string;
  runId: string;
  runName: string;
  runDate: string;
}

interface GroupedResponses {
  modelId: string;
  modelName: string;
  provider: string;
  responses: ResponseWithMeta[];
}

// A column in compare mode - tracks model and which response is shown
interface CompareColumn {
  modelId: string;
  responseId: string; // which specific response is shown
}

export default function PromptResponsesPage() {
  const params = useParams();
  const promptId = params.id as string;

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [models, setModels] = useState<Record<string, Model>>({});
  const [responses, setResponses] = useState<ResponseWithMeta[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection for comparison
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  
  // Compare columns - each tracks which model and which response
  const [compareColumns, setCompareColumns] = useState<CompareColumn[]>([]);

  // Expanded responses (show full text)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      try {
        // Load prompt
        const promptRes = await fetch(`/api/prompts?id=${promptId}`);
        const promptData = await promptRes.json();
        const foundPrompt = promptData.prompts?.find((p: Prompt) => p.id === promptId);
        setPrompt(foundPrompt || null);

        // Load models
        const modelsRes = await fetch("/api/models");
        const modelsData = await modelsRes.json();
        const modelIndex: Record<string, Model> = {};
        (modelsData.models || []).forEach((m: Model) => {
          modelIndex[m.id] = m;
        });
        setModels(modelIndex);

        // Load responses for this prompt
        const responsesRes = await fetch(`/api/prompts/${promptId}/responses`);
        const responsesData = await responsesRes.json();
        setResponses(responsesData.results || []);
        setEvaluations(responsesData.evaluations || []);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [promptId]);

  // Group responses by model
  const grouped: GroupedResponses[] = useMemo(() => {
    const result: GroupedResponses[] = [];
    const modelIds = [...new Set(responses.map((r) => r.modelId))];
    
    for (const modelId of modelIds) {
      const modelResponses = responses
        .filter((r) => r.modelId === modelId)
        .sort((a, b) => {
          // Sort by run date desc, then iteration asc
          const dateCompare = new Date(b.runDate).getTime() - new Date(a.runDate).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.iteration - b.iteration;
        });

      result.push({
        modelId,
        modelName: models[modelId]?.displayName || modelId,
        provider: models[modelId]?.provider || "unknown",
        responses: modelResponses,
      });
    }

    return result.sort((a, b) => a.modelName.localeCompare(b.modelName));
  }, [responses, models]);

  // Get responses grouped by model for the compare column selector
  const responsesByModel = useMemo(() => {
    const result: Record<string, ResponseWithMeta[]> = {};
    for (const resp of responses) {
      if (!result[resp.modelId]) {
        result[resp.modelId] = [];
      }
      result[resp.modelId].push(resp);
    }
    // Sort each model's responses
    for (const modelId in result) {
      result[modelId].sort((a, b) => {
        const dateCompare = new Date(b.runDate).getTime() - new Date(a.runDate).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.iteration - b.iteration;
      });
    }
    return result;
  }, [responses]);

  function toggleSelect(responseId: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(responseId)) {
      newSelected.delete(responseId);
    } else {
      newSelected.add(responseId);
    }
    setSelected(newSelected);
  }

  function toggleExpand(responseId: string) {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(responseId)) {
      newExpanded.delete(responseId);
    } else {
      newExpanded.add(responseId);
    }
    setExpanded(newExpanded);
  }

  function expandAll() {
    setExpanded(new Set(responses.map((r) => r.id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  function getEvaluation(resultId: string): Evaluation | undefined {
    return evaluations.find((e) => e.resultId === resultId);
  }

  // Start comparison with selected responses
  function startCompare() {
    const selectedResponses = responses.filter((r) => selected.has(r.id));
    setCompareColumns(
      selectedResponses.map((r) => ({
        modelId: r.modelId,
        responseId: r.id,
      }))
    );
    setComparing(true);
  }

  // Quick compare: all models, first response each
  function quickCompareAllModels() {
    const columns: CompareColumn[] = [];
    for (const group of grouped) {
      if (group.responses.length > 0) {
        columns.push({
          modelId: group.modelId,
          responseId: group.responses[0].id,
        });
      }
    }
    setCompareColumns(columns);
    setComparing(true);
  }

  // Add a column to compare
  function addCompareColumn() {
    // Find a model not yet in columns
    for (const group of grouped) {
      const existing = compareColumns.find((c) => c.modelId === group.modelId);
      if (!existing && group.responses.length > 0) {
        setCompareColumns([
          ...compareColumns,
          { modelId: group.modelId, responseId: group.responses[0].id },
        ]);
        return;
      }
    }
  }

  // Remove a column
  function removeColumn(index: number) {
    setCompareColumns(compareColumns.filter((_, i) => i !== index));
  }

  // Change which response is shown in a column
  function setColumnResponse(index: number, responseId: string) {
    const resp = responses.find((r) => r.id === responseId);
    if (!resp) return;
    
    const newColumns = [...compareColumns];
    newColumns[index] = { modelId: resp.modelId, responseId };
    setCompareColumns(newColumns);
  }

  // Change which model a column shows
  function setColumnModel(index: number, modelId: string) {
    const modelResponses = responsesByModel[modelId];
    if (!modelResponses || modelResponses.length === 0) return;
    
    const newColumns = [...compareColumns];
    newColumns[index] = { modelId, responseId: modelResponses[0].id };
    setCompareColumns(newColumns);
  }

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
                {responses.length} responses from {grouped.length} models
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!comparing && (
            <>
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
              {grouped.length >= 2 && (
                <Button variant="outline" onClick={quickCompareAllModels}>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare All Models
                </Button>
              )}
              {selected.size >= 2 && (
                <Button onClick={startCompare}>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Compare {selected.size} Selected
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Prompt Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
            {prompt.content}
          </pre>
          {prompt.expectedAnswer && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs font-medium text-green-800 mb-1">Expected</p>
              <p className="text-sm text-green-900">{prompt.expectedAnswer}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Mode */}
      {comparing && compareColumns.length >= 1 && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Comparing Responses</CardTitle>
              <div className="flex gap-2">
                {compareColumns.length < 4 && compareColumns.length < grouped.length && (
                  <Button variant="outline" size="sm" onClick={addCompareColumn}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Column
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setComparing(false)}>
                  Exit Compare
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${
              compareColumns.length === 1 ? "grid-cols-1" :
              compareColumns.length === 2 ? "grid-cols-2" :
              compareColumns.length === 3 ? "grid-cols-3" :
              "grid-cols-2 lg:grid-cols-4"
            }`}>
              {compareColumns.map((col, index) => {
                const resp = responses.find((r) => r.id === col.responseId);
                const modelResponses = responsesByModel[col.modelId] || [];
                
                if (!resp) return null;

                return (
                  <div key={`${col.modelId}-${index}`} className="border rounded-lg flex flex-col">
                    {/* Column Header */}
                    <div className="p-3 border-b bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <Select
                          value={col.modelId}
                          onValueChange={(v) => setColumnModel(index, v)}
                        >
                          <SelectTrigger className="h-8 text-sm font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {grouped.map((g) => (
                              <SelectItem key={g.modelId} value={g.modelId}>
                                {g.modelName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {compareColumns.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeColumn(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Response/Iteration Selector */}
                      <Select
                        value={col.responseId}
                        onValueChange={(v) => setColumnResponse(index, v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {modelResponses.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {formatDate(r.runDate)} • Iter {r.iteration + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Response Content */}
                    <div className="flex-1 overflow-auto p-3 max-h-[60vh]">
                      {resp.error ? (
                        <div className="text-sm text-destructive">
                          Error: {resp.error}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap text-sm">
                          {resp.response}
                        </pre>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t text-xs text-muted-foreground flex justify-between">
                      <span>{resp.latencyMs}ms</span>
                      {resp.tokensOutput && <span>{resp.tokensOutput} tokens</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Responses by Model */}
      {!comparing && (
        <>
          {responses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No responses yet for this prompt.</p>
                <Link href="/runs/new" className="text-primary hover:underline">
                  Run a vibe check
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <Card key={group.modelId}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{group.modelName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.provider}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-normal text-muted-foreground">
                          {group.responses.length} response{group.responses.length !== 1 ? "s" : ""}
                        </span>
                        {group.responses.length >= 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Compare all iterations of this model
                              setCompareColumns(
                                group.responses.slice(0, 4).map((r) => ({
                                  modelId: r.modelId,
                                  responseId: r.id,
                                }))
                              );
                              setComparing(true);
                            }}
                          >
                            Compare Iterations
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {group.responses.map((resp) => {
                      const isExpanded = expanded.has(resp.id);
                      const isSelected = selected.has(resp.id);
                      const evaluation = getEvaluation(resp.id);

                      return (
                        <div
                          key={resp.id}
                          className={`border rounded-lg p-4 transition-colors ${
                            isSelected ? "border-primary bg-primary/5" : ""
                          }`}
                        >
                          {/* Response Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleSelect(resp.id)}
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-muted-foreground/30 hover:border-primary"
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                              </button>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(resp.runDate)}</span>
                                <span>•</span>
                                <Hash className="h-3 w-3" />
                                <span>Iteration {resp.iteration + 1}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {evaluation?.humanScore && (
                                <Badge variant="outline">
                                  Score: {evaluation.humanScore}/10
                                </Badge>
                              )}
                              {evaluation?.machinePass !== undefined && (
                                <Badge variant={evaluation.machinePass ? "default" : "destructive"}>
                                  {evaluation.machinePass ? "✓ Pass" : "✗ Fail"}
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(resp.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Response Content */}
                          {resp.error ? (
                            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                              Error: {resp.error}
                            </div>
                          ) : (
                            <div
                              className={`bg-muted rounded-lg p-4 ${
                                isExpanded ? "" : "max-h-48 overflow-hidden relative"
                              }`}
                            >
                              <pre className="whitespace-pre-wrap text-sm">
                                {resp.response}
                              </pre>
                              {!isExpanded && resp.response.length > 500 && (
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted to-transparent" />
                              )}
                            </div>
                          )}

                          {/* Show full toggle for long responses */}
                          {!isExpanded && resp.response.length > 500 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => toggleExpand(resp.id)}
                            >
                              Show full response ({resp.response.length} chars)
                            </Button>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span>{resp.latencyMs}ms</span>
                            {resp.tokensOutput && <span>{resp.tokensOutput} tokens</span>}
                            <span className="truncate">Run: {resp.runName}</span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
