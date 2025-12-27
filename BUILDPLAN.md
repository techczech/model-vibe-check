# Model Vibe Check — Build Plan

## Version History

- **v0.1.0** — Initial release (2024-12-26)
- **v0.2.0** — Evaluation system (complete)
- **v0.2.1** — Evaluation UX fixes (complete)

---

## v0.2.1 — Evaluation UX Fixes

**STATUS: COMPLETE**

### Problem Summary

The v0.2.0 evaluation modal is unusable: you can't see the response you're evaluating. Additional issues include no visual distinction between evaluated/unevaluated responses, no way to view existing evaluations, and incomplete keyboard navigation.

### Design Decision: Split-Panel Modal

Rationale for Option A (side-by-side modal) over alternatives:
- **vs. slide-out panel**: Modal keeps focus, prevents accidental navigation away
- **vs. inline expansion**: Would clutter the response list, hard to compare while evaluating
- **Split-panel**: Response visible at all times, rubric form stays compact, works on most screens

---

## Implementation Checklist

### Phase 1: Split-Panel Evaluation Modal (Critical)

**Goal:** Redesign evaluation-form.tsx so the response is always visible alongside the rubric.

- [x] **1.1** Update EvaluationForm props to accept response data
  - Add: `response: { content: string; modelName: string; runDate: string; iteration: number; latencyMs: number; tokensOutput?: number }`
  - Add: `promptContent: string` (for context)
  
- [x] **1.2** Redesign modal layout to split-panel
  - Left panel (55%): Response content with header showing model/date/iteration
  - Right panel (45%): Rubric form (existing form, slightly condensed)
  - Responsive: Stack vertically on mobile (<768px)
  - Minimum modal width: 900px on desktop (max-w-5xl)
  
- [x] **1.3** Left panel design
  - Header: Model name + badge, "Dec 27, 2024 · Iteration 2"
  - Subheader: Metadata (tokens, latency)
  - Content: Scrollable response text with monospace font
  - Collapsible "Show prompt" section at top
  
- [x] **1.4** Right panel adjustments
  - Reduced padding to fit more content
  - Kept existing keyboard navigation (j/k, y/n, 1-5)
  - Footer with Submit buttons
  
- [x] **1.5** Update responses page to pass required data
  - Find response object when opening modal
  - Pass model name from models lookup
  - Pass prompt content for context

### Phase 2: Visual Evaluation Status Badges

**Goal:** At a glance, see which responses have been evaluated and by whom.

- [x] **2.1** Create evaluation status helper function
  - Input: responseId, rubricEvaluations array
  - Output: `{ hasHuman: boolean, hasLLM: boolean, humanScore?: number, llmEval?: RubricEvaluation }`
  
- [x] **2.2** Add badges to response cards
  - 👤 User icon with score if human evaluation exists (blue background)
  - 🤖 Bot icon with checkmark if LLM evaluation exists (purple background)
  - Green tint background for evaluated response cards
  
- [x] **2.3** Update "X / Y evaluated" counter
  - Shows breakdown: "👤 3 · 🤖 2 · 5 / 10 evaluated"

### Phase 3: View Existing Evaluations

**Goal:** Don't blindly overwrite—show what's already there.

- [x] **3.1** Detect existing evaluation when opening modal
  - If exists: Pre-fill form with existing scores ✓
  - Shows amber banner: "Existing evaluation from [date] — submitting will replace it" ✓
  
- [ ] **3.2** Add "View" mode toggle (deferred)
  - Read-only display of existing evaluation
  - Button to switch to "Edit" mode
  
- [ ] **3.3** Show both human and LLM evaluations if both exist (deferred)
  - Tabs or accordion: "Human evaluation" / "LLM evaluation"
  - Can re-evaluate as human even if LLM exists

### Phase 4: State Management Fixes

**Goal:** Form state resets properly when switching responses.

- [x] **4.1** Fix useEffect dependencies in EvaluationForm
  - Added responseId to dependency array
  - Form now clears all state when responseId changes
  - Implemented during Phase 1 redesign
  
- [x] **4.2** Test "Submit & Next" workflow
  - Scores reset to defaults ✓
  - impressionScore clears ✓
  - reasoning textarea clears ✓

### Phase 5: Toast Notifications

**Goal:** User feedback for success/error states.

- [x] **5.1** Create toast component (shadcn pattern)
  - `hooks/use-toast.ts` - Toast context and hook
  - `components/toaster.tsx` - Toast display component
  
- [x] **5.2** Add ToastProvider to app layout
  - Wraps entire app in `app/layout.tsx`
  - Toaster component renders in bottom-right

- [x] **5.3** Replace console.error calls with toasts
  - Evaluation submit success/failure ✓
  - LLM judge success/failure ✓
  - No models available error ✓

### Phase 6: Global Keyboard Navigation

**Goal:** Navigate response list without mouse.

- [x] **6.1** Add focusedResponseId state to responses page
  - Track which response card has keyboard focus
  - Visual focus ring on focused card (ring-2 ring-primary)
  - Click on card also sets focus
  
- [x] **6.2** Implement j/k navigation
  - j: Focus next response (across model groups)
  - k: Focus previous response
  - Scroll focused card into view (smooth, centered)
  
- [x] **6.3** Implement e shortcut on focused response
  - Opens evaluation modal for focused response
  - If no focus, opens first unevaluated (current behavior)
  - Escape clears focus (or exits compare mode)

### Phase 7: Help Overlay Improvements

**Goal:** Complete keyboard shortcut documentation.

- [x] **7.1** Update KeyboardHelp to show context-aware shortcuts
  - Page-level shortcuts shown when no modal is open
  - Modal shortcuts shown when evaluation modal is open
  - "Modal Active" badge indicates context
  
- [x] **7.2** Better formatting
  - Improved key rendering with proper symbols (⌘, ⇧, ⌃, ⌥)
  - Modifier keys shown as separate kbd elements
  - Hover state on shortcut rows
  - Border and shadow on kbd elements for depth
  - Higher z-index to appear above modals

### Phase 8: Configurable Judge Model (Deferred)

**Goal:** Choose which model evaluates responses.

- [ ] **8.1** Add judge model selector to Settings page
- [ ] **8.2** Store in settings.json
- [ ] **8.3** Use configured model in runLLMJudge

---

## UI Mockup: Split-Panel Evaluation Modal

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Evaluate Response                                                    [×] Esc   │
├────────────────────────────────────────┬────────────────────────────────────────┤
│  GPT-4o                    Dec 27 '24  │  General Response Quality              │
│  Iteration 2 · 847 tok · 1.2s          │                                        │
├────────────────────────────────────────┤  ┌─────────────────────────────────┐   │
│                                        │  │ ● Addresses the prompt?         │   │
│  The actual response text appears      │  │   ( ) No    (•) Yes             │   │
│  here in a scrollable area.            │  └─────────────────────────────────┘   │
│                                        │                                        │
│  You can read the full response        │  ┌─────────────────────────────────┐   │
│  while filling out the rubric on       │  │ ○ Factual accuracy              │   │
│  the right side.                       │  │   [1] [2] [3] [4]               │   │
│                                        │  └─────────────────────────────────┘   │
│  This is crucial for actually          │                                        │
│  checking the vibe - you need to       │  ┌─────────────────────────────────┐   │
│  see what you're evaluating!           │  │ ○ Well-structured               │   │
│                                        │  │   [1] [2] [3] [4]               │   │
│  Lorem ipsum dolor sit amet...         │  └─────────────────────────────────┘   │
│                                        │                                        │
│                                        │  ───────────────────────────────────   │
│                                        │  Impression (1-10): [ 7 ]              │
│                                        │                                        │
│                                        │  Notes: ____________________________   │
│  ▼ Show original prompt                │                                        │
├────────────────────────────────────────┼────────────────────────────────────────┤
│  ↑↓ navigate · y/n binary · 1-5 scale  │     [Submit & Next]    [Submit]        │
└────────────────────────────────────────┴────────────────────────────────────────┘
```

---

## Testing Checklist for v0.2.1

- [x] Open evaluation modal - can see response content on left
- [x] Response header shows model name, date, iteration
- [x] Can scroll response independently of rubric
- [x] Keyboard nav still works (j/k/y/n/1-5)
- [x] Submit & Next resets form properly
- [x] Response cards show 👤/🤖 badges for evaluated responses
- [x] Evaluated cards have subtle visual distinction (green tint)
- [x] Opening already-evaluated response shows existing scores
- [x] Toast appears on successful evaluation submit
- [x] Toast appears on LLM judge completion
- [x] j/k navigates between responses in list
- [x] e opens evaluation for focused response
- [x] ? shows complete keyboard help

---

## v0.2.0 — Rubric-Based Evaluation

**STATUS: COMPLETE**

### Core Additions

1. **Prompt Coverage Stats**
2. **Response Metadata Display**
3. **Rubric-Based Evaluation System**
4. **Keyboard Navigation**

---

## 1. Prompt Coverage Stats

Show at a glance what data exists for each prompt.

### Display locations:
- Prompts list page: badge showing `5 models × 3 iterations`
- Prompt detail page: coverage matrix (which models, how many iterations each)
- Category page: aggregate stats

### Data structure:
```typescript
interface PromptCoverage {
  promptId: string;
  models: {
    modelId: string;
    modelName: string;
    iterationCount: number;
    evaluated: number;  // how many have rubric scores
  }[];
  totalResponses: number;
  totalEvaluated: number;
}
```

### API endpoint:
- `GET /api/prompts/[id]/coverage` — returns coverage stats

---

## 2. Response Metadata Display

Show quantitative data that isn't a "score" but helps understand the response.

### Already captured (just need UI):
- `latencyMs` — response time
- `tokensInput` — prompt tokens
- `tokensOutput` — completion tokens

### Display as:
- Subtle metadata row below each response
- Format: `1,234 tokens · 2.3s`
- Optional: token/second calculation

### Comparison view:
- Show metadata for each column
- Highlight significant differences (e.g., 10x latency difference)

---

## 3. Rubric-Based Evaluation System

The heart of v0.2.0. Both LLM and human judges use the same rubric.

### 3.1 Rubric Definition

Each prompt can have a custom rubric, or use a default.

```typescript
interface Rubric {
  id: string;
  name: string;
  description?: string;
  items: RubricItem[];
  allowImpressionScore: boolean;  // enable 1-10 gut feeling
}

interface RubricItem {
  id: string;
  label: string;           // e.g., "Follows instructions"
  description?: string;    // guidance for evaluator
  type: "binary" | "scale" | "checklist";
  options?: string[];      // for checklist type
  weight?: number;         // optional weighting
}
```

### Rubric Item Types:

**Binary** — Yes/No questions
- "Did the response include an example?"
- "Is the code syntactically correct?"

**Scale** — Degree of compliance (3-5 levels)
- Not present / Partial / Complete
- Missing / Attempted / Adequate / Good / Excellent

**Checklist** — Multiple elements to check
- "Contains: greeting, main point, call to action, sign-off"
- Each item checked independently

### 3.2 Evaluation Storage

```typescript
interface Evaluation {
  id: string;
  responseId: string;
  evaluatorType: "human" | "llm";
  evaluatorId?: string;      // model ID for LLM, user ID for human
  rubricId: string;
  scores: {
    [rubricItemId: string]: {
      value: string | number | boolean | string[];
      confidence?: number;   // LLM can express uncertainty
      note?: string;         // optional annotation
    };
  };
  impressionScore?: number;  // 1-10 gut feeling (human only?)
  reasoning?: string;        // LLM's explanation
  createdAt: string;
}
```

### 3.3 LLM-as-Judge Flow

1. Send prompt + response + rubric to judge model
2. Judge returns structured scores for each rubric item
3. Store with `evaluatorType: "llm"`
4. Display alongside response

**Judge prompt template:**
```
You are evaluating an AI response against a rubric.

## Original Prompt
{prompt}

## Response to Evaluate  
{response}

## Rubric
{rubric items with descriptions}

For each rubric item, provide your assessment.
Return JSON with scores and brief reasoning.
```

### 3.4 Human Evaluation Flow

1. Open response in evaluation mode
2. See rubric items as a form
3. Fill in scores (keyboard navigable)
4. Optional: add impression score (1-10)
5. Submit → stored with `evaluatorType: "human"`

### 3.5 Default Rubrics

Ship with sensible defaults:

**General Response Quality:**
- Addresses the prompt (binary)
- Factually accurate (scale: unknown/incorrect/partial/correct)
- Well-structured (scale)
- Appropriate length (scale: too short/right/too long)

**Code Generation:**
- Syntactically valid (binary)
- Solves the problem (scale)
- Handles edge cases (checklist)
- Well-commented (binary)

**Creative Writing:**
- Matches requested style (scale)
- Engaging/interesting (scale)
- Technically competent (scale)

---

## 4. Keyboard Navigation

Fast evaluation requires minimal mouse use.

### Global shortcuts:
- `j` / `k` — next/previous response
- `h` / `l` — previous/next model (in comparison view)
- `1-9` — set impression score
- `e` — open evaluation panel
- `?` — show keyboard help

### In evaluation panel:
- `Tab` / `Shift+Tab` — next/previous rubric item
- `y` / `n` — yes/no for binary items
- `1-5` — select scale value
- `Space` — toggle checklist item
- `Enter` — submit evaluation
- `Esc` — close panel

### Visual feedback:
- Current focus highlighted
- Progress indicator (evaluated X of Y)
- Quick status icons on response cards

---

## Implementation Priority

### Phase 1: Metadata & Stats
- [x] Add token/latency display to response views (formatResponseMeta: "847 tokens · 1.2s · 45.3 tok/s")
- [x] Create coverage stats API (`/api/prompts/coverage`)
- [x] Show coverage on prompt list page ("3 models · 12 responses")
- [x] Show coverage on prompt detail page (per-model iteration counts)

### Phase 2: Rubric System
- [x] Define rubric types and storage (`Rubric`, `RubricItem`, `RubricEvaluation` in types.ts)
- [x] Create default rubrics (General Quality, Code Generation, Creative Writing, Instruction Following, Quick Binary)
- [x] Add rubric API endpoints (`/api/rubrics`, `/api/evaluations`)
- [x] Build evaluation form component with keyboard navigation
- [x] Integrate evaluation into responses page (rubric selector, evaluate button, modal)

### Phase 3: LLM Judge
- [x] Create judge prompt builder (`lib/llm-judge.ts`)
- [x] Implement judge execution (`/api/evaluations/judge`)
- [x] Parse and store structured results
- [x] Add LLM judge button to response cards

### Phase 4: Human Evaluation
- [x] Build keyboard-navigable eval UI (evaluation-form.tsx with j/k/y/n/1-5 shortcuts)
- [x] Implement impression score (1-10)
- [x] Add evaluation workflow ("next unevaluated" button + Submit & Next)
- [x] Progress tracking (X/Y evaluated counter)

### Phase 5: Polish
- [x] Keyboard shortcut system (`hooks/use-keyboard-shortcuts.ts`)
- [x] Help overlay (`components/keyboard-help.tsx`, press ? to toggle)
- [x] Progress tracking (already done in Phase 4)
- [ ] Evaluation comparison (human vs LLM) - deferred to v0.2.1

### Testing Checklist
- [ ] Navigate to a prompt's responses page
- [ ] Verify rubric selector appears with 5 default rubrics
- [ ] Click "Evaluate Next" - modal should open
- [ ] Test keyboard nav in modal: ↑/↓ move focus, y/n for binary, 1-5 for scale
- [ ] Submit evaluation and verify it shows in the count
- [ ] Click bot icon to run LLM judge (requires configured model)
- [ ] Press `?` to see keyboard help
- [ ] Press `e` to evaluate next
- [ ] Press `c` to compare all models

---

## Data Migration

v0.1.0 responses already have `latencyMs`, `tokensInput`, `tokensOutput`.

New fields needed:
- `Prompt.rubricId` — link to rubric
- New `evaluations` collection

No breaking changes to existing data.

---

## UI Mockups

### Response card with metadata:
```
┌─────────────────────────────────────────┐
│ GPT-4                           [Edit]  │
├─────────────────────────────────────────┤
│                                         │
│ The response text appears here...       │
│                                         │
├─────────────────────────────────────────┤
│ 847 tokens · 1.2s     [👤 8/10] [🤖 ✓]  │
└─────────────────────────────────────────┘
```

### Evaluation panel:
```
┌─────────────────────────────────────────┐
│ Evaluate Response            [×] Esc    │
├─────────────────────────────────────────┤
│                                         │
│ ○ Addresses the prompt?                 │
│   ( ) No  (•) Yes                       │
│                                         │
│ ○ Response quality                      │
│   [1] [2] [3] [4] [5]                   │
│                                         │
│ ○ Contains required elements:           │
│   [✓] Example  [ ] Code  [✓] Diagram    │
│                                         │
│ ─────────────────────────────────────── │
│ Impression (1-10): [7]                  │
│                                         │
│              [Submit] Enter             │
└─────────────────────────────────────────┘
```

---

## v0.1.0 Reference (Completed)

- Response browsers by Prompt/Model/Category
- Side-by-side comparison with iteration switching
- Multi-provider support (Ollama, OpenAI, Google, OpenRouter)
- Run execution with parallel processing
- CSV/JSON export
- 10 sample prompts
