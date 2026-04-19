import type { Session, Faction } from '@/lib/procedures/types';

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
    // reject finished sessions from active slot
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
  } catch {
    // storage quota exceeded — skip archive
  }
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
