import type { MachineJudgeConfig, MachineJudgeResult } from "../types";
import {
  generateStringReversalCases,
  generateArithmeticCases,
  type TestCase,
} from "./generators";

export type { MachineJudgeResult };

export function evaluateMachine(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  switch (config.type) {
    case "contains":
      return evaluateContains(response, config);
    case "regex":
      return evaluateRegex(response, config);
    case "exact":
      return evaluateExact(response, config);
    case "json-schema":
      return evaluateJsonSchema(response, config);
    case "custom":
      return evaluateCustom(response, config);
    // Computable evaluation types
    case "word-count":
      return evaluateWordCount(response, config);
    case "string-reversal":
      return evaluateStringReversal(response, config);
    case "arithmetic":
      return evaluateArithmetic(response, config);
    case "list-sort":
      return evaluateListSort(response, config);
    // Benchmark evaluation types (auto-generation)
    case "string-reversal-benchmark":
      return evaluateStringReversalBenchmark(response, config);
    case "arithmetic-benchmark":
      return evaluateArithmeticBenchmark(response, config);
    default:
      return { pass: false, details: "Unknown evaluation type" };
  }
}

function evaluateContains(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  if (!config.criteria) {
    return { pass: false, details: "Missing criteria for contains check" };
  }

  const searchText = config.caseSensitive
    ? response
    : response.toLowerCase();

  // Support comma-separated terms
  const terms = config.criteria.split(",").map((t) => t.trim());
  const normalizedTerms = config.caseSensitive
    ? terms
    : terms.map((t) => t.toLowerCase());

  const found: string[] = [];
  const missing: string[] = [];

  for (let i = 0; i < normalizedTerms.length; i++) {
    if (searchText.includes(normalizedTerms[i])) {
      found.push(terms[i]);
    } else {
      missing.push(terms[i]);
    }
  }

  return {
    pass: missing.length === 0,
    details:
      missing.length === 0
        ? `All ${terms.length} required terms found`
        : `Missing: ${missing.join(", ")}. Found: ${found.join(", ")}`,
  };
}

function evaluateRegex(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  if (!config.criteria) {
    return { pass: false, details: "Missing regex pattern" };
  }

  try {
    const flags = config.caseSensitive ? "g" : "gi";
    const regex = new RegExp(config.criteria, flags);
    const matches = response.match(regex);

    return {
      pass: matches !== null && matches.length > 0,
      details: matches
        ? `Matched: ${matches.slice(0, 3).join(", ")}${matches.length > 3 ? "..." : ""}`
        : "No matches found",
    };
  } catch (error) {
    return {
      pass: false,
      details: `Invalid regex: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

function evaluateExact(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  if (!config.criteria) {
    return { pass: false, details: "Missing criteria for exact match" };
  }

  const normalize = (s: string) =>
    config.caseSensitive ? s.trim() : s.trim().toLowerCase();

  const pass = normalize(response) === normalize(config.criteria);

  return {
    pass,
    details: pass ? "Exact match" : "No exact match",
  };
}

function evaluateJsonSchema(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  if (!config.criteria) {
    return { pass: false, details: "Missing JSON schema" };
  }

  try {
    const parsed = JSON.parse(response);
    const schema = JSON.parse(config.criteria);

    // Simple schema validation - check required keys exist
    // In production, use ajv or similar
    const requiredKeys = schema.required || Object.keys(schema.properties || {});
    const missingKeys = requiredKeys.filter(
      (key: string) => !(key in parsed)
    );

    return {
      pass: missingKeys.length === 0,
      details:
        missingKeys.length === 0
          ? "Valid JSON structure"
          : `Missing keys: ${missingKeys.join(", ")}`,
    };
  } catch (error) {
    return {
      pass: false,
      details: `JSON error: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

function evaluateCustom(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  if (!config.criteria) {
    return { pass: false, details: "Missing custom evaluation function" };
  }

  const allowUnsafeEval =
    process.env.ALLOW_UNSAFE_EVAL === "true" ||
    process.env.NODE_ENV !== "production";
  if (!allowUnsafeEval) {
    return {
      pass: false,
      details: "Custom evaluations disabled (set ALLOW_UNSAFE_EVAL=true to enable)",
    };
  }

  try {
    // Security note: Only use in local mode
    // The criteria should be a function body that returns { pass, details }
    const fn = new Function("response", config.criteria);
    const result = fn(response);

    return {
      pass: Boolean(result.pass),
      details: result.details || (result.pass ? "Passed" : "Failed"),
    };
  } catch (error) {
    return {
      pass: false,
      details: `Custom eval error: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }
}

// Word count helper for custom evaluations
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

// Common custom evaluation functions
export const customEvaluators = {
  wordCount: (minWords: number) =>
    `const count = response.split(/\\s+/).filter(w => w.length > 0).length; return { pass: count >= ${minWords}, details: 'Word count: ' + count };`,

  hasCodeBlock: () =>
    `const hasCode = /\`\`\`[\\s\\S]*\`\`\`/.test(response); return { pass: hasCode, details: hasCode ? 'Contains code block' : 'No code block found' };`,

  validJson: () =>
    `try { JSON.parse(response); return { pass: true, details: 'Valid JSON' }; } catch (e) { return { pass: false, details: 'Invalid JSON: ' + e.message }; }`,

  noHallucination: (forbiddenTerms: string[]) =>
    `const forbidden = ${JSON.stringify(forbiddenTerms)}; const found = forbidden.filter(t => response.toLowerCase().includes(t.toLowerCase())); return { pass: found.length === 0, details: found.length === 0 ? 'No forbidden terms' : 'Found: ' + found.join(', ') };`,
};

// ============================================
// Computable Evaluation Functions
// ============================================

/**
 * Word count evaluation - checks if response meets target word count
 */
function evaluateWordCount(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  const cfg = config.wordCountConfig;
  if (!cfg) {
    return { pass: false, details: "Missing wordCountConfig" };
  }

  let count: number;
  switch (cfg.countMode) {
    case "characters":
      count = response.length;
      break;
    case "sentences":
      count = response.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
      break;
    case "words":
    default:
      count = countWords(response);
  }

  const target = cfg.targetCount;
  const tolerance = cfg.tolerance || 0;
  const pass = count >= target - tolerance && count <= target + tolerance;

  const rangeStr = tolerance > 0 ? `${target}±${tolerance}` : `${target}`;
  const unitStr = cfg.countMode === "characters" ? "chars" : cfg.countMode === "sentences" ? "sentences" : "words";

  return {
    pass,
    details: `${cfg.countMode}: ${count} (target: ${rangeStr} ${unitStr})`,
    numericValue: count,
  };
}

/**
 * String reversal evaluation - checks if response contains the reversed input string
 */
function evaluateStringReversal(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  const cfg = config.stringReversalConfig;
  if (!cfg) {
    return { pass: false, details: "Missing stringReversalConfig" };
  }

  const expected = cfg.inputString.split("").reverse().join("");
  const searchIn = cfg.caseSensitive ? response : response.toLowerCase();
  const searchFor = cfg.caseSensitive ? expected : expected.toLowerCase();
  const pass = searchIn.includes(searchFor);

  return {
    pass,
    details: pass
      ? `Correct reversal found: "${expected}"`
      : `Expected "${expected}" not found in response`,
  };
}

/**
 * Arithmetic evaluation - checks if response contains the correct answer to a math expression
 */
function evaluateArithmetic(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  const cfg = config.arithmeticConfig;
  if (!cfg) {
    return { pass: false, details: "Missing arithmeticConfig" };
  }

  // Extract numbers from response
  const pattern = cfg.extractPattern
    ? new RegExp(cfg.extractPattern, "g")
    : /[-+]?[\d,]+\.?\d*/g;

  const matches = response.match(pattern) || [];
  const numbers = matches
    .map((m) => parseFloat(m.replace(/,/g, "")))
    .filter((n) => !isNaN(n));

  const pass = numbers.includes(cfg.expectedResult);

  // Also check for the number formatted with commas
  const formattedExpected = cfg.expectedResult.toLocaleString();
  const hasFormattedMatch = response.includes(formattedExpected);

  return {
    pass: pass || hasFormattedMatch,
    details: pass || hasFormattedMatch
      ? `Correct answer found: ${cfg.expectedResult}`
      : `Expected ${cfg.expectedResult}, found: ${numbers.length > 0 ? numbers.join(", ") : "no numbers"}`,
    numericValue: numbers.length > 0 ? numbers[0] : undefined,
  };
}

/**
 * List sort evaluation - checks if response contains a correctly sorted list
 */
function evaluateListSort(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  const cfg = config.listSortConfig;
  if (!cfg) {
    return { pass: false, details: "Missing listSortConfig" };
  }

  // Sort the expected list
  let expected: string[];
  switch (cfg.sortOrder) {
    case "ascending":
      expected = [...cfg.inputList].sort((a, b) => parseFloat(a) - parseFloat(b));
      break;
    case "descending":
      expected = [...cfg.inputList].sort((a, b) => parseFloat(b) - parseFloat(a));
      break;
    case "alphabetical":
    default:
      expected = [...cfg.inputList].sort((a, b) => a.localeCompare(b));
  }

  // Check if response contains all items in the correct order
  const expectedJoined = expected.join(", ");
  const expectedJoinedNewline = expected.join("\n");
  const responseLower = response.toLowerCase();

  const pass =
    responseLower.includes(expectedJoined.toLowerCase()) ||
    responseLower.includes(expectedJoinedNewline.toLowerCase()) ||
    checkOrderInResponse(response, expected);

  return {
    pass,
    details: pass
      ? `Correct ${cfg.sortOrder} order found`
      : `Expected order: ${expected.join(", ")}`,
  };
}

/**
 * Helper to check if items appear in the correct order in a response
 */
function checkOrderInResponse(response: string, items: string[]): boolean {
  const responseLower = response.toLowerCase();
  let lastIndex = -1;

  for (const item of items) {
    const index = responseLower.indexOf(item.toLowerCase(), lastIndex + 1);
    if (index === -1 || index <= lastIndex) {
      return false;
    }
    lastIndex = index;
  }

  return true;
}

// ============================================
// Statistics Calculation
// ============================================

import type { ComputableStats } from "../types";

/**
 * Calculate statistics from a set of numeric evaluation results
 */
export function calculateComputableStats(
  values: number[],
  target?: number
): ComputableStats {
  if (values.length === 0) {
    return {
      values: [],
      average: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      target,
    };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;

  return {
    values,
    average: avg,
    min: Math.min(...values),
    max: Math.max(...values),
    stdDev: Math.sqrt(variance),
    target,
  };
}

// ============================================
// Benchmark Evaluation Functions
// ============================================

/**
 * String Reversal Benchmark - generates multiple strings and checks reversal accuracy
 */
function evaluateStringReversalBenchmark(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  const cfg = config.stringReversalBenchmarkConfig;
  if (!cfg) {
    return { pass: false, details: "Missing stringReversalBenchmarkConfig" };
  }

  // Generate test cases
  const testCases = generateStringReversalCases({
    count: cfg.count,
    minLength: cfg.minLength,
    maxLength: cfg.maxLength,
    charType: cfg.charType,
    seed: cfg.seed,
  });

  // Check each reversal in the response
  const results = testCases.map((tc) => {
    const expected = tc.expected as string;
    const searchIn = cfg.caseSensitive ? response : response.toLowerCase();
    const searchFor = cfg.caseSensitive ? expected : expected.toLowerCase();
    return searchIn.includes(searchFor);
  });

  const passed = results.filter((r) => r).length;
  const total = testCases.length;
  const passRate = (passed / total) * 100;
  const threshold = cfg.passThreshold;

  const isPass = passRate >= threshold;

  return {
    pass: isPass,
    details: `${passed}/${total} reversals correct (${passRate.toFixed(0)}%, threshold: ${threshold}%)`,
    numericValue: passRate / 100,
  };
}

/**
 * Arithmetic Benchmark - generates multiple math problems and checks answer accuracy
 */
function evaluateArithmeticBenchmark(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
  const cfg = config.arithmeticBenchmarkConfig;
  if (!cfg) {
    return { pass: false, details: "Missing arithmeticBenchmarkConfig" };
  }

  // Generate test cases
  const testCases = generateArithmeticCases({
    count: cfg.count,
    operators: cfg.operators,
    minOperand: cfg.minOperand,
    maxOperand: cfg.maxOperand,
    complexity: cfg.complexity,
    seed: cfg.seed,
  });

  // Extract all numbers from the response
  const numberPattern = /[-+]?[\d,]+\.?\d*/g;
  const matches = response.match(numberPattern) || [];
  const numbersInResponse = matches
    .map((m) => parseFloat(m.replace(/,/g, "")))
    .filter((n) => !isNaN(n));

  // Check each expected answer in the response
  const results = testCases.map((tc) => {
    const expected = tc.expected as number;
    // Check both exact match and formatted with commas
    const hasExact = numbersInResponse.some(
      (n) => Math.abs(n - expected) < 0.01
    );
    const formattedExpected = expected.toLocaleString();
    const hasFormatted = response.includes(formattedExpected);
    return hasExact || hasFormatted;
  });

  const passed = results.filter((r) => r).length;
  const total = testCases.length;
  const passRate = (passed / total) * 100;
  const threshold = cfg.passThreshold;

  const isPass = passRate >= threshold;

  return {
    pass: isPass,
    details: `${passed}/${total} calculations correct (${passRate.toFixed(0)}%, threshold: ${threshold}%)`,
    numericValue: passRate / 100,
  };
}
