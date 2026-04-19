'use client';

import type { DiceResult } from '@/lib/procedures/types';

interface Props {
  rolls: DiceResult[];
}

export function DiceRollPanel({ rolls }: Props) {
  if (rolls.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Dice Rolls</h3>
      {rolls.map((r) => (
        <div key={r.id} className="space-y-1">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-mono font-bold text-blue-700 dark:text-blue-300">
              {r.modified}
            </span>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span>{r.label ?? r.id}</span>
              <span className="ml-2 font-mono">
                raw: {r.raw.join('+')} = {r.sum}
              </span>
            </div>
          </div>
          {r.drmsApplied.filter((d) => d.value !== 0).length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 ml-1 border-l-2 border-blue-300 dark:border-blue-700 pl-2">
              {r.drmsApplied
                .filter((d) => d.value !== 0)
                .map((d) => (
                  <div key={d.label}>
                    <span className={d.value > 0 ? 'text-red-500' : 'text-green-500'}>
                      {d.value > 0 ? '+' : ''}{d.value}
                    </span>{' '}
                    {d.label}
                  </div>
                ))}
              <div className="font-medium text-gray-600 dark:text-gray-300">
                DRM total: {r.drmTotal > 0 ? '+' : ''}{r.drmTotal} (capped)
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
