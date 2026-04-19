import { describe, it, expect, beforeEach } from 'vitest';
import { makeSeededRng, setRng, rollD10 } from '@/lib/engine/dice';
import { capDrm } from '@/lib/engine/drm';
import { resolveStep, skipStep, getCurrentStep } from '@/lib/engine/runner';
import type { Procedure, Session, Step } from '@/lib/procedures/types';
import {
  capFromSelectionRoll,
  deriveCyberAdvD,
  cyberDrmD,
  deriveCyberAdvH1,
} from '@/lib/procedures/capabilities';
import type { CapabilityTracks } from '@/lib/procedures/capabilities';
import { stepsSetup as russiaSetup } from '@/lib/procedures/russia/setup';
import { stepsC as russiaStepsC } from '@/lib/procedures/russia/c-strategic';

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

  it('set mutation with value stores object in sharedState', () => {
    const obj = { faction: { cyber: 5 }, us: { cyber: 3 } };
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
              summary: 'store',
              mutations: [{ kind: 'set', target: 'myObj', value: obj }],
            },
          },
        },
      ],
    };
    const session = makeSession({ cursorStepId: 's1' });
    resolveStep(session, proc, {});
    expect(session.sharedState['myObj']).toEqual(obj);
  });

  it('SETUP step persists capabilityTracks to sharedState', () => {
    const proc: Procedure = {
      faction: 'russia',
      name: 'test',
      steps: [...russiaSetup, staticStep('done')],
    };
    const session = makeSession({ cursorStepId: 'russia.SETUP' });
    const inputs: Record<string, string | number | boolean> = {};
    for (const k of ['airForce', 'groundForces', 'navalForces', 'cyber', 'space', 'strategicMissiles', 'recon']) {
      inputs[`faction_${k}`] = 3;
      inputs[`us_${k}`] = 4;
    }
    resolveStep(session, proc, inputs);
    const tracks = session.sharedState['capabilityTracks'] as CapabilityTracks;
    expect(tracks).toBeDefined();
    expect(tracks.faction.cyber).toBe(3);
    expect(tracks.us.cyber).toBe(4);
  });
});

// ─── Capability helpers ───────────────────────────────────────────────────────

describe('capFromSelectionRoll', () => {
  it('maps 1 → airForce', () => expect(capFromSelectionRoll(1)).toBe('airForce'));
  it('maps 2 → groundForces', () => expect(capFromSelectionRoll(2)).toBe('groundForces'));
  it('maps 3 → navalForces', () => expect(capFromSelectionRoll(3)).toBe('navalForces'));
  it('maps 4 → cyber', () => expect(capFromSelectionRoll(4)).toBe('cyber'));
  it('maps 5 → cyber', () => expect(capFromSelectionRoll(5)).toBe('cyber'));
  it('maps 6 → space', () => expect(capFromSelectionRoll(6)).toBe('space'));
  it('maps 7 → space', () => expect(capFromSelectionRoll(7)).toBe('space'));
  it('maps 8 → strategicMissiles', () => expect(capFromSelectionRoll(8)).toBe('strategicMissiles'));
  it('maps 9 → strategicMissiles', () => expect(capFromSelectionRoll(9)).toBe('strategicMissiles'));
  it('maps 10 → recon', () => expect(capFromSelectionRoll(10)).toBe('recon'));
});

describe('deriveCyberAdvD', () => {
  it('faction ≥ us+2 → faction_2plus', () => expect(deriveCyberAdvD(6, 3)).toBe('faction_2plus'));
  it('faction = us+1 → faction_1',     () => expect(deriveCyberAdvD(4, 3)).toBe('faction_1'));
  it('equal → equal',                  () => expect(deriveCyberAdvD(4, 4)).toBe('equal'));
  it('faction = us−1 → us_1',          () => expect(deriveCyberAdvD(3, 4)).toBe('us_1'));
  it('faction ≤ us−2 → us_2plus',      () => expect(deriveCyberAdvD(2, 5)).toBe('us_2plus'));

  it('cyberDrmD maps faction_2plus to −2', () => expect(cyberDrmD('faction_2plus')).toBe(-2));
  it('cyberDrmD maps us_2plus to +2',      () => expect(cyberDrmD('us_2plus')).toBe(+2));
  it('cyberDrmD maps equal to 0',          () => expect(cyberDrmD('equal')).toBe(0));
});

describe('deriveCyberAdvH1', () => {
  it('faction > us → faction_wins', () => expect(deriveCyberAdvH1(5, 4)).toBe('faction_wins'));
  it('equal → equal',               () => expect(deriveCyberAdvH1(4, 4)).toBe('equal'));
  it('faction < us → us_wins',      () => expect(deriveCyberAdvH1(3, 4)).toBe('us_wins'));
});

describe('Russia Step C — selection priority', () => {
  const stepC = russiaStepsC[0];

  function makeCtxWithTracks(
    tracks: CapabilityTracks,
    posture: '1' | '2',
    sel: number[],
    imp: number[],
  ) {
    // Build a fake DiceResult for each die
    const dice: Record<string, { sum: number; modified: number }> = {};
    sel.forEach((v, i) => { dice[`sel${i}`] = { sum: v, modified: v }; });
    imp.forEach((v, i) => { dice[`imp${i}`] = { sum: v, modified: v }; });
    return {
      faction: 'russia' as const,
      mode: 'regular' as const,
      inputs: {},
      dice: dice as never,
      actionBudget: 5,
      sharedState: { posture, capabilityTracks: tracks },
    };
  }

  function makeTracks(overrides: Partial<CapabilityTracks> = {}): CapabilityTracks {
    const base = { airForce: 4, groundForces: 4, navalForces: 4, cyber: 4, space: 4, strategicMissiles: 4, recon: 4 };
    return {
      faction: { ...base, ...overrides.faction },
      us:      { ...base, ...overrides.us },
    };
  }

  it('priority 1: picks lag ≥ 2 cap over faction priority', () => {
    const tracks = makeTracks({ faction: { airForce: 1, groundForces: 4, navalForces: 4, cyber: 4, space: 4, strategicMissiles: 4, recon: 4 }, us: { airForce: 4, groundForces: 4, navalForces: 4, cyber: 4, space: 4, strategicMissiles: 4, recon: 4 } });
    const ctx = makeCtxWithTracks(tracks, '1', [1, 1], [10, 10]);
    if (stepC.resolution.kind !== 'custom') throw new Error('expected custom');
    const outcomes = stepC.resolution.resolve(ctx as never) as { summary: string }[];
    expect(outcomes[0].summary).toContain('Air Force');
    expect(outcomes[0].summary).toContain('No advance');
  });

  it('priority 2: picks Cyber when no lag and both pair eligible', () => {
    const tracks = makeTracks();
    const ctx = makeCtxWithTracks(tracks, '1', [5, 5], [10, 10]);
    if (stepC.resolution.kind !== 'custom') throw new Error('expected custom');
    const outcomes = stepC.resolution.resolve(ctx as never) as { summary: string }[];
    expect(outcomes[0].summary).toContain('Cyber');
    expect(outcomes[1].summary).toContain('Strategic Missiles');
  });

  it('success roll ≤ threshold advances track and stores to sharedState', () => {
    const tracks = makeTracks();
    const ctx = makeCtxWithTracks(tracks, '1', [5, 5], [3, 3]);
    if (stepC.resolution.kind !== 'custom') throw new Error('expected custom');
    const outcomes = stepC.resolution.resolve(ctx as never) as { summary: string; mutations?: { kind: string; target?: string; value?: unknown }[] }[];
    const updateOutcome = outcomes.find((o) => o.mutations?.some((m) => m.target === 'capabilityTracks'));
    expect(updateOutcome).toBeDefined();
    const updatedTracks = updateOutcome!.mutations!.find((m) => m.target === 'capabilityTracks')!.value as CapabilityTracks;
    expect(updatedTracks.faction.cyber).toBe(5);
  });
});
