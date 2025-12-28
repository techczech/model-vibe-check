"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SIZE_FILTER_GROUPS,
  REASONING_FILTER_GROUPS,
  matchesSizeFilter,
  matchesReasoningFilter,
  sortModels,
  getEffectiveMetadata,
  type SizeFilterGroup,
  type ReasoningFilterGroup,
  type ModelSortOption,
} from "@/lib/model-metadata";
import type { Model } from "@/lib/types";
import { ArrowUpDown } from "lucide-react";

interface ModelFilterBarProps {
  models: Model[];
  onFilterChange: (filtered: Model[]) => void;
  showSorting?: boolean;
  showCounts?: boolean;
  className?: string;
}

export function ModelFilterBar({
  models,
  onFilterChange,
  showSorting = true,
  showCounts = true,
  className,
}: ModelFilterBarProps) {
  const [sizeFilter, setSizeFilter] = useState<SizeFilterGroup>("all");
  const [reasoningFilter, setReasoningFilter] = useState<ReasoningFilterGroup>("all");
  const [sortBy, setSortBy] = useState<ModelSortOption>("provider");

  // Calculate counts for each filter option
  const filterCounts = useMemo(() => {
    const sizeCounts: Record<SizeFilterGroup, number> = {
      all: models.length,
      frontier: 0,
      flash: 0,
      "open-large": 0,
      "open-medium": 0,
      "open-small": 0,
    };
    const reasoningCounts: Record<ReasoningFilterGroup, number> = {
      all: models.length,
      reasoning: 0,
      "non-reasoning": 0,
    };

    models.forEach((model) => {
      const meta = getEffectiveMetadata(model);

      // Count size groups
      SIZE_FILTER_GROUPS.forEach((group) => {
        if (group.value !== "all" && matchesSizeFilter(meta.sizeClass, group.value)) {
          sizeCounts[group.value]++;
        }
      });

      // Count reasoning groups
      if (meta.reasoningCapability !== "none") {
        reasoningCounts.reasoning++;
      } else {
        reasoningCounts["non-reasoning"]++;
      }
    });

    return { sizeCounts, reasoningCounts };
  }, [models]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = models.filter((model) => {
      const meta = getEffectiveMetadata(model);
      if (!matchesSizeFilter(meta.sizeClass, sizeFilter)) return false;
      if (!matchesReasoningFilter(meta.reasoningCapability, reasoningFilter)) return false;
      return true;
    });

    // Apply sorting
    filtered = sortModels(filtered, sortBy);

    onFilterChange(filtered);
  }, [models, sizeFilter, reasoningFilter, sortBy, onFilterChange]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Size filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">Size:</span>
        {SIZE_FILTER_GROUPS.map((group) => (
          <button
            key={group.value}
            onClick={() => setSizeFilter(group.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              sizeFilter === group.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            {group.label}
            {showCounts && filterCounts.sizeCounts[group.value] > 0 && (
              <span className="ml-1 opacity-70">
                ({filterCounts.sizeCounts[group.value]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reasoning filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">Reasoning:</span>
        {REASONING_FILTER_GROUPS.map((group) => (
          <button
            key={group.value}
            onClick={() => setReasoningFilter(group.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              reasoningFilter === group.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            {group.label}
            {showCounts && filterCounts.reasoningCounts[group.value] > 0 && (
              <span className="ml-1 opacity-70">
                ({filterCounts.reasoningCounts[group.value]})
              </span>
            )}
          </button>
        ))}

        {/* Sorting dropdown */}
        {showSorting && (
          <div className="ml-auto flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as ModelSortOption)}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="provider">By Provider</SelectItem>
                <SelectItem value="size">By Size</SelectItem>
                <SelectItem value="name">By Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Active filter summary */}
      {(sizeFilter !== "all" || reasoningFilter !== "all") && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {sizeFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {SIZE_FILTER_GROUPS.find((g) => g.value === sizeFilter)?.label}
              <button
                onClick={() => setSizeFilter("all")}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
          {reasoningFilter !== "all" && (
            <Badge variant="secondary" className="text-xs">
              {REASONING_FILTER_GROUPS.find((g) => g.value === reasoningFilter)?.label}
              <button
                onClick={() => setReasoningFilter("all")}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          )}
          <button
            onClick={() => {
              setSizeFilter("all");
              setReasoningFilter("all");
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// Export filter state for external control
export { type SizeFilterGroup, type ReasoningFilterGroup, type ModelSortOption };
