import type { Rubric, RubricItem, RubricEvaluation } from "./types";

/**
 * Build a prompt for an LLM to evaluate a response using a rubric
 */
export function buildJudgePrompt(
  originalPrompt: string,
  response: string,
  rubric: Rubric,
  expectedAnswer?: string
): string {
  const rubricDescription = rubric.items
    .map((item) => formatRubricItem(item))
    .join("\n\n");

  return `You are an expert evaluator assessing the quality of an AI-generated response.

## Original Prompt
${originalPrompt}

${expectedAnswer ? `## Expected Answer\n${expectedAnswer}\n` : ""}
## Response to Evaluate
${response}

## Evaluation Rubric: ${rubric.name}
${rubric.description ? `${rubric.description}\n` : ""}
${rubricDescription}

## Instructions
Evaluate the response according to each rubric item. For each item, provide:
1. Your assessment (following the item's scale/format)
2. A brief explanation of your reasoning

${rubric.allowImpressionScore ? `Also provide an overall impression score from 1-10, where:
- 1-3: Poor quality, major issues
- 4-5: Below average, significant room for improvement
- 6-7: Acceptable, meets basic requirements
- 8-9: Good quality, exceeds expectations
- 10: Excellent, exemplary response\n` : ""}
Respond in JSON format with the following structure:
{
  "scores": {
    "<item_id>": {
      "value": <assessment_value>,
      "confidence": <0.0-1.0>,
      "note": "<brief explanation>"
    }
  },
  ${rubric.allowImpressionScore ? `"impressionScore": <1-10>,` : ""}
  "reasoning": "<overall evaluation summary>"
}

Assessment value types by rubric item:
${rubric.items.map((item) => `- "${item.id}": ${getValueTypeDescription(item)}`).join("\n")}
`;
}

function formatRubricItem(item: RubricItem): string {
  let description = `### ${item.label}`;
  if (item.description) {
    description += `\n${item.description}`;
  }

  switch (item.type) {
    case "binary":
      description += `\nAssess as: true (yes) or false (no)`;
      break;
    case "scale":
      if (item.scaleLabels) {
        description += `\nScale (0-${item.scaleLabels.length - 1}):`;
        item.scaleLabels.forEach((label, i) => {
          description += `\n  ${i}: ${label}`;
        });
      }
      break;
    case "checklist":
      if (item.checklistItems) {
        description += `\nCheck which items are present:`;
        item.checklistItems.forEach((checkItem, i) => {
          description += `\n  ${i}: ${checkItem}`;
        });
        description += `\nProvide array of indices for items that are present.`;
      }
      break;
  }

  return description;
}

function getValueTypeDescription(item: RubricItem): string {
  switch (item.type) {
    case "binary":
      return "boolean (true/false)";
    case "scale":
      return item.scaleLabels
        ? `integer 0-${item.scaleLabels.length - 1}`
        : "integer";
    case "checklist":
      return "array of integers (indices of checked items)";
  }
}

/**
 * Parse LLM judge response into a RubricEvaluation
 */
export function parseJudgeResponse(
  jsonResponse: string,
  responseId: string,
  rubricId: string,
  judgeModelId: string
): Omit<RubricEvaluation, "id" | "createdAt"> | null {
  try {
    // Try to extract JSON from the response
    let parsed: any;
    
    // Look for JSON block
    const jsonMatch = jsonResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      // Try parsing the whole response
      const trimmed = jsonResponse.trim();
      // Find the first { and last }
      const start = trimmed.indexOf("{");
      const end = trimmed.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(trimmed.slice(start, end + 1));
      } else {
        console.error("No JSON found in judge response");
        return null;
      }
    }

    return {
      responseId,
      rubricId,
      evaluatorType: "llm",
      evaluatorId: judgeModelId,
      scores: parsed.scores || {},
      impressionScore: parsed.impressionScore,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error("Failed to parse judge response:", error);
    return null;
  }
}

/**
 * Calculate a normalized score from a rubric evaluation
 * Returns a value between 0 and 1
 */
export function calculateNormalizedScore(
  evaluation: RubricEvaluation,
  rubric: Rubric
): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const item of rubric.items) {
    const score = evaluation.scores[item.id];
    if (!score) continue;

    const weight = item.weight || 1;
    let normalized: number;

    switch (item.type) {
      case "binary":
        normalized = score.value === true ? 1 : 0;
        break;
      case "scale":
        const maxScale = (item.scaleLabels?.length || 4) - 1;
        normalized = (score.value as number) / maxScale;
        break;
      case "checklist":
        const checked = (score.value as number[]).length;
        const total = item.checklistItems?.length || 1;
        normalized = checked / total;
        break;
      default:
        normalized = 0;
    }

    totalScore += normalized * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}
