import Link from "next/link";
import { getPrompts, getRuns } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, MessageSquare, ChevronRight } from "lucide-react";

interface CategoryStats {
  name: string;
  slug: string;
  promptCount: number;
  responseCount: number;
  modelCount: number;
}

export default async function CategoriesPage() {
  const prompts = await getPrompts();
  const runs = await getRuns();

  // Build category stats
  const categoryMap = new Map<string, CategoryStats>();

  // Count prompts per category
  for (const prompt of prompts) {
    const cat = prompt.category || "Uncategorized";
    const slug = cat.toLowerCase().replace(/\s+/g, "-");
    
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        name: cat,
        slug,
        promptCount: 0,
        responseCount: 0,
        modelCount: 0,
      });
    }
    
    const stats = categoryMap.get(cat)!;
    stats.promptCount++;
  }

  // Count responses per category
  const modelsPerCategory = new Map<string, Set<string>>();
  
  for (const run of runs) {
    for (const result of run.results) {
      const prompt = prompts.find((p) => p.id === result.promptId);
      if (!prompt) continue;
      
      const cat = prompt.category || "Uncategorized";
      const stats = categoryMap.get(cat);
      if (stats) {
        stats.responseCount++;
        
        // Track unique models
        if (!modelsPerCategory.has(cat)) {
          modelsPerCategory.set(cat, new Set());
        }
        modelsPerCategory.get(cat)!.add(result.modelId);
      }
    }
  }

  // Set model counts
  for (const [cat, models] of modelsPerCategory) {
    const stats = categoryMap.get(cat);
    if (stats) {
      stats.modelCount = models.size;
    }
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-muted-foreground mt-1">
          Browse prompts and responses by category
        </p>
      </div>

      {categories.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No categories yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Categories are created when you add prompts.
            </p>
            <Link href="/prompts/new" className="text-primary hover:underline text-sm">
              Create a prompt
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link key={cat.slug} href={`/categories/${encodeURIComponent(cat.slug)}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{cat.name}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {cat.promptCount} prompt{cat.promptCount !== 1 ? "s" : ""}
                    </Badge>
                    {cat.responseCount > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {cat.responseCount} response{cat.responseCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {cat.modelCount > 0 && (
                      <Badge variant="outline">
                        {cat.modelCount} model{cat.modelCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
