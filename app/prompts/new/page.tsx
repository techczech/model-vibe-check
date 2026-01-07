"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Upload,
  FileText,
  Image,
  X,
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Attachment, EvaluationMethod, MachineJudgeConfig } from "@/lib/types";
import { MachineJudgeConfigEditor } from "@/components/machine-judge-config";

const CATEGORIES = [
  "Spatial Cognition",
  "Multilingual",
  "Linguistics",
  "Coding",
  "Creative Writing",
  "Vision",
  "Agentic",
  "Long Context",
  "Reasoning",
  "Multi-turn",
  "Other",
];

const EVAL_METHODS: { value: EvaluationMethod; label: string }[] = [
  { value: "human", label: "Human Rating" },
  { value: "llm-judge", label: "LLM Judge" },
  { value: "machine", label: "Machine Check" },
  { value: "pairwise", label: "Pairwise Comparison" },
];

const MAX_STEPS = 10;

interface StepFormData {
  id: string;
  content: string;
  expectedAnswer: string;
  expanded: boolean;
}

export default function NewPromptPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [keywords, setKeywords] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [methods, setMethods] = useState<EvaluationMethod[]>(["human"]);
  const [machineJudge, setMachineJudge] = useState<MachineJudgeConfig | undefined>(undefined);
  const [llmCriteria, setLlmCriteria] = useState("");

  // Steps state - starts with one step
  const [steps, setSteps] = useState<StepFormData[]>([
    { id: "step-1", content: "", expectedAnswer: "", expanded: true },
  ]);

  // Multi-step mode (show step builder UI)
  const isMultiStep = steps.length > 1;

  function toggleMethod(method: EvaluationMethod) {
    if (methods.includes(method)) {
      setMethods(methods.filter((m) => m !== method));
    } else {
      setMethods([...methods, method]);
    }
  }

  // Step management functions
  function addStep() {
    if (steps.length >= MAX_STEPS) return;
    const newStep: StepFormData = {
      id: `step-${steps.length + 1}`,
      content: "",
      expectedAnswer: "",
      expanded: true,
    };
    // Collapse previous steps when adding a new one
    setSteps([
      ...steps.map((s) => ({ ...s, expanded: false })),
      newStep,
    ]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof StepFormData, value: string | boolean) {
    setSteps(
      steps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    );
  }

  function toggleStepExpanded(index: number) {
    setSteps(
      steps.map((step, i) =>
        i === index ? { ...step, expanded: !step.expanded } : step
      )
    );
  }

  function moveStep(index: number, direction: "up" | "down") {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.attachment) {
          setAttachments((prev) => [...prev, data.attachment]);
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function removeAttachment(att: Attachment) {
    try {
      await fetch(`/api/attachments?path=${encodeURIComponent(att.path)}`, {
        method: "DELETE",
      });
      setAttachments(attachments.filter((a) => a.id !== att.id));
    } catch (error) {
      console.error("Failed to delete attachment:", error);
    }
  }

  async function savePrompt() {
    const validSteps = steps.filter((s) => s.content.trim());
    if (!title || validSteps.length === 0) return;

    setSaving(true);
    try {
      const prompt = {
        title,
        category,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        description: description || undefined,
        // New steps format
        steps: validSteps.map((s, i) => ({
          id: `step-${i + 1}`,
          sequence: i + 1,
          content: s.content,
          expectedAnswer: s.expectedAnswer || undefined,
        })),
        // Deprecated fields for backward compat
        content: validSteps[0]?.content || "",
        expectedAnswer: validSteps[0]?.expectedAnswer || undefined,
        attachments,
        evaluationConfig: {
          methods,
          machineJudge: methods.includes("machine") ? machineJudge : undefined,
          llmJudge: methods.includes("llm-judge") && llmCriteria
            ? { criteria: llmCriteria }
            : undefined,
        },
      };

      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prompt),
      });

      const data = await res.json();
      if (data.prompt) {
        router.push(`/prompts/${data.prompt.id}`);
      }
    } catch (error) {
      console.error("Failed to save prompt:", error);
    } finally {
      setSaving(false);
    }
  }

  const validSteps = steps.filter((s) => s.content.trim());
  const hasContent = validSteps.length > 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/prompts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">New Prompt</h1>
            {isMultiStep && (
              <p className="text-sm text-muted-foreground">
                Multi-turn conversation ({steps.length} steps)
              </p>
            )}
          </div>
        </div>
        <Button onClick={savePrompt} disabled={saving || !title || !hasContent}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Prompt title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this prompt tests"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prompt Content / Steps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {isMultiStep ? "Conversation Steps" : "Prompt Content *"}
            </CardTitle>
            {isMultiStep && (
              <p className="text-sm text-muted-foreground mt-1">
                {steps.length} step{steps.length !== 1 ? "s" : ""} · Max {MAX_STEPS}
              </p>
            )}
          </div>
          {!isMultiStep ? (
            <Button variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={addStep}
              disabled={steps.length >= MAX_STEPS}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single-step mode: simple textarea */}
          {!isMultiStep ? (
            <>
              <Textarea
                value={steps[0].content}
                onChange={(e) => updateStep(0, "content", e.target.value)}
                placeholder="Enter your prompt here..."
                rows={8}
                className="font-mono"
              />

              <div className="space-y-2">
                <Label htmlFor="expected">Expected Answer (optional)</Label>
                <Textarea
                  id="expected"
                  value={steps[0].expectedAnswer}
                  onChange={(e) => updateStep(0, "expectedAnswer", e.target.value)}
                  placeholder="What's the expected or ideal response?"
                  rows={4}
                />
              </div>
            </>
          ) : (
            /* Multi-step mode: collapsible step builder */
            <>
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Step Header */}
                  <div
                    className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer"
                    onClick={() => toggleStepExpanded(index)}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">
                      Step {index + 1}
                    </span>
                    {step.content && (
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {step.content.substring(0, 50)}
                        {step.content.length > 50 ? "..." : ""}
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      {/* Move buttons */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(index, "up");
                        }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(index, "down");
                        }}
                        disabled={index === steps.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      {/* Delete button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStep(index);
                        }}
                        disabled={steps.length <= 1}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      {/* Expand/Collapse indicator */}
                      {step.expanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Step Content (collapsible) */}
                  {step.expanded && (
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label>User Message *</Label>
                        <Textarea
                          value={step.content}
                          onChange={(e) =>
                            updateStep(index, "content", e.target.value)
                          }
                          placeholder={
                            index === 0
                              ? "Enter the initial user message..."
                              : "Enter the follow-up message..."
                          }
                          rows={4}
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          {index === 0
                            ? "This is the first message in the conversation"
                            : "The model will see all previous messages before this one"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Expected Response (optional)</Label>
                        <Textarea
                          value={step.expectedAnswer}
                          onChange={(e) =>
                            updateStep(index, "expectedAnswer", e.target.value)
                          }
                          placeholder="What should the model ideally respond?"
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Quick add button at bottom */}
              {steps.length < MAX_STEPS && (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={addStep}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Step
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Conversation Preview (multi-step only) */}
      {isMultiStep && validSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversation Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {validSteps.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{step.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 opacity-50">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 p-3 bg-secondary/50 rounded-lg border-dashed border">
                  <p className="text-sm text-muted-foreground italic">
                    Model response will appear here...
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File list */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 p-2 rounded border"
                >
                  {att.type === "image" ? (
                    <Image className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.filename}</p>
                    <p className="text-xs text-muted-foreground">{att.mimeType}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachment(att)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,text/*,.txt,.md,.json,.csv"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Attachment
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Supported: images (png, jpg, gif), text files (txt, md, json, csv)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evaluation Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Methods */}
          <div className="space-y-2">
            <Label>Evaluation Methods</Label>
            <div className="flex flex-wrap gap-2">
              {EVAL_METHODS.map((method) => (
                <Badge
                  key={method.value}
                  variant={methods.includes(method.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleMethod(method.value)}
                >
                  {method.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Machine Judge Config */}
          {methods.includes("machine") && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <p className="text-sm font-medium">Machine Judge Configuration</p>
              <MachineJudgeConfigEditor
                config={machineJudge}
                onChange={setMachineJudge}
              />
            </div>
          )}

          {/* LLM Judge Config */}
          {methods.includes("llm-judge") && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <p className="text-sm font-medium">LLM Judge Configuration</p>
              <div className="space-y-2">
                <Label>Custom Criteria (optional)</Label>
                <Textarea
                  value={llmCriteria}
                  onChange={(e) => setLlmCriteria(e.target.value)}
                  placeholder="Additional criteria for the LLM judge to consider..."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use default rubric (accuracy, completeness,
                  clarity, relevance)
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
