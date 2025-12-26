# Model Vibe Check

Systematic vibes-based LLM evaluation. Test new models against your personal prompt library.

## What is this?

Model Vibe Check fills the gap between formal benchmarks (MMLU, HumanEval) and crowd preferences (Chatbot Arena). It's for the question: **does this model work for my tasks?**

When Claude 4 drops on Tuesday, you can have a systematic comparison vs Claude 3.5 on your 47 prompts by lunch.

## Features

- **Personal Prompt Library**: Curate prompts that matter to you
- **Four Evaluation Methods**: Human rating, LLM judge, machine checks, pairwise comparison
- **Multi-Provider Support**: Ollama (local), OpenAI, Google, OpenRouter (everything else)
- **Persistent History**: Track how models evolve across versions
- **Local-First**: JSON files, runs locally, optional Vercel deployment

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Open http://localhost:3000
```

## Configuration

### API Keys

Add your API keys in Settings or via environment variables:

```bash
# .env.local
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AIza...
OPENROUTER_API_KEY=sk-or-...
```

### Ollama

For local models, ensure Ollama is running:

```bash
ollama serve
ollama pull llama3.2
```

## Evaluation Methods

### Human Judge
Rate responses 1-10 with notes. Simple, authoritative, slow.

### LLM Judge
Another model evaluates against a configurable rubric. Default criteria: accuracy, completeness, clarity, relevance.

### Machine Judge
Algorithmic checks:
- `contains`: Required terms (comma-separated)
- `regex`: Pattern matching
- `exact`: Exact string match
- `json-schema`: Validate JSON structure
- `custom`: JavaScript function

### Pairwise Comparison
Side-by-side voting (A/Tie/B). Randomizes order to avoid position bias.

## Project Structure

```
model-vibe-check/
├── app/                 # Next.js pages
│   ├── prompts/         # Prompt library
│   ├── models/          # Model configuration
│   ├── runs/            # Evaluation runs
│   └── settings/        # API keys & defaults
├── components/          # React components
├── lib/                 # Core logic
│   ├── providers/       # LLM provider integrations
│   ├── evaluation/      # Judge implementations
│   ├── storage.ts       # JSON file handling
│   └── types.ts         # TypeScript definitions
├── data/                # JSON data files
│   ├── prompts.json     # Prompt library
│   ├── models.json      # Configured models
│   └── runs/            # Run results
└── attachments/         # Prompt attachments
    ├── text/
    └── images/
```

## Adding Prompts

Prompts are stored in `data/prompts.json`. Each prompt includes:

```json
{
  "id": "unique-id",
  "title": "Prompt Title",
  "category": "Category Name",
  "keywords": ["keyword1", "keyword2"],
  "content": "The actual prompt text...",
  "expectedAnswer": "Optional expected answer",
  "attachments": [],
  "evaluationConfig": {
    "methods": ["human", "machine", "llm-judge"],
    "machineJudge": {
      "type": "contains",
      "criteria": "required,terms"
    }
  }
}
```

## Deployment

### Local Only
Just run `npm run dev`. Data stays in `data/` directory.

### Vercel
```bash
vercel deploy
```

Set environment variables in Vercel dashboard for API keys.

## License

MIT
