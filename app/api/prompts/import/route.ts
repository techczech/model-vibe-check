import { NextRequest, NextResponse } from "next/server";
import { getPrompts, savePrompts } from "@/lib/storage";
import type { Prompt } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { prompts: newPrompts } = await request.json();

    if (!Array.isArray(newPrompts)) {
      return NextResponse.json(
        { error: "prompts must be an array" },
        { status: 400 }
      );
    }

    const existingPrompts = await getPrompts();
    const existingIds = new Set(existingPrompts.map((p) => p.id));

    const now = new Date().toISOString();
    const toAdd: Prompt[] = [];

    for (const p of newPrompts) {
      // Generate new ID if collision or missing
      const id = p.id && !existingIds.has(p.id) 
        ? p.id 
        : crypto.randomUUID();

      // Convert old format (content) to new format (steps)
      // If steps already provided, use them; otherwise convert content to single step
      const steps = p.steps || [{
        id: "step-1",
        sequence: 1,
        content: p.content || "",
        expectedAnswer: p.expectedAnswer,
      }];

      toAdd.push({
        id,
        title: p.title,
        category: p.category || "Uncategorized",
        keywords: p.keywords || [],
        description: p.description || "",
        steps,
        // Keep deprecated fields for backward compat
        content: p.content,
        expectedAnswer: p.expectedAnswer || "",
        attachments: (p.attachments || []).map((a: any) => ({
          id: a.id || crypto.randomUUID(),
          type: a.type || "text",
          filename: a.filename || a.name || "attachment",
          path: a.path || "",
          mimeType: a.mimeType || "text/plain",
          sizeBytes: a.sizeBytes,
        })),
        evaluationConfig: {
          methods: p.evaluationConfig?.methods || ["human", "llm-judge"],
          machineJudge: p.evaluationConfig?.machineJudge,
          llmJudge: p.evaluationConfig?.llmJudge,
          pairwise: p.evaluationConfig?.pairwise,
        },
        createdAt: now,
        updatedAt: now,
      });
    }

    const merged = [...existingPrompts, ...toAdd];
    await savePrompts(merged);

    return NextResponse.json({
      success: true,
      imported: toAdd.length,
      total: merged.length,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Import failed" },
      { status: 500 }
    );
  }
}
