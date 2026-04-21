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
  onChangeLevel?: (level: USRelationLevel) => void;
  onChangeTrend?: (trend: 'none' | 'antiUS' | 'proUS') => void;
  compareTo?: { level: USRelationLevel; pendingAntiUS: number; pendingProUS: number };
}

export function RelationsTrackBoard({ level, pendingAntiUS, pendingProUS, faction, onChangeLevel, onChangeTrend, compareTo }: Props) {
  const editable = Boolean(onChangeLevel);
  const currentTrend = pendingAntiUS > 0 ? 'antiUS' : pendingProUS > 0 ? 'proUS' : 'none';

  const prevLevel = compareTo?.level;
  const levelChanged = prevLevel !== undefined && prevLevel !== level;
  const advanced = levelChanged && level > prevLevel!;
  const declined = levelChanged && level < prevLevel!;

  const prevTrend = compareTo
    ? (compareTo.pendingAntiUS > 0 ? 'antiUS' : compareTo.pendingProUS > 0 ? 'proUS' : 'none')
    : undefined;
  const trendChanged = prevTrend !== undefined && prevTrend !== currentTrend;

  function handleTrendClick(trend: 'antiUS' | 'proUS') {
    if (!onChangeTrend) return;
    onChangeTrend(currentTrend === trend ? 'none' : trend);
  }

  const TREND_LABEL: Record<'none' | 'antiUS' | 'proUS', string> = {
    none:   'None',
    antiUS: 'Anti-US ↓',
    proUS:  'Pro-US ↑',
  };

  const TREND_STYLE: Record<'none' | 'antiUS' | 'proUS', string> = {
    none:   'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700',
    antiUS: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 border-red-300 dark:border-red-700',
    proUS:  'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-700',
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">US Relations</p>

      <div className="flex gap-2 flex-wrap">
        {LEVELS.map((lvl) => {
          const isSelected = lvl === level;
          const isBefore = levelChanged && lvl === prevLevel;

          let opacityClass: string;
          let ringClass: string;
          if (editable) {
            opacityClass = isSelected ? '' : 'opacity-60 hover:opacity-80';
            ringClass = isSelected ? BOX_SELECTED_RING[faction] : '';
          } else {
            if (isSelected) {
              opacityClass = '';
              ringClass = advanced ? 'ring-4 ring-green-400' : declined ? 'ring-4 ring-red-400' : BOX_SELECTED_RING[faction];
            } else if (isBefore) {
              opacityClass = 'opacity-40';
              ringClass = 'ring-2 ring-gray-400 dark:ring-gray-500';
            } else {
              opacityClass = 'opacity-20';
              ringClass = '';
            }
          }

          const Tag = editable ? 'button' : 'div';

          return (
            <Tag
              key={lvl}
              type={editable ? 'button' : undefined}
              onClick={editable ? () => onChangeLevel!(lvl) : undefined}
              className={`flex flex-col items-center justify-between w-14 sm:w-16 h-16 sm:h-18 rounded-lg border-2 text-white select-none transition-all ${BOX_COLOR[lvl]} ${ringClass} ${opacityClass}`}
            >
              <span className="text-lg font-bold leading-none pt-2">{lvl}</span>
              <span className="text-[10px] font-medium leading-tight text-center px-1 pb-1.5 break-words">
                {US_RELATION_LABELS[lvl]}
              </span>
            </Tag>
          );
        })}
      </div>

      {editable ? (
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
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">Trend:</span>
          {trendChanged ? (
            <>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border line-through ${TREND_STYLE[prevTrend!]}`}>
                {TREND_LABEL[prevTrend!]}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${TREND_STYLE[currentTrend]}`}>
                {TREND_LABEL[currentTrend]}
              </span>
            </>
          ) : (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${TREND_STYLE[currentTrend]}`}>
              {TREND_LABEL[currentTrend]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
