import { promises as fs } from "fs";
import path from "path";
import type { Prompt, Model, Run, Settings } from "./types";

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
