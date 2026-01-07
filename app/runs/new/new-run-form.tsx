"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Play,
  RefreshCw,
  Check,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SIZE_FILTER_GROUPS,
  REASONING_FILTER_GROUPS,
  matchesSizeFilter,
  matchesReasoningFilter,
  sortModels,
  getEffectiveMetadata,
  getSizeClassColor,
  getSizeClassLabel,
  getReasoningLabel,
  type SizeFilterGroup,
  type ReasoningFilterGroup,
  type ModelSortOption,
} from "@/lib/model-metadata";
import type { Prompt, Model } from "@/lib/types";
import { isMultiTurnPrompt } from "@/lib/types";

export default function NewRunForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState(
    `Vibe Check ${new Date().toLocaleDateString()}`
  );
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [iterations, setIterations] = useState(1);

  // Model filter state
  const [sizeFilter, setSizeFilter] = useState<SizeFilterGroup>("all");
  const [reasoningFilter, setReasoningFilter] = useState<ReasoningFilterGroup>("all");
  const [sortBy, setSortBy] = useState<ModelSortOption>("provider");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [promptsRes, modelsRes] = await Promise.all([
        fetch("/api/prompts"),
        fetch("/api/models"),
      ]);
      const promptsData = await promptsRes.json();
      const modelsData = await modelsRes.json();

      setPrompts(promptsData.prompts || []);
      setModels(modelsData.models || []);

      // Pre-select all active models
      const activeModels = (modelsData.models || []).filter(
        (m: Model) => m.isActive
      );
      setSelectedModels(new Set(activeModels.map((m: Model) => m.id)));

      // Pre-select prompt from URL if present
      const promptParam = searchParams.get("prompts");
      if (promptParam) {
        setSelectedPrompts(new Set(promptParam.split(",")));
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  function togglePrompt(id: string) {
    const newSet = new Set(selectedPrompts);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedPrompts(newSet);
  }

  function toggleModel(id: string) {
    const newSet = new Set(selectedModels);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedModels(newSet);
  }

  function selectAllPrompts() {
    setSelectedPrompts(new Set(prompts.map((p) => p.id)));
  }

  function selectNoPrompts() {
    setSelectedPrompts(new Set());
  }

  function selectAllModels() {
    setSelectedModels(new Set(filteredAndSortedModels.map((m) => m.id)));
  }

  function selectNoModels() {
    setSelectedModels(new Set());
  }

  function selectModelsByFilter(filter: SizeFilterGroup | "reasoning") {
    const newSet = new Set(selectedModels);
    models.forEach((model) => {
      const meta = getEffectiveMetadata(model);
      if (filter === "reasoning") {
        if (meta.reasoningCapability !== "none") {
          newSet.add(model.id);
        }
      } else if (matchesSizeFilter(meta.sizeClass, filter)) {
        newSet.add(model.id);
      }
    });
    setSelectedModels(newSet);
  }

  function deselectLocalModels() {
    const newSet = new Set(selectedModels);
    models.forEach((model) => {
      if (model.provider === "ollama") {
        newSet.delete(model.id);
      }
    });
    setSelectedModels(newSet);
  }

  function selectRemoteModels() {
    const newSet = new Set(selectedModels);
    models.forEach((model) => {
      if (model.provider !== "ollama") {
        newSet.add(model.id);
      }
    });
    setSelectedModels(newSet);
  }

  function selectLocalModels() {
    const newSet = new Set(selectedModels);
    models.forEach((model) => {
      if (model.provider === "ollama") {
        newSet.add(model.id);
      }
    });
    setSelectedModels(newSet);
  }

  async function createRun() {
    // Need at least prompts plus models
    if (selectedPrompts.size === 0 || selectedModels.size === 0) return;

    setCreating(true);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          promptIds: Array.from(selectedPrompts),
          modelIds: Array.from(selectedModels),
          iterations,
        }),
      });

      const data = await res.json();
      if (data.run?.id) {
        router.push(`/runs/${data.run.id}`);
      }
    } catch (error) {
      console.error("Failed to create run:", error);
    } finally {
      setCreating(false);
    }
  }

  // Group prompts by category
  const groupedPrompts = prompts.reduce(
    (acc, prompt) => {
      if (!acc[prompt.category]) acc[prompt.category] = [];
      acc[prompt.category].push(prompt);
      return acc;
    },
    {} as Record<string, Prompt[]>
  );

  // Calculate filter counts for models
  const modelFilterCounts = useMemo(() => {
    const sizeCounts: Record<SizeFilterGroup, number> = {
      all: models.length,
      frontier: 0,
      flash: 0,
      "open-large": 0,
      "open-medium": 0,
      "open-small": 0,
    };
    const reasoningCounts: Record<ReasoningFilterGroup, number> = {
      all: models.length,
      reasoning: 0,
      "non-reasoning": 0,
    };
    let localCount = 0;
    let remoteCount = 0;

    models.forEach((model) => {
      const meta = getEffectiveMetadata(model);
      SIZE_FILTER_GROUPS.forEach((group) => {
        if (group.value !== "all" && matchesSizeFilter(meta.sizeClass, group.value)) {
          sizeCounts[group.value]++;
        }
      });
      if (meta.reasoningCapability !== "none") {
        reasoningCounts.reasoning++;
      } else {
        reasoningCounts["non-reasoning"]++;
      }
      // Count local vs remote
      if (model.provider === "ollama") {
        localCount++;
      } else {
        remoteCount++;
      }
    });

    return { sizeCounts, reasoningCounts, localCount, remoteCount };
  }, [models]);

  // Filter and sort models
  const filteredAndSortedModels = useMemo(() => {
    let filtered = models.filter((model) => {
      const meta = getEffectiveMetadata(model);
      if (!matchesSizeFilter(meta.sizeClass, sizeFilter)) return false;
      if (!matchesReasoningFilter(meta.reasoningCapability, reasoningFilter)) return false;
      return true;
    });
    return sortModels(filtered, sortBy);
  }, [models, sizeFilter, reasoningFilter, sortBy]);

  // Group filtered models by provider (for provider sort) or flat list
  const groupedModels = useMemo(() => {
    if (sortBy === "provider") {
      return filteredAndSortedModels.reduce(
        (acc, model) => {
          if (!acc[model.provider]) acc[model.provider] = [];
          acc[model.provider].push(model);
          return acc;
        },
        {} as Record<string, Model[]>
      );
    }
    // For other sort modes, use a single group
    return { "All Models": filteredAndSortedModels };
  }, [filteredAndSortedModels, sortBy]);

  // Calculate total steps (including multi-step prompts)
  const totalSteps = useMemo(() => {
    return Array.from(selectedPrompts).reduce((sum, promptId) => {
      const prompt = prompts.find((p) => p.id === promptId);
      return sum + (prompt?.steps?.length || 1);
    }, 0);
  }, [selectedPrompts, prompts]);

  const totalCombinations = totalSteps * selectedModels.size * iterations;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/runs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Vibe Check</h1>
          <p className="text-muted-foreground">
            Select prompts and models to evaluate
          </p>
        </div>
      </div>

      {/* Run Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Run Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Vibe Check"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iterations">Iterations</Label>
              <Input
                id="iterations"
                type="number"
                min={1}
                max={10}
                value={iterations}
                onChange={(e) => setIterations(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Run each prompt multiple times to check consistency
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {prompts.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">No prompts found</p>
              <p className="text-sm text-yellow-700">
                <Link href="/prompts/new" className="underline">
                  Add some prompts
                </Link>{" "}
                before creating a run
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {models.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">No models configured</p>
              <p className="text-sm text-yellow-700">
                <Link href="/models" className="underline">
                  Configure models
                </Link>{" "}
                before creating a run
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prompts Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Prompts ({selectedPrompts.size}/{prompts.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllPrompts}>
                  All
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNoPrompts}>
                  None
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto space-y-4">
            {Object.entries(groupedPrompts).map(([category, categoryPrompts]) => (
              <div key={category}>
                <p className="text-sm font-medium mb-2">{category}</p>
                <div className="space-y-1">
                  {categoryPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => togglePrompt(prompt.id)}
                      className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                        selectedPrompts.has(prompt.id)
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            selectedPrompts.has(prompt.id)
                              ? "bg-primary border-primary text-white"
                              : "border-muted-foreground"
                          }`}
                        >
                          {selectedPrompts.has(prompt.id) && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <span>{prompt.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Models Selection */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Models ({selectedModels.size}/{models.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllModels}>
                  All
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNoModels}>
                  None
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filter and sort controls */}
            <div className="space-y-2 pb-2 border-b">
              {/* Size filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground w-14">Size:</span>
                {SIZE_FILTER_GROUPS.map((group) => (
                  <button
                    key={group.value}
                    onClick={() => setSizeFilter(group.value)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
                      sizeFilter === group.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {group.label}
                    {modelFilterCounts.sizeCounts[group.value] > 0 && (
                      <span className="ml-1 opacity-70">
                        ({modelFilterCounts.sizeCounts[group.value]})
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* Reasoning filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground w-14">Type:</span>
                {REASONING_FILTER_GROUPS.map((group) => (
                  <button
                    key={group.value}
                    onClick={() => setReasoningFilter(group.value)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
                      reasoningFilter === group.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    )}
                  >
                    {group.label}
                    {modelFilterCounts.reasoningCounts[group.value] > 0 && (
                      <span className="ml-1 opacity-70">
                        ({modelFilterCounts.reasoningCounts[group.value]})
                      </span>
                    )}
                  </button>
                ))}
                {/* Sort dropdown */}
                <div className="ml-auto flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as ModelSortOption)}>
                    <SelectTrigger className="h-6 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provider">By Provider</SelectItem>
                      <SelectItem value="size">By Size</SelectItem>
                      <SelectItem value="name">By Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Quick select actions */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-xs text-muted-foreground">Quick add:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 px-2 text-xs"
                  onClick={() => selectModelsByFilter("frontier")}
                >
                  + Frontier
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 px-2 text-xs"
                  onClick={() => selectModelsByFilter("flash")}
                >
                  + Flash
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 px-2 text-xs"
                  onClick={() => selectModelsByFilter("reasoning")}
                >
                  + Reasoning
                </Button>
                {/* Separator */}
                <div className="w-px h-4 bg-border mx-1" />
                {/* Remote/Local buttons */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 px-2 text-xs"
                  onClick={selectRemoteModels}
                >
                  + Remote ({modelFilterCounts.remoteCount})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={deselectLocalModels}
                >
                  − Local ({modelFilterCounts.localCount})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 px-2 text-xs"
                  onClick={selectLocalModels}
                >
                  + Local ({modelFilterCounts.localCount})
                </Button>
              </div>
            </div>

            {/* Model list */}
            <div className="max-h-64 overflow-y-auto space-y-3">
              {filteredAndSortedModels.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No models match the current filters
                </p>
              ) : (
                Object.entries(groupedModels).map(([groupName, groupModels]) => (
                  <div key={groupName}>
                    <p className="text-sm font-medium mb-2 capitalize">{groupName}</p>
                    <div className="space-y-1">
                      {groupModels.map((model) => {
                        const meta = getEffectiveMetadata(model);
                        return (
                          <button
                            key={model.id}
                            onClick={() => toggleModel(model.id)}
                            className={cn(
                              "w-full text-left p-2 rounded border text-sm transition-colors",
                              selectedModels.has(model.id)
                                ? "border-primary bg-primary/5"
                                : "border-transparent bg-muted/50 hover:bg-muted"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                                  selectedModels.has(model.id)
                                    ? "bg-primary border-primary text-white"
                                    : "border-muted-foreground"
                                )}
                              >
                                {selectedModels.has(model.id) && (
                                  <Check className="h-3 w-3" />
                                )}
                              </div>
                              <span className="flex-1 truncate">{model.displayName}</span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                  getSizeClassColor(meta.sizeClass)
                                )}>
                                  {getSizeClassLabel(meta.sizeClass)}
                                </span>
                                {meta.reasoningCapability !== "none" && (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1">
                                    {getReasoningLabel(meta.reasoningCapability)}
                                  </Badge>
                                )}
                                {!model.isActive && (
                                  <Badge variant="secondary" className="text-[10px] h-5">
                                    Off
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary & Submit */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {selectedPrompts.size} prompt{selectedPrompts.size !== 1 ? "s" : ""}
                {totalSteps !== selectedPrompts.size && ` (${totalSteps} steps)`}
                {" "}× {selectedModels.size} model{selectedModels.size !== 1 ? "s" : ""} ×{" "}
                {iterations} iteration{iterations !== 1 ? "s" : ""} ={" "}
                <span className="text-primary">{totalCombinations} results</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Estimated time: ~{Math.ceil(totalCombinations * 3 / 60)} minutes
              </p>
            </div>
            <Button
              size="lg"
              onClick={createRun}
              disabled={
                creating ||
                selectedPrompts.size === 0 ||
                selectedModels.size === 0
              }
            >
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Vibe Check
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
