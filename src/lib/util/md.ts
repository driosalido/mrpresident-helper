import type { Session, LogEntry, DiceResult } from '@/lib/procedures/types';

function formatRolls(rolls: DiceResult[]): string {
  return rolls
    .map((r) => {
      const drms = r.drmsApplied
        .filter((d) => d.value !== 0)
        .map((d) => `${d.value > 0 ? '+' : ''}${d.value} ${d.label}`)
        .join(', ');
      const drmStr = drms ? ` [DRM: ${drms} → cap ${r.drmTotal}]` : '';
      return `  - ${r.label ?? r.id}: raw ${r.raw.join('+')}=${r.sum}${drmStr} = **${r.modified}**`;
    })
    .join('\n');
}

function formatEntry(entry: LogEntry, index: number): string {
  const lines: string[] = [];
  lines.push(`### ${index + 1}. ${entry.stepTitle}`);
  lines.push(`*${new Date(entry.at).toLocaleTimeString()}*`);

  if (entry.skipped) {
    lines.push('> *(skipped — conditions not met)*');
    return lines.join('\n');
  }

  if (entry.rolls && entry.rolls.length > 0) {
    lines.push('**Dice:**');
    lines.push(formatRolls(entry.rolls));
  }

  if (entry.outcomes && entry.outcomes.length > 0) {
    lines.push('**Results:**');
    for (const o of entry.outcomes) {
      lines.push(`- ${o.summary}`);
      if (o.detail) {
        lines.push(
          o.detail
            .split('\n')
            .map((l) => `  > ${l}`)
            .join('\n'),
        );
      }
      if (o.mutations && o.mutations.length > 0) {
        const board = o.mutations.filter((m) => m.kind !== 'set' && m.kind !== 'endProcedure' && m.kind !== 'autoLoss' && m.kind !== 'note');
        if (board.length > 0) {
          lines.push('  *Apply to board:*');
          for (const m of board) {
            const amt = m.amount !== undefined ? ` (${m.amount > 0 ? '+' : ''}${m.amount})` : '';
            lines.push(`  - [ ] ${m.kind} ${m.target ?? ''}${amt}`);
          }
        }
      }
    }
  }

  return lines.join('\n');
}

export function sessionToMarkdown(session: Session): string {
  const faction = session.faction === 'russia' ? 'Russia Acts (WPR1)' : 'China Acts (WPC1)';
  const mode = session.mode === 'crisis-chit' ? 'Crisis-Chit (2) Entry' : 'Regular Entry';
  const started = new Date(session.createdAt).toLocaleString();
  const ended = session.finishedAt ? new Date(session.finishedAt).toLocaleString() : 'in progress';

  const lines: string[] = [
    `# ${faction}`,
    `**Mode:** ${mode}  `,
    `**Started:** ${started}  `,
    `**Finished:** ${ended}`,
    '',
    '---',
    '',
  ];

  session.log.forEach((entry, i) => {
    lines.push(formatEntry(entry, i));
    lines.push('');
  });

  return lines.join('\n');
}

export function downloadText(content: string, filename: string, type = 'text/plain'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
