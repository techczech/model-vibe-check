import Link from "next/link";
import { getPrompts, getCategories } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Upload,
  Search,
  FileText,
  Eye,
  Paperclip,
} from "lucide-react";
import { truncate } from "@/lib/utils";

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const prompts = await getPrompts();
  const categories = await getCategories();

  // Filter prompts
  let filtered = prompts;
  if (searchParams.category) {
    filtered = filtered.filter((p) => p.category === searchParams.category);
  }
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }

  // Group by category
  const grouped = filtered.reduce(
    (acc, prompt) => {
      if (!acc[prompt.category]) acc[prompt.category] = [];
      acc[prompt.category].push(prompt);
      return acc;
    },
    {} as Record<string, typeof prompts>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
          <p className="text-muted-foreground mt-1">
            Your evaluation prompt library ({prompts.length} prompts)
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/prompts/import">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </Link>
          <Link href="/prompts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Prompt
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <form>
            <Input
              name="q"
              placeholder="Search prompts..."
              defaultValue={searchParams.q || ""}
              className="pl-9"
            />
          </form>
        </div>
        <div className="flex gap-2">
          <Link href="/prompts">
            <Badge
              variant={!searchParams.category ? "default" : "outline"}
              className="cursor-pointer"
            >
              All ({prompts.length})
            </Badge>
          </Link>
          {categories.map((cat) => {
            const count = prompts.filter((p) => p.category === cat).length;
            return (
              <Link key={cat} href={`/prompts?category=${cat}`}>
                <Badge
                  variant={searchParams.category === cat ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  {cat} ({count})
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Prompts List */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No prompts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchParams.q || searchParams.category
                ? "Try adjusting your filters"
                : "Get started by adding your first prompt"}
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/prompts/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prompt
                </Button>
              </Link>
              <Link href="/prompts/import">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import from JSON
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, categoryPrompts]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {category}
                <Badge variant="secondary">{categoryPrompts.length}</Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryPrompts.map((prompt) => (
                  <Link key={prompt.id} href={`/prompts/${prompt.id}`}>
                    <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-start justify-between">
                          <span>{prompt.title}</span>
                          {prompt.attachments.length > 0 && (
                            <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                          {truncate(prompt.description || prompt.content, 100)}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {prompt.keywords.slice(0, 4).map((kw) => (
                            <Badge key={kw} variant="outline" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                          {prompt.keywords.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{prompt.keywords.length - 4}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {prompt.evaluationConfig.methods.length} eval methods
                          </span>
                          {prompt.attachments.length > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                {prompt.attachments.length} attachment
                                {prompt.attachments.length !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
