"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Eye,
  Search,
  Server,
  Cloud,
} from "lucide-react";
import type { Model, Provider } from "@/lib/types";

interface DiscoveredModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  size?: string;
}

interface ProviderModelsResult {
  provider: string;
  connected: boolean;
  error?: string;
  models: DiscoveredModel[];
}

interface ModelDiscoveryProps {
  existingModels: Model[];
  onAddModels: (models: Partial<Model>[]) => void;
}

const PROVIDER_INFO: Record<Provider, { label: string; icon: typeof Server; description: string }> = {
  ollama: {
    label: "Ollama (Local)",
    icon: Server,
    description: "Locally installed models",
  },
  openai: {
    label: "OpenAI",
    icon: Cloud,
    description: "GPT-4, GPT-4o, o1, o3 models",
  },
  google: {
    label: "Google AI",
    icon: Cloud,
    description: "Gemini models",
  },
  openrouter: {
    label: "OpenRouter",
    icon: Cloud,
    description: "Claude, Llama, Mistral, and more",
  },
  anthropic: {
    label: "Anthropic",
    icon: Cloud,
    description: "Claude models (not yet implemented)",
  },
};

function ProviderSection({
  provider,
  existingModelIds,
  onAddModels,
}: {
  provider: Provider;
  existingModelIds: Set<string>;
  onAddModels: (models: Partial<Model>[]) => void;
}) {
  const [result, setResult] = useState<ProviderModelsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const info = PROVIDER_INFO[provider];
  const Icon = info.icon;

  const fetchModels = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const method = forceRefresh ? "POST" : "GET";
      const res = await fetch(`/api/providers/${provider}/models`, { method });
      const data = await res.json();
      setResult(data);
      setSelected(new Set()); // Clear selection on refresh
    } catch (error) {
      setResult({
        provider,
        connected: false,
        error: error instanceof Error ? error.message : "Failed to fetch",
        models: [],
      });
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const toggleSelect = (modelId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId);
    } else {
      newSelected.add(modelId);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (!result) return;
    const filtered = filteredModels;
    const allSelected = filtered.every((m) => selected.has(m.id) || existingModelIds.has(`${provider}-${m.id.replace(/\//g, "-")}`));
    
    if (allSelected) {
      // Deselect all
      const newSelected = new Set(selected);
      filtered.forEach((m) => newSelected.delete(m.id));
      setSelected(newSelected);
    } else {
      // Select all that aren't already added
      const newSelected = new Set(selected);
      filtered.forEach((m) => {
        if (!existingModelIds.has(`${provider}-${m.id.replace(/\//g, "-")}`)) {
          newSelected.add(m.id);
        }
      });
      setSelected(newSelected);
    }
  };

  const handleAddSelected = () => {
    if (!result) return;
    
    const modelsToAdd = result.models
      .filter((m) => selected.has(m.id))
      .map((m) => ({
        id: `${provider}-${m.id.replace(/\//g, "-")}-${Date.now()}`,
        provider,
        modelId: m.id,
        displayName: provider === "openrouter" ? m.id.split("/").pop() || m.name : m.name,
        supportsVision: m.supportsVision || false,
        supportsAudio: m.supportsAudio || false,
        maxTokens: m.contextWindow || 128000,
        config: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
        isActive: true,
        createdAt: new Date().toISOString(),
      }));
    
    onAddModels(modelsToAdd);
    setSelected(new Set());
  };

  const filteredModels = result?.models.filter((m) => {
    if (!filter) return true;
    const searchLower = filter.toLowerCase();
    return (
      m.id.toLowerCase().includes(searchLower) ||
      m.name.toLowerCase().includes(searchLower) ||
      m.description?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const selectableCount = filteredModels.filter(
    (m) => !existingModelIds.has(`${provider}-${m.id.replace(/\//g, "-")}`)
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">{info.label}</CardTitle>
              <CardDescription className="text-xs">{info.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <Badge
                variant={result.connected ? "default" : "destructive"}
                className="gap-1"
              >
                {result.connected ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    {result.error || "Not connected"}
                  </>
                )}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchModels(true)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !result && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {result && !result.connected && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>
              {result.error === "API key not configured"
                ? "Add API key above to discover available models"
                : result.error}
            </span>
          </div>
        )}

        {result && result.connected && result.models.length === 0 && (
          <div className="text-sm text-muted-foreground py-4">
            No models found
          </div>
        )}

        {result && result.connected && result.models.length > 0 && (
          <div className="space-y-3">
            {/* Search and controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter models..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selected.size === selectableCount && selectableCount > 0 ? "Deselect All" : "Select All"}
              </Button>
            </div>

            {/* Models list */}
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {filteredModels.map((model) => {
                const modelKey = `${provider}-${model.id.replace(/\//g, "-")}`;
                const isExisting = Array.from(existingModelIds).some(id => 
                  id.startsWith(modelKey) || id.includes(model.id.replace(/\//g, "-"))
                );
                const isSelected = selected.has(model.id);

                return (
                  <div
                    key={model.id}
                    className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 ${
                      isExisting ? "opacity-50 bg-muted/30" : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isExisting}
                      onCheckedChange={() => toggleSelect(model.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {model.name}
                        </span>
                        {model.supportsVision && (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <Eye className="h-3 w-3" />
                            Vision
                          </Badge>
                        )}
                        {isExisting && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            Added
                          </Badge>
                        )}
                      </div>
                      {model.description && model.description !== model.name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {model.description}
                        </p>
                      )}
                    </div>
                    {model.contextWindow && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(model.contextWindow / 1000).toFixed(0)}k ctx
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add button */}
            {selected.size > 0 && (
              <div className="flex justify-end">
                <Button onClick={handleAddSelected} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add {selected.size} Model{selected.size !== 1 ? "s" : ""} to Config
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {result.models.length} models available
              {filter && ` · ${filteredModels.length} matching filter`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ModelDiscovery({ existingModels, onAddModels }: ModelDiscoveryProps) {
  // Create a set of existing model IDs for quick lookup
  const existingModelIds = new Set(existingModels.map((m) => m.id));

  const providers: Provider[] = ["ollama", "openai", "google", "openrouter"];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Model Discovery</h3>
        <p className="text-sm text-muted-foreground">
          Discover and add models from your configured providers
        </p>
      </div>

      <div className="grid gap-4">
        {providers.map((provider) => (
          <ProviderSection
            key={provider}
            provider={provider}
            existingModelIds={existingModelIds}
            onAddModels={onAddModels}
          />
        ))}
      </div>
    </div>
  );
}
