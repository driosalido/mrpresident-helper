'use client';

import type { Faction } from '@/lib/procedures/types';

const SOE_VALUES = [3, 4, 5, 6, 7] as const;
type SoEValue = typeof SOE_VALUES[number];

const SOE_LABEL: Record<SoEValue, string> = {
  3: 'Recession',
  4: 'Stagnation',
  5: 'Recovery',
  6: 'Peak',
  7: 'Peak+',
};

const BOX_COLOR: Record<SoEValue, string> = {
  3: 'bg-red-700 dark:bg-red-800 border-red-600',
  4: 'bg-orange-500 dark:bg-orange-600 border-orange-400',
  5: 'bg-yellow-500 dark:bg-yellow-600 border-yellow-400',
  6: 'bg-green-500 dark:bg-green-600 border-green-400',
  7: 'bg-green-700 dark:bg-green-800 border-green-600',
};

const BOX_SELECTED_RING: Record<Faction, string> = {
  russia: 'ring-4 ring-red-400',
  china:  'ring-4 ring-amber-400',
};

interface Props {
  value: SoEValue;
  faction: Faction;
  onChange: (value: SoEValue) => void;
}

export function EconomyTrackBoard({ value, faction, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">State of the Economy (SoE)</p>
      <div className="flex gap-2 flex-wrap">
        {SOE_VALUES.map((v) => {
          const isSelected = v === value;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`flex flex-col items-center justify-between w-14 sm:w-16 h-16 sm:h-18 rounded-lg border-2 text-white select-none transition-all ${BOX_COLOR[v]} ${isSelected ? BOX_SELECTED_RING[faction] : 'opacity-60 hover:opacity-80'}`}
            >
              <span className="text-lg font-bold leading-none pt-2">{v}</span>
              <span className="text-[10px] font-medium leading-tight text-center px-1 pb-1.5">
                {SOE_LABEL[v]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
