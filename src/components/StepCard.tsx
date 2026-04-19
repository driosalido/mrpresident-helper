'use client';

import { useState, useEffect } from 'react';
import type { Step, Inputs, LogEntry, Faction } from '@/lib/procedures/types';
import { InputField } from './InputField';
import { DiceRollPanel } from './DiceRollPanel';
import { OutcomePanel } from './OutcomePanel';
import { CapabilityTrackBoard } from './CapabilityTrackBoard';
import { RelationsTrackBoard } from './RelationsTrackBoard';
import { EconomyTrackBoard } from './EconomyTrackBoard';
import { CAPABILITY_KEYS } from '@/lib/procedures/capabilities';
import type { CapabilityTracks } from '@/lib/procedures/capabilities';
import type { USRelation, USRelationLevel } from '@/lib/procedures/usRelation';
import type { SoEValue, SoETrend } from './EconomyTrackBoard';

interface Props {
  step: Step;
  faction: Faction;
  repeatIndex: number;
  repeatTotal: number;
  actionBudget: number;
  sharedState: Record<string, unknown>;
  onResolve: (inputs: Inputs) => LogEntry | null;
  onSkip: () => void;
  onNext: () => void;
  lastEntry: LogEntry | null;
  isCurrentStep: boolean;
}

function defaultInputs(step: Step, sharedState: Record<string, unknown> = {}): Inputs {
  const defaults: Inputs = {};
  const isSetup = step.section === 'SETUP';
  const savedTracks = isSetup ? sharedState['capabilityTracks'] as CapabilityTracks | undefined : undefined;
  const savedRel = isSetup ? sharedState['usRelation'] as USRelation | undefined : undefined;
  const savedSoe = isSetup ? sharedState['soe'] as number | undefined : undefined;
  const savedSoeTrend = isSetup ? sharedState['soeTrend'] as string | undefined : undefined;
  const savedPosture = isSetup ? sharedState['posture'] as number | undefined : undefined;

  for (const spec of step.inputs ?? []) {
    if (spec.kind === 'int') defaults[spec.id] = spec.min ?? 0;
    else if (spec.kind === 'bool') defaults[spec.id] = false;
    else if (spec.kind === 'enum' || spec.kind === 'choice') {
      if (isSetup && spec.id === 'usRelationLevel' && savedRel) {
        defaults[spec.id] = String(savedRel.level);
      } else if (isSetup && spec.id === 'usRelationTrend' && savedRel) {
        defaults[spec.id] = savedRel.pendingAntiUS > 0 ? 'antiUS' : savedRel.pendingProUS > 0 ? 'proUS' : 'none';
      } else if (isSetup && spec.id === 'soe' && savedSoe !== undefined) {
        defaults[spec.id] = String(savedSoe);
      } else if (isSetup && spec.id === 'soeTrend' && savedSoeTrend !== undefined) {
        defaults[spec.id] = savedSoeTrend;
      } else if (isSetup && spec.id === 'posture' && savedPosture !== undefined) {
        defaults[spec.id] = String(savedPosture);
      } else {
        defaults[spec.id] = spec.options[0]?.value ?? '';
      }
    } else if (spec.kind === 'capRow') {
      if (savedTracks) {
        const key = spec.factionId.replace('faction_', '');
        defaults[spec.factionId] = (savedTracks.faction as Record<string, number>)[key] ?? (spec.min ?? 1);
        defaults[spec.usId] = (savedTracks.us as Record<string, number>)[key] ?? (spec.min ?? 1);
      } else {
        defaults[spec.factionId] = spec.min ?? 1;
        defaults[spec.usId] = spec.min ?? 1;
      }
    }
  }
  return defaults;
}

const SETUP_SECTIONS = ['relations', 'economy', 'posture'] as const;
type SetupSection = typeof SETUP_SECTIONS[number];
const SETUP_SECTION_LABELS: Record<SetupSection, string> = {
  relations: 'US Relations',
  economy: 'Economy (SoE)',
  posture: 'Posture',
};

// All capability row+peer combos that must be explicitly clicked in SETUP
const ALL_CAP_ENTRIES = CAPABILITY_KEYS.flatMap((k) => [`faction_${k}`, `us_${k}`]);

type Phase = 'input' | 'outcome';

export function StepCard({ step, faction, repeatIndex, repeatTotal, actionBudget, sharedState, onResolve, onSkip, onNext }: Props) {
  const [inputs, setInputs] = useState<Inputs>(() => defaultInputs(step, sharedState));
  const [phase, setPhase] = useState<Phase>('input');
  const [resolvedEntry, setResolvedEntry] = useState<LogEntry | null>(null);
  const [resolvedTitle, setResolvedTitle] = useState('');
  const [resolvedSection, setResolvedSection] = useState(step.section);
  const [resolvedRepeatLabel, setResolvedRepeatLabel] = useState('');
  // For SETUP: track which sections have been explicitly touched
  const [touchedSections, setTouchedSections] = useState<Set<SetupSection>>(
    () => {
      if (step.section !== 'SETUP') return new Set<SetupSection>();
      const pre = new Set<SetupSection>();
      if (sharedState['usRelation']) pre.add('relations');
      if (sharedState['soe'] !== undefined) pre.add('economy');
      if (sharedState['posture'] !== undefined) pre.add('posture');
      return pre;
    }
  );

  // Per-row capability touch tracking (faction_<key> and us_<key> must all be clicked)
  const [touchedCapRows, setTouchedCapRows] = useState<Set<string>>(
    () => {
      if (step.section !== 'SETUP') return new Set<string>();
      // Pre-fill only if returning to SETUP with existing tracks (second turn)
      if (!sharedState['capabilityTracks']) return new Set<string>();
      return new Set(ALL_CAP_ENTRIES);
    }
  );

  function markTouched(section: SetupSection) {
    setTouchedSections((prev) => {
      if (prev.has(section)) return prev;
      return new Set([...prev, section]);
    });
  }

  function touchCapRow(key: string, peer: 'faction' | 'us') {
    const entry = `${peer}_${key}`;
    setTouchedCapRows((prev) => {
      if (prev.has(entry)) return prev;
      return new Set([...prev, entry]);
    });
  }

  const capRowsDone = ALL_CAP_ENTRIES.every((e) => touchedCapRows.has(e));
  const completedCapRowCount = CAPABILITY_KEYS.filter(
    (k) => touchedCapRows.has(`faction_${k}`) && touchedCapRows.has(`us_${k}`)
  ).length;

  const isSetupReady = step.section !== 'SETUP' || (capRowsDone && SETUP_SECTIONS.every((s) => touchedSections.has(s)));
  const missingSections: string[] = [];
  if (step.section === 'SETUP') {
    if (!capRowsDone) missingSections.push(`Capability Tracks (${completedCapRowCount}/${CAPABILITY_KEYS.length} rows)`);
    SETUP_SECTIONS.forEach((s) => { if (!touchedSections.has(s)) missingSections.push(SETUP_SECTION_LABELS[s]); });
  }

  // Only reset inputs when a new step/repeat arrives and we're already in input phase.
  // If we're showing outcomes, keep showing them until user clicks Next.
  useEffect(() => {
    if (phase === 'input') {
      setInputs(defaultInputs(step, sharedState));
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
      if (section === 'SETUP') {
        onNext();
        return;
      }
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

  const helpText = typeof step.help === 'function' ? step.help(sharedState) : step.help;
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

  const resolvedDice = typeof step.dice === 'function' ? step.dice(sharedState) : (step.dice ?? []);
  const hasDice = resolvedDice.length > 0;
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
          <OutcomePanel outcomes={resolvedEntry.outcomes} faction={faction} />
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
          {helpText && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{helpText}</p>
          )}
        </div>
      </div>

      {/* Action budget indicator (G and H sections) */}
      {(step.section === 'G' || step.section === 'H') && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Actions:</span>
          <span className={`font-bold tabular-nums ${actionBudget > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {actionBudget}
          </span>
          {sharedState['totalActions'] !== undefined && (
            <span className="text-gray-400 dark:text-gray-500 tabular-nums">
              / {sharedState['totalActions'] as number} total
            </span>
          )}
        </div>
      )}

      {/* Inputs */}
      {hasInputs && (
        <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Board State</p>
          {step.section === 'SETUP' ? (
            <>
              <CapabilityTrackBoard
                faction={faction}
                tracks={(() => {
                  const f: Record<string, number> = {};
                  const u: Record<string, number> = {};
                  for (const k of CAPABILITY_KEYS) {
                    f[k] = Number(inputs[`faction_${k}`] ?? 1);
                    u[k] = Number(inputs[`us_${k}`] ?? 1);
                  }
                  return { faction: f, us: u } as CapabilityTracks;
                })()}
                onChange={(next) => {
                  for (const k of CAPABILITY_KEYS) {
                    handleChange(`faction_${k}`, next.faction[k]);
                    handleChange(`us_${k}`, next.us[k]);
                  }
                }}
                onTouchRow={(key, peer) => touchCapRow(key, peer)}
              />
              {!capRowsDone && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Set each row for both Faction and US — {completedCapRowCount}/{CAPABILITY_KEYS.length} rows confirmed
                </p>
              )}
              <div className="mt-4">
                <RelationsTrackBoard
                  level={(Number(inputs['usRelationLevel'] ?? 3)) as USRelationLevel}
                  pendingAntiUS={inputs['usRelationTrend'] === 'antiUS' ? 1 : 0}
                  pendingProUS={inputs['usRelationTrend'] === 'proUS' ? 1 : 0}
                  faction={faction}
                  onChangeLevel={(v) => { markTouched('relations'); handleChange('usRelationLevel', v); }}
                  onChangeTrend={(t) => { markTouched('relations'); handleChange('usRelationTrend', t); }}
                />
              </div>
              <div className="mt-4">
                <EconomyTrackBoard
                  value={(Number(inputs['soe'] ?? 4)) as SoEValue}
                  trend={(inputs['soeTrend'] as SoETrend) ?? 'none'}
                  faction={faction}
                  onChange={(v) => { markTouched('economy'); handleChange('soe', v); }}
                  onChangeTrend={(t) => { markTouched('economy'); handleChange('soeTrend', t); }}
                />
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Current Posture</p>
                <div className="flex gap-2">
                  {[{ v: '1', label: 'Posture 1 — Passive' }, { v: '2', label: 'Posture 2 — Aggressive' }].map(({ v, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { markTouched('posture'); handleChange('posture', v); }}
                      className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${
                        inputs['posture'] === v
                          ? `${isRussia ? 'bg-red-600 border-red-500 ring-4 ring-red-400' : 'bg-amber-600 border-amber-500 ring-4 ring-amber-400'} text-white`
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            step.inputs!.map((spec) => (
              <InputField
                key={spec.id}
                spec={spec}
                value={inputs[spec.id] ?? ''}
                allValues={inputs}
                onChange={handleChange}
              />
            ))
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2 pt-2">
        {!isSetupReady && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Please confirm: {missingSections.join(', ')}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleRoll}
            disabled={!isSetupReady}
            className={`px-5 py-2 rounded-lg text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed ${accentBtn}`}
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
    </div>
  );
}
