# Contributing

## Workflow

- `main` is production — don't commit directly.
- Branch names: `feature/<kebab-name>`, `fix/<kebab-name>`, `chore/<kebab-name>`.
- Push your branch → Vercel auto-builds a preview URL.
- Test on the preview URL, then open a PR and squash-merge.

```bash
git checkout -b feature/my-change
# make changes
git push -u origin feature/my-change
gh pr create --fill
```

## Development

```bash
npm install
npm run dev     # dev server at http://localhost:3000
npm test        # vitest unit tests
npm run lint    # eslint
npm run build   # verify production build locally
```

## Adding a new procedure step

Procedure data lives in `src/lib/procedures/russia/` and `src/lib/procedures/china/`. Each file exports a `Step[]` array. See `src/lib/procedures/types.ts` for the full type definitions — the engine is faction-agnostic and drives everything from that data.

## Important notes

- All pages are `'use client'` — no React Server Components currently.
- Session state is persisted to `localStorage` via `src/lib/engine/storage.ts`. There is no server-side state.
- The `@/` alias resolves to `src/`.
- This repo has a `lib/` entry in the global gitignore on the original dev machine. The project `.gitignore` overrides this with `!src/lib/`. If `src/lib/` appears untracked on your machine, run `git add -f src/lib/`.

## Reporting issues

Open a GitHub issue with steps to reproduce and the faction/section where the problem occurs.
