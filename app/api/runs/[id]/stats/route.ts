import { NextResponse } from "next/server";
import { getRun, getPrompts, getModels } from "@/lib/storage";
import { aggregateRun, exportResultsCSV, exportResultsJSON } from "@/lib/aggregation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format"); // csv, json, or null for aggregation

    const run = await getRun(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const [prompts, models] = await Promise.all([getPrompts(), getModels()]);

    // Filter to only prompts and models in this run
    const runPrompts = prompts.filter((p) => run.promptIds.includes(p.id));
    const runModels = models.filter((m) => run.modelIds.includes(m.id));

    if (format === "csv") {
      const csv = exportResultsCSV(run, runPrompts, runModels);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${run.name.replace(/[^a-z0-9]/gi, "-")}-results.csv"`,
        },
      });
    }

    if (format === "json") {
      const json = exportResultsJSON(run, runPrompts, runModels);
      return new Response(json, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${run.name.replace(/[^a-z0-9]/gi, "-")}-results.json"`,
        },
      });
    }

    // Default: return aggregation object
    const aggregation = aggregateRun(run, runPrompts, runModels);
    return NextResponse.json(aggregation);
  } catch (error) {
    console.error("Error getting run stats:", error);
    return NextResponse.json(
      { error: "Failed to get run stats" },
      { status: 500 }
    );
  }
}
