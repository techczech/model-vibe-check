/**
 * Response Viewer Utilities
 * 
 * Helper functions for transforming data to ResponseViewer format.
 */

import type {
  ViewerResponse,
  ViewerPrompt,
  Model,
  Prompt,
  Run,
  Result,
  Evaluation,
  Provider
} from './types';
import { getPromptContent, getExpectedAnswer } from './types';
import { getModelMetadata } from './model-metadata';

interface TransformOptions {
  models: Model[];
  prompts: Prompt[];
  runs: Run[];
  evaluations?: Array<{ responseId: string; impressionScore?: number }>;
}

/**
 * Transform a prompt to ViewerPrompt format
 */
export function toViewerPrompt(prompt: Prompt): ViewerPrompt {
  const content = getPromptContent(prompt);
  // Rough token estimate: ~4 chars per token
  const tokensEstimate = Math.ceil(content.length / 4);

  return {
    id: prompt.id,
    title: prompt.title,
    content,
    steps: prompt.steps,
    expectedAnswer: getExpectedAnswer(prompt),
    tokensEstimate,
    category: prompt.category,
  };
}

/**
 * Transform a result to ViewerResponse format
 */
export function toViewerResponse(
  result: Result,
  model: Model | undefined,
  run: Run,
  evaluation?: Evaluation | { impressionScore?: number },
  totalIterations: number = 1,
  prompt?: Prompt
): ViewerResponse {
  // Get auto-detected metadata if not set on model
  const autoMetadata = model 
    ? getModelMetadata(model.modelId, model.provider)
    : getModelMetadata(result.modelId);

  return {
    id: result.id,
    content: result.response,
    
    // Model info
    modelId: result.modelId,
    modelName: model?.displayName || result.modelId,
    provider: (model?.provider || 'openai') as Provider,
    sizeClass: model?.sizeClass || autoMetadata.sizeClass,
    reasoningCapability: model?.reasoningCapability || autoMetadata.reasoningCapability,
    contextWindow: model?.contextWindow || autoMetadata.contextWindow,
    parameters: model?.parameters || autoMetadata.parameters,
    
    // Prompt info (for cross-prompt views)
    promptId: result.promptId,
    promptTitle: prompt?.title,
    promptCategory: prompt?.category,
    
    // Generation info
    reasoningUsed: result.reasoningUsed,
    tokensInput: result.tokensInput,
    tokensOutput: result.tokensOutput,
    latencyMs: result.latencyMs,
    costUsd: result.costUsd,
    temperature: model?.config?.temperature,
    
    // Run info
    iteration: result.iteration,
    totalIterations,
    runId: run.id,
    runDate: result.createdAt || run.createdAt,
    
    // Evaluation info
    evaluated: !!evaluation,
    score: 'humanScore' in (evaluation || {}) 
      ? (evaluation as Evaluation).humanScore 
      : 'impressionScore' in (evaluation || {})
        ? (evaluation as { impressionScore?: number }).impressionScore
        : (evaluation as Evaluation)?.llmOverall,
    evaluationMethod: evaluation && 'method' in evaluation 
      ? (evaluation as Evaluation).method 
      : undefined,
  };
}

/**
 * Get all responses for a prompt across all runs
 */
export function getResponsesForPrompt(
  promptId: string,
  options: TransformOptions
): ViewerResponse[] {
  const { models, runs, evaluations = [] } = options;
  const modelMap = new Map(models.map(m => [m.id, m]));
  
  const responses: ViewerResponse[] = [];
  
  for (const run of runs) {
    // Count iterations for this prompt in this run
    const resultsForPrompt = run.results.filter(r => r.promptId === promptId);
    const iterationsByModel = new Map<string, number>();
    
    for (const result of resultsForPrompt) {
      iterationsByModel.set(
        result.modelId, 
        (iterationsByModel.get(result.modelId) || 0) + 1
      );
    }
    
    for (const result of resultsForPrompt) {
      const model = modelMap.get(result.modelId);
      const evaluation = run.evaluations.find(e => e.resultId === result.id)
        || evaluations.find(e => e.responseId === result.id);
      const totalIterations = iterationsByModel.get(result.modelId) || 1;
      
      responses.push(toViewerResponse(result, model, run, evaluation, totalIterations));
    }
  }
  
  // Sort by model name, then by date (newest first)
  responses.sort((a, b) => {
    if (a.modelName !== b.modelName) {
      return a.modelName.localeCompare(b.modelName);
    }
    return new Date(b.runDate).getTime() - new Date(a.runDate).getTime();
  });
  
  return responses;
}

/**
 * Get all responses for a model across all runs
 */
export function getResponsesForModel(
  modelId: string,
  options: TransformOptions
): ViewerResponse[] {
  const { models, prompts, runs, evaluations = [] } = options;
  const model = models.find(m => m.id === modelId);
  const promptMap = new Map(prompts.map(p => [p.id, p]));
  
  const responses: ViewerResponse[] = [];
  
  for (const run of runs) {
    const resultsForModel = run.results.filter(r => r.modelId === modelId);
    
    // Count iterations for each prompt
    const iterationsByPrompt = new Map<string, number>();
    for (const result of resultsForModel) {
      iterationsByPrompt.set(
        result.promptId, 
        (iterationsByPrompt.get(result.promptId) || 0) + 1
      );
    }
    
    for (const result of resultsForModel) {
      const evaluation = run.evaluations.find(e => e.resultId === result.id)
        || evaluations.find(e => e.responseId === result.id);
      const totalIterations = iterationsByPrompt.get(result.promptId) || 1;
      const prompt = promptMap.get(result.promptId);
      
      responses.push(toViewerResponse(result, model, run, evaluation, totalIterations, prompt));
    }
  }
  
  // Sort by date (newest first)
  responses.sort((a, b) => 
    new Date(b.runDate).getTime() - new Date(a.runDate).getTime()
  );
  
  return responses;
}

/**
 * Get unevaluated responses for blind review
 */
export function getUnevaluatedResponses(
  options: TransformOptions
): ViewerResponse[] {
  const { models, runs, evaluations = [] } = options;
  const modelMap = new Map(models.map(m => [m.id, m]));
  
  // Build set of evaluated result IDs
  const evaluatedIds = new Set<string>();
  for (const run of runs) {
    for (const e of run.evaluations) {
      evaluatedIds.add(e.resultId);
    }
  }
  for (const e of evaluations) {
    evaluatedIds.add(e.responseId);
  }
  
  const responses: ViewerResponse[] = [];
  
  for (const run of runs) {
    for (const result of run.results) {
      if (evaluatedIds.has(result.id)) continue;
      
      const model = modelMap.get(result.modelId);
      responses.push(toViewerResponse(result, model, run, undefined, 1));
    }
  }
  
  // Shuffle for blind review
  for (let i = responses.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [responses[i], responses[j]] = [responses[j], responses[i]];
  }
  
  return responses;
}

/**
 * Group responses by iteration for comparison
 */
export function groupResponsesByIteration(
  responses: ViewerResponse[]
): Map<number, ViewerResponse[]> {
  const groups = new Map<number, ViewerResponse[]>();
  
  for (const response of responses) {
    const iteration = response.iteration;
    if (!groups.has(iteration)) {
      groups.set(iteration, []);
    }
    groups.get(iteration)!.push(response);
  }
  
  return groups;
}

/**
 * Get the latest response for each model
 */
export function getLatestResponsePerModel(
  responses: ViewerResponse[]
): ViewerResponse[] {
  const latestByModel = new Map<string, ViewerResponse>();

  for (const response of responses) {
    const existing = latestByModel.get(response.modelId);
    if (!existing || new Date(response.runDate) > new Date(existing.runDate)) {
      latestByModel.set(response.modelId, response);
    }
  }

  return Array.from(latestByModel.values());
}

/**
 * Model group with iterations for side-by-side display
 */
export interface ModelIterationGroup {
  modelId: string;
  modelName: string;
  provider: Provider;
  iterations: ViewerResponse[];
}

/**
 * Group responses by model with iterations sorted for side-by-side comparison
 * Returns an array of models, each with their iterations in order
 */
export function groupResponsesByModelWithIterations(
  responses: ViewerResponse[]
): ModelIterationGroup[] {
  const groupMap = new Map<string, ModelIterationGroup>();

  for (const response of responses) {
    let group = groupMap.get(response.modelId);
    if (!group) {
      group = {
        modelId: response.modelId,
        modelName: response.modelName,
        provider: response.provider,
        iterations: [],
      };
      groupMap.set(response.modelId, group);
    }
    group.iterations.push(response);
  }

  // Sort iterations within each group by iteration number
  for (const group of groupMap.values()) {
    group.iterations.sort((a, b) => a.iteration - b.iteration);
  }

  // Return groups sorted by model name
  return Array.from(groupMap.values()).sort((a, b) =>
    a.modelName.localeCompare(b.modelName)
  );
}

/**
 * Check if responses contain multiple iterations (for showing toggle)
 */
export function hasMultipleIterations(responses: ViewerResponse[]): boolean {
  if (responses.length === 0) return false;

  // Check if any response has totalIterations > 1
  // OR if there are multiple responses for the same model
  const iterationsByModel = new Map<string, Set<number>>();

  for (const response of responses) {
    if (response.totalIterations > 1) return true;

    const iterations = iterationsByModel.get(response.modelId);
    if (iterations) {
      iterations.add(response.iteration);
      if (iterations.size > 1) return true;
    } else {
      iterationsByModel.set(response.modelId, new Set([response.iteration]));
    }
  }

  return false;
}
