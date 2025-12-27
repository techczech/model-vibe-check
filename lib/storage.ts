import { promises as fs } from "fs";
import path from "path";
import type { Prompt, Model, Run, Settings, Rubric, RubricEvaluation } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const RUNS_DIR = path.join(DATA_DIR, "runs");

// Ensure directories exist
async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Generic JSON file operations
async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Prompts
export async function getPrompts(): Promise<Prompt[]> {
  const data = await readJsonFile<{ prompts: Prompt[] }>(
    path.join(DATA_DIR, "prompts.json"),
    { prompts: [] }
  );
  return data.prompts;
}

export async function savePrompts(prompts: Prompt[]): Promise<void> {
  await writeJsonFile(path.join(DATA_DIR, "prompts.json"), {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    prompts,
  });
}

export async function getPrompt(id: string): Promise<Prompt | null> {
  const prompts = await getPrompts();
  return prompts.find((p) => p.id === id) || null;
}

export async function savePrompt(prompt: Prompt): Promise<void> {
  const prompts = await getPrompts();
  const index = prompts.findIndex((p) => p.id === prompt.id);
  if (index >= 0) {
    prompts[index] = prompt;
  } else {
    prompts.push(prompt);
  }
  await savePrompts(prompts);
}

export async function deletePrompt(id: string): Promise<void> {
  const prompts = await getPrompts();
  await savePrompts(prompts.filter((p) => p.id !== id));
}

// Models
export async function getModels(): Promise<Model[]> {
  const data = await readJsonFile<{ models: Model[] }>(
    path.join(DATA_DIR, "models.json"),
    { models: [] }
  );
  return data.models;
}

export async function saveModels(models: Model[]): Promise<void> {
  await writeJsonFile(path.join(DATA_DIR, "models.json"), { models });
}

export async function getModel(id: string): Promise<Model | null> {
  const models = await getModels();
  return models.find((m) => m.id === id) || null;
}

export async function saveModel(model: Model): Promise<void> {
  const models = await getModels();
  const index = models.findIndex((m) => m.id === model.id);
  if (index >= 0) {
    models[index] = model;
  } else {
    models.push(model);
  }
  await saveModels(models);
}

export async function deleteModel(id: string): Promise<void> {
  const models = await getModels();
  await saveModels(models.filter((m) => m.id !== id));
}

// Runs
export async function getRuns(): Promise<Run[]> {
  await ensureDir(RUNS_DIR);
  const files = await fs.readdir(RUNS_DIR);
  const runs: Run[] = [];
  for (const file of files) {
    if (file.endsWith(".json")) {
      const run = await readJsonFile<Run>(path.join(RUNS_DIR, file), null as any);
      if (run) runs.push(run);
    }
  }
  return runs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getRun(id: string): Promise<Run | null> {
  return readJsonFile<Run | null>(path.join(RUNS_DIR, `${id}.json`), null);
}

export async function saveRun(run: Run): Promise<void> {
  await ensureDir(RUNS_DIR);
  await writeJsonFile(path.join(RUNS_DIR, `${run.id}.json`), run);
}

export async function deleteRun(id: string): Promise<void> {
  try {
    await fs.unlink(path.join(RUNS_DIR, `${id}.json`));
  } catch {
    // File doesn't exist, that's fine
  }
}

// Settings
export async function getSettings(): Promise<Settings> {
  return readJsonFile<Settings>(path.join(DATA_DIR, "settings.json"), {
    apiKeys: {},
    defaults: {
      llmJudgeModel: "gpt-4o-mini",
      iterations: 1,
      temperature: 0.7,
    },
    ollamaBaseUrl: "http://localhost:11434",
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJsonFile(path.join(DATA_DIR, "settings.json"), settings);
}

// Categories (derived from prompts)
export async function getCategories(): Promise<string[]> {
  const prompts = await getPrompts();
  const categories = new Set(prompts.map((p) => p.category));
  return Array.from(categories).sort();
}

// Get all results for a specific prompt (across all runs)
export async function getResultsForPrompt(promptId: string): Promise<{
  results: Array<Run["results"][0] & { runId: string; runName: string; runDate: string }>;
  evaluations: Array<Run["evaluations"][0]>;
}> {
  const runs = await getRuns();
  const results: Array<Run["results"][0] & { runId: string; runName: string; runDate: string }> = [];
  const evaluations: Array<Run["evaluations"][0]> = [];

  for (const run of runs) {
    for (const result of run.results) {
      if (result.promptId === promptId) {
        results.push({
          ...result,
          runId: run.id,
          runName: run.name,
          runDate: run.createdAt,
        });
      }
    }
    for (const evaluation of run.evaluations) {
      const matchingResult = run.results.find(
        (r) => r.id === evaluation.resultId && r.promptId === promptId
      );
      if (matchingResult) {
        evaluations.push(evaluation);
      }
    }
  }

  return { results, evaluations };
}

// Get coverage stats for all prompts
export interface PromptCoverage {
  promptId: string;
  models: {
    modelId: string;
    modelName: string;
    iterationCount: number;
  }[];
  totalResponses: number;
  modelCount: number;
}

export async function getPromptsCoverage(): Promise<Record<string, PromptCoverage>> {
  const runs = await getRuns();
  const models = await getModels();
  const modelIndex: Record<string, Model> = {};
  for (const m of models) {
    modelIndex[m.id] = m;
  }

  const coverage: Record<string, PromptCoverage> = {};

  for (const run of runs) {
    for (const result of run.results) {
      if (!coverage[result.promptId]) {
        coverage[result.promptId] = {
          promptId: result.promptId,
          models: [],
          totalResponses: 0,
          modelCount: 0,
        };
      }

      const promptCoverage = coverage[result.promptId];
      promptCoverage.totalResponses++;

      // Find or create model entry
      let modelEntry = promptCoverage.models.find((m) => m.modelId === result.modelId);
      if (!modelEntry) {
        modelEntry = {
          modelId: result.modelId,
          modelName: modelIndex[result.modelId]?.displayName || result.modelId,
          iterationCount: 0,
        };
        promptCoverage.models.push(modelEntry);
      }
      modelEntry.iterationCount++;
    }
  }

  // Update model counts
  for (const promptId in coverage) {
    coverage[promptId].modelCount = coverage[promptId].models.length;
  }

  return coverage;
}

// Get all results for a specific model (across all runs)
export async function getResultsForModel(modelId: string): Promise<{
  results: Array<Run["results"][0] & { runId: string; runName: string; runDate: string }>;
  evaluations: Array<Run["evaluations"][0]>;
}> {
  const runs = await getRuns();
  const results: Array<Run["results"][0] & { runId: string; runName: string; runDate: string }> = [];
  const evaluations: Array<Run["evaluations"][0]> = [];

  for (const run of runs) {
    for (const result of run.results) {
      if (result.modelId === modelId) {
        results.push({
          ...result,
          runId: run.id,
          runName: run.name,
          runDate: run.createdAt,
        });
      }
    }
    for (const evaluation of run.evaluations) {
      const matchingResult = run.results.find(
        (r) => r.id === evaluation.resultId && r.modelId === modelId
      );
      if (matchingResult) {
        evaluations.push(evaluation);
      }
    }
  }

  return { results, evaluations };
}

// Rubrics
export async function getRubrics(): Promise<Rubric[]> {
  const data = await readJsonFile<{ rubrics: Rubric[] }>(
    path.join(DATA_DIR, "rubrics.json"),
    { rubrics: [] }
  );
  return data.rubrics;
}

export async function saveRubrics(rubrics: Rubric[]): Promise<void> {
  await writeJsonFile(path.join(DATA_DIR, "rubrics.json"), {
    version: "1.0",
    rubrics,
  });
}

export async function getRubric(id: string): Promise<Rubric | null> {
  const rubrics = await getRubrics();
  return rubrics.find((r) => r.id === id) || null;
}

export async function saveRubric(rubric: Rubric): Promise<void> {
  const rubrics = await getRubrics();
  const index = rubrics.findIndex((r) => r.id === rubric.id);
  if (index >= 0) {
    rubrics[index] = rubric;
  } else {
    rubrics.push(rubric);
  }
  await saveRubrics(rubrics);
}

export async function deleteRubric(id: string): Promise<void> {
  const rubrics = await getRubrics();
  // Don't allow deleting default rubrics
  const rubric = rubrics.find((r) => r.id === id);
  if (rubric?.isDefault) {
    throw new Error("Cannot delete default rubrics");
  }
  await saveRubrics(rubrics.filter((r) => r.id !== id));
}

// Rubric Evaluations
const EVALUATIONS_FILE = path.join(DATA_DIR, "evaluations.json");

export async function getRubricEvaluations(): Promise<RubricEvaluation[]> {
  const data = await readJsonFile<{ evaluations: RubricEvaluation[] }>(
    EVALUATIONS_FILE,
    { evaluations: [] }
  );
  return data.evaluations;
}

export async function saveRubricEvaluations(evaluations: RubricEvaluation[]): Promise<void> {
  await writeJsonFile(EVALUATIONS_FILE, {
    version: "1.0",
    evaluations,
  });
}

export async function getRubricEvaluation(id: string): Promise<RubricEvaluation | null> {
  const evaluations = await getRubricEvaluations();
  return evaluations.find((e) => e.id === id) || null;
}

export async function getEvaluationsForResponse(responseId: string): Promise<RubricEvaluation[]> {
  const evaluations = await getRubricEvaluations();
  return evaluations.filter((e) => e.responseId === responseId);
}

export async function saveRubricEvaluation(evaluation: RubricEvaluation): Promise<void> {
  const evaluations = await getRubricEvaluations();
  const index = evaluations.findIndex((e) => e.id === evaluation.id);
  if (index >= 0) {
    evaluations[index] = evaluation;
  } else {
    evaluations.push(evaluation);
  }
  await saveRubricEvaluations(evaluations);
}

export async function deleteRubricEvaluation(id: string): Promise<void> {
  const evaluations = await getRubricEvaluations();
  await saveRubricEvaluations(evaluations.filter((e) => e.id !== id));
}

// Extended prompt stats for listing
export interface PromptStats {
  promptId: string;
  modelCount: number;
  responseCount: number;
  evaluatedCount: number;
  evaluationPct: number;
  avgScore?: number;
  hasResponses: boolean;
  needsEvaluation: boolean;
}

export async function getPromptsWithStats(): Promise<Record<string, PromptStats>> {
  const [runs, rubricEvaluations] = await Promise.all([
    getRuns(),
    getRubricEvaluations(),
  ]);

  // Build a map of responseId -> evaluations
  const evalsByResponse: Record<string, RubricEvaluation[]> = {};
  for (const evaluation of rubricEvaluations) {
    if (!evalsByResponse[evaluation.responseId]) {
      evalsByResponse[evaluation.responseId] = [];
    }
    evalsByResponse[evaluation.responseId].push(evaluation);
  }

  const stats: Record<string, PromptStats> = {};

  for (const run of runs) {
    for (const result of run.results) {
      if (!stats[result.promptId]) {
        stats[result.promptId] = {
          promptId: result.promptId,
          modelCount: 0,
          responseCount: 0,
          evaluatedCount: 0,
          evaluationPct: 0,
          hasResponses: false,
          needsEvaluation: false,
        };
      }

      const s = stats[result.promptId];
      s.responseCount++;
      s.hasResponses = true;

      // Check if this result has evaluations (rubric or legacy)
      const hasRubricEval = evalsByResponse[result.id]?.length > 0;
      const hasLegacyEval = run.evaluations.some((e) => e.resultId === result.id);
      if (hasRubricEval || hasLegacyEval) {
        s.evaluatedCount++;
      }
    }
  }

  // Calculate model counts and percentages
  for (const promptId in stats) {
    const s = stats[promptId];
    // Count unique models
    const modelIds = new Set<string>();
    for (const run of runs) {
      for (const result of run.results) {
        if (result.promptId === promptId) {
          modelIds.add(result.modelId);
        }
      }
    }
    s.modelCount = modelIds.size;
    s.evaluationPct = s.responseCount > 0 ? Math.round((s.evaluatedCount / s.responseCount) * 100) : 0;
    s.needsEvaluation = s.responseCount > 0 && s.evaluatedCount < s.responseCount;
  }

  return stats;
}

// Model performance overview
export interface ModelStats {
  modelId: string;
  promptCount: number;
  responseCount: number;
  evaluatedCount: number;
  avgScore?: number;
}

export async function getModelsWithStats(): Promise<Record<string, ModelStats>> {
  const [runs, models, rubricEvaluations] = await Promise.all([
    getRuns(),
    getModels(),
    getRubricEvaluations(),
  ]);

  // Build a map of responseId -> evaluations with scores
  const evalsByResponse: Record<string, RubricEvaluation[]> = {};
  for (const evaluation of rubricEvaluations) {
    if (!evalsByResponse[evaluation.responseId]) {
      evalsByResponse[evaluation.responseId] = [];
    }
    evalsByResponse[evaluation.responseId].push(evaluation);
  }

  const stats: Record<string, ModelStats> = {};
  const scoresByModel: Record<string, number[]> = {};

  // Initialize stats for all active models
  for (const model of models.filter((m) => m.isActive)) {
    stats[model.id] = {
      modelId: model.id,
      promptCount: 0,
      responseCount: 0,
      evaluatedCount: 0,
    };
    scoresByModel[model.id] = [];
  }

  for (const run of runs) {
    for (const result of run.results) {
      if (!stats[result.modelId]) {
        stats[result.modelId] = {
          modelId: result.modelId,
          promptCount: 0,
          responseCount: 0,
          evaluatedCount: 0,
        };
        scoresByModel[result.modelId] = [];
      }

      stats[result.modelId].responseCount++;

      // Check evaluations
      const rubricEvals = evalsByResponse[result.id] || [];
      const legacyEval = run.evaluations.find((e) => e.resultId === result.id);
      
      if (rubricEvals.length > 0 || legacyEval) {
        stats[result.modelId].evaluatedCount++;
        
        // Collect scores
        for (const re of rubricEvals) {
          if (re.impressionScore) {
            scoresByModel[result.modelId].push(re.impressionScore);
          }
        }
        if (legacyEval?.humanScore) {
          scoresByModel[result.modelId].push(legacyEval.humanScore);
        }
        if (legacyEval?.llmOverall) {
          scoresByModel[result.modelId].push(legacyEval.llmOverall);
        }
      }
    }
  }

  // Calculate prompt counts and averages
  for (const modelId in stats) {
    // Count unique prompts
    const promptIds = new Set<string>();
    for (const run of runs) {
      for (const result of run.results) {
        if (result.modelId === modelId) {
          promptIds.add(result.promptId);
        }
      }
    }
    stats[modelId].promptCount = promptIds.size;
    
    // Average score
    const scores = scoresByModel[modelId];
    if (scores && scores.length > 0) {
      stats[modelId].avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  return stats;
}
