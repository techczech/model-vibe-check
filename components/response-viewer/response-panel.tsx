"use client";

import { forwardRef, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ResponseHeader } from "./response-header";
import { ResponseContent } from "./response-content";
import { ResponseFooter } from "./response-footer";
import type { ViewerResponse, ViewerPreferences } from "@/lib/types";

interface ResponsePanelProps {
  response: ViewerResponse;
  preferences: ViewerPreferences;
  isBlind?: boolean;
  isFocused?: boolean;
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
  syncScrollTop?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ResponsePanel = forwardRef<HTMLDivElement, ResponsePanelProps>(
  function ResponsePanel(
    {
      response,
      preferences,
      isBlind = false,
      isFocused = false,
      onScroll,
      syncScrollTop,
      className,
      style,
    },
    ref
  ) {
    const contentRef = useRef<HTMLDivElement>(null);
    const isScrolling = useRef(false);

    // Handle synchronized scrolling
    useEffect(() => {
      if (syncScrollTop !== undefined && contentRef.current && !isScrolling.current) {
        const element = contentRef.current;
        const maxScroll = element.scrollHeight - element.clientHeight;
        const targetScroll = (syncScrollTop / 100) * maxScroll;
        element.scrollTop = targetScroll;
      }
    }, [syncScrollTop]);

    const handleScroll = () => {
      if (!contentRef.current || !onScroll) return;
      
      isScrolling.current = true;
      const element = contentRef.current;
      const scrollPercent = element.scrollHeight > element.clientHeight
        ? (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100
        : 0;
      onScroll(scrollPercent, element.scrollHeight);
      
      // Reset scrolling flag after a short delay
      setTimeout(() => {
        isScrolling.current = false;
      }, 50);
    };

    const { height, content: contentSettings, metadata } = preferences;
    const isViewport = height === "viewport";
    const isCompact = height === "compact";

    return (
      <Card
        ref={ref}
        className={cn(
          "flex flex-col overflow-hidden",
          isFocused && "ring-2 ring-primary",
          className
        )}
        style={style}
      >
        {/* Header */}
        <ResponseHeader
          modelName={response.modelName}
          provider={response.provider}
          sizeClass={response.sizeClass}
          reasoningCapability={response.reasoningCapability}
          reasoningUsed={response.reasoningUsed}
          contextWindow={response.contextWindow}
          parameters={response.parameters}
          promptTitle={response.promptTitle}
          promptCategory={response.promptCategory}
          metadata={metadata}
          isBlind={isBlind}
        />

        {/* Content */}
        <div
          ref={contentRef}
          className={cn(
            "flex-1 p-3",
            isViewport && "overflow-y-auto",
            isCompact && "max-h-32 overflow-hidden relative",
            !isViewport && !isCompact && "overflow-visible"
          )}
          onScroll={isViewport ? handleScroll : undefined}
        >
          <ResponseContent
            content={response.content}
            renderMarkdown={contentSettings.renderMarkdown}
            syntaxHighlight={contentSettings.syntaxHighlight}
            wordWrap={contentSettings.wordWrap}
          />
          
          {/* Compact mode fade overlay */}
          {isCompact && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          )}
        </div>

        {/* Footer */}
        <ResponseFooter
          tokensInput={response.tokensInput}
          tokensOutput={response.tokensOutput}
          latencyMs={response.latencyMs}
          iteration={response.iteration}
          totalIterations={response.totalIterations}
          runDate={response.runDate}
          costUsd={response.costUsd}
          temperature={response.temperature}
          evaluated={response.evaluated}
          score={response.score}
          evaluationMethod={response.evaluationMethod}
          metadata={metadata}
        />
      </Card>
    );
  }
);
