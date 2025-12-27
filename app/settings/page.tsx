"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Save, Eye, EyeOff, Key, Server, Settings2, Layers, ClipboardCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ModelDiscovery } from "@/components/model-discovery";
import { useToast } from "@/hooks/use-toast";
import type { Settings, Model } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [settingsRes, modelsRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/models"),
      ]);
      const settingsData = await settingsRes.json();
      const modelsData = await modelsRes.json();
      setSettings(settingsData);
      setModels(modelsData.models || []);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        type: "error",
        title: "Failed to load settings",
        description: "Please refresh the page",
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      toast({
        type: "success",
        title: "Settings saved",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        type: "error",
        title: "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveModels(updatedModels: Model[]) {
    try {
      await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ models: updatedModels }),
      });
      setModels(updatedModels);
    } catch (error) {
      console.error("Failed to save models:", error);
      toast({
        type: "error",
        title: "Failed to save models",
      });
    }
  }

  function updateApiKey(provider: keyof Settings["apiKeys"], value: string) {
    if (!settings) return;
    setSettings({
      ...settings,
      apiKeys: { ...settings.apiKeys, [provider]: value },
    });
  }

  function toggleShowKey(provider: string) {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  }

  function handleAddModels(newModels: Partial<Model>[]) {
    const updatedModels = [...models, ...newModels as Model[]];
    saveModels(updatedModels);
    toast({
      type: "success",
      title: `Added ${newModels.length} model${newModels.length !== 1 ? "s" : ""}`,
      description: "Models are now available for vibe checks",
    });
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure API keys, discover models, and set defaults
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="model-discovery" className="gap-2">
            <Layers className="h-4 w-4" />
            Model Discovery
          </TabsTrigger>
          <TabsTrigger value="defaults" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Defaults
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Your API keys are stored locally and never sent to our servers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* OpenAI */}
              <div className="space-y-2">
                <Label htmlFor="openai">OpenAI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="openai"
                    type={showKeys.openai ? "text" : "password"}
                    placeholder="sk-..."
                    value={settings.apiKeys.openai || ""}
                    onChange={(e) => updateApiKey("openai", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleShowKey("openai")}
                  >
                    {showKeys.openai ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Google */}
              <div className="space-y-2">
                <Label htmlFor="google">Google AI API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="google"
                    type={showKeys.google ? "text" : "password"}
                    placeholder="AIza..."
                    value={settings.apiKeys.google || ""}
                    onChange={(e) => updateApiKey("google", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleShowKey("google")}
                  >
                    {showKeys.google ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* OpenRouter */}
              <div className="space-y-2">
                <Label htmlFor="openrouter">OpenRouter API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="openrouter"
                    type={showKeys.openrouter ? "text" : "password"}
                    placeholder="sk-or-..."
                    value={settings.apiKeys.openrouter || ""}
                    onChange={(e) => updateApiKey("openrouter", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleShowKey("openrouter")}
                  >
                    {showKeys.openrouter ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use OpenRouter to access Anthropic, Mistral, Meta, and other
                  models
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ollama */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Ollama Configuration
              </CardTitle>
              <CardDescription>
                Configure your local Ollama instance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ollama-url">Ollama Base URL</Label>
                <Input
                  id="ollama-url"
                  placeholder="http://localhost:11434"
                  value={settings.ollamaBaseUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, ollamaBaseUrl: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save API Keys
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Model Discovery Tab */}
        <TabsContent value="model-discovery">
          <ModelDiscovery
            existingModels={models}
            onAddModels={handleAddModels}
          />
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Run Defaults</CardTitle>
              <CardDescription>
                Default values for new runs and evaluations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llm-judge">LLM Judge Model</Label>
                <Input
                  id="llm-judge"
                  placeholder="gpt-4o-mini"
                  value={settings.defaults.llmJudgeModel}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaults: {
                        ...settings.defaults,
                        llmJudgeModel: e.target.value,
                      },
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Model used for LLM-as-judge evaluations
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="iterations">Default Iterations</Label>
                  <Input
                    id="iterations"
                    type="number"
                    min={1}
                    max={10}
                    value={settings.defaults.iterations}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaults: {
                          ...settings.defaults,
                          iterations: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Default Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={settings.defaults.temperature}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaults: {
                          ...settings.defaults,
                          temperature: parseFloat(e.target.value) || 0.7,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Defaults
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
