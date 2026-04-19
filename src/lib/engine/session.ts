import type { Session, Faction, EntryMode, Procedure } from '@/lib/procedures/types';

let _idCounter = 0;
function uid(): string {
  return `${Date.now()}-${++_idCounter}`;
}

export function createSession(
  procedure: Procedure,
  mode: EntryMode,
): Session {
  const firstStep = mode === 'crisis-chit'
    ? procedure.steps.find((s) => s.section === 'H')
    : procedure.steps[0];

  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    faction: procedure.faction,
    mode,
    cursorStepId: firstStep?.id ?? null,
    cursorRepeatIdx: 0,
    actionBudget: mode === 'crisis-chit' ? 2 : 0,
    sharedState: {},
    log: [],
  };
}

export function isFinished(session: Session): boolean {
  return !!session.finishedAt || session.cursorStepId === null;
}
