<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Mr President — Project Context

Board game assistant for GMT Mr. President 2nd Edition. Automates opponent faction procedures (Russia WPR1, China WPC1) with dice rolling and session logging.

## Commands

```bash
npm run dev      # dev server, port 3000
npm test         # vitest run (node env, no browser)
npm run lint     # eslint
npm run build    # next build
```

## Architecture

```
src/
  lib/
    procedures/   # Faction data (russia/, china/) + shared types.ts
    engine/       # Faction-agnostic runner, session, storage, DRM logic
    util/         # Markdown export, helpers
    dice.ts       # Dice rolling
    drm.ts        # Die roll modifier helpers
    resolver.ts   # Resolution tree evaluator
    runner.ts     # Step cursor + session advancement
  store/
    session.ts    # Zustand store — single source of truth for active session
  components/     # UI: StepCard, DiceRollPanel, OutcomePanel, SessionLogPane
  app/
    page.tsx            # Home (faction picker + archive)
    run/[faction]/      # Wizard page (step-by-step procedure runner)
```

## Key Conventions

- `@/` alias resolves to `src/`
- All pages and components are `'use client'` — no RSC currently
- Engine is faction-agnostic; all faction logic lives in procedure data files under `lib/procedures/russia/` and `lib/procedures/china/`
- `Procedure` → `Step[]` → `Resolution` tree is the core data model (see `lib/procedures/types.ts`)
- Session state (cursor, dice history, shared state, log) is persisted to `localStorage` via `lib/engine/storage.ts`
- `StepCtx` is the runtime context passed to guard/repeat/resolution functions in procedure data

## Workflow

- `main` is production — never commit directly to it.
- Branch names: `feature/<kebab-name>`, `fix/<kebab-name>`, `chore/<kebab-name>`.
- Push branch → Vercel auto-builds a preview URL for testing on phone/iPad before promoting.
- Merge path: `gh pr create --fill` → squash-merge on GitHub → production redeploys automatically.
