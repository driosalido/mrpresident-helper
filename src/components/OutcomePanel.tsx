'use client';

import { useState } from 'react';
import type { Outcome, Mutation, StateChange, Faction } from '@/lib/procedures/types';
import { CapabilityTrackBoard } from './CapabilityTrackBoard';

function MutationItem({ m }: { m: Mutation }) {
  const [done, setDone] = useState(false);
  if (m.kind === 'set' || m.kind === 'endProcedure' || m.kind === 'autoLoss' || m.kind === 'skipTo' || m.kind === 'consumeAction') return null;

  const text = [
    m.kind,
    m.target,
    m.amount !== undefined ? `(${m.amount > 0 ? '+' : ''}${m.amount})` : '',
    m.note ?? '',
  ].filter(Boolean).join(' ');

  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => setDone(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600"
      />
      <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {text}
      </span>
    </label>
  );
}

function StateChangePill({ sc, faction }: { sc: StateChange; faction: Faction }) {
  const changed = sc.from !== sc.to;
  const accentBg = faction === 'russia'
    ? 'bg-red-600 dark:bg-red-700 text-white'
    : 'bg-amber-600 dark:bg-amber-700 text-white';

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24 shrink-0">{sc.label}</span>
      <span className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono text-xs">
        {sc.from}
      </span>
      {changed ? (
        <>
          <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
          <span className={`px-2 py-0.5 rounded font-mono text-xs font-semibold ${accentBg}`}>
            {sc.to}
          </span>
        </>
      ) : (
        <>
          <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
          <span className="px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-mono text-xs">
            {sc.to} <span className="text-gray-400 text-xs">(unchanged)</span>
          </span>
        </>
      )}
    </div>
  );
}

function renderSummary(summary: string, faction: Faction) {
  const accentClass = faction === 'russia'
    ? 'text-red-600 dark:text-red-400'
    : 'text-amber-600 dark:text-amber-400';
  return summary.split(/\*\*([^*]+)\*\*/).map((part, i) =>
    i % 2 === 1
      ? <span key={i} className={`font-medium ${accentClass}`}>{part}</span>
      : part
  );
}

function OutcomeCard({ outcome, faction }: { outcome: Outcome; faction: Faction }) {
  const isAutoLoss = outcome.mutations?.some((m) => m.kind === 'autoLoss');
  const hasStateChanges = outcome.stateChanges && outcome.stateChanges.length > 0;
  const hasRealChange = outcome.stateChanges?.some(sc => sc.from !== sc.to);

  const borderClass = isAutoLoss
    ? 'border-red-400 bg-red-50 dark:bg-red-950'
    : hasRealChange
      ? faction === 'russia'
        ? 'border-red-300 dark:border-red-700 bg-white dark:bg-gray-900'
        : 'border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900';

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${borderClass}`}>
      {hasStateChanges && (
        <div className="space-y-1.5 pb-2 border-b border-gray-100 dark:border-gray-800">
          {outcome.stateChanges!.map((sc, i) => (
            <StateChangePill key={i} sc={sc} faction={faction} />
          ))}
        </div>
      )}
      <p className={`text-sm ${isAutoLoss ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
        {renderSummary(outcome.summary, faction)}
      </p>
      {outcome.detail && (
        <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">{outcome.detail}</p>
      )}
      {outcome.mutations && outcome.mutations.length > 0 && (() => {
        const visible = outcome.mutations.filter(
          m => !['set','endProcedure','autoLoss','skipTo','consumeAction'].includes(m.kind)
        );
        if (visible.length === 0) return null;
        return (
          <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Apply to board:</p>
            {outcome.mutations.map((m, i) => (
              <MutationItem key={i} m={m} />
            ))}
          </div>
        );
      })()}
    </div>
  );
}

export function OutcomePanel({ outcomes, faction }: { outcomes: Outcome[]; faction: Faction }) {
  if (outcomes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Result</h3>
      {outcomes.map((o) => {
        if (o.hidden) {
          if (!o.boardSnapshot) return null;
          return (
            <div key={o.id} className="pt-1">
              <CapabilityTrackBoard
                tracks={o.boardSnapshot.after}
                compareTo={o.boardSnapshot.before}
                faction={o.boardSnapshot.faction}
              />
            </div>
          );
        }
        return <OutcomeCard key={o.id} outcome={o} faction={faction} />;
      })}
    </div>
  );
}
