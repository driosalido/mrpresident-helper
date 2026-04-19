'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import type { Faction, EntryMode, Section } from '@/lib/procedures/types';
import { procedures } from '@/lib/procedures/index';
import { getCurrentStep } from '@/lib/engine/runner';
import { useSessionStore } from '@/store/session';
import { StepCard } from '@/components/StepCard';
import { SessionLogPane } from '@/components/SessionLogPane';
import { ThemeToggle } from '@/components/ThemeToggle';

const SECTIONS: Section[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function WizardPage({ params, searchParams }: {
  params: Promise<{ faction: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { faction: factionRaw } = use(params);
  const { mode: modeRaw } = use(searchParams);

  const faction = (factionRaw === 'russia' || factionRaw === 'china' ? factionRaw : 'russia') as Faction;
  const mode: EntryMode = modeRaw === 'crisis-chit' ? 'crisis-chit' : 'regular';

  const router = useRouter();
  const { session, procedure, lastEntry, start, resume, resolve, skip, loadSaved } = useSessionStore();
  const [savedExists, setSavedExists] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const proc = procedures[faction];

  // Faction theme tokens
  const isRussia = faction === 'russia';
  const factionName = isRussia ? 'Russia Acts' : 'China Acts';
  const factionHeading = isRussia ? 'text-red-700 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
  const activeCrumb = isRussia ? 'bg-red-600 text-white' : 'bg-amber-500 text-white';
  const resumeBorder = isRussia ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950' : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950';
  const resumeText = isRussia ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200';
  const resumeSubText = isRussia ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300';
  const resumeBtn = isRussia ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700';
  const resumeBtnOutline = isRussia
    ? 'border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900'
    : 'border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900';

  useEffect(() => {
    if (initialized) return;
    const saved = loadSaved(faction, proc);
    if (saved) {
      setSavedExists(true);
    } else {
      start(proc, mode);
    }
    setInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faction]);

  function handleResume() {
    setSavedExists(false);
  }

  function handleFresh() {
    setSavedExists(false);
    start(proc, mode);
  }

  if (!initialized) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading…</div>;
  }

  // Resume banner
  if (savedExists && session) {
    const savedAt = new Date(session.createdAt).toLocaleString();
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-start justify-center pt-32 p-4">
        <div className={`max-w-md w-full rounded-2xl border p-6 space-y-4 ${resumeBorder}`}>
          <h2 className={`text-lg font-semibold ${resumeText}`}>Resume previous session?</h2>
          <p className={`text-sm ${resumeSubText}`}>
            A {factionName} session from {savedAt} was found.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleResume}
              className={`px-4 py-2 text-white rounded-lg text-sm font-semibold ${resumeBtn}`}
            >
              Resume
            </button>
            <button
              onClick={handleFresh}
              className={`px-4 py-2 rounded-lg text-sm ${resumeBtnOutline}`}
            >
              Start fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !procedure) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Initializing…</div>;
  }

  const currentStep = getCurrentStep(session, procedure);
  const isFinished = !!session.finishedAt || !currentStep;
  const currentSection = currentStep?.section ?? null;

  // Compute repeat total for current step
  let repeatTotal = 1;
  if (currentStep?.repeat) {
    repeatTotal = currentStep.repeat.count({
      faction: session.faction,
      mode: session.mode,
      inputs: {},
      dice: {},
      actionBudget: session.actionBudget,
      sharedState: session.sharedState,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ← Home
            </button>
            <h1 className={`text-lg font-bold ${factionHeading}`}>{factionName}</h1>
            {mode === 'crisis-chit' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-medium">
                Crisis-Chit (2)
              </span>
            )}
          </div>
          <ThemeToggle />
          {/* Section breadcrumb */}
          <div className="hidden sm:flex items-center gap-1 text-xs">
            {SECTIONS.filter(s => mode === 'crisis-chit' ? s === 'H' : true).map((s) => (
              <span
                key={s}
                className={`w-7 h-7 flex items-center justify-center rounded-full font-bold transition-colors ${
                  s === currentSection
                    ? activeCrumb
                    : 'text-gray-400 dark:text-gray-600'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
        {/* Left: step card */}
        <div className="lg:col-span-2">
          {isFinished ? (
            <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-8 text-center space-y-4">
              {session.sharedState['autoLoss'] ? (
                <>
                  <p className="text-4xl">⚠️</p>
                  <h2 className="text-2xl font-bold text-red-700 dark:text-red-400">US Auto-Loss</h2>
                  <p className="text-red-600 dark:text-red-400">The game is over. Check the session log for details.</p>
                </>
              ) : (
                <>
                  <p className="text-4xl">✓</p>
                  <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">{factionName} Complete</h2>
                  <p className="text-green-600 dark:text-green-400">All sections resolved. Export the log or return home.</p>
                </>
              )}
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-6 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg font-semibold"
              >
                ← Return Home
              </button>
            </div>
          ) : currentStep ? (
            <StepCard
              step={currentStep}
              faction={faction}
              repeatIndex={session.cursorRepeatIdx}
              repeatTotal={repeatTotal}
              actionBudget={session.actionBudget}
              onResolve={resolve}
              onSkip={skip}
              onNext={() => {}}
              lastEntry={lastEntry}
              isCurrentStep={true}
            />
          ) : null}
        </div>

        {/* Right: session log */}
        <div className="lg:col-span-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 h-[calc(100vh-8rem)] sticky top-20">
          <SessionLogPane session={session} />
        </div>
      </div>
    </div>
  );
}
