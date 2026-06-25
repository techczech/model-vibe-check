import { NextRequest, NextResponse } from "next/server";
import { getRuntimeSettings } from "@/lib/storage";
import { discoverModels } from "@/lib/providers";

// Cache for model discovery results (5 minute TTL)
const modelCache: Map<string, { data: unknown; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const validProviders = ["ollama", "openai", "google", "openrouter"];
  
  if (!validProviders.includes(provider)) {
    return NextResponse.json(
      { error: `Invalid provider: ${provider}` },
      { status: 400 }
    );
  }

  // Check cache
  const cached = modelCache.get(provider);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const settings = await getRuntimeSettings();
    const result = await discoverModels(provider, settings);
    
    // Cache the result
    modelCache.set(provider, { data: result, timestamp: Date.now() });
    
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        provider,
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        models: [],
      },
      { status: 500 }
    );
  }
}

// Allow clearing cache via POST (for refresh button)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  
  // Clear cache for this provider
  modelCache.delete(provider);
  
  // Re-fetch
  return GET(request, { params });
}
