// Core types for Model Vibe Check

export type EvaluationMethod = 'human' | 'llm-judge' | 'machine' | 'pairwise';

export type Provider = 'ollama' | 'openai' | 'google' | 'openrouter' | 'anthropic';

// Model size classification
export type ModelSizeClass = 
  | 'frontier'     // GPT-4o, Claude 3.5 Sonnet, Gemini Pro
  | 'flash'        // GPT-4o-mini, Claude Haiku, Gemini Flash
  | 'lite'         // Very lightweight/fast
  | 'sub-1b' | '1-3b' | '3-7b' | '7-14b' | '14-34b' 
  | '35-70b' | '70-100b' | '100-200b' | '200b+'
  | 'unknown';

// Model reasoning capability
export type ReasoningCapability = 'none' | 'reasoning' | 'hybrid';

// Reasoning level used for a specific generation
export type ReasoningUsed = 'none' | 'standard' | 'extended';

// Rubric System
export type RubricItemType = 'binary' | 'scale' | 'checklist';

export interface RubricItem {
  id: string;
  label: string;
  description?: string;
  type: RubricItemType;
  // For scale type: labels for each level (e.g., ["Missing", "Partial", "Complete"])
  scaleLabels?: string[];
  // For checklist type: items to check
  checklistItems?: string[];
  // Optional weight for scoring (default 1)
  weight?: number;
}

export type RubricScope = 'global' | 'prompt-specific';

export interface Rubric {
  id: string;
  name: string;
  description?: string;
  items: RubricItem[];
  // Allow a 1-10 gut feeling score alongside rubric
  allowImpressionScore: boolean;
  // Is this a built-in default rubric?
  isDefault?: boolean;
  // Scope defines where this rubric can be used
  scope: RubricScope;
  // Tags for organization
  tags?: string[];
  // Which prompts use this rubric (if prompt-specific)
  promptIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// Rubric-based evaluation (replaces old Evaluation for new system)
export interface RubricEvaluation {
  id: string;
  responseId: string;
  rubricId: string;
  evaluatorType: 'human' | 'llm';
  evaluatorId?: string; // model ID for LLM, could be user ID for human
  scores: {
    [rubricItemId: string]: {
      // For binary: true/false
      // For scale: 0-based index into scaleLabels
      // For checklist: array of checked item indices
      value: boolean | number | number[];
      confidence?: number; // 0-1, LLM can express uncertainty
      note?: string;
    };
  };
  impressionScore?: number; // 1-10 gut feeling
  reasoning?: string; // LLM's explanation or human notes
  createdAt: string;
}

export interface Attachment {
  id: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  filename: string;
  path: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface MachineJudgeConfig {
  type: 'contains' | 'regex' | 'exact' | 'json-schema' | 'custom'
      | 'word-count' | 'string-reversal' | 'arithmetic' | 'list-sort'
      | 'string-reversal-benchmark' | 'arithmetic-benchmark';
  criteria?: string;
  caseSensitive?: boolean;

  // Computable evaluation configs
  wordCountConfig?: {
    targetCount: number;         // e.g., 200 words
    tolerance?: number;          // e.g., 20 (allows 180-220)
    countMode: 'words' | 'characters' | 'sentences';
  };
  stringReversalConfig?: {
    inputString: string;         // String to reverse
    caseSensitive?: boolean;
  };
  arithmeticConfig?: {
    expression: string;          // e.g., "123 * 456"
    expectedResult: number;      // e.g., 56088
    extractPattern?: string;     // Regex to extract answer from response
  };
  listSortConfig?: {
    inputList: string[];         // List to sort
    sortOrder: 'ascending' | 'descending' | 'alphabetical';
  };

  // Benchmark evaluation configs (auto-generation)
  stringReversalBenchmarkConfig?: {
    count: number;               // Number of test cases (5-50)
    minLength: number;           // Min string length (2-50)
    maxLength: number;           // Max string length (2-50)
    charType: 'random' | 'words' | 'mixed';
    caseSensitive?: boolean;
    seed?: string;                // Optional deterministic seed for reproducible test cases
    passThreshold: number;       // 0-100%, percentage required to pass
  };
  arithmeticBenchmarkConfig?: {
    count: number;               // Number of test cases (5-50)
    operators: ('+' | '-' | '*' | '/')[];
    minOperand: number;          // Min value for operands (1-999)
    maxOperand: number;          // Max value for operands (1-999)
    complexity: 'simple' | 'moderate' | 'complex';
    seed?: string;                // Optional deterministic seed for reproducible test cases
    passThreshold: number;       // 0-100%, percentage required to pass
  };
}

export interface LLMJudgeConfig {
  criteria?: string;
  rubric?: Record<string, string>;
}

export interface PairwiseConfig {
  compareAcrossVersions: boolean;
  compareAcrossModels: boolean;
  preferredModels?: string[];
}

export interface EvaluationConfig {
  methods: EvaluationMethod[];
  machineJudge?: MachineJudgeConfig;
  llmJudge?: LLMJudgeConfig;
  pairwise?: PairwiseConfig;
}

// Gallery selections for static showcase export
export type GallerySelectionType = 'run' | 'prompt' | 'response';

export interface GallerySelection {
  id: string;
  key: string;
  type: GallerySelectionType;
  runId: string;
  promptId?: string;
  responseId?: string;
  createdAt: string;
}

// ============================================
// Prompt Step (building block for all prompts)
// ============================================

export interface PromptStep {
  id: string;                    // "step-1", "step-2", etc.
  sequence: number;              // 1-based execution order (1-10)
  content: string;               // The prompt text for this step
  expectedAnswer?: string;       // Expected response (optional, for evaluation)
  evaluationConfig?: EvaluationConfig; // Step-specific eval (optional)
}

export interface Prompt {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  description?: string;

  // Steps array - replaces single content field
  // Single-step prompts have 1 step, multi-turn conversations have 2-10 steps
  steps: PromptStep[];

  // DEPRECATED: Use steps[0].content instead
  // Kept for backward compatibility during migration
  content?: string;
  // DEPRECATED: Use steps[0].expectedAnswer instead
  expectedAnswer?: string;

  attachments: Attachment[];
  evaluationConfig: EvaluationConfig;
  // Link to rubric for evaluation (optional, uses default if not set)
  rubricId?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper functions for prompt type checking
export function isSingleStepPrompt(prompt: Prompt): boolean {
  return prompt.steps.length === 1;
}

export function isMultiTurnPrompt(prompt: Prompt): boolean {
  return prompt.steps.length > 1;
}

// Get prompt content (for backward compatibility)
export function getPromptContent(prompt: Prompt): string {
  if (prompt.steps && prompt.steps.length > 0) {
    return prompt.steps[0].content;
  }
  return prompt.content || '';
}

// Get expected answer (for backward compatibility)
export function getExpectedAnswer(prompt: Prompt): string | undefined {
  if (prompt.steps && prompt.steps.length > 0) {
    return prompt.steps[0].expectedAnswer;
  }
  return prompt.expectedAnswer;
}

export interface Model {
  id: string;
  provider: Provider;
  modelId: string;
  displayName: string;
  supportsVision: boolean;
  supportsAudio: boolean;
  maxTokens: number;
  config: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
  isActive: boolean;
  createdAt: string;
  
  // NEW: Size classification (auto-detected or manual)
  sizeClass?: ModelSizeClass;
  
  // NEW: Reasoning capability (model's native capability)
  reasoningCapability?: ReasoningCapability;
  
  // NEW: Context window size in tokens
  contextWindow?: number;
  
  // NEW: Known parameter count (e.g., "70B", "8x22B")
  parameters?: string;
}

export interface Run {
  id: string;
  name: string;
  promptIds: string[];           // All prompts to run (single-step and multi-step)
  /** @deprecated No longer used - multi-turn prompts are in promptIds */
  sequenceIds?: string[];        // DEPRECATED: kept for backward compat
  modelIds: string[];
  iterations: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelRequested?: boolean;
  results: Result[];
  evaluations: Evaluation[];
  comparisons: PairwiseComparison[];
}

export interface Result {
  id: string;
  runId: string;
  promptId: string;
  modelId: string;
  iteration: number;
  response: string;
  latencyMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  error?: string;
  createdAt: string;

  // Reasoning level used for this specific generation
  reasoningUsed?: ReasoningUsed;

  // Multi-turn conversation fields
  // For multi-step prompts, stepIndex indicates which step this result is for
  stepIndex?: number;            // 0-based index into prompt.steps[]

  /** @deprecated Use promptId + stepIndex instead */
  sequenceId?: string;           // DEPRECATED: kept for backward compat
}

export interface Evaluation {
  id: string;
  resultId: string;
  method: EvaluationMethod;
  // Human evaluation
  humanScore?: number;
  humanNotes?: string;
  // LLM judge
  llmJudgeModel?: string;
  llmScores?: Record<string, number>;
  llmOverall?: number;
  llmRationale?: string;
  // Machine judge
  machinePass?: boolean;
  machineDetails?: string;
  // Computable evaluation numeric value (for statistics)
  machineNumericValue?: number;
  createdAt: string;
}

export interface PairwiseComparison {
  id: string;
  resultAId: string;
  resultBId: string;
  promptId: string;
  method: 'human' | 'llm-judge';
  winner: 'a' | 'b' | 'tie';
  confidence?: number;
  rationale?: string;
  evaluatorModel?: string;
  createdAt: string;
}

export interface JudgeConfig {
  modelId: string;
  temperature: number;
  // Multiple judge runs for reliability
  runs: number;
  // Whether to show detailed reasoning
  includeReasoning: boolean;
}

export interface Settings {
  apiKeys: {
    openai?: string;
    google?: string;
    openrouter?: string;
  };
  defaults: {
    llmJudgeModel: string;
    iterations: number;
    temperature: number;
    // Default rubric for new prompts
    defaultRubricId?: string;
  };
  // Judge configuration
  judge?: JudgeConfig;
  ollamaBaseUrl: string;
}

// Aggregated scores for display
export interface AggregatedScore {
  promptId: string;
  modelId: string;
  human: {
    average: number;
    count: number;
  };
  llmJudge: {
    average: number;
    byDimension: Record<string, number>;
    count: number;
  };
  machine: {
    passRate: number;
    count: number;
  };
  pairwise: {
    winRate: number;
    count: number;
  };
}

// ResponseViewer types
export type ViewerLayoutMode = 'single' | '2-col' | '3-col' | 'n-col';
export type ViewerHeightMode = 'full' | 'compact';
export type ColumnPreset = 'equal' | '1/3-2/3' | '2/3-1/3' | '1/4-3/4' | '3/4-1/4' | 'custom';
export type IterationViewMode = 'carousel' | 'side-by-side';

export interface ViewerMetadataToggles {
  // Prompt section
  showPrompt: boolean;
  showExpectedAnswer: boolean;
  showPromptTokens: boolean;
  
  // Response header
  showModelName: boolean;
  showProvider: boolean;
  showSizeClass: boolean;
  showReasoning: boolean;
  showContextWindow: boolean;
  
  // Response footer
  showResponseTokens: boolean;
  showLatency: boolean;
  showIteration: boolean;
  showRunDate: boolean;
  showCost: boolean;
  showScore: boolean;
  showTemperature: boolean;
}

export interface ViewerContentSettings {
  renderMarkdown: boolean;
  syntaxHighlight: boolean;
  wordWrap: boolean;
  syncScroll: boolean;
}

export interface ViewerPreferences {
  layout: ViewerLayoutMode;
  height: ViewerHeightMode;
  columnPreset: ColumnPreset;
  customColumnWidths?: number[]; // percentages
  slideshowMode: boolean; // Page through responses vs scroll all
  iterationMode: IterationViewMode; // How to display multiple iterations
  metadata: ViewerMetadataToggles;
  content: ViewerContentSettings;
}

// Response data for viewer
export interface ViewerResponse {
  id: string;
  content: string;
  
  // Model info
  modelId: string;
  modelName: string;
  provider: Provider;
  sizeClass?: ModelSizeClass;
  reasoningCapability?: ReasoningCapability;
  contextWindow?: number;
  parameters?: string;
  
  // Prompt info (for cross-prompt views)
  promptId?: string;
  promptTitle?: string;
  promptCategory?: string;
  
  // Generation info
  reasoningUsed?: ReasoningUsed;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs?: number;
  costUsd?: number;
  temperature?: number;
  
  // Run info
  iteration: number;
  totalIterations: number;
  runId: string;
  runDate: string;
  
  // Evaluation info
  evaluated: boolean;
  score?: number;
  evaluationMethod?: EvaluationMethod;
}

export interface ViewerPrompt {
  id: string;
  title: string;
  // For backward compatibility, content is optional when steps is used
  content?: string;
  steps?: PromptStep[];
  expectedAnswer?: string;
  tokensEstimate?: number;
  category?: string;
}

// ============================================
// DEPRECATED: PromptSequence
// ============================================
//
// PromptSequence is now deprecated. Use Prompt with multiple steps instead.
// A Prompt with steps.length > 1 is a multi-turn conversation.
// This type is kept temporarily for migration purposes only.
//
// To migrate: convert PromptSequence to Prompt with steps array

/**
 * @deprecated Use Prompt with steps[] instead
 */
export interface PromptSequence {
  id: string;                    // "seq-abc123"
  title: string;                 // "Code Review Conversation"
  description?: string;          // What this sequence tests
  category: string;              // Inherited by all steps
  keywords: string[];
  steps: PromptStep[];           // 1-10 steps
  evaluationConfig: EvaluationConfig; // Sequence-level evaluation
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Computable Evaluation Statistics
// ============================================

export interface ComputableStats {
  values: number[];              // Individual measurements
  average: number;
  min: number;
  max: number;
  stdDev: number;
  target?: number;               // Expected value if applicable
}

// Machine judge result with optional numeric value for stats
export interface MachineJudgeResult {
  pass: boolean;
  details: string;
  numericValue?: number;         // For computable evals (word count, etc.)
}
