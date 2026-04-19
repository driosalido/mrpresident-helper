import type { Session, Faction } from '@/lib/procedures/types';
import type { CapabilityKey, CapabilityTracks } from '@/lib/procedures/capabilities';

// ─── Game state (persists across sessions, shared between both factions) ──────

const GAME_STATE_KEY = 'mrpres.gameState.v1';

export interface GameState {
  tracks: {
    russia: Record<CapabilityKey, number>;
    china:  Record<CapabilityKey, number>;
    us:     Record<CapabilityKey, number>;
  };
}

export function loadGameState(): GameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch { return null; }
}

export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state)); } catch {}
}

/** Extract CapabilityTracks for a faction from the shared game state. */
export function getTracksForFaction(state: GameState, faction: Faction): CapabilityTracks {
  return { faction: state.tracks[faction], us: state.tracks.us };
}

/** Return a new GameState with the faction's tracks updated from a session. */
export function applyTracksToGameState(
  state: GameState,
  faction: Faction,
  tracks: CapabilityTracks,
): GameState {
  return {
    ...state,
    tracks: { ...state.tracks, [faction]: tracks.faction, us: tracks.us },
  };
}

// ─── Active session (per-faction, single in-progress run) ────────────────────

const ACTIVE_KEY = (f: Faction) => `mrpres.session.v1.${f}`;
const ARCHIVE_KEY = 'mrpres.sessions.v1';
const ARCHIVE_LIMIT = 20;

export function saveSession(session: Session): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_KEY(session.faction), JSON.stringify(session));
}

export function loadSession(faction: Faction): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY(faction));
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s.finishedAt) {
      localStorage.removeItem(ACTIVE_KEY(faction));
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearActiveSession(faction: Faction): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_KEY(faction));
}

export function archiveSession(session: Session): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    const archive: Session[] = raw ? JSON.parse(raw) : [];
    archive.push(session);
    if (archive.length > ARCHIVE_LIMIT) {
      archive.splice(0, archive.length - ARCHIVE_LIMIT);
    }
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {}
}

export function loadArchive(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
