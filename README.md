# Model Vibe Check

A tool for qualitative LLM evaluation. Run prompts against multiple models, read the responses side-by-side, and decide which ones have the right vibe.

**Version 0.6.0**

## Philosophy

Most LLM benchmarks reduce model outputs to numbers. But you can't check the vibe from a score. This tool is built around one idea: **you need to read the actual responses**.

- Browse responses by **Prompt**, **Model**, or **Category**
- Compare outputs **side-by-side** across models and iterations
- Evaluate with **structured rubrics** or gut feeling
- Use **LLM-as-judge** for automated evaluation
- Runs are archives — browsing is the primary experience

## What's New in v0.6.0

- **Resizable Columns**: Drag to resize columns in comparison views
- **Model Metadata Filtering**: Filter and sort models by size class (Frontier/Flash/Open) and reasoning capability
- **Collapsible Sidebar**: More screen space for reading responses
- **Quick Model Selection**: Quickly add all Frontier, Flash, or Reasoning models when creating runs
- **Improved Response Viewer**: Better markdown toggle, word wrap, and toolbar layout
- **Evaluations Page**: Dedicated page for managing evaluations

## Features

### Core Features
- **Multi-provider support**: OpenAI, Google (Gemini), Ollama (local models), OpenRouter
- **Prompt library**: Organize prompts by category with expected answers
- **Batch execution**: Run multiple prompts against multiple models with multiple iterations
- **Response browser**: See all responses to a prompt, compare across models
- **Comparison mode**: Side-by-side columns with iteration switching
- **Attachments**: Include images or text files with prompts
- **Export**: Download results as CSV or JSON

### Vibe Check Modes
- **Prompt Vibe**: Same prompt, different models — find the best model for a task
- **Model Vibe**: Same model, different prompts — understand a model's strengths
- **Blind Vibe**: Model names hidden — unbiased evaluation
- **Compare Mode**: Direct side-by-side comparison of selected responses

### Evaluation System
- **Rubrics**: Define structured criteria with binary (yes/no), scale (rating), or checklist items
- **Weighted Scoring**: Assign importance to different criteria
- **Global & Prompt-Specific**: Create rubrics for general use or specific prompts
- **Human Evaluation**: Manual assessment using rubrics
- **LLM Judge**: Automated evaluation with configurable judge models
- **Impression Scores**: Optional 1-10 gut feeling alongside rubric scores

## Quick Start

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/model-vibe-check.git
cd model-vibe-check

# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:3000
```

## Setup

1. **Settings** → Add your API keys (OpenAI, Google, OpenRouter)
2. **Models** → Add models you want to test (or use Model Discovery)
3. **Prompts** → Create prompts or import the sample library
4. **Evaluators** → (Optional) Configure which models to use for LLM-as-judge

## Usage

### Running a Vibe Check

1. Go to **Runs** → **New Vibe Check**
2. Select prompts and models
3. Set number of iterations (more = see variation)
4. Execute and wait for completion

### Reading Responses

After a run completes, browse responses in three ways:

- **By Prompt**: See how different models answered the same question
- **By Model**: See how one model answered different questions
- **By Category**: Browse prompts grouped by type

### Using the Vibe Check Hub

Navigate to **Vibe Check** for focused evaluation workflows:

1. **Prompt Vibe**: Pick a prompt, see all model responses side-by-side
2. **Model Vibe**: Pick a model, see how it handles different prompts
3. **Blind Vibe**: Evaluate without knowing which model generated each response
4. **Compare**: Select specific responses for direct comparison

### Creating Rubrics

1. Go to **Settings** → **Evaluators** → **Rubrics**
2. Create a new rubric with:
   - **Binary items**: Yes/No questions (e.g., "Is the response factually correct?")
   - **Scale items**: Rating scales (e.g., "Clarity: Poor → Excellent")
   - **Checklist items**: Multiple criteria to check
3. Set weights to prioritize important criteria
4. Assign to specific prompts or use globally

### LLM Judge Evaluation

1. Configure a judge model in **Settings** → **Evaluators**
2. Select responses to evaluate
3. Choose a rubric
4. Run automated evaluation
5. Review and verify judge assessments

## Keyboard Shortcuts

The response viewer supports keyboard navigation:

- **Arrow keys**: Navigate between responses
- **Enter**: Open response detail
- **Escape**: Close dialogs
- **?**: Show keyboard help

## Sample Prompts

The repository includes 10 sample prompts covering:

- **Spatial Cognition**: Vertical text recognition
- **Multilingual**: German modal verbs, Czech morphology, Japanese honorifics
- **Creative Writing**: Wodehouse pastiche
- **Code Generation**: SVG, mermaid diagrams, regex
- **Reasoning**: Logic puzzles with misleading context

Import them from the Prompts page or start fresh with your own.

## Project Structure

```
model-vibe-check/
├── app/                    # Next.js pages and API routes
│   ├── prompts/           # Prompt management + response browser
│   ├── models/            # Model management + response browser
│   │   └── overview/      # Model overview dashboard
│   ├── categories/        # Category browser
│   ├── runs/              # Run management + execution
│   ├── vibe-check/        # Vibe Check hub
│   │   ├── prompt/        # Prompt vibe mode
│   │   ├── model/         # Model vibe mode
│   │   ├── blind/         # Blind evaluation mode
│   │   └── compare/       # Comparison mode
│   ├── settings/          # API keys and configuration
│   │   └── evaluators/    # Evaluator configuration
│   └── api/               # API endpoints
│       ├── evaluations/   # Evaluation management
│       ├── rubrics/       # Rubric CRUD
│       └── providers/     # Provider configuration
├── components/             # React components
│   ├── ui/                # shadcn/ui base components
│   └── response-viewer/   # Modular response viewer
├── lib/                    # Core logic
│   ├── providers/         # LLM provider integrations
│   ├── stores/            # Zustand state stores
│   ├── storage.ts         # JSON file storage
│   ├── types.ts           # TypeScript definitions
│   ├── llm-judge.ts       # LLM-as-judge logic
│   └── model-metadata.ts  # Model metadata utilities
├── hooks/                  # Custom React hooks
├── data/                   # User data (gitignored except samples)
└── attachments/            # Uploaded files
```

## Data Storage

All data is stored locally in JSON files:

- `data/prompts.json` — Your prompt library
- `data/models.json` — Configured models (gitignored)
- `data/settings.json` — API keys (gitignored)
- `data/rubrics.json` — Evaluation rubrics
- `data/evaluations.json` — Evaluation results
- `data/runs/*.json` — Run results (gitignored)

No data leaves your machine except API calls to the LLM providers you configure.

## Model Metadata

Models can be tagged with metadata for better organization:

- **Size Class**: frontier, flash, lite, or parameter counts (1-3b, 7-14b, etc.)
- **Reasoning Capability**: none, reasoning, or hybrid
- **Provider**: Auto-detected from model configuration

This metadata helps filter and compare models of similar capabilities.

## Requirements

- Node.js 18+
- npm or yarn
- API keys for cloud providers (optional — Ollama works locally)

## License

MIT — see [LICENSE](LICENSE)

## Contributing

Issues and PRs welcome. This is a tool for qualitative evaluation, so suggestions for better ways to read and compare responses are especially appreciated.

## Changelog

### v0.6.0
- Added resizable columns with drag handles in comparison views
- Added model metadata filtering in Runs list and New Run form
- Added sorting by provider, size class, or name in model selection
- Added quick select buttons for Frontier, Flash, and Reasoning models
- Added collapsible sidebar for more reading space
- Added dedicated Evaluations page
- Fixed markdown toggle not re-enabling after being turned off
- Improved toolbar icons (word wrap now uses proper icon)
- Simplified column presets (removed redundant 33/67 options)
- Reorganized sidebar navigation (removed Categories, added Evaluations)

### v0.5.0
- Added Vibe Check hub with four evaluation modes
- Added rubric-based evaluation system
- Added LLM-as-judge automated evaluation
- Added model overview dashboard
- Added model discovery from providers
- Added evaluator configuration page
- Enhanced response viewer with modular components
- Added keyboard shortcuts throughout the app
- Added toast notifications for user feedback
- Improved model metadata (size classes, reasoning capabilities)

### v0.1.0
- Initial release
- Multi-provider support (OpenAI, Google, Ollama, OpenRouter)
- Prompt library with categories
- Batch execution with iterations
- Response browser and comparison mode
- Attachment support
- CSV/JSON export
