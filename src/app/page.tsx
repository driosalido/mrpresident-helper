'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Faction, EntryMode, Session, Game } from '@/lib/procedures/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSessionStore } from '@/store/session';
import { sessionToMarkdown, downloadText } from '@/lib/util/md';

// ─── Faction card ─────────────────────────────────────────────────────────────

function FactionCard({ faction, game }: { faction: Faction; game: Game }) {
  const router = useRouter();
  const { resetCurrentRun } = useSessionStore();
  const [mode, setMode] = useState<EntryMode>('regular');

  const activeRun = game.activeRuns[faction];
  const isRussia = faction === 'russia';
  const name = isRussia ? 'Russia Acts' : 'China Acts';
  const code = isRussia ? 'WPR1' : 'WPC1';
  const bg = isRussia
    ? 'border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600'
    : 'border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 dark:hover:border-yellow-600';
  const accent = isRussia ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400';
  const btn = isRussia ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700';
  const btnOutline = isRussia
    ? 'border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950'
    : 'border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950';

  function resume() {
    router.push(`/run/${faction}`);
  }

  function startNew() {
    resetCurrentRun();
    router.push(`/run/${faction}?mode=${mode}`);
  }

  function startFresh() {
    router.push(`/run/${faction}?mode=${mode}`);
  }

  return (
    <div className={`rounded-2xl border-2 bg-white dark:bg-gray-900 p-6 space-y-4 transition-colors ${bg}`}>
      <div>
        <h2 className={`text-2xl font-bold ${accent}`}>{name}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{code} — Automated opponent procedure</p>
      </div>

      {activeRun ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            Run in progress — {activeRun.mode === 'crisis-chit' ? 'Crisis-Chit' : 'Regular'} · {activeRun.log.length} steps resolved
          </p>
          <div className="flex gap-2">
            <button
              onClick={resume}
              className={`flex-1 py-2 rounded-xl text-white font-semibold transition-colors text-sm ${btn}`}
            >
              Continue →
            </button>
            <button
              onClick={startNew}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${btnOutline}`}
            >
              New run
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Entry Mode</p>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name={`${faction}-mode`}
                checked={mode === 'regular'}
                onChange={() => setMode('regular')}
                className={`h-4 w-4 ${isRussia ? 'accent-red-600' : 'accent-yellow-500'}`}
              />
              Regular — Sections A → H
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name={`${faction}-mode`}
                checked={mode === 'crisis-chit'}
                onChange={() => setMode('crisis-chit')}
                className={`h-4 w-4 ${isRussia ? 'accent-red-600' : 'accent-yellow-500'}`}
              />
              Crisis-Chit (2) — Jump to Section H, 2 Actions
            </label>
          </div>

          <button
            onClick={startFresh}
            className={`w-full py-2.5 rounded-xl text-white font-semibold transition-colors ${btn}`}
          >
            Start {name} →
          </button>
        </>
      )}
    </div>
  );
}

// ─── Completed runs list ──────────────────────────────────────────────────────

function CompletedRuns({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) return null;

  function exportMD(s: Session) {
    const md = sessionToMarkdown(s);
    const stamp = new Date(s.createdAt).toISOString().slice(0, 16).replace('T', '_');
    downloadText(md, `mr-president-${s.faction}-${stamp}.md`, 'text/markdown');
  }

  function exportJSON(s: Session) {
    downloadText(JSON.stringify(s, null, 2), `mr-president-${s.faction}-${s.id}.json`, 'application/json');
  }

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Completed this game ({sessions.length})
      </h2>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
        {[...sessions].reverse().map((s) => {
          const isRussia = s.faction === 'russia';
          const badge = isRussia
            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
          const label = isRussia ? 'Russia' : 'China';
          const mode = s.mode === 'crisis-chit' ? 'Crisis-Chit' : 'Regular';
          const finishedAt = s.finishedAt ? new Date(s.finishedAt).toLocaleString() : '—';
          return (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${badge}`}>{label}</span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">{mode}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs flex-1">{finishedAt}</span>
              <span className="text-gray-400 text-xs">{s.log.length} entries</span>
              <button onClick={() => exportMD(s)} className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">MD</button>
              <button onClick={() => exportJSON(s)} className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400">JSON</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Game status card ─────────────────────────────────────────────────────────

function GameStatusCard({ game }: { game: Game }) {
  const { endGame } = useSessionStore();
  const turns = game.archive.length;
  const started = new Date(game.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  function handleEnd() {
    if (confirm(`End "${game.name}" and wipe all shared state? This cannot be undone.`)) {
      endGame();
    }
  }

  return (
    <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current Game</p>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{game.name}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Started {started} · {turns} {turns === 1 ? 'turn' : 'turns'} completed
        </p>
      </div>
      <button
        onClick={handleEnd}
        className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
      >
        End game &amp; start new
      </button>
    </div>
  );
}

// ─── New game form ─────────────────────────────────────────────────────────────

function NewGameForm() {
  const { createGame } = useSessionStore();
  const [name, setName] = useState('');

  function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createGame(trimmed);
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-8 text-center space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">No game in progress</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Name this campaign to begin</p>
      </div>
      <form onSubmit={handleStart} className="flex gap-2 max-w-sm mx-auto">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Summer Campaign 2026"
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-semibold disabled:opacity-40 transition-colors hover:bg-gray-700 dark:hover:bg-gray-300"
        >
          Start
        </button>
      </form>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <p className="text-center text-xs text-gray-400 dark:text-gray-600 pt-2">
      Built by{' '}
      <a
        href="https://github.com/driosalido"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
      >
        David Riosalido
      </a>
      {' · '}
      <a
        href="https://github.com/driosalido/mrpresident-helper"
        target="_blank"
        rel="noreferrer"
        className="underline hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
      >
        GitHub
      </a>
      {process.env.NEXT_PUBLIC_APP_VERSION && (
        <>{' · '}v{process.env.NEXT_PUBLIC_APP_VERSION}</>
      )}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { game, loadGame } = useSessionStore();

  useEffect(() => {
    loadGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-start pt-24 p-6">
      <div className="max-w-2xl w-full space-y-6">
        <div className="flex items-start justify-between">
          <div className="text-center flex-1 space-y-1">
            <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
              Mr President
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Opponent Procedure Assistant · GMT Games 2nd Edition
            </p>
          </div>
          <ThemeToggle />
        </div>

        {game ? (
          <>
            <GameStatusCard game={game} />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">This Turn</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FactionCard faction="russia" game={game} />
                <FactionCard faction="china" game={game} />
              </div>
            </div>

            <CompletedRuns sessions={game.archive} />
          </>
        ) : (
          <NewGameForm />
        )}

        <Footer />
      </div>
    </main>
  );
}
