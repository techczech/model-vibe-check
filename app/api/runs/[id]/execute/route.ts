import { NextResponse } from "next/server";
import { getRun, saveRun, getPrompt, getModel, getSettings, getPrompts, getModels } from "@/lib/storage";
import { executePrompt } from "@/lib/providers";
import { evaluateMachine } from "@/lib/evaluation";
import { generateId } from "@/lib/utils";
import type { Result, Evaluation, Prompt, Model, Settings } from "@/lib/types";

// Default concurrency - can be adjusted based on rate limits
const DEFAULT_CONCURRENCY = 3;

interface Task {
  promptId: string;
  modelId: string;
  iteration: number;
  prompt: Prompt;
  model: Model;
}

interface TaskResult {
  result: Result;
  evaluation?: Evaluation;
}

// Process a single task
async function processTask(
  task: Task,
  runId: string,
  settings: Settings
): Promise<TaskResult> {
  const resultId = generateId();
  const { prompt, model, promptId, modelId, iteration } = task;

  try {
    const execution = await executePrompt(
      prompt.content,
      model,
      prompt.attachments,
      settings
    );

    const result: Result = {
      id: resultId,
      runId,
      promptId,
      modelId,
      iteration,
      response: execution.response,
      latencyMs: execution.latencyMs,
      tokensInput: execution.tokensInput,
      tokensOutput: execution.tokensOutput,
      error: execution.error,
      createdAt: new Date().toISOString(),
    };

    // Auto-run machine judge if configured and no error
    let evaluation: Evaluation | undefined;
    if (
      !execution.error &&
      prompt.evaluationConfig.methods.includes("machine") &&
      prompt.evaluationConfig.machineJudge
    ) {
      const machineResult = evaluateMachine(
        execution.response,
        prompt.evaluationConfig.machineJudge
      );

      evaluation = {
        id: generateId(),
        resultId,
        method: "machine",
        machinePass: machineResult.pass,
        machineDetails: machineResult.details,
        createdAt: new Date().toISOString(),
      };
    }

    return { result, evaluation };
  } catch (error) {
    const result: Result = {
      id: resultId,
      runId,
      promptId,
      modelId,
      iteration,
      response: "",
      latencyMs: 0,
      error: error instanceof Error ? error.message : "Unknown error",
      createdAt: new Date().toISOString(),
    };
    return { result };
  }
}

// Process tasks with concurrency limit
async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  let completed = 0;
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      const result = await processor(item);
      results[currentIndex] = result;
      completed++;
      onProgress?.(completed, items.length);
    }
  }

  // Start workers up to concurrency limit
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  try {
    // Parse concurrency from query params or body
    let concurrency = DEFAULT_CONCURRENCY;
    try {
      const body = await request.json().catch(() => ({}));
      if (body.concurrency && typeof body.concurrency === "number") {
        concurrency = Math.max(1, Math.min(10, body.concurrency)); // Clamp 1-10
      }
    } catch {}

    // Load run
    const run = await getRun(id);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    if (run.status === "running") {
      return NextResponse.json(
        { error: "Run is already in progress" },
        { status: 400 }
      );
    }

    // Load all data upfront
    const [settings, allPrompts, allModels] = await Promise.all([
      getSettings(),
      getPrompts(),
      getModels(),
    ]);

    // Index by ID for quick lookup
    const promptMap = new Map(allPrompts.map((p) => [p.id, p]));
    const modelMap = new Map(allModels.map((m) => [m.id, m]));

    // Build task list
    const tasks: Task[] = [];
    for (const promptId of run.promptIds) {
      const prompt = promptMap.get(promptId);
      if (!prompt) {
        console.warn(`Prompt ${promptId} not found, skipping`);
        continue;
      }

      for (const modelId of run.modelIds) {
        const model = modelMap.get(modelId);
        if (!model) {
          console.warn(`Model ${modelId} not found, skipping`);
          continue;
        }

        for (let iteration = 0; iteration < run.iterations; iteration++) {
          tasks.push({ promptId, modelId, iteration, prompt, model });
        }
      }
    }

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: "No valid prompt/model combinations found" },
        { status: 400 }
      );
    }

    // Set status to running
    run.status = "running";
    run.results = [];
    run.evaluations = [];
    await saveRun(run);

    // Track last save time for periodic saves
    let lastSaveTime = Date.now();
    const SAVE_INTERVAL_MS = 5000; // Save every 5 seconds

    // Process all tasks with concurrency
    const taskResults = await processWithConcurrency(
      tasks,
      concurrency,
      (task) => processTask(task, run.id, settings),
      async (completed, total) => {
        // Periodic save during execution
        const now = Date.now();
        if (now - lastSaveTime > SAVE_INTERVAL_MS) {
          lastSaveTime = now;
          // Collect completed results so far
          const completedResults = taskResults.filter(Boolean);
          run.results = completedResults.map((r) => r.result);
          run.evaluations = completedResults
            .filter((r) => r.evaluation)
            .map((r) => r.evaluation!);
          await saveRun(run);
        }
      }
    );

    // Collect all results
    run.results = taskResults.map((r) => r.result);
    run.evaluations = taskResults
      .filter((r) => r.evaluation)
      .map((r) => r.evaluation!);

    // Mark as completed
    run.status = "completed";
    run.completedAt = new Date().toISOString();
    await saveRun(run);

    return NextResponse.json({
      success: true,
      run,
      summary: {
        total: tasks.length,
        completed: run.results.length,
        errors: run.results.filter((r) => r.error).length,
        evaluations: run.evaluations.length,
        concurrency,
      },
    });
  } catch (error) {
    console.error("Execution error:", error);

    // Try to mark run as failed
    try {
      const run = await getRun(id);
      if (run) {
        run.status = "failed";
        await saveRun(run);
      }
    } catch {}

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}

// GET to check execution status
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  const run = await getRun(id);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const totalCombinations = run.promptIds.length * run.modelIds.length * run.iterations;

  return NextResponse.json({
    status: run.status,
    progress: {
      total: totalCombinations,
      completed: run.results.length,
      errors: run.results.filter((r) => r.error).length,
    },
  });
}
