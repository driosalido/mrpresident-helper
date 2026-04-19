import type { Step } from '@/lib/procedures/types';

// Section A — Auto-Victory Check (China)
// China wins (US auto-loses) if total China Influence on the map ≥ 15.

export const stepsA: Step[] = [
  {
    id: 'china.A',
    section: 'A',
    title: 'Auto-Victory Check',
    help: 'China wins (US auto-loses) if total China Influence on the map ≥ 15.',
    inputs: [
      {
        id: 'totalInfluence',
        kind: 'int',
        label: 'Total China Influence on the map',
        min: 0,
        max: 40,
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const influence = Number(ctx.inputs.totalInfluence);
        if (influence >= 15) {
          return {
            id: 'china.A.autoloss',
            summary: '⚠ CHINA AUTO-VICTORY — Game Over (US loses). China has ≥ 15 Influence on the map.',
            mutations: [{ kind: 'autoLoss' }],
          };
        }
        return {
          id: 'china.A.ok',
          summary: `No auto-victory — China Influence = ${influence} (need ≥ 15). Continue.`,
        };
      },
    },
  },
];
