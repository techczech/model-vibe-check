"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Check, Loader2, ChevronDown, ChevronUp, Clock, Zap, Eye, Edit, User, Bot } from "lucide-react";
import { formatDate, formatResponseMeta } from "@/lib/utils";
import type { Rubric, RubricItem, RubricEvaluation } from "@/lib/types";

// Response data passed to the evaluation form
interface ResponseData {
  content: string;
  modelName: string;
  provider: string;
  runDate: string;
  iteration: number;
  latencyMs: number;
  tokensOutput?: number;
  error?: string;
}

interface EvaluationFormProps {
  responseId: string;
  response: ResponseData;
  promptContent: string;
  rubric: Rubric;
  existingEvaluation?: RubricEvaluation;
  onSubmit: (evaluation: Omit<RubricEvaluation, "id" | "createdAt">) => Promise<void>;
  onClose: () => void;
  onNext?: () => void;
  hasNext?: boolean;
  initialMode?: "view" | "edit";
}

type ScoreValue = boolean | number | number[];

export function EvaluationForm({
  responseId,
  response,
  promptContent,
  rubric,
  existingEvaluation,
  onSubmit,
  onClose,
  onNext,
  hasNext,
  initialMode = "edit",
}: EvaluationFormProps) {
  const [mode, setMode] = useState<"view" | "edit">(
    existingEvaluation ? initialMode : "edit"
  );
  const [scores, setScores] = useState<Record<string, { value: ScoreValue; note?: string }>>({});
  const [impressionScore, setImpressionScore] = useState<number | undefined>(undefined);
  const [reasoning, setReasoning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focusedItem, setFocusedItem] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);

  const isViewMode = mode === "view" && existingEvaluation;

  // Initialize/reset scores when response or rubric changes
  useEffect(() => {
    if (existingEvaluation && existingEvaluation.responseId === responseId) {
      // Load existing evaluation
      setScores(existingEvaluation.scores);
      setImpressionScore(existingEvaluation.impressionScore);
      setReasoning(existingEvaluation.reasoning || "");
    } else {
      // Reset to defaults for new evaluation
      const defaults: Record<string, { value: ScoreValue }> = {};
      for (const item of rubric.items) {
        if (item.type === "binary") {
          defaults[item.id] = { value: false };
        } else if (item.type === "scale") {
          defaults[item.id] = { value: 0 };
        } else if (item.type === "checklist") {
          defaults[item.id] = { value: [] };
        }
      }
      setScores(defaults);
      setImpressionScore(undefined);
      setReasoning("");
    }
    setFocusedItem(0);
  }, [responseId, rubric.items, existingEvaluation]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle if we're in a textarea
      if (e.target instanceof HTMLTextAreaElement) return;

      const item = rubric.items[focusedItem];
      if (!item) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setFocusedItem((prev) => Math.min(prev + 1, rubric.items.length - 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setFocusedItem((prev) => Math.max(prev - 1, 0));
          break;
        case "y":
          if (item.type === "binary") {
            e.preventDefault();
            setScores((prev) => ({
              ...prev,
              [item.id]: { ...prev[item.id], value: true },
            }));
          }
          break;
        case "n":
          if (item.type === "binary") {
            e.preventDefault();
            setScores((prev) => ({
              ...prev,
              [item.id]: { ...prev[item.id], value: false },
            }));
          }
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          e.preventDefault();
          const num = parseInt(e.key);
          if (item.type === "scale" && item.scaleLabels && num <= item.scaleLabels.length) {
            setScores((prev) => ({
              ...prev,
              [item.id]: { ...prev[item.id], value: num - 1 },
            }));
          } else if (rubric.allowImpressionScore && num <= 10) {
            setImpressionScore(num);
          }
          break;
        case "0":
          if (rubric.allowImpressionScore) {
            e.preventDefault();
            setImpressionScore(10);
          }
          break;
        case " ":
          if (item.type === "checklist") {
            e.preventDefault();
            // Toggle first unchecked item or cycle
            const currentChecked = (scores[item.id]?.value as number[]) || [];
            const allItems = item.checklistItems?.length || 0;
            for (let i = 0; i < allItems; i++) {
              if (!currentChecked.includes(i)) {
                toggleChecklistItem(item.id, i);
                break;
              }
            }
          }
          break;
        case "Enter":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (e.shiftKey && hasNext) {
              handleSubmit(true);
            } else {
              handleSubmit(false);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedItem, rubric, scores, onClose, hasNext]);

  function setBinaryValue(itemId: string, value: boolean) {
    setScores((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], value },
    }));
  }

  function setScaleValue(itemId: string, value: number) {
    setScores((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], value },
    }));
  }

  function toggleChecklistItem(itemId: string, index: number) {
    setScores((prev) => {
      const current = (prev[itemId]?.value as number[]) || [];
      const newValue = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index];
      return {
        ...prev,
        [itemId]: { ...prev[itemId], value: newValue },
      };
    });
  }

  async function handleSubmit(andNext: boolean = false) {
    setSubmitting(true);
    try {
      await onSubmit({
        responseId,
        rubricId: rubric.id,
        evaluatorType: "human",
        scores,
        impressionScore,
        reasoning: reasoning || undefined,
      });
      if (andNext && onNext) {
        onNext();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Failed to submit evaluation:", error);
    } finally {
      setSubmitting(false);
    }
  }

  function renderRubricItem(item: RubricItem, index: number) {
    const isFocused = index === focusedItem && !isViewMode;
    const score = scores[item.id];

    return (
      <div
        key={item.id}
        className={`p-2.5 rounded-lg border transition-colors ${
          isFocused ? "border-primary bg-primary/5" : "border-border"
        }`}
        onClick={() => !isViewMode && setFocusedItem(index)}
      >
        <div className="flex items-start justify-between mb-1.5">
          <div>
            <Label className="text-sm font-medium">{item.label}</Label>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {item.type}
          </Badge>
        </div>

        {item.type === "binary" && (
          isViewMode ? (
            <div className="mt-1.5">
              <Badge
                variant={score?.value ? "default" : "secondary"}
                className={score?.value
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }
              >
                {score?.value ? "Yes" : "No"}
              </Badge>
            </div>
          ) : (
            <div className="flex gap-2 mt-1.5">
              <Button
                type="button"
                size="sm"
                variant={score?.value === false ? "default" : "outline"}
                onClick={() => setBinaryValue(item.id, false)}
                className="flex-1 h-7 text-xs"
              >
                No {isFocused && <span className="ml-1 opacity-50">(n)</span>}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={score?.value === true ? "default" : "outline"}
                onClick={() => setBinaryValue(item.id, true)}
                className="flex-1 h-7 text-xs"
              >
                Yes {isFocused && <span className="ml-1 opacity-50">(y)</span>}
              </Button>
            </div>
          )
        )}

        {item.type === "scale" && item.scaleLabels && (
          isViewMode ? (
            <div className="mt-1.5">
              <Badge variant="default">
                {typeof score?.value === "number" && item.scaleLabels[score.value]
                  ? item.scaleLabels[score.value]
                  : "Not scored"}
              </Badge>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.scaleLabels.map((label, i) => (
                <Button
                  key={i}
                  type="button"
                  size="sm"
                  variant={score?.value === i ? "default" : "outline"}
                  onClick={() => setScaleValue(item.id, i)}
                  className="text-[11px] h-7 px-2"
                >
                  {label}
                  {isFocused && (
                    <span className="ml-1 opacity-50">({i + 1})</span>
                  )}
                </Button>
              ))}
            </div>
          )
        )}

        {item.type === "checklist" && item.checklistItems && (
          <div className="space-y-1 mt-1.5">
            {item.checklistItems.map((checkItem, i) => {
              const isChecked = ((score?.value as number[]) || []).includes(i);
              return isViewMode ? (
                <div
                  key={i}
                  className={`p-1.5 rounded text-xs flex items-center gap-2 ${
                    isChecked ? "text-primary" : "text-muted-foreground line-through"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      isChecked
                        ? "bg-primary border-primary text-white"
                        : "border-muted-foreground"
                    }`}
                  >
                    {isChecked && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <span>{checkItem}</span>
                </div>
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleChecklistItem(item.id, i)}
                  className={`w-full text-left p-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                    isChecked
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      isChecked
                        ? "bg-primary border-primary text-white"
                        : "border-muted-foreground"
                    }`}
                  >
                    {isChecked && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <span>{checkItem}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const isExistingEvaluation = existingEvaluation && existingEvaluation.responseId === responseId;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              {isViewMode ? "View Evaluation" : "Evaluate Response"}
              {isExistingEvaluation && existingEvaluation && (
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    existingEvaluation.evaluatorType === "human"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  }`}
                >
                  {existingEvaluation.evaluatorType === "human" ? (
                    <User className="h-3 w-3 mr-1" />
                  ) : (
                    <Bot className="h-3 w-3 mr-1" />
                  )}
                  {existingEvaluation.evaluatorType === "human" ? "Human" : "LLM"}
                </Badge>
              )}
            </h2>
            {isExistingEvaluation && existingEvaluation ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Evaluated {formatDate(existingEvaluation.createdAt)}
                {mode === "edit" && " — submitting will replace this evaluation"}
              </p>
            ) : isExistingEvaluation && mode === "edit" ? (
              <p className="text-xs text-amber-600 mt-0.5">
                Existing evaluation — submitting will replace it
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {existingEvaluation && (
              <div className="flex border rounded-md">
                <Button
                  variant={mode === "view" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-r-none h-8"
                  onClick={() => setMode("view")}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant={mode === "edit" ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-l-none h-8"
                  onClick={() => setMode("edit")}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Split Panel Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Panel: Response */}
          <div className="flex-1 md:w-[55%] flex flex-col border-b md:border-b-0 md:border-r overflow-hidden">
            {/* Response Header */}
            <div className="px-4 py-2.5 border-b bg-muted/20">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{response.modelName}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {response.provider}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatDate(response.runDate)}</span>
                <span>·</span>
                <span>Iteration {response.iteration + 1}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {formatResponseMeta(response.latencyMs, response.tokensOutput)}
                </span>
              </div>
            </div>

            {/* Collapsible Prompt */}
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="px-4 py-2 border-b flex items-center gap-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              {showPrompt ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {showPrompt ? "Hide" : "Show"} original prompt
            </button>
            
            {showPrompt && (
              <div className="px-4 py-3 border-b bg-blue-50/50 max-h-32 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono">
                  {promptContent}
                </pre>
              </div>
            )}

            {/* Response Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {response.error ? (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  Error: {response.error}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {response.content}
                </pre>
              )}
            </div>
          </div>

          {/* Right Panel: Rubric Form */}
          <div className="md:w-[45%] flex flex-col overflow-hidden">
            {/* Rubric Header */}
            <div className="px-4 py-2.5 border-b bg-muted/20">
              <span className="font-medium text-sm">{rubric.name}</span>
              {rubric.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{rubric.description}</p>
              )}
            </div>

            {/* Scrollable Rubric Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {rubric.items.map((item, index) => renderRubricItem(item, index))}

              {/* Impression Score */}
              {rubric.allowImpressionScore && (
                <div className="p-2.5 rounded-lg border border-dashed">
                  <Label className="text-sm font-medium">
                    Impression Score (1-10)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {isViewMode ? "Overall impression" : "Your gut feeling about this response"}
                  </p>
                  {isViewMode ? (
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {impressionScore !== undefined ? `${impressionScore}/10` : "Not scored"}
                    </Badge>
                  ) : (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <Button
                          key={n}
                          type="button"
                          size="sm"
                          variant={impressionScore === n ? "default" : "outline"}
                          onClick={() => setImpressionScore(n)}
                          className="flex-1 px-0 h-7 text-xs"
                        >
                          {n}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="reasoning" className="text-sm">
                  Notes {!isViewMode && "(optional)"}
                </Label>
                {isViewMode ? (
                  reasoning ? (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {reasoning}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No notes</p>
                  )
                ) : (
                  <Textarea
                    id="reasoning"
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    placeholder="Any additional observations..."
                    rows={2}
                    className="text-sm"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between bg-muted/30">
          {isViewMode ? (
            <>
              <p className="text-xs text-muted-foreground">
                Press Esc to close · Click Edit to modify
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("edit")}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button size="sm" variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                ↑↓ navigate · y/n binary · 1-5 scale · ⌘↵ submit{hasNext ? " · ⇧⌘↵ next" : ""} · esc close
              </p>
              <div className="flex gap-2">
                {hasNext && onNext && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSubmit(true)}
                    disabled={submitting}
                  >
                    Submit & Next
                  </Button>
                )}
                <Button size="sm" onClick={() => handleSubmit(false)} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
