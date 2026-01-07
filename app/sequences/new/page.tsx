"use client";

import { useState } from "react";
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
  Plus,
  Trash2,
  GripVertical,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { EvaluationMethod, PromptStep } from "@/lib/types";

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
];

const MAX_STEPS = 10;

interface StepFormData {
  id: string;
  content: string;
  expectedAnswer: string;
  expanded: boolean;
}

export default function NewSequencePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Multi-turn");
  const [keywords, setKeywords] = useState("");
  const [description, setDescription] = useState("");
  const [methods, setMethods] = useState<EvaluationMethod[]>(["human"]);

  // Steps state
  const [steps, setSteps] = useState<StepFormData[]>([
    { id: "step-1", content: "", expectedAnswer: "", expanded: true },
  ]);

  function toggleMethod(method: EvaluationMethod) {
    if (methods.includes(method)) {
      setMethods(methods.filter((m) => m !== method));
    } else {
      setMethods([...methods, method]);
    }
  }

  function addStep() {
    if (steps.length >= MAX_STEPS) return;
    const newStep: StepFormData = {
      id: `step-${steps.length + 1}`,
      content: "",
      expectedAnswer: "",
      expanded: true,
    };
    // Collapse previous steps
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

  async function saveSequence() {
    if (!title || steps.every((s) => !s.content.trim())) return;

    setSaving(true);
    try {
      const sequence = {
        title,
        category,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        description: description || undefined,
        steps: steps
          .filter((s) => s.content.trim())
          .map((s, i) => ({
            id: `step-${i + 1}`,
            sequence: i + 1,
            content: s.content,
            expectedAnswer: s.expectedAnswer || undefined,
          })),
        evaluationConfig: {
          methods,
        },
      };

      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sequence),
      });

      const data = await res.json();
      if (data.sequence) {
        router.push("/sequences");
      }
    } catch (error) {
      console.error("Failed to save sequence:", error);
    } finally {
      setSaving(false);
    }
  }

  const validSteps = steps.filter((s) => s.content.trim());

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sequences">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">New Sequence</h1>
            <p className="text-sm text-muted-foreground">
              Multi-turn conversation for testing context retention
            </p>
          </div>
        </div>
        <Button
          onClick={saveSequence}
          disabled={saving || !title || validSteps.length === 0}
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Sequence
            </>
          )}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sequence Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Code Review Conversation"
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
              placeholder="multi-turn, context, follow-up"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this sequence test? (e.g., ability to maintain context across turns)"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversation Steps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Conversation Steps</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {steps.length} step{steps.length !== 1 ? "s" : ""} · Max {MAX_STEPS}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={addStep}
            disabled={steps.length >= MAX_STEPS}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
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
                  {/* Expand/Collapse */}
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
        </CardContent>
      </Card>

      {/* Evaluation Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evaluation Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-xs text-muted-foreground">
              Evaluation applies to the overall sequence performance
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {validSteps.length > 0 && (
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
    </div>
  );
}
