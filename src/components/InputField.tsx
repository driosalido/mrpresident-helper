'use client';

import type { InputSpec, Inputs } from '@/lib/procedures/types';

interface Props {
  spec: InputSpec;
  value: string | number | boolean;
  allValues?: Inputs;
  onChange: (id: string, value: string | number | boolean) => void;
}

export function InputField({ spec, value, allValues, onChange }: Props) {
  const help = spec.kind !== 'capRow' ? spec.help : undefined;
  const baseLabel = (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {spec.label}
      {help && (
        <span className="ml-1 text-xs text-gray-400 font-normal">({help})</span>
      )}
    </label>
  );

  if (spec.kind === 'bool') {
    return (
      <div className="flex items-start gap-2 py-1">
        <input
          id={spec.id}
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={value === true || value === 'true'}
          onChange={(e) => onChange(spec.id, e.target.checked)}
        />
        <label htmlFor={spec.id} className="text-sm text-gray-700 dark:text-gray-300">
          {spec.label}
          {spec.help && <span className="ml-1 text-xs text-gray-400">({spec.help})</span>}
        </label>
      </div>
    );
  }

  if (spec.kind === 'int') {
    return (
      <div className="mb-3">
        {baseLabel}
        <input
          type="number"
          min={spec.min}
          max={spec.max}
          value={value as number}
          onChange={(e) => onChange(spec.id, parseInt(e.target.value, 10) || 0)}
          className="w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  }

  if (spec.kind === 'enum' || spec.kind === 'choice') {
    return (
      <div className="mb-3">
        {baseLabel}
        <div className="flex flex-col gap-1">
          {spec.options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name={spec.id}
                value={opt.value}
                checked={String(value) === opt.value}
                onChange={() => onChange(spec.id, opt.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (spec.kind === 'capRow') {
    const min = spec.min ?? 1;
    const max = spec.max ?? 7;
    const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const factionVal = Number(allValues?.[spec.factionId] ?? min);
    const usVal      = Number(allValues?.[spec.usId]      ?? min);
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{spec.label}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 w-12 text-right">Faction</span>
          <select
            value={factionVal}
            onChange={(e) => onChange(spec.factionId, Number(e.target.value))}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {options.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 w-6 text-right">US</span>
          <select
            value={usVal}
            onChange={(e) => onChange(spec.usId, Number(e.target.value))}
            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1.5 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {options.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return null;
}
