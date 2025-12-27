import Link from "next/link";
import { getRuns, getPrompts, getModels } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Clock, CheckCircle, XCircle, Loader2, Sparkles } from "lucide-react";
import { formatDate, formatDuration } from "@/lib/utils";

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
};

export default async function RunsPage() {
  const [runs, prompts, models] = await Promise.all([
    getRuns(),
    getPrompts(),
    getModels(),
  ]);

  const promptMap = new Map(prompts.map((p) => [p.id, p]));
  const modelMap = new Map(models.map((m) => [m.id, m]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Runs</h1>
          <p className="text-muted-foreground mt-1">
            History of your model evaluations
          </p>
        </div>
        <Link href="/runs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Run
          </Button>
        </Link>
      </div>

      {/* Runs List */}
      {runs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => {
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
                            className={`h-5 w-5 ${
                              run.status === "running" ? "animate-spin" : ""
                            } ${
                              run.status === "completed"
                                ? "text-green-500"
                                : run.status === "failed"
                                ? "text-red-500"
                                : "text-muted-foreground"
                            }`}
                          />
                          <Badge variant={status.variant}>{status.label}</Badge>
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

                    {/* Models involved */}
                    <div className="mt-3 flex gap-1 flex-wrap">
                      {run.modelIds.slice(0, 5).map((modelId) => {
                        const model = modelMap.get(modelId);
                        return (
                          <Badge
                            key={modelId}
                            variant="outline"
                            className="text-xs"
                          >
                            {model?.displayName || modelId}
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
