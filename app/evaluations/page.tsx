"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Bot,
  User,
  FileText,
  Save,
  Star,
  Globe,
  Target,
  ClipboardCheck,
  Sparkles,
  Settings2,
} from "lucide-react";
import { RubricEditor } from "@/components/rubric-editor";
import { useToast } from "@/hooks/use-toast";
import type { Rubric, Settings, Model } from "@/lib/types";

interface RubricUsageStats {
  rubricId: string;
  promptCount: number;
  evaluationCount: number;
  humanEvaluationCount: number;
  llmEvaluationCount: number;
}

export default function EvaluationsPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [usage, setUsage] = useState<Record<string, RubricUsageStats>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [creatingRubric, setCreatingRubric] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [rubricsRes, usageRes, settingsRes, modelsRes] = await Promise.all([
        fetch("/api/rubrics"),
        fetch("/api/rubrics/usage"),
        fetch("/api/settings"),
        fetch("/api/models"),
      ]);

      const [rubricsData, usageData, settingsData, modelsData] = await Promise.all([
        rubricsRes.json(),
        usageRes.json(),
        settingsRes.json(),
        modelsRes.json(),
      ]);

      setRubrics(rubricsData.rubrics || []);
      setUsage(usageData.usage || {});
      setSettings(settingsData);
      setModels(modelsData.models || []);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        type: "error",
        title: "Failed to load evaluations data",
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
        title: "Judge configuration saved",
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

  async function saveRubric(rubric: Omit<Rubric, "createdAt" | "updatedAt">) {
    try {
      const res = await fetch("/api/rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rubric),
      });
      if (!res.ok) throw new Error("Failed to save rubric");

      toast({
        type: "success",
        title: rubric.id ? "Rubric updated" : "Rubric created",
      });

      setEditingRubric(null);
      setCreatingRubric(false);
      loadData();
    } catch (error) {
      console.error("Failed to save rubric:", error);
      toast({
        type: "error",
        title: "Failed to save rubric",
      });
    }
  }

  async function deleteRubric(rubricId: string) {
    if (!confirm("Are you sure you want to delete this rubric?")) return;

    try {
      const res = await fetch(`/api/rubrics?id=${rubricId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete rubric");
      }

      toast({
        type: "success",
        title: "Rubric deleted",
      });
      loadData();
    } catch (error: any) {
      console.error("Failed to delete rubric:", error);
      toast({
        type: "error",
        title: error.message || "Failed to delete rubric",
      });
    }
  }

  function updateJudgeConfig(key: string, value: string | number | boolean) {
    if (!settings) return;
    const defaultJudge = {
      modelId: "",
      temperature: 0.3,
      runs: 1,
      includeReasoning: true,
    };
    setSettings({
      ...settings,
      judge: {
        ...defaultJudge,
        ...settings.judge,
        [key]: value,
      } as Settings["judge"],
    });
  }

  const globalRubrics = rubrics.filter((r) => r.scope === "global");
  const promptRubrics = rubrics.filter((r) => r.scope === "prompt-specific");
  const activeModels = models.filter((m) => m.isActive);

  // Calculate total evaluations
  const totalEvaluations = Object.values(usage).reduce(
    (sum, u) => sum + u.evaluationCount,
    0
  );
  const humanEvaluations = Object.values(usage).reduce(
    (sum, u) => sum + u.humanEvaluationCount,
    0
  );
  const llmEvaluations = Object.values(usage).reduce(
    (sum, u) => sum + u.llmEvaluationCount,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8" />
            Evaluations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage rubrics and configure LLM-as-judge settings
          </p>
        </div>
        <Button onClick={() => setCreatingRubric(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Rubric
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rubrics.length}</p>
                <p className="text-sm text-muted-foreground">Rubrics</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEvaluations}</p>
                <p className="text-sm text-muted-foreground">Total evaluations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <User className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{humanEvaluations}</p>
                <p className="text-sm text-muted-foreground">Human evaluations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <Bot className="h-5 w-5 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <p className="text-2xl font-bold">{llmEvaluations}</p>
                <p className="text-sm text-muted-foreground">LLM evaluations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LLM Judge Configuration - Left Column */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              LLM Judge
            </CardTitle>
            <CardDescription>
              Configure which model evaluates responses automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Judge Model</Label>
              <Select
                value={settings?.judge?.modelId || ""}
                onValueChange={(value) => updateJudgeConfig("modelId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {activeModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeModels.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No active models. Add models in the Models section.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Temperature: {settings?.judge?.temperature ?? 0.3}</Label>
              <Slider
                value={[settings?.judge?.temperature ?? 0.3]}
                onValueChange={([value]) => updateJudgeConfig("temperature", value)}
                min={0}
                max={1}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                Lower = more consistent, Higher = more creative
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeReasoning"
                checked={settings?.judge?.includeReasoning ?? true}
                onCheckedChange={(checked) =>
                  updateJudgeConfig("includeReasoning", checked)
                }
              />
              <Label htmlFor="includeReasoning" className="text-sm">
                Include reasoning in evaluations
              </Label>
            </div>

            <Button
              onClick={saveSettings}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Rubrics - Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Global Rubrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Global Rubrics
              </CardTitle>
              <CardDescription>
                Available for all prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {globalRubrics.map((rubric) => {
                  const stats = usage[rubric.id];
                  return (
                    <div
                      key={rubric.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rubric.name}</span>
                            {rubric.isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Built-in
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rubric.items.length} items
                            {stats && stats.evaluationCount > 0 && (
                              <>
                                {" · "}
                                <span className="text-green-600 dark:text-green-400">
                                  {stats.humanEvaluationCount} 👤
                                </span>
                                {" · "}
                                <span className="text-purple-600 dark:text-purple-400">
                                  {stats.llmEvaluationCount} 🤖
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRubric(rubric)}
                          disabled={rubric.isDefault}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRubric(rubric.id)}
                          disabled={rubric.isDefault}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {globalRubrics.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No global rubrics yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Prompt-Specific Rubrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Prompt-Specific Rubrics
              </CardTitle>
              <CardDescription>
                Custom rubrics for specific prompts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promptRubrics.map((rubric) => {
                  const stats = usage[rubric.id];
                  return (
                    <div
                      key={rubric.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rubric.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rubric.items.length} items
                            {rubric.promptIds && rubric.promptIds.length > 0 && (
                              <> · Linked to {rubric.promptIds.length} prompt(s)</>
                            )}
                            {stats && stats.evaluationCount > 0 && (
                              <>
                                {" · "}
                                <span className="text-green-600 dark:text-green-400">
                                  {stats.humanEvaluationCount} 👤
                                </span>
                                {" · "}
                                <span className="text-purple-600 dark:text-purple-400">
                                  {stats.llmEvaluationCount} 🤖
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRubric(rubric)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRubric(rubric.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {promptRubrics.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No prompt-specific rubrics yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rubric Editor Modal */}
      {(creatingRubric || editingRubric) && (
        <RubricEditor
          rubric={editingRubric || undefined}
          onSave={saveRubric}
          onClose={() => {
            setEditingRubric(null);
            setCreatingRubric(false);
          }}
        />
      )}
    </div>
  );
}
