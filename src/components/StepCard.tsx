'use client';

import { useState, useEffect } from 'react';
import type { Step, Inputs, LogEntry, Faction } from '@/lib/procedures/types';
import { InputField } from './InputField';
import { DiceRollPanel } from './DiceRollPanel';
import { OutcomePanel } from './OutcomePanel';

interface Props {
  step: Step;
  faction: Faction;
  repeatIndex: number;
  repeatTotal: number;
  actionBudget: number;
  onResolve: (inputs: Inputs) => LogEntry | null;
  onSkip: () => void;
  onNext: () => void;
  lastEntry: LogEntry | null;
  isCurrentStep: boolean;
}

function defaultInputs(step: Step): Inputs {
  const defaults: Inputs = {};
  for (const spec of step.inputs ?? []) {
    if (spec.kind === 'int') defaults[spec.id] = spec.min ?? 0;
    else if (spec.kind === 'bool') defaults[spec.id] = false;
    else if (spec.kind === 'enum' || spec.kind === 'choice') defaults[spec.id] = spec.options[0]?.value ?? '';
  }
  return defaults;
}

type Phase = 'input' | 'outcome';

export function StepCard({ step, faction, repeatIndex, repeatTotal, actionBudget, onResolve, onSkip, onNext }: Props) {
  const [inputs, setInputs] = useState<Inputs>(() => defaultInputs(step));
  const [phase, setPhase] = useState<Phase>('input');
  const [resolvedEntry, setResolvedEntry] = useState<LogEntry | null>(null);
  const [resolvedTitle, setResolvedTitle] = useState('');
  const [resolvedSection, setResolvedSection] = useState(step.section);
  const [resolvedRepeatLabel, setResolvedRepeatLabel] = useState('');

  // Only reset inputs when a new step/repeat arrives and we're already in input phase.
  // If we're showing outcomes, keep showing them until user clicks Next.
  useEffect(() => {
    if (phase === 'input') {
      setInputs(defaultInputs(step));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, repeatIndex]);

  // Keyboard shortcuts: Enter = Roll/Resolve (input) or Next (outcome); N = Next (outcome)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase === 'outcome') {
        if (e.key === 'Enter' || e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          handleNext();
        }
      } else {
        if (e.key === 'Enter') {
          const tag = (e.target as HTMLElement).tagName;
          // Let text/number inputs handle their own Enter
          if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
          e.preventDefault();
          handleRoll();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, inputs, step, repeatIndex, repeatTotal]);

  function handleChange(id: string, value: string | number | boolean) {
    setInputs((prev) => ({ ...prev, [id]: value }));
  }

  function handleRoll() {
    const title = step.title;
    const section = step.section;
    const rl = repeatTotal > 1
      ? ` — ${step.repeat?.label ?? 'Attempt'} ${repeatIndex + 1} of ${repeatTotal}`
      : '';
    const result = onResolve(inputs);
    if (result) {
      setResolvedEntry(result);
      setResolvedTitle(title);
      setResolvedSection(section);
      setResolvedRepeatLabel(rl);
      setPhase('outcome');
    }
  }

  function handleNext() {
    setPhase('input');
    setResolvedEntry(null);
    setResolvedTitle('');
    setInputs(defaultInputs(step)); // step is already the new step at this point
    onNext();
  }

  const isRussia = faction === 'russia';
  const accentBtn = isRussia
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
  const sectionBadge = isRussia
    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';

  const repeatLabel = repeatTotal > 1
    ? ` — ${step.repeat?.label ?? 'Attempt'} ${repeatIndex + 1} of ${repeatTotal}`
    : '';

  const hasDice = (step.dice ?? []).length > 0;
  const hasInputs = (step.inputs ?? []).length > 0;

  // Outcome phase: show results from the just-resolved step
  if (phase === 'outcome' && resolvedEntry) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6 space-y-5">
        <div className="flex items-start gap-3">
          <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${sectionBadge}`}>
            §{resolvedSection}
          </span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {resolvedTitle}{resolvedRepeatLabel}
          </h2>
        </div>

        <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          {resolvedEntry.rolls && resolvedEntry.rolls.length > 0 && (
            <DiceRollPanel rolls={resolvedEntry.rolls} />
          )}
          <OutcomePanel outcomes={resolvedEntry.outcomes} />
          <button
            onClick={handleNext}
            className={`px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${accentBtn}`}
          >
            Next Step →
          </button>
        </div>
      </div>
    );
  }

  // Input phase: show the current step's inputs and resolve button
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${sectionBadge}`}>
          §{step.section}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {step.title}{repeatLabel}
          </h2>
          {step.help && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{step.help}</p>
          )}
        </div>
      </div>

      {/* Action budget indicator (H section) */}
      {step.section === 'H' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Remaining Actions:</span>
          <span className={`font-bold tabular-nums ${actionBudget > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {actionBudget}
          </span>
        </div>
      )}

      {/* Inputs */}
      {hasInputs && (
        <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Board State</p>
          {step.inputs!.map((spec) => (
            <InputField
              key={spec.id}
              spec={spec}
              value={inputs[spec.id] ?? ''}
              onChange={handleChange}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleRoll}
          className={`px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${accentBtn}`}
        >
          {hasDice ? 'Roll & Resolve' : 'Resolve'}
        </button>
        {step.guard && (
          <button
            onClick={onSkip}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Skip (not triggered)
          </button>
        )}
      </div>
    </div>
  );
}
