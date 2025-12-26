"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Check, AlertCircle } from "lucide-react";

interface ImportedPrompt {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords?: string[];
  description?: string;
  expectedAnswer?: string;
  evaluationConfig?: {
    methods?: string[];
    machineJudge?: any;
    llmJudge?: any;
  };
  attachments?: any[];
}

export default function ImportPromptsPage() {
  const router = useRouter();
  const [jsonInput, setJsonInput] = useState("");
  const [parsed, setParsed] = useState<ImportedPrompt[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    setError(null);
    setParsed(null);

    try {
      const data = JSON.parse(jsonInput);

      // Handle different formats
      let prompts: ImportedPrompt[] = [];

      if (Array.isArray(data)) {
        prompts = data;
      } else if (data.prompts && Array.isArray(data.prompts)) {
        prompts = data.prompts;
      } else if (data.contentData && Array.isArray(data.contentData)) {
        // Handle semanticmachines.fyi format
        prompts = data.contentData.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          title: item.title || "Untitled",
          category: item.category || "Uncategorized",
          content: item.content || item.prompt || "",
          keywords: item.keywords || [],
          description: item.description || "",
          expectedAnswer: item.expectedAnswer || "",
          evaluationConfig: {
            methods: ["human", "llm-judge"],
            ...item.evaluationConfig,
          },
          attachments: item.attachments || [],
        }));
      } else {
        throw new Error(
          "Unrecognized format. Expected array of prompts or {prompts: [...]} or {contentData: [...]}"
        );
      }

      // Validate each prompt
      const validated = prompts.map((p, i) => {
        if (!p.title) throw new Error(`Prompt ${i + 1} missing title`);
        if (!p.content) throw new Error(`Prompt ${i + 1} missing content`);
        return {
          id: p.id || crypto.randomUUID(),
          title: p.title,
          category: p.category || "Uncategorized",
          content: p.content,
          keywords: p.keywords || [],
          description: p.description || "",
          expectedAnswer: p.expectedAnswer || "",
          evaluationConfig: {
            methods: p.evaluationConfig?.methods || ["human", "llm-judge"],
            machineJudge: p.evaluationConfig?.machineJudge,
            llmJudge: p.evaluationConfig?.llmJudge,
          },
          attachments: p.attachments || [],
        };
      });

      setParsed(validated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleImport = async () => {
    if (!parsed) return;

    setImporting(true);
    try {
      const response = await fetch("/api/prompts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: parsed }),
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      router.push("/prompts");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Group parsed prompts by category for preview
  const grouped = parsed?.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, ImportedPrompt[]>);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Prompts</h1>
        <p className="text-muted-foreground">
          Paste JSON to import prompts into your library
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>JSON Input</CardTitle>
          <CardDescription>
            Paste your prompts JSON. Supports array format, {"{prompts: [...]}"},
            or semanticmachines.fyi {"{contentData: [...]}"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="json">Prompts JSON</Label>
            <Textarea
              id="json"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='[{"title": "My Prompt", "category": "Test", "content": "..."}]'
              className="font-mono text-sm min-h-[200px]"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button onClick={handleParse} disabled={!jsonInput.trim()}>
            Parse JSON
          </Button>
        </CardContent>
      </Card>

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Preview ({parsed.length} prompts)
            </CardTitle>
            <CardDescription>
              Review the prompts before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {grouped &&
              Object.entries(grouped).map(([category, prompts]) => (
                <div key={category}>
                  <h3 className="font-medium mb-2">
                    {category} ({prompts.length})
                  </h3>
                  <div className="space-y-2">
                    {prompts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <div>
                          <span className="font-medium">{p.title}</span>
                          {p.description && (
                            <span className="text-sm text-muted-foreground ml-2">
                              — {p.description.slice(0, 50)}...
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {p.evaluationConfig?.methods?.map((m: string) => (
                            <Badge key={m} variant="secondary" className="text-xs">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleImport} disabled={importing}>
                <Upload className="h-4 w-4 mr-2" />
                {importing ? "Importing..." : `Import ${parsed.length} prompts`}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setParsed(null);
                  setJsonInput("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
