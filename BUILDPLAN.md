# Model Vibe Check — Build Plan v4

## Core Principle

**You check the vibe by READING responses, not looking at scores.**

Browse by Prompt / Model / Category. Runs are just archives.

---

## ✅ ALL PHASES COMPLETE

### What Was Built

**Three main browsing paths:**

1. **By Prompt** → `/prompts/[id]/responses`
   - See all responses to a specific prompt
   - Compare across models and iterations side-by-side
   - Switch iterations per column in compare mode
   - Access from prompt detail page or run archive

2. **By Model** → `/models/[id]/responses`
   - See all responses from a specific model
   - Grouped by prompt
   - Same comparison features
   - Access from models list or run archive

3. **By Category** → `/categories/[slug]`
   - Browse prompts by category
   - See response counts per prompt
   - Quick links to prompt response browsers

**Runs are now archives:**
- Show what was run and when
- Links to browse responses by prompt or model
- Execution and export still work
- No more score-centric emoji grid as primary view

---

## Files Created/Modified

**New pages:**
- `/app/categories/page.tsx` — Categories list
- `/app/categories/[slug]/page.tsx` — Category detail
- `/app/prompts/[id]/responses/page.tsx` — Prompt response browser + comparison
- `/app/models/[id]/responses/page.tsx` — Model response browser + comparison

**New API endpoints:**
- `/app/api/prompts/[id]/responses/route.ts`
- `/app/api/models/[id]/responses/route.ts`

**Modified:**
- `/lib/storage.ts` — Added `getResultsForPrompt()`, `getResultsForModel()`
- `/app/runs/[id]/page.tsx` — Simplified to archive view
- `/app/layout.tsx` — Added Categories to navigation
- `/app/prompts/[id]/page.tsx` — Added "Responses" button
- `/app/models/page.tsx` — Added "Responses" button per model

---

## Test It

```bash
cd /Users/dominiklukes/gitrepos/model-vibe-check
npm run dev
```

1. Go to **Prompts** → pick one → click **Responses**
   - See all responses grouped by model
   - Select 2+ responses → **Compare**
   - Switch models/iterations in compare columns

2. Go to **Models** → pick one → click **Responses**
   - See all responses grouped by prompt

3. Go to **Categories** → pick one
   - See prompts in that category with response counts

4. Go to **Runs** → pick a completed run
   - See archive view with links to browse by prompt/model

---

## What's Left (Optional Polish)

- [ ] Remove old evaluation pages if redundant (`/runs/[id]/evaluate`, `/runs/[id]/judge`, `/runs/[id]/compare`)
- [ ] Add inline notes/scores in response browsers
- [ ] Keyboard shortcuts for comparison navigation
