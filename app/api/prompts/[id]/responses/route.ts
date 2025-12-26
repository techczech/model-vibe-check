import { NextResponse } from "next/server";
import { getResultsForPrompt } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  try {
    const { results, evaluations } = await getResultsForPrompt(id);

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
