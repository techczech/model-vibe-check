import { NextResponse } from "next/server";
import { 
  getRubricEvaluations, 
  saveRubricEvaluation,
  getEvaluationsForResponse 
} from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { RubricEvaluation } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get("responseId");
    
    if (responseId) {
      const evaluations = await getEvaluationsForResponse(responseId);
      return NextResponse.json({ evaluations });
    }
    
    const evaluations = await getRubricEvaluations();
    return NextResponse.json({ evaluations });
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.responseId || !body.rubricId) {
      return NextResponse.json(
        { error: "responseId and rubricId are required" },
        { status: 400 }
      );
    }

    const evaluation: RubricEvaluation = {
      id: generateId(),
      responseId: body.responseId,
      rubricId: body.rubricId,
      evaluatorType: body.evaluatorType || "human",
      evaluatorId: body.evaluatorId,
      scores: body.scores || {},
      impressionScore: body.impressionScore,
      reasoning: body.reasoning,
      createdAt: new Date().toISOString(),
    };

    await saveRubricEvaluation(evaluation);

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error("Error creating evaluation:", error);
    return NextResponse.json(
      { error: "Failed to create evaluation" },
      { status: 500 }
    );
  }
}
