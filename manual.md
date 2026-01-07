# Model Vibe Check - Complete Manual

> **Purpose:** A qualitative LLM evaluation platform for comparing model responses across prompts, iterations, and evaluation methods.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Navigation](#2-navigation)
3. [Dashboard](#3-dashboard)
4. [Prompts](#4-prompts)
5. [Models](#5-models)
6. [Runs](#6-runs)
7. [Vibe Check Hub](#7-vibe-check-hub)
8. [Evaluations & Rubrics](#8-evaluations--rubrics)
9. [Settings](#9-settings)
10. [Technical Implementation](#10-technical-implementation)

---

## 1. Overview

Model Vibe Check is a Next.js application for testing and comparing Large Language Model (LLM) responses. The core workflow is:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  1. Create  │     │  2. Create  │     │  3. Execute │     │ 4. Evaluate │
│   Prompts   │ ──▶ │    a Run    │ ──▶ │    Run      │ ──▶ │  Responses  │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
   Define what         Select which       Generate actual    Rate, compare,
   to ask models       prompts/models     responses from     judge responses
                       to test            each model
```

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Prompt** | A text instruction sent to models. Can be single-turn or multi-turn (multiple steps). Can include attachments (images, files). |
| **Model** | An LLM endpoint (OpenAI, Google, Ollama, OpenRouter). |
| **Run** | A test execution: prompts × models × iterations = responses. |
| **Evaluation** | A score/rating applied to a response (human, LLM judge, or machine check). |
| **Rubric** | A structured evaluation framework with multiple scoring dimensions. |

---

## 2. Navigation

### Sidebar Menu

The collapsible sidebar (toggle: `Cmd/Ctrl+B`) provides access to all features:

| Icon | Menu Item | Path | Purpose |
|------|-----------|------|---------|
| 📊 | Dashboard | `/` | Overview stats and quick actions |
| ✨ | Vibe Check | `/vibe-check` | Comparison and evaluation hub |
| 📄 | Prompts | `/prompts` | Manage prompts (single and multi-turn) |
| 🖥️ | Models | `/models` | Configure LLM endpoints |
| ▶️ | Runs | `/runs` | Execute and view test runs |
| ✓ | Evaluations | `/evaluations` | Manage rubrics and view scores |
| ⚙️ | Settings | `/settings` | API keys and defaults |

### Implementation

**File:** `/components/collapsible-sidebar.tsx`

```
- Stores collapsed state in localStorage
- Active route highlighting
- Tooltips when collapsed
- Keyboard shortcut support
```

---

## 3. Dashboard

**Path:** `/` | **File:** `/app/page.tsx`

### What You See

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MODEL VIBE CHECK                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    VIBE CHECK HUB                             │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │   │
│  │  │ Prompt  │ │ Model   │ │  Blind  │ │ Head to │             │   │
│  │  │  Vibe   │ │  Vibe   │ │ Review  │ │  Head   │             │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│  │ Prompts │ │ Models  │ │Responses│ │Evaluated│                    │
│  │   77    │ │  12/27  │ │   423   │ │   156   │                    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                    │
│                                                                      │
│  Recent Runs                    Quick Actions                        │
│  ├── Run Alpha (completed)      ├── Add new prompt                  │
│  ├── Run Beta (running...)      ├── Configure models                │
│  └── Run Gamma (pending)        └── Import prompts                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Stats Cards

- **Prompts:** Total count across all categories
- **Active Models:** Enabled models (of total configured)
- **Responses:** Total generated from all completed runs
- **Evaluated:** Responses with at least one evaluation

### Quick Actions

| Button | Where It Goes |
|--------|---------------|
| Add new prompt | `/prompts/new` |
| Configure models | `/models` |
| Import prompts | `/prompts/import` |

### Getting Started (First-time users)

If you have no data yet, a wizard guides you:
1. Add your API keys
2. Create your first prompt
3. Select models to test
4. Run your first comparison

---

## 4. Prompts

### 4.1 Prompts List

**Path:** `/prompts` | **File:** `/app/prompts/page.tsx`

#### Features

- **Search:** Filter by title, content, or keywords
- **Category Filter:** Click category badges to filter
- **Sort:** By date, title, or category
- **View Modes:** Card view or list view

#### Actions on Each Prompt

| Button | Action |
|--------|--------|
| View | See prompt details and response history |
| Edit | Modify prompt content and settings |
| Vibe Check | Compare model responses |
| Delete | Remove prompt (with confirmation) |

### 4.2 Create Prompt

**Path:** `/prompts/new` | **File:** `/app/prompts/new/page.tsx`

#### Form Fields

```
┌─────────────────────────────────────────────────────────────────┐
│ NEW PROMPT                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Title *                    Category                              │
│ ┌────────────────────┐     ┌────────────────────┐               │
│ │ My Coding Task     │     │ Coding         ▼   │               │
│ └────────────────────┘     └────────────────────┘               │
│                                                                  │
│ Keywords (comma-separated)                                       │
│ ┌────────────────────────────────────────────────┐              │
│ │ python, algorithms, sorting                    │              │
│ └────────────────────────────────────────────────┘              │
│                                                                  │
│ Description                                                      │
│ ┌────────────────────────────────────────────────┐              │
│ │ Tests ability to implement efficient sorts    │              │
│ └────────────────────────────────────────────────┘              │
│                                                                  │
│ PROMPT STEPS                                   [+ Add Step]      │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Step 1                                              [×]   │   │
│ │ ┌─────────────────────────────────────────────────────┐   │   │
│ │ │ Write a Python function that implements quicksort  │   │   │
│ │ └─────────────────────────────────────────────────────┘   │   │
│ │ Expected Answer (optional)                                │   │
│ │ ┌─────────────────────────────────────────────────────┐   │   │
│ │ │ def quicksort(arr): ...                             │   │   │
│ │ └─────────────────────────────────────────────────────┘   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Attachments   [+ Add Files]                                      │
│ ├── image.png (234 KB)  [×]                                     │
│ └── data.json (12 KB)   [×]                                     │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│ EVALUATION CONFIGURATION                                         │
│                                                                  │
│ Methods:  [Human ✓] [LLM Judge ✓] [Machine ○] [Pairwise ○]      │
│                                                                  │
│ Machine Judge (if selected):                                     │
│   Type: [contains ▼]  Criteria: [quicksort]                     │
│   □ Case Sensitive                                               │
│                                                                  │
│                                    [Cancel]  [Save Prompt]       │
└─────────────────────────────────────────────────────────────────┘
```

#### Single vs Multi-Turn Prompts

A prompt can have **one or more steps**:
- **Single-step (default):** Traditional prompt with one user message
- **Multi-step (conversation):** Multiple user messages in sequence, where each step sees the conversation history

Multi-turn prompts test context retention and coherence across turns.

#### Categories (Predefined)

- Spatial Cognition
- Multilingual
- Linguistics
- Coding
- Creative Writing
- Vision
- Agentic
- Long Context
- Reasoning
- Other

#### Evaluation Methods

| Method | How It Works |
|--------|--------------|
| **Human** | Manual 1-10 rating with notes |
| **LLM Judge** | Another model evaluates the response |
| **Machine** | Automated checks (contains, regex, exact match, etc.) |
| **Pairwise** | A vs B comparisons between models |

#### Machine Judge Types

| Type | Use Case |
|------|----------|
| `contains` | Response must contain a string |
| `regex` | Response must match a pattern |
| `exact` | Response must equal expected exactly |
| `json-schema` | Response must be valid JSON matching schema |
| `word-count` | Response must have N words (± tolerance) |
| `arithmetic` | Response must contain correct calculation |
| `string-reversal` | Response must contain reversed string |
| `list-sort` | Response must contain sorted list |

### 4.3 View Prompt

**Path:** `/prompts/[id]` | **File:** `/app/prompts/[id]/page.tsx`

Shows:
- Full prompt content with formatting
- All steps (for multi-turn prompts)
- Expected answer (if set)
- Attachments with preview
- Evaluation configuration
- **Response Coverage:** Which models have responded
- **Run History:** Which runs included this prompt

Quick Actions:
- Prompt Vibe (compare responses)
- Head-to-Head (pairwise comparison)
- View Responses
- Run New Test
- Edit

### 4.4 Import Prompts

**Path:** `/prompts/import` | **File:** `/app/prompts/import/page.tsx`

Accepts JSON in three formats:
1. `[{title, content, ...}, ...]` - Array
2. `{prompts: [...]}` - Object with prompts key
3. `{contentData: [...]}` - SemanticMachines.fyi format

---

## 5. Models

**Path:** `/models` | **File:** `/app/models/page.tsx`

### Two Tabs

#### Overview Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ MODELS OVERVIEW                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ Active  │ │Responses│ │Avg Score│ │Providers│               │
│  │  12     │ │   423   │ │   7.2   │ │    4    │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│                                                                  │
│  Filter: [All Sizes ▼] [All Reasoning ▼]  Sort: [Provider ▼]   │
│                                                                  │
│  ┌───┬─────────────────┬────────┬─────────┬──────────┬────────┐│
│  │ # │ Model           │ Size   │Responses│ Evaluated│  Score ││
│  ├───┼─────────────────┼────────┼─────────┼──────────┼────────┤│
│  │ 🥇│ GPT-4o          │Frontier│    89   │   100%   │  8.4   ││
│  │ 🥈│ Claude Sonnet   │Frontier│    76   │    95%   │  8.2   ││
│  │ 🥉│ Gemini 2.0      │ Flash  │    54   │    89%   │  7.8   ││
│  │   │ Llama 3.3 70B   │ Large  │    42   │    67%   │  7.1   ││
│  └───┴─────────────────┴────────┴─────────┴──────────┴────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Manage Tab

Add and configure models:

**Add Model Form:**
1. Select Provider (Ollama, OpenAI, Google, OpenRouter)
2. Choose model from dropdown or enter custom ID
3. Optional: Set size class, reasoning capability, context window

**Model Table:**
- Toggle active/inactive
- Edit display name
- Set size class and reasoning capability
- Toggle vision/audio support
- Delete model

**Batch Actions:**
- Select multiple models
- Set size class for all
- Set reasoning capability for all
- Activate/Deactivate all
- Delete all

### Supported Providers

| Provider | Example Models | API Key Location |
|----------|----------------|------------------|
| **Ollama** | llama3.2, qwen2.5, phi-4 | Local (no key needed) |
| **OpenAI** | gpt-4o, gpt-4o-mini, o1 | Settings → API Keys |
| **Google** | gemini-2.0-flash, gemini-1.5-pro | Settings → API Keys |
| **OpenRouter** | claude-sonnet-4, llama-3.3-70b | Settings → API Keys |

### Model Metadata

| Field | Values |
|-------|--------|
| **Size Class** | frontier, flash, lite, sub-1b, 1-3b, 3-7b, 7-14b, 14-34b, 35-70b, 70-100b, 100-200b, 200b+ |
| **Reasoning** | none, reasoning, hybrid |
| **Context Window** | Number of tokens |
| **Parameters** | e.g., "70B" |

---

## 6. Runs

### 6.1 Create Run

**Path:** `/runs/new` | **File:** `/app/runs/new/new-run-form.tsx`

```
┌─────────────────────────────────────────────────────────────────┐
│ NEW VIBE CHECK RUN                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Run Name: [Vibe Check 2025-01-15                           ]    │
│                                                                  │
│ Iterations: [3 ▼]  (run each prompt 3 times per model)          │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ PROMPTS (12 selected)                          [All] [None]     │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ☑ What is the capital of France?         [Reasoning]      │   │
│ │ ☑ Write a haiku about spring              [Creative]      │   │
│ │ ☐ Translate to French: Hello              [Multilingual]  │   │
│ │ ☑ Implement quicksort                     [Coding]        │   │
│ │ ☑ Math Conversation (3 steps)             [Multi-turn]    │   │
│ │ ...                                                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ MODELS (8 selected)                            [All] [None]     │
│ Quick: [+Frontier] [+Flash] [+Reasoning] │ [+Remote] [-Local]  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ☑ GPT-4o                [OpenAI]    [Frontier][Reasoning] │   │
│ │ ☑ GPT-4o-mini           [OpenAI]    [Flash]               │   │
│ │ ☑ Claude Sonnet         [OpenRouter][Frontier][Reasoning] │   │
│ │ ☐ Llama 3.2 (local)     [Ollama]    [7-14b]               │   │
│ │ ...                                                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ SUMMARY                                                          │
│   12 prompts × 8 models × 3 iterations = 288 responses          │
│   Estimated time: ~14 minutes                                    │
│                                                                  │
│                                         [Start Vibe Check ▶]    │
└─────────────────────────────────────────────────────────────────┘
```

#### Quick Select Buttons

| Button | Effect |
|--------|--------|
| `+Frontier` | Add all frontier-class models |
| `+Flash` | Add all flash-class models |
| `+Reasoning` | Add models with reasoning capability |
| `+Remote` | Add all cloud models (non-Ollama) |
| `-Local` | Remove all Ollama models |

### 6.2 Run Execution

**File:** `/app/api/runs/[id]/execute/route.ts`

```
Execution Flow:
                                  ┌──────────────────┐
                                  │ Load Run Config  │
                                  └────────┬─────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
             ┌────────────┐         ┌────────────┐         ┌────────────┐
             │  Worker 1  │         │  Worker 2  │         │  Worker 3  │
             │  (Task A)  │         │  (Task B)  │         │  (Task C)  │
             └─────┬──────┘         └─────┬──────┘         └─────┬──────┘
                   │                      │                      │
                   ▼                      ▼                      ▼
             ┌────────────┐         ┌────────────┐         ┌────────────┐
             │   Model    │         │   Model    │         │   Model    │
             │   Call     │         │   Call     │         │   Call     │
             └─────┬──────┘         └─────┬──────┘         └─────┬──────┘
                   │                      │                      │
                   └──────────────────────┼──────────────────────┘
                                          │
                                          ▼
                                  ┌───────────────┐
                                  │ Save Results  │
                                  │ (every 5 sec) │
                                  └───────────────┘
```

- **Concurrency:** 3 workers by default (configurable 1-10)
- **Auto-save:** Every 5 seconds to prevent data loss
- **Cancellation:** Graceful stop (finishes current tasks)
- **Machine evaluation:** Auto-runs during execution if configured

### 6.3 Run Detail

**Path:** `/runs/[id]` | **File:** `/app/runs/[id]/page.tsx`

#### Status Badge

| Status | Color | Meaning |
|--------|-------|---------|
| Pending | Gray | Created but not started |
| Running | Blue | Currently executing |
| Completed | Green | All tasks finished |
| Failed | Red | Error occurred |
| Cancelled | Yellow | User stopped execution |

#### Progress (While Running)

```
┌─────────────────────────────────────────────────────────────┐
│ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  156/288 (54%)│
│                                                 [Cancel]    │
└─────────────────────────────────────────────────────────────┘
```

#### Navigation Tabs

| Tab | Purpose |
|-----|---------|
| **Details** | Browse responses by prompt or model |
| **Compare** | Pairwise model comparison |
| **Evaluate** | Human rating interface |
| **LLM Judge** | Automated evaluation |

#### Browse Responses

Click a prompt to expand inline response viewer:
```
┌─ What is the capital of France? ────────────────────────────┐
│                                                              │
│  ┌─ GPT-4o (1.2s) ───────────────────────────────────────┐  │
│  │ The capital of France is Paris.                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─ Claude Sonnet (0.9s) ────────────────────────────────┐  │
│  │ Paris is the capital city of France.                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.4 Multi-Turn Execution

For multi-turn prompts, each step maintains conversation context:

```
Prompt: "Math Conversation" (3 steps)
Model: GPT-4o, Iteration: 1

Step 1:
  User: "What is 2+2?"
  Assistant: "2+2 equals 4"

  History: [user: "2+2?", assistant: "4"]

Step 2:
  User: "Multiply that by 3"
  Sent to model: [user: "2+2?", assistant: "4", user: "Multiply by 3"]
  Assistant: "4 times 3 equals 12"

  History: [user: "2+2?", assistant: "4", user: "×3", assistant: "12"]

Step 3:
  User: "What was my first question?"
  Sent to model: [entire history + new question]
  Assistant: "Your first question was 'What is 2+2?'"
```

**Implementation:** `/app/api/runs/[id]/execute/route.ts`

---

## 7. Vibe Check Hub

**Path:** `/vibe-check` | **File:** `/app/vibe-check/page.tsx`

Four evaluation modes:

### 7.1 Prompt Vibe

**Path:** `/vibe-check/prompt` | **Purpose:** "Which model is best for this task?"

```
┌─────────────────────────────────────────────────────────────────┐
│ PROMPT VIBE                              Prompt: [Select... ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Prompt: "Write a haiku about spring"                           │
│                                                                  │
│  ┌─ GPT-4o ──────────┐  ┌─ Claude Sonnet ────┐  ┌─ Gemini ────┐ │
│  │ Cherry blossoms   │  │ Spring awakens    │  │ Petals fall │ │
│  │ dance in gentle   │  │ softly, gently,   │  │ like snow   │ │
│  │ spring breeze     │  │ blooming hope     │  │ in warmth   │ │
│  └───────────────────┘  └────────────────────┘  └─────────────┘ │
│                                                                  │
│  [Shuffle] [Show/Hide Models]  Iteration: [1 ▼]                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

- Compare all model responses to the same prompt
- Navigate between iterations
- Shuffle order to avoid bias

### 7.2 Model Vibe

**Path:** `/vibe-check/model` | **Purpose:** "What is this model good at?"

```
┌─────────────────────────────────────────────────────────────────┐
│ MODEL VIBE                               Model: [GPT-4o     ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ Model Stats ─────────────────────────────────────────────┐  │
│  │ GPT-4o (OpenAI) │ Frontier │ Reasoning │ 128K context     │  │
│  │ Prompts: 42     │ Evaluated: 38        │ Avg Score: 8.2   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Category: [All ▼]                                              │
│                                                                  │
│  Prompt: "Implement quicksort"                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ def quicksort(arr):                                       │  │
│  │     if len(arr) <= 1:                                     │  │
│  │         return arr                                        │  │
│  │     ...                                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│                                    [Previous] [1/42] [Next]     │
└─────────────────────────────────────────────────────────────────┘
```

- Browse all responses from one model
- Filter by prompt category
- View performance stats

### 7.3 Blind Review

**Path:** `/vibe-check/blind` | **Purpose:** "Judge without bias"

```
┌─────────────────────────────────────────────────────────────────┐
│ BLIND REVIEW                                      [Reveal Model]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Prompt: "Explain quantum entanglement simply"                  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │ Imagine two coins that are magically linked. When you     │  │
│  │ flip one and it lands on heads, the other one—no matter   │  │
│  │ how far away—instantly becomes tails. That's quantum      │  │
│  │ entanglement in a nutshell!                               │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Rate this response:                                             │
│  [1] [2] [3] [4] [5] [6] [7] [8] [9]                            │
│                                                                  │
│  Progress: 23/156 responses rated                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Keyboard shortcuts:
- `1-9`: Rate response
- `R`: Reveal model name
- `S`: Skip response
- `←/→`: Navigate

### 7.4 Head-to-Head

**Path:** `/vibe-check/compare` | **Purpose:** "Which is better?"

```
┌─────────────────────────────────────────────────────────────────┐
│ HEAD-TO-HEAD                           Prompt: [Select... ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Prompt: "Write a professional email declining a meeting"       │
│                                                                  │
│  ┌─ Response A ─────────────┐  ┌─ Response B ─────────────────┐ │
│  │ Dear [Name],             │  │ Hi [Name],                   │ │
│  │                          │  │                               │ │
│  │ Thank you for the        │  │ I appreciate the invitation  │ │
│  │ invitation. Unfortunately│  │ but unfortunately I won't   │ │
│  │ I have a prior           │  │ be able to make it...       │ │
│  │ commitment...            │  │                               │ │
│  └──────────────────────────┘  └───────────────────────────────┘ │
│                                                                  │
│        [A Wins]        [Tie]        [B Wins]                    │
│                                                                  │
│  Comparisons: 12/28                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

- Randomized left/right positioning
- All unique pairs automatically generated
- Results summary shows win/loss record

---

## 8. Evaluations & Rubrics

**Path:** `/evaluations` | **File:** `/app/evaluations/page.tsx`

### 8.1 Rubric System

Rubrics are structured evaluation frameworks:

```
┌─ General Response Quality ─────────────────────────────────────┐
│                                                                 │
│ Items:                                                          │
│                                                                 │
│ ☐ Addresses the prompt              [Binary: Yes/No]           │
│                                                                 │
│ ○ Factual accuracy                  [Scale: 1-4]               │
│   ├── Unknown                                                   │
│   ├── Contains errors                                           │
│   ├── Mostly accurate                                           │
│   └── Fully accurate                                            │
│                                                                 │
│ ☐ Well-structured                   [Scale: 1-3]               │
│   ├── Poor structure                                            │
│   ├── Adequate structure                                        │
│   └── Excellent structure                                       │
│                                                                 │
│ □ Edge cases handled                [Checklist]                │
│   ├── ☐ Empty input                                             │
│   ├── ☐ Invalid input                                           │
│   └── ☐ Boundary values                                         │
│                                                                 │
│ ☑ Allow impression score (1-10 gut feeling)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Rubric Item Types

| Type | Widget | Stored As |
|------|--------|-----------|
| **Binary** | Checkbox | boolean |
| **Scale** | Radio buttons with labels | 0-based index |
| **Checklist** | Multiple checkboxes | array of indices |

### Default Rubrics

1. **General Response Quality** - All-purpose evaluation
2. **Code Generation** - For coding prompts
3. **Creative Writing** - For creative prompts
4. **Instruction Following** - Did it follow directions?
5. **Quick Yes/No** - Simple accept/reject

### 8.2 Human Evaluation

**Path:** `/runs/[id]/evaluate`

```
┌─────────────────────────────────────────────────────────────────┐
│ EVALUATE RESPONSE                               23 of 156       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Prompt: "Write a haiku about spring"                           │
│  Expected: "A 5-7-5 syllable poem about spring"                 │
│                                                                  │
│  Model: GPT-4o │ Latency: 1.2s │ Tokens: 23                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Cherry blossoms dance                                      │  │
│  │ In the gentle spring breeze—                               │  │
│  │ New life awakens                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Score: ○1 ○2 ○3 ○4 ○5 ○6 ○7 ●8 ○9 ○10                         │
│  ─────────────────────────────────────────────────────────────  │
│  Notes:                                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Good syllable count, evocative imagery                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Previous]  [Skip (S)]  [Save & Next (Enter)]  [Next]          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Keyboard shortcuts:
- `1-9, 0`: Set score (0 = 10)
- `Enter`: Save and next
- `S`: Skip
- `?`: Toggle help

### 8.3 LLM Judge

**Path:** `/runs/[id]/judge`

Automated evaluation using another model:

```
┌─────────────────────────────────────────────────────────────────┐
│ LLM JUDGE                                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Judge Model: [gpt-4o-mini ▼]  Temperature: [0.3]               │
│  ☑ Include reasoning                                             │
│                                                                  │
│  Progress: ████████████░░░░░░░░░░░  42/156 judged               │
│                                                                  │
│  [Judge 114 Remaining Results]                                   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Recent Judgments:                                               │
│                                                                  │
│  ┌─ Response #1 ─────────────────────────────────────────────┐  │
│  │ Score: 8/10                                                │  │
│  │ Reasoning: The response accurately explains the concept    │  │
│  │ with clear examples. Minor improvement possible in...      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Settings

**Path:** `/settings` | **File:** `/app/settings/page.tsx`

### 9.1 API Keys Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ API KEYS                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ OpenAI API Key                                                   │
│ ┌─────────────────────────────────────────────┐ [Show/Hide]     │
│ │ sk-••••••••••••••••••••••••••••••••••••     │                │
│ └─────────────────────────────────────────────┘                 │
│                                                                  │
│ Google AI API Key                                                │
│ ┌─────────────────────────────────────────────┐ [Show/Hide]     │
│ │ AIza••••••••••••••••••••••••••••••••••      │                │
│ └─────────────────────────────────────────────┘                 │
│                                                                  │
│ OpenRouter API Key                                               │
│ ┌─────────────────────────────────────────────┐ [Show/Hide]     │
│ │ sk-or-••••••••••••••••••••••••••••••••      │                │
│ └─────────────────────────────────────────────┘                 │
│                                                                  │
│ Ollama Configuration                                             │
│ Base URL: [http://localhost:11434                          ]    │
│                                                                  │
│ ⓘ API keys are stored locally and never sent to external servers│
│                                                                  │
│                                              [Save Settings]     │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Defaults Tab

| Setting | Default | Range |
|---------|---------|-------|
| LLM Judge Model | gpt-4o-mini | Any active model |
| Default Iterations | 1 | 1-10 |
| Default Temperature | 0.7 | 0.0-2.0 |
| Default Rubric | General Quality | Any rubric |

---

## 10. Technical Implementation

### 10.1 Project Structure

```
model-vibe-check/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── prompts/              # Prompt CRUD
│   │   ├── models/               # Model management
│   │   ├── runs/                 # Run execution
│   │   │   └── [id]/
│   │   │       ├── execute/      # POST: Run execution engine
│   │   │       ├── cancel/       # POST: Cancel running
│   │   │       ├── evaluate/     # POST: Save evaluations
│   │   │       └── judge/        # POST: LLM judge
│   │   ├── rubrics/              # Rubric management
│   │   ├── evaluations/          # Evaluation storage
│   │   └── settings/             # App settings
│   ├── prompts/                  # Prompt UI pages
│   ├── models/                   # Model UI pages
│   ├── runs/                     # Run UI pages
│   ├── vibe-check/               # Vibe Check modes
│   ├── evaluations/              # Evaluation UI
│   └── settings/                 # Settings UI
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   ├── collapsible-sidebar.tsx   # Main navigation
│   ├── response-viewer/          # Response display
│   └── computable-stats.tsx      # Statistics display
├── lib/                          # Core logic
│   ├── types.ts                  # TypeScript interfaces
│   ├── storage.ts                # File-based data layer
│   ├── utils.ts                  # Utility functions
│   ├── providers/                # LLM provider integrations
│   │   └── index.ts              # executePrompt, executeConversation
│   └── evaluation/               # Evaluation logic
│       └── machine.ts            # Machine judge functions
└── data/                         # JSON data storage
    ├── prompts.json              # Prompt definitions
    ├── models.json               # Model configurations
    ├── settings.json             # App settings
    ├── rubrics.json              # Rubric definitions
    ├── evaluations.json          # Rubric evaluations
    └── runs/                     # Individual run files
        └── {run-id}.json
```

### 10.2 Data Types

**Core Types** (see `/lib/types.ts`):

| Type | Purpose |
|------|---------|
| `Prompt` | Prompt with one or more steps, expected answers, attachments |
| `PromptStep` | Single step in a prompt |
| `Model` | LLM configuration (provider, ID, metadata) |
| `Run` | Test execution (prompts × models × iterations) |
| `Result` | Single response from a model |
| `Evaluation` | Human/LLM/Machine evaluation of a result |
| `Rubric` | Structured evaluation framework |
| `RubricEvaluation` | Evaluation using a rubric |

### 10.3 API Patterns

All API routes follow this pattern:

```typescript
// GET - List or retrieve
export async function GET(request: Request) {
  const data = await storage.getData();
  return NextResponse.json({ data });
}

// POST - Create or execute
export async function POST(request: Request) {
  const body = await request.json();
  const result = await storage.save(body);
  return NextResponse.json({ success: true, result });
}

// PUT - Update
export async function PUT(request: Request) {
  const body = await request.json();
  await storage.update(body);
  return NextResponse.json({ success: true });
}

// DELETE - Remove
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  await storage.delete(id);
  return NextResponse.json({ success: true });
}
```

### 10.4 Provider Integration

**File:** `/lib/providers/index.ts`

```typescript
// Single message execution
executePrompt(prompt, model, attachments, settings): Promise<ExecutionResult>

// Multi-turn conversation
executeConversation(messages, model, settings): Promise<ExecutionResult>

// Result structure
interface ExecutionResult {
  response: string;
  latencyMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  error?: string;
}
```

Supported providers:
- **Ollama:** Direct HTTP to local instance
- **OpenAI:** Via Vercel AI SDK
- **Google:** Via Vercel AI SDK
- **OpenRouter:** Via OpenAI-compatible API

### 10.5 Storage Layer

**File:** `/lib/storage.ts`

All data stored as JSON files:
- Prompts, models, settings: Single JSON files
- Runs: Individual files in `data/runs/` directory
- Uses file locking for concurrent access safety

---

## Keyboard Shortcuts Summary

| Context | Shortcut | Action |
|---------|----------|--------|
| Global | `Cmd/Ctrl+B` | Toggle sidebar |
| Blind Review | `1-9` | Rate response |
| Blind Review | `R` | Reveal model |
| Blind Review | `S` | Skip |
| Evaluation | `1-9, 0` | Set score (0=10) |
| Evaluation | `Enter` | Save and next |
| Evaluation | `S` | Skip |
| Evaluation | `?` | Toggle help |
