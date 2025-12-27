"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ViewerToolbar } from "./viewer-toolbar";
import { PromptSection } from "./prompt-section";
import { ResponsePanel } from "./response-panel";
import { useViewerPreferences, getColumnWidths, getMinColumnWidth } from "@/lib/stores/viewer-preferences";
import type { ViewerResponse, ViewerPrompt, ViewerMetadataToggles, ViewerContentSettings } from "@/lib/types";

interface ResponseViewerProps {
  prompt?: ViewerPrompt;
  responses: ViewerResponse[];
  isBlind?: boolean;
  showToolbar?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export function ResponseViewer({
  prompt,
  responses,
  isBlind = false,
  showToolbar = true,
  defaultExpanded = true,
  className,
}: ResponseViewerProps) {
  const preferences = useViewerPreferences();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [syncScrollTop, setSyncScrollTop] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const {
    layout,
    height,
    columnPreset,
    customColumnWidths,
    metadata,
    content,
    setLayout,
    setHeight,
    setColumnPreset,
    toggleMetadata,
    toggleContent,
    resetToDefaults,
  } = preferences;

  // Calculate effective column count and layout
  const effectiveLayout = useMemo(() => {
    const count = responses.length;
    
    if (layout === "single") return { columns: 1, mode: "single" as const };
    if (layout === "stacked") return { columns: 1, mode: "stacked" as const };
    if (layout === "2-col") return { columns: Math.min(2, count), mode: "grid" as const };
    if (layout === "3-col") return { columns: Math.min(3, count), mode: "grid" as const };
    if (layout === "n-col") {
      // All columns with horizontal scroll, min width = 1/3 viewport
      return { columns: count, mode: "scroll" as const };
    }
    
    return { columns: 2, mode: "grid" as const };
  }, [layout, responses.length]);

  // Calculate column widths
  const columnWidthStyles = useMemo(() => {
    const { columns, mode } = effectiveLayout;
    
    if (mode === "stacked" || mode === "single") {
      return { gridTemplateColumns: "1fr" };
    }
    
    if (mode === "scroll") {
      const minWidth = getMinColumnWidth();
      return { 
        gridTemplateColumns: `repeat(${columns}, minmax(${minWidth}%, 1fr))`,
        overflowX: "auto" as const,
      };
    }
    
    const widths = getColumnWidths(columnPreset, columns, customColumnWidths);
    return { 
      gridTemplateColumns: widths.map(w => `${w}%`).join(" "),
    };
  }, [effectiveLayout, columnPreset, customColumnWidths]);

  // Handle synchronized scrolling
  const handleScroll = useCallback((scrollPercent: number, scrollHeight: number) => {
    if (!content.syncScroll || height !== "viewport") return;
    setSyncScrollTop(scrollPercent);
  }, [content.syncScroll, height]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          setFocusedIndex((prev) => 
            prev === null ? 0 : Math.max(0, prev - 1)
          );
          break;
        case "ArrowRight":
          setFocusedIndex((prev) => 
            prev === null ? 0 : Math.min(responses.length - 1, prev + 1)
          );
          break;
        case "Escape":
          setFocusedIndex(null);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [responses.length]);

  // Scroll focused panel into view
  useEffect(() => {
    if (focusedIndex !== null && panelRefs.current[focusedIndex]) {
      panelRefs.current[focusedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [focusedIndex]);

  const containerHeight = height === "viewport" 
    ? "h-[calc(100vh-16rem)]" 
    : height === "compact" 
      ? "" 
      : "";

  return (
    <div ref={containerRef} className={cn("space-y-4", className)}>
      {/* Toolbar */}
      {showToolbar && (
        <ViewerToolbar
          layout={layout}
          height={height}
          columnPreset={columnPreset}
          metadata={metadata}
          content={content}
          responseCount={responses.length}
          onLayoutChange={setLayout}
          onHeightChange={setHeight}
          onColumnPresetChange={setColumnPreset}
          onMetadataToggle={toggleMetadata}
          onContentToggle={toggleContent}
          onReset={resetToDefaults}
        />
      )}

      {/* Prompt section */}
      {prompt && (
        <PromptSection
          prompt={prompt}
          metadata={metadata}
          defaultExpanded={defaultExpanded}
        />
      )}

      {/* Response panels */}
      <div
        className={cn(
          "grid gap-4",
          containerHeight,
          effectiveLayout.mode === "scroll" && "overflow-x-auto pb-2"
        )}
        style={columnWidthStyles}
      >
        {responses.map((response, index) => (
          <ResponsePanel
            key={response.id}
            ref={(el) => { panelRefs.current[index] = el; }}
            response={response}
            preferences={preferences}
            isBlind={isBlind}
            isFocused={focusedIndex === index}
            onScroll={handleScroll}
            syncScrollTop={content.syncScroll ? syncScrollTop : undefined}
            className={cn(
              height === "viewport" && "h-full",
              effectiveLayout.mode === "scroll" && "min-w-[400px]"
            )}
          />
        ))}
      </div>

      {/* Empty state */}
      {responses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No responses to display</p>
        </div>
      )}
    </div>
  );
}

export { PromptSection } from "./prompt-section";
export { ResponsePanel } from "./response-panel";
export { ResponseContent } from "./response-content";
export { ResponseHeader } from "./response-header";
export { ResponseFooter } from "./response-footer";
export { ViewerToolbar } from "./viewer-toolbar";
