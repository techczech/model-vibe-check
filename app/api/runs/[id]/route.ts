import { NextResponse } from "next/server";
import { getRun, saveRun, deleteRun } from "@/lib/storage";

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

    // Detect orphaned cancelled runs: if status is "running" but cancelRequested is true,
    // the execution loop died before marking as cancelled (e.g., server restart)
    if (run.status === "running" && run.cancelRequested) {
      run.status = "cancelled";
      run.completedAt = run.cancelledAt || new Date().toISOString();
      await saveRun(run);
    }

    return NextResponse.json({ run });
  } catch (error) {
    console.error("Error fetching run:", error);
    return NextResponse.json(
      { error: "Failed to fetch run" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const run = await getRun(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const updates = await request.json();
    const updatedRun = { ...run, ...updates };
    await saveRun(updatedRun);

    return NextResponse.json({ run: updatedRun });
  } catch (error) {
    console.error("Error updating run:", error);
    return NextResponse.json(
      { error: "Failed to update run" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deleteRun(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting run:", error);
    return NextResponse.json(
      { error: "Failed to delete run" },
      { status: 500 }
    );
  }
}
