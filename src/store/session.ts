'use client';

import { create } from 'zustand';
import type { Session, Faction, EntryMode, Inputs, LogEntry, Procedure, Game } from '@/lib/procedures/types';
import { createSession } from '@/lib/engine/session';
import { resolveStep, skipStep, finishSession } from '@/lib/engine/runner';
import {
  loadGame as loadGameFromStorage,
  saveGame,
  createGame as makeGame,
  clearGame,
  upsertActiveRun,
  archiveRun,
  clearActiveRun,
  getTracksForFaction,
  applyTracksFromSession,
} from '@/lib/engine/storage';
import type { CapabilityTracks } from '@/lib/procedures/capabilities';

interface SessionState {
  game: Game | null;
  session: Session | null;
  procedure: Procedure | null;
  lastEntry: LogEntry | null;

  // Game lifecycle
  loadGame: () => void;
  createGame: (name: string) => void;
  endGame: () => void;

  // Run lifecycle
  startRun: (procedure: Procedure, mode: EntryMode) => void;
  resumeRun: (faction: Faction, procedure: Procedure) => Session | null;
  resolve: (inputs: Inputs) => LogEntry | null;
  skip: () => LogEntry | null;
  finishRun: () => void;
  resetCurrentRun: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  game: null,
  session: null,
  procedure: null,
  lastEntry: null,

  loadGame() {
    const game = loadGameFromStorage();
    set({ game });
  },

  createGame(name) {
    const game = makeGame(name);
    saveGame(game);
    set({ game, session: null, procedure: null, lastEntry: null });
  },

  endGame() {
    clearGame();
    set({ game: null, session: null, procedure: null, lastEntry: null });
  },

  startRun(procedure, mode) {
    const { game } = get();
    if (!game) return;
    // Archive any orphaned finished run for this faction before starting fresh
    let g = game;
    const existing = game.activeRuns[procedure.faction];
    if (existing?.finishedAt) {
      g = archiveRun(game, existing);
    }
    const session = createSession(procedure, mode);
    session.sharedState['capabilityTracks'] = getTracksForFaction(g, procedure.faction);
    const updated = upsertActiveRun(g, session);
    saveGame(updated);
    set({ game: updated, session, procedure, lastEntry: null });
  },

  resumeRun(faction, procedure) {
    const { game } = get();
    if (!game) return null;
    const raw = game.activeRuns[faction] ?? null;
    if (!raw) return null;
    if (raw.finishedAt) {
      // Orphaned finished session — archive it and let the caller start fresh
      const updated = archiveRun(game, raw);
      saveGame(updated);
      set({ game: updated });
      return null;
    }
    set({ session: raw, procedure });
    return raw;
  },

  resolve(inputs) {
    const { game, session, procedure } = get();
    if (!game || !session || !procedure) return null;
    const s = { ...session, log: [...session.log], sharedState: { ...session.sharedState } };
    const entry = resolveStep(s, procedure, inputs);
    const tracks = s.sharedState['capabilityTracks'] as CapabilityTracks | undefined;
    let updated = upsertActiveRun(game, s);
    if (tracks) updated = applyTracksFromSession(updated, s);
    saveGame(updated);
    set({ game: updated, session: s, lastEntry: entry });
    return entry;
  },

  skip() {
    const { game, session, procedure } = get();
    if (!game || !session || !procedure) return null;
    const s = { ...session, log: [...session.log], sharedState: { ...session.sharedState } };
    const entry = skipStep(s, procedure);
    const updated = upsertActiveRun(game, s);
    saveGame(updated);
    set({ game: updated, session: s, lastEntry: entry });
    return entry;
  },

  finishRun() {
    const { game, session } = get();
    if (!game || !session) return;
    const s = { ...session };
    finishSession(s);
    const updated = archiveRun(game, s);
    saveGame(updated);
    set({ game: updated, session: s, lastEntry: null });
  },

  resetCurrentRun() {
    const { game, session } = get();
    if (!game || !session) return;
    const updated = clearActiveRun(game, session.faction);
    saveGame(updated);
    set({ game: updated, session: null, procedure: null, lastEntry: null });
  },
}));

