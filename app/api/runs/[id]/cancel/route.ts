import { NextResponse } from "next/server";
import { getRun, saveRun } from "@/lib/storage";

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

    if (run.status !== "running") {
      return NextResponse.json(
        { error: "Can only cancel running runs" },
        { status: 400 }
      );
    }

    // Set cancellation flag - the execution loop will check this
    run.cancelRequested = true;
    run.cancelledAt = new Date().toISOString();
    await saveRun(run);

    return NextResponse.json({
      success: true,
      message: "Cancellation requested. In-flight requests will complete.",
    });
  } catch (error) {
    console.error("Error cancelling run:", error);
    return NextResponse.json(
      { error: "Failed to cancel run" },
      { status: 500 }
    );
  }
}
