import { NextResponse } from "next/server";
import { getRubrics, getPrompts, getRubricEvaluations } from "@/lib/storage";

export interface RubricUsageStats {
  rubricId: string;
  promptCount: number;
  evaluationCount: number;
  humanEvaluationCount: number;
  llmEvaluationCount: number;
}

export async function GET() {
  try {
    const [rubrics, prompts, evaluations] = await Promise.all([
      getRubrics(),
      getPrompts(),
      getRubricEvaluations(),
    ]);

    const usage: Record<string, RubricUsageStats> = {};

    // Initialize stats for all rubrics
    for (const rubric of rubrics) {
      usage[rubric.id] = {
        rubricId: rubric.id,
        promptCount: 0,
        evaluationCount: 0,
        humanEvaluationCount: 0,
        llmEvaluationCount: 0,
      };
    }

    // Count prompts using each rubric
    for (const prompt of prompts) {
      if (prompt.rubricId && usage[prompt.rubricId]) {
        usage[prompt.rubricId].promptCount++;
      }
    }

    // Count evaluations using each rubric
    for (const evaluation of evaluations) {
      if (usage[evaluation.rubricId]) {
        usage[evaluation.rubricId].evaluationCount++;
        if (evaluation.evaluatorType === 'human') {
          usage[evaluation.rubricId].humanEvaluationCount++;
        } else {
          usage[evaluation.rubricId].llmEvaluationCount++;
        }
      }
    }

    return NextResponse.json({ usage });
  } catch (error) {
    console.error("Error fetching rubric usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch rubric usage" },
      { status: 500 }
    );
  }
}
