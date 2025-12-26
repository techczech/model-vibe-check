"use client";

import { useState, useEffect } from "react";
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
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Headphones,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import type { Model, Provider } from "@/lib/types";

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
};

const PROVIDER_LABELS: Record<Provider, string> = {
  ollama: "Ollama (Local)",
  openai: "OpenAI",
  google: "Google AI",
  openrouter: "OpenRouter",
};

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New model form
  const [newProvider, setNewProvider] = useState<Provider>("openai");
  const [newModelId, setNewModelId] = useState("");
  const [customModelId, setCustomModelId] = useState("");

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      setModels(data.models || []);
    } catch (error) {
      console.error("Failed to load models:", error);
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
    };

    saveModels([...models, newModel]);
    setNewModelId("");
    setCustomModelId("");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group models by provider
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Models</h1>
        <p className="text-muted-foreground mt-1">
          Configure which models to include in your vibe checks
        </p>
      </div>

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

            <Button onClick={addModel} disabled={!newModelId && !customModelId}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Models List */}
      {models.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No models configured yet. Add one above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.keys(grouped) as Provider[]).map((provider) => (
            <div key={provider}>
              <h2 className="text-lg font-semibold mb-3">
                {PROVIDER_LABELS[provider]}
              </h2>
              <div className="grid gap-3">
                {grouped[provider].map((model) => (
                  <Card
                    key={model.id}
                    className={model.isActive ? "" : "opacity-60"}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
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
                          <div>
                            <p className="font-medium">{model.displayName}</p>
                            <p className="text-sm text-muted-foreground">
                              {model.modelId}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex gap-1">
                            {model.supportsVision && (
                              <Badge variant="outline" className="text-xs">
                                <Eye className="h-3 w-3 mr-1" />
                                Vision
                              </Badge>
                            )}
                            {model.supportsAudio && (
                              <Badge variant="outline" className="text-xs">
                                <Headphones className="h-3 w-3 mr-1" />
                                Audio
                              </Badge>
                            )}
                          </div>
                          <Link href={`/models/${model.id}/responses`}>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Responses
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteModel(model.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
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
    </div>
  );
}
