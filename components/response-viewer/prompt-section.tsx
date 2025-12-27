"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, FileText, Hash, CheckCircle } from "lucide-react";
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

  // Estimate line count for collapsed preview
  const lines = prompt.content.split("\n");
  const isLong = lines.length > 3 || prompt.content.length > 300;
  const previewLines = isLong ? lines.slice(0, 3).join("\n") : prompt.content;
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
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {metadata.showPromptTokens && prompt.tokensEstimate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {formatTokens(prompt.tokensEstimate)} tokens
              </span>
            )}
            
            {isLong && (
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
        {/* Prompt content */}
        <div className="relative">
          <p className="text-sm whitespace-pre-wrap">
            {isExpanded ? prompt.content : previewLines}
            {hasMore && "..."}
          </p>
        </div>

        {/* Expected answer section */}
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
      </CardContent>
    </Card>
  );
}
