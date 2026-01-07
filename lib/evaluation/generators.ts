// Test case generators for benchmark evaluations

export interface TestCase {
  input: string;
  expected: string | number;
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
}

function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomWord(minLen: number, maxLen: number): string {
  const validWords = DICTIONARY_WORDS.filter(
    w => w.length >= minLen && w.length <= maxLen
  );
  if (validWords.length === 0) {
    return generateRandomString(Math.floor((minLen + maxLen) / 2));
  }
  return validWords[Math.floor(Math.random() * validWords.length)];
}

export function generateStringReversalCases(
  config: StringReversalGenerationConfig
): TestCase[] {
  const cases: TestCase[] = [];
  const usedInputs = new Set<string>();

  for (let i = 0; i < config.count; i++) {
    let input: string;
    let attempts = 0;

    do {
      const length = Math.floor(
        Math.random() * (config.maxLength - config.minLength + 1) + config.minLength
      );

      if (config.charType === 'words') {
        input = getRandomWord(config.minLength, config.maxLength);
      } else if (config.charType === 'random') {
        input = generateRandomString(length);
      } else {
        // mixed - 50% chance of each
        input = Math.random() < 0.5
          ? getRandomWord(config.minLength, config.maxLength)
          : generateRandomString(length);
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
}

function getRandomOperand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function getRandomOperator(operators: ('+' | '-' | '*' | '/')[]): string {
  return operators[Math.floor(Math.random() * operators.length)];
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
  config: ArithmeticGenerationConfig
): { expression: string; result: number } {
  const a = getRandomOperand(config.minOperand, config.maxOperand);
  const b = getRandomOperand(config.minOperand, config.maxOperand);
  const op = getRandomOperator(config.operators);

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
  config: ArithmeticGenerationConfig
): { expression: string; result: number } {
  const a = getRandomOperand(config.minOperand, config.maxOperand);
  const b = getRandomOperand(config.minOperand, config.maxOperand);
  const c = getRandomOperand(config.minOperand, config.maxOperand);
  const op1 = getRandomOperator(config.operators.filter(o => o !== '/'));
  const op2 = getRandomOperator(config.operators.filter(o => o !== '/'));

  const expression = `${a} ${op1} ${b} ${op2} ${c}`;
  const result = evaluateExpression(expression);

  return { expression, result };
}

function generateComplexExpression(
  config: ArithmeticGenerationConfig
): { expression: string; result: number } {
  const a = getRandomOperand(config.minOperand, config.maxOperand);
  const b = getRandomOperand(config.minOperand, config.maxOperand);
  const c = getRandomOperand(config.minOperand, config.maxOperand);
  const d = getRandomOperand(config.minOperand, config.maxOperand);
  const op1 = getRandomOperator(config.operators.filter(o => o !== '/'));
  const op2 = getRandomOperator(config.operators.filter(o => o !== '/'));
  const op3 = getRandomOperator(config.operators.filter(o => o !== '/'));

  // Use parentheses for some variety
  const patterns = [
    `(${a} ${op1} ${b}) ${op2} ${c}`,
    `${a} ${op1} (${b} ${op2} ${c})`,
    `(${a} ${op1} ${b}) ${op2} (${c} ${op3} ${d})`,
    `${a} ${op1} ${b} ${op2} ${c} ${op3} ${d}`,
  ];

  const expression = patterns[Math.floor(Math.random() * patterns.length)];
  const result = evaluateExpression(expression);

  return { expression, result };
}

export function generateArithmeticCases(
  config: ArithmeticGenerationConfig
): TestCase[] {
  const cases: TestCase[] = [];
  const usedExpressions = new Set<string>();

  for (let i = 0; i < config.count; i++) {
    let expression: string;
    let result: number;
    let attempts = 0;

    do {
      switch (config.complexity) {
        case 'simple':
          ({ expression, result } = generateSimpleExpression(config));
          break;
        case 'moderate':
          ({ expression, result } = generateModerateExpression(config));
          break;
        case 'complex':
          ({ expression, result } = generateComplexExpression(config));
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
