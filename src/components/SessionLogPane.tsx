'use client';

import type { LogEntry, Session } from '@/lib/procedures/types';
import { sessionToMarkdown, downloadText } from '@/lib/util/md';

function EntryRow({ entry, index }: { entry: LogEntry; index: number }) {
  const isAutoLoss = entry.outcomes.some((o) => o.mutations?.some((m) => m.kind === 'autoLoss'));

  return (
    <div className={`border-b border-gray-100 dark:border-gray-800 pb-3 mb-3 last:border-0 last:mb-0 ${isAutoLoss ? 'text-red-600 dark:text-red-400' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-gray-400">#{index + 1}</span>
        <span className="text-xs text-gray-400 shrink-0">{new Date(entry.at).toLocaleTimeString()}</span>
      </div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{entry.stepTitle}</p>
      {entry.skipped && <p className="text-xs text-gray-400 italic">skipped</p>}
      {entry.rolls && entry.rolls.map((r) => (
        <p key={r.id} className="text-xs font-mono text-blue-600 dark:text-blue-400">
          {r.label ?? r.id}: {r.raw.join('+')}={r.sum} → {r.drmTotal !== 0 ? `DRM${r.drmTotal > 0 ? '+' : ''}${r.drmTotal} → ` : ''}<strong>{r.modified}</strong>
        </p>
      ))}
      {entry.outcomes.map((o) => (
        <p key={o.id} className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">→ {o.summary}</p>
      ))}
    </div>
  );
}

export function SessionLogPane({ session }: { session: Session }) {
  const reversed = [...session.log].reverse();

  function exportMD() {
    const md = sessionToMarkdown(session);
    const stamp = new Date(session.createdAt).toISOString().slice(0, 16).replace('T', '_');
    downloadText(md, `mr-president-${session.faction}-${stamp}.md`, 'text/markdown');
  }

  function exportJSON() {
    downloadText(JSON.stringify(session, null, 2), `mr-president-${session.faction}-${session.id}.json`, 'application/json');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Session Log</h2>
        <div className="flex gap-1">
          <button
            onClick={exportMD}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            MD
          </button>
          <button
            onClick={exportJSON}
            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          >
            JSON
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {reversed.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No steps resolved yet.</p>
        ) : (
          reversed.map((entry, i) => (
            <EntryRow key={entry.at + entry.stepId} entry={entry} index={session.log.length - 1 - i} />
          ))
        )}
      </div>
    </div>
  );
}
