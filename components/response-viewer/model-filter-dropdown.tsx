"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Filter, ChevronDown, Search, X } from "lucide-react";
import {
  getEffectiveMetadata,
  getSizeClassLabel,
  getSizeClassColor,
  matchesSizeFilter,
  type SizeFilterGroup,
} from "@/lib/model-metadata";
import type { Model } from "@/lib/types";

interface ModelFilterDropdownProps {
  /** All available models */
  models: Model[];
  /** Currently selected model IDs (for filtering responses) */
  selectedModelIds: Set<string>;
  /** Callback when selection changes */
  onSelectionChange: (selectedIds: Set<string>) => void;
  className?: string;
}

export function ModelFilterDropdown({
  models,
  selectedModelIds,
  onSelectionChange,
  className,
}: ModelFilterDropdownProps) {
  const [nameFilter, setNameFilter] = useState("");

  // Filter models by name
  const filteredModels = useMemo(() => {
    if (!nameFilter) return models;
    const search = nameFilter.toLowerCase();
    return models.filter(
      (m) =>
        m.displayName.toLowerCase().includes(search) ||
        m.modelId.toLowerCase().includes(search)
    );
  }, [models, nameFilter]);

  // Group models by provider for display
  const groupedModels = useMemo(() => {
    const groups: Record<string, Model[]> = {};
    filteredModels.forEach((model) => {
      if (!groups[model.provider]) {
        groups[model.provider] = [];
      }
      groups[model.provider].push(model);
    });
    return groups;
  }, [filteredModels]);

  // Quick filter handlers
  const selectAll = () => {
    onSelectionChange(new Set(models.map((m) => m.id)));
  };

  const selectNone = () => {
    onSelectionChange(new Set());
  };

  const selectBySize = (sizeGroup: SizeFilterGroup) => {
    const newSet = new Set(selectedModelIds);
    models.forEach((model) => {
      const meta = getEffectiveMetadata(model);
      if (matchesSizeFilter(meta.sizeClass, sizeGroup)) {
        newSet.add(model.id);
      }
    });
    onSelectionChange(newSet);
  };

  const selectReasoning = () => {
    const newSet = new Set(selectedModelIds);
    models.forEach((model) => {
      const meta = getEffectiveMetadata(model);
      if (meta.reasoningCapability !== "none") {
        newSet.add(model.id);
      }
    });
    onSelectionChange(newSet);
  };

  const toggleModel = (modelId: string) => {
    const newSet = new Set(selectedModelIds);
    if (newSet.has(modelId)) {
      newSet.delete(modelId);
    } else {
      newSet.add(modelId);
    }
    onSelectionChange(newSet);
  };

  const selectedCount = selectedModelIds.size;
  const totalCount = models.length;
  const isFiltered = selectedCount < totalCount && selectedCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={isFiltered ? "secondary" : "outline"}
          size="sm"
          className={cn("h-8 gap-1", className)}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Models</span>
          {isFiltered ? (
            <Badge variant="default" className="h-5 px-1.5 text-xs ml-1">
              {selectedCount}/{totalCount}
            </Badge>
          ) : (
            <Badge variant="outline" className="h-5 px-1.5 text-xs ml-1">
              {totalCount}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="start">
        <div className="p-2">
          <DropdownMenuLabel className="px-0 py-1">Filter Models</DropdownMenuLabel>
          {/* Name search */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="pl-7 h-7 text-sm"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
            {nameFilter && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNameFilter("");
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {/* Quick filters */}
          <div className="flex flex-wrap gap-1 mb-2">
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                selectAll();
              }}
            >
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                selectNone();
              }}
            >
              None
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                selectBySize("frontier");
              }}
            >
              + Frontier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                selectBySize("flash");
              }}
            >
              + Flash
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                selectReasoning();
              }}
            >
              + Reasoning
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Model list */}
        <div className="max-h-64 overflow-y-auto p-2">
          {filteredModels.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No models match "{nameFilter}"
            </p>
          ) : (
            Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider} className="mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1">
                  {provider}
                </p>
                {providerModels.map((model) => {
                  const meta = getEffectiveMetadata(model);
                  const isSelected = selectedModelIds.has(model.id);
                  return (
                    <label
                      key={model.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50",
                        isSelected && "bg-muted/30"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleModel(model.id)}
                      />
                      <span className="flex-1 text-sm truncate">
                        {model.displayName}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          getSizeClassColor(meta.sizeClass)
                        )}
                      >
                        {getSizeClassLabel(meta.sizeClass)}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Footer */}
        <div className="p-2 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {selectedCount} of {totalCount} selected
            {nameFilter && ` (showing ${filteredModels.length})`}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
