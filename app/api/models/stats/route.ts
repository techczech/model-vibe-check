import { NextResponse } from "next/server";
import { getModels, getModelsWithStats } from "@/lib/storage";

export async function GET() {
  try {
    const [models, stats] = await Promise.all([
      getModels(),
      getModelsWithStats(),
    ]);

    return NextResponse.json({ models, stats });
  } catch (error) {
    console.error("Failed to get model stats:", error);
    return NextResponse.json(
      { error: "Failed to get model stats" },
      { status: 500 }
    );
  }
}
