"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Play,
  RefreshCw,
  Check,
  AlertCircle,
} from "lucide-react";
import type { Prompt, Model } from "@/lib/types";

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

  async function createRun() {
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

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, Model[]>
  );

  const totalCombinations =
    selectedPrompts.size * selectedModels.size * iterations;

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
          <CardHeader>
            <CardTitle className="text-base">
              Models ({selectedModels.size}/{models.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto space-y-4">
            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider}>
                <p className="text-sm font-medium mb-2 capitalize">{provider}</p>
                <div className="space-y-1">
                  {providerModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                      className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                        selectedModels.has(model.id)
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            selectedModels.has(model.id)
                              ? "bg-primary border-primary text-white"
                              : "border-muted-foreground"
                          }`}
                        >
                          {selectedModels.has(model.id) && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <span>{model.displayName}</span>
                        {!model.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Summary & Submit */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {selectedPrompts.size} prompts × {selectedModels.size} models ×{" "}
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
