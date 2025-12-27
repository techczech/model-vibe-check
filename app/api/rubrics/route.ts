import { NextResponse } from "next/server";
import { getRubrics, saveRubric, deleteRubric, getPrompts, getRubricEvaluations } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { Rubric } from "@/lib/types";

export async function GET() {
  try {
    const rubrics = await getRubrics();
    return NextResponse.json({ rubrics });
  } catch (error) {
    console.error("Error fetching rubrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch rubrics" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const rubric: Rubric = {
      id: body.id || generateId(),
      name: body.name || "Untitled Rubric",
      description: body.description,
      items: body.items || [],
      allowImpressionScore: body.allowImpressionScore ?? true,
      isDefault: body.isDefault ?? false,
      scope: body.scope || 'global',
      tags: body.tags || [],
      promptIds: body.promptIds || [],
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveRubric(rubric);

    return NextResponse.json({ rubric });
  } catch (error) {
    console.error("Error creating rubric:", error);
    return NextResponse.json(
      { error: "Failed to create rubric" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Rubric ID required" },
        { status: 400 }
      );
    }

    // Check if rubric is a default - can't delete defaults
    const rubrics = await getRubrics();
    const rubric = rubrics.find((r) => r.id === id);
    if (rubric?.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete default rubrics" },
        { status: 400 }
      );
    }

    await deleteRubric(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting rubric:", error);
    return NextResponse.json(
      { error: "Failed to delete rubric" },
      { status: 500 }
    );
  }
}
