import { promises as fs } from "fs";
import path from "path";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Ollama } from "ollama";
import type { Model, Attachment, Settings } from "../types";

export interface ExecutionResult {
  response: string;
  latencyMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  error?: string;
}

// Message types for multi-turn conversations
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const ATTACHMENTS_ROOT = path.resolve(process.cwd(), "attachments");

function resolveAttachmentPath(attachment: Attachment): string | null {
  const absolutePath = path.resolve(process.cwd(), attachment.path);
  const relativePath = path.relative(ATTACHMENTS_ROOT, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    console.warn(`Attachment path outside attachments directory: ${attachment.path}`);
    return null;
  }
  return absolutePath;
}

// Read attachment content
async function readAttachment(attachment: Attachment): Promise<string | null> {
  try {
    const filePath = resolveAttachmentPath(attachment);
    if (!filePath) return null;

    if (attachment.type === "text" || attachment.type === "document") {
      const content = await fs.readFile(filePath, "utf-8");
      return content;
    }

    if (attachment.type === "image") {
      const buffer = await fs.readFile(filePath);
      const base64 = buffer.toString("base64");
      const mimeType = attachment.mimeType || "image/png";
      return `data:${mimeType};base64,${base64}`;
    }

    return null;
  } catch (error) {
    console.error(`Failed to read attachment ${attachment.path}:`, error);
    return null;
  }
}

// Build prompt with text attachments
async function buildPromptWithAttachments(
  prompt: string,
  attachments: Attachment[]
): Promise<string> {
  const textAttachments = attachments.filter(
    (a) => a.type === "text" || a.type === "document"
  );
  
  if (textAttachments.length === 0) {
    return prompt;
  }

  let fullPrompt = prompt;
  
  for (const att of textAttachments) {
    const content = await readAttachment(att);
    if (content) {
      fullPrompt += `\n\n---\n\n**Attached: ${att.filename}**\n\n${content}`;
    }
  }

  return fullPrompt;
}

// Build messages with images for vision models
async function buildMessagesWithImages(
  prompt: string,
  attachments: Attachment[],
  supportsVision: boolean
) {
  // Get text content first
  const textPrompt = await buildPromptWithAttachments(prompt, attachments);
  
  // If no vision support or no images, return simple text message
  const imageAttachments = attachments.filter((a) => a.type === "image");
  if (!supportsVision || imageAttachments.length === 0) {
    return [{ role: "user" as const, content: textPrompt }];
  }

  // Build multimodal message with images
  const contentParts: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [];
  
  // Add text first
  contentParts.push({ type: "text" as const, text: textPrompt });
  
  // Add images - image should be the data URL string directly, not wrapped in an object
  for (const att of imageAttachments) {
    const dataUrl = await readAttachment(att);
    if (dataUrl) {
      contentParts.push({
        type: "image" as const,
        image: dataUrl,  // Direct string, not { url: dataUrl }
      });
    }
  }

  return [{ role: "user" as const, content: contentParts }];
}

// Retry configuration
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_ERRORS = [
  "rate limit",
  "timeout",
  "ECONNRESET",
  "ETIMEDOUT",
  "503",
  "529",
  "overloaded",
];

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return RETRYABLE_ERRORS.some((e) => message.includes(e.toLowerCase()));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executePrompt(
  prompt: string,
  model: Model,
  attachments: Attachment[],
  settings: Settings,
  retries: number = DEFAULT_RETRIES
): Promise<ExecutionResult> {
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      switch (model.provider) {
        case "ollama":
          return await executeOllama(prompt, model, attachments, settings);
        case "openai":
          return await executeOpenAI(prompt, model, attachments, settings);
        case "google":
          return await executeGoogle(prompt, model, attachments, settings);
        case "openrouter":
          return await executeOpenRouter(prompt, model, attachments, settings);
        default:
          throw new Error(`Unknown provider: ${model.provider}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Only retry on transient errors
      if (attempt < retries && isRetryableError(error)) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
        console.log(`Retry ${attempt + 1}/${retries} for ${model.displayName} after ${delay}ms: ${lastError.message}`);
        await sleep(delay);
        continue;
      }
      
      // Non-retryable error or out of retries
      break;
    }
  }

  return {
    response: "",
    latencyMs: Date.now() - startTime,
    error: lastError?.message || "Unknown error",
  };
}

/**
 * Execute a multi-turn conversation with a model
 * Messages are sent as a conversation history to maintain context
 */
export async function executeConversation(
  messages: ConversationMessage[],
  model: Model,
  settings: Settings,
  retries: number = DEFAULT_RETRIES
): Promise<ExecutionResult> {
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      switch (model.provider) {
        case "ollama":
          return await executeOllamaConversation(messages, model, settings);
        case "openai":
          return await executeOpenAIConversation(messages, model, settings);
        case "google":
          return await executeGoogleConversation(messages, model, settings);
        case "openrouter":
          return await executeOpenRouterConversation(messages, model, settings);
        default:
          throw new Error(`Unknown provider: ${model.provider}`);
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries && isRetryableError(error)) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.log(`Retry ${attempt + 1}/${retries} for ${model.displayName} after ${delay}ms: ${lastError.message}`);
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  return {
    response: "",
    latencyMs: Date.now() - startTime,
    error: lastError?.message || "Unknown error",
  };
}

async function executeOllamaConversation(
  messages: ConversationMessage[],
  model: Model,
  settings: Settings
): Promise<ExecutionResult> {
  const ollama = new Ollama({ host: settings.ollamaBaseUrl });
  const startTime = Date.now();

  const response = await ollama.chat({
    model: model.modelId,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    options: {
      temperature: model.config.temperature ?? settings.defaults.temperature,
    },
  });

  return {
    response: response.message.content,
    latencyMs: Date.now() - startTime,
    tokensInput: response.prompt_eval_count,
    tokensOutput: response.eval_count,
  };
}

async function executeOpenAIConversation(
  messages: ConversationMessage[],
  model: Model,
  settings: Settings
): Promise<ExecutionResult> {
  if (!settings.apiKeys.openai) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = createOpenAI({ apiKey: settings.apiKeys.openai });
  const startTime = Date.now();

  const result = await generateText({
    model: openai(model.modelId),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: model.config.temperature ?? settings.defaults.temperature,
    maxTokens: model.config.maxOutputTokens,
  });

  return {
    response: result.text,
    latencyMs: Date.now() - startTime,
    tokensInput: result.usage?.promptTokens,
    tokensOutput: result.usage?.completionTokens,
  };
}

async function executeGoogleConversation(
  messages: ConversationMessage[],
  model: Model,
  settings: Settings
): Promise<ExecutionResult> {
  if (!settings.apiKeys.google) {
    throw new Error("Google API key not configured");
  }

  const google = createGoogleGenerativeAI({ apiKey: settings.apiKeys.google });
  const startTime = Date.now();

  const result = await generateText({
    model: google(model.modelId),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: model.config.temperature ?? settings.defaults.temperature,
    maxTokens: model.config.maxOutputTokens,
  });

  return {
    response: result.text,
    latencyMs: Date.now() - startTime,
    tokensInput: result.usage?.promptTokens,
    tokensOutput: result.usage?.completionTokens,
  };
}

async function executeOpenRouterConversation(
  messages: ConversationMessage[],
  model: Model,
  settings: Settings
): Promise<ExecutionResult> {
  if (!settings.apiKeys.openrouter) {
    throw new Error("OpenRouter API key not configured");
  }

  const openrouter = createOpenAI({
    apiKey: settings.apiKeys.openrouter,
    baseURL: "https://openrouter.ai/api/v1",
  });
  const startTime = Date.now();

  const result = await generateText({
    model: openrouter(model.modelId),
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: model.config.temperature ?? settings.defaults.temperature,
    maxTokens: model.config.maxOutputTokens,
  });

  return {
    response: result.text,
    latencyMs: Date.now() - startTime,
    tokensInput: result.usage?.promptTokens,
    tokensOutput: result.usage?.completionTokens,
  };
}

async function executeOllama(
  prompt: string,
  model: Model,
  attachments: Attachment[],
  settings: Settings
): Promise<ExecutionResult> {
  const ollama = new Ollama({ host: settings.ollamaBaseUrl });
  const startTime = Date.now();

  // Build prompt with text attachments
  const fullPrompt = await buildPromptWithAttachments(prompt, attachments);

  // Handle images for vision models
  const images: string[] = [];
  if (model.supportsVision) {
    const imageAttachments = attachments.filter((a) => a.type === "image");
    for (const att of imageAttachments) {
      const dataUrl = await readAttachment(att);
      if (dataUrl) {
        // Ollama expects base64 without the data URL prefix
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        images.push(base64);
      }
    }
  }

  const response = await ollama.generate({
    model: model.modelId,
    prompt: fullPrompt,
    images: images.length > 0 ? images : undefined,
    options: {
      temperature: model.config.temperature ?? settings.defaults.temperature,
    },
  });

  return {
    response: response.response,
    latencyMs: Date.now() - startTime,
    tokensInput: response.prompt_eval_count,
    tokensOutput: response.eval_count,
  };
}

async function executeOpenAI(
  prompt: string,
  model: Model,
  attachments: Attachment[],
  settings: Settings
): Promise<ExecutionResult> {
  if (!settings.apiKeys.openai) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = createOpenAI({ apiKey: settings.apiKeys.openai });
  const startTime = Date.now();

  const messages = await buildMessagesWithImages(prompt, attachments, model.supportsVision);

  const result = await generateText({
    model: openai(model.modelId),
    messages,
    temperature: model.config.temperature ?? settings.defaults.temperature,
    maxTokens: model.config.maxOutputTokens,
  });

  return {
    response: result.text,
    latencyMs: Date.now() - startTime,
    tokensInput: result.usage?.promptTokens,
    tokensOutput: result.usage?.completionTokens,
  };
}

async function executeGoogle(
  prompt: string,
  model: Model,
  attachments: Attachment[],
  settings: Settings
): Promise<ExecutionResult> {
  if (!settings.apiKeys.google) {
    throw new Error("Google API key not configured");
  }

  const google = createGoogleGenerativeAI({ apiKey: settings.apiKeys.google });
  const startTime = Date.now();

  const messages = await buildMessagesWithImages(prompt, attachments, model.supportsVision);

  const result = await generateText({
    model: google(model.modelId),
    messages,
    temperature: model.config.temperature ?? settings.defaults.temperature,
    maxTokens: model.config.maxOutputTokens,
  });

  return {
    response: result.text,
    latencyMs: Date.now() - startTime,
    tokensInput: result.usage?.promptTokens,
    tokensOutput: result.usage?.completionTokens,
  };
}

async function executeOpenRouter(
  prompt: string,
  model: Model,
  attachments: Attachment[],
  settings: Settings
): Promise<ExecutionResult> {
  if (!settings.apiKeys.openrouter) {
    throw new Error("OpenRouter API key not configured");
  }

  // OpenRouter uses OpenAI-compatible API
  const openrouter = createOpenAI({
    apiKey: settings.apiKeys.openrouter,
    baseURL: "https://openrouter.ai/api/v1",
  });
  const startTime = Date.now();

  const messages = await buildMessagesWithImages(prompt, attachments, model.supportsVision);

  const result = await generateText({
    model: openrouter(model.modelId),
    messages,
    temperature: model.config.temperature ?? settings.defaults.temperature,
    maxTokens: model.config.maxOutputTokens,
  });

  return {
    response: result.text,
    latencyMs: Date.now() - startTime,
    tokensInput: result.usage?.promptTokens,
    tokensOutput: result.usage?.completionTokens,
  };
}

// ============================================
// Model Discovery Types and Functions
// ============================================

export interface DiscoveredModel {
  id: string;
  name: string;
  description?: string;
  contextWindow?: number;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  pricing?: {
    prompt?: number;  // per 1M tokens
    completion?: number;
  };
  size?: string;  // e.g., "7B", "70B"
}

export interface ProviderModelsResult {
  provider: string;
  connected: boolean;
  error?: string;
  models: DiscoveredModel[];
}

// Get available Ollama models (simple list)
export async function getOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const ollama = new Ollama({ host: baseUrl });
    const response = await ollama.list();
    return response.models.map((m) => m.name);
  } catch {
    return [];
  }
}

// Get detailed Ollama models for discovery
export async function discoverOllamaModels(baseUrl: string): Promise<ProviderModelsResult> {
  try {
    const ollama = new Ollama({ host: baseUrl });
    const response = await ollama.list();
    
    const models: DiscoveredModel[] = response.models.map((m) => {
      // Parse size from model details if available
      const sizeMatch = m.name.match(/(\d+)b/i);
      const size = sizeMatch ? `${sizeMatch[1]}B` : undefined;
      
      // Vision models typically have "vision" or "llava" in name
      const supportsVision = /vision|llava|bakllava/i.test(m.name);
      
      return {
        id: m.name,
        name: m.name.split(':')[0], // Remove tag
        description: `Local model · ${m.details?.parameter_size || 'Unknown size'}`,
        supportsVision,
        size: m.details?.parameter_size || size,
      };
    });
    
    return {
      provider: 'ollama',
      connected: true,
      models,
    };
  } catch (error) {
    return {
      provider: 'ollama',
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to connect to Ollama',
      models: [],
    };
  }
}

// Get available OpenAI models
export async function discoverOpenAIModels(apiKey: string): Promise<ProviderModelsResult> {
  if (!apiKey) {
    return {
      provider: 'openai',
      connected: false,
      error: 'API key not configured',
      models: [],
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter to chat-capable models and sort by relevance
    const chatModels = (data.data as Array<{ id: string; created: number }>)
      .filter((m) => {
        const id = m.id.toLowerCase();
        // Include GPT models, o1/o3 reasoning models
        return (
          id.startsWith('gpt-') ||
          id.startsWith('o1') ||
          id.startsWith('o3') ||
          id.startsWith('chatgpt')
        ) && !id.includes('instruct') && !id.includes('realtime');
      })
      .sort((a, b) => b.created - a.created);

    const models: DiscoveredModel[] = chatModels.map((m) => {
      const id = m.id;
      const supportsVision = id.includes('4o') || id.includes('gpt-4-turbo') || id.includes('vision');
      
      // Context window estimates
      let contextWindow = 128000;
      if (id.includes('gpt-3.5')) contextWindow = 16385;
      if (id.includes('o1') || id.includes('o3')) contextWindow = 200000;
      
      return {
        id,
        name: id,
        description: supportsVision ? 'Vision capable' : undefined,
        contextWindow,
        supportsVision,
      };
    });

    return {
      provider: 'openai',
      connected: true,
      models,
    };
  } catch (error) {
    return {
      provider: 'openai',
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to connect to OpenAI',
      models: [],
    };
  }
}

// Get available Google AI models
export async function discoverGoogleModels(apiKey: string): Promise<ProviderModelsResult> {
  if (!apiKey) {
    return {
      provider: 'google',
      connected: false,
      error: 'API key not configured',
      models: [],
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter to generative models
    const generativeModels = (data.models as Array<{
      name: string;
      displayName: string;
      description: string;
      inputTokenLimit?: number;
      supportedGenerationMethods?: string[];
    }>)
      .filter((m) => {
        // Only include models that support generateContent
        return m.supportedGenerationMethods?.includes('generateContent');
      });

    const models: DiscoveredModel[] = generativeModels.map((m) => {
      const id = m.name.replace('models/', '');
      const supportsVision = id.includes('vision') || id.includes('gemini-1.5') || id.includes('gemini-2');
      
      return {
        id,
        name: m.displayName || id,
        description: m.description,
        contextWindow: m.inputTokenLimit,
        supportsVision,
      };
    });

    return {
      provider: 'google',
      connected: true,
      models,
    };
  } catch (error) {
    return {
      provider: 'google',
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to connect to Google AI',
      models: [],
    };
  }
}

// Get available OpenRouter models
export async function discoverOpenRouterModels(apiKey: string): Promise<ProviderModelsResult> {
  if (!apiKey) {
    return {
      provider: 'openrouter',
      connected: false,
      error: 'API key not configured',
      models: [],
    };
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    const models: DiscoveredModel[] = (data.data as Array<{
      id: string;
      name: string;
      description?: string;
      context_length?: number;
      pricing?: { prompt: string; completion: string };
      architecture?: { modality?: string };
    }>).map((m) => {
      const supportsVision = m.architecture?.modality?.includes('image') || 
        m.id.includes('vision') || 
        m.name.toLowerCase().includes('vision');
      
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        contextWindow: m.context_length,
        supportsVision,
        pricing: m.pricing ? {
          prompt: parseFloat(m.pricing.prompt) * 1000000,
          completion: parseFloat(m.pricing.completion) * 1000000,
        } : undefined,
      };
    });

    // Sort by popularity/relevance - put major providers first
    const priorityProviders = ['anthropic', 'openai', 'google', 'meta-llama', 'mistralai'];
    models.sort((a, b) => {
      const aProvider = a.id.split('/')[0];
      const bProvider = b.id.split('/')[0];
      const aIndex = priorityProviders.indexOf(aProvider);
      const bIndex = priorityProviders.indexOf(bProvider);
      
      if (aIndex !== -1 && bIndex === -1) return -1;
      if (bIndex !== -1 && aIndex === -1) return 1;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.name.localeCompare(b.name);
    });

    return {
      provider: 'openrouter',
      connected: true,
      models,
    };
  } catch (error) {
    return {
      provider: 'openrouter',
      connected: false,
      error: error instanceof Error ? error.message : 'Failed to connect to OpenRouter',
      models: [],
    };
  }
}

// Unified discovery function
export async function discoverModels(
  provider: string,
  settings: Settings
): Promise<ProviderModelsResult> {
  switch (provider) {
    case 'ollama':
      return discoverOllamaModels(settings.ollamaBaseUrl);
    case 'openai':
      return discoverOpenAIModels(settings.apiKeys.openai || '');
    case 'google':
      return discoverGoogleModels(settings.apiKeys.google || '');
    case 'openrouter':
      return discoverOpenRouterModels(settings.apiKeys.openrouter || '');
    default:
      return {
        provider,
        connected: false,
        error: `Unknown provider: ${provider}`,
        models: [],
      };
  }
}

// Utility: check if attachment file exists
export async function attachmentExists(attachment: Attachment): Promise<boolean> {
  try {
    const filePath = path.join(process.cwd(), attachment.path);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
