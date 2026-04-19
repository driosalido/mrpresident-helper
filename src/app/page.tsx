'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Faction, EntryMode, Session } from '@/lib/procedures/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { loadArchive } from '@/lib/engine/storage';
import { sessionToMarkdown, downloadText } from '@/lib/util/md';

function FactionCard({ faction }: { faction: Faction }) {
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>('regular');

  const isRussia = faction === 'russia';
  const name = isRussia ? 'Russia Acts' : 'China Acts';
  const code = isRussia ? 'WPR1' : 'WPC1';
  const bg = isRussia
    ? 'border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600'
    : 'border-yellow-200 dark:border-yellow-800 hover:border-yellow-400 dark:hover:border-yellow-600';
  const accent = isRussia ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400';
  const btn = isRussia
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-yellow-600 hover:bg-yellow-700';

  function go() {
    router.push(`/run/${faction}?mode=${mode}`);
  }

  return (
    <div className={`rounded-2xl border-2 bg-white dark:bg-gray-900 p-6 space-y-4 transition-colors ${bg}`}>
      <div>
        <h2 className={`text-2xl font-bold ${accent}`}>{name}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{code} — Automated opponent procedure</p>
      </div>

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
        onClick={go}
        className={`w-full py-2.5 rounded-xl text-white font-semibold transition-colors ${btn}`}
      >
        Start {name} →
      </button>
    </div>
  );
}

function SessionArchive() {
  const [archive, setArchive] = useState<Session[]>([]);

  useEffect(() => {
    const sessions = loadArchive();
    setArchive([...sessions].reverse());
  }, []);

  if (archive.length === 0) return null;

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
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Archived Sessions</h2>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
        {archive.map((s) => {
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

export default function Home() {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FactionCard faction="russia" />
          <FactionCard faction="china" />
        </div>

        <p className="text-center text-xs text-gray-400">
          App rolls dice automatically · Apply outcomes to your physical board
        </p>

        <SessionArchive />
      </div>
    </main>
  );
}
