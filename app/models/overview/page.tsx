import Link from "next/link";
import { getModels, getModelsWithStats } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Settings,
  Play,
  Eye,
  Star,
  MessageSquare,
  FileText,
  CheckCircle,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import type { Model } from "@/lib/types";

function getProviderColor(provider: string): string {
  switch (provider) {
    case "openai":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "anthropic":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "google":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "ollama":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "openrouter":
      return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export default async function ModelsOverviewPage() {
  const [models, stats] = await Promise.all([
    getModels(),
    getModelsWithStats(),
  ]);

  const activeModels = models.filter((m) => m.isActive);
  const inactiveModels = models.filter((m) => !m.isActive);

  // Calculate aggregate stats
  const totalResponses = Object.values(stats).reduce((sum, s) => sum + s.responseCount, 0);
  const totalEvaluated = Object.values(stats).reduce((sum, s) => sum + s.evaluatedCount, 0);
  const modelsWithScores = Object.values(stats).filter((s) => s.avgScore !== undefined);
  const avgOverallScore =
    modelsWithScores.length > 0
      ? modelsWithScores.reduce((sum, s) => sum + (s.avgScore || 0), 0) / modelsWithScores.length
      : undefined;

  // Sort models by average score (if available) or response count
  const sortedActiveModels = [...activeModels].sort((a, b) => {
    const aScore = stats[a.id]?.avgScore;
    const bScore = stats[b.id]?.avgScore;
    if (aScore !== undefined && bScore !== undefined) {
      return bScore - aScore;
    }
    if (aScore !== undefined) return -1;
    if (bScore !== undefined) return 1;
    return (stats[b.id]?.responseCount || 0) - (stats[a.id]?.responseCount || 0);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/models">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Model Overview</h1>
            <p className="text-muted-foreground mt-1">
              Performance summary across {activeModels.length} active models
            </p>
          </div>
        </div>
        <Link href="/settings">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Manage Models
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeModels.length}</div>
            <p className="text-xs text-muted-foreground">
              {inactiveModels.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponses}</div>
            <p className="text-xs text-muted-foreground">
              {totalEvaluated} evaluated ({totalResponses > 0 ? Math.round((totalEvaluated / totalResponses) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgOverallScore !== undefined ? avgOverallScore.toFixed(1) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              across {modelsWithScores.length} scored models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(activeModels.map((m) => m.provider)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              {Array.from(new Set(activeModels.map((m) => m.provider))).join(", ")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Models Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Models Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedActiveModels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No active models. Add models in Settings.</p>
              <Link href="/settings">
                <Button variant="outline" className="mt-4">
                  <Settings className="h-4 w-4 mr-2" />
                  Go to Settings
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-left text-sm">
                    <th className="px-4 py-3 font-medium">Model</th>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium text-center">Prompts</th>
                    <th className="px-4 py-3 font-medium text-center">Responses</th>
                    <th className="px-4 py-3 font-medium text-center">Evaluated</th>
                    <th className="px-4 py-3 font-medium text-center">Avg Score</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedActiveModels.map((model, index) => {
                    const s = stats[model.id];
                    const evalPct =
                      s?.responseCount > 0
                        ? Math.round((s.evaluatedCount / s.responseCount) * 100)
                        : 0;

                    return (
                      <tr key={model.id} className="hover:bg-muted/30 group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {index < 3 && s?.avgScore !== undefined && (
                              <span className="text-yellow-500">
                                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                              </span>
                            )}
                            <div>
                              <Link
                                href={`/models/${model.id}`}
                                className="font-medium hover:underline"
                              >
                                {model.displayName}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {model.modelId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={getProviderColor(model.provider)}
                          >
                            {model.provider}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s?.promptCount || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s?.responseCount || 0}
                        </td>
                        <td className="px-4 py-3">
                          {s?.responseCount > 0 ? (
                            <div className="flex items-center gap-2 justify-center">
                              <Progress
                                value={evalPct}
                                className="w-16 h-2"
                              />
                              <span className="text-xs text-muted-foreground w-10">
                                {evalPct}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-center block text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {s?.avgScore !== undefined ? (
                            <div className="flex items-center justify-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium">
                                {s.avgScore.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/vibe-check/model?model=${model.id}`}>
                              <Button variant="ghost" size="sm" title="Model Vibe">
                                <Sparkles className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/models/${model.id}/responses`}>
                              <Button variant="ghost" size="sm" title="View Responses">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/runs/new?models=${model.id}`}>
                              <Button variant="ghost" size="sm" title="Run Test">
                                <Play className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>By Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {Array.from(new Set(activeModels.map((m) => m.provider))).map(
              (provider) => {
                const providerModels = activeModels.filter(
                  (m) => m.provider === provider
                );
                const providerResponses = providerModels.reduce(
                  (sum, m) => sum + (stats[m.id]?.responseCount || 0),
                  0
                );
                const providerScores = providerModels
                  .map((m) => stats[m.id]?.avgScore)
                  .filter((s): s is number => s !== undefined);
                const providerAvg =
                  providerScores.length > 0
                    ? providerScores.reduce((a, b) => a + b, 0) / providerScores.length
                    : undefined;

                return (
                  <Card key={provider}>
                    <CardContent className="pt-4">
                      <Badge
                        variant="secondary"
                        className={`${getProviderColor(provider)} mb-2`}
                      >
                        {provider}
                      </Badge>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Models:</span>
                          <span>{providerModels.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Responses:</span>
                          <span>{providerResponses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Score:</span>
                          <span>
                            {providerAvg !== undefined
                              ? providerAvg.toFixed(1)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inactive Models */}
      {inactiveModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Inactive Models ({inactiveModels.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {inactiveModels.map((model) => (
                <Badge key={model.id} variant="outline" className="text-muted-foreground">
                  {model.displayName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
