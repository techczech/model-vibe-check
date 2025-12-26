import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrompts, getRuns, getModels } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Play,
  ChevronRight,
} from "lucide-react";

interface PromptWithStats {
  id: string;
  title: string;
  responseCount: number;
  modelIds: Set<string>;
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  
  const prompts = await getPrompts();
  const runs = await getRuns();
  const models = await getModels();

  // Build model lookup
  const modelLookup = new Map(models.map((m) => [m.id, m]));

  // Find prompts matching this category slug
  const categoryPrompts = prompts.filter((p) => {
    const cat = p.category || "Uncategorized";
    const catSlug = cat.toLowerCase().replace(/\s+/g, "-");
    return catSlug === decodedSlug;
  });

  if (categoryPrompts.length === 0) {
    notFound();
  }

  const categoryName = categoryPrompts[0].category || "Uncategorized";

  // Build stats per prompt
  const promptStats = new Map<string, PromptWithStats>();
  
  for (const prompt of categoryPrompts) {
    promptStats.set(prompt.id, {
      id: prompt.id,
      title: prompt.title,
      responseCount: 0,
      modelIds: new Set(),
    });
  }

  // Count responses
  for (const run of runs) {
    for (const result of run.results) {
      const stats = promptStats.get(result.promptId);
      if (stats) {
        stats.responseCount++;
        stats.modelIds.add(result.modelId);
      }
    }
  }

  const promptList = Array.from(promptStats.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  // Calculate totals
  const totalResponses = promptList.reduce((sum, p) => sum + p.responseCount, 0);
  const allModels = new Set<string>();
  promptList.forEach((p) => p.modelIds.forEach((m) => allModels.add(m)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/categories">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{categoryName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                <FileText className="h-3 w-3 mr-1" />
                {categoryPrompts.length} prompt{categoryPrompts.length !== 1 ? "s" : ""}
              </Badge>
              {totalResponses > 0 && (
                <Badge variant="outline">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {totalResponses} response{totalResponses !== 1 ? "s" : ""}
                </Badge>
              )}
              {allModels.size > 0 && (
                <Badge variant="outline">
                  {allModels.size} model{allModels.size !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Link href={`/runs/new?category=${encodeURIComponent(categoryName)}`}>
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Run All
          </Button>
        </Link>
      </div>

      {/* Prompts List */}
      <div className="space-y-4">
        {promptList.map((prompt) => {
          const originalPrompt = categoryPrompts.find((p) => p.id === prompt.id)!;
          
          return (
            <Card key={prompt.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{prompt.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {originalPrompt.content.slice(0, 150)}
                      {originalPrompt.content.length > 150 ? "..." : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {prompt.responseCount > 0 && (
                      <Link href={`/prompts/${prompt.id}/responses`}>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {prompt.responseCount} Responses
                        </Button>
                      </Link>
                    )}
                    <Link href={`/prompts/${prompt.id}`}>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              {prompt.modelIds.size > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {Array.from(prompt.modelIds).map((modelId) => {
                      const model = modelLookup.get(modelId);
                      return (
                        <Badge key={modelId} variant="secondary" className="text-xs">
                          {model?.displayName || modelId}
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
