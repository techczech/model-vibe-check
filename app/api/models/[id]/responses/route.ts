import { NextResponse } from "next/server";
import { getResultsForModel } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { results, evaluations } = await getResultsForModel(id);

    return NextResponse.json({
      results,
      evaluations,
    });
  } catch (error) {
    console.error("Error fetching responses:", error);
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    );
  }
}
