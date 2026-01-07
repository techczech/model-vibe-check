"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { PromptSequence } from "@/lib/types";

export default function SequencesPage() {
  const [sequences, setSequences] = useState<PromptSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadSequences();
  }, []);

  async function loadSequences() {
    try {
      const res = await fetch("/api/sequences");
      const data = await res.json();
      setSequences(data.sequences || []);
    } catch (error) {
      console.error("Failed to load sequences:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSequence(id: string) {
    if (!confirm("Delete this sequence? This cannot be undone.")) return;

    setDeleting(id);
    try {
      await fetch(`/api/sequences?id=${id}`, { method: "DELETE" });
      setSequences(sequences.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete sequence:", error);
    } finally {
      setDeleting(null);
    }
  }

  const filteredSequences = sequences.filter((seq) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      seq.title.toLowerCase().includes(query) ||
      seq.category.toLowerCase().includes(query) ||
      seq.keywords.some((k) => k.toLowerCase().includes(query)) ||
      seq.description?.toLowerCase().includes(query)
    );
  });

  // Group by category
  const byCategory = filteredSequences.reduce((acc, seq) => {
    if (!acc[seq.category]) acc[seq.category] = [];
    acc[seq.category].push(seq);
    return acc;
  }, {} as Record<string, PromptSequence[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sequences</h1>
          <p className="text-muted-foreground">
            Multi-turn conversations for testing context retention
          </p>
        </div>
        <Link href="/sequences/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Sequence
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sequences..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty state */}
      {sequences.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No sequences yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Create multi-turn conversation sequences to test how models
              maintain context across multiple exchanges.
            </p>
            <Link href="/sequences/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Sequence
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Sequences by category */}
      {Object.entries(byCategory).map(([category, seqs]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {category}
            <Badge variant="secondary" className="text-xs">
              {seqs.length}
            </Badge>
          </h2>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {seqs.map((seq) => (
              <Card
                key={seq.id}
                className="hover:border-primary/50 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">
                      {seq.title}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Link href={`/sequences/${seq.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteSequence(seq.id)}
                        disabled={deleting === seq.id}
                      >
                        {deleting === seq.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {seq.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {seq.description}
                    </p>
                  )}

                  {/* Steps preview */}
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      {seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Step previews */}
                  <div className="space-y-1">
                    {seq.steps.slice(0, 3).map((step, i) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <span className="w-4 text-center">{i + 1}.</span>
                        <span className="truncate">{step.content}</span>
                      </div>
                    ))}
                    {seq.steps.length > 3 && (
                      <div className="text-xs text-muted-foreground pl-6">
                        +{seq.steps.length - 3} more steps...
                      </div>
                    )}
                  </div>

                  {/* Keywords */}
                  {seq.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {seq.keywords.slice(0, 3).map((keyword) => (
                        <Badge key={keyword} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {seq.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{seq.keywords.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                    <span>{formatDate(seq.createdAt)}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* No results */}
      {filteredSequences.length === 0 && sequences.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">
              No sequences match &quot;{searchQuery}&quot;
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
