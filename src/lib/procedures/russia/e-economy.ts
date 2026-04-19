import type { Step } from '@/lib/procedures/types';

// Section E — Improve Economy
// Skip if Russia SoE = 7. Roll d10 with DRMs.
// DRMs: +1 Unilateral Sanctions, +3 Multilateral, -1 per Influence in Eurozone/EE/C.S.Asia, -1 if Relations = 5.

export const stepsE: Step[] = [
  {
    id: 'russia.E',
    section: 'E',
    title: 'Improve Economy',
    help: 'Skip if Russia SoE = 7. Roll d10 with DRMs. 1–4 = Improving Economy; 5–8 = no change; 9+ = Worsening Economy (−1 action in F).',
    guard: (ctx) => Number(ctx.sharedState['soe'] ?? 4) < 7,
    inputs: [
      {
        id: 'unilateralSanctions',
        kind: 'bool',
        label: 'Unilateral Sanctions on Russia? (+1 DRM)',
      },
      {
        id: 'multilateralSanctions',
        kind: 'bool',
        label: 'Multilateral Sanctions on Russia? (+3 DRM)',
      },
      {
        id: 'influenceInEurozone',
        kind: 'int',
        label: 'Russia Influence in Eurozone (−1 DRM each)',
        min: 0,
      },
      {
        id: 'influenceInEE',
        kind: 'int',
        label: 'Russia Influence in Eastern Europe (−1 DRM each)',
        min: 0,
      },
      {
        id: 'influenceInCSAsia',
        kind: 'int',
        label: 'Russia Influence in Central/South Asia (−1 DRM each)',
        min: 0,
      },
    ],
    dice: [
      {
        id: 'ecoRoll',
        kind: 'd10',
        label: 'Economy improvement roll',
        drms: [
          {
            label: 'Unilateral Sanctions',
            value: (ctx) =>
              ctx.inputs.unilateralSanctions === true || ctx.inputs.unilateralSanctions === 'true' ? 1 : 0,
          },
          {
            label: 'Multilateral Sanctions',
            value: (ctx) =>
              ctx.inputs.multilateralSanctions === true || ctx.inputs.multilateralSanctions === 'true' ? 3 : 0,
          },
          {
            label: 'Influence in Eurozone (−1 each)',
            value: (ctx) => -Number(ctx.inputs.influenceInEurozone),
          },
          {
            label: 'Influence in Eastern Europe (−1 each)',
            value: (ctx) => -Number(ctx.inputs.influenceInEE),
          },
          {
            label: 'Influence in C/S Asia (−1 each)',
            value: (ctx) => -Number(ctx.inputs.influenceInCSAsia),
          },
          {
            label: 'Relations = 5 (−1)',
            value: (ctx) => (Number(ctx.sharedState['relationsBox'] ?? 3) === 5 ? -1 : 0),
          },
        ],
        cap: { min: -3, max: 3 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const soe = Number(ctx.sharedState['soe'] ?? 4);
        if (soe >= 7) {
          return { id: 'russia.E.maxed', summary: 'Russia SoE = 7 — skip this section.' };
        }

        const roll = ctx.dice['ecoRoll'];
        const m = roll.modified;

        if (m <= 4) {
          return {
            id: 'russia.E.improving',
            summary: 'Place "Improving Economy" counter on Russia SoE Track.',
            mutations: [{ kind: 'place', target: 'Improving Economy (Russia SoE)' }],
          };
        }
        if (m <= 8) {
          return { id: 'russia.E.nochange', summary: 'No change to Russia SoE.' };
        }
        return {
          id: 'russia.E.worsening',
          summary: 'Place "Worsening Economy" counter on Russia SoE Track. Subtract 1 from Russia Actions in Section F.',
          mutations: [
            { kind: 'place', target: 'Worsening Economy (Russia SoE)' },
            { kind: 'set', target: 'worseningEconomy', amount: 1 },
          ],
        };
      },
    },
  },
];
