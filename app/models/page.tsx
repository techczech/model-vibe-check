"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Headphones,
  MessageSquare,
  Search,
  BarChart3,
  Settings,
  Play,
  Star,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Model, Provider, ModelSizeClass, ReasoningCapability } from "@/lib/types";
import type { ModelStats } from "@/lib/storage";
import {
  getModelMetadata,
  getSizeClassLabel,
  getSizeClassColor,
  getReasoningLabel,
  getReasoningColor,
  formatContextWindow,
} from "@/lib/model-metadata";
import { ModelFilterBar } from "@/components/model-filter-bar";

const PROVIDER_MODELS: Record<Provider, string[]> = {
  ollama: ["llama3.2", "qwen2.5", "deepseek-r1", "phi-4", "mistral"],
  openai: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o3-mini"],
  google: ["gemini-2.0-flash-exp", "gemini-2.0-pro-exp", "gemini-1.5-pro"],
  openrouter: [
    "anthropic/claude-sonnet-4-20250514",
    "anthropic/claude-3.5-haiku",
    "meta-llama/llama-3.3-70b-instruct",
    "mistralai/mistral-large-2411",
    "deepseek/deepseek-chat",
  ],
  anthropic: [], // Not yet implemented - use OpenRouter for Claude models
};

const PROVIDER_LABELS: Record<Provider, string> = {
  ollama: "Ollama (Local)",
  openai: "OpenAI",
  google: "Google AI",
  openrouter: "OpenRouter",
  anthropic: "Anthropic",
};

function getProviderColor(provider: string): string {
  switch (provider) {
    case "openai":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "anthropic":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "google":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "ollama":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "openrouter":
      return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

// Get effective metadata for a model (stored or auto-detected)
function getEffectiveMetadata(model: Model) {
  const detected = getModelMetadata(model.modelId, model.provider);
  return {
    sizeClass: model.sizeClass || detected.sizeClass,
    reasoningCapability: model.reasoningCapability || detected.reasoningCapability,
    contextWindow: model.contextWindow || detected.contextWindow,
    parameters: model.parameters || detected.parameters,
  };
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [stats, setStats] = useState<Record<string, ModelStats>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filteredActiveModels, setFilteredActiveModels] = useState<Model[]>([]);

  // Manage tab state
  const [filteredManageModels, setFilteredManageModels] = useState<Model[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // New model form
  const [newProvider, setNewProvider] = useState<Provider>("openai");
  const [newModelId, setNewModelId] = useState("");
  const [customModelId, setCustomModelId] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newSizeClass, setNewSizeClass] = useState<ModelSizeClass | "auto">("auto");
  const [newReasoning, setNewReasoning] = useState<ReasoningCapability | "auto">("auto");
  const [newContextWindow, setNewContextWindow] = useState("");
  const [newParameters, setNewParameters] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Fetch both models and stats
      const res = await fetch("/api/models/stats");
      const data = await res.json();
      setModels(data.models || []);
      setStats(data.stats || {});
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveModels(updated: Model[]) {
    setSaving(true);
    try {
      await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: updated }),
      });
      setModels(updated);
    } catch (error) {
      console.error("Failed to save models:", error);
    } finally {
      setSaving(false);
    }
  }

  function addModel() {
    const modelId = customModelId || newModelId;
    if (!modelId) return;

    const displayName =
      newProvider === "openrouter"
        ? modelId.split("/").pop() || modelId
        : modelId;

    // Get auto-detected metadata
    const detected = getModelMetadata(modelId, newProvider);

    const newModel: Model = {
      id: `${newProvider}-${modelId.replace(/\//g, "-")}-${Date.now()}`,
      provider: newProvider,
      modelId,
      displayName,
      supportsVision:
        modelId.includes("vision") ||
        modelId.includes("4o") ||
        modelId.includes("gemini"),
      supportsAudio: false,
      maxTokens: 128000,
      config: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      // Apply metadata (use explicit value or fall back to auto-detected)
      sizeClass: newSizeClass === "auto" ? detected.sizeClass : newSizeClass,
      reasoningCapability: newReasoning === "auto" ? detected.reasoningCapability : newReasoning,
      contextWindow: newContextWindow ? parseInt(newContextWindow) : detected.contextWindow,
      parameters: newParameters || detected.parameters,
    };

    saveModels([...models, newModel]);
    // Reset form
    setNewModelId("");
    setCustomModelId("");
    setShowAdvanced(false);
    setNewSizeClass("auto");
    setNewReasoning("auto");
    setNewContextWindow("");
    setNewParameters("");
  }

  function toggleActive(id: string) {
    const updated = models.map((m) =>
      m.id === id ? { ...m, isActive: !m.isActive } : m
    );
    saveModels(updated);
  }

  function deleteModel(id: string) {
    const updated = models.filter((m) => m.id !== id);
    saveModels(updated);
  }

  // Selection helpers
  function toggleSelection(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function selectAll() {
    const displayedIds = filteredManageModels.map((m) => m.id);
    setSelectedIds(new Set(displayedIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Batch actions
  function batchSetSizeClass(sizeClass: ModelSizeClass) {
    const updated = models.map((m) =>
      selectedIds.has(m.id) ? { ...m, sizeClass } : m
    );
    saveModels(updated);
    clearSelection();
  }

  function batchSetReasoning(reasoningCapability: ReasoningCapability) {
    const updated = models.map((m) =>
      selectedIds.has(m.id) ? { ...m, reasoningCapability } : m
    );
    saveModels(updated);
    clearSelection();
  }

  function batchActivate() {
    const updated = models.map((m) =>
      selectedIds.has(m.id) ? { ...m, isActive: true } : m
    );
    saveModels(updated);
    clearSelection();
  }

  function batchDeactivate() {
    const updated = models.map((m) =>
      selectedIds.has(m.id) ? { ...m, isActive: false } : m
    );
    saveModels(updated);
    clearSelection();
  }

  function batchDelete() {
    if (!confirm(`Delete ${selectedIds.size} model(s)? This cannot be undone.`)) return;
    const updated = models.filter((m) => !selectedIds.has(m.id));
    saveModels(updated);
    clearSelection();
  }

  // Inline editing
  function startEdit(id: string, field: string, currentValue: string) {
    setEditingCell({ id, field });
    setEditValue(currentValue);
  }

  function saveEdit() {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const updated = models.map((m) => {
      if (m.id !== id) return m;
      const value = field === "contextWindow" ? parseInt(editValue) || undefined : editValue;
      return { ...m, [field]: value || undefined };
    });
    saveModels(updated);
    setEditingCell(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingCell(null);
    setEditValue("");
  }

  function updateModelField(id: string, field: string, value: string | boolean | undefined) {
    const updated = models.map((m) => {
      if (m.id !== id) return m;
      return { ...m, [field]: value };
    });
    saveModels(updated);
  }

  // Memoize to prevent infinite re-render loops with ModelFilterBar
  // Must be called before any early returns to follow Rules of Hooks
  const activeModels = useMemo(() => models.filter((m) => m.isActive), [models]);
  const inactiveModels = useMemo(() => models.filter((m) => !m.isActive), [models]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate aggregate stats
  const totalResponses = Object.values(stats).reduce(
    (sum, s) => sum + s.responseCount,
    0
  );
  const totalEvaluated = Object.values(stats).reduce(
    (sum, s) => sum + s.evaluatedCount,
    0
  );
  const modelsWithScores = Object.values(stats).filter(
    (s) => s.avgScore !== undefined
  );
  const avgOverallScore =
    modelsWithScores.length > 0
      ? modelsWithScores.reduce((sum, s) => sum + (s.avgScore || 0), 0) /
        modelsWithScores.length
      : undefined;

  // Sort models by average score (if available) or response count
  const sortedActiveModels = [...activeModels].sort((a, b) => {
    const aScore = stats[a.id]?.avgScore;
    const bScore = stats[b.id]?.avgScore;
    if (aScore !== undefined && bScore !== undefined) {
      return bScore - aScore;
    }
    if (aScore !== undefined) return -1;
    if (bScore !== undefined) return 1;
    return (stats[b.id]?.responseCount || 0) - (stats[a.id]?.responseCount || 0);
  });

  // Group models by provider for Manage tab
  const grouped = models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<Provider, Model[]>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Models</h1>
          <p className="text-muted-foreground mt-1">
            {activeModels.length} active models across{" "}
            {new Set(activeModels.map((m) => m.provider)).size} providers
          </p>
        </div>
        <Link href="/settings?tab=models">
          <Button>
            <Search className="h-4 w-4 mr-2" />
            Discover Models
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-2">
            <Settings className="h-4 w-4" />
            Manage
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Models
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeModels.length}</div>
                <p className="text-xs text-muted-foreground">
                  {inactiveModels.length} inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Responses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalResponses}</div>
                <p className="text-xs text-muted-foreground">
                  {totalEvaluated} evaluated (
                  {totalResponses > 0
                    ? Math.round((totalEvaluated / totalResponses) * 100)
                    : 0}
                  %)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg. Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {avgOverallScore !== undefined
                    ? avgOverallScore.toFixed(1)
                    : "—"}
                </div>
                <p className="text-xs text-muted-foreground">
                  across {modelsWithScores.length} scored models
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Providers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(activeModels.map((m) => m.provider)).size}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Array.from(new Set(activeModels.map((m) => m.provider))).join(
                    ", "
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Model Filter */}
          {activeModels.length > 0 && (
            <ModelFilterBar
              models={activeModels}
              onFilterChange={setFilteredActiveModels}
              showSorting={true}
              showCounts={true}
              className="bg-card p-4 rounded-lg border"
            />
          )}

          {/* Models Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Model Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredActiveModels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>
                    {activeModels.length === 0
                      ? "No active models. Add models in the Manage tab."
                      : "No models match the current filters."}
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="text-left text-sm">
                        <th className="px-4 py-3 font-medium">Model</th>
                        <th className="px-4 py-3 font-medium">Class</th>
                        <th className="px-4 py-3 font-medium text-center">
                          Prompts
                        </th>
                        <th className="px-4 py-3 font-medium text-center">
                          Responses
                        </th>
                        <th className="px-4 py-3 font-medium text-center">
                          Evaluated
                        </th>
                        <th className="px-4 py-3 font-medium text-center">
                          Avg Score
                        </th>
                        <th className="px-4 py-3 font-medium text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredActiveModels.map((model, index) => {
                        const s = stats[model.id];
                        const evalPct =
                          s?.responseCount > 0
                            ? Math.round(
                                (s.evaluatedCount / s.responseCount) * 100
                              )
                            : 0;
                        const meta = getEffectiveMetadata(model);
                        const reasoningLabel = getReasoningLabel(meta.reasoningCapability);

                        return (
                          <tr
                            key={model.id}
                            className="hover:bg-muted/30 group"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {index < 3 && s?.avgScore !== undefined && (
                                  <span className="text-yellow-500">
                                    {index === 0
                                      ? "🥇"
                                      : index === 1
                                        ? "🥈"
                                        : "🥉"}
                                  </span>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Link
                                      href={`/models/${model.id}`}
                                      className="font-medium hover:underline"
                                    >
                                      {model.displayName}
                                    </Link>
                                    <Badge
                                      variant="secondary"
                                      className={`text-xs ${getProviderColor(model.provider)}`}
                                    >
                                      {model.provider}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {model.modelId}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${getSizeClassColor(meta.sizeClass)}`}
                                >
                                  {getSizeClassLabel(meta.sizeClass)}
                                  {meta.parameters && ` (${meta.parameters})`}
                                </Badge>
                                {reasoningLabel && (
                                  <Badge
                                    variant="secondary"
                                    className={`text-xs ${getReasoningColor(meta.reasoningCapability)}`}
                                  >
                                    {reasoningLabel}
                                  </Badge>
                                )}
                                {meta.contextWindow && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatContextWindow(meta.contextWindow)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s?.promptCount || 0}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s?.responseCount || 0}
                            </td>
                            <td className="px-4 py-3">
                              {s?.responseCount > 0 ? (
                                <div className="flex items-center gap-2 justify-center">
                                  <Progress
                                    value={evalPct}
                                    className="w-16 h-2"
                                  />
                                  <span className="text-xs text-muted-foreground w-10">
                                    {evalPct}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-center block text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {s?.avgScore !== undefined ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                  <span className="font-medium">
                                    {s.avgScore.toFixed(1)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link
                                  href={`/vibe-check/model?model=${model.id}`}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Model Vibe"
                                  >
                                    <Sparkles className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link href={`/models/${model.id}/responses`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="View Responses"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link href={`/runs/new?models=${model.id}`}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Run Test"
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Provider Breakdown */}
          {activeModels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>By Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  {Array.from(new Set(activeModels.map((m) => m.provider))).map(
                    (provider) => {
                      const providerModels = activeModels.filter(
                        (m) => m.provider === provider
                      );
                      const providerResponses = providerModels.reduce(
                        (sum, m) => sum + (stats[m.id]?.responseCount || 0),
                        0
                      );
                      const providerScores = providerModels
                        .map((m) => stats[m.id]?.avgScore)
                        .filter((s): s is number => s !== undefined);
                      const providerAvg =
                        providerScores.length > 0
                          ? providerScores.reduce((a, b) => a + b, 0) /
                            providerScores.length
                          : undefined;

                      return (
                        <Card key={provider}>
                          <CardContent className="pt-4">
                            <Badge
                              variant="secondary"
                              className={`${getProviderColor(provider)} mb-2`}
                            >
                              {provider}
                            </Badge>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Models:
                                </span>
                                <span>{providerModels.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Responses:
                                </span>
                                <span>{providerResponses}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Avg Score:
                                </span>
                                <span>
                                  {providerAvg !== undefined
                                    ? providerAvg.toFixed(1)
                                    : "—"}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inactive Models */}
          {inactiveModels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground">
                  Inactive Models ({inactiveModels.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {inactiveModels.map((model) => (
                    <Badge
                      key={model.id}
                      variant="outline"
                      className="text-muted-foreground"
                    >
                      {model.displayName}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-6">
          {/* Add Model */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Model</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="w-40">
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={newProvider}
                    onValueChange={(v) => {
                      setNewProvider(v as Provider);
                      setNewModelId("");
                      setCustomModelId("");
                    }}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-64">
                  <Label htmlFor="modelId">Model</Label>
                  <Select value={newModelId} onValueChange={setNewModelId}>
                    <SelectTrigger id="modelId">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_MODELS[newProvider].map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Label htmlFor="customModel">Or enter custom</Label>
                  <Input
                    id="customModel"
                    placeholder="Custom model ID"
                    value={customModelId}
                    onChange={(e) => setCustomModelId(e.target.value)}
                  />
                </div>

                <Button
                  onClick={addModel}
                  disabled={!newModelId && !customModelId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-4"
              >
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Advanced Settings (Optional)
              </button>

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="grid gap-4 md:grid-cols-4 mt-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label htmlFor="sizeClass">Size Class</Label>
                    <Select
                      value={newSizeClass}
                      onValueChange={(v) => setNewSizeClass(v as ModelSizeClass | "auto")}
                    >
                      <SelectTrigger id="sizeClass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="frontier">Frontier</SelectItem>
                        <SelectItem value="flash">Flash</SelectItem>
                        <SelectItem value="lite">Lite</SelectItem>
                        <SelectItem value="sub-1b">&lt;1B</SelectItem>
                        <SelectItem value="1-3b">1-3B</SelectItem>
                        <SelectItem value="3-7b">3-7B</SelectItem>
                        <SelectItem value="7-14b">7-14B</SelectItem>
                        <SelectItem value="14-34b">14-34B</SelectItem>
                        <SelectItem value="35-70b">35-70B</SelectItem>
                        <SelectItem value="70-100b">70-100B</SelectItem>
                        <SelectItem value="100-200b">100-200B</SelectItem>
                        <SelectItem value="200b+">200B+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reasoning">Reasoning</Label>
                    <Select
                      value={newReasoning}
                      onValueChange={(v) => setNewReasoning(v as ReasoningCapability | "auto")}
                    >
                      <SelectTrigger id="reasoning">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="reasoning">Reasoning</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="contextWindow">Context Window</Label>
                    <Input
                      id="contextWindow"
                      placeholder="e.g., 128000"
                      value={newContextWindow}
                      onChange={(e) => setNewContextWindow(e.target.value)}
                      type="number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="parameters">Parameters</Label>
                    <Input
                      id="parameters"
                      placeholder="e.g., 70B, 8x7B"
                      value={newParameters}
                      onChange={(e) => setNewParameters(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filter Bar */}
          {models.length > 0 && (
            <ModelFilterBar
              models={models}
              onFilterChange={setFilteredManageModels}
              showSorting={true}
              showCounts={true}
              className="bg-card p-4 rounded-lg border"
            />
          )}

          {/* Batch Actions Bar */}
          {selectedIds.size > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="py-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-medium">
                    {selectedIds.size} model{selectedIds.size !== 1 ? "s" : ""} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(v) => batchSetSizeClass(v as ModelSizeClass)}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Set Size..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="frontier">Frontier</SelectItem>
                        <SelectItem value="flash">Flash</SelectItem>
                        <SelectItem value="lite">Lite</SelectItem>
                        <SelectItem value="sub-1b">&lt;1B</SelectItem>
                        <SelectItem value="1-3b">1-3B</SelectItem>
                        <SelectItem value="3-7b">3-7B</SelectItem>
                        <SelectItem value="7-14b">7-14B</SelectItem>
                        <SelectItem value="14-34b">14-34B</SelectItem>
                        <SelectItem value="35-70b">35-70B</SelectItem>
                        <SelectItem value="70-100b">70-100B</SelectItem>
                        <SelectItem value="100-200b">100-200B</SelectItem>
                        <SelectItem value="200b+">200B+</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select onValueChange={(v) => batchSetReasoning(v as ReasoningCapability)}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Set Reasoning..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="reasoning">Reasoning</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Button variant="outline" size="sm" onClick={batchActivate}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                    <Button variant="outline" size="sm" onClick={batchDeactivate}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Deactivate
                    </Button>
                    <Button variant="destructive" size="sm" onClick={batchDelete}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Models Table */}
          {models.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No models configured yet. Add one above to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-3 py-3 text-left w-10">
                          <Checkbox
                            checked={selectedIds.size === filteredManageModels.length && filteredManageModels.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) selectAll();
                              else clearSelection();
                            }}
                          />
                        </th>
                        <th className="px-3 py-3 text-left w-16">Active</th>
                        <th className="px-3 py-3 text-left">Name</th>
                        <th className="px-3 py-3 text-left">Model ID</th>
                        <th className="px-3 py-3 text-left w-24">Provider</th>
                        <th className="px-3 py-3 text-left w-28">Size Class</th>
                        <th className="px-3 py-3 text-left w-28">Reasoning</th>
                        <th className="px-3 py-3 text-left w-24">Context</th>
                        <th className="px-3 py-3 text-left w-20">Params</th>
                        <th className="px-3 py-3 text-center w-16">Vision</th>
                        <th className="px-3 py-3 text-center w-16">Audio</th>
                        <th className="px-3 py-3 text-right w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredManageModels.map((model) => {
                        const meta = getEffectiveMetadata(model);
                        const isSelected = selectedIds.has(model.id);
                        return (
                          <tr
                            key={model.id}
                            className={`hover:bg-muted/30 ${!model.isActive ? "opacity-60" : ""} ${isSelected ? "bg-primary/5" : ""}`}
                          >
                            <td className="px-3 py-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelection(model.id)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => toggleActive(model.id)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {model.isActive ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <XCircle className="h-5 w-5" />
                                )}
                              </button>
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {editingCell?.id === model.id && editingCell?.field === "displayName" ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    className="h-7 w-full"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEdit();
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    autoFocus
                                  />
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline"
                                  onClick={() => startEdit(model.id, "displayName", model.displayName)}
                                >
                                  {model.displayName}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground text-xs font-mono">
                              {model.modelId}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="secondary" className={`text-xs ${getProviderColor(model.provider)}`}>
                                {model.provider}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                value={model.sizeClass || "auto"}
                                onValueChange={(v) => updateModelField(model.id, "sizeClass", v === "auto" ? undefined : v)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">Auto ({getSizeClassLabel(meta.sizeClass)})</SelectItem>
                                  <SelectItem value="frontier">Frontier</SelectItem>
                                  <SelectItem value="flash">Flash</SelectItem>
                                  <SelectItem value="lite">Lite</SelectItem>
                                  <SelectItem value="sub-1b">&lt;1B</SelectItem>
                                  <SelectItem value="1-3b">1-3B</SelectItem>
                                  <SelectItem value="3-7b">3-7B</SelectItem>
                                  <SelectItem value="7-14b">7-14B</SelectItem>
                                  <SelectItem value="14-34b">14-34B</SelectItem>
                                  <SelectItem value="35-70b">35-70B</SelectItem>
                                  <SelectItem value="70-100b">70-100B</SelectItem>
                                  <SelectItem value="100-200b">100-200B</SelectItem>
                                  <SelectItem value="200b+">200B+</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <Select
                                value={model.reasoningCapability || "auto"}
                                onValueChange={(v) => updateModelField(model.id, "reasoningCapability", v === "auto" ? undefined : v)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="auto">Auto ({getReasoningLabel(meta.reasoningCapability) || "None"})</SelectItem>
                                  <SelectItem value="none">None</SelectItem>
                                  <SelectItem value="reasoning">Reasoning</SelectItem>
                                  <SelectItem value="hybrid">Hybrid</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              {editingCell?.id === model.id && editingCell?.field === "contextWindow" ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    className="h-7 w-20"
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEdit();
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    autoFocus
                                  />
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline text-xs"
                                  onClick={() => startEdit(model.id, "contextWindow", String(model.contextWindow || meta.contextWindow || ""))}
                                >
                                  {formatContextWindow(model.contextWindow || meta.contextWindow)}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {editingCell?.id === model.id && editingCell?.field === "parameters" ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    className="h-7 w-16"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveEdit();
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    autoFocus
                                  />
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline text-xs"
                                  onClick={() => startEdit(model.id, "parameters", model.parameters || meta.parameters || "")}
                                >
                                  {model.parameters || meta.parameters || "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Checkbox
                                checked={model.supportsVision}
                                onCheckedChange={(checked) => updateModelField(model.id, "supportsVision", !!checked)}
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Checkbox
                                checked={model.supportsAudio}
                                onCheckedChange={(checked) => updateModelField(model.id, "supportsAudio", !!checked)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => deleteModel(model.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <div className="text-sm text-muted-foreground">
            {models.filter((m) => m.isActive).length} of {models.length} models
            active
            {saving && (
              <span className="ml-2">
                <RefreshCw className="h-3 w-3 inline animate-spin" /> Saving...
              </span>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
