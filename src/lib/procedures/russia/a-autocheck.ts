import type { Step } from '@/lib/procedures/types';

// Section A — Auto-Victory Check
// Russia wins (US auto-loses) if ALL THREE:
// 1. Russia has a Base in Eastern Europe
// 2. Total Russia Influence on map ≥ 9
// 3. Either Eurozone Stability < 5 OR NATO/UK Ally Relations worse than "Very Close"

export const stepsA: Step[] = [
  {
    id: 'russia.A',
    section: 'A',
    title: 'Auto-Victory Check',
    help: 'Russia wins if: (1) Base in Eastern Europe, AND (2) total influence ≥ 9, AND (3) Eurozone Stability < 5 or NATO/UK relations are NOT Very Close.',
    inputs: [
      {
        id: 'baseInEE',
        kind: 'bool',
        label: 'Russia has a Base in Eastern Europe?',
      },
      {
        id: 'totalInfluence',
        kind: 'int',
        label: 'Total Russia Influence on the map',
        min: 0,
        max: 40,
      },
      {
        id: 'eurozoneStability',
        kind: 'int',
        label: 'Eurozone Stability',
        min: 1,
        max: 8,
      },
      {
        id: 'natoUKRelations',
        kind: 'enum',
        label: 'NATO & UK Relations with US',
        options: [
          { value: 'both_very_close', label: 'Both Very Close' },
          { value: 'one_degraded', label: 'One or both NOT Very Close' },
        ],
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const base = ctx.inputs.baseInEE === true || ctx.inputs.baseInEE === 'true';
        const influence = Number(ctx.inputs.totalInfluence);
        const stability = Number(ctx.inputs.eurozoneStability);
        const natoUK = String(ctx.inputs.natoUKRelations);

        const cond3 = stability < 5 || natoUK === 'one_degraded';

        if (base && influence >= 9 && cond3) {
          return {
            id: 'russia.A.autoloss',
            summary: '⚠ RUSSIA AUTO-VICTORY — Game Over (US loses).',
            detail: 'All three conditions are met: Base in Eastern Europe, ≥9 total influence, and Eurozone Stability < 5 or NATO/UK not Very Close.',
            mutations: [{ kind: 'autoLoss' }],
          };
        }

        return {
          id: 'russia.A.ok',
          summary: 'No auto-victory — continue.',
          detail: `Conditions: Base in EE=${base}, Influence=${influence} (need ≥9), cond3=${cond3}. Not all three met.`,
        };
      },
    },
  },
];
