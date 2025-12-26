# Model Vibe Check — Build Plan

## Version 0.1.0 Release

### Core Principle

**You check the vibe by READING responses, not looking at scores.**

Browse by Prompt / Model / Category. Runs are just archives.

---

## What's Included

### Three browsing paths:

1. **By Prompt** → `/prompts/[id]/responses`
   - All responses to a prompt, grouped by model
   - Side-by-side comparison (2-4 columns)
   - Iteration switching per column

2. **By Model** → `/models/[id]/responses`
   - All responses from a model, grouped by prompt
   - Same comparison features

3. **By Category** → `/categories/[slug]`
   - Prompts grouped by category
   - Response counts and quick links

### Run management:
- Create runs with multiple prompts × models × iterations
- Execute with parallel processing and retry logic
- Archive view with links to response browsers
- CSV/JSON export

### Legacy evaluation (optional):
- Human scoring (1-10)
- LLM judge (automated scoring)
- Pairwise comparison

---

## Sample Prompts

10 prompts included covering:
- Spatial cognition (vertical text)
- Multilingual (German, Czech, Japanese)
- Creative writing (Wodehouse style)
- Code generation (SVG, mermaid, regex)
- Reasoning (logic with misleading context)

---

## Release Checklist

- [x] MIT License added
- [x] README.md written
- [x] .gitignore updated (models.json, settings.json, runs/)
- [x] Sample prompts preserved
- [x] Version 0.1.0 in package.json

### Manual cleanup needed:

1. **Remove duplicate config file** — there are both `next.config.mjs` and `next.config.ts`. Delete one:
   ```bash
   rm next.config.mjs
   ```

2. **Verify build works**:
   ```bash
   npm run build
   ```

3. **Create GitHub repo and push**:
   ```bash
   git add .
   git commit -m "v0.1.0 - Initial release"
   git tag v0.1.0
   git push origin main --tags
   ```

---

## Future Ideas

- [ ] Inline notes/scores in response browsers
- [ ] Keyboard shortcuts for comparison navigation
- [ ] Diff view between iterations
- [ ] Response search/filtering
- [ ] Dark mode
