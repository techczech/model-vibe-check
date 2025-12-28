"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Columns2,
  Columns3,
  LayoutGrid,
  Rows3,
  Square,
  Maximize2,
  Minimize2,
  MonitorSmartphone,
  Settings2,
  Eye,
  WrapText,
  Type,
  Link2,
  RotateCcw,
} from "lucide-react";
import type { 
  ViewerLayoutMode, 
  ViewerHeightMode, 
  ColumnPreset,
  ViewerMetadataToggles,
  ViewerContentSettings 
} from "@/lib/types";

interface ViewerToolbarProps {
  layout: ViewerLayoutMode;
  height: ViewerHeightMode;
  columnPreset: ColumnPreset;
  metadata: ViewerMetadataToggles;
  content: ViewerContentSettings;
  responseCount: number;
  onLayoutChange: (layout: ViewerLayoutMode) => void;
  onHeightChange: (height: ViewerHeightMode) => void;
  onColumnPresetChange: (preset: ColumnPreset) => void;
  onMetadataToggle: (key: keyof ViewerMetadataToggles) => void;
  onContentToggle: (key: keyof ViewerContentSettings) => void;
  onReset: () => void;
  className?: string;
}

export function ViewerToolbar({
  layout,
  height,
  columnPreset,
  metadata,
  content,
  responseCount,
  onLayoutChange,
  onHeightChange,
  onColumnPresetChange,
  onMetadataToggle,
  onContentToggle,
  onReset,
  className,
}: ViewerToolbarProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap p-2 bg-muted/30 rounded-lg", className)}>
      {/* Layout mode */}
      <div className="flex items-center border rounded-md bg-background">
        <Button
          variant={layout === "single" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2 rounded-r-none"
          onClick={() => onLayoutChange("single")}
          title="Single column"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant={layout === "2-col" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2 rounded-none border-x"
          onClick={() => onLayoutChange("2-col")}
          title="2 columns"
        >
          <Columns2 className="h-4 w-4" />
        </Button>
        <Button
          variant={layout === "3-col" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2 rounded-none border-r"
          onClick={() => onLayoutChange("3-col")}
          title="3 columns"
        >
          <Columns3 className="h-4 w-4" />
        </Button>
        {responseCount > 3 && (
          <Button
            variant={layout === "n-col" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2 rounded-none border-r"
            onClick={() => onLayoutChange("n-col")}
            title="All columns (scrollable)"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant={layout === "stacked" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2 rounded-l-none"
          onClick={() => onLayoutChange("stacked")}
          title="Stacked vertically"
        >
          <Rows3 className="h-4 w-4" />
        </Button>
      </div>

      {/* Height mode */}
      <div className="flex items-center border rounded-md bg-background">
        <Button
          variant={height === "full" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2 rounded-r-none"
          onClick={() => onHeightChange("full")}
          title="Full height (page scrolls)"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant={height === "compact" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2 rounded-none border-x"
          onClick={() => onHeightChange("compact")}
          title="Compact (expandable)"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
        <Button
          variant={height === "viewport" ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2 rounded-l-none"
          onClick={() => onHeightChange("viewport")}
          title="Viewport height (sync scroll)"
        >
          <MonitorSmartphone className="h-4 w-4" />
        </Button>
      </div>

      {/* Column presets (for grid layouts) */}
      {(layout === "2-col" || layout === "3-col") && (
        <div className="flex items-center gap-1">
          <Button
            variant={columnPreset === "equal" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => onColumnPresetChange("equal")}
            title="Reset to equal widths"
          >
            {layout === "2-col" ? "50/50" : "Equal"}
          </Button>
          {columnPreset === "custom" && (
            <Badge variant="outline" className="text-xs h-6">
              Custom
            </Badge>
          )}
        </div>
      )}

      {/* Content toggles */}
      <div className="flex items-center gap-1">
        <Button
          variant={content.renderMarkdown ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2"
          onClick={() => onContentToggle("renderMarkdown")}
          title="Render Markdown"
        >
          <Type className="h-4 w-4" />
        </Button>
        <Button
          variant={content.wordWrap ? "secondary" : "ghost"}
          size="sm"
          className="h-8 px-2"
          onClick={() => onContentToggle("wordWrap")}
          title="Word wrap"
        >
          <WrapText className="h-4 w-4" />
        </Button>
        {height === "viewport" && (
          <Button
            variant={content.syncScroll ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
            onClick={() => onContentToggle("syncScroll")}
            title="Synchronized scrolling"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Metadata dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Eye className="h-4 w-4 mr-2" />
            Show
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Prompt</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={metadata.showPrompt}
            onCheckedChange={() => onMetadataToggle("showPrompt")}
          >
            Prompt content
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showExpectedAnswer}
            onCheckedChange={() => onMetadataToggle("showExpectedAnswer")}
          >
            Expected answer
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showPromptTokens}
            onCheckedChange={() => onMetadataToggle("showPromptTokens")}
          >
            Prompt tokens
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Model</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={metadata.showModelName}
            onCheckedChange={() => onMetadataToggle("showModelName")}
          >
            Model name
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showProvider}
            onCheckedChange={() => onMetadataToggle("showProvider")}
          >
            Provider
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showSizeClass}
            onCheckedChange={() => onMetadataToggle("showSizeClass")}
          >
            Size class
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showReasoning}
            onCheckedChange={() => onMetadataToggle("showReasoning")}
          >
            Reasoning
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showContextWindow}
            onCheckedChange={() => onMetadataToggle("showContextWindow")}
          >
            Context window
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Metrics</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={metadata.showResponseTokens}
            onCheckedChange={() => onMetadataToggle("showResponseTokens")}
          >
            Response tokens
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showLatency}
            onCheckedChange={() => onMetadataToggle("showLatency")}
          >
            Latency
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showIteration}
            onCheckedChange={() => onMetadataToggle("showIteration")}
          >
            Iteration
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showRunDate}
            onCheckedChange={() => onMetadataToggle("showRunDate")}
          >
            Run date
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showCost}
            onCheckedChange={() => onMetadataToggle("showCost")}
          >
            Cost
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showScore}
            onCheckedChange={() => onMetadataToggle("showScore")}
          >
            Score
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={metadata.showTemperature}
            onCheckedChange={() => onMetadataToggle("showTemperature")}
          >
            Temperature
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reset button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 ml-auto"
        onClick={onReset}
        title="Reset to defaults"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
