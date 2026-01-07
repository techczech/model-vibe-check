"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, FileText, Hash, CheckCircle, MessageSquare } from "lucide-react";
import type { ViewerPrompt, ViewerMetadataToggles } from "@/lib/types";
import { formatTokens } from "@/lib/model-metadata";

interface PromptSectionProps {
  prompt: ViewerPrompt;
  metadata: ViewerMetadataToggles;
  defaultExpanded?: boolean;
  className?: string;
}

export function PromptSection({
  prompt,
  metadata,
  defaultExpanded = true,
  className,
}: PromptSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showExpectedAnswer, setShowExpectedAnswer] = useState(false);

  // Check if multi-step prompt
  const isMultiStep = prompt.steps && prompt.steps.length > 1;

  // Get content from steps or fallback to content field
  const contentText = prompt.steps?.[0]?.content ?? prompt.content ?? '';

  // Estimate line count for collapsed preview (single-step only)
  const lines = contentText.split("\n");
  const isLong = !isMultiStep && (lines.length > 3 || contentText.length > 300);
  const previewLines = isLong ? lines.slice(0, 3).join("\n") : contentText;
  const hasMore = isLong && !isExpanded;

  if (!metadata.showPrompt) {
    return null;
  }

  return (
    <Card className={cn("bg-muted/30", className)}>
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{prompt.title}</span>
            {prompt.category && (
              <Badge variant="outline" className="text-xs ml-2">
                {prompt.category}
              </Badge>
            )}
            {isMultiStep && (
              <Badge variant="secondary" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />
                {prompt.steps!.length} steps
              </Badge>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            {metadata.showPromptTokens && prompt.tokensEstimate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {formatTokens(prompt.tokensEstimate)} tokens
              </span>
            )}

            {(isLong || isMultiStep) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Expand
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="py-2 px-3 pt-0">
        {isMultiStep ? (
          // Multi-step: show conversation format
          <div className="space-y-3">
            {prompt.steps!.map((step, index) => (
              <div key={step.id || index} className="space-y-1">
                {/* Step header */}
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-primary">
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {index === 0 ? "Initial" : `Follow-up ${index}`}
                  </span>
                </div>

                {/* Step content - collapsed or expanded */}
                {isExpanded ? (
                  <>
                    <p className="text-sm whitespace-pre-wrap ml-7 bg-background/50 p-2 rounded">
                      {step.content}
                    </p>

                    {/* Step expected answer */}
                    {metadata.showExpectedAnswer && step.expectedAnswer && (
                      <div className="ml-7 mt-1">
                        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Expected:
                        </p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap bg-green-50 dark:bg-green-950/30 p-2 rounded mt-1">
                          {step.expectedAnswer}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground ml-7 truncate">
                    {step.content.substring(0, 60)}
                    {step.content.length > 60 ? "..." : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Single-step: simple display
          <>
            <div className="relative">
              <p className="text-sm whitespace-pre-wrap">
                {isExpanded ? contentText : previewLines}
                {hasMore && "..."}
              </p>
            </div>

            {/* Expected answer section (single-step) */}
            {metadata.showExpectedAnswer && prompt.expectedAnswer && (
              <div className="mt-3 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 -ml-2 text-xs"
                  onClick={() => setShowExpectedAnswer(!showExpectedAnswer)}
                >
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  Expected answer
                  {showExpectedAnswer ? (
                    <ChevronUp className="h-3 w-3 ml-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-1" />
                  )}
                </Button>

                {showExpectedAnswer && (
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                    {prompt.expectedAnswer}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
