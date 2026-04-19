import type { Step } from '@/lib/procedures/types';
import {
  US_RELATION_LABELS,
  DEFAULT_US_RELATION,
  applyTrendMarkers,
  type USRelation,
} from '@/lib/procedures/usRelation';

// Section B — Posture Changes & Relationship with US (China)
// Same mechanic as Russia, but "Look Over There!" impetus triggers at SoE 3 or 4 (Russia = 3 only).

export const stepsB: Step[] = [
  {
    id: 'china.B',
    section: 'B',
    title: 'Posture Changes & Relationship with US',
    help: 'Flip all Tensions counters on China, sum their values, then resolve posture changes and relations shifts. Remove all Tensions; redraw half (round up), place face-down.',
    inputs: [
      {
        id: 'posture',
        kind: 'enum',
        label: 'China current Posture',
        options: [
          { value: '1', label: 'Posture 1 (passive)' },
          { value: '2', label: 'Posture 2 (aggressive)' },
        ],
      },
      {
        id: 'tensionsSum',
        kind: 'int',
        label: 'Sum of all revealed China Tensions counters',
        min: 0,
        help: 'Flip all Tensions counters face-up and add their printed values.',
      },
      {
        id: 'tensionsCount',
        kind: 'int',
        label: 'Total number of Tensions counters on China (before removal)',
        min: 0,
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const posture = Number(ctx.inputs.posture);
        const sum = Number(ctx.inputs.tensionsSum);
        const count = Number(ctx.inputs.tensionsCount);
        const soe = Number(ctx.sharedState['soe'] ?? 5);
        const currentRelation = (ctx.sharedState['usRelation'] as USRelation | undefined) ?? DEFAULT_US_RELATION;
        const relations = currentRelation.level;
        const outcomes = [];

        let newPosture = posture;
        let postureNote = '';

        if (posture === 1) {
          if (sum >= 5 && relations <= 2) {
            newPosture = 2;
            postureNote = 'Tensions ≥ 5 and Relations ≤ 2 → Posture changes to 2.';
          } else if (soe === 3 || soe === 4) {
            newPosture = 2;
            postureNote = '"Look Over There!" impetus: China SoE = 3 or 4 → Posture changes to 2 (decrease Stability in a random Region by 1 box).';
          } else {
            postureNote = 'Posture stays at 1.';
          }
        } else {
          if (sum <= 1 && relations >= 4) {
            newPosture = 1;
            postureNote = 'Tensions ≤ 1 and Relations ≥ 4 → Posture changes back to 1.';
          } else if (sum >= 10) {
            postureNote = 'Tensions ≥ 10 → Increase BOTH China Conflict Tracks (China/Japan and China/India) by 1 box each.';
          } else if (sum >= 5) {
            postureNote = 'Tensions 5–9 → Increase one Conflict Track (not currently at War) by 1 box (randomly pick).';
          } else {
            postureNote = 'Posture stays at 2.';
          }
        }

        outcomes.push({
          id: 'china.B.posture',
          summary: `Posture: ${posture} → ${newPosture}. ${postureNote}`,
          mutations: [
            { kind: 'set' as const, target: 'posture', amount: newPosture },
          ],
        });

        // Relations trending — accumulator model
        let newRelation: USRelation;
        let relationsNote: string;

        if (sum <= 1) {
          newRelation = applyTrendMarkers(currentRelation, 0, 1);
          relationsNote = 'Sum ≤ 1 → +1 Pro-US marker.';
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
          id: 'china.B.relations',
          summary: relationsNote,
          mutations: [
            { kind: 'set' as const, target: 'usRelation', value: newRelation },
          ],
        });

        const redrawn = Math.ceil(count / 2);
        outcomes.push({
          id: 'china.B.tensions',
          summary: `Remove all ${count} Tensions counters. Redraw ${redrawn} (half rounded up) and place face-down on China.`,
        });

        return outcomes;
      },
    },
  },
];
