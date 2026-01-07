import { NextResponse } from "next/server";
import { getRun, saveRun, getPrompt, getModel, getSettings, getPrompts, getModels, getSequences } from "@/lib/storage";
import { executePrompt, executeConversation, ConversationMessage } from "@/lib/providers";
import { evaluateMachine } from "@/lib/evaluation";
import { generateId } from "@/lib/utils";
import type { Result, Evaluation, Prompt, Model, Settings, PromptSequence } from "@/lib/types";
import { getPromptContent } from "@/lib/types";

// Default concurrency - can be adjusted based on rate limits
const DEFAULT_CONCURRENCY = 3;

interface Task {
  promptId: string;
  modelId: string;
  iteration: number;
  prompt: Prompt;
  model: Model;
}

interface SequenceTask {
  sequenceId: string;
  modelId: string;
  iteration: number;
  sequence: PromptSequence;
  model: Model;
}

interface TaskResult {
  result: Result;
  evaluation?: Evaluation;
}

interface SequenceTaskResult {
  results: Result[];
  evaluations: Evaluation[];
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
      getPromptContent(prompt),
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

// Process a multi-turn sequence task
async function processSequenceTask(
  task: SequenceTask,
  runId: string,
  settings: Settings
): Promise<SequenceTaskResult> {
  const { sequence, model, modelId, iteration, sequenceId } = task;
  const results: Result[] = [];
  const evaluations: Evaluation[] = [];
  const conversationHistory: ConversationMessage[] = [];

  for (let stepIndex = 0; stepIndex < sequence.steps.length; stepIndex++) {
    const step = sequence.steps[stepIndex];
    const resultId = generateId();

    try {
      // Add user message to history
      conversationHistory.push({
        role: "user",
        content: step.content,
      });

      // Execute with conversation history
      const execution = await executeConversation(
        conversationHistory,
        model,
        settings
      );

      // Add assistant response to history
      if (!execution.error) {
        conversationHistory.push({
          role: "assistant",
          content: execution.response,
        });
      }

      const result: Result = {
        id: resultId,
        runId,
        promptId: `${sequenceId}:step-${stepIndex}`, // Use composite ID for step
        modelId,
        iteration,
        response: execution.response,
        latencyMs: execution.latencyMs,
        tokensInput: execution.tokensInput,
        tokensOutput: execution.tokensOutput,
        error: execution.error,
        createdAt: new Date().toISOString(),
        sequenceId,
        stepIndex,
      };
      results.push(result);

      // Auto-run machine judge if configured for this step
      const evalConfig = step.evaluationConfig || sequence.evaluationConfig;
      if (
        !execution.error &&
        evalConfig.methods.includes("machine") &&
        evalConfig.machineJudge
      ) {
        const machineResult = evaluateMachine(
          execution.response,
          evalConfig.machineJudge
        );

        evaluations.push({
          id: generateId(),
          resultId,
          method: "machine",
          machinePass: machineResult.pass,
          machineDetails: machineResult.details,
          machineNumericValue: machineResult.numericValue,
          createdAt: new Date().toISOString(),
        });
      }

      // If there was an error, stop the sequence
      if (execution.error) {
        break;
      }
    } catch (error) {
      const result: Result = {
        id: resultId,
        runId,
        promptId: `${sequenceId}:step-${stepIndex}`,
        modelId,
        iteration,
        response: "",
        latencyMs: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        createdAt: new Date().toISOString(),
        sequenceId,
        stepIndex,
      };
      results.push(result);
      break; // Stop sequence on error
    }
  }

  return { results, evaluations };
}

// Process tasks with concurrency limit and cancellation support
async function processWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>,
  onProgress?: (completed: number, total: number, currentResults: R[]) => void,
  shouldCancel?: () => Promise<boolean>
): Promise<{ results: R[]; cancelled: boolean }> {
  const results: R[] = [];
  let completed = 0;
  let index = 0;
  let cancelled = false;

  async function worker(): Promise<void> {
    while (index < items.length && !cancelled) {
      // Check for cancellation before starting new task
      if (shouldCancel) {
        const cancelRequested = await shouldCancel();
        if (cancelRequested) {
          cancelled = true;
          return;
        }
      }

      const currentIndex = index++;
      const item = items[currentIndex];
      const result = await processor(item);
      results[currentIndex] = result;
      completed++;
      // Pass current results to the progress callback
      onProgress?.(completed, items.length, results);
    }
  }

  // Start workers up to concurrency limit
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return { results: results.filter(Boolean), cancelled };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
    const [settings, allPrompts, allModels, allSequences] = await Promise.all([
      getSettings(),
      getPrompts(),
      getModels(),
      getSequences(),
    ]);

    // Index by ID for quick lookup
    const promptMap = new Map(allPrompts.map((p) => [p.id, p]));
    const modelMap = new Map(allModels.map((m) => [m.id, m]));
    const sequenceMap = new Map(allSequences.map((s) => [s.id, s]));

    // Build task list for regular prompts
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

    // Build task list for sequences
    const sequenceTasks: SequenceTask[] = [];
    for (const sequenceId of run.sequenceIds || []) {
      const sequence = sequenceMap.get(sequenceId);
      if (!sequence) {
        console.warn(`Sequence ${sequenceId} not found, skipping`);
        continue;
      }

      for (const modelId of run.modelIds) {
        const model = modelMap.get(modelId);
        if (!model) {
          console.warn(`Model ${modelId} not found, skipping`);
          continue;
        }

        for (let iteration = 0; iteration < run.iterations; iteration++) {
          sequenceTasks.push({ sequenceId, modelId, iteration, sequence, model });
        }
      }
    }

    if (tasks.length === 0 && sequenceTasks.length === 0) {
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

    // Create cancellation check function
    const checkCancellation = async (): Promise<boolean> => {
      const currentRun = await getRun(run.id);
      return currentRun?.cancelRequested === true;
    };

    // Collect results from both regular tasks and sequences
    const allResults: Result[] = [];
    const allEvaluations: Evaluation[] = [];
    let cancelled = false;

    // Process regular tasks with concurrency
    if (tasks.length > 0) {
      const { results: taskResults, cancelled: tasksCancelled } = await processWithConcurrency(
        tasks,
        concurrency,
        (task) => processTask(task, run.id, settings),
        async (completed, total, currentResults) => {
          // Periodic save during execution
          const now = Date.now();
          if (now - lastSaveTime > SAVE_INTERVAL_MS) {
            lastSaveTime = now;
            const completedResults = currentResults.filter(Boolean);
            run.results = [
              ...allResults,
              ...completedResults.map((r) => r.result),
            ];
            run.evaluations = [
              ...allEvaluations,
              ...completedResults.filter((r) => r.evaluation).map((r) => r.evaluation!),
            ];
            await saveRun(run);
          }
        },
        checkCancellation
      );

      // Collect task results
      allResults.push(...taskResults.map((r) => r.result));
      allEvaluations.push(
        ...taskResults.filter((r) => r.evaluation).map((r) => r.evaluation!)
      );
      cancelled = tasksCancelled;
    }

    // Process sequence tasks (can run in parallel, but each sequence runs sequentially)
    if (sequenceTasks.length > 0 && !cancelled) {
      const { results: seqResults, cancelled: seqCancelled } = await processWithConcurrency(
        sequenceTasks,
        concurrency,
        (task) => processSequenceTask(task, run.id, settings),
        async (completed, total, currentResults) => {
          // Periodic save during execution
          const now = Date.now();
          if (now - lastSaveTime > SAVE_INTERVAL_MS) {
            lastSaveTime = now;
            const completedSeqResults = currentResults.filter(Boolean);
            run.results = [
              ...allResults,
              ...completedSeqResults.flatMap((r) => r.results),
            ];
            run.evaluations = [
              ...allEvaluations,
              ...completedSeqResults.flatMap((r) => r.evaluations),
            ];
            await saveRun(run);
          }
        },
        checkCancellation
      );

      // Collect sequence results
      allResults.push(...seqResults.flatMap((r) => r.results));
      allEvaluations.push(...seqResults.flatMap((r) => r.evaluations));
      cancelled = cancelled || seqCancelled;
    }

    // Update run with all results
    run.results = allResults;
    run.evaluations = allEvaluations;

    // Mark as completed or cancelled
    if (cancelled) {
      run.status = "cancelled";
      // Preserve the cancelledAt timestamp set by the cancel endpoint
      if (!run.cancelledAt) {
        run.cancelledAt = new Date().toISOString();
      }
    } else {
      run.status = "completed";
    }
    run.completedAt = new Date().toISOString();
    await saveRun(run);

    // Calculate total step count for sequences
    const totalSequenceSteps = sequenceTasks.reduce(
      (sum, task) => sum + task.sequence.steps.length,
      0
    );

    return NextResponse.json({
      success: true,
      run,
      summary: {
        total: tasks.length + totalSequenceSteps,
        prompts: tasks.length,
        sequences: sequenceTasks.length,
        sequenceSteps: totalSequenceSteps,
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
  { params }: { params: Promise<{ id: string }> }
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
