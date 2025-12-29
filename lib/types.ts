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
  type: 'contains' | 'regex' | 'exact' | 'json-schema' | 'custom';
  criteria: string;
  caseSensitive?: boolean;
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

export interface Prompt {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  description?: string;
  content: string;
  expectedAnswer?: string;
  attachments: Attachment[];
  evaluationConfig: EvaluationConfig;
  // Link to rubric for evaluation (optional, uses default if not set)
  rubricId?: string;
  createdAt: string;
  updatedAt: string;
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
  promptIds: string[];
  modelIds: string[];
  iterations: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
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
  
  // NEW: Reasoning level used for this specific generation
  reasoningUsed?: ReasoningUsed;
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
  content: string;
  expectedAnswer?: string;
  tokensEstimate?: number;
  category?: string;
}
