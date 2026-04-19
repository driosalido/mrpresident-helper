# Mr. President — Opponent Procedure Assistant

A guided wizard for running the automated opponent procedures in **GMT Games' Mr. President (2nd Edition)**. Covers the Russia Acts (WPR1) and China Acts (WPC1) faction procedures with step-by-step navigation, dice rolling, and session logging.

Live at **https://mrpresident-helper.vercel.app**

## What it does

- Walks you through each section (A → H) of the Russia or China opponent procedure
- Rolls dice and applies modifiers automatically at each step
- Tracks session state so you can pick up where you left off
- Logs the full play history for reference
- Works on desktop, phone, and tablet — no install required

## Running locally

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # run the test suite
npm run build     # production build
```

## Stack

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4
- Zustand for session state (persisted to localStorage)
- Vitest for unit tests
