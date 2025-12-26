import { NextResponse } from "next/server";
import { getRun, saveRun } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { Evaluation } from "@/lib/types";

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

    const { resultId, score, notes } = await request.json();

    if (!resultId) {
      return NextResponse.json(
        { error: "resultId is required" },
        { status: 400 }
      );
    }

    // Check result exists
    const result = run.results.find((r) => r.id === resultId);
    if (!result) {
      return NextResponse.json(
        { error: "Result not found" },
        { status: 404 }
      );
    }

    // Check for existing human evaluation
    const existingIndex = run.evaluations.findIndex(
      (e) => e.resultId === resultId && e.method === "human"
    );

    const evaluation: Evaluation = {
      id: existingIndex >= 0 ? run.evaluations[existingIndex].id : generateId(),
      resultId,
      method: "human",
      humanScore: score,
      humanNotes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing
      run.evaluations[existingIndex] = evaluation;
    } else {
      // Add new
      run.evaluations.push(evaluation);
    }

    await saveRun(run);

    return NextResponse.json({ success: true, evaluation });
  } catch (error) {
    console.error("Error saving evaluation:", error);
    return NextResponse.json(
      { error: "Failed to save evaluation" },
      { status: 500 }
    );
  }
}

// GET evaluations for a run
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

    // Filter to human evaluations only
    const humanEvaluations = run.evaluations.filter((e) => e.method === "human");

    return NextResponse.json({ evaluations: humanEvaluations });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}
