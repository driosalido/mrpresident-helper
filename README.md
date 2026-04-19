# Mr. President — Opponent Procedure Assistant

A guided wizard for running the automated opponent procedures in **GMT Games' Mr. President (2nd Edition)**. Covers the Russia Acts (WPR1) and China Acts (WPC1) faction procedures with step-by-step navigation, automatic dice rolling, and session logging.

Live at **https://mrpresident-helper.vercel.app**

> **Note:** This tool requires the physical board game. It does not include any game content — it only automates the procedure steps described in the rulebook.

## What it does

- Walks you through each section (A → H) of the Russia or China opponent procedure
- Rolls dice and applies modifiers automatically at each step
- Supports both Regular (A → H) and Crisis-Chit (jump to Section H, 2 Actions) entry modes
- Tracks session state so you can pick up where you left off (stored locally per device)
- Logs the full play history for reference during the game
- Works on desktop, phone, and tablet — no install required

## Running locally

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # run the test suite
npm run build     # production build
npm run lint      # eslint
```

## Project structure

```
src/
  lib/
    procedures/   # Faction data (russia/, china/) and shared types
    engine/       # Step runner, session management, storage, dice, resolver
    util/         # Markdown export and helpers
  store/
    session.ts    # Zustand store — single source of truth for active session
  components/     # UI: StepCard, DiceRollPanel, OutcomePanel, SessionLogPane
  app/
    page.tsx            # Home — faction picker and session archive
    run/[faction]/      # Wizard — step-by-step procedure runner
```

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4
- Zustand for session state, persisted to `localStorage` (state is per-device, not synced)
- Vitest for unit tests

## License

MIT — see [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
