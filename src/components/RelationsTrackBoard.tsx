'use client';

import { US_RELATION_LABELS, type USRelationLevel } from '@/lib/procedures/usRelation';
import type { Faction } from '@/lib/procedures/types';

const LEVELS: USRelationLevel[] = [1, 2, 3, 4, 5];

const BOX_COLOR: Record<USRelationLevel, string> = {
  1: 'bg-red-900 dark:bg-red-950 border-red-700',
  2: 'bg-red-700 dark:bg-red-800 border-red-600',
  3: 'bg-gray-400 dark:bg-gray-600 border-gray-400',
  4: 'bg-blue-500 dark:bg-blue-600 border-blue-400',
  5: 'bg-blue-700 dark:bg-blue-800 border-blue-600',
};

const BOX_SELECTED_RING: Record<Faction, string> = {
  russia: 'ring-4 ring-red-400',
  china:  'ring-4 ring-amber-400',
};

interface Props {
  level: USRelationLevel;
  pendingAntiUS: number;
  pendingProUS: number;
  faction: Faction;
  onChangeLevel: (level: USRelationLevel) => void;
  onChangeTrend: (trend: 'none' | 'antiUS' | 'proUS') => void;
}

export function RelationsTrackBoard({ level, pendingAntiUS, pendingProUS, faction, onChangeLevel, onChangeTrend }: Props) {
  const currentTrend = pendingAntiUS > 0 ? 'antiUS' : pendingProUS > 0 ? 'proUS' : 'none';

  function handleTrendClick(trend: 'antiUS' | 'proUS') {
    onChangeTrend(currentTrend === trend ? 'none' : trend);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">US Relations</p>

      {/* Track boxes */}
      <div className="flex gap-2 flex-wrap">
        {LEVELS.map((lvl) => {
          const isSelected = lvl === level;
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => onChangeLevel(lvl)}
              className={`flex flex-col items-center justify-between w-14 sm:w-16 h-16 sm:h-18 rounded-lg border-2 text-white select-none transition-all ${BOX_COLOR[lvl]} ${isSelected ? BOX_SELECTED_RING[faction] : 'opacity-60 hover:opacity-80'}`}
            >
              <span className="text-lg font-bold leading-none pt-2">{lvl}</span>
              <span className="text-[10px] font-medium leading-tight text-center px-1 pb-1.5 break-words">
                {US_RELATION_LABELS[lvl]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pending trend marker */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Trend marker:</span>
        <button
          type="button"
          onClick={() => handleTrendClick('antiUS')}
          className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${currentTrend === 'antiUS' ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-400'}`}
        >
          Anti-US ↓
        </button>
        <button
          type="button"
          onClick={() => handleTrendClick('proUS')}
          className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${currentTrend === 'proUS' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'}`}
        >
          Pro-US ↑
        </button>
        {currentTrend === 'none' && (
          <span className="text-xs text-gray-400 dark:text-gray-500 italic">None</span>
        )}
      </div>
    </div>
  );
}
