import Link from "next/link";
import { getRuns, getPrompts, getModels } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RunsListClient } from "@/components/runs-list-client";

export default async function RunsPage() {
  const [runs, prompts, models] = await Promise.all([
    getRuns(),
    getPrompts(),
    getModels(),
  ]);

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

      {/* Runs List with Filters */}
      <RunsListClient runs={runs} prompts={prompts} models={models} />
    </div>
  );
}
