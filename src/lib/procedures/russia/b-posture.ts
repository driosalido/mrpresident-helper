import type { Step, Outcome } from '@/lib/procedures/types';

// Section B — Posture Changes & Relationship with US
// 1. Flip all Tensions counters on Russia, sum their values.
// 2. Apply posture change table.
// 3. Apply Relations-with-US trending.
// 4. Remove all Tensions; redraw half (rounded up), place number-side down.

export const stepsB: Step[] = [
  {
    id: 'russia.B',
    section: 'B',
    title: 'Posture Changes & Relationship with US',
    help: 'Flip all Tensions counters on Russia, sum their values, then resolve posture changes and relations shifts. Remove all Tensions; redraw half (round up), place face-down.',
    inputs: [
      {
        id: 'posture',
        kind: 'enum',
        label: 'Russia current Posture',
        options: [
          { value: '1', label: 'Posture 1 (passive)' },
          { value: '2', label: 'Posture 2 (aggressive)' },
        ],
      },
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
      {
        id: 'relationsBox',
        kind: 'enum',
        label: 'Russia/US Relations Track box',
        options: [
          { value: '1', label: '1 — Estranged' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5 — Very Close' },
        ],
      },
      {
        id: 'soe',
        kind: 'int',
        label: 'Russia State of the Economy (SoE)',
        min: 1,
        max: 7,
        help: 'Needed for "Look Over There!" impetus check (SoE = 3 triggers Posture 1 → 2).',
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const posture = Number(ctx.inputs.posture);
        const sum = Number(ctx.inputs.tensionsSum);
        const count = Number(ctx.inputs.tensionsCount);
        const relations = Number(ctx.inputs.relationsBox);
        const soe = Number(ctx.inputs.soe);
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
          // posture === 2
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
          summary: `Posture: ${posture} → ${newPosture}. ${postureNote}`,
          mutations: [
            { kind: 'set', target: 'posture', amount: newPosture },
            { kind: 'set', target: 'relationsBox', amount: relations },
            { kind: 'set', target: 'soe', amount: soe },
          ],
        });

        // Relations trending
        let relationsNote = '';
        if (sum <= 1) {
          relationsNote = `Sum ≤ 1 → Place 1 "Trending Pro-US" counter on Russia Relations Track.`;
        } else {
          const antiUSCounters = Math.floor(sum / 5);
          if (antiUSCounters > 0) {
            relationsNote = `Sum = ${sum} → Place ${antiUSCounters} "Trending Anti-US" counter(s) on Russia Relations Track. (Every 2 Trending Anti-US counters = −1 box on the Relations Track.)`;
          } else {
            relationsNote = `Sum ${sum} (< 5) — No Relations shift.`;
          }
        }

        outcomes.push({
          id: 'russia.B.relations',
          summary: relationsNote,
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
