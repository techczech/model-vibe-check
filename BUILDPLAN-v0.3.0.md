# Model Vibe Check — Build Plan v0.3.0

## Vision

Transform Model Vibe Check from a response browser into a **qualitative evaluation workbench** where checking the vibe is the primary workflow. The key insight: existing tools (Promptfoo, Braintrust, LLM Comparator) optimize for metrics and automation. Model Vibe Check optimizes for **reading and comparing responses** with human judgment.

**What's missing elsewhere:**
- Most tools treat side-by-side as a secondary feature — we make it central
- Flashcard/blind evaluation modes for unbiased human judgment
- Easy switching between "Prompt Vibe" (how does this prompt perform across models?) and "Model Vibe" (how does this model perform across prompts?)
- Focus on qualitative patterns, not just scores

---

## v0.3.0 — The Vibe Workbench

**STATUS: COMPLETE — All Parts Finished**

### Progress Summary

| Part | Status | Description |
|------|--------|-------------|
| Part 1: API Management | ✅ Complete | Provider model discovery, Settings tabs |
| Part 2: Rubric Management | ✅ Complete | Evaluators page, Rubric editor, Prompt integration |
| Part 3: Improved Listing | ✅ Complete | Prompts table view, Model overview page |
| Part 4: Vibe Check Interface | ✅ Complete | Hub, Prompt Vibe, Model Vibe, Blind Review, Head-to-Head |
| Part 5: Universal ResponseViewer | ✅ Complete | Core viewing component, model metadata expansion |

### Overview

Three major improvement areas:
1. **API Management** — Dynamic model discovery from providers
2. **Rubric Management** — Separate evaluator configuration from prompts
3. **Vibe Check Interface** — New comparison modes for qualitative evaluation

---

## Part 1: API Management & Model Discovery

### Problem

Currently, models are added manually from hardcoded lists. Users don't know what models are available from their configured providers, especially for Ollama where models change constantly.

### Solution

Add a dedicated **API Management** section in Settings that:
1. Tests API connectivity for each provider
2. Fetches available models from each provider
3. Lets users select which models to add to their configuration

### Implementation

#### 1.1 New API Endpoints

**`GET /api/providers/[provider]/models`** — Fetch available models

```typescript
// Returns for each provider:
interface ProviderModels {
  provider: Provider;
  connected: boolean;
  error?: string;
  models: {
    id: string;
    name: string;
    description?: string;
    contextWindow?: number;
    supportsVision?: boolean;
    supportsAudio?: boolean;
  }[];
}
```

**Provider-specific implementations:**

| Provider | API Endpoint | Notes |
|----------|--------------|-------|
| Ollama | `GET /api/tags` | Returns locally installed models |
| OpenAI | `GET /v1/models` | Filter to chat completion models |
| Google | SDK model list | `gemini-*` models |
| OpenRouter | `GET /api/v1/models` | Returns 200+ models with metadata |

#### 1.2 Settings Page Redesign

```
┌─────────────────────────────────────────────────────────────────┐
│ Settings                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [API Keys]  [Model Discovery]  [Defaults]  [Evaluators]         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─ Model Discovery ───────────────────────────────────────────────┐
│                                                                  │
│ ┌─ Ollama (Local) ─────────────────────────────────────────────┐│
│ │ Status: ● Connected (http://localhost:11434)      [Refresh]  ││
│ │                                                               ││
│ │ Available Models (5):                                         ││
│ │ ┌─────────────────────────────────────────────────────────┐  ││
│ │ │ [✓] llama3.2:latest          8B · 4.7GB               ││  ││
│ │ │ [✓] qwen2.5:latest           7B · 4.4GB               ││  ││
│ │ │ [ ] deepseek-r1:latest       7B · 4.1GB               ││  ││
│ │ │ [ ] phi-4:latest             14B · 8.2GB              ││  ││
│ │ │ [✓] mistral:latest           7B · 4.1GB               ││  ││
│ │ └─────────────────────────────────────────────────────────┘  ││
│ │                              [Add Selected to Models →]       ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ OpenAI ─────────────────────────────────────────────────────┐│
│ │ Status: ● Connected                               [Refresh]  ││
│ │                                                               ││
│ │ Available Models (12):                    [Filter: gpt ▼]    ││
│ │ ┌─────────────────────────────────────────────────────────┐  ││
│ │ │ [✓] gpt-4o                  128K context · Vision      ││  ││
│ │ │ [ ] gpt-4o-mini             128K context · Vision      ││  ││
│ │ │ [ ] o1-preview              Reasoning model            ││  ││
│ │ │ [ ] o3-mini                 Latest reasoning           ││  ││
│ │ └─────────────────────────────────────────────────────────┘  ││
│ │                              [Add Selected to Models →]       ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ Google AI ──────────────────────────────────────────────────┐│
│ │ Status: ○ Not configured                                     ││
│ │ Add API key above to discover available models               ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 1.3 Implementation Checklist

- [x] **1.3.1** Create provider model fetching functions
  - [x] `getOllamaModels()` — already exists, extend with metadata
  - [x] `getOpenAIModels()` — filter for chat completion capable models
  - [x] `getGoogleModels()` — use SDK to list available models
  - [x] `getOpenRouterModels()` — fetch from their API with full metadata

- [x] **1.3.2** Create `/api/providers/[provider]/models` endpoint
  - [x] Handle missing API keys gracefully
  - [x] Cache results for 5 minutes to avoid rate limits
  - [x] Return connectivity status

- [x] **1.3.3** Redesign Settings page with tabs
  - [x] Tab 1: API Keys (existing)
  - [x] Tab 2: Model Discovery (new)
  - [x] Tab 3: Defaults (existing)
  - [x] Tab 4: Evaluators (new — see Part 2)

- [x] **1.3.4** Create ModelDiscovery component
  - [x] Provider status indicators
  - [x] Model list with checkboxes
  - [x] "Add Selected" button
  - [x] Filter/search within provider
  - [x] Show which models are already configured

---

## Part 2: Rubric & Evaluator Management

### Problem

Currently, rubrics are defined in code and tightly coupled to prompts. Users can't:
- Create custom rubrics without code changes
- Share rubrics across prompts
- Configure prompt-specific evaluation criteria

### Solution

Create a dedicated **Evaluators** section that manages:
1. **Rubrics** — Reusable evaluation criteria
2. **Judge Configuration** — Which model evaluates, default settings
3. **Prompt Rubric Assignments** — Link specific rubrics to prompts

### Data Model Updates

```typescript
// Extend Rubric type
interface Rubric {
  id: string;
  name: string;
  description?: string;
  items: RubricItem[];
  allowImpressionScore: boolean;
  isDefault?: boolean;
  // NEW: Scope defines where this rubric can be used
  scope: 'global' | 'prompt-specific';
  // NEW: Tags for organization
  tags?: string[];
  // NEW: Which prompts use this rubric (if prompt-specific)
  promptIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// Extend Settings type
interface Settings {
  apiKeys: { ... };
  defaults: {
    llmJudgeModel: string;
    iterations: number;
    temperature: number;
    // NEW: Default rubric for new prompts
    defaultRubricId?: string;
  };
  // NEW: Judge configuration
  judge: {
    modelId: string;
    temperature: number;
    // Multiple judge runs for reliability
    runs: number;
    // Whether to show detailed reasoning
    includeReasoning: boolean;
  };
  ollamaBaseUrl: string;
}
```

### 2.1 Evaluators Page

New page at `/settings/evaluators` (or tab in Settings):

```
┌─────────────────────────────────────────────────────────────────┐
│ Evaluators                                           [+ New]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ Judge Configuration ────────────────────────────────────────┐│
│ │                                                               ││
│ │ Default Judge Model: [GPT-4o-mini         ▼]                 ││
│ │ Temperature:         [0.3        ]                            ││
│ │ Runs per evaluation: [1 ▼]  (multiple = more reliable)       ││
│ │ Include reasoning:   [✓]                                      ││
│ │                                                               ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ ┌─ Rubrics (7) ────────────────────────────────────────────────┐│
│ │                                                               ││
│ │ ┌─ Global Rubrics ──────────────────────────────────────────┐││
│ │ │                                                            │││
│ │ │ General Quality            ⭐ Default                      │││
│ │ │ 4 items · Binary + Scale · Used by 12 prompts    [Edit]   │││
│ │ │                                                            │││
│ │ │ Code Generation                                            │││
│ │ │ 5 items · Mixed types · Used by 3 prompts        [Edit]   │││
│ │ │                                                            │││
│ │ │ Creative Writing                                           │││
│ │ │ 3 items · Scale only · Used by 4 prompts         [Edit]   │││
│ │ │                                                            │││
│ │ └────────────────────────────────────────────────────────────┘││
│ │                                                               ││
│ │ ┌─ Prompt-Specific ─────────────────────────────────────────┐││
│ │ │                                                            │││
│ │ │ Czech Morphology Checker                                   │││
│ │ │ 6 items · Custom · Linked to "Czech morphology" [Edit]    │││
│ │ │                                                            │││
│ │ │ SVG Code Quality                                           │││
│ │ │ 4 items · Code-focused · Linked to "SVG from..." [Edit]   │││
│ │ │                                                            │││
│ │ └────────────────────────────────────────────────────────────┘││
│ │                                                               ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Rubric Editor Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ Edit Rubric                                              [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Name: [Czech Morphology Checker                        ]        │
│                                                                  │
│ Description:                                                     │
│ [Evaluates accuracy of Czech morphological analysis      ]      │
│                                                                  │
│ Scope: (•) Global  ( ) Prompt-specific                          │
│                                                                  │
│ ┌─ Rubric Items ───────────────────────────────────────────────┐│
│ │                                                               ││
│ │ 1. [Correct case identification        ]  Type: [Binary ▼]  ││
│ │    Description: [Does it identify the correct case?   ]      ││
│ │                                                      [🗑️]    ││
│ │                                                               ││
│ │ 2. [Number agreement                    ]  Type: [Binary ▼]  ││
│ │    Description: [Is singular/plural correct?          ]      ││
│ │                                                      [🗑️]    ││
│ │                                                               ││
│ │ 3. [Explanation quality                 ]  Type: [Scale ▼]   ││
│ │    Labels: [Poor] [Basic] [Good] [Excellent]                 ││
│ │                                                      [🗑️]    ││
│ │                                                               ││
│ │                                       [+ Add Item]            ││
│ │                                                               ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
│ [✓] Allow impression score (1-10)                               │
│                                                                  │
│                              [Cancel]  [Save Rubric]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Implementation Checklist

- [x] **2.3.1** Update data model
  - [x] Extend Rubric type with scope, tags, promptIds
  - [x] Extend Settings type with judge configuration
  - [x] Migration for existing rubrics.json

- [x] **2.3.2** Create API endpoints
  - [x] `POST /api/rubrics` — Create rubric
  - [x] `PUT /api/rubrics/[id]` — Update rubric
  - [x] `DELETE /api/rubrics/[id]` — Delete (with protection for in-use)
  - [x] `GET /api/rubrics/usage` — Get usage counts for all rubrics

- [x] **2.3.3** Build Evaluators page
  - [x] Judge configuration section
  - [x] Rubric list grouped by scope
  - [x] Usage stats for each rubric

- [x] **2.3.4** Build Rubric Editor modal
  - [x] Dynamic item list with drag-to-reorder
  - [x] Type-specific configuration for each item
  - [x] Preview of how rubric will appear in evaluation

- [x] **2.3.5** Integrate with Prompt editor
  - [x] Rubric selector dropdown on prompt edit page
  - [x] Quick link to create prompt-specific rubric

---

## Part 3: Improved Prompt & Model Listing

### Problem

Current listings show prompts as cards grouped by category. This works for browsing but makes it hard to:
- Filter and sort by metrics (response count, evaluation status)
- Compare prompts at a glance
- Navigate quickly to specific prompts

### Solution

Add a **table view** option with sortable columns, filters, and quick actions.

### 3.1 Prompt List Redesign

Two view modes: **Grid** (current cards) and **Table** (new):

```
┌─────────────────────────────────────────────────────────────────┐
│ Prompts                                    View: [Grid] [Table] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Filters: [All Categories ▼] [Has Responses ▼] [Search...    🔍] │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────────┐
│ │ Title ↕          Category     Models  Responses  Evaluated   ││
│ ├───────────────────────────────────────────────────────────────┤
│ │ Czech morphology  Multilingual   5       15        12/15 80% ││
│ │ Vertical text     Spatial        4       12         8/12 67% ││
│ │ SVG generation    Code           6       18         0/18  0% ││
│ │ German modals     Multilingual   5       15        15/15 ✓   ││
│ │ Wodehouse style   Creative       3        9         6/9  67% ││
│ │ ...                                                          ││
│ └───────────────────────────────────────────────────────────────┘
│                                                                  │
│ Showing 10 of 45 prompts                    [← Prev] [Next →]  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Row hover reveals: [View Responses] [Compare Models] [Edit] [Run]
```

### 3.2 Model Performance Overview

New page at `/models/overview`:

```
┌─────────────────────────────────────────────────────────────────┐
│ Model Performance                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────────────────────────────────────────────────┐
│ │ Model           Provider   Prompts  Responses  Avg Score     ││
│ ├───────────────────────────────────────────────────────────────┤
│ │ GPT-4o          OpenAI       12        36        7.8/10      ││
│ │ Gemini 2.0      Google       10        30        7.2/10      ││
│ │ Claude 3.5      OpenRouter    8        24        8.1/10      ││
│ │ Llama 3.2       Ollama       12        36        6.5/10      ││
│ │ Qwen 2.5        Ollama       10        30        6.9/10      ││
│ └───────────────────────────────────────────────────────────────┘
│                                                                  │
│ ┌─ Quick Comparisons ──────────────────────────────────────────┐│
│ │                                                               ││
│ │ [Compare All on "Czech morphology"]                          ││
│ │ [Compare All on "SVG generation"]                            ││
│ │ [Run New Vibe Check →]                                       ││
│ │                                                               ││
│ └───────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Implementation Checklist

- [x] **3.3.1** Prompts page table view
  - [x] Add view mode toggle (grid/table)
  - [x] Create sortable table component
  - [x] Add coverage metrics columns
  - [x] Persist view preference

- [x] **3.3.2** Prompts page filtering
  - [x] Category filter dropdown
  - [x] "Has responses" / "Needs evaluation" filters
  - [x] Search across title, content, keywords
  - [x] URL query params for shareable filters

- [x] **3.3.3** Create Model Overview page
  - [x] Performance table with sortable columns
  - [x] Quick comparison links
  - [x] Aggregate scores across prompts

- [x] **3.3.4** Navigation updates
  - [x] Add "Overview" link to Models section
  - [x] Quick action buttons on hover

---

## Part 4: The Vibe Check Interface

This is the heart of v0.3.0 — a new way to compare responses that makes qualitative evaluation the primary workflow.

### Core Concept: Two Vibe Modes

**Prompt Vibe**: "How does this prompt perform across different models?"
- Select one prompt
- Compare responses from all models side by side
- Useful for: Choosing the best model for a task

**Model Vibe**: "How does this model perform across different prompts?"
- Select one model
- Compare responses to different prompts side by side
- Useful for: Understanding a model's strengths and weaknesses

### 4.1 Vibe Check Hub

New page at `/vibe-check`:

```
┌─────────────────────────────────────────────────────────────────┐
│ Vibe Check                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ What do you want to check?                                      │
│                                                                  │
│ ┌────────────────────────┐  ┌────────────────────────┐         │
│ │                        │  │                        │         │
│ │     📝 Prompt Vibe     │  │     🤖 Model Vibe      │         │
│ │                        │  │                        │         │
│ │  Same prompt,          │  │  Same model,           │         │
│ │  different models      │  │  different prompts     │         │
│ │                        │  │                        │         │
│ │  "Which model is       │  │  "What is this model   │         │
│ │   best for this task?" │  │   good at?"            │         │
│ │                        │  │                        │         │
│ │      [Start →]         │  │      [Start →]         │         │
│ │                        │  │                        │         │
│ └────────────────────────┘  └────────────────────────┘         │
│                                                                  │
│ ┌────────────────────────┐  ┌────────────────────────┐         │
│ │                        │  │                        │         │
│ │     🎴 Blind Review    │  │     ⚔️ Head-to-Head    │         │
│ │                        │  │                        │         │
│ │  Flashcard mode for    │  │  Pairwise comparison   │         │
│ │  unbiased evaluation   │  │  with voting           │         │
│ │                        │  │                        │         │
│ │      [Start →]         │  │      [Start →]         │         │
│ │                        │  │                        │         │
│ └────────────────────────┘  └────────────────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Prompt Vibe Mode

After selecting a prompt:

```
┌─────────────────────────────────────────────────────────────────┐
│ Prompt Vibe: "Czech morphology analysis"             [Exit]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ Prompt ──────────────────────────────────────────────────────┐
│ │ Analyze the Czech word "psů" and explain its morphology.     ││
│ └───────────────────────────────────────────────────────────────┘
│                                                                  │
│ Columns: [2] [3] [4]     Show: [Latest ▼]     [🔀 Shuffle]      │
│                                                                  │
│ ┌─────────────────────┬─────────────────────┬──────────────────┐│
│ │ GPT-4o              │ Gemini 2.0          │ Claude 3.5       ││
│ │ ↓ Dec 27 · Iter 1   │ ↓ Dec 27 · Iter 1   │ ↓ Dec 27 · Iter 1││
│ ├─────────────────────┼─────────────────────┼──────────────────┤│
│ │                     │                     │                  ││
│ │ "Psů" is the        │ The word "psů"      │ Let me analyze   ││
│ │ genitive plural     │ represents the      │ "psů" for you:   ││
│ │ form of "pes"       │ genitive plural...  │ ...              ││
│ │ (dog). The stem     │                     │                  ││
│ │ "ps-" combines...   │                     │                  ││
│ │                     │                     │                  ││
│ │                     │                     │                  ││
│ │                     │                     │                  ││
│ │                     │                     │                  ││
│ ├─────────────────────┼─────────────────────┼──────────────────┤│
│ │ 847 tok · 1.2s      │ 623 tok · 0.8s      │ 912 tok · 1.5s   ││
│ │ [Rate] [Judge]      │ [Rate] [Judge]      │ [Rate] [Judge]   ││
│ └─────────────────────┴─────────────────────┴──────────────────┘│
│                                                                  │
│ [← Prev Response Set]  1/3 iterations  [Next Response Set →]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key features:**
- Adjustable columns (2-4)
- Iteration selector per column
- Shuffle button randomizes order (helps avoid position bias)
- Quick rate/judge buttons per column
- Navigate through iterations

### 4.3 Model Vibe Mode

After selecting a model:

```
┌─────────────────────────────────────────────────────────────────┐
│ Model Vibe: GPT-4o                                   [Exit]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Categories: [All ▼]     Show: [Latest ▼]     [🔀 Random]        │
│                                                                  │
│ ┌─────────────────────┬─────────────────────┬──────────────────┐│
│ │ Czech morphology    │ SVG generation      │ Vertical text    ││
│ │ Multilingual        │ Code                │ Spatial          ││
│ ├─────────────────────┼─────────────────────┼──────────────────┤│
│ │                     │                     │                  ││
│ │ Prompt:             │ Prompt:             │ Prompt:          ││
│ │ Analyze "psů"...    │ Create an SVG...    │ Read the text... ││
│ │                     │                     │                  ││
│ │ ──────────────────  │ ──────────────────  │ ────────────────││
│ │                     │                     │                  ││
│ │ Response:           │ Response:           │ Response:        ││
│ │ "Psů" is the        │ <svg viewBox=...    │ The text reads   ││
│ │ genitive plural...  │                     │ "HELLO"...       ││
│ │                     │                     │                  ││
│ ├─────────────────────┼─────────────────────┼──────────────────┤│
│ │ Score: 8/10         │ Score: --           │ Score: 5/10      ││
│ │ [Details]           │ [Evaluate]          │ [Details]        ││
│ └─────────────────────┴─────────────────────┴──────────────────┘│
│                                                                  │
│ Showing 3 of 12 prompts with responses  [Show More]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key features:**
- Filter by category
- Random selection for discovery
- Shows prompt + response together
- Existing scores visible at a glance

### 4.4 Blind Review (Flashcard Mode)

For unbiased evaluation — model names hidden:

```
┌─────────────────────────────────────────────────────────────────┐
│ Blind Review                                 [Reveal] [Exit]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ Prompt ──────────────────────────────────────────────────────┐
│ │ Analyze the Czech word "psů" and explain its morphology.     ││
│ └───────────────────────────────────────────────────────────────┘
│                                                                  │
│ ┌─ Response ────────────────────────────────────────────────────┐
│ │                                                               ││
│ │ "Psů" is the genitive plural form of "pes" (dog). The stem  ││
│ │ "ps-" combines with the ending "-ů" which marks:             ││
│ │                                                               ││
│ │ • Genitive case (answering "of what/whom?")                  ││
│ │ • Plural number                                               ││
│ │ • Masculine animate gender                                    ││
│ │                                                               ││
│ │ This is an irregular plural formation, as the regular        ││
│ │ genitive plural would be "-ů" after a consonant...           ││
│ │                                                               ││
│ └───────────────────────────────────────────────────────────────┘
│                                                                  │
│ Rate this response:                                              │
│                                                                  │
│ [ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]  [ 6 ]  [ 7 ]  [ 8 ]  [ 9 ]  │
│                                                                  │
│ Or use rubric: [Quick Evaluation ▼]  [Open Full Rubric]         │
│                                                                  │
│ Progress: ████████░░░░░░░░░░░░  8/20 responses                  │
│                                                                  │
│ [← Previous]                                    [Skip] [Next →]  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key features:**
- Model name hidden until "Reveal" clicked
- Random order prevents bias
- Quick 1-9 scoring or full rubric
- Progress tracking
- Can skip difficult ones

### 4.5 Head-to-Head Mode

Pairwise comparison with voting:

```
┌─────────────────────────────────────────────────────────────────┐
│ Head-to-Head: "Czech morphology"                     [Exit]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─ Prompt ──────────────────────────────────────────────────────┐
│ │ Analyze the Czech word "psů" and explain its morphology.     ││
│ └───────────────────────────────────────────────────────────────┘
│                                                                  │
│ Which response is better?                                        │
│                                                                  │
│ ┌─────────────────────────────┬─────────────────────────────────┐
│ │         Response A          │         Response B              │
│ ├─────────────────────────────┼─────────────────────────────────┤
│ │                             │                                 │
│ │ "Psů" is the genitive       │ The word "psů" represents the   │
│ │ plural form of "pes"        │ genitive plural of the Czech    │
│ │ (dog). The stem "ps-"       │ noun "pes" meaning "dog".       │
│ │ combines...                 │ ...                             │
│ │                             │                                 │
│ │                             │                                 │
│ │                             │                                 │
│ │                             │                                 │
│ ├─────────────────────────────┼─────────────────────────────────┤
│ │      [A is better ✓]        │       [B is better ✓]           │
│ └─────────────────────────────┴─────────────────────────────────┘
│                                                                  │
│ Or:  [Tie — equally good]  [Tie — both bad]  [Skip]             │
│                                                                  │
│ Comparisons: 5/15 remaining   Model scores will update after    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

After voting, reveal shows:
┌───────────────────────────────────────────┐
│ A = GPT-4o        B = Gemini 2.0          │
│ Your pick: A ✓    Running score: 3-2      │
└───────────────────────────────────────────┘
```

**Key features:**
- Models hidden during voting (optional reveal)
- Clear voting buttons
- Tie options for nuance
- Running comparison tally
- Results feed into model rankings

### 4.6 Implementation Checklist

- [x] **4.6.1** Create Vibe Check hub page (`/vibe-check`)
  - [x] Four mode selection cards
  - [x] Quick stats (responses to evaluate, comparisons pending)

- [x] **4.6.2** Build Prompt Vibe component
  - [x] Prompt selector
  - [x] Multi-column response display
  - [x] Column count toggle (2/3/4)
  - [x] Iteration selector per column
  - [x] Shuffle functionality
  - [x] Quick evaluation buttons

- [x] **4.6.3** Build Model Vibe component
  - [x] Model selector
  - [x] Category filter
  - [x] Prompt+response cards
  - [x] Random selection mode

- [x] **4.6.4** Build Blind Review component
  - [x] Response queue management
  - [x] Hidden model identity
  - [x] Quick scoring (1-9)
  - [x] Full rubric integration
  - [x] Progress tracking
  - [x] Reveal mechanism

- [x] **4.6.5** Build Head-to-Head component
  - [x] Pair generation algorithm (avoid repeat comparisons)
  - [x] Voting buttons with clear UX
  - [x] Score tallying
  - [x] Optional model reveal

- [x] **4.6.6** Data updates
  - [x] Store blind review scores
  - [x] Store pairwise comparison results
  - [x] Aggregate rankings per model

---

## Navigation Updates

### Current Navigation
```
Dashboard | Prompts | Models | Categories | Runs | Settings
```

### Proposed Navigation
```
Dashboard | Vibe Check | Prompts | Models | Runs | Settings
                 └─ [New hub for all comparison modes]
```

Alternatively, add Vibe Check as prominent dashboard action rather than top nav.

---

## Implementation Priority

### Phase 1: Foundation (Week 1) ✅ COMPLETE
- [x] API model discovery endpoints
- [x] Settings page redesign with tabs
- [x] Model Discovery component

### Phase 2: Rubric Management (Week 2) ✅ COMPLETE
- [x] Rubric CRUD API
- [x] Evaluators page
- [x] Rubric editor modal
- [x] Prompt editor rubric integration

### Phase 3: Improved Listing (Week 3) ✅ COMPLETE
- [x] Prompts table view with filters
- [x] Model overview page
- [x] Quick action buttons

### Phase 4: Vibe Check Core (Week 4-5) ✅ COMPLETE
- [x] Vibe Check hub
- [x] Prompt Vibe mode
- [x] Model Vibe mode

### Phase 5: Advanced Comparison (Week 6) ✅ COMPLETE
- [x] Blind Review mode
- [x] Head-to-Head mode
- [x] Aggregate rankings

### Phase 6: Universal ResponseViewer (Week 7-8) ⏳ IN PROGRESS
- [ ] ResponseViewer component architecture
- [ ] Model metadata schema expansion
- [ ] Refactor all vibe check modes to use ResponseViewer
- [ ] View preferences persistence

---

## Part 5: Universal ResponseViewer

### Problem

The current vibe check interfaces use fixed-height scroll areas and scattered viewing logic. Responses are treated as secondary when they should be the **core differentiator**. Users cannot:
- See full responses side-by-side without scrolling
- Control how much metadata they see
- Resize columns or choose presets
- Have synchronized scrolling across panels

### Solution

Create a **Universal ResponseViewer** component that becomes the foundation for all response viewing in the app. This component will be highly configurable and prioritize reading comfort.

### 5.1 Layout Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Single** | One response, full width | Deep reading, blind review |
| **Side-by-side (2)** | Two columns, equal or resizable | Head-to-head comparison |
| **Side-by-side (3)** | Three columns, minimum viable width | Quick multi-model comparison |
| **Side-by-side (N)** | N columns with horizontal scroll | 4+ responses, each panel ≥ 3-col min width |
| **Stacked** | Full width, vertically stacked | Reading many responses sequentially |

### 5.2 Height Modes

| Mode | Behavior |
|------|----------|
| **Full** | All responses expand to natural height, page scrolls |
| **Compact** | Show first ~5 lines, click to expand individual responses |
| **Viewport** | Panels fill viewport height, internal sync-scrolling |

### 5.3 Metadata Display (All Visible by Default)

**Prompt Section (collapsible):**
- Full prompt content (collapse to first 3 lines)
- Expected answer (collapsed by default, expandable)
- Prompt token count

**Response Header:**
- Model display name + provider badge
- Size tier badge (frontier/flash/lite/7-14b/etc.)
- Reasoning indicator (none/reasoning/hybrid + level used for this run)
- Context window

**Response Footer:**
- Response token count
- Generation time (latency)
- Iteration (e.g., "2 of 5")
- Run date
- Cost estimate
- Evaluation: status badge + score (if evaluated)

**Optional (toggle):**
- Temperature used

### 5.4 Content Rendering

- **Markdown rendered by default** with toggle to raw
- **Syntax highlighting** for code blocks
- **Word wrap on** by default (toggle off for code)
- **Copy button** on each response panel

### 5.5 Interaction

- **Synchronized scrolling** in viewport mode
- **Resizable columns** by dragging dividers
- **Preset widths**: Equal, 1/3-2/3, 1/4-3/4
- **Keyboard navigation**: ← → to switch focus, 1-9 to score, R to reveal (blind mode)

### 5.6 Updated Model Schema

```typescript
interface Model {
  // Existing fields...
  id: string;
  provider: Provider;
  modelId: string;
  displayName: string;
  supportsVision: boolean;
  supportsAudio: boolean;
  isActive: boolean;
  config: ModelConfig;
  createdAt: string;
  
  // NEW: Size classification
  sizeClass: 
    | 'frontier'     // GPT-4o, Claude 3.5 Sonnet, Gemini Pro
    | 'flash'        // GPT-4o-mini, Claude Haiku, Gemini Flash  
    | 'lite'         // Very lightweight
    | 'sub-1b' | '1-3b' | '3-7b' | '7-14b' | '14-34b' 
    | '35-70b' | '70-100b' | '100-200b' | '200b+';
  
  // NEW: Reasoning capability (model's native capability)
  reasoningCapability: 'none' | 'reasoning' | 'hybrid';
  
  // NEW: Context window size
  contextWindow?: number;  // in tokens
  
  // NEW: Known parameter count
  parameters?: string;  // "70B", "8x22B", "405B", etc.
}

// For each response/run, track what reasoning was used
interface RunResult {
  // Existing fields...
  
  // NEW: Reasoning level used for this specific generation
  reasoningUsed?: 'none' | 'standard' | 'extended';
}
```

### 5.7 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ ResponseViewer                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ ViewerToolbar ───────────────────────────────────────────────┐│
│ │ Layout: [Single] [2-col] [3-col] [Stacked]                   ││
│ │ Height: [Full] [Compact] [Viewport]                          ││
│ │ Columns: [Equal] [1/3-2/3] [Drag to resize]                  ││
│ │ Show: [✓Tokens] [✓Latency] [✓Model] [✓Score] [ Temp]         ││
│ │ Content: [✓Markdown] [✓WordWrap] [✓SyncScroll]               ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ PromptSection (collapsible) ───────────────────────────────┐│
│ │ Full prompt text (collapse to 3 lines)                       ││
│ │ [Expand/Collapse] Prompt tokens: 234                         ││
│ │ Expected answer (collapsed)                                  ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ ResponsePanels (layout varies by mode) ─────────────────────┐│
│ │ ┌────────────────────────┐ ┌────────────────────────┐        ││
│ │ │ ResponsePanel        │ │ ResponsePanel        │        ││
│ │ │ ┌────────────────────┐ │ │ ┌────────────────────┐ │        ││
│ │ │ │ Header: Model    │ │ │ │ Header: Model    │ │        ││
│ │ │ │ name, badges,    │ │ │ │ name, badges,    │ │        ││
│ │ │ │ size, reasoning  │ │ │ │ size, reasoning  │ │        ││
│ │ │ └────────────────────┘ │ │ └────────────────────┘ │        ││
│ │ │ ┌────────────────────┐ │ │ ┌────────────────────┐ │        ││
│ │ │ │ Content:         │ │ │ │ Content:         │ │        ││
│ │ │ │ Rendered MD      │ │ │ │ Rendered MD      │ │        ││
│ │ │ │ with syntax     │ │ │ │ with syntax     │ │        ││
│ │ │ │ highlighting    │ │ │ │ highlighting    │ │        ││
│ │ │ │ [Copy]          │ │ │ │ [Copy]          │ │        ││
│ │ │ └────────────────────┘ │ │ └────────────────────┘ │        ││
│ │ │ ┌────────────────────┐ │ │ ┌────────────────────┐ │        ││
│ │ │ │ Footer: tokens, │ │ │ │ Footer: tokens, │ │        ││
│ │ │ │ latency, iter,  │ │ │ │ latency, iter,  │ │        ││
│ │ │ │ date, score     │ │ │ │ date, score     │ │        ││
│ │ │ └────────────────────┘ │ │ └────────────────────┘ │        ││
│ │ └────────────────────────┘ └────────────────────────┘        ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.8 Implementation Checklist

- [x] **5.8.1** Update Model schema
  - [x] Add sizeClass field with auto-detection for known models
  - [x] Add reasoningCapability field
  - [x] Add contextWindow field
  - [x] Add parameters field
  - [x] Create model metadata lookup utility

- [x] **5.8.2** Update RunResult schema
  - [x] Add reasoningUsed field
  - [ ] Migrate existing data

- [x] **5.8.3** Create ViewerToolbar component
  - [x] Layout mode selector (single/2-col/3-col/stacked)
  - [x] Height mode selector (full/compact/viewport)
  - [x] Column preset buttons + resize handles
  - [x] Metadata toggles
  - [x] Content rendering toggles

- [x] **5.8.4** Create PromptSection component
  - [x] Collapsible prompt content
  - [x] Expected answer section
  - [x] Token count display

- [x] **5.8.5** Create ResponsePanel component
  - [x] Header with model info, badges, reasoning indicator
  - [x] Content area with Markdown rendering
  - [x] Syntax highlighting for code
  - [x] Copy button
  - [x] Footer with all metadata

- [x] **5.8.6** Create ResponseViewer container
  - [x] Layout engine for different modes
  - [x] Synchronized scrolling
  - [ ] Resizable columns (drag handles)
  - [x] Keyboard navigation

- [x] **5.8.7** Create ViewerPreferences store
  - [x] Persist layout preferences
  - [x] Persist metadata toggle states
  - [x] Per-mode preferences option

- [x] **5.8.8** Refactor vibe check pages
  - [x] Update Prompt Vibe to use ResponseViewer
  - [x] Update Model Vibe to use ResponseViewer
  - [x] Update Blind Review to use ResponseViewer
  - [x] Update Head-to-Head to use ResponseViewer

---

## UI/UX Principles

1. **Reading first** — Responses are always the largest element on screen
2. **Minimal chrome** — Controls should fade into background
3. **Keyboard friendly** — All actions accessible via shortcuts
4. **Position-aware** — Shuffle/randomize options to prevent bias
5. **Progressive disclosure** — Start simple, reveal complexity on demand
6. **Persistent state** — Remember view preferences, filter states

---

## Competitive Differentiation

| Feature | Promptfoo | Braintrust | LLM Comparator | Model Vibe Check |
|---------|-----------|------------|----------------|------------------|
| Side-by-side | ✓ | ✓ | ✓ | **✓** (configurable) |
| Full response viewing | ✗ | ✗ | ✗ | **✓** |
| Sync scrolling | ✗ | ✗ | ✗ | **✓** |
| Resizable columns | ✗ | ✗ | ✗ | **✓** |
| Markdown + syntax highlight | ✓ | ✓ | ✗ | **✓** |
| Blind evaluation | ✗ | ✗ | ✗ | **✓** |
| Flashcard mode | ✗ | ✗ | ✗ | **✓** |
| Position bias handling | ✗ | ✗ | ✓ | **✓** |
| Local-first | ✓ | ✗ | ✗ | **✓** |
| No code required | ✗ | ✗ | ✗ | **✓** |
| Model discovery | ✗ | ✗ | ✗ | **✓** |
| Model metadata (size/reasoning) | ✗ | ✗ | ✗ | **✓** |

---

## File Changes Summary

### New Files (Parts 1-4)
- `/app/settings/evaluators/page.tsx`
- `/app/vibe-check/page.tsx`
- `/app/vibe-check/prompt/page.tsx`
- `/app/vibe-check/model/page.tsx`
- `/app/vibe-check/blind/page.tsx`
- `/app/vibe-check/compare/page.tsx`
- `/app/models/overview/page.tsx`
- `/app/api/providers/[provider]/models/route.ts`
- `/app/api/rubrics/usage/route.ts`
- `/components/model-discovery.tsx`
- `/components/rubric-editor.tsx`
- `/components/prompt-table.tsx`
- `/components/vibe-columns.tsx`
- `/components/blind-review.tsx`
- `/components/head-to-head.tsx`

### New Files (Part 5 - ResponseViewer)
- `/components/response-viewer/index.tsx` — Main container
- `/components/response-viewer/viewer-toolbar.tsx` — Controls
- `/components/response-viewer/prompt-section.tsx` — Collapsible prompt
- `/components/response-viewer/response-panel.tsx` — Individual response
- `/components/response-viewer/response-content.tsx` — MD/code rendering
- `/components/response-viewer/response-header.tsx` — Model info
- `/components/response-viewer/response-footer.tsx` — Metadata
- `/lib/model-metadata.ts` — Auto-detection utilities
- `/lib/stores/viewer-preferences.ts` — Zustand store for preferences

### Modified Files (Parts 1-4)
- `/app/settings/page.tsx` — Add tabs
- `/app/prompts/page.tsx` — Add table view
- `/app/models/page.tsx` — Link to overview
- `/lib/types.ts` — Extended types
- `/lib/storage.ts` — New storage functions
- `/lib/providers/index.ts` — Model fetching functions
- `/components/navigation.tsx` — Add Vibe Check link

### Modified Files (Part 5)
- `/lib/types.ts` — Model schema with sizeClass, reasoning, contextWindow
- `/app/vibe-check/prompt/page.tsx` — Use ResponseViewer
- `/app/vibe-check/model/page.tsx` — Use ResponseViewer
- `/app/vibe-check/blind/page.tsx` — Use ResponseViewer
- `/app/vibe-check/compare/page.tsx` — Use ResponseViewer

---

## Success Metrics

After v0.3.0, a user should be able to:

1. Configure models by discovering what's available from their providers (not manual entry)
2. Create and manage custom rubrics without editing code
3. View all prompts in a filterable table with response metrics
4. Compare a prompt's performance across models in dedicated UI
5. Compare a model's performance across prompts in dedicated UI
6. Evaluate responses in blind mode without knowing which model produced them
7. Run head-to-head comparisons with pairwise voting
8. **View full responses side-by-side without fixed containers** (Part 5)
9. **Control layout, height mode, and metadata visibility** (Part 5)
10. **See model size tier and reasoning capability at a glance** (Part 5)
11. **Read markdown-rendered responses with syntax highlighting** (Part 5)
12. **Resize columns and use preset width options** (Part 5)

The overall experience should feel like **a workbench for qualitative evaluation**, not a dashboard of metrics. The **ResponseViewer** is the heart of this — it should be the most comfortable way to read and compare LLM outputs.
