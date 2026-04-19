'use client';

import { useState } from 'react';
import type { Outcome, Mutation } from '@/lib/procedures/types';
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

function OutcomeCard({ outcome }: { outcome: Outcome }) {
  const isAutoLoss = outcome.mutations?.some((m) => m.kind === 'autoLoss');

  return (
    <div className={`rounded-lg border p-4 space-y-2 ${isAutoLoss ? 'border-red-400 bg-red-50 dark:bg-red-950' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'}`}>
      <p className={`font-semibold text-sm ${isAutoLoss ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
        {outcome.summary.split(/\*\*([^*]+)\*\*/).map((part, i) =>
          i % 2 === 1 ? <strong key={i}>{part}</strong> : part
        )}
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

export function OutcomePanel({ outcomes }: { outcomes: Outcome[] }) {
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
        return <OutcomeCard key={o.id} outcome={o} />;
      })}
    </div>
  );
}
