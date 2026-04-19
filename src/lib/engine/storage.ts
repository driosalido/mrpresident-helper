import { nanoid } from 'nanoid';
import type { Session, Faction, Game, GameSharedState } from '@/lib/procedures/types';
import { CAPABILITY_KEYS, type CapabilityKey, type CapabilityTracks } from '@/lib/procedures/capabilities';
import { DEFAULT_US_RELATION, type USRelation } from '@/lib/procedures/usRelation';

const GAME_KEY = 'mrpres.game.v2';
const ARCHIVE_LIMIT = 20;

// ─── Zero tracks ─────────────────────────────────────────────────────────────

function zeroTracks(): Record<CapabilityKey, number> {
  return Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, 0])) as Record<CapabilityKey, number>;
}

function defaultSharedState(): GameSharedState {
  return {
    capabilityTracks: {
      russia: zeroTracks(),
      china: zeroTracks(),
      us: zeroTracks(),
    },
    usRelation: {
      russia: { ...DEFAULT_US_RELATION },
      china:  { ...DEFAULT_US_RELATION },
    },
  };
}

// ─── Migration from legacy v1 keys ───────────────────────────────────────────

function migrateLegacy(): Game | null {
  const LEGACY_GAME_STATE = 'mrpres.gameState.v1';
  const LEGACY_SESSION = (f: string) => `mrpres.session.v1.${f}`;
  const LEGACY_ARCHIVE = 'mrpres.sessions.v1';

  const legacyKeys = [LEGACY_GAME_STATE, LEGACY_SESSION('russia'), LEGACY_SESSION('china'), LEGACY_ARCHIVE];
  const hasLegacy = legacyKeys.some((k) => localStorage.getItem(k) !== null);
  if (!hasLegacy) return null;

  const sharedState = defaultSharedState();
  try {
    const raw = localStorage.getItem(LEGACY_GAME_STATE);
    if (raw) {
      const gs = JSON.parse(raw) as { tracks: { russia: Record<CapabilityKey, number>; china: Record<CapabilityKey, number>; us: Record<CapabilityKey, number> } };
      sharedState.capabilityTracks = gs.tracks;
    }
  } catch {}

  const activeRuns: Partial<Record<Faction, Session>> = {};
  for (const faction of ['russia', 'china'] as Faction[]) {
    try {
      const raw = localStorage.getItem(LEGACY_SESSION(faction));
      if (raw) {
        const s = JSON.parse(raw) as Session;
        if (!s.finishedAt) activeRuns[faction] = s;
      }
    } catch {}
  }

  let archive: Session[] = [];
  try {
    const raw = localStorage.getItem(LEGACY_ARCHIVE);
    if (raw) archive = JSON.parse(raw) as Session[];
  } catch {}

  const now = new Date().toISOString();
  const game: Game = {
    id: nanoid(),
    name: 'Untitled Game',
    createdAt: now,
    updatedAt: now,
    sharedState,
    activeRuns,
    archive,
  };

  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(game));
    for (const k of legacyKeys) localStorage.removeItem(k);
  } catch {}

  return game;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function loadGame(): Game | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GAME_KEY);
    if (raw) return JSON.parse(raw) as Game;
  } catch {}
  return migrateLegacy();
}

export function saveGame(game: Game): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify({ ...game, updatedAt: new Date().toISOString() }));
  } catch {}
}

export function createGame(name: string): Game {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    sharedState: defaultSharedState(),
    activeRuns: {},
    archive: [],
  };
}

export function clearGame(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(GAME_KEY); } catch {}
}

// ─── Run helpers (pure — no side effects) ─────────────────────────────────────

export function upsertActiveRun(game: Game, session: Session): Game {
  return { ...game, activeRuns: { ...game.activeRuns, [session.faction]: session } };
}

export function archiveRun(game: Game, session: Session): Game {
  const archive = [...game.archive, session];
  if (archive.length > ARCHIVE_LIMIT) archive.splice(0, archive.length - ARCHIVE_LIMIT);
  const activeRuns = { ...game.activeRuns };
  delete activeRuns[session.faction];
  return { ...game, activeRuns, archive };
}

export function clearActiveRun(game: Game, faction: Faction): Game {
  const activeRuns = { ...game.activeRuns };
  delete activeRuns[faction];
  return { ...game, activeRuns };
}

export function getTracksForFaction(game: Game, faction: Faction): CapabilityTracks {
  const ct = game.sharedState.capabilityTracks;
  return { faction: ct[faction], us: ct.us };
}

export function applySharedStateToGame(game: Game, session: Session): Game {
  let sharedState = game.sharedState;

  const tracks = session.sharedState['capabilityTracks'] as CapabilityTracks | undefined;
  if (tracks) {
    const ct = sharedState.capabilityTracks;
    const updatedCt = session.faction === 'russia'
      ? { ...ct, russia: tracks.faction, us: tracks.us }
      : { ...ct, china: tracks.faction, us: tracks.us };
    sharedState = { ...sharedState, capabilityTracks: updatedCt };
  }

  const rel = session.sharedState['usRelation'] as USRelation | undefined;
  if (rel) {
    sharedState = {
      ...sharedState,
      usRelation: { ...sharedState.usRelation, [session.faction]: rel },
    };
  }

  return { ...game, sharedState };
}
