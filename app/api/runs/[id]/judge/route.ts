import { NextResponse } from "next/server";
import { getRun, saveRun, getPrompt, getRuntimeSettings } from "@/lib/storage";
import { evaluateLLMJudge } from "@/lib/evaluation";
import { generateId } from "@/lib/utils";
import type { Evaluation } from "@/lib/types";
import { getPromptContent } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const run = await getRun(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const settings = await getRuntimeSettings();
    const body = await request.json().catch(() => ({}));
    const judgeModel = body.judgeModel || settings.defaults.llmJudgeModel;

    // Find results that need LLM judging
    const resultsToJudge = run.results.filter((r) => {
      if (r.error) return false;
      
      // Check if already has LLM evaluation
      const hasLLMEval = run.evaluations.some(
        (e) => e.resultId === r.id && e.method === "llm-judge"
      );
      
      return !hasLLMEval;
    });

    if (resultsToJudge.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All results already judged",
        judged: 0,
      });
    }

    let judged = 0;
    const errors: string[] = [];

    for (const result of resultsToJudge) {
      try {
        const prompt = await getPrompt(result.promptId);
        if (!prompt) continue;

        // Only judge if prompt has llm-judge method configured
        if (!prompt.evaluationConfig.methods.includes("llm-judge")) {
          continue;
        }

        const llmResult = await evaluateLLMJudge(
          getPromptContent(prompt),
          result.response,
          prompt.evaluationConfig.llmJudge,
          settings,
          judgeModel
        );

        const evaluation: Evaluation = {
          id: generateId(),
          resultId: result.id,
          method: "llm-judge",
          llmJudgeModel: judgeModel,
          llmScores: llmResult.scores,
          llmOverall: llmResult.overall,
          llmRationale: llmResult.rationale,
          createdAt: new Date().toISOString(),
        };

        run.evaluations.push(evaluation);
        judged++;

        // Save periodically
        if (judged % 3 === 0) {
          await saveRun(run);
        }
      } catch (error) {
        errors.push(
          `Result ${result.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    await saveRun(run);

    return NextResponse.json({
      success: true,
      judged,
      total: resultsToJudge.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Judge error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Judging failed" },
      { status: 500 }
    );
  }
}

// GET to check judge status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const run = await getRun(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const llmEvaluations = run.evaluations.filter((e) => e.method === "llm-judge");
    const resultsNeedingJudge = run.results.filter((r) => {
      if (r.error) return false;
      return !llmEvaluations.some((e) => e.resultId === r.id);
    });

    return NextResponse.json({
      judged: llmEvaluations.length,
      remaining: resultsNeedingJudge.length,
      total: run.results.filter((r) => !r.error).length,
    });
  } catch (error) {
    console.error("Error fetching judge status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
