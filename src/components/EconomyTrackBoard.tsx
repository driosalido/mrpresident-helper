'use client';

import type { Faction } from '@/lib/procedures/types';

export const SOE_VALUES = [3, 4, 5, 6, 7] as const;
export type SoEValue = typeof SOE_VALUES[number];
export type SoETrend = 'none' | 'improving' | 'worsening';

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

const TREND_STYLE: Record<SoETrend, string> = {
  none:      'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700',
  improving: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 border-green-300 dark:border-green-700',
  worsening: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 border-red-300 dark:border-red-700',
};

const TREND_LABEL: Record<SoETrend, string> = {
  none:      'None',
  improving: 'Improving ↑',
  worsening: 'Worsening ↓',
};

interface Props {
  value: SoEValue;
  trend: SoETrend;
  faction: Faction;
  onChange?: (value: SoEValue) => void;
  onChangeTrend?: (trend: SoETrend) => void;
  compareTo?: { value: SoEValue; trend: SoETrend };
}

export function EconomyTrackBoard({ value, trend, faction, onChange, onChangeTrend, compareTo }: Props) {
  const editable = Boolean(onChange);
  const prevVal = compareTo?.value;
  const levelChanged = prevVal !== undefined && prevVal !== value;
  const advanced = levelChanged && value > prevVal!;
  const declined = levelChanged && value < prevVal!;

  function handleTrendClick(t: 'improving' | 'worsening') {
    if (!onChangeTrend) return;
    onChangeTrend(trend === t ? 'none' : t);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">State of the Economy (SoE)</p>
      <div className="flex gap-2 flex-wrap">
        {SOE_VALUES.map((v) => {
          const isSelected = v === value;
          const isBefore = levelChanged && v === prevVal;

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
              key={v}
              type={editable ? 'button' : undefined}
              onClick={editable ? () => onChange!(v) : undefined}
              className={`flex flex-col items-center justify-between w-14 sm:w-16 h-16 sm:h-18 rounded-lg border-2 text-white select-none transition-all ${BOX_COLOR[v]} ${ringClass} ${opacityClass}`}
            >
              <span className="text-lg font-bold leading-none pt-2">{v}</span>
              <span className="text-[10px] font-medium leading-tight text-center px-1 pb-1.5">
                {SOE_LABEL[v]}
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
            onClick={() => handleTrendClick('improving')}
            className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${trend === 'improving' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-green-400'}`}
          >
            Improving ↑
          </button>
          <button
            type="button"
            onClick={() => handleTrendClick('worsening')}
            className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${trend === 'worsening' ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-400'}`}
          >
            Worsening ↓
          </button>
          {trend === 'none' && (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">None</span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">Trend:</span>
          {compareTo && compareTo.trend !== trend ? (
            <>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border line-through ${TREND_STYLE[compareTo.trend]}`}>
                {TREND_LABEL[compareTo.trend]}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${TREND_STYLE[trend]}`}>
                {TREND_LABEL[trend]}
              </span>
            </>
          ) : (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${TREND_STYLE[trend]}`}>
              {TREND_LABEL[trend]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
