import type { Step } from '@/lib/procedures/types';

// Section E — Improve Economy (China)
// DRMs differ from Russia: influences in A/P, C/SA, ME, Africa; Relations −1 if 4, −2 if 5.
// Success range 1–5 (vs Russia's 1–4); No change 6–8; Worsen 9+.

export const stepsE: Step[] = [
  {
    id: 'china.E',
    section: 'E',
    title: 'Improve Economy',
    help: 'Skip if China SoE = 7. Roll d10 with DRMs. 1–5 = Improving; 6–8 = no change; 9+ = Worsening (−1 action in F).',
    inputs: [
      {
        id: 'currentSoE',
        kind: 'int',
        label: 'China SoE (skip if 7)',
        min: 1,
        max: 7,
      },
      {
        id: 'unilateralSanctions',
        kind: 'bool',
        label: 'Unilateral Sanctions on China? (+1 DRM)',
      },
      {
        id: 'multilateralSanctions',
        kind: 'bool',
        label: 'Multilateral Sanctions on China? (+2 DRM)',
      },
      {
        id: 'influenceAP',
        kind: 'int',
        label: 'China Influence in Asia/Pacific (−1 DRM each)',
        min: 0,
      },
      {
        id: 'influenceCSA',
        kind: 'int',
        label: 'China Influence in Central/South Asia (−1 DRM each)',
        min: 0,
      },
      {
        id: 'influenceME',
        kind: 'int',
        label: 'China Influence in Middle East (−1 DRM each)',
        min: 0,
      },
      {
        id: 'influenceAfrica',
        kind: 'int',
        label: 'China Influence in Africa (−1 DRM each)',
        min: 0,
      },
      {
        id: 'relationsBox',
        kind: 'int',
        label: 'China/US Relations box (−1 if 4, −2 if 5)',
        min: 1,
        max: 5,
      },
    ],
    dice: [
      {
        id: 'ecoRoll',
        kind: 'd10',
        label: 'Economy improvement roll',
        drms: [
          { label: 'Unilateral Sanctions (+1)', value: (ctx) => (ctx.inputs.unilateralSanctions === true || ctx.inputs.unilateralSanctions === 'true' ? 1 : 0) },
          { label: 'Multilateral Sanctions (+2)', value: (ctx) => (ctx.inputs.multilateralSanctions === true || ctx.inputs.multilateralSanctions === 'true' ? 2 : 0) },
          { label: 'Influence A/P (−1 each)', value: (ctx) => -Number(ctx.inputs.influenceAP) },
          { label: 'Influence C/SA (−1 each)', value: (ctx) => -Number(ctx.inputs.influenceCSA) },
          { label: 'Influence ME (−1 each)', value: (ctx) => -Number(ctx.inputs.influenceME) },
          { label: 'Influence Africa (−1 each)', value: (ctx) => -Number(ctx.inputs.influenceAfrica) },
          {
            label: 'Relations 4 (−1) or 5 (−2)',
            value: (ctx) => {
              const r = Number(ctx.inputs.relationsBox);
              return r === 4 ? -1 : r === 5 ? -2 : 0;
            },
          },
        ],
        cap: { min: -3, max: 3 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (Number(ctx.inputs.currentSoE) >= 7) {
          return { id: 'china.E.maxed', summary: 'China SoE = 7 — skip this section.' };
        }
        const m = ctx.dice['ecoRoll'].modified;
        if (m <= 5) {
          return {
            id: 'china.E.improving',
            summary: 'Place "Improving Economy" counter on China SoE Track.',
            mutations: [{ kind: 'place', target: 'Improving Economy (China SoE)' }],
          };
        }
        if (m <= 8) {
          return { id: 'china.E.nochange', summary: 'No change to China SoE.' };
        }
        return {
          id: 'china.E.worsening',
          summary: 'Place "Worsening Economy" on China SoE. Subtract 1 from China Actions in Section F.',
          mutations: [
            { kind: 'place', target: 'Worsening Economy (China SoE)' },
            { kind: 'set', target: 'worseningEconomy', amount: 1 },
          ],
        };
      },
    },
  },
];
