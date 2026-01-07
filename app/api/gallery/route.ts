import { NextResponse } from "next/server";
import { getGallerySelections, saveGallerySelections } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { GallerySelectionType } from "@/lib/types";

function buildSelectionKey(
  type: GallerySelectionType,
  runId: string,
  promptId?: string,
  responseId?: string
): string {
  return [type, runId, promptId || "", responseId || ""].join(":");
}

export async function GET() {
  const selections = await getGallerySelections();
  return NextResponse.json({ selections });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = body.type as GallerySelectionType | undefined;
    const runId = body.runId as string | undefined;
    const promptId = body.promptId as string | undefined;
    const responseId = body.responseId as string | undefined;
    const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;

    if (!type || !runId) {
      return NextResponse.json(
        { error: "Missing type or runId" },
        { status: 400 }
      );
    }

    if (type === "prompt" && !promptId) {
      return NextResponse.json(
        { error: "Missing promptId for prompt selection" },
        { status: 400 }
      );
    }

    if (type === "response" && !responseId) {
      return NextResponse.json(
        { error: "Missing responseId for response selection" },
        { status: 400 }
      );
    }

    const selections = await getGallerySelections();
    const key = buildSelectionKey(type, runId, promptId, responseId);
    const existingIndex = selections.findIndex((s) => s.key === key);

    const shouldEnable = enabled ?? existingIndex === -1;
    if (shouldEnable && existingIndex === -1) {
      selections.push({
        id: generateId("gallery"),
        key,
        type,
        runId,
        promptId,
        responseId,
        createdAt: new Date().toISOString(),
      });
    } else if (!shouldEnable && existingIndex !== -1) {
      selections.splice(existingIndex, 1);
    }

    await saveGallerySelections(selections);

    return NextResponse.json({
      selections,
      selection: selections.find((s) => s.key === key) || null,
    });
  } catch (error) {
    console.error("Gallery update error:", error);
    return NextResponse.json(
      { error: "Failed to update gallery selection" },
      { status: 500 }
    );
  }
}
