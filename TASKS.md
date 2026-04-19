# Mr President — v1 Pending

Loop rule: do the first `[ ]`, run `npm run build` (and `npm test` once tests exist), mark `[x]` only if green.

- [x] **Vitest scaffold**: add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json`. Create `vitest.config.ts` with the `@/*` alias mirroring `tsconfig.json`. Create `test/` dir.
- [x] **engine.test.ts — RNG determinism**: seeded `Rng` from `src/lib/engine/dice.ts` produces the same sequence for the same seed across two instances; different seeds diverge.
- [x] **engine.test.ts — DRM cap**: `src/lib/engine/drm.ts` caps modified roll to ±3 by default; per-spec `cap: {min,max}` overrides default.
- [x] **engine.test.ts — runner**: build a synthetic 3-step `Procedure` and assert: `guard:false` skips with `[skipped]` log entry; `repeat.count=N` loops N times; `consumesAction:false` outcome leaves `actionBudget` unchanged; `skipTo` jumps cursor; `endProcedure` sets `finishedAt` and stops advancing.
- [x] **Dark-mode toggle**: add a header button (sun/moon glyph, no emoji) on `/` and `/run/[faction]` that toggles `documentElement.classList` `dark` and persists to `localStorage['mrpres.theme.v1']`. Read the value before first paint to avoid FOUC (inline `<script>` in `src/app/layout.tsx`).
- [x] **Keyboard shortcuts in StepCard**: in `src/components/StepCard.tsx`, add a `useEffect` keydown listener on `window`. Input phase: Enter triggers `handleRoll` unless focus is in a text/number input that has its own Enter behavior. Outcome phase: Enter or `N` triggers `handleNext`. Clean up on unmount/phase change.
- [x] **Session archive on home**: on `/`, after the two faction cards, render an "Archived sessions" section reading `mrpres.sessions.v1` (newest first, max 20). Each row shows faction badge, mode, finishedAt, total log entries, and Export MD / Export JSON buttons reusing the same Blob-download pattern from `src/components/SessionLogPane.tsx:32-40`. Empty state: hide section. Hydration-safe: read localStorage in `useEffect`.
- [x] **Final smoke**: run `npm run build` and `npm test`; if both pass, append "All tasks done." on its own line.

All tasks done.
