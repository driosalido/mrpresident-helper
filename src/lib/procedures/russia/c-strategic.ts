import type { Step, Outcome } from '@/lib/procedures/types';
import {
  CAPABILITY_KEYS, CAPABILITY_LABELS,
  capFromSelectionRoll,
} from '@/lib/procedures/capabilities';
import type { CapabilityTracks, CapabilityKey } from '@/lib/procedures/capabilities';
import { rollD10 } from '@/lib/engine/dice';

// Section C — Improve Strategic Capabilities (Russia)
// 2 attempts (Posture 1) or 3 attempts (Posture 2).
// Priority: (1) lag ≥ 2 vs US, (2) Cyber + Strategic Missiles, (3) d10 table.
// Skip if already maxed (7) or already attempted this segment.
// Improvement roll: d10 + sanctions. Success ≤ 4 (P1) or ≤ 5 (P2).

const RUSSIA_PRIORITY: CapabilityKey[] = ['cyber', 'strategicMissiles'];

export const stepsC: Step[] = [
  {
    id: 'russia.C',
    section: 'C',
    title: 'Improve Strategic Capabilities',
    help: (ss) => {
      const posture = String(ss['posture'] ?? '1');
      const attempts = posture === '2' ? 3 : 2;
      const threshold = posture === '2' ? 5 : 4;
      return `${attempts} attempts (Posture ${posture}). Priority: (1) lag ≥ 2 vs US → (2) Cyber + Strategic Missiles → (3) d10 table. Improvement success ≤ ${threshold}.`;
    },
    inputs: [
      {
        id: 'sanctionsCount',
        kind: 'int',
        label: 'Sanctions counters on Russia',
        min: 0,
        max: 5,
        help: '+1 DRM per counter to every improvement roll (harder to succeed)',
      },
    ],
    dice: (ss) => {
      const attempts = String(ss['posture'] ?? '1') === '2' ? 3 : 2;
      return Array.from({ length: attempts }, (_, i) => ({
        id: `imp${i}`,
        kind: 'd10' as const,
        label: `Improvement roll — attempt ${i + 1}`,
      }));
    },
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
            id: 'russia.C.nosetup',
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
          const impRoll = ctx.dice[`imp${i}`].sum;   // raw 1–10
          const remaining = attempts - i;

          let target: CapabilityKey | null = null;
          let selNote = '';

          // Priority 1: largest lag ≥ 2 vs US
          const lagCandidates = CAPABILITY_KEYS.filter(
            (cap) => eligible(cap) && (tracks.us[cap] - tracks.faction[cap]) >= 2,
          );
          if (lagCandidates.length > 0) {
            const maxLag = Math.max(...lagCandidates.map((c) => tracks.us[c] - tracks.faction[c]));
            const topTier = lagCandidates.filter((c) => tracks.us[c] - tracks.faction[c] === maxLag);
            if (topTier.length > 1) {
              const selRoll = rollD10()[0];
              target = topTier[selRoll % topTier.length];
              selNote = ` (tied lag — d10=${selRoll} → ${CAPABILITY_LABELS[target]})`;
            } else {
              target = topTier[0];
            }
          }

          // Priority 2: Russia faction pair — Cyber + Strategic Missiles
          if (!target) {
            const available = RUSSIA_PRIORITY.filter(eligible);
            if (available.length > 0) {
              if (remaining === 1 && available.length > 1) {
                const selRoll = rollD10()[0];
                target = available[selRoll % available.length];
                selNote = ` (last attempt, both available — d10=${selRoll} → ${CAPABILITY_LABELS[target]})`;
              } else {
                target = available[0];
              }
            }
          }

          // Priority 3: d10 selection table
          if (!target) {
            const selRoll = rollD10()[0];
            const fromTable = capFromSelectionRoll(selRoll);
            if (eligible(fromTable)) {
              target = fromTable;
              selNote = ` (d10 table: ${selRoll} → ${CAPABILITY_LABELS[target]})`;
            } else {
              outcomes.push({
                id: `russia.C.attempt${i}.wasted`,
                summary: `Attempt ${i + 1}: d10 table roll ${selRoll} → ${CAPABILITY_LABELS[fromTable]} — already at max or previously attempted. Attempt wasted.`,
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
              id: `russia.C.attempt${i}.success`,
              summary: `Attempt ${i + 1}: **${label}**${selNote} — roll ${impRoll}${sanctionsNote} = ${modified} ≤ ${threshold} — SUCCESS. Russia ${label} → ${tracks.faction[target]}.`,
            });
          } else {
            outcomes.push({
              id: `russia.C.attempt${i}.fail`,
              summary: `Attempt ${i + 1}: **${label}**${selNote} — roll ${impRoll}${sanctionsNote} = ${modified} > ${threshold} — No advance.`,
            });
          }
        }

        outcomes.push({
          id: 'russia.C.tracksUpdate',
          summary: 'Capability tracks updated in session.',
          mutations: [{ kind: 'set', target: 'capabilityTracks', value: tracks }],
          boardSnapshot: { before: tracksRaw, after: tracks, faction: 'russia' },
        });

        return outcomes;
      },
    },
  },
];
