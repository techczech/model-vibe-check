# Model Vibe Check — Architecture

> Qualitative LLM evaluation. See the responses, check the vibe.

## Version 0.1.0

## Core Philosophy

Most LLM benchmarks reduce outputs to numbers. But you can't check the vibe from a score. This tool is built around one idea: **you need to read the actual responses**.

- Browse responses by **Prompt**, **Model**, or **Category**
- Compare outputs **side-by-side** across models and iterations
- Runs are archives — browsing is the primary experience

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 15 (App Router) | Works locally and on Vercel |
| Storage | JSON files | Simple, portable, git-friendly |
| UI | shadcn/ui + Tailwind | Clean, accessible |
| LLM Integration | Vercel AI SDK + native clients | Unified provider interface |
| Local Models | Ollama | No API key needed |

## Provider Support

| Provider | API Key | Notes |
|----------|---------|-------|
| Ollama | None (local) | llama3, qwen, phi, deepseek, etc. |
| OpenAI | `OPENAI_API_KEY` | gpt-4o, gpt-4o-mini, o1, o3 |
| Google | `GOOGLE_AI_API_KEY` | gemini-2.0-flash, gemini-2.0-pro |
| OpenRouter | `OPENROUTER_API_KEY` | Anthropic, Mistral, Meta, etc. |

## Data Model

### Prompt

```typescript
interface Prompt {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
  expectedAnswer?: string;
  attachments: Attachment[];
  evaluationConfig: {
    methods: ('human' | 'llm-judge' | 'machine' | 'pairwise')[];
    machineJudge?: MachineJudgeConfig;
    llmJudge?: LLMJudgeConfig;
  };
  createdAt: string;
  updatedAt: string;
}
```

### Model

```typescript
interface Model {
  id: string;
  provider: 'ollama' | 'openai' | 'google' | 'openrouter';
  modelId: string;
  displayName: string;
  supportsVision: boolean;
  config: { temperature?: number; maxOutputTokens?: number; };
  isActive: boolean;
}
```

### Run

```typescript
interface Run {
  id: string;
  name: string;
  promptIds: string[];
  modelIds: string[];
  iterations: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: Result[];
  evaluations: Evaluation[];
  comparisons: PairwiseComparison[];
}
```

### Result

```typescript
interface Result {
  id: string;
  promptId: string;
  modelId: string;
  iteration: number;
  response: string;
  latencyMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  error?: string;
}
```

## Project Structure

```
model-vibe-check/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── prompts/
│   │   ├── page.tsx                # Prompt library
│   │   ├── [id]/page.tsx           # Prompt detail
│   │   ├── [id]/responses/page.tsx # Response browser + comparison
│   │   └── import/page.tsx         # JSON import
│   ├── models/
│   │   ├── page.tsx                # Model configuration
│   │   └── [id]/responses/page.tsx # Response browser
│   ├── categories/
│   │   ├── page.tsx                # Category list
│   │   └── [slug]/page.tsx         # Category detail
│   ├── runs/
│   │   ├── page.tsx                # Run history
│   │   ├── new/page.tsx            # Create run
│   │   └── [id]/
│   │       ├── page.tsx            # Run archive view
│   │       ├── evaluate/page.tsx   # Human scoring (legacy)
│   │       ├── judge/page.tsx      # LLM judge (legacy)
│   │       └── compare/page.tsx    # Pairwise (legacy)
│   ├── settings/page.tsx           # API keys
│   └── api/                        # REST endpoints
├── lib/
│   ├── types.ts                    # TypeScript definitions
│   ├── storage.ts                  # JSON file operations
│   ├── providers/index.ts          # LLM execution
│   └── evaluation/                 # Judge implementations
├── components/ui/                  # shadcn components
├── data/                           # User data (mostly gitignored)
│   └── prompts.json                # Sample prompts (committed)
└── attachments/                    # Uploaded files
```

## Key Features

### Response Browsers

Three entry points to read responses:

1. **By Prompt** (`/prompts/[id]/responses`)
   - All responses to a specific prompt
   - Grouped by model
   - Compare mode with iteration switching

2. **By Model** (`/models/[id]/responses`)
   - All responses from a specific model
   - Grouped by prompt

3. **By Category** (`/categories/[slug]`)
   - Prompts in category
   - Quick links to response browsers

### Comparison Mode

- Select 2-4 responses
- Side-by-side columns
- Each column can switch between iterations
- Dropdowns to swap models

### Run Execution

- Parallel execution (configurable concurrency)
- Retry with exponential backoff
- Periodic saves during execution
- Handles both text and vision models

### Evaluation Methods (Legacy)

These scoring features exist but aren't the primary workflow:

1. **Human Judge**: Score 1-10 with notes
2. **Machine Judge**: Algorithmic checks (contains, regex, exact, json-schema)
3. **LLM Judge**: Another model scores against rubric
4. **Pairwise**: A/B comparison voting

## Data Storage

All data in `data/` directory:

- `prompts.json` — Prompt library (sample included)
- `models.json` — User's model config (gitignored)
- `settings.json` — API keys (gitignored)
- `runs/*.json` — Run results (gitignored)

No external database. No data leaves your machine except LLM API calls.

## Sample Prompts

10 prompts across categories:

| Category | Topics |
|----------|--------|
| Spatial Cognition | Vertical text recognition |
| Multilingual | German modal verbs, Czech morphology, Japanese honorifics |
| Linguistics | Anaphora resolution, use-mention distinction |
| Creative Writing | Wodehouse pastiche, long-form generation |
| Code | SVG generation, mermaid diagrams, regex |

## Deployment

### Local

```bash
npm install
npm run dev
```

### Vercel

Works, but JSON file storage is ephemeral. Consider Vercel KV for persistence in production.
