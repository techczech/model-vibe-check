# Model Vibe Check

A tool for qualitative LLM evaluation. Run prompts against multiple models, read the responses side-by-side, and decide which ones have the right vibe.

**Version 0.1.0**

## Philosophy

Most LLM benchmarks reduce model outputs to numbers. But you can't check the vibe from a score. This tool is built around one idea: **you need to read the actual responses**.

- Browse responses by **Prompt**, **Model**, or **Category**
- Compare outputs **side-by-side** across models and iterations
- Runs are archives — browsing is the primary experience

## Features

- **Multi-provider support**: OpenAI, Google (Gemini), Ollama (local models), OpenRouter
- **Prompt library**: Organize prompts by category with expected answers
- **Batch execution**: Run multiple prompts against multiple models with multiple iterations
- **Response browser**: See all responses to a prompt, compare across models
- **Comparison mode**: Side-by-side columns with iteration switching
- **Attachments**: Include images or text files with prompts
- **Export**: Download results as CSV or JSON

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
2. **Models** → Add models you want to test
3. **Prompts** → Create prompts or import the sample library

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

### Comparing Responses

1. Open any prompt's responses
2. Select 2-4 responses (checkboxes)
3. Click **Compare**
4. Each column can switch between iterations
5. Use dropdowns to swap models

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
│   ├── categories/        # Category browser
│   ├── runs/              # Run management + execution
│   └── settings/          # API keys and configuration
├── lib/                    # Core logic
│   ├── providers/         # LLM provider integrations
│   ├── storage.ts         # JSON file storage
│   └── types.ts           # TypeScript definitions
├── components/ui/          # shadcn/ui components
├── data/                   # User data (gitignored except samples)
└── attachments/            # Uploaded files
```

## Data Storage

All data is stored locally in JSON files:

- `data/prompts.json` — Your prompt library
- `data/models.json` — Configured models (gitignored)
- `data/settings.json` — API keys (gitignored)
- `data/runs/*.json` — Run results (gitignored)

No data leaves your machine except API calls to the LLM providers you configure.

## Legacy Evaluation Features

The app includes optional scoring features from an earlier design:

- **Human Eval** (`/runs/[id]/evaluate`): Rate responses 1-10
- **LLM Judge** (`/runs/[id]/judge`): Automated scoring via LLM
- **Pairwise Compare** (`/runs/[id]/compare`): A/B comparison

These are accessible from the run pages but aren't the primary workflow.

## Requirements

- Node.js 18+
- npm or yarn
- API keys for cloud providers (optional — Ollama works locally)

## License

MIT — see [LICENSE](LICENSE)

## Contributing

Issues and PRs welcome. This is a tool for qualitative evaluation, so suggestions for better ways to read and compare responses are especially appreciated.
