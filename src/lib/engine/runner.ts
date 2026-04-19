import type {
  Session, Step, Procedure, Inputs, StepCtx,
  LogEntry, Outcome, Mutation,
} from '@/lib/procedures/types';
import { executeRoll } from './drm';
import { resolveResolution } from './resolver';
import { saveSession, archiveSession, clearActiveSession } from './storage';

// ─── Step list helpers ────────────────────────────────────────────────────────

function visibleSteps(procedure: Procedure, mode: Session['mode']): Step[] {
  if (mode === 'crisis-chit') {
    return procedure.steps.filter((s) => s.section === 'H');
  }
  return procedure.steps;
}

function stepIndex(steps: Step[], id: string): number {
  return steps.findIndex((s) => s.id === id);
}

// ─── Context builder ──────────────────────────────────────────────────────────

function buildCtx(session: Session, inputs: Inputs): StepCtx {
  return {
    faction: session.faction,
    mode: session.mode,
    inputs,
    dice: {},
    actionBudget: session.actionBudget,
    sharedState: session.sharedState,
  };
}

// ─── Mutation side-effects ────────────────────────────────────────────────────

function applyMutations(session: Session, mutations: Mutation[]): void {
  for (const m of mutations) {
    switch (m.kind) {
      case 'set':
        if (m.target === 'actionBudget' && m.amount !== undefined) {
          session.actionBudget = m.amount;
        } else if (m.target && m.amount !== undefined) {
          session.sharedState[m.target] = m.amount;
        }
        break;
      case 'endProcedure':
        session.finishedAt = new Date().toISOString();
        session.cursorStepId = null;
        break;
      case 'autoLoss':
        session.sharedState['autoLoss'] = true;
        session.finishedAt = new Date().toISOString();
        session.cursorStepId = null;
        break;
      case 'skipTo':
        if (m.target) {
          session.cursorStepId = m.target;
          session.cursorRepeatIdx = 0;
        }
        break;
      default:
        break;
    }
  }
}

function outcomeConsumesAction(outcome: Outcome): boolean {
  return outcome.consumesAction !== false;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns the current Step the user should be filling in, or null if done. */
export function getCurrentStep(
  session: Session,
  procedure: Procedure,
): Step | null {
  if (!session.cursorStepId || session.finishedAt) return null;
  return procedure.steps.find((s) => s.id === session.cursorStepId) ?? null;
}

/**
 * Resolve the current step with the given inputs.
 * Mutates session in place, saves to localStorage, and returns the log entry.
 */
export function resolveStep(
  session: Session,
  procedure: Procedure,
  inputs: Inputs,
): LogEntry {
  const step = getCurrentStep(session, procedure);
  if (!step) throw new Error('No current step');

  const ctx = buildCtx(session, inputs);

  // Roll dice
  const rolls = (step.dice ?? []).map((spec) => {
    const result = executeRoll(spec, ctx);
    ctx.dice[result.id] = result;
    return result;
  });

  // Resolve outcomes
  const outcomes = resolveResolution(step.resolution, ctx, ctx.dice);

  // Count action cost in section H
  if (step.section === 'H' && session.actionBudget > 0) {
    const consuming = outcomes.filter(outcomeConsumesAction);
    if (consuming.length > 0) {
      session.actionBudget = Math.max(0, session.actionBudget - 1);
    }
  }

  // Apply mutations
  for (const outcome of outcomes) {
    if (outcome.mutations) {
      applyMutations(session, outcome.mutations);
    }
  }

  // Handle repeat loop
  const steps = visibleSteps(procedure, session.mode);
  const currentIdx = stepIndex(steps, step.id);

  if (!session.finishedAt) {
    const cursorChangedByMutation = session.cursorStepId !== step.id;

    if (cursorChangedByMutation) {
      // skipTo mutation already set the cursor — don't overwrite it
      session.cursorRepeatIdx = 0;
    } else {
      const repeatTotal = step.repeat ? step.repeat.count(ctx) : 1;
      const nextRepeatIdx = session.cursorRepeatIdx + 1;

      if (nextRepeatIdx < repeatTotal) {
        session.cursorRepeatIdx = nextRepeatIdx;
      } else {
        session.cursorRepeatIdx = 0;
        advance(session, procedure, steps, currentIdx + 1);
      }
    }
  }

  const entry: LogEntry = {
    at: new Date().toISOString(),
    stepId: step.id,
    stepTitle: step.title,
    inputs,
    rolls,
    outcomes,
  };

  session.log.push(entry);
  saveSession(session);
  return entry;
}

/** Skip the current step (guard evaluated by caller or user request). */
export function skipStep(
  session: Session,
  procedure: Procedure,
): LogEntry {
  const step = getCurrentStep(session, procedure);
  if (!step) throw new Error('No current step');

  const entry: LogEntry = {
    at: new Date().toISOString(),
    stepId: step.id,
    stepTitle: step.title,
    skipped: true,
    outcomes: [{ id: `${step.id}.skipped`, summary: '(Skipped — conditions not met)' }],
  };

  session.log.push(entry);

  const steps = visibleSteps(procedure, session.mode);
  const idx = stepIndex(steps, step.id);
  session.cursorRepeatIdx = 0;
  advance(session, procedure, steps, idx + 1);

  saveSession(session);
  return entry;
}

/** Finish the session and archive it. */
export function finishSession(session: Session): void {
  if (!session.finishedAt) {
    session.finishedAt = new Date().toISOString();
  }
  session.cursorStepId = null;
  archiveSession(session);
  clearActiveSession(session.faction);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function advance(
  session: Session,
  procedure: Procedure,
  steps: Step[],
  fromIdx: number,
): void {
  if (session.finishedAt) return;

  // In section H, stop when budget exhausted
  for (let i = fromIdx; i < steps.length; i++) {
    const next = steps[i];
    if (next.section === 'H' && session.actionBudget <= 0) {
      // Remaining actions exhausted — procedure ends
      session.finishedAt = new Date().toISOString();
      session.cursorStepId = null;
      return;
    }
    session.cursorStepId = next.id;
    return;
  }

  // No more steps
  session.finishedAt = new Date().toISOString();
  session.cursorStepId = null;
}
