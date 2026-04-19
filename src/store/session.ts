'use client';

import { create } from 'zustand';
import type { Session, Faction, EntryMode, Inputs, LogEntry, Procedure } from '@/lib/procedures/types';
import { createSession } from '@/lib/engine/session';
import { resolveStep, skipStep, finishSession, getCurrentStep } from '@/lib/engine/runner';
import { saveSession, loadSession, clearActiveSession } from '@/lib/engine/storage';

interface SessionState {
  session: Session | null;
  procedure: Procedure | null;
  lastEntry: LogEntry | null;

  start: (procedure: Procedure, mode: EntryMode) => void;
  resume: (session: Session, procedure: Procedure) => void;
  resolve: (inputs: Inputs) => LogEntry | null;
  skip: () => LogEntry | null;
  finish: () => void;
  reset: () => void;
  loadSaved: (faction: Faction, procedure: Procedure) => Session | null;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  procedure: null,
  lastEntry: null,

  start(procedure, mode) {
    const session = createSession(procedure, mode);
    saveSession(session);
    set({ session, procedure, lastEntry: null });
  },

  resume(session, procedure) {
    set({ session, procedure, lastEntry: null });
  },

  resolve(inputs) {
    const { session, procedure } = get();
    if (!session || !procedure) return null;
    // clone to mutate safely
    const s = { ...session, log: [...session.log], sharedState: { ...session.sharedState } };
    const entry = resolveStep(s, procedure, inputs);
    set({ session: s, lastEntry: entry });
    return entry;
  },

  skip() {
    const { session, procedure } = get();
    if (!session || !procedure) return null;
    const s = { ...session, log: [...session.log], sharedState: { ...session.sharedState } };
    const entry = skipStep(s, procedure);
    set({ session: s, lastEntry: entry });
    return entry;
  },

  finish() {
    const { session } = get();
    if (!session) return;
    const s = { ...session };
    finishSession(s);
    set({ session: s, lastEntry: null });
  },

  reset() {
    const { session } = get();
    if (session) clearActiveSession(session.faction);
    set({ session: null, procedure: null, lastEntry: null });
  },

  loadSaved(faction, procedure) {
    const saved = loadSession(faction);
    if (saved) {
      set({ session: saved, procedure });
    }
    return saved;
  },
}));
