import type { Step, Outcome } from '@/lib/procedures/types';
import {
  CAPABILITY_KEYS, CAPABILITY_LABELS,
  capFromSelectionRoll,
} from '@/lib/procedures/capabilities';
import type { CapabilityTracks, CapabilityKey } from '@/lib/procedures/capabilities';

// Section C — Improve Strategic Capabilities (China)
// 2 attempts (Posture 1) or 3 attempts (Posture 2).
// Priority: (1) lag ≥ 2 vs US, (2) Cyber + Naval Forces, (3) d10 table.
// Skip if already maxed (7) or already attempted this segment.
// Improvement roll: d10 + 1 (if sanctions marker on that track). Success ≤ 4 (P1) or ≤ 5 (P2).

const CHINA_PRIORITY: CapabilityKey[] = ['cyber', 'navalForces'];

export const stepsC: Step[] = [
  {
    id: 'china.C',
    section: 'C',
    title: 'Improve Strategic Capabilities',
    help: 'China makes 2 attempts (Posture 1) or 3 (Posture 2). Selection priority: (1) lag ≥ 2 vs US → (2) Cyber + Naval Forces → (3) d10 table. Roll d10 per attempt. Success ≤ 4 (P1) or ≤ 5 (P2).',
    inputs: [
      {
        id: 'sanctionsCount',
        kind: 'int',
        label: 'Sanctions counters on China',
        min: 0,
        max: 5,
        help: '+1 DRM per counter to every improvement roll (harder to succeed)',
      },
    ],
    dice: [
      { id: 'sel0', kind: 'd10', label: 'Selection die — attempt 1' },
      { id: 'sel1', kind: 'd10', label: 'Selection die — attempt 2' },
      { id: 'sel2', kind: 'd10', label: 'Selection die — attempt 3' },
      { id: 'imp0', kind: 'd10', label: 'Improvement die — attempt 1' },
      { id: 'imp1', kind: 'd10', label: 'Improvement die — attempt 2' },
      { id: 'imp2', kind: 'd10', label: 'Improvement die — attempt 3' },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const posture = String(ctx.sharedState['posture'] ?? '1');
        const attempts = posture === '2' ? 3 : 2;
        const threshold = posture === '2' ? 5 : 4;
        const sanctions = Number(ctx.inputs.sanctionsCount ?? 0);

        const tracksRaw = ctx.sharedState['capabilityTracks'] as CapabilityTracks | undefined;
        if (!tracksRaw) {
          return {
            id: 'china.C.nosetup',
            summary: 'SETUP step not completed — capability tracks unknown. Please restart the session to record track levels.',
          };
        }

        const tracks: CapabilityTracks = {
          faction: { ...tracksRaw.faction },
          us:      { ...tracksRaw.us },
        };

        const improved = new Set<CapabilityKey>();
        const outcomes: Outcome[] = [];

        const eligible = (cap: CapabilityKey): boolean =>
          !improved.has(cap) && tracks.faction[cap] < 7;

        for (let i = 0; i < attempts; i++) {
          const selRoll = ctx.dice[`sel${i}`].sum;   // raw 1–10
          const impRoll = ctx.dice[`imp${i}`].sum;   // raw 1–10
          const remaining = attempts - i;

          let target: CapabilityKey | null = null;

          // Priority 1: largest lag ≥ 2 vs US
          const lagCandidates = CAPABILITY_KEYS.filter(
            (cap) => eligible(cap) && (tracks.us[cap] - tracks.faction[cap]) >= 2,
          );
          if (lagCandidates.length > 0) {
            const maxLag = Math.max(...lagCandidates.map((c) => tracks.us[c] - tracks.faction[c]));
            const topTier = lagCandidates.filter((c) => tracks.us[c] - tracks.faction[c] === maxLag);
            target = topTier[selRoll % topTier.length];
          }

          // Priority 2: China faction pair — Cyber + Naval Forces
          if (!target) {
            const available = CHINA_PRIORITY.filter(eligible);
            if (available.length > 0) {
              target = (remaining === 1 && available.length > 1)
                ? available[selRoll % available.length]
                : available[0];
            }
          }

          // Priority 3: d10 selection table
          if (!target) {
            const fromTable = capFromSelectionRoll(selRoll);
            if (eligible(fromTable)) {
              target = fromTable;
            } else {
              outcomes.push({
                id: `china.C.attempt${i}.wasted`,
                summary: `Attempt ${i + 1}: d10=${selRoll} → ${CAPABILITY_LABELS[fromTable]} — already at max or previously attempted. Attempt wasted.`,
              });
              continue;
            }
          }

          // Improvement roll (+sanctions DRM)
          const label = CAPABILITY_LABELS[target];
          const modified = impRoll + sanctions;
          const sanctionsNote = sanctions > 0 ? ` +${sanctions} (sanctions)` : '';
          improved.add(target);

          if (modified <= threshold) {
            tracks.faction[target] = Math.min(7, tracks.faction[target] + 1);
            outcomes.push({
              id: `china.C.attempt${i}.success`,
              summary: `Attempt ${i + 1}: **${label}** — roll ${impRoll}${sanctionsNote} = ${modified} ≤ ${threshold} — SUCCESS. China ${label} → ${tracks.faction[target]}.`,
            });
          } else {
            outcomes.push({
              id: `china.C.attempt${i}.fail`,
              summary: `Attempt ${i + 1}: **${label}** — roll ${impRoll}${sanctionsNote} = ${modified} > ${threshold} — No advance.`,
            });
          }
        }

        outcomes.push({
          id: 'china.C.tracksUpdate',
          summary: 'Capability tracks updated in session.',
          mutations: [{ kind: 'set', target: 'capabilityTracks', value: tracks }],
          boardSnapshot: { before: tracksRaw, after: tracks, faction: 'china' },
        });

        return outcomes;
      },
    },
  },
];
