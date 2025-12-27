"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function EvaluatorsPage() {
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
        title: "Failed to load evaluators",
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
        title: "Judge settings saved",
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

  async function saveRubric(rubricData: Omit<Rubric, "createdAt" | "updatedAt">) {
    try {
      const res = await fetch("/api/rubrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rubricData),
      });
      const data = await res.json();
      
      if (data.rubric) {
        // Update local state
        setRubrics((prev) => {
          const index = prev.findIndex((r) => r.id === data.rubric.id);
          if (index >= 0) {
            const newRubrics = [...prev];
            newRubrics[index] = data.rubric;
            return newRubrics;
          }
          return [...prev, data.rubric];
        });
        
        toast({
          type: "success",
          title: editingRubric ? "Rubric updated" : "Rubric created",
        });
      }
    } catch (error) {
      console.error("Failed to save rubric:", error);
      toast({
        type: "error",
        title: "Failed to save rubric",
      });
    } finally {
      setEditingRubric(null);
      setCreatingRubric(false);
    }
  }

  async function deleteRubric(id: string) {
    if (!confirm("Delete this rubric? This cannot be undone.")) return;

    try {
      const res = await fetch(`/api/rubrics?id=${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setRubrics((prev) => prev.filter((r) => r.id !== id));
        toast({
          type: "success",
          title: "Rubric deleted",
        });
      } else {
        const data = await res.json();
        toast({
          type: "error",
          title: "Cannot delete rubric",
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Failed to delete rubric:", error);
      toast({
        type: "error",
        title: "Failed to delete rubric",
      });
    }
  }

  function updateJudgeConfig(updates: Partial<Settings["judge"]>) {
    if (!settings) return;
    setSettings({
      ...settings,
      judge: {
        modelId: settings.judge?.modelId || settings.defaults.llmJudgeModel,
        temperature: settings.judge?.temperature ?? 0.3,
        runs: settings.judge?.runs ?? 1,
        includeReasoning: settings.judge?.includeReasoning ?? true,
        ...updates,
      },
    });
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group rubrics by scope
  const globalRubrics = rubrics.filter((r) => r.scope !== "prompt-specific");
  const promptSpecificRubrics = rubrics.filter((r) => r.scope === "prompt-specific");

  // Active models for judge selection
  const activeModels = models.filter((m) => m.isActive);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluators</h1>
          <p className="text-muted-foreground mt-1">
            Configure LLM judge and manage evaluation rubrics
          </p>
        </div>
      </div>

      {/* Judge Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            LLM Judge Configuration
          </CardTitle>
          <CardDescription>
            Settings for automated evaluations using an LLM as judge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="judge-model">Judge Model</Label>
              <Select
                value={settings.judge?.modelId || settings.defaults.llmJudgeModel}
                onValueChange={(v) => updateJudgeConfig({ modelId: v })}
              >
                <SelectTrigger id="judge-model">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {activeModels.length === 0 ? (
                    <SelectItem value="" disabled>
                      No models configured
                    </SelectItem>
                  ) : (
                    activeModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.displayName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Model used to evaluate responses
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="judge-temp">Temperature</Label>
              <Input
                id="judge-temp"
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={settings.judge?.temperature ?? 0.3}
                onChange={(e) =>
                  updateJudgeConfig({ temperature: parseFloat(e.target.value) || 0.3 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Lower = more consistent judgments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-reasoning"
                checked={settings.judge?.includeReasoning ?? true}
                onCheckedChange={(c) => updateJudgeConfig({ includeReasoning: c === true })}
              />
              <Label htmlFor="include-reasoning" className="font-normal">
                Include reasoning in evaluations
              </Label>
            </div>
          </div>

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
                  Save Judge Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rubrics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Rubrics</h2>
            <p className="text-sm text-muted-foreground">
              {rubrics.length} rubric{rubrics.length !== 1 ? "s" : ""} configured
            </p>
          </div>
          <Button onClick={() => setCreatingRubric(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Rubric
          </Button>
        </div>

        {/* Global Rubrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Global Rubrics
            </CardTitle>
            <CardDescription>
              Available for all prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {globalRubrics.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No global rubrics yet
              </p>
            ) : (
              <div className="space-y-2">
                {globalRubrics.map((rubric) => {
                  const stats = usage[rubric.id];
                  const isDefault = rubric.isDefault;
                  const isDefaultRubric = settings.defaults.defaultRubricId === rubric.id;

                  return (
                    <div
                      key={rubric.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rubric.name}</span>
                            {isDefault && (
                              <Badge variant="secondary" className="text-xs">
                                Built-in
                              </Badge>
                            )}
                            {isDefaultRubric && (
                              <Badge className="text-xs gap-1">
                                <Star className="h-3 w-3" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{rubric.items.length} items</span>
                            {stats && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {stats.humanEvaluationCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bot className="h-3 w-3" />
                                  {stats.llmEvaluationCount}
                                </span>
                              </>
                            )}
                          </div>
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
                        {!isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRubric(rubric.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prompt-Specific Rubrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Prompt-Specific Rubrics
            </CardTitle>
            <CardDescription>
              Custom rubrics for specific prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {promptSpecificRubrics.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No prompt-specific rubrics yet. Create one when you need custom
                evaluation criteria for a particular prompt.
              </p>
            ) : (
              <div className="space-y-2">
                {promptSpecificRubrics.map((rubric) => {
                  const stats = usage[rubric.id];

                  return (
                    <div
                      key={rubric.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{rubric.name}</span>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{rubric.items.length} items</span>
                            {rubric.promptIds && rubric.promptIds.length > 0 && (
                              <>
                                <span>·</span>
                                <span>
                                  Linked to {rubric.promptIds.length} prompt
                                  {rubric.promptIds.length !== 1 ? "s" : ""}
                                </span>
                              </>
                            )}
                            {stats && stats.evaluationCount > 0 && (
                              <>
                                <span>·</span>
                                <span>{stats.evaluationCount} evaluations</span>
                              </>
                            )}
                          </div>
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
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rubric Editor Modal */}
      {(editingRubric || creatingRubric) && (
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
