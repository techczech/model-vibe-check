import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { LLMJudgeConfig, Settings } from "../types";

export interface LLMJudgeResult {
  overall: number;
  scores: Record<string, number>;
  rationale: string;
}

const DEFAULT_RUBRIC: Record<string, string> = {
  accuracy: "How factually correct is the response?",
  completeness: "Does it address all aspects of the prompt?",
  clarity: "Is the response clear and well-structured?",
  relevance: "Does it stay on topic and avoid tangents?",
};

const SYSTEM_PROMPT = `You are an expert evaluator assessing AI model responses.

Your task is to evaluate a response against specific criteria and provide:
1. A score from 1-10 for each dimension in the rubric
2. An overall score from 1-10
3. A brief rationale explaining your evaluation

Be strict but fair. A score of 7 is "good", 5 is "acceptable", below 5 indicates problems.

Respond ONLY with valid JSON in this exact format:
{
  "scores": {
    "dimension1": 7,
    "dimension2": 8
  },
  "overall": 7,
  "rationale": "Brief explanation of scores"
}`;

export async function evaluateLLMJudge(
  originalPrompt: string,
  response: string,
  config: LLMJudgeConfig | undefined,
  settings: Settings,
  judgeModel?: string
): Promise<LLMJudgeResult> {
  const modelId = judgeModel || settings.defaults.llmJudgeModel;
  const rubric = config?.rubric || DEFAULT_RUBRIC;
  const additionalCriteria = config?.criteria || "";

  // Build the evaluation prompt
  const rubricText = Object.entries(rubric)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join("\n");

  const userPrompt = `## Original Prompt
${originalPrompt}

## Response to Evaluate
${response}

## Evaluation Rubric
${rubricText}
${additionalCriteria ? `\n## Additional Criteria\n${additionalCriteria}` : ""}

Please evaluate the response according to the rubric above.`;

  try {
    // Use OpenAI for judge (most reliable for structured output)
    const openai = createOpenAI({
      apiKey: settings.apiKeys.openai || settings.apiKeys.openrouter,
      baseURL: settings.apiKeys.openai
        ? undefined
        : "https://openrouter.ai/api/v1",
    });

    const result = await generateText({
      model: openai(modelId),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.3, // Lower temp for consistent evaluation
    });

    // Parse the JSON response
    const parsed = parseJudgeResponse(result.text, rubric);
    return parsed;
  } catch (error) {
    console.error("LLM Judge error:", error);
    return {
      overall: 0,
      scores: Object.fromEntries(Object.keys(rubric).map((k) => [k, 0])),
      rationale: `Evaluation failed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

function parseJudgeResponse(
  text: string,
  rubric: Record<string, string>
): LLMJudgeResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and clamp scores
    const scores: Record<string, number> = {};
    for (const key of Object.keys(rubric)) {
      const score = parsed.scores?.[key];
      scores[key] = typeof score === "number" ? Math.min(10, Math.max(1, score)) : 5;
    }

    const overall =
      typeof parsed.overall === "number"
        ? Math.min(10, Math.max(1, parsed.overall))
        : calculateOverall(scores);

    return {
      scores,
      overall,
      rationale: parsed.rationale || "No rationale provided",
    };
  } catch (error) {
    // If parsing fails, return default scores
    const defaultScores = Object.fromEntries(
      Object.keys(rubric).map((k) => [k, 5])
    );
    return {
      scores: defaultScores,
      overall: 5,
      rationale: `Could not parse evaluation: ${text.slice(0, 200)}...`,
    };
  }
}

function calculateOverall(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (values.length === 0) return 5;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

// Pairwise comparison using LLM judge
export async function evaluatePairwise(
  originalPrompt: string,
  responseA: string,
  responseB: string,
  settings: Settings,
  judgeModel?: string
): Promise<{ winner: "a" | "b" | "tie"; confidence: number; rationale: string }> {
  const modelId = judgeModel || settings.defaults.llmJudgeModel;

  const systemPrompt = `You are an expert evaluator comparing two AI responses.

Your task is to determine which response is better overall, considering:
- Accuracy and correctness
- Completeness
- Clarity and presentation
- Relevance to the prompt

Respond ONLY with valid JSON:
{
  "winner": "A" or "B" or "TIE",
  "confidence": 0.5-1.0,
  "rationale": "Brief explanation"
}`;

  // Randomize order to avoid position bias
  const flip = Math.random() > 0.5;
  const [first, second] = flip ? [responseB, responseA] : [responseA, responseB];
  const [labelFirst, labelSecond] = flip ? ["B", "A"] : ["A", "B"];

  const userPrompt = `## Original Prompt
${originalPrompt}

## Response ${labelFirst}
${first}

## Response ${labelSecond}
${second}

Which response is better? Consider all aspects of quality.`;

  try {
    const openai = createOpenAI({
      apiKey: settings.apiKeys.openai || settings.apiKeys.openrouter,
      baseURL: settings.apiKeys.openai
        ? undefined
        : "https://openrouter.ai/api/v1",
    });

    const result = await generateText({
      model: openai(modelId),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);

    // Unflip the winner if we randomized
    let winner: "a" | "b" | "tie";
    if (parsed.winner?.toUpperCase() === "TIE") {
      winner = "tie";
    } else if (parsed.winner?.toUpperCase() === "A") {
      winner = flip ? "b" : "a";
    } else {
      winner = flip ? "a" : "b";
    }

    return {
      winner,
      confidence: Math.min(1, Math.max(0.5, parsed.confidence || 0.7)),
      rationale: parsed.rationale || "No rationale provided",
    };
  } catch (error) {
    return {
      winner: "tie",
      confidence: 0.5,
      rationale: `Comparison failed: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}
