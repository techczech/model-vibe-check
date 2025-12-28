"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ViewerToolbar } from "./viewer-toolbar";
import { PromptSection } from "./prompt-section";
import { ResponsePanel } from "./response-panel";
import { useViewerPreferences, getColumnWidths, getMinColumnWidth } from "@/lib/stores/viewer-preferences";
import type { ViewerResponse, ViewerPrompt, ViewerMetadataToggles, ViewerContentSettings } from "@/lib/types";

// Resize handle component
function ResizeHandle({
  onDrag,
  onDragEnd,
  isActive
}: {
  onDrag: (deltaX: number) => void;
  onDragEnd: () => void;
  isActive: boolean;
}) {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const delta = e.clientX - startXRef.current;
      onDrag(delta);
      startXRef.current = e.clientX;
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onDragEnd();
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onDrag, onDragEnd]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      ref={handleRef}
      onMouseDown={handleMouseDown}
      className={cn(
        "w-4 h-full cursor-col-resize z-10",
        "group flex items-center justify-center",
        "hover:bg-primary/10 transition-colors rounded",
        isActive && "bg-primary/20"
      )}
      title="Drag to resize columns"
    >
      <div className={cn(
        "w-1 h-10 rounded-full bg-muted-foreground/30 transition-all",
        "group-hover:bg-primary group-hover:h-16 group-hover:w-1.5",
        isActive && "bg-primary h-16 w-1.5"
      )} />
    </div>
  );
}

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
  const [activeResizeHandle, setActiveResizeHandle] = useState<number | null>(null);
  const [resizeWidths, setResizeWidths] = useState<number[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
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
    setCustomColumnWidths,
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

  // Get current widths (either from dragging or stored)
  const currentWidths = useMemo(() => {
    const { columns, mode } = effectiveLayout;
    if (mode === "stacked" || mode === "single" || mode === "scroll") {
      return null;
    }
    // During resize, use temporary widths
    if (resizeWidths && resizeWidths.length === columns) {
      return resizeWidths;
    }
    return getColumnWidths(columnPreset, columns, customColumnWidths);
  }, [effectiveLayout, columnPreset, customColumnWidths, resizeWidths]);

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

    const widths = currentWidths || getColumnWidths(columnPreset, columns, customColumnWidths);
    return {
      gridTemplateColumns: widths.map(w => `${w}%`).join(" "),
    };
  }, [effectiveLayout, columnPreset, customColumnWidths, currentWidths]);

  // Handle resize drag
  const handleResizeDrag = useCallback((handleIndex: number, deltaX: number) => {
    if (!gridRef.current || !currentWidths) return;

    const containerWidth = gridRef.current.offsetWidth;
    const deltaPercent = (deltaX / containerWidth) * 100;

    // Get current widths or initialize from preset
    const widths = [...(resizeWidths || currentWidths)];

    // Minimum width is 10%
    const minWidth = 10;

    // Adjust the two adjacent columns
    const newLeftWidth = widths[handleIndex] + deltaPercent;
    const newRightWidth = widths[handleIndex + 1] - deltaPercent;

    // Only apply if both columns stay above minimum
    if (newLeftWidth >= minWidth && newRightWidth >= minWidth) {
      widths[handleIndex] = newLeftWidth;
      widths[handleIndex + 1] = newRightWidth;
      setResizeWidths(widths);
      setActiveResizeHandle(handleIndex);
    }
  }, [currentWidths, resizeWidths]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    if (resizeWidths) {
      setCustomColumnWidths(resizeWidths);
    }
    setResizeWidths(null);
    setActiveResizeHandle(null);
  }, [resizeWidths, setCustomColumnWidths]);

  // Check if resizing is allowed (only for grid layouts with 2+ columns)
  const canResize = effectiveLayout.mode === "grid" && effectiveLayout.columns >= 2;

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

      {/* Response panels with resize handles */}
      <div className="relative">
        <div
          ref={gridRef}
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

        {/* Resize handles - rendered as overlay to span full grid height */}
        {canResize && currentWidths && (
          <div className="absolute inset-0 pointer-events-none">
            {currentWidths.slice(0, -1).map((width, index) => {
              // Calculate cumulative offset (sum of widths up to and including this column)
              const leftOffset = currentWidths.slice(0, index + 1).reduce((sum, w) => sum + w, 0);
              return (
                <div
                  key={`resize-${index}`}
                  className="absolute top-0 bottom-0 pointer-events-auto"
                  style={{ left: `calc(${leftOffset}% - 4px)` }}
                >
                  <ResizeHandle
                    onDrag={(delta) => handleResizeDrag(index, delta)}
                    onDragEnd={handleResizeEnd}
                    isActive={activeResizeHandle === index}
                  />
                </div>
              );
            })}
          </div>
        )}
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
