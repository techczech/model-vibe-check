import { NextResponse } from "next/server";
import { 
  getPrompt, 
  getRubric, 
  getModel, 
  getSettings,
  saveRubricEvaluation,
  getRuns
} from "@/lib/storage";
import { executePrompt } from "@/lib/providers";
import { buildJudgePrompt, parseJudgeResponse } from "@/lib/llm-judge";
import { generateId } from "@/lib/utils";
import type { RubricEvaluation } from "@/lib/types";
import { getPromptContent, getExpectedAnswer } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { responseId, rubricId, judgeModelId } = body;

    if (!responseId || !rubricId || !judgeModelId) {
      return NextResponse.json(
        { error: "responseId, rubricId, and judgeModelId are required" },
        { status: 400 }
      );
    }

    // Get the rubric
    const rubric = await getRubric(rubricId);
    if (!rubric) {
      return NextResponse.json(
        { error: "Rubric not found" },
        { status: 404 }
      );
    }

    // Get the judge model
    const judgeModel = await getModel(judgeModelId);
    if (!judgeModel) {
      return NextResponse.json(
        { error: "Judge model not found" },
        { status: 404 }
      );
    }

    // Find the response in runs
    const runs = await getRuns();
    let foundResult: { response: string; promptId: string } | null = null;
    
    for (const run of runs) {
      const result = run.results.find((r) => r.id === responseId);
      if (result) {
        foundResult = { response: result.response, promptId: result.promptId };
        break;
      }
    }

    if (!foundResult) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      );
    }

    // Get the original prompt
    const prompt = await getPrompt(foundResult.promptId);
    if (!prompt) {
      return NextResponse.json(
        { error: "Original prompt not found" },
        { status: 404 }
      );
    }

    // Get settings for API keys
    const settings = await getSettings();

    // Build the judge prompt
    const judgePrompt = buildJudgePrompt(
      getPromptContent(prompt),
      foundResult.response,
      rubric,
      getExpectedAnswer(prompt)
    );

    // Execute the judge
    const result = await executePrompt(
      judgePrompt,
      judgeModel,
      [], // No attachments for judge
      settings
    );

    if (result.error) {
      return NextResponse.json(
        { error: `Judge execution failed: ${result.error}` },
        { status: 500 }
      );
    }

    // Parse the judge response
    const parsedEvaluation = parseJudgeResponse(
      result.response,
      responseId,
      rubricId,
      judgeModelId
    );

    if (!parsedEvaluation) {
      return NextResponse.json(
        { 
          error: "Failed to parse judge response",
          rawResponse: result.response 
        },
        { status: 500 }
      );
    }

    // Save the evaluation
    const evaluation: RubricEvaluation = {
      id: generateId(),
      ...parsedEvaluation,
      createdAt: new Date().toISOString(),
    };

    await saveRubricEvaluation(evaluation);

    return NextResponse.json({ 
      evaluation,
      usage: {
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        latencyMs: result.latencyMs,
      }
    });
  } catch (error) {
    console.error("Error running LLM judge:", error);
    return NextResponse.json(
      { error: "Failed to run LLM judge" },
      { status: 500 }
    );
  }
}
