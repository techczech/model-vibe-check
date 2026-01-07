"use client";

/**
 * ConversationThread Component
 *
 * Displays multi-turn sequence results as a threaded conversation.
 * Shows user prompts and model responses in alternating bubbles.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  User,
  Bot,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import type { Result, PromptSequence, Evaluation } from "@/lib/types";

interface ConversationThreadProps {
  sequence: PromptSequence;
  results: Result[];
  evaluations?: Evaluation[];
  modelName: string;
  className?: string;
  defaultExpanded?: boolean;
}

export function ConversationThread({
  sequence,
  results,
  evaluations = [],
  modelName,
  className,
  defaultExpanded = true,
}: ConversationThreadProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Sort results by step index
  const sortedResults = [...results].sort(
    (a, b) => (a.stepIndex ?? 0) - (b.stepIndex ?? 0)
  );

  // Check if any step has an error
  const hasError = sortedResults.some((r) => r.error);

  // Get evaluation for a result
  const getEvaluation = (resultId: string) =>
    evaluations.find((e) => e.resultId === resultId);

  // Calculate total latency
  const totalLatency = sortedResults.reduce((sum, r) => sum + r.latencyMs, 0);

  return (
    <Card className={cn("", className)}>
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{sequence.title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {modelName}
            </Badge>
            {hasError ? (
              <Badge variant="destructive" className="text-xs">
                Error
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                {sortedResults.length}/{sequence.steps.length} steps
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(totalLatency)}</span>
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {sequence.steps.map((step, index) => {
            const result = sortedResults.find((r) => r.stepIndex === index);
            const evaluation = result ? getEvaluation(result.id) : undefined;

            return (
              <div key={step.id} className="space-y-2">
                {/* User message */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Step {index + 1}
                      </span>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg rounded-tl-none">
                      <p className="text-sm whitespace-pre-wrap">{step.content}</p>
                    </div>
                  </div>
                </div>

                {/* Model response */}
                {result ? (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(result.latencyMs)}
                        </span>
                        {result.tokensOutput && (
                          <span className="text-xs text-muted-foreground">
                            · {result.tokensOutput} tokens
                          </span>
                        )}
                        {evaluation && (
                          <span className="flex items-center gap-1">
                            {evaluation.machinePass ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                          </span>
                        )}
                      </div>
                      {result.error ? (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg rounded-tl-none">
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Error</span>
                          </div>
                          <p className="text-sm text-destructive/80 mt-1">
                            {result.error}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-muted rounded-lg rounded-tl-none">
                          <p className="text-sm whitespace-pre-wrap">
                            {result.response}
                          </p>
                        </div>
                      )}
                      {/* Evaluation details */}
                      {evaluation && evaluation.machineDetails && (
                        <p className="text-xs text-muted-foreground mt-1 px-3">
                          {evaluation.machineDetails}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 p-3 bg-muted/50 rounded-lg rounded-tl-none border-dashed border">
                      <p className="text-sm text-muted-foreground italic">
                        No response yet...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Group results by sequence and model for display
 */
interface SequenceResultGroup {
  sequence: PromptSequence;
  modelId: string;
  modelName: string;
  iteration: number;
  results: Result[];
  evaluations: Evaluation[];
}

export function groupSequenceResults(
  results: Result[],
  sequences: PromptSequence[],
  evaluations: Evaluation[],
  getModelName: (modelId: string) => string
): SequenceResultGroup[] {
  const groups: SequenceResultGroup[] = [];
  const seqMap = new Map(sequences.map((s) => [s.id, s]));

  // Group by sequence + model + iteration
  const groupMap = new Map<string, SequenceResultGroup>();

  for (const result of results) {
    if (!result.sequenceId) continue;

    const sequence = seqMap.get(result.sequenceId);
    if (!sequence) continue;

    const key = `${result.sequenceId}:${result.modelId}:${result.iteration}`;
    let group = groupMap.get(key);

    if (!group) {
      group = {
        sequence,
        modelId: result.modelId,
        modelName: getModelName(result.modelId),
        iteration: result.iteration,
        results: [],
        evaluations: [],
      };
      groupMap.set(key, group);
    }

    group.results.push(result);
  }

  // Add evaluations to groups
  for (const evaluation of evaluations) {
    for (const group of groupMap.values()) {
      if (group.results.some((r) => r.id === evaluation.resultId)) {
        group.evaluations.push(evaluation);
      }
    }
  }

  // Sort by sequence title, then model, then iteration
  return Array.from(groupMap.values()).sort((a, b) => {
    if (a.sequence.title !== b.sequence.title) {
      return a.sequence.title.localeCompare(b.sequence.title);
    }
    if (a.modelName !== b.modelName) {
      return a.modelName.localeCompare(b.modelName);
    }
    return a.iteration - b.iteration;
  });
}
