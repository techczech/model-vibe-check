import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(2)}¢`;
  return `$${usd.toFixed(4)}`;
}

export function getScoreColor(score: number, max: number = 10): string {
  const normalized = score / max;
  if (normalized >= 0.7) return "text-vibe-good";
  if (normalized >= 0.4) return "text-vibe-okay";
  return "text-vibe-bad";
}

export function getScoreBgColor(score: number, max: number = 10): string {
  const normalized = score / max;
  if (normalized >= 0.7) return "bg-green-100";
  if (normalized >= 0.4) return "bg-yellow-100";
  return "bg-red-100";
}

export function getScoreEmoji(score: number, max: number = 10): string {
  const normalized = score / max;
  if (normalized >= 0.7) return "✅";
  if (normalized >= 0.4) return "⚠️";
  return "❌";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + "...";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
}
