import type { Step, Outcome } from '@/lib/procedures/types';
import {
  US_RELATION_LABELS,
  DEFAULT_US_RELATION,
  applyTrendMarkers,
  type USRelation,
} from '@/lib/procedures/usRelation';

// Section B — Posture Changes & Relationship with US
// 1. Flip all Tensions counters on Russia, sum their values.
// 2. Apply posture change table.
// 3. Apply Relations-with-US trending (accumulator model).
// 4. Remove all Tensions; redraw half (rounded up), place number-side down.

export const stepsB: Step[] = [
  {
    id: 'russia.B',
    section: 'B',
    title: 'Posture Changes & Relationship with US',
    help: 'Flip all Tensions counters on Russia, sum their values, then resolve posture changes and relations shifts. Remove all Tensions; redraw half (round up), place face-down.',
    inputs: [
      {
        id: 'tensionsSum',
        kind: 'int',
        label: 'Sum of all revealed Russia Tensions counters',
        min: 0,
        help: 'Flip all Tensions counters face-up and add their printed values.',
      },
      {
        id: 'tensionsCount',
        kind: 'int',
        label: 'Total number of Tensions counters on Russia (before removal)',
        min: 0,
        help: 'Used to calculate how many to redraw (half, rounded up).',
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const posture = Number(ctx.sharedState['posture'] ?? 1);
        const sum = Number(ctx.inputs.tensionsSum);
        const count = Number(ctx.inputs.tensionsCount);
        const soe = Number(ctx.sharedState['soe'] ?? 4);
        const currentRelation = (ctx.sharedState['usRelation'] as USRelation | undefined) ?? DEFAULT_US_RELATION;
        const relations = currentRelation.level;
        const outcomes: Outcome[] = [];

        // Posture change
        let newPosture = posture;
        let postureNote = '';

        if (posture === 1) {
          if (sum >= 5 && relations <= 2) {
            newPosture = 2;
            postureNote = `Tensions ≥ 5 and Relations ≤ 2 → Posture changes to 2.`;
          } else if (soe === 3) {
            newPosture = 2;
            postureNote = `"Look Over There!" impetus: Russia SoE = 3 → Posture changes to 2 (decrease Stability in a random Region by 1 box).`;
          } else {
            postureNote = `Posture stays at 1.`;
          }
        } else {
          if (sum <= 1 && relations >= 4) {
            newPosture = 1;
            postureNote = `Tensions ≤ 1 and Relations ≥ 4 → Posture changes back to 1.`;
          } else if (sum >= 10) {
            postureNote = `Tensions ≥ 10 → Increase BOTH Russia Conflict Tracks (Russia/NATO and Russia/US) by 1 box each.`;
          } else if (sum >= 5) {
            postureNote = `Tensions 5–9 → Increase one Conflict Track (not currently at War) by 1 box (randomly pick).`;
          } else {
            postureNote = `Posture stays at 2.`;
          }
        }

        outcomes.push({
          id: 'russia.B.posture',
          summary: postureNote,
          stateChanges: [{ label: 'Posture', from: String(posture), to: String(newPosture) }],
          mutations: [
            { kind: 'set', target: 'posture', amount: newPosture },
          ],
        });

        // Relations trending — accumulator model
        let newRelation: USRelation;
        let relationsNote: string;

        if (sum <= 1) {
          newRelation = applyTrendMarkers(currentRelation, 0, 1);
          relationsNote = `Sum ≤ 1 → +1 Pro-US marker.`;
        } else {
          const antiUSCount = Math.floor(sum / 5);
          if (antiUSCount > 0) {
            newRelation = applyTrendMarkers(currentRelation, antiUSCount, 0);
            relationsNote = `Sum = ${sum} → +${antiUSCount} Anti-US marker(s).`;
          } else {
            newRelation = currentRelation;
            relationsNote = `Sum ${sum} (< 5) — no Relations shift.`;
          }
        }

        if (newRelation.level !== currentRelation.level) {
          relationsNote += ` Level: ${US_RELATION_LABELS[currentRelation.level]} → ${US_RELATION_LABELS[newRelation.level]}.`;
        }
        if (newRelation.pendingAntiUS > 0 || newRelation.pendingProUS > 0) {
          const pending = newRelation.pendingAntiUS > 0
            ? `${newRelation.pendingAntiUS} Anti-US pending`
            : `${newRelation.pendingProUS} Pro-US pending`;
          relationsNote += ` (${pending})`;
        }

        outcomes.push({
          id: 'russia.B.relations',
          summary: relationsNote,
          stateChanges: newRelation.level !== currentRelation.level ? [
            { label: 'US Relations', from: US_RELATION_LABELS[currentRelation.level], to: US_RELATION_LABELS[newRelation.level] },
          ] : undefined,
          mutations: [
            { kind: 'set', target: 'usRelation', value: newRelation },
          ],
        });

        // Tensions reset
        const redrawn = Math.ceil(count / 2);
        outcomes.push({
          id: 'russia.B.tensions',
          summary: `Remove all ${count} Tensions counters. Redraw ${redrawn} (half rounded up) and place face-down on Russia.`,
        });

        return outcomes;
      },
    },
  },
];
