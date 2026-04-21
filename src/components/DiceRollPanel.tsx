'use client';

import type { DiceResult } from '@/lib/procedures/types';

interface Props {
  rolls: DiceResult[];
}

export function DiceRollPanel({ rolls }: Props) {
  if (rolls.length === 0) return null;

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Dice Rolls</h3>
      {rolls.map((r) => {
        const activeDrms = r.drmsApplied.filter((d) => d.value !== 0);
        const multiDice = r.raw.length > 1;
        const hasModifier = r.sum !== r.modified;

        // Build the equation string: e.g. "3" or "3+4=7" or "5 +2 (Posture 2) = 7"
        let equation = multiDice ? `${r.raw.join('+')}=${r.sum}` : String(r.sum);
        if (hasModifier) {
          const drmParts = activeDrms.map((d) => `${d.value > 0 ? '+' : ''}${d.value} ${d.label}`).join(', ');
          equation += ` ${drmParts} = ${r.modified}`;
        }

        return (
          <div key={r.id} className="flex items-baseline gap-3">
            <span className="text-3xl font-mono font-bold text-blue-700 dark:text-blue-300 shrink-0">
              {r.modified}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {r.label ?? r.id}
              {(multiDice || hasModifier) && (
                <span className="ml-1 font-mono text-gray-400 dark:text-gray-500">({equation})</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
