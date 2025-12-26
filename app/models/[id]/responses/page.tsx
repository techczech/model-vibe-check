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

interface GroupedByPrompt {
  promptId: string;
  promptTitle: string;
  promptCategory: string;
  responses: ResponseWithMeta[];
}

interface CompareColumn {
  promptId: string;
  responseId: string;
}

export default function ModelResponsesPage() {
  const params = useParams();
  const modelId = params.id as string;

  const [model, setModel] = useState<Model | null>(null);
  const [prompts, setPrompts] = useState<Record<string, Prompt>>({});
  const [responses, setResponses] = useState<ResponseWithMeta[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState(false);
  const [compareColumns, setCompareColumns] = useState<CompareColumn[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      try {
        // Load model
        const modelsRes = await fetch("/api/models");
        const modelsData = await modelsRes.json();
        const foundModel = (modelsData.models || []).find((m: Model) => m.id === modelId);
        setModel(foundModel || null);

        // Load prompts
        const promptsRes = await fetch("/api/prompts");
        const promptsData = await promptsRes.json();
        const promptIndex: Record<string, Prompt> = {};
        (promptsData.prompts || []).forEach((p: Prompt) => {
          promptIndex[p.id] = p;
        });
        setPrompts(promptIndex);

        // Load responses for this model
        const responsesRes = await fetch(`/api/models/${modelId}/responses`);
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
  }, [modelId]);

  // Group responses by prompt
  const grouped: GroupedByPrompt[] = useMemo(() => {
    const result: GroupedByPrompt[] = [];
    const promptIds = [...new Set(responses.map((r) => r.promptId))];

    for (const promptId of promptIds) {
      const promptResponses = responses
        .filter((r) => r.promptId === promptId)
        .sort((a, b) => {
          const dateCompare = new Date(b.runDate).getTime() - new Date(a.runDate).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.iteration - b.iteration;
        });

      result.push({
        promptId,
        promptTitle: prompts[promptId]?.title || promptId,
        promptCategory: prompts[promptId]?.category || "Unknown",
        responses: promptResponses,
      });
    }

    return result.sort((a, b) => a.promptTitle.localeCompare(b.promptTitle));
  }, [responses, prompts]);

  const responsesByPrompt = useMemo(() => {
    const result: Record<string, ResponseWithMeta[]> = {};
    for (const resp of responses) {
      if (!result[resp.promptId]) {
        result[resp.promptId] = [];
      }
      result[resp.promptId].push(resp);
    }
    for (const promptId in result) {
      result[promptId].sort((a, b) => {
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

  function startCompare() {
    const selectedResponses = responses.filter((r) => selected.has(r.id));
    setCompareColumns(
      selectedResponses.map((r) => ({
        promptId: r.promptId,
        responseId: r.id,
      }))
    );
    setComparing(true);
  }

  function addCompareColumn() {
    for (const group of grouped) {
      const existing = compareColumns.find((c) => c.promptId === group.promptId);
      if (!existing && group.responses.length > 0) {
        setCompareColumns([
          ...compareColumns,
          { promptId: group.promptId, responseId: group.responses[0].id },
        ]);
        return;
      }
    }
  }

  function removeColumn(index: number) {
    setCompareColumns(compareColumns.filter((_, i) => i !== index));
  }

  function setColumnResponse(index: number, responseId: string) {
    const resp = responses.find((r) => r.id === responseId);
    if (!resp) return;

    const newColumns = [...compareColumns];
    newColumns[index] = { promptId: resp.promptId, responseId };
    setCompareColumns(newColumns);
  }

  function setColumnPrompt(index: number, promptId: string) {
    const promptResponses = responsesByPrompt[promptId];
    if (!promptResponses || promptResponses.length === 0) return;

    const newColumns = [...compareColumns];
    newColumns[index] = { promptId, responseId: promptResponses[0].id };
    setCompareColumns(newColumns);
  }

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
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{model.provider}</Badge>
              <span className="text-sm text-muted-foreground">
                {responses.length} responses across {grouped.length} prompts
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
            <div
              className={`grid gap-4 ${
                compareColumns.length === 1
                  ? "grid-cols-1"
                  : compareColumns.length === 2
                  ? "grid-cols-2"
                  : compareColumns.length === 3
                  ? "grid-cols-3"
                  : "grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {compareColumns.map((col, index) => {
                const resp = responses.find((r) => r.id === col.responseId);
                const promptResponses = responsesByPrompt[col.promptId] || [];

                if (!resp) return null;

                return (
                  <div key={`${col.promptId}-${index}`} className="border rounded-lg flex flex-col">
                    <div className="p-3 border-b bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <Select value={col.promptId} onValueChange={(v) => setColumnPrompt(index, v)}>
                          <SelectTrigger className="h-8 text-sm font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {grouped.map((g) => (
                              <SelectItem key={g.promptId} value={g.promptId}>
                                {g.promptTitle}
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

                      <Select value={col.responseId} onValueChange={(v) => setColumnResponse(index, v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {promptResponses.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {formatDate(r.runDate)} • Iter {r.iteration + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1 overflow-auto p-3 max-h-[60vh]">
                      {resp.error ? (
                        <div className="text-sm text-destructive">Error: {resp.error}</div>
                      ) : (
                        <pre className="whitespace-pre-wrap text-sm">{resp.response}</pre>
                      )}
                    </div>

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

      {/* Responses by Prompt */}
      {!comparing && (
        <>
          {responses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No responses yet from this model.</p>
                <Link href="/runs/new" className="text-primary hover:underline">
                  Run a vibe check
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <Card key={group.promptId}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/prompts/${group.promptId}/responses`}
                          className="hover:underline"
                        >
                          {group.promptTitle}
                        </Link>
                        <Badge variant="secondary" className="text-xs">
                          {group.promptCategory}
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
                              setCompareColumns(
                                group.responses.slice(0, 4).map((r) => ({
                                  promptId: r.promptId,
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
                                <Badge variant="outline">Score: {evaluation.humanScore}/10</Badge>
                              )}
                              {evaluation?.machinePass !== undefined && (
                                <Badge variant={evaluation.machinePass ? "default" : "destructive"}>
                                  {evaluation.machinePass ? "✓ Pass" : "✗ Fail"}
                                </Badge>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => toggleExpand(resp.id)}>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>

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
                              <pre className="whitespace-pre-wrap text-sm">{resp.response}</pre>
                              {!isExpanded && resp.response.length > 500 && (
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-muted to-transparent" />
                              )}
                            </div>
                          )}

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
