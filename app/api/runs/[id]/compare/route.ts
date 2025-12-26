import { NextResponse } from "next/server";
import { getRun, saveRun } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { PairwiseComparison } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const run = await getRun(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const { resultAId, resultBId, promptId, winner, rationale } =
      await request.json();

    if (!resultAId || !resultBId || !promptId || !winner) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check results exist
    const resultA = run.results.find((r) => r.id === resultAId);
    const resultB = run.results.find((r) => r.id === resultBId);
    if (!resultA || !resultB) {
      return NextResponse.json(
        { error: "Results not found" },
        { status: 404 }
      );
    }

    // Check for existing comparison
    const existingIndex = run.comparisons.findIndex(
      (c) =>
        c.promptId === promptId &&
        ((c.resultAId === resultAId && c.resultBId === resultBId) ||
          (c.resultAId === resultBId && c.resultBId === resultAId))
    );

    const comparison: PairwiseComparison = {
      id: existingIndex >= 0 ? run.comparisons[existingIndex].id : generateId(),
      resultAId,
      resultBId,
      promptId,
      method: "human",
      winner,
      rationale: rationale || undefined,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      run.comparisons[existingIndex] = comparison;
    } else {
      run.comparisons.push(comparison);
    }

    await saveRun(run);

    return NextResponse.json({ success: true, comparison });
  } catch (error) {
    console.error("Error saving comparison:", error);
    return NextResponse.json(
      { error: "Failed to save comparison" },
      { status: 500 }
    );
  }
}

// GET comparisons for a run
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const run = await getRun(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({ comparisons: run.comparisons });
  } catch (error) {
    console.error("Error fetching comparisons:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparisons" },
      { status: 500 }
    );
  }
}
