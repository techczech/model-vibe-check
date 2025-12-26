# Model Vibe Check — Architecture

> Systematic vibes-based LLM evaluation against a personal prompt library.

## Project Status Overview

| Component | Status | Notes |
|-----------|--------|-------|
| Core types & schemas | ✅ Complete | `lib/types.ts` |
| JSON storage layer | ✅ Complete | `lib/storage.ts` |
| Dashboard | ✅ Complete | Stats, recent runs, quick actions |
| Prompts CRUD | ✅ Complete | List, view, filter by category |
| Prompts import | ✅ Complete | JSON import from URL or paste |
| Models configuration | ✅ Complete | Add/remove/toggle active |
| Settings (API keys) | ✅ Complete | BYOK for OpenAI, Google, OpenRouter |
| Run creation | ✅ Complete | Select prompts + models |
| Provider execution | 🔶 Partial | Structure exists, needs testing |
| Machine judge | ✅ Complete | contains, regex, exact, json-schema, custom |
| LLM judge | ✅ Complete | Configurable rubric, JSON output parsing |
| Pairwise comparison | ✅ Complete | Position randomization, unflipping |
| Run execution engine | ❌ Not built | Need to wire up provider calls in run flow |
| Results display | ❌ Not built | Need run detail page with results grid |
| Human evaluation UI | ❌ Not built | Scoring interface for results |
| Results aggregation | ❌ Not built | Calculate averages, pass rates, win rates |

## Core Concept

Model Vibe Check fills a gap between formal benchmarks (MMLU, HumanEval) and crowd preferences (Chatbot Arena). It answers: **does this model work for my tasks?**

The workflow:
1. Curate a personal prompt library with evaluation criteria
2. When a new model drops, run it against your prompts
3. Use human rating, machine checks, LLM judge, or pairwise comparison
4. Track results over time to see how models evolve

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 15 (App Router) | Identical local + Vercel deployment |
| Storage | JSON files | Simple, portable, git-friendly |
| UI Components | shadcn/ui + Tailwind | Clean, accessible, customizable |
| LLM Integration | Vercel AI SDK | Unified interface across providers |
| Local Models | Ollama | No API key needed |
| State | React Server Components + fetch | No client state library needed |

## Provider Strategy

Four providers cover the entire LLM landscape:

| Provider | API Key | Models | Notes |
|----------|---------|--------|-------|
| Ollama | None (local) | llama3.2, qwen2.5, deepseek-r1, phi-4 | Free, private, offline |
| OpenAI | `OPENAI_API_KEY` | gpt-4o, o1, o3-mini | Best for judge tasks |
| Google | `GOOGLE_AI_API_KEY` | gemini-2.0-flash, gemini-2.0-pro | Good flash model |
| OpenRouter | `OPENROUTER_API_KEY` | Anthropic, Mistral, Meta, etc. | Single key for everything else |

## Data Model

### Prompt

```typescript
interface Prompt {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  description?: string;
  content: string;                    // The actual prompt text
  expectedAnswer?: string;            // For reference, not auto-graded
  attachments: Attachment[];          // Images, text files
  evaluationConfig: {
    methods: ('human' | 'llm-judge' | 'machine' | 'pairwise')[];
    machineJudge?: MachineJudgeConfig;
    llmJudge?: LLMJudgeConfig;
    pairwise?: PairwiseConfig;
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
  modelId: string;                    // e.g., "gpt-4o" or "anthropic/claude-sonnet-4-20250514"
  displayName: string;
  supportsVision: boolean;
  supportsAudio: boolean;
  maxTokens: number;
  config: {
    temperature?: number;
    maxOutputTokens?: number;
  };
  isActive: boolean;
  createdAt: string;
}
```

### Run

```typescript
interface Run {
  id: string;
  name: string;
  promptIds: string[];
  modelIds: string[];
  iterations: number;                 // Run each combo N times
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  results: Result[];                  // Raw model outputs
  evaluations: Evaluation[];          // Scores/judgments
  comparisons: PairwiseComparison[];  // A vs B votes
}
```

### Result

```typescript
interface Result {
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
```

### Evaluation

```typescript
interface Evaluation {
  id: string;
  resultId: string;
  method: 'human' | 'llm-judge' | 'machine' | 'pairwise';
  // Human
  humanScore?: number;                // 1-10
  humanNotes?: string;
  // LLM Judge
  llmJudgeModel?: string;
  llmScores?: Record<string, number>; // Per-dimension scores
  llmOverall?: number;
  llmRationale?: string;
  // Machine
  machinePass?: boolean;
  machineDetails?: string;
  createdAt: string;
}
```

## Four Evaluation Methods

### 1. Human Judge

User scores response 1-10 with optional notes. Simple, authoritative, slow. Best for nuanced quality assessment.

### 2. Machine Judge

Algorithmic checks that run instantly:

| Type | Example Criteria | Use Case |
|------|------------------|----------|
| `contains` | `"secret,message"` | Check for required terms |
| `regex` | `"(don't have to\|need not)"` | Pattern matching |
| `exact` | `"42"` | Exact answer verification |
| `json-schema` | `{"required": ["name", "age"]}` | Structure validation |
| `custom` | JS function body | Word count, custom logic |

Custom example for word count check:
```javascript
const count = response.split(/\s+/).filter(w => w.length > 0).length;
return { pass: count >= 5000, details: `Word count: ${count}` };
```

### 3. LLM Judge

Another model evaluates the response against a rubric. Default dimensions: accuracy, completeness, clarity, relevance. Returns scores 1-10 per dimension plus overall score and rationale.

Configurable per prompt:
```json
{
  "llmJudge": {
    "criteria": "Focus on whether the translation captures modal meaning",
    "rubric": {
      "accuracy": "Is the translation semantically correct?",
      "naturalness": "Does it sound like natural English?"
    }
  }
}
```

### 4. Pairwise Comparison

Side-by-side voting: A wins, B wins, or Tie. Randomizes display order to avoid position bias, then unflips the result. Can be human or LLM judge. Useful for subjective quality where absolute scores are hard.

## File Structure

```
model-vibe-check/
├── app/
│   ├── page.tsx                  # Dashboard ✅
│   ├── layout.tsx                # Root layout with nav ✅
│   ├── globals.css               # Tailwind + CSS variables ✅
│   ├── prompts/
│   │   ├── page.tsx              # List/filter prompts ✅
│   │   ├── [id]/page.tsx         # Prompt detail ✅
│   │   └── import/page.tsx       # Import from JSON ✅
│   ├── models/
│   │   └── page.tsx              # Model configuration ✅
│   ├── runs/
│   │   ├── page.tsx              # Run history ✅
│   │   ├── new/page.tsx          # Create run ✅
│   │   └── [id]/
│   │       ├── page.tsx          # Run detail ❌ (needs results grid)
│   │       ├── evaluate/page.tsx # Human eval UI ❌
│   │       └── compare/page.tsx  # Pairwise UI ❌
│   ├── settings/
│   │   └── page.tsx              # API keys + defaults ✅
│   └── api/
│       ├── prompts/route.ts      # CRUD ✅
│       ├── models/route.ts       # CRUD ✅
│       ├── runs/route.ts         # CRUD ✅
│       └── settings/route.ts     # CRUD ✅
├── components/
│   ├── navigation.tsx            # Sidebar nav ✅
│   └── ui/                       # shadcn components ✅
├── lib/
│   ├── types.ts                  # TypeScript definitions ✅
│   ├── utils.ts                  # Helpers ✅
│   ├── storage.ts                # JSON file operations ✅
│   ├── providers/
│   │   └── index.ts              # LLM execution ✅ (needs testing)
│   └── evaluation/
│       ├── index.ts              # Exports ✅
│       ├── machine.ts            # Machine judge ✅
│       └── llm-judge.ts          # LLM judge + pairwise ✅
├── data/
│   ├── prompts.json              # Prompt library (10 samples) ✅
│   ├── models.json               # Configured models ✅
│   └── runs/                     # Run result files ✅
└── attachments/
    ├── text/                     # Text attachments
    └── images/                   # Image attachments
```

## Sample Prompts Included

The `data/prompts.json` ships with 10 evaluation prompts across categories:

| Category | Prompts |
|----------|---------|
| Spatial Cognition | Vertical text recognition |
| Multilingual | German modal translation, Czech morphology, idiom equivalence |
| Linguistics | Anaphora resolution, use-mention distinction |
| Coding | SVG generation, readability tool |
| Creative Writing | Wodehouse style transfer, 7000-word academic paper |

Each prompt has evaluation config specifying which methods apply and their criteria.

## What's Working Now

1. **Dashboard** — Shows prompt count, model count, run history, quick actions
2. **Prompt library** — Browse, filter by category, search, view details
3. **Prompt import** — Paste JSON or fetch from URL, validates schema
4. **Model configuration** — Add from preset lists or custom, toggle active/inactive
5. **Settings** — BYOK API keys with show/hide, Ollama URL, defaults
6. **Run creation** — Select prompts and models, set iterations, create pending run

## What's Not Built Yet

### Run Execution Engine

Need to wire up `lib/providers/index.ts` to actually execute prompts when a run starts. Current flow stops at creating a "pending" run.

```typescript
// Pseudocode for what's needed:
async function executeRun(runId: string) {
  const run = await getRun(runId);
  run.status = 'running';
  await saveRun(run);
  
  for (const promptId of run.promptIds) {
    const prompt = await getPrompt(promptId);
    for (const modelId of run.modelIds) {
      const model = await getModel(modelId);
      for (let i = 0; i < run.iterations; i++) {
        const result = await executePrompt(prompt.content, model, prompt.attachments, settings);
        run.results.push({ ...result, promptId, modelId, iteration: i });
        
        // Auto-run machine judge if configured
        if (prompt.evaluationConfig.methods.includes('machine')) {
          const machineResult = evaluateMachine(result.response, prompt.evaluationConfig.machineJudge);
          run.evaluations.push({ resultId: result.id, method: 'machine', ...machineResult });
        }
      }
    }
  }
  
  run.status = 'completed';
  await saveRun(run);
}
```

### Run Detail Page (`/runs/[id]/page.tsx`)

Needs:
- Results grid: prompts × models matrix
- Color-coded scores (red < 5, yellow 5-7, green > 7)
- Click to expand individual result
- Button to run LLM judge on all results
- Link to human evaluation and pairwise comparison

### Human Evaluation UI (`/runs/[id]/evaluate/page.tsx`)

Needs:
- Display prompt and response
- Score slider (1-10)
- Notes textarea
- Navigation between results (prev/next)
- Skip already-evaluated results option

### Pairwise Comparison UI (`/runs/[id]/compare/page.tsx`)

Needs:
- Side-by-side response display
- Vote buttons: A wins, Tie, B wins
- Randomized order (handled in `evaluatePairwise`)
- Track which comparisons are done

### Results Aggregation

Calculate per prompt/model:
- Human: average score, count
- LLM Judge: average overall, averages per dimension
- Machine: pass rate
- Pairwise: win rate

## Deployment Options

### Local Only

```bash
npm install
npm run dev
# Open http://localhost:3000
```

Data lives in `data/` directory. Git-friendly, version-controllable.

### Vercel

```bash
vercel deploy
```

Set environment variables in Vercel dashboard:
- `OPENAI_API_KEY`
- `GOOGLE_AI_API_KEY`
- `OPENROUTER_API_KEY`

Consider using Vercel KV for results storage in deployed version (JSON files work locally but aren't persistent on Vercel's ephemeral filesystem).

## Remaining Work (Priority Order)

1. **Run execution** — Wire up provider calls, execute pending runs
2. **Run detail page** — Results grid with scores
3. **Human evaluation UI** — Scoring interface
4. **Auto LLM judge** — Button to judge all results
5. **Results aggregation** — Calculate summary stats
6. **Pairwise UI** — Side-by-side comparison voting
7. **Attachment handling** — Actually read and send files to models
8. **Error handling** — Retry failed calls, surface errors in UI
9. **Export** — Download results as CSV/JSON

## Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Name | Model Vibe Check | "Vibe check" is recognized phrase; captures systematic-but-personal nature |
| Storage | JSON files | Simple, portable, git-friendly; no database setup |
| Providers | 4 only | Ollama (local), OpenAI, Google, OpenRouter covers everything |
| Judge model | GPT-4o-mini default | Cheap, fast, reliable JSON output |
| Pairwise randomization | Server-side | Avoid position bias without client complexity |
| UI framework | shadcn/ui | Accessible, customizable, no vendor lock-in |
| Client state | None (server components + fetch) | Simpler than Zustand/Redux for this use case |

## Competitive Context

| Tool | What it does | Model Vibe Check difference |
|------|--------------|----------------------------|
| promptfoo | YAML-config batch eval | We have persistent prompt library + UI |
| LLM Comparator | Visualization | We have execution engine + evaluation |
| Chatbot Arena | Crowdsourced pairwise | We're personal/private, not public |
| DeepEval | Python pytest framework | We're web UI, not code-first |

Model Vibe Check is the only tool combining: curated personal prompt library + persistent cross-version history + mixed human/LLM/machine evaluation + local-first with optional cloud deployment.
