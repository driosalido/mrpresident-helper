import { describe, it, expect, beforeEach } from 'vitest';
import { makeSeededRng, setRng, rollD10 } from '@/lib/engine/dice';
import { capDrm } from '@/lib/engine/drm';
import { resolveStep, skipStep, getCurrentStep } from '@/lib/engine/runner';
import type { Procedure, Session, Step } from '@/lib/procedures/types';

// ─── RNG determinism ──────────────────────────────────────────────────────────

describe('makeSeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const rng1 = makeSeededRng(42);
    const rng2 = makeSeededRng(42);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = makeSeededRng(1);
    const rng2 = makeSeededRng(2);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it('setRng injection makes rollD10 deterministic', () => {
    setRng(makeSeededRng(7));
    const r1 = rollD10()[0];
    setRng(makeSeededRng(7));
    const r2 = rollD10()[0];
    expect(r1).toBe(r2);
    expect(r1).toBeGreaterThanOrEqual(1);
    expect(r1).toBeLessThanOrEqual(10);
  });
});

// ─── DRM cap ──────────────────────────────────────────────────────────────────

describe('capDrm', () => {
  it('caps at +3 by default', () => {
    expect(capDrm(10, undefined)).toBe(3);
  });

  it('caps at -3 by default', () => {
    expect(capDrm(-10, undefined)).toBe(-3);
  });

  it('passes through values within default cap', () => {
    expect(capDrm(2, undefined)).toBe(2);
    expect(capDrm(-2, undefined)).toBe(-2);
    expect(capDrm(0, undefined)).toBe(0);
  });

  it('respects per-spec max override', () => {
    expect(capDrm(10, { max: 5 })).toBe(5);
  });

  it('respects per-spec min override', () => {
    expect(capDrm(-10, { min: -5 })).toBe(-5);
  });

  it('respects both min and max override', () => {
    expect(capDrm(100, { min: -1, max: 1 })).toBe(1);
    expect(capDrm(-100, { min: -1, max: 1 })).toBe(-1);
  });
});

// ─── Runner ───────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'test',
    createdAt: new Date().toISOString(),
    faction: 'russia',
    mode: 'regular',
    cursorStepId: 's1',
    cursorRepeatIdx: 0,
    actionBudget: 5,
    sharedState: {},
    log: [],
    ...overrides,
  };
}

const staticStep = (id: string, section: Step['section'] = 'A'): Step => ({
  id,
  section,
  title: id,
  resolution: { kind: 'static', outcome: { id: `${id}.out`, summary: 'ok' } },
});

describe('runner', () => {
  beforeEach(() => {
    // Use a deterministic RNG so tests don't depend on Math.random
    setRng(makeSeededRng(1));
  });

  it('guard:false skips step with [skipped] log entry', () => {
    const proc: Procedure = {
      faction: 'russia',
      name: 'test',
      steps: [
        { ...staticStep('s1'), guard: () => false },
        staticStep('s2'),
      ],
    };
    const session = makeSession({ cursorStepId: 's1' });
    skipStep(session, proc);
    expect(session.log[0].skipped).toBe(true);
    expect(session.log[0].stepId).toBe('s1');
    expect(session.cursorStepId).toBe('s2');
  });

  it('repeat.count=N loops N times before advancing', () => {
    const proc: Procedure = {
      faction: 'russia',
      name: 'test',
      steps: [
        {
          ...staticStep('s1'),
          repeat: { count: () => 3, label: 'Attempt' },
        },
        staticStep('s2'),
      ],
    };
    const session = makeSession({ cursorStepId: 's1' });

    resolveStep(session, proc, {});
    expect(session.cursorStepId).toBe('s1');
    expect(session.cursorRepeatIdx).toBe(1);

    resolveStep(session, proc, {});
    expect(session.cursorStepId).toBe('s1');
    expect(session.cursorRepeatIdx).toBe(2);

    resolveStep(session, proc, {});
    expect(session.cursorStepId).toBe('s2');
    expect(session.cursorRepeatIdx).toBe(0);
  });

  it('consumesAction:false does not decrement actionBudget', () => {
    const proc: Procedure = {
      faction: 'russia',
      name: 'test',
      steps: [
        {
          ...staticStep('s1', 'H'),
          resolution: {
            kind: 'static',
            outcome: { id: 's1.out', summary: 'ok', consumesAction: false },
          },
        },
        staticStep('s2', 'H'),
      ],
    };
    const session = makeSession({ cursorStepId: 's1', actionBudget: 3 });
    resolveStep(session, proc, {});
    expect(session.actionBudget).toBe(3);
  });

  it('consumesAction:true (default) decrements actionBudget in section H', () => {
    const proc: Procedure = {
      faction: 'russia',
      name: 'test',
      steps: [staticStep('s1', 'H'), staticStep('s2', 'H')],
    };
    const session = makeSession({ cursorStepId: 's1', actionBudget: 3 });
    resolveStep(session, proc, {});
    expect(session.actionBudget).toBe(2);
  });

  it('skipTo mutation jumps cursor to target step', () => {
    const proc: Procedure = {
      faction: 'russia',
      name: 'test',
      steps: [
        {
          ...staticStep('s1'),
          resolution: {
            kind: 'static',
            outcome: {
              id: 's1.out',
              summary: 'skip',
              mutations: [{ kind: 'skipTo', target: 's3' }],
            },
          },
        },
        staticStep('s2'),
        staticStep('s3'),
      ],
    };
    const session = makeSession({ cursorStepId: 's1' });
    resolveStep(session, proc, {});
    expect(session.cursorStepId).toBe('s3');
  });

  it('endProcedure mutation sets finishedAt and stops advancing', () => {
    const proc: Procedure = {
      faction: 'russia',
      name: 'test',
      steps: [
        {
          ...staticStep('s1'),
          resolution: {
            kind: 'static',
            outcome: {
              id: 's1.out',
              summary: 'end',
              mutations: [{ kind: 'endProcedure' }],
            },
          },
        },
        staticStep('s2'),
      ],
    };
    const session = makeSession({ cursorStepId: 's1' });
    resolveStep(session, proc, {});
    expect(session.finishedAt).toBeDefined();
    expect(session.cursorStepId).toBeNull();
    expect(getCurrentStep(session, proc)).toBeNull();
  });
});
