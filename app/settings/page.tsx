"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Save, Eye, EyeOff, Key, Server } from "lucide-react";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
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
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
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

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure API keys and default preferences
        </p>
      </div>

      {/* API Keys */}
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

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
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
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
