import { NextResponse } from "next/server";
import { getPrompts, savePrompts, savePrompt, deletePrompt } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { Prompt } from "@/lib/types";

export async function GET() {
  try {
    const prompts = await getPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Handle bulk import
    if (body.prompts && Array.isArray(body.prompts)) {
      await savePrompts(body.prompts);
      return NextResponse.json({
        success: true,
        count: body.prompts.length,
      });
    }

    // Handle single prompt creation (from edit page)
    const promptData = body.prompt || body;
    
    const now = new Date().toISOString();
    const prompt: Prompt = {
      id: promptData.id || generateId(),
      title: promptData.title,
      category: promptData.category || "Other",
      keywords: promptData.keywords || [],
      description: promptData.description,
      content: promptData.content,
      expectedAnswer: promptData.expectedAnswer,
      attachments: promptData.attachments || [],
      evaluationConfig: promptData.evaluationConfig || {
        methods: ["human"],
      },
      createdAt: promptData.createdAt || now,
      updatedAt: now,
    };

    await savePrompt(prompt);
    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    console.error("Error saving prompts:", error);
    return NextResponse.json(
      { error: "Failed to save prompts" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const promptData = body.prompt || body;

    if (!promptData.id) {
      return NextResponse.json(
        { error: "Missing prompt ID" },
        { status: 400 }
      );
    }

    // Get existing prompt to preserve createdAt
    const existingPrompts = await getPrompts();
    const existing = existingPrompts.find((p) => p.id === promptData.id);

    const now = new Date().toISOString();
    const prompt: Prompt = {
      id: promptData.id,
      title: promptData.title,
      category: promptData.category || "Other",
      keywords: promptData.keywords || [],
      description: promptData.description,
      content: promptData.content,
      expectedAnswer: promptData.expectedAnswer,
      attachments: promptData.attachments || [],
      evaluationConfig: promptData.evaluationConfig || {
        methods: ["human"],
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await savePrompt(prompt);
    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    console.error("Error updating prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
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
        { error: "Missing prompt ID" },
        { status: 400 }
      );
    }

    await deletePrompt(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
