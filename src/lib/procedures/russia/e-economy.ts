import type { Step, SoESnapshot } from '@/lib/procedures/types';
import type { USRelation } from '@/lib/procedures/usRelation';

// Section E — Improve Economy
// Skip if Russia SoE = 7. Roll d10 with DRMs.
// DRMs: +1 Unilateral Sanctions, +3 Multilateral, -1 per Influence in Eurozone/EE/C.S.Asia, -1 if Relations = 5.
// Two-step trending: Improving/Worsening markers must accumulate twice to move the SoE counter.

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
        max: 10,
      },
      {
        id: 'influenceInEE',
        kind: 'int',
        label: 'Russia Influence in Eastern Europe (−1 DRM each)',
        min: 0,
        max: 10,
      },
      {
        id: 'influenceInCSAsia',
        kind: 'int',
        label: 'Russia Influence in Central/South Asia (−1 DRM each)',
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
          { label: 'Influence in Eurozone (−1 each)', value: (ctx) => -Number(ctx.inputs.influenceInEurozone) },
          { label: 'Influence in Eastern Europe (−1 each)', value: (ctx) => -Number(ctx.inputs.influenceInEE) },
          { label: 'Influence in C/S Asia (−1 each)', value: (ctx) => -Number(ctx.inputs.influenceInCSAsia) },
          {
            label: 'Relations = 5 (−1)',
            value: (ctx) => {
              const rel = ctx.sharedState['usRelation'] as USRelation | undefined;
              return (rel?.level ?? 3) === 5 ? -1 : 0;
            },
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

        const soeTrend = String(ctx.sharedState['soeTrend'] ?? 'none');
        const roll = ctx.dice['ecoRoll'];
        const m = roll.modified;

        const beforeSnap: SoESnapshot = { value: soe, trend: soeTrend as SoESnapshot['trend'] };

        if (m <= 4) {
          if (soeTrend === 'improving') {
            const newSoe = Math.min(7, soe + 1);
            return {
              id: 'russia.E.improving',
              summary: 'Improving marker already present — SoE moves up. Remove marker.',
              stateChanges: [
                { label: 'SoE Trend', from: 'improving', to: 'none', removed: true },
                { label: 'SoE', from: String(soe), to: String(newSoe) },
              ],
              soeSnapshot: { before: beforeSnap, after: { value: newSoe, trend: 'none' } },
              mutations: [
                { kind: 'set', target: 'soe', amount: newSoe },
                { kind: 'set', target: 'soeTrend', value: 'none' },
              ],
            };
          }
          if (soeTrend === 'worsening') {
            return {
              id: 'russia.E.cancel',
              summary: 'Improving result cancels existing Worsening marker. Remove Worsening marker.',
              stateChanges: [{ label: 'SoE Trend', from: 'worsening', to: 'none', removed: true }],
              soeSnapshot: { before: beforeSnap, after: { value: soe, trend: 'none' } },
              mutations: [{ kind: 'set', target: 'soeTrend', value: 'none' }],
            };
          }
          return {
            id: 'russia.E.improving',
            summary: 'Place "Improving Economy" marker on Russia SoE Track.',
            stateChanges: [{ label: 'SoE Trend', from: 'none', to: 'improving' }],
            soeSnapshot: { before: beforeSnap, after: { value: soe, trend: 'improving' } },
            mutations: [{ kind: 'set', target: 'soeTrend', value: 'improving' }],
          };
        }

        if (m <= 8) {
          return { id: 'russia.E.nochange', summary: 'No change to Russia SoE.' };
        }

        if (soeTrend === 'worsening') {
          const newSoe = Math.max(3, soe - 1);
          return {
            id: 'russia.E.worsening',
            summary: 'Worsening marker already present — SoE moves down. Remove marker. Subtract 1 from Russia Actions in Section F.',
            stateChanges: [
              { label: 'SoE Trend', from: 'worsening', to: 'none', removed: true },
              { label: 'SoE', from: String(soe), to: String(newSoe) },
            ],
            soeSnapshot: { before: beforeSnap, after: { value: newSoe, trend: 'none' } },
            mutations: [
              { kind: 'set', target: 'soe', amount: newSoe },
              { kind: 'set', target: 'soeTrend', value: 'none' },
              { kind: 'set', target: 'worseningEconomy', amount: 1 },
            ],
          };
        }
        if (soeTrend === 'improving') {
          return {
            id: 'russia.E.cancel',
            summary: 'Worsening result cancels existing Improving marker. Remove Improving marker.',
            stateChanges: [{ label: 'SoE Trend', from: 'improving', to: 'none', removed: true }],
            soeSnapshot: { before: beforeSnap, after: { value: soe, trend: 'none' } },
            mutations: [{ kind: 'set', target: 'soeTrend', value: 'none' }],
          };
        }
        return {
          id: 'russia.E.worsening',
          summary: 'Place "Worsening Economy" marker on Russia SoE Track. Subtract 1 from Russia Actions in Section F.',
          stateChanges: [{ label: 'SoE Trend', from: 'none', to: 'worsening' }],
          soeSnapshot: { before: beforeSnap, after: { value: soe, trend: 'worsening' } },
          mutations: [
            { kind: 'set', target: 'soeTrend', value: 'worsening' },
            { kind: 'set', target: 'worseningEconomy', amount: 1 },
          ],
        };
      },
    },
  },
];
