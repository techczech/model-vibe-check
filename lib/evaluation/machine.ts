import type { MachineJudgeConfig } from "../types";

export interface MachineJudgeResult {
  pass: boolean;
  details: string;
}

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
    default:
      return { pass: false, details: "Unknown evaluation type" };
  }
}

function evaluateContains(
  response: string,
  config: MachineJudgeConfig
): MachineJudgeResult {
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
