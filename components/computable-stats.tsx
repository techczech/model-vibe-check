"use client";

/**
 * ComputableStatsDisplay Component
 *
 * Displays statistics from computable evaluations (word count, arithmetic, etc.)
 * Shows average, min, max, std dev with a simple bar chart visualization.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComputableStats } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ComputableStatsProps {
  stats: ComputableStats;
  label: string;
  unit?: string;
  className?: string;
}

export function ComputableStatsDisplay({
  stats,
  label,
  unit = "",
  className,
}: ComputableStatsProps) {
  const { values, average, min, max, stdDev, target } = stats;

  if (values.length === 0) {
    return null;
  }

  // Format numbers nicely
  const fmt = (n: number) => {
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(1);
  };

  // Calculate percentage for bar heights (relative to max)
  const getBarHeight = (value: number) => {
    if (max === 0) return 0;
    return (value / max) * 100;
  };

  // Color coding based on target proximity
  const getBarColor = (value: number) => {
    if (!target) return "bg-primary";
    const deviation = Math.abs(value - target) / target;
    if (deviation <= 0.1) return "bg-green-500";
    if (deviation <= 0.25) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label} Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div>
            <span className="text-lg font-bold text-primary">{fmt(average)}</span>
            <p className="text-xs text-muted-foreground">Average</p>
          </div>
          <div>
            <span className="text-lg">{fmt(min)}</span>
            <p className="text-xs text-muted-foreground">Min</p>
          </div>
          <div>
            <span className="text-lg">{fmt(max)}</span>
            <p className="text-xs text-muted-foreground">Max</p>
          </div>
          <div>
            <span className="text-lg">{fmt(stdDev)}</span>
            <p className="text-xs text-muted-foreground">Std Dev</p>
          </div>
        </div>

        {/* Target indicator */}
        {target !== undefined && (
          <div className="text-center text-sm text-muted-foreground mb-3">
            Target: <span className="font-medium">{fmt(target)}</span> {unit}
          </div>
        )}

        {/* Bar Chart */}
        <div className="flex items-end gap-1 h-16 px-1">
          {values.map((value, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-t transition-all hover:opacity-80 min-w-[4px]",
                getBarColor(value)
              )}
              style={{ height: `${Math.max(getBarHeight(value), 4)}%` }}
              title={`Iteration ${i + 1}: ${fmt(value)} ${unit}`}
            />
          ))}
        </div>

        {/* Target line overlay */}
        {target !== undefined && max > 0 && (
          <div
            className="relative -mt-16 h-16 pointer-events-none"
          >
            <div
              className="absolute w-full border-t-2 border-dashed border-primary/50"
              style={{ bottom: `${(target / max) * 100}%` }}
            />
          </div>
        )}

        {/* Sample count */}
        <p className="text-xs text-muted-foreground text-center mt-2">
          {values.length} sample{values.length !== 1 ? "s" : ""}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline stats display for use in tables/lists
 */
interface CompactStatsProps {
  stats: ComputableStats;
  unit?: string;
  showTarget?: boolean;
}

export function CompactStatsDisplay({
  stats,
  unit = "",
  showTarget = true,
}: CompactStatsProps) {
  const { average, min, max, target } = stats;

  const fmt = (n: number) => {
    if (Number.isInteger(n)) return n.toString();
    return n.toFixed(1);
  };

  // Visual indicator of how close to target
  const getStatusColor = () => {
    if (!target) return "";
    const deviation = Math.abs(average - target) / target;
    if (deviation <= 0.1) return "text-green-600";
    if (deviation <= 0.25) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <span className={cn("text-sm", getStatusColor())}>
      {fmt(average)}
      <span className="text-muted-foreground text-xs ml-1">
        ({fmt(min)}-{fmt(max)})
      </span>
      {showTarget && target !== undefined && (
        <span className="text-muted-foreground text-xs ml-1">
          / {fmt(target)} {unit}
        </span>
      )}
    </span>
  );
}

/**
 * Mini sparkline-style display for table cells
 */
interface SparklineStatsProps {
  stats: ComputableStats;
  width?: number;
  height?: number;
}

export function SparklineStats({
  stats,
  width = 60,
  height = 20,
}: SparklineStatsProps) {
  const { values, max, target } = stats;

  if (values.length === 0) return null;

  const effectiveMax = Math.max(max, target || 0);

  // Calculate points for SVG polyline
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * width;
      const y = height - (v / effectiveMax) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      {/* Target line */}
      {target !== undefined && (
        <line
          x1={0}
          y1={height - (target / effectiveMax) * height}
          x2={width}
          y2={height - (target / effectiveMax) * height}
          stroke="currentColor"
          strokeDasharray="2,2"
          className="text-muted-foreground/50"
        />
      )}
      {/* Data line */}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-primary"
      />
      {/* Data points */}
      {values.map((v, i) => (
        <circle
          key={i}
          cx={(i / (values.length - 1 || 1)) * width}
          cy={height - (v / effectiveMax) * height}
          r={2}
          className="fill-primary"
        />
      ))}
    </svg>
  );
}
