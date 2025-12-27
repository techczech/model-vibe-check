"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Upload,
  Search,
  FileText,
  Paperclip,
  MessageSquare,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  AlertCircle,
  Play,
  Eye,
  Sparkles,
} from "lucide-react";
import { truncate } from "@/lib/utils";
import type { Prompt } from "@/lib/types";
import type { PromptStats } from "@/lib/storage";

interface PromptsListClientProps {
  prompts: Prompt[];
  categories: string[];
  stats: Record<string, PromptStats>;
  initialParams: {
    category?: string;
    q?: string;
    filter?: 'all' | 'has-responses' | 'needs-evaluation';
    view?: 'grid' | 'table';
    sort?: string;
    order?: 'asc' | 'desc';
  };
}

type SortKey = 'title' | 'category' | 'responses' | 'evaluated' | 'models';

export function PromptsListClient({
  prompts,
  categories,
  stats,
  initialParams,
}: PromptsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [view, setView] = useState<'grid' | 'table'>(initialParams.view || 'grid');
  const [search, setSearch] = useState(initialParams.q || '');
  const [category, setCategory] = useState(initialParams.category || 'all');
  const [filter, setFilter] = useState(initialParams.filter || 'all');
  const [sortKey, setSortKey] = useState<SortKey>((initialParams.sort as SortKey) || 'title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialParams.order || 'asc');

  // Filter and sort prompts
  const filteredPrompts = useMemo(() => {
    let result = [...prompts];

    // Category filter
    if (category && category !== 'all') {
      result = result.filter((p) => p.category === category);
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }

    // Response/evaluation filter
    if (filter === 'has-responses') {
      result = result.filter((p) => stats[p.id]?.hasResponses);
    } else if (filter === 'needs-evaluation') {
      result = result.filter((p) => stats[p.id]?.needsEvaluation);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortKey) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'category':
          aVal = a.category;
          bVal = b.category;
          break;
        case 'responses':
          aVal = stats[a.id]?.responseCount || 0;
          bVal = stats[b.id]?.responseCount || 0;
          break;
        case 'evaluated':
          aVal = stats[a.id]?.evaluationPct || 0;
          bVal = stats[b.id]?.evaluationPct || 0;
          break;
        case 'models':
          aVal = stats[a.id]?.modelCount || 0;
          bVal = stats[b.id]?.modelCount || 0;
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [prompts, category, search, filter, sortKey, sortOrder, stats]);

  // Group by category for grid view
  const grouped = useMemo(() => {
    if (category && category !== 'all') {
      return { [category]: filteredPrompts };
    }
    return filteredPrompts.reduce(
      (acc, prompt) => {
        if (!acc[prompt.category]) acc[prompt.category] = [];
        acc[prompt.category].push(prompt);
        return acc;
      },
      {} as Record<string, Prompt[]>
    );
  }, [filteredPrompts, category]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  }

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
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prompts</SelectItem>
            <SelectItem value="has-responses">Has Responses</SelectItem>
            <SelectItem value="needs-evaluation">Needs Evaluation</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex border rounded-md">
          <Button
            variant={view === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-r-none"
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-l-none"
            onClick={() => setView('table')}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredPrompts.length} of {prompts.length} prompts
      </p>

      {/* Empty State */}
      {filteredPrompts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No prompts found</h3>
            <p className="text-muted-foreground mb-4">
              {search || category !== 'all' || filter !== 'all'
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
      ) : view === 'table' ? (
        /* Table View */
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-sm">
                <th className="px-4 py-3 font-medium">
                  <button
                    className="flex items-center hover:text-foreground"
                    onClick={() => handleSort('title')}
                  >
                    Title
                    <SortIcon column="title" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button
                    className="flex items-center hover:text-foreground"
                    onClick={() => handleSort('category')}
                  >
                    Category
                    <SortIcon column="category" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground"
                    onClick={() => handleSort('models')}
                  >
                    Models
                    <SortIcon column="models" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground"
                    onClick={() => handleSort('responses')}
                  >
                    Responses
                    <SortIcon column="responses" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-center">
                  <button
                    className="flex items-center justify-center hover:text-foreground"
                    onClick={() => handleSort('evaluated')}
                  >
                    Evaluated
                    <SortIcon column="evaluated" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPrompts.map((prompt) => {
                const s = stats[prompt.id];
                const evalPct = s?.evaluationPct || 0;
                const isComplete = s?.responseCount > 0 && evalPct === 100;
                const needsWork = s?.needsEvaluation;

                return (
                  <tr
                    key={prompt.id}
                    className="hover:bg-muted/30 group"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/prompts/${prompt.id}`}
                        className="font-medium hover:underline flex items-center gap-2"
                      >
                        {prompt.title}
                        {prompt.attachments.length > 0 && (
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Link>
                      {prompt.keywords.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {prompt.keywords.slice(0, 3).map((kw) => (
                            <Badge key={kw} variant="outline" className="text-xs">
                              {kw}
                            </Badge>
                          ))}
                          {prompt.keywords.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{prompt.keywords.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{prompt.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s?.modelCount || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s?.responseCount || 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s?.responseCount > 0 ? (
                        <div className="flex items-center justify-center gap-2">
                          {isComplete ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : needsWork ? (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          ) : null}
                          <span>
                            {s.evaluatedCount}/{s.responseCount}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            ({evalPct}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/vibe-check/prompt?prompt=${prompt.id}`}>
                          <Button variant="ghost" size="sm" title="Prompt Vibe">
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/prompts/${prompt.id}`}>
                          <Button variant="ghost" size="sm" title="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/runs/new?prompts=${prompt.id}`}>
                          <Button variant="ghost" size="sm" title="Run">
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
      ) : (
        /* Grid View */
        <div className="space-y-8">
          {Object.entries(grouped).map(([categoryName, categoryPrompts]) => (
            <div key={categoryName}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {categoryName}
                <Badge variant="secondary">{categoryPrompts.length}</Badge>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryPrompts.map((prompt) => {
                  const s = stats[prompt.id];
                  const hasResponses = s && s.responseCount > 0;

                  return (
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
                            {hasResponses ? (
                              <>
                                <MessageSquare className="h-3 w-3" />
                                <span>
                                  {s.modelCount} model{s.modelCount !== 1 ? "s" : ""} ·{" "}
                                  {s.responseCount} response{s.responseCount !== 1 ? "s" : ""}
                                </span>
                                {s.evaluationPct > 0 && (
                                  <>
                                    <span>·</span>
                                    <span
                                      className={
                                        s.evaluationPct === 100
                                          ? "text-green-600"
                                          : "text-yellow-600"
                                      }
                                    >
                                      {s.evaluationPct}% evaluated
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground/50">
                                No responses yet
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
