import type { DrmTerm, DiceSpec, DiceResult, StepCtx } from '@/lib/procedures/types';
import { rollByKind } from './dice';

const DEFAULT_CAP = { min: -3, max: 3 };

export function resolveDrms(
  terms: DrmTerm[],
  ctx: StepCtx,
): { label: string; value: number }[] {
  return terms.map((t) => ({
    label: t.label,
    value: typeof t.value === 'function' ? t.value(ctx) : t.value,
  }));
}

export function capDrm(
  total: number,
  cap: DiceSpec['cap'],
): number {
  const min = cap?.min ?? DEFAULT_CAP.min;
  const max = cap?.max ?? DEFAULT_CAP.max;
  return Math.min(max, Math.max(min, total));
}

export function executeRoll(spec: DiceSpec, ctx: StepCtx): DiceResult {
  const raw = rollByKind(spec.kind);
  const sum = raw.reduce((a, b) => a + b, 0);
  const drmsApplied = spec.drms ? resolveDrms(spec.drms, ctx) : [];
  const uncapped = drmsApplied.reduce((a, d) => a + d.value, 0);
  const drmTotal = capDrm(uncapped, spec.cap);
  return {
    id: spec.id,
    kind: spec.kind,
    label: spec.label,
    raw,
    sum,
    drmsApplied,
    drmTotal,
    modified: sum + drmTotal,
  };
}
