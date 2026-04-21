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
import {
  US_RELATION_LABELS,
  type USRelation,
} from '@/lib/procedures/usRelation';

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
  const { game, session, procedure, lastEntry, loadGame, startRun, resumeRun, resolve, skip, finishRun, endGame } = useSessionStore();
  const [initialized, setInitialized] = useState(false);

  const proc = procedures[faction];

  // Faction theme tokens
  const isRussia = faction === 'russia';
  const factionName = isRussia ? 'Russia Acts' : 'China Acts';
  const factionHeading = isRussia ? 'text-red-700 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
  const activeCrumb = isRussia ? 'bg-red-600 text-white' : 'bg-amber-500 text-white';

  useEffect(() => {
    if (initialized) return;
    if (!game) loadGame();
    const currentGame = useSessionStore.getState().game;
    if (!currentGame) {
      router.replace('/');
      return;
    }
    // Auto-resume if there's an active run, otherwise start fresh
    const saved = resumeRun(faction, proc);
    if (!saved) {
      startRun(proc, mode);
    }
    setInitialized(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faction]);

  function handleEndGame() {
    const gameName = useSessionStore.getState().game?.name ?? 'this game';
    if (confirm(`End "${gameName}" and wipe all shared state? This cannot be undone.`)) {
      endGame();
      router.replace('/');
    }
  }

  function handleFinish() {
    finishRun();
    router.push('/');
  }

  function handleNextTurn() {
    finishRun();
    startRun(proc, mode);
  }

  if (!initialized) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading…</div>;
  }

  if (!session || !procedure) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Initializing…</div>;
  }

  const currentStep = getCurrentStep(session, procedure);
  const isFinished = !!session.finishedAt || !currentStep;
  const currentSection = currentStep?.section ?? null;
  const usRelation = session.sharedState['usRelation'] as USRelation | undefined;

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
            {usRelation && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium">
                US: {US_RELATION_LABELS[usRelation.level]}
                {usRelation.pendingAntiUS > 0 && (
                  <span className="text-red-500 dark:text-red-400">
                    ↓{usRelation.pendingAntiUS > 1 ? `×${usRelation.pendingAntiUS}` : ''}
                  </span>
                )}
                {usRelation.pendingProUS > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    ↑{usRelation.pendingProUS > 1 ? `×${usRelation.pendingProUS}` : ''}
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleEndGame}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              End game
            </button>
            <ThemeToggle />
          </div>
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
                  <p className="text-green-600 dark:text-green-400">All sections resolved. Start the next turn or return home.</p>
                </>
              )}
              <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                {!session.sharedState['autoLoss'] && (
                  <button
                    onClick={handleNextTurn}
                    className={`px-6 py-2 rounded-lg font-semibold text-white ${isRussia ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                  >
                    Next Turn →
                  </button>
                )}
                <button
                  onClick={handleFinish}
                  className="px-6 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 rounded-lg font-semibold"
                >
                  ← Return Home
                </button>
              </div>
            </div>
          ) : currentStep ? (
            <StepCard
              step={currentStep}
              faction={faction}
              repeatIndex={session.cursorRepeatIdx}
              repeatTotal={repeatTotal}
              actionBudget={session.actionBudget}
              sharedState={session.sharedState}
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
