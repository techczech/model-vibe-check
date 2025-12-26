import type { Run, Prompt, Model, Evaluation, PairwiseComparison, Result } from "./types";

// Aggregated stats for a single prompt/model combination
export interface CellStats {
  promptId: string;
  modelId: string;
  resultCount: number;
  human: {
    average: number | null;
    scores: number[];
    count: number;
  };
  llmJudge: {
    average: number | null;
    byDimension: Record<string, number>;
    count: number;
  };
  machine: {
    passRate: number | null;
    passed: number;
    failed: number;
    count: number;
  };
  pairwise: {
    wins: number;
    losses: number;
    ties: number;
    winRate: number | null;
    count: number;
  };
  latency: {
    average: number | null;
    min: number | null;
    max: number | null;
  };
  // Combined score (weighted average of available methods)
  combined: number | null;
}

// Aggregated stats for a model across all prompts
export interface ModelStats {
  modelId: string;
  displayName: string;
  provider: string;
  promptCount: number;
  resultCount: number;
  human: {
    average: number | null;
    count: number;
  };
  llmJudge: {
    average: number | null;
    count: number;
  };
  machine: {
    passRate: number | null;
    count: number;
  };
  pairwise: {
    winRate: number | null;
    count: number;
  };
  latency: {
    average: number | null;
  };
  combined: number | null;
  rank: number;
}

// Aggregated stats for a prompt across all models
export interface PromptStats {
  promptId: string;
  title: string;
  category: string;
  modelCount: number;
  resultCount: number;
  averageScore: number | null;
  variance: number | null;
  bestModel: string | null;
  worstModel: string | null;
}

// Aggregated stats for a category
export interface CategoryStats {
  category: string;
  promptCount: number;
  resultCount: number;
  averageScore: number | null;
  machinePassRate: number | null;
}

// Full run aggregation
export interface RunAggregation {
  runId: string;
  runName: string;
  cells: CellStats[];
  models: ModelStats[];
  prompts: PromptStats[];
  categories: CategoryStats[];
  summary: {
    totalResults: number;
    totalEvaluations: number;
    totalComparisons: number;
    humanEvalProgress: number; // 0-1
    llmJudgeProgress: number; // 0-1
    machineJudgeProgress: number; // 0-1
  };
}

// Calculate aggregation for a run
export function aggregateRun(
  run: Run,
  prompts: Prompt[],
  models: Model[]
): RunAggregation {
  const promptMap = new Map(prompts.map((p) => [p.id, p]));
  const modelMap = new Map(models.map((m) => [m.id, m]));

  // Build cell stats
  const cells: CellStats[] = [];
  for (const promptId of run.promptIds) {
    for (const modelId of run.modelIds) {
      const cell = calculateCellStats(run, promptId, modelId);
      cells.push(cell);
    }
  }

  // Build model stats
  const modelStats = calculateModelStats(cells, run, modelMap);

  // Build prompt stats
  const promptStats = calculatePromptStats(cells, promptMap, modelMap);

  // Build category stats
  const categoryStats = calculateCategoryStats(promptStats, cells, promptMap);

  // Calculate summary
  const resultsNeedingHuman = run.results.filter((r) => {
    const prompt = promptMap.get(r.promptId);
    return prompt?.evaluationConfig.methods.includes("human");
  });
  const humanEvals = run.evaluations.filter((e) => e.method === "human");

  const resultsNeedingLLM = run.results.filter((r) => {
    const prompt = promptMap.get(r.promptId);
    return prompt?.evaluationConfig.methods.includes("llm-judge");
  });
  const llmEvals = run.evaluations.filter((e) => e.method === "llm-judge");

  const resultsNeedingMachine = run.results.filter((r) => {
    const prompt = promptMap.get(r.promptId);
    return prompt?.evaluationConfig.methods.includes("machine");
  });
  const machineEvals = run.evaluations.filter((e) => e.method === "machine");

  return {
    runId: run.id,
    runName: run.name,
    cells,
    models: modelStats,
    prompts: promptStats,
    categories: categoryStats,
    summary: {
      totalResults: run.results.length,
      totalEvaluations: run.evaluations.length,
      totalComparisons: run.comparisons.length,
      humanEvalProgress:
        resultsNeedingHuman.length > 0
          ? humanEvals.length / resultsNeedingHuman.length
          : 1,
      llmJudgeProgress:
        resultsNeedingLLM.length > 0
          ? llmEvals.length / resultsNeedingLLM.length
          : 1,
      machineJudgeProgress:
        resultsNeedingMachine.length > 0
          ? machineEvals.length / resultsNeedingMachine.length
          : 1,
    },
  };
}

function calculateCellStats(
  run: Run,
  promptId: string,
  modelId: string
): CellStats {
  // Get all results for this prompt/model
  const results = run.results.filter(
    (r) => r.promptId === promptId && r.modelId === modelId
  );
  const resultIds = new Set(results.map((r) => r.id));

  // Get evaluations for these results
  const evals = run.evaluations.filter((e) => resultIds.has(e.resultId));

  // Human scores
  const humanEvals = evals.filter((e) => e.method === "human" && e.humanScore != null);
  const humanScores = humanEvals.map((e) => e.humanScore!);

  // LLM Judge scores
  const llmEvals = evals.filter((e) => e.method === "llm-judge" && e.llmOverall != null);
  const llmOveralls = llmEvals.map((e) => e.llmOverall!);

  // Aggregate LLM dimension scores
  const dimensionSums: Record<string, number[]> = {};
  for (const e of llmEvals) {
    if (e.llmScores) {
      for (const [dim, score] of Object.entries(e.llmScores)) {
        if (!dimensionSums[dim]) dimensionSums[dim] = [];
        dimensionSums[dim].push(score);
      }
    }
  }
  const byDimension: Record<string, number> = {};
  for (const [dim, scores] of Object.entries(dimensionSums)) {
    byDimension[dim] = average(scores) ?? 0;
  }

  // Machine judge
  const machineEvals = evals.filter((e) => e.method === "machine");
  const machinePassed = machineEvals.filter((e) => e.machinePass === true).length;
  const machineFailed = machineEvals.filter((e) => e.machinePass === false).length;

  // Pairwise (comparisons where this model was involved)
  const comparisons = run.comparisons.filter((c) => {
    const resultA = run.results.find((r) => r.id === c.resultAId);
    const resultB = run.results.find((r) => r.id === c.resultBId);
    return (
      c.promptId === promptId &&
      ((resultA?.modelId === modelId) || (resultB?.modelId === modelId))
    );
  });

  let wins = 0, losses = 0, ties = 0;
  for (const c of comparisons) {
    const resultA = run.results.find((r) => r.id === c.resultAId);
    const isModelA = resultA?.modelId === modelId;

    if (c.winner === "tie") {
      ties++;
    } else if ((c.winner === "a" && isModelA) || (c.winner === "b" && !isModelA)) {
      wins++;
    } else {
      losses++;
    }
  }

  // Latency
  const latencies = results.map((r) => r.latencyMs).filter((l) => l > 0);

  // Combined score (weighted average of available scores, normalized to 0-10)
  const scores: number[] = [];
  if (humanScores.length > 0) scores.push(average(humanScores)!);
  if (llmOveralls.length > 0) scores.push(average(llmOveralls)!);
  if (machineEvals.length > 0) {
    // Convert pass rate to 0-10 scale
    const passRate = machinePassed / machineEvals.length;
    scores.push(passRate * 10);
  }
  if (comparisons.length > 0) {
    // Convert win rate to 0-10 scale
    const winRate = wins / comparisons.length;
    scores.push(winRate * 10);
  }

  return {
    promptId,
    modelId,
    resultCount: results.length,
    human: {
      average: average(humanScores),
      scores: humanScores,
      count: humanScores.length,
    },
    llmJudge: {
      average: average(llmOveralls),
      byDimension,
      count: llmEvals.length,
    },
    machine: {
      passRate: machineEvals.length > 0 ? machinePassed / machineEvals.length : null,
      passed: machinePassed,
      failed: machineFailed,
      count: machineEvals.length,
    },
    pairwise: {
      wins,
      losses,
      ties,
      winRate: comparisons.length > 0 ? wins / comparisons.length : null,
      count: comparisons.length,
    },
    latency: {
      average: average(latencies),
      min: latencies.length > 0 ? Math.min(...latencies) : null,
      max: latencies.length > 0 ? Math.max(...latencies) : null,
    },
    combined: average(scores),
  };
}

function calculateModelStats(
  cells: CellStats[],
  run: Run,
  modelMap: Map<string, Model>
): ModelStats[] {
  const modelIds = [...new Set(cells.map((c) => c.modelId))];

  const stats: ModelStats[] = modelIds.map((modelId) => {
    const modelCells = cells.filter((c) => c.modelId === modelId);
    const model = modelMap.get(modelId);

    // Aggregate across all prompts
    const humanScores = modelCells
      .flatMap((c) => c.human.scores)
      .filter((s) => s != null);
    const llmScores = modelCells
      .map((c) => c.llmJudge.average)
      .filter((s) => s != null) as number[];
    const machineRates = modelCells
      .map((c) => c.machine.passRate)
      .filter((r) => r != null) as number[];
    const pairwiseRates = modelCells
      .map((c) => c.pairwise.winRate)
      .filter((r) => r != null) as number[];
    const latencies = modelCells
      .map((c) => c.latency.average)
      .filter((l) => l != null) as number[];
    const combinedScores = modelCells
      .map((c) => c.combined)
      .filter((s) => s != null) as number[];

    return {
      modelId,
      displayName: model?.displayName || modelId,
      provider: model?.provider || "unknown",
      promptCount: modelCells.filter((c) => c.resultCount > 0).length,
      resultCount: modelCells.reduce((sum, c) => sum + c.resultCount, 0),
      human: {
        average: average(humanScores),
        count: humanScores.length,
      },
      llmJudge: {
        average: average(llmScores),
        count: llmScores.length,
      },
      machine: {
        passRate: average(machineRates),
        count: modelCells.reduce((sum, c) => sum + c.machine.count, 0),
      },
      pairwise: {
        winRate: average(pairwiseRates),
        count: modelCells.reduce((sum, c) => sum + c.pairwise.count, 0),
      },
      latency: {
        average: average(latencies),
      },
      combined: average(combinedScores),
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by combined score and assign ranks
  stats.sort((a, b) => (b.combined ?? 0) - (a.combined ?? 0));
  stats.forEach((s, i) => {
    s.rank = i + 1;
  });

  return stats;
}

function calculatePromptStats(
  cells: CellStats[],
  promptMap: Map<string, Prompt>,
  modelMap: Map<string, Model>
): PromptStats[] {
  const promptIds = [...new Set(cells.map((c) => c.promptId))];

  return promptIds.map((promptId) => {
    const promptCells = cells.filter((c) => c.promptId === promptId);
    const prompt = promptMap.get(promptId);

    const combinedScores = promptCells
      .map((c) => c.combined)
      .filter((s) => s != null) as number[];

    // Find best and worst models
    let bestModel: string | null = null;
    let worstModel: string | null = null;
    let bestScore = -Infinity;
    let worstScore = Infinity;

    for (const cell of promptCells) {
      if (cell.combined != null) {
        if (cell.combined > bestScore) {
          bestScore = cell.combined;
          bestModel = modelMap.get(cell.modelId)?.displayName || cell.modelId;
        }
        if (cell.combined < worstScore) {
          worstScore = cell.combined;
          worstModel = modelMap.get(cell.modelId)?.displayName || cell.modelId;
        }
      }
    }

    return {
      promptId,
      title: prompt?.title || promptId,
      category: prompt?.category || "Uncategorized",
      modelCount: promptCells.filter((c) => c.resultCount > 0).length,
      resultCount: promptCells.reduce((sum, c) => sum + c.resultCount, 0),
      averageScore: average(combinedScores),
      variance: variance(combinedScores),
      bestModel: bestScore > -Infinity ? bestModel : null,
      worstModel: worstScore < Infinity ? worstModel : null,
    };
  });
}

function calculateCategoryStats(
  promptStats: PromptStats[],
  cells: CellStats[],
  promptMap: Map<string, Prompt>
): CategoryStats[] {
  const categories = [...new Set(promptStats.map((p) => p.category))];

  return categories.map((category) => {
    const categoryPrompts = promptStats.filter((p) => p.category === category);
    const promptIds = new Set(categoryPrompts.map((p) => p.promptId));
    const categoryCells = cells.filter((c) => promptIds.has(c.promptId));

    const scores = categoryPrompts
      .map((p) => p.averageScore)
      .filter((s) => s != null) as number[];

    const machineRates = categoryCells
      .map((c) => c.machine.passRate)
      .filter((r) => r != null) as number[];

    return {
      category,
      promptCount: categoryPrompts.length,
      resultCount: categoryCells.reduce((sum, c) => sum + c.resultCount, 0),
      averageScore: average(scores),
      machinePassRate: average(machineRates),
    };
  });
}

// Utility functions
function average(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function variance(numbers: number[]): number | null {
  if (numbers.length < 2) return null;
  const avg = average(numbers)!;
  const squareDiffs = numbers.map((n) => Math.pow(n - avg, 2));
  return average(squareDiffs);
}

// Export summary as CSV
export function exportResultsCSV(
  run: Run,
  prompts: Prompt[],
  models: Model[]
): string {
  const promptMap = new Map(prompts.map((p) => [p.id, p]));
  const modelMap = new Map(models.map((m) => [m.id, m]));

  const headers = [
    "Prompt",
    "Category",
    "Model",
    "Provider",
    "Response",
    "Latency (ms)",
    "Human Score",
    "LLM Score",
    "Machine Pass",
    "Error",
  ];

  const rows = run.results.map((result) => {
    const prompt = promptMap.get(result.promptId);
    const model = modelMap.get(result.modelId);

    const humanEval = run.evaluations.find(
      (e) => e.resultId === result.id && e.method === "human"
    );
    const llmEval = run.evaluations.find(
      (e) => e.resultId === result.id && e.method === "llm-judge"
    );
    const machineEval = run.evaluations.find(
      (e) => e.resultId === result.id && e.method === "machine"
    );

    return [
      prompt?.title || result.promptId,
      prompt?.category || "",
      model?.displayName || result.modelId,
      model?.provider || "",
      `"${result.response.replace(/"/g, '""').slice(0, 500)}"`,
      result.latencyMs,
      humanEval?.humanScore ?? "",
      llmEval?.llmOverall ?? "",
      machineEval?.machinePass != null ? (machineEval.machinePass ? "PASS" : "FAIL") : "",
      result.error || "",
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

// Export summary as JSON
export function exportResultsJSON(
  run: Run,
  prompts: Prompt[],
  models: Model[]
): string {
  const aggregation = aggregateRun(run, prompts, models);
  return JSON.stringify(aggregation, null, 2);
}
