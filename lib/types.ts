// Core types for Model Vibe Check

export type EvaluationMethod = 'human' | 'llm-judge' | 'machine' | 'pairwise';

export type Provider = 'ollama' | 'openai' | 'google' | 'openrouter';

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
  };
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
