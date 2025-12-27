import Link from "next/link";
import { getPrompts, getCategories, getPromptsWithStats } from "@/lib/storage";
import { PromptsListClient } from "@/components/prompts-list-client";

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    category?: string; 
    q?: string;
    filter?: 'all' | 'has-responses' | 'needs-evaluation';
    view?: 'grid' | 'table';
    sort?: string;
    order?: 'asc' | 'desc';
  }>;
}) {
  const params = await searchParams;
  const [prompts, categories, stats] = await Promise.all([
    getPrompts(),
    getCategories(),
    getPromptsWithStats(),
  ]);

  return (
    <PromptsListClient
      prompts={prompts}
      categories={categories}
      stats={stats}
      initialParams={params}
    />
  );
}
