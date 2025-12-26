"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Upload,
  FileText,
  Image,
  X,
} from "lucide-react";
import type { Prompt, Attachment, EvaluationMethod } from "@/lib/types";

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
  "Other",
];

const EVAL_METHODS: { value: EvaluationMethod; label: string }[] = [
  { value: "human", label: "Human Rating" },
  { value: "llm-judge", label: "LLM Judge" },
  { value: "machine", label: "Machine Check" },
  { value: "pairwise", label: "Pairwise Comparison" },
];

const MACHINE_TYPES = ["contains", "regex", "exact", "json-schema", "custom"];

export default function EditPromptPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const promptId = params.id as string;
  const isNew = promptId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [keywords, setKeywords] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [methods, setMethods] = useState<EvaluationMethod[]>(["human"]);
  const [machineType, setMachineType] = useState("contains");
  const [machineCriteria, setMachineCriteria] = useState("");
  const [machineCaseSensitive, setMachineCaseSensitive] = useState(false);
  const [llmCriteria, setLlmCriteria] = useState("");

  useEffect(() => {
    if (!isNew) {
      loadPrompt();
    }
  }, [isNew, promptId]);

  async function loadPrompt() {
    try {
      const res = await fetch(`/api/prompts?id=${promptId}`);
      const data = await res.json();
      const prompt = data.prompts?.find((p: Prompt) => p.id === promptId) || data;

      if (prompt) {
        setTitle(prompt.title);
        setCategory(prompt.category);
        setKeywords(prompt.keywords?.join(", ") || "");
        setDescription(prompt.description || "");
        setContent(prompt.content);
        setExpectedAnswer(prompt.expectedAnswer || "");
        setAttachments(prompt.attachments || []);
        setMethods(prompt.evaluationConfig?.methods || ["human"]);

        if (prompt.evaluationConfig?.machineJudge) {
          setMachineType(prompt.evaluationConfig.machineJudge.type);
          setMachineCriteria(prompt.evaluationConfig.machineJudge.criteria);
          setMachineCaseSensitive(
            prompt.evaluationConfig.machineJudge.caseSensitive || false
          );
        }

        if (prompt.evaluationConfig?.llmJudge?.criteria) {
          setLlmCriteria(prompt.evaluationConfig.llmJudge.criteria);
        }
      }
    } catch (error) {
      console.error("Failed to load prompt:", error);
    } finally {
      setLoading(false);
    }
  }

  function toggleMethod(method: EvaluationMethod) {
    if (methods.includes(method)) {
      setMethods(methods.filter((m) => m !== method));
    } else {
      setMethods([...methods, method]);
    }
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
    if (!title || !content) return;

    setSaving(true);
    try {
      const prompt: Partial<Prompt> = {
        id: isNew ? undefined : promptId,
        title,
        category,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        description: description || undefined,
        content,
        expectedAnswer: expectedAnswer || undefined,
        attachments,
        evaluationConfig: {
          methods,
          machineJudge: methods.includes("machine")
            ? {
                type: machineType as any,
                criteria: machineCriteria,
                caseSensitive: machineCaseSensitive,
              }
            : undefined,
          llmJudge: methods.includes("llm-judge") && llmCriteria
            ? { criteria: llmCriteria }
            : undefined,
        },
      };

      const res = await fetch("/api/prompts", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prompt),
      });

      const data = await res.json();
      if (data.prompt || data.success) {
        router.push(`/prompts/${data.prompt?.id || promptId}`);
      }
    } catch (error) {
      console.error("Failed to save prompt:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={isNew ? "/prompts" : `/prompts/${promptId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {isNew ? "New Prompt" : "Edit Prompt"}
          </h1>
        </div>
        <Button onClick={savePrompt} disabled={saving || !title || !content}>
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

      {/* Prompt Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt Content *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={8}
            className="font-mono"
          />

          <div className="space-y-2">
            <Label htmlFor="expected">Expected Answer (optional)</Label>
            <Textarea
              id="expected"
              value={expectedAnswer}
              onChange={(e) => setExpectedAnswer(e.target.value)}
              placeholder="What's the expected or ideal response?"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

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
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={machineType} onValueChange={setMachineType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MACHINE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Case Sensitive</Label>
                  <Select
                    value={machineCaseSensitive ? "yes" : "no"}
                    onValueChange={(v) => setMachineCaseSensitive(v === "yes")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Criteria</Label>
                <Textarea
                  value={machineCriteria}
                  onChange={(e) => setMachineCriteria(e.target.value)}
                  placeholder={
                    machineType === "contains"
                      ? "word1, word2, word3"
                      : machineType === "regex"
                      ? "(pattern1|pattern2)"
                      : "Enter criteria..."
                  }
                  rows={2}
                  className="font-mono text-sm"
                />
              </div>
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
