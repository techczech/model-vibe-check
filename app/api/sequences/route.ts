import { NextResponse } from "next/server";
import {
  getSequences,
  saveSequence,
  deleteSequence,
} from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { PromptSequence, PromptStep } from "@/lib/types";

export async function GET() {
  try {
    const sequences = await getSequences();
    return NextResponse.json({ sequences });
  } catch (error) {
    console.error("Error fetching sequences:", error);
    return NextResponse.json(
      { error: "Failed to fetch sequences" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sequenceData = body.sequence || body;

    const now = new Date().toISOString();

    // Ensure steps have proper IDs and sequence numbers
    const steps: PromptStep[] = (sequenceData.steps || []).map(
      (step: Partial<PromptStep>, index: number) => ({
        id: step.id || `step-${index + 1}`,
        sequence: step.sequence || index + 1,
        content: step.content || "",
        expectedAnswer: step.expectedAnswer,
        evaluationConfig: step.evaluationConfig,
      })
    );

    const sequence: PromptSequence = {
      id: sequenceData.id || generateId("seq"),
      title: sequenceData.title,
      description: sequenceData.description,
      category: sequenceData.category || "Other",
      keywords: sequenceData.keywords || [],
      steps,
      evaluationConfig: sequenceData.evaluationConfig || {
        methods: ["human"],
      },
      createdAt: sequenceData.createdAt || now,
      updatedAt: now,
    };

    await saveSequence(sequence);
    return NextResponse.json({ success: true, sequence });
  } catch (error) {
    console.error("Error saving sequence:", error);
    return NextResponse.json(
      { error: "Failed to save sequence" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const sequenceData = body.sequence || body;

    if (!sequenceData.id) {
      return NextResponse.json(
        { error: "Missing sequence ID" },
        { status: 400 }
      );
    }

    // Get existing sequence to preserve createdAt
    const existingSequences = await getSequences();
    const existing = existingSequences.find((s) => s.id === sequenceData.id);

    const now = new Date().toISOString();

    // Ensure steps have proper IDs and sequence numbers
    const steps: PromptStep[] = (sequenceData.steps || []).map(
      (step: Partial<PromptStep>, index: number) => ({
        id: step.id || `step-${index + 1}`,
        sequence: step.sequence || index + 1,
        content: step.content || "",
        expectedAnswer: step.expectedAnswer,
        evaluationConfig: step.evaluationConfig,
      })
    );

    const sequence: PromptSequence = {
      id: sequenceData.id,
      title: sequenceData.title,
      description: sequenceData.description,
      category: sequenceData.category || "Other",
      keywords: sequenceData.keywords || [],
      steps,
      evaluationConfig: sequenceData.evaluationConfig || {
        methods: ["human"],
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await saveSequence(sequence);
    return NextResponse.json({ success: true, sequence });
  } catch (error) {
    console.error("Error updating sequence:", error);
    return NextResponse.json(
      { error: "Failed to update sequence" },
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
        { error: "Missing sequence ID" },
        { status: 400 }
      );
    }

    await deleteSequence(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sequence:", error);
    return NextResponse.json(
      { error: "Failed to delete sequence" },
      { status: 500 }
    );
  }
}
