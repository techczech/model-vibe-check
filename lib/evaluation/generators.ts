// Test case generators for benchmark evaluations

export interface TestCase {
  input: string;
  expected: string | number;
}

type RandomSource = () => number;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandomSource(seed?: string): RandomSource {
  if (!seed) return Math.random;

  let state = hashSeed(seed) || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4294967296;
  };
}

// Common English words for dictionary mode
const DICTIONARY_WORDS = [
  "hello", "world", "computer", "science", "testing",
  "example", "random", "string", "program", "function",
  "apple", "banana", "cherry", "dragon", "elephant",
  "forest", "garden", "heaven", "island", "jungle",
  "kitten", "lemon", "mango", "nature", "ocean",
  "planet", "queen", "river", "sunset", "tiger",
  "umbrella", "violet", "winter", "yellow", "zebra",
  "algorithm", "beautiful", "challenge", "developer",
  "framework", "generator", "interface", "javascript",
  "keyboard", "language", "mountain", "notebook",
  "operation", "performance", "question", "response",
  "software", "terminal", "universe", "variable",
  "wonderful", "excellent", "fantastic", "brilliant",
  "amazing", "creative", "dynamic", "electric",
  "floating", "graceful", "harmony", "imagine",
];

// ============================================
// String Reversal Benchmark Generator
// ============================================

export interface StringReversalGenerationConfig {
  count: number;
  minLength: number;
  maxLength: number;
  charType: 'random' | 'words' | 'mixed';
  seed?: string;
}

function generateRandomString(length: number, random: RandomSource): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(random() * chars.length));
  }
  return result;
}

function getRandomWord(minLen: number, maxLen: number, random: RandomSource): string {
  const validWords = DICTIONARY_WORDS.filter(
    w => w.length >= minLen && w.length <= maxLen
  );
  if (validWords.length === 0) {
    return generateRandomString(Math.floor((minLen + maxLen) / 2), random);
  }
  return validWords[Math.floor(random() * validWords.length)];
}

export function generateStringReversalCases(
  config: StringReversalGenerationConfig
): TestCase[] {
  const cases: TestCase[] = [];
  const usedInputs = new Set<string>();
  const random = createRandomSource(config.seed);

  for (let i = 0; i < config.count; i++) {
    let input: string;
    let attempts = 0;

    do {
      const length = Math.floor(
        random() * (config.maxLength - config.minLength + 1) + config.minLength
      );

      if (config.charType === 'words') {
        input = getRandomWord(config.minLength, config.maxLength, random);
      } else if (config.charType === 'random') {
        input = generateRandomString(length, random);
      } else {
        // mixed - 50% chance of each
        input = random() < 0.5
          ? getRandomWord(config.minLength, config.maxLength, random)
          : generateRandomString(length, random);
      }
      attempts++;
    } while (usedInputs.has(input) && attempts < 20);

    usedInputs.add(input);
    const expected = input.split('').reverse().join('');
    cases.push({ input, expected });
  }

  return cases;
}

// ============================================
// Arithmetic Benchmark Generator
// ============================================

export interface ArithmeticGenerationConfig {
  count: number;
  operators: ('+' | '-' | '*' | '/')[];
  minOperand: number;
  maxOperand: number;
  complexity: 'simple' | 'moderate' | 'complex';
  seed?: string;
}

function getRandomOperand(min: number, max: number, random: RandomSource): number {
  return Math.floor(random() * (max - min + 1) + min);
}

function getRandomOperator(operators: ('+' | '-' | '*' | '/')[], random: RandomSource): string {
  return operators[Math.floor(random() * operators.length)];
}

function evaluateExpression(expr: string): number {
  // Safe evaluation using Function constructor
  // Only supports basic arithmetic operators
  try {
    const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
    return new Function(`return ${sanitized}`)() as number;
  } catch {
    return NaN;
  }
}

function generateSimpleExpression(
  config: ArithmeticGenerationConfig,
  random: RandomSource
): { expression: string; result: number } {
  const a = getRandomOperand(config.minOperand, config.maxOperand, random);
  const b = getRandomOperand(config.minOperand, config.maxOperand, random);
  const op = getRandomOperator(config.operators, random);

  // For division, ensure clean results
  if (op === '/') {
    const divisor = b || 1;
    const product = a * divisor;
    return {
      expression: `${product} / ${divisor}`,
      result: a,
    };
  }

  const expression = `${a} ${op} ${b}`;
  const result = evaluateExpression(expression);

  return { expression, result };
}

function generateModerateExpression(
  config: ArithmeticGenerationConfig,
  random: RandomSource
): { expression: string; result: number } {
  const a = getRandomOperand(config.minOperand, config.maxOperand, random);
  const b = getRandomOperand(config.minOperand, config.maxOperand, random);
  const c = getRandomOperand(config.minOperand, config.maxOperand, random);
  const op1 = getRandomOperator(config.operators.filter(o => o !== '/'), random);
  const op2 = getRandomOperator(config.operators.filter(o => o !== '/'), random);

  const expression = `${a} ${op1} ${b} ${op2} ${c}`;
  const result = evaluateExpression(expression);

  return { expression, result };
}

function generateComplexExpression(
  config: ArithmeticGenerationConfig,
  random: RandomSource
): { expression: string; result: number } {
  const a = getRandomOperand(config.minOperand, config.maxOperand, random);
  const b = getRandomOperand(config.minOperand, config.maxOperand, random);
  const c = getRandomOperand(config.minOperand, config.maxOperand, random);
  const d = getRandomOperand(config.minOperand, config.maxOperand, random);
  const op1 = getRandomOperator(config.operators.filter(o => o !== '/'), random);
  const op2 = getRandomOperator(config.operators.filter(o => o !== '/'), random);
  const op3 = getRandomOperator(config.operators.filter(o => o !== '/'), random);

  // Use parentheses for some variety
  const patterns = [
    `(${a} ${op1} ${b}) ${op2} ${c}`,
    `${a} ${op1} (${b} ${op2} ${c})`,
    `(${a} ${op1} ${b}) ${op2} (${c} ${op3} ${d})`,
    `${a} ${op1} ${b} ${op2} ${c} ${op3} ${d}`,
  ];

  const expression = patterns[Math.floor(random() * patterns.length)];
  const result = evaluateExpression(expression);

  return { expression, result };
}

export function generateArithmeticCases(
  config: ArithmeticGenerationConfig
): TestCase[] {
  const cases: TestCase[] = [];
  const usedExpressions = new Set<string>();
  const random = createRandomSource(config.seed);

  for (let i = 0; i < config.count; i++) {
    let expression: string;
    let result: number;
    let attempts = 0;

    do {
      switch (config.complexity) {
        case 'simple':
          ({ expression, result } = generateSimpleExpression(config, random));
          break;
        case 'moderate':
          ({ expression, result } = generateModerateExpression(config, random));
          break;
        case 'complex':
          ({ expression, result } = generateComplexExpression(config, random));
          break;
      }
      attempts++;
    } while (
      (usedExpressions.has(expression) || isNaN(result) || !isFinite(result)) &&
      attempts < 20
    );

    usedExpressions.add(expression);

    // Round to avoid floating point issues
    result = Math.round(result * 100) / 100;

    cases.push({
      input: expression,
      expected: result,
    });
  }

  return cases;
}

// ============================================
// Preview generation (for UI)
// ============================================

export function generatePreviewCases(
  type: 'string-reversal' | 'arithmetic',
  config: StringReversalGenerationConfig | ArithmeticGenerationConfig,
  count: number = 3
): TestCase[] {
  if (type === 'string-reversal') {
    return generateStringReversalCases({
      ...(config as StringReversalGenerationConfig),
      count,
    });
  } else {
    return generateArithmeticCases({
      ...(config as ArithmeticGenerationConfig),
      count,
    });
  }
}
