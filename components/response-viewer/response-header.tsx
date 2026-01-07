"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { 
  Provider, 
  ModelSizeClass, 
  ReasoningCapability, 
  ReasoningUsed,
  ViewerMetadataToggles 
} from "@/lib/types";
import {
  getSizeClassLabel,
  getSizeClassColor,
  getReasoningLabel,
  getReasoningColor,
  formatContextWindow,
} from "@/lib/model-metadata";
import { Star } from "lucide-react";

interface ResponseHeaderProps {
  modelName: string;
  provider: Provider;
  sizeClass?: ModelSizeClass;
  reasoningCapability?: ReasoningCapability;
  reasoningUsed?: ReasoningUsed;
  contextWindow?: number;
  parameters?: string;
  promptTitle?: string;
  promptCategory?: string;
  metadata: ViewerMetadataToggles;
  isBlind?: boolean;
  galleryAction?: {
    selected: boolean;
    disabled?: boolean;
    onToggle: () => void;
  };
  className?: string;
}

const providerColors: Record<Provider, string> = {
  openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  anthropic: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  google: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ollama: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  openrouter: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

const providerLabels: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  ollama: "Ollama",
  openrouter: "OpenRouter",
};

export function ResponseHeader({
  modelName,
  provider,
  sizeClass,
  reasoningCapability,
  reasoningUsed,
  contextWindow,
  parameters,
  promptTitle,
  promptCategory,
  metadata,
  isBlind = false,
  galleryAction,
  className,
}: ResponseHeaderProps) {
  // In blind mode, hide model identity
  if (isBlind) {
    return (
      <div className={cn("flex items-center justify-between py-2 px-3 border-b bg-muted/30", className)}>
        <span className="font-medium text-sm text-muted-foreground">Model hidden</span>
        <Badge variant="outline" className="text-xs">
          Blind review
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("py-2 px-3 border-b bg-muted/30 space-y-1.5", className)}>
      {/* Prompt title (for model vibe / cross-prompt views) */}
      {promptTitle && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate" title={promptTitle}>{promptTitle}</span>
          {promptCategory && (
            <Badge variant="outline" className="text-[10px] py-0">
              {promptCategory}
            </Badge>
          )}
        </div>
      )}
      
      {/* Model name and provider */}
      <div className="flex items-center justify-between gap-2">
        {metadata.showModelName && (
          <span className="font-medium text-sm truncate" title={modelName}>
            {modelName}
          </span>
        )}
        
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {metadata.showProvider && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs", providerColors[provider])}
            >
              {providerLabels[provider]}
            </Badge>
          )}
          {galleryAction && (
            <Button
              variant={galleryAction.selected ? "secondary" : "ghost"}
              size="icon"
              className="h-6 w-6"
              title={galleryAction.selected ? "Remove from gallery" : "Add to gallery"}
              onClick={galleryAction.onToggle}
              disabled={galleryAction.disabled}
            >
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  galleryAction.selected && "fill-current"
                )}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Metadata badges row */}
      <div className="flex items-center flex-wrap gap-1.5">
        {/* Size class */}
        {metadata.showSizeClass && sizeClass && sizeClass !== 'unknown' && (
          <Badge 
            variant="secondary" 
            className={cn("text-xs", getSizeClassColor(sizeClass))}
            title={parameters ? `${parameters} parameters` : undefined}
          >
            {parameters || getSizeClassLabel(sizeClass)}
          </Badge>
        )}

        {/* Reasoning capability */}
        {metadata.showReasoning && reasoningCapability && reasoningCapability !== 'none' && (
          <Badge 
            variant="secondary" 
            className={cn("text-xs", getReasoningColor(reasoningCapability))}
          >
            {getReasoningLabel(reasoningCapability)}
            {reasoningUsed && reasoningUsed !== 'none' && (
              <span className="ml-1 opacity-70">
                ({reasoningUsed === 'extended' ? 'ext' : 'std'})
              </span>
            )}
          </Badge>
        )}

        {/* Context window */}
        {metadata.showContextWindow && contextWindow && (
          <Badge variant="outline" className="text-xs">
            {formatContextWindow(contextWindow)}
          </Badge>
        )}
      </div>
    </div>
  );
}
