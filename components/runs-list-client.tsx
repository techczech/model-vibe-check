"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, Clock, CheckCircle, XCircle, Loader2, Square } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  SIZE_FILTER_GROUPS,
  REASONING_FILTER_GROUPS,
  matchesSizeFilter,
  matchesReasoningFilter,
  getEffectiveMetadata,
  getSizeClassColor,
  getSizeClassLabel,
  type SizeFilterGroup,
  type ReasoningFilterGroup,
} from "@/lib/model-metadata";
import type { Run, Prompt, Model } from "@/lib/types";

const statusConfig = {
  pending: {
    icon: Clock,
    variant: "secondary" as const,
    label: "Pending",
  },
  running: {
    icon: Loader2,
    variant: "default" as const,
    label: "Running",
  },
  completed: {
    icon: CheckCircle,
    variant: "success" as const,
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    variant: "destructive" as const,
    label: "Failed",
  },
  cancelled: {
    icon: Square,
    variant: "warning" as const,
    label: "Cancelled",
  },
};

type RunStatus = keyof typeof statusConfig;

interface RunsListClientProps {
  runs: Run[];
  prompts: Prompt[];
  models: Model[];
}

export function RunsListClient({ runs, prompts, models }: RunsListClientProps) {
  const [statusFilter, setStatusFilter] = useState<RunStatus | "all">("all");
  const [sizeFilter, setSizeFilter] = useState<SizeFilterGroup>("all");
  const [reasoningFilter, setReasoningFilter] = useState<ReasoningFilterGroup>("all");

  const modelMap = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const statusCounts: Record<RunStatus | "all", number> = {
      all: runs.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    const sizeCounts: Record<SizeFilterGroup, number> = {
      all: 0,
      frontier: 0,
      flash: 0,
      "open-large": 0,
      "open-medium": 0,
      "open-small": 0,
    };

    const reasoningCounts: Record<ReasoningFilterGroup, number> = {
      all: 0,
      reasoning: 0,
      "non-reasoning": 0,
    };

    runs.forEach((run) => {
      // Count statuses
      statusCounts[run.status]++;

      // Count size groups - a run matches if ANY of its models match
      const runModels = run.modelIds.map((id) => modelMap.get(id)).filter(Boolean) as Model[];

      SIZE_FILTER_GROUPS.forEach((group) => {
        if (group.value === "all") return;
        const hasMatch = runModels.some((model) => {
          const meta = getEffectiveMetadata(model);
          return matchesSizeFilter(meta.sizeClass, group.value);
        });
        if (hasMatch) sizeCounts[group.value]++;
      });

      // Count reasoning - a run matches if ANY of its models have reasoning
      const hasReasoning = runModels.some((model) => {
        const meta = getEffectiveMetadata(model);
        return meta.reasoningCapability !== "none";
      });
      const hasNonReasoning = runModels.some((model) => {
        const meta = getEffectiveMetadata(model);
        return meta.reasoningCapability === "none";
      });

      if (hasReasoning) reasoningCounts.reasoning++;
      if (hasNonReasoning) reasoningCounts["non-reasoning"]++;
    });

    sizeCounts.all = runs.length;
    reasoningCounts.all = runs.length;

    return { statusCounts, sizeCounts, reasoningCounts };
  }, [runs, modelMap]);

  // Filter runs
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      // Status filter
      if (statusFilter !== "all" && run.status !== statusFilter) return false;

      // Get models for this run
      const runModels = run.modelIds.map((id) => modelMap.get(id)).filter(Boolean) as Model[];

      // Size filter - run must have at least one model matching
      if (sizeFilter !== "all") {
        const hasMatch = runModels.some((model) => {
          const meta = getEffectiveMetadata(model);
          return matchesSizeFilter(meta.sizeClass, sizeFilter);
        });
        if (!hasMatch) return false;
      }

      // Reasoning filter - run must have at least one model matching
      if (reasoningFilter !== "all") {
        const hasMatch = runModels.some((model) => {
          const meta = getEffectiveMetadata(model);
          return matchesReasoningFilter(meta.reasoningCapability, reasoningFilter);
        });
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [runs, statusFilter, sizeFilter, reasoningFilter, modelMap]);

  const hasActiveFilters = statusFilter !== "all" || sizeFilter !== "all" || reasoningFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card>
        <CardContent className="py-4 space-y-3">
          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium w-20">Status:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                statusFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              All ({filterCounts.statusCounts.all})
            </button>
            {(Object.keys(statusConfig) as RunStatus[]).map((status) => {
              const config = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    statusFilter === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  {config.label} ({filterCounts.statusCounts[status]})
                </button>
              );
            })}
          </div>

          {/* Size filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium w-20">Size:</span>
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
                {group.label} ({filterCounts.sizeCounts[group.value]})
              </button>
            ))}
          </div>

          {/* Reasoning filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium w-20">Reasoning:</span>
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
                {group.label} ({filterCounts.reasoningCounts[group.value]})
              </button>
            ))}

            {/* Clear all button */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setSizeFilter("all");
                  setReasoningFilter("all");
                }}
                className="ml-auto text-sm text-muted-foreground hover:text-foreground underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredRuns.length} of {runs.length} runs
        </p>
      )}

      {/* Runs List */}
      {filteredRuns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No matching runs</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all");
                    setSizeFilter("all");
                    setReasoningFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">No runs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start your first vibe check to see how models compare
                </p>
                <Link href="/runs/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Run
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRuns.map((run) => {
            const status = statusConfig[run.status];
            const StatusIcon = status.icon;

            // Calculate stats
            const totalResults = run.results.length;
            const totalEvaluations = run.evaluations.length;

            // Calculate duration
            const duration =
              run.completedAt && run.createdAt
                ? new Date(run.completedAt).getTime() -
                  new Date(run.createdAt).getTime()
                : null;

            return (
              <Link key={run.id} href={`/runs/${run.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon
                            className={cn(
                              "h-5 w-5",
                              run.status === "running" && "animate-spin",
                              run.status === "completed" && "text-green-500",
                              run.status === "failed" && "text-red-500",
                              run.status === "cancelled" && "text-yellow-500",
                              run.status !== "completed" && run.status !== "failed" && run.status !== "cancelled" && "text-muted-foreground"
                            )}
                          />
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {run.status === "running" && (
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Progress
                                value={(run.results.length / (run.promptIds.length * run.modelIds.length * run.iterations)) * 100}
                                className="h-1.5 flex-1"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {run.results.length}/{run.promptIds.length * run.modelIds.length * run.iterations}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{run.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {run.promptIds.length} prompts ×{" "}
                            {run.modelIds.length} models × {run.iterations}{" "}
                            iteration{run.iterations !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <p className="font-medium">{totalResults} results</p>
                          <p className="text-muted-foreground">
                            {totalEvaluations} evaluations
                          </p>
                        </div>

                        {duration && (
                          <div className="text-right">
                            <p className="font-medium">
                              {formatDuration(duration)}
                            </p>
                            <p className="text-muted-foreground">duration</p>
                          </div>
                        )}

                        <div className="text-right text-muted-foreground">
                          <p>{formatDate(run.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Models involved with metadata badges */}
                    <div className="mt-3 flex gap-1.5 flex-wrap">
                      {run.modelIds.slice(0, 5).map((modelId) => {
                        const model = modelMap.get(modelId);
                        if (!model) {
                          return (
                            <Badge key={modelId} variant="outline" className="text-xs">
                              {modelId}
                            </Badge>
                          );
                        }
                        const meta = getEffectiveMetadata(model);
                        return (
                          <Badge
                            key={modelId}
                            variant="outline"
                            className="text-xs flex items-center gap-1"
                          >
                            {model.displayName}
                            <span className={cn(
                              "px-1 rounded text-[10px]",
                              getSizeClassColor(meta.sizeClass)
                            )}>
                              {getSizeClassLabel(meta.sizeClass)}
                            </span>
                          </Badge>
                        );
                      })}
                      {run.modelIds.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{run.modelIds.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
