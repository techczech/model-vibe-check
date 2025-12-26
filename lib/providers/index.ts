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

// Read attachment content
async function readAttachment(attachment: Attachment): Promise<string | null> {
  try {
    const filePath = path.join(process.cwd(), attachment.path);
    
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
): Promise<Array<{ role: "user"; content: string | Array<{ type: string; text?: string; image?: { url: string } }> }>> {
  // Get text content first
  const textPrompt = await buildPromptWithAttachments(prompt, attachments);
  
  // If no vision support or no images, return simple text message
  const imageAttachments = attachments.filter((a) => a.type === "image");
  if (!supportsVision || imageAttachments.length === 0) {
    return [{ role: "user", content: textPrompt }];
  }

  // Build multimodal message with images
  const contentParts: Array<{ type: string; text?: string; image?: { url: string } }> = [];
  
  // Add text first
  contentParts.push({ type: "text", text: textPrompt });
  
  // Add images
  for (const att of imageAttachments) {
    const dataUrl = await readAttachment(att);
    if (dataUrl) {
      contentParts.push({
        type: "image",
        image: { url: dataUrl },
      });
    }
  }

  return [{ role: "user", content: contentParts }];
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

// Get available Ollama models
export async function getOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const ollama = new Ollama({ host: baseUrl });
    const response = await ollama.list();
    return response.models.map((m) => m.name);
  } catch {
    return [];
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
