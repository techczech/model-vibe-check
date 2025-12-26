import Link from "next/link";
import { getPrompts, getModels, getRuns } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Cpu,
  Play,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { formatDate, getScoreEmoji } from "@/lib/utils";

export default async function DashboardPage() {
  const [prompts, models, runs] = await Promise.all([
    getPrompts(),
    getModels(),
    getRuns(),
  ]);

  const activeModels = models.filter((m) => m.isActive);
  const recentRuns = runs.slice(0, 5);

  // Calculate some stats
  const completedRuns = runs.filter((r) => r.status === "completed");
  const totalResults = completedRuns.reduce(
    (sum, r) => sum + r.results.length,
    0
  );
  const totalEvaluations = completedRuns.reduce(
    (sum, r) => sum + r.evaluations.length,
    0
  );

  // Group prompts by category
  const categories = [...new Set(prompts.map((p) => p.category))];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Quick overview of your vibe check setup
          </p>
        </div>
        <Link href="/runs/new">
          <Button>
            <Play className="h-4 w-4 mr-2" />
            New Vibe Check
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prompts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prompts.length}</div>
            <p className="text-xs text-muted-foreground">
              across {categories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeModels.length}</div>
            <p className="text-xs text-muted-foreground">
              of {models.length} configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Runs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRuns.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalResults} total results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluations</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvaluations}</div>
            <p className="text-xs text-muted-foreground">
              human + machine + LLM
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Runs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Runs</CardTitle>
            <Link href="/runs">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No runs yet</p>
                <Link href="/runs/new" className="text-primary hover:underline">
                  Start your first vibe check
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentRuns.map((run) => (
                  <li key={run.id}>
                    <Link
                      href={`/runs/${run.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium">{run.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {run.promptIds.length} prompts × {run.modelIds.length}{" "}
                          models
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            run.status === "completed"
                              ? "success"
                              : run.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {run.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(run.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Categories */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/prompts/new">
                <Button variant="outline" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Add new prompt
                </Button>
              </Link>
              <Link href="/models">
                <Button variant="outline" className="w-full justify-start">
                  <Cpu className="h-4 w-4 mr-2" />
                  Configure models
                </Button>
              </Link>
              <Link href="/prompts/import">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Import prompts
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Prompt Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No prompts yet. Add some to get started.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const count = prompts.filter((p) => p.category === cat).length;
                    return (
                      <Link key={cat} href={`/prompts?category=${cat}`}>
                        <Badge variant="outline" className="cursor-pointer">
                          {cat} ({count})
                        </Badge>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Getting Started (show if no data) */}
      {prompts.length === 0 && models.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Getting Started</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Model Vibe Check helps you systematically evaluate LLMs against
              your personal prompt library. Here's how to get started:
            </p>
            <ol className="text-left max-w-md mx-auto space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>
                  <Link href="/prompts/import" className="text-primary hover:underline">
                    Import your prompts
                  </Link>{" "}
                  or add them manually
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>
                  <Link href="/models" className="text-primary hover:underline">
                    Configure models
                  </Link>{" "}
                  (Ollama, OpenAI, Google, OpenRouter)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>
                  <Link href="/settings" className="text-primary hover:underline">
                    Add API keys
                  </Link>{" "}
                  for cloud providers
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">4.</span>
                <span>
                  Run your first vibe check and see how models compare
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
