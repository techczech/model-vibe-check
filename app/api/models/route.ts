import { NextResponse } from "next/server";
import { getModels, saveModels } from "@/lib/storage";

export async function GET() {
  try {
    const models = await getModels();
    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await saveModels(body.models);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving models:", error);
    return NextResponse.json(
      { error: "Failed to save models" },
      { status: 500 }
    );
  }
}
