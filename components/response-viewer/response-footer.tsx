"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, Hash, Calendar, DollarSign, Star, Thermometer } from "lucide-react";
import type { ViewerMetadataToggles, EvaluationMethod } from "@/lib/types";
import { formatLatency, formatTokens, formatCost } from "@/lib/model-metadata";

interface ResponseFooterProps {
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs?: number;
  iteration: number;
  totalIterations: number;
  runDate: string;
  costUsd?: number;
  temperature?: number;
  evaluated: boolean;
  score?: number;
  evaluationMethod?: EvaluationMethod;
  metadata: ViewerMetadataToggles;
  className?: string;
}

export function ResponseFooter({
  tokensInput,
  tokensOutput,
  latencyMs,
  iteration,
  totalIterations,
  runDate,
  costUsd,
  temperature,
  evaluated,
  score,
  evaluationMethod,
  metadata,
  className,
}: ResponseFooterProps) {
  const formattedDate = new Date(runDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "py-2 px-3 border-t bg-muted/30 flex items-center justify-between flex-wrap gap-2",
        className
      )}
    >
      {/* Left side: metrics */}
      <div className="flex items-center flex-wrap gap-3 text-xs text-muted-foreground">
        {/* Tokens */}
        {metadata.showResponseTokens && (tokensInput || tokensOutput) && (
          <span className="flex items-center gap-1" title="Tokens (in/out)">
            <Hash className="h-3 w-3" />
            {tokensInput ? formatTokens(tokensInput) : "?"}
            {" → "}
            {tokensOutput ? formatTokens(tokensOutput) : "?"}
          </span>
        )}

        {/* Latency */}
        {metadata.showLatency && latencyMs && (
          <span className="flex items-center gap-1" title="Generation time">
            <Clock className="h-3 w-3" />
            {formatLatency(latencyMs)}
          </span>
        )}

        {/* Iteration */}
        {metadata.showIteration && totalIterations > 1 && (
          <span className="flex items-center gap-1" title="Iteration">
            {iteration} of {totalIterations}
          </span>
        )}

        {/* Date */}
        {metadata.showRunDate && (
          <span className="flex items-center gap-1" title="Run date">
            <Calendar className="h-3 w-3" />
            {formattedDate}
          </span>
        )}

        {/* Cost */}
        {metadata.showCost && costUsd !== undefined && costUsd > 0 && (
          <span className="flex items-center gap-1" title="Estimated cost">
            <DollarSign className="h-3 w-3" />
            {formatCost(costUsd)}
          </span>
        )}

        {/* Temperature */}
        {metadata.showTemperature && temperature !== undefined && (
          <span className="flex items-center gap-1" title="Temperature">
            <Thermometer className="h-3 w-3" />
            {temperature.toFixed(1)}
          </span>
        )}
      </div>

      {/* Right side: evaluation */}
      {metadata.showScore && (
        <div className="flex items-center gap-2">
          {evaluated && score !== undefined ? (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            >
              <Star className="h-3 w-3 fill-current" />
              {score}
              {evaluationMethod && (
                <span className="opacity-70 text-[10px]">
                  ({evaluationMethod === "human" ? "H" : evaluationMethod === "llm-judge" ? "LLM" : "M"})
                </span>
              )}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              {evaluated ? "Evaluated" : "Pending"}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
