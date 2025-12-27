/**
 * Model Metadata Utilities
 * 
 * Auto-detection of model properties based on model IDs and provider.
 * This provides reasonable defaults that can be overridden manually.
 */

import type { ModelSizeClass, ReasoningCapability, Provider } from './types';

interface ModelMetadata {
  sizeClass: ModelSizeClass;
  reasoningCapability: ReasoningCapability;
  contextWindow?: number;
  parameters?: string;
}

// Known model patterns for auto-detection
const MODEL_PATTERNS: {
  pattern: RegExp;
  metadata: Partial<ModelMetadata>;
}[] = [
  // OpenAI Frontier
  { pattern: /gpt-4o(?!-mini)/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 128000 } },
  { pattern: /gpt-4-turbo/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 128000 } },
  { pattern: /gpt-4(?!o|-turbo)/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 8192 } },
  
  // OpenAI Flash
  { pattern: /gpt-4o-mini/i, metadata: { sizeClass: 'flash', reasoningCapability: 'none', contextWindow: 128000 } },
  { pattern: /gpt-3\.5-turbo/i, metadata: { sizeClass: 'flash', reasoningCapability: 'none', contextWindow: 16384 } },
  
  // OpenAI Reasoning
  { pattern: /o1-preview/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'reasoning', contextWindow: 128000 } },
  { pattern: /o1-mini/i, metadata: { sizeClass: 'flash', reasoningCapability: 'reasoning', contextWindow: 128000 } },
  { pattern: /o1(?!-)/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'reasoning', contextWindow: 200000 } },
  { pattern: /o3-mini/i, metadata: { sizeClass: 'flash', reasoningCapability: 'hybrid', contextWindow: 200000 } },
  { pattern: /o3(?!-)/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'hybrid', contextWindow: 200000 } },
  
  // Anthropic Frontier
  { pattern: /claude-3-5-sonnet/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 200000 } },
  { pattern: /claude-3-opus/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 200000 } },
  { pattern: /claude-3-sonnet/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 200000 } },
  { pattern: /claude-sonnet-4/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'hybrid', contextWindow: 200000 } },
  { pattern: /claude-opus-4/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'hybrid', contextWindow: 200000 } },
  
  // Anthropic Flash
  { pattern: /claude-3-5-haiku/i, metadata: { sizeClass: 'flash', reasoningCapability: 'none', contextWindow: 200000 } },
  { pattern: /claude-3-haiku/i, metadata: { sizeClass: 'flash', reasoningCapability: 'none', contextWindow: 200000 } },
  { pattern: /claude-haiku-4/i, metadata: { sizeClass: 'flash', reasoningCapability: 'hybrid', contextWindow: 200000 } },
  
  // Google Frontier
  { pattern: /gemini-1\.5-pro/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 2000000 } },
  { pattern: /gemini-pro/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 32000 } },
  { pattern: /gemini-2\.0-flash-thinking/i, metadata: { sizeClass: 'flash', reasoningCapability: 'reasoning', contextWindow: 1000000 } },
  
  // Google Flash
  { pattern: /gemini-1\.5-flash/i, metadata: { sizeClass: 'flash', reasoningCapability: 'none', contextWindow: 1000000 } },
  { pattern: /gemini-2\.0-flash(?!-thinking)/i, metadata: { sizeClass: 'flash', reasoningCapability: 'none', contextWindow: 1000000 } },
  
  // DeepSeek
  { pattern: /deepseek-r1/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'reasoning', contextWindow: 64000, parameters: '671B' } },
  { pattern: /deepseek-v3/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 64000, parameters: '671B' } },
  { pattern: /deepseek-coder/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 128000 } },
  
  // Llama models by size
  { pattern: /llama.*405b/i, metadata: { sizeClass: '200b+', reasoningCapability: 'none', parameters: '405B' } },
  { pattern: /llama.*70b/i, metadata: { sizeClass: '35-70b', reasoningCapability: 'none', parameters: '70B' } },
  { pattern: /llama.*32b/i, metadata: { sizeClass: '14-34b', reasoningCapability: 'none', parameters: '32B' } },
  { pattern: /llama.*13b/i, metadata: { sizeClass: '7-14b', reasoningCapability: 'none', parameters: '13B' } },
  { pattern: /llama.*8b/i, metadata: { sizeClass: '7-14b', reasoningCapability: 'none', parameters: '8B' } },
  { pattern: /llama.*7b/i, metadata: { sizeClass: '3-7b', reasoningCapability: 'none', parameters: '7B' } },
  { pattern: /llama.*3b/i, metadata: { sizeClass: '1-3b', reasoningCapability: 'none', parameters: '3B' } },
  { pattern: /llama.*1b/i, metadata: { sizeClass: 'sub-1b', reasoningCapability: 'none', parameters: '1B' } },
  
  // Qwen models
  { pattern: /qwen.*72b/i, metadata: { sizeClass: '35-70b', reasoningCapability: 'none', parameters: '72B' } },
  { pattern: /qwen.*32b/i, metadata: { sizeClass: '14-34b', reasoningCapability: 'none', parameters: '32B' } },
  { pattern: /qwen.*14b/i, metadata: { sizeClass: '7-14b', reasoningCapability: 'none', parameters: '14B' } },
  { pattern: /qwen.*7b/i, metadata: { sizeClass: '3-7b', reasoningCapability: 'none', parameters: '7B' } },
  { pattern: /qwen.*3b/i, metadata: { sizeClass: '1-3b', reasoningCapability: 'none', parameters: '3B' } },
  { pattern: /qwen.*1\.8b/i, metadata: { sizeClass: '1-3b', reasoningCapability: 'none', parameters: '1.8B' } },
  { pattern: /qwen.*0\.5b/i, metadata: { sizeClass: 'sub-1b', reasoningCapability: 'none', parameters: '0.5B' } },
  { pattern: /qwq/i, metadata: { sizeClass: '14-34b', reasoningCapability: 'reasoning', parameters: '32B' } },
  
  // Mistral models
  { pattern: /mistral.*large/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 128000 } },
  { pattern: /mixtral.*8x22b/i, metadata: { sizeClass: '100-200b', reasoningCapability: 'none', parameters: '8x22B', contextWindow: 65000 } },
  { pattern: /mixtral.*8x7b/i, metadata: { sizeClass: '35-70b', reasoningCapability: 'none', parameters: '8x7B', contextWindow: 32000 } },
  { pattern: /mistral.*7b/i, metadata: { sizeClass: '3-7b', reasoningCapability: 'none', parameters: '7B' } },
  { pattern: /mistral.*small/i, metadata: { sizeClass: 'flash', reasoningCapability: 'none', contextWindow: 128000 } },
  { pattern: /codestral/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 32000 } },
  
  // Phi models
  { pattern: /phi-4/i, metadata: { sizeClass: '7-14b', reasoningCapability: 'none', parameters: '14B' } },
  { pattern: /phi-3.*medium/i, metadata: { sizeClass: '7-14b', reasoningCapability: 'none', parameters: '14B' } },
  { pattern: /phi-3.*small/i, metadata: { sizeClass: '3-7b', reasoningCapability: 'none', parameters: '7B' } },
  { pattern: /phi-3.*mini/i, metadata: { sizeClass: '1-3b', reasoningCapability: 'none', parameters: '3.8B' } },
  { pattern: /phi-2/i, metadata: { sizeClass: '1-3b', reasoningCapability: 'none', parameters: '2.7B' } },
  
  // Command models (Cohere)
  { pattern: /command-r-plus/i, metadata: { sizeClass: 'frontier', reasoningCapability: 'none', contextWindow: 128000 } },
  { pattern: /command-r(?!-plus)/i, metadata: { sizeClass: 'flash', reasoningCapability: 'none', contextWindow: 128000 } },
  
  // Gemma
  { pattern: /gemma.*27b/i, metadata: { sizeClass: '14-34b', reasoningCapability: 'none', parameters: '27B' } },
  { pattern: /gemma.*9b/i, metadata: { sizeClass: '7-14b', reasoningCapability: 'none', parameters: '9B' } },
  { pattern: /gemma.*7b/i, metadata: { sizeClass: '3-7b', reasoningCapability: 'none', parameters: '7B' } },
  { pattern: /gemma.*2b/i, metadata: { sizeClass: '1-3b', reasoningCapability: 'none', parameters: '2B' } },
  
  // Generic size patterns (fallback)
  { pattern: /(\d+)x(\d+)b/i, metadata: { sizeClass: 'unknown', reasoningCapability: 'none' } }, // Will be calculated
  { pattern: /(\d+)b(?!yte)/i, metadata: { sizeClass: 'unknown', reasoningCapability: 'none' } }, // Will be calculated
];

/**
 * Extract parameter size from model ID and determine size class
 */
function extractSizeFromModelId(modelId: string): { sizeClass: ModelSizeClass; parameters?: string } {
  // Check for MoE pattern (e.g., 8x7B, 8x22B)
  const moeMatch = modelId.match(/(\d+)x(\d+)b/i);
  if (moeMatch) {
    const experts = parseInt(moeMatch[1]);
    const sizePerExpert = parseInt(moeMatch[2]);
    const totalParams = experts * sizePerExpert;
    const parameters = `${experts}x${sizePerExpert}B`;
    
    if (totalParams >= 200) return { sizeClass: '200b+', parameters };
    if (totalParams >= 100) return { sizeClass: '100-200b', parameters };
    if (totalParams >= 70) return { sizeClass: '70-100b', parameters };
    if (totalParams >= 35) return { sizeClass: '35-70b', parameters };
    if (totalParams >= 14) return { sizeClass: '14-34b', parameters };
    if (totalParams >= 7) return { sizeClass: '7-14b', parameters };
    return { sizeClass: '3-7b', parameters };
  }
  
  // Check for standard size pattern (e.g., 70B, 7b)
  const sizeMatch = modelId.match(/(\d+(?:\.\d+)?)\s*b(?:illion)?(?!yte)/i);
  if (sizeMatch) {
    const size = parseFloat(sizeMatch[1]);
    const parameters = `${size}B`;
    
    if (size >= 200) return { sizeClass: '200b+', parameters };
    if (size >= 100) return { sizeClass: '100-200b', parameters };
    if (size >= 70) return { sizeClass: '70-100b', parameters };
    if (size >= 35) return { sizeClass: '35-70b', parameters };
    if (size >= 14) return { sizeClass: '14-34b', parameters };
    if (size >= 7) return { sizeClass: '7-14b', parameters };
    if (size >= 3) return { sizeClass: '3-7b', parameters };
    if (size >= 1) return { sizeClass: '1-3b', parameters };
    return { sizeClass: 'sub-1b', parameters };
  }
  
  return { sizeClass: 'unknown' };
}

/**
 * Get model metadata based on model ID and provider
 */
export function getModelMetadata(modelId: string, provider?: Provider): ModelMetadata {
  // Check known patterns first
  for (const { pattern, metadata } of MODEL_PATTERNS) {
    if (pattern.test(modelId)) {
      // If sizeClass is unknown, try to extract from model ID
      if (metadata.sizeClass === 'unknown') {
        const extracted = extractSizeFromModelId(modelId);
        return {
          sizeClass: extracted.sizeClass,
          reasoningCapability: metadata.reasoningCapability || 'none',
          contextWindow: metadata.contextWindow,
          parameters: extracted.parameters || metadata.parameters,
        };
      }
      
      return {
        sizeClass: metadata.sizeClass || 'unknown',
        reasoningCapability: metadata.reasoningCapability || 'none',
        contextWindow: metadata.contextWindow,
        parameters: metadata.parameters,
      };
    }
  }
  
  // Fallback: try to extract size from model ID
  const extracted = extractSizeFromModelId(modelId);
  
  return {
    sizeClass: extracted.sizeClass,
    reasoningCapability: 'none',
    parameters: extracted.parameters,
  };
}

/**
 * Get display label for size class
 */
export function getSizeClassLabel(sizeClass: ModelSizeClass): string {
  const labels: Record<ModelSizeClass, string> = {
    'frontier': 'Frontier',
    'flash': 'Flash',
    'lite': 'Lite',
    'sub-1b': '<1B',
    '1-3b': '1-3B',
    '3-7b': '3-7B',
    '7-14b': '7-14B',
    '14-34b': '14-34B',
    '35-70b': '35-70B',
    '70-100b': '70-100B',
    '100-200b': '100-200B',
    '200b+': '200B+',
    'unknown': '?',
  };
  return labels[sizeClass];
}

/**
 * Get color class for size badge
 */
export function getSizeClassColor(sizeClass: ModelSizeClass): string {
  const colors: Record<ModelSizeClass, string> = {
    'frontier': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'flash': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'lite': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'sub-1b': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    '1-3b': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    '3-7b': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    '7-14b': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    '14-34b': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    '35-70b': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    '70-100b': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    '100-200b': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    '200b+': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    'unknown': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  };
  return colors[sizeClass];
}

/**
 * Get display label for reasoning capability
 */
export function getReasoningLabel(capability: ReasoningCapability): string {
  const labels: Record<ReasoningCapability, string> = {
    'none': '',
    'reasoning': '🧠 Reasoning',
    'hybrid': '🧠 Hybrid',
  };
  return labels[capability];
}

/**
 * Get color class for reasoning badge
 */
export function getReasoningColor(capability: ReasoningCapability): string {
  const colors: Record<ReasoningCapability, string> = {
    'none': '',
    'reasoning': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    'hybrid': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  };
  return colors[capability];
}

/**
 * Format context window for display
 */
export function formatContextWindow(tokens?: number): string {
  if (!tokens) return '';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M ctx`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K ctx`;
  return `${tokens} ctx`;
}

/**
 * Format latency for display
 */
export function formatLatency(ms?: number): string {
  if (!ms) return '';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

/**
 * Format token count for display
 */
export function formatTokens(tokens?: number): string {
  if (!tokens) return '';
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${tokens}`;
}

/**
 * Format cost for display
 */
export function formatCost(usd?: number): string {
  if (!usd) return '';
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`;
  if (usd < 0.01) return `$${(usd * 100).toFixed(2)}¢`;
  return `$${usd.toFixed(4)}`;
}
