import { NextResponse } from "next/server";
import { getRuns, saveRun } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { Run } from "@/lib/types";

export async function GET() {
  try {
    const runs = await getRuns();
    return NextResponse.json({ runs });
  } catch (error) {
    console.error("Error fetching runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch runs" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const run: Run = {
      id: generateId(),
      name: body.name || `Run ${new Date().toISOString()}`,
      promptIds: body.promptIds || [],
      modelIds: body.modelIds || [],
      iterations: body.iterations || 1,
      status: "pending",
      createdAt: new Date().toISOString(),
      results: [],
      evaluations: [],
      comparisons: [],
    };

    await saveRun(run);
    return NextResponse.json({ success: true, run });
  } catch (error) {
    console.error("Error creating run:", error);
    return NextResponse.json(
      { error: "Failed to create run" },
      { status: 500 }
    );
  }
}
