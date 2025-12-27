import Link from "next/link";
import { getPrompts, getModels, getPromptsWithStats } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Bot,
  Shuffle,
  Swords,
  ArrowRight,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default async function VibeCheckPage() {
  const [prompts, models, stats] = await Promise.all([
    getPrompts(),
    getModels(),
    getPromptsWithStats(),
  ]);

  const activeModels = models.filter((m) => m.isActive);
  
  // Calculate stats
  const promptsWithResponses = Object.values(stats).filter((s) => s.hasResponses).length;
  const promptsNeedingEvaluation = Object.values(stats).filter((s) => s.needsEvaluation).length;
  const totalResponses = Object.values(stats).reduce((sum, s) => sum + s.responseCount, 0);
  const totalEvaluated = Object.values(stats).reduce((sum, s) => sum + s.evaluatedCount, 0);
  const unevaluatedResponses = totalResponses - totalEvaluated;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Vibe Check</h1>
        <p className="text-lg text-muted-foreground">
          Compare and evaluate model responses with qualitative judgment
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{promptsWithResponses}</div>
            <p className="text-xs text-muted-foreground">Prompts with responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{activeModels.length}</div>
            <p className="text-xs text-muted-foreground">Active models</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{totalResponses}</div>
            <p className="text-xs text-muted-foreground">Total responses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{unevaluatedResponses}</div>
            <p className="text-xs text-muted-foreground">Need evaluation</p>
          </CardContent>
        </Card>
      </div>

      {/* Mode Selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-center">Choose a mode</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Prompt Vibe */}
          <Link href="/vibe-check/prompt">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                    <FileText className="h-6 w-6" />
                  </div>
                  <span>Prompt Vibe</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Same prompt, different models. Compare how multiple models respond to a single prompt side by side.
                </p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  "Which model is best for this task?"
                </p>
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="secondary">
                    {promptsWithResponses} prompts available
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Model Vibe */}
          <Link href="/vibe-check/model">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                    <Bot className="h-6 w-6" />
                  </div>
                  <span>Model Vibe</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Same model, different prompts. Explore how a single model performs across various tasks.
                </p>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  "What is this model good at?"
                </p>
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="secondary">
                    {activeModels.length} models available
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Blind Review */}
          <Link href="/vibe-check/blind">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300">
                    <Shuffle className="h-6 w-6" />
                  </div>
                  <span>Blind Review</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Flashcard mode for unbiased evaluation. Rate responses without knowing which model produced them.
                </p>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  "Judge responses without bias"
                </p>
                <div className="flex items-center justify-between pt-2">
                  {unevaluatedResponses > 0 ? (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {unevaluatedResponses} to review
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      All reviewed
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Head-to-Head */}
          <Link href="/vibe-check/compare">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
                    <Swords className="h-6 w-6" />
                  </div>
                  <span>Head-to-Head</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Pairwise comparison with voting. Pick the better response between two models.
                </p>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  "Which response is better?"
                </p>
                <div className="flex items-center justify-between pt-2">
                  <Badge variant="secondary">
                    {Math.floor((activeModels.length * (activeModels.length - 1)) / 2)} possible matchups
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      {promptsNeedingEvaluation > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">
                    {promptsNeedingEvaluation} prompts need evaluation
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {unevaluatedResponses} responses waiting to be reviewed
                  </p>
                </div>
              </div>
              <Link href="/vibe-check/blind">
                <Button>
                  Start Blind Review
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
