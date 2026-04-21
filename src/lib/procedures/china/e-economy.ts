import type { Step } from '@/lib/procedures/types';
import type { USRelation } from '@/lib/procedures/usRelation';

// Section E — Improve Economy (China)
// DRMs differ from Russia: influences in A/P, C/SA, ME, Africa; Relations −1 if 4, −2 if 5.
// Success range 1–5 (vs Russia's 1–4); No change 6–8; Worsen 9+.
// Two-step trending: Improving/Worsening markers must accumulate twice to move the SoE counter.

export const stepsE: Step[] = [
  {
    id: 'china.E',
    section: 'E',
    title: 'Improve Economy',
    help: 'Skip if China SoE = 7. Roll d10 with DRMs. 1–5 = Improving; 6–8 = no change; 9+ = Worsening (−1 action in F).',
    guard: (ctx) => Number(ctx.sharedState['soe'] ?? 5) < 7,
    inputs: [
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
        max: 10,
      },
      {
        id: 'influenceCSA',
        kind: 'int',
        label: 'China Influence in Central/South Asia (−1 DRM each)',
        min: 0,
        max: 10,
      },
      {
        id: 'influenceME',
        kind: 'int',
        label: 'China Influence in Middle East (−1 DRM each)',
        min: 0,
        max: 10,
      },
      {
        id: 'influenceAfrica',
        kind: 'int',
        label: 'China Influence in Africa (−1 DRM each)',
        min: 0,
        max: 10,
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
              const rel = ctx.sharedState['usRelation'] as USRelation | undefined;
              const r = rel?.level ?? 3;
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
        const soe = Number(ctx.sharedState['soe'] ?? 5);
        if (soe >= 7) {
          return { id: 'china.E.maxed', summary: 'China SoE = 7 — skip this section.' };
        }

        const soeTrend = String(ctx.sharedState['soeTrend'] ?? 'none');
        const m = ctx.dice['ecoRoll'].modified;

        if (m <= 5) {
          if (soeTrend === 'improving') {
            const newSoe = Math.min(7, soe + 1);
            return {
              id: 'china.E.improving',
              summary: 'Improving marker already present — SoE moves up. Remove marker.',
              stateChanges: [{ label: 'SoE', from: String(soe), to: String(newSoe) }],
              mutations: [
                { kind: 'set', target: 'soe', amount: newSoe },
                { kind: 'set', target: 'soeTrend', value: 'none' },
              ],
            };
          }
          if (soeTrend === 'worsening') {
            return {
              id: 'china.E.cancel',
              summary: 'Improving result cancels existing Worsening marker. Remove Worsening marker.',
              mutations: [{ kind: 'set', target: 'soeTrend', value: 'none' }],
            };
          }
          return {
            id: 'china.E.improving',
            summary: 'Place "Improving Economy" marker on China SoE Track.',
            mutations: [{ kind: 'set', target: 'soeTrend', value: 'improving' }],
          };
        }

        if (m <= 8) {
          return { id: 'china.E.nochange', summary: 'No change to China SoE.' };
        }

        if (soeTrend === 'worsening') {
          const newSoe = Math.max(3, soe - 1);
          return {
            id: 'china.E.worsening',
            summary: 'Worsening marker already present — SoE moves down. Remove marker. Subtract 1 from China Actions in Section F.',
            stateChanges: [{ label: 'SoE', from: String(soe), to: String(newSoe) }],
            mutations: [
              { kind: 'set', target: 'soe', amount: newSoe },
              { kind: 'set', target: 'soeTrend', value: 'none' },
              { kind: 'set', target: 'worseningEconomy', amount: 1 },
            ],
          };
        }
        if (soeTrend === 'improving') {
          return {
            id: 'china.E.cancel',
            summary: 'Worsening result cancels existing Improving marker. Remove Improving marker.',
            mutations: [{ kind: 'set', target: 'soeTrend', value: 'none' }],
          };
        }
        return {
          id: 'china.E.worsening',
          summary: 'Place "Worsening Economy" marker on China SoE Track. Subtract 1 from China Actions in Section F.',
          mutations: [
            { kind: 'set', target: 'soeTrend', value: 'worsening' },
            { kind: 'set', target: 'worseningEconomy', amount: 1 },
          ],
        };
      },
    },
  },
];
