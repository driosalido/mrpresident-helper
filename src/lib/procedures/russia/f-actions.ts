import type { Step } from '@/lib/procedures/types';

// Section F — Calculate Number of Russia Actions
// base = SoE + relations-box-bottom-modifier + AP counters − economy-worsening penalty

// Relations-box bottom modifiers (printed on the track)
const relationsModifier: Record<number, number> = {
  1: -2,
  2: -1,
  3: 0,
  4: 1,
  5: 2,
};

export const stepsF: Step[] = [
  {
    id: 'russia.F',
    section: 'F',
    title: 'Calculate Number of Russia Actions',
    help: 'Actions = SoE + Relations-box modifier + AP counters − 1 (if economy worsened in E). Minimum 0.',
    inputs: [
      {
        id: 'plusAPCounters',
        kind: 'int',
        label: '+1 AP counters on Russia',
        min: 0,
      },
      {
        id: 'minusAPCounters',
        kind: 'int',
        label: '−1 AP counters on Russia',
        min: 0,
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const soe = Number(ctx.sharedState['soe'] ?? 4);
        const relMod = relationsModifier[Number(ctx.sharedState['relationsBox'] ?? 3)] ?? 0;
        const plus = Number(ctx.inputs.plusAPCounters);
        const minus = Number(ctx.inputs.minusAPCounters);
        const worsened = ctx.sharedState['worseningEconomy'] === 1 ? 1 : 0;

        const total = Math.max(0, soe + relMod + plus - minus - worsened);

        return {
          id: 'russia.F.actions',
          summary: `Russia Actions this turn: ${total}`,
          detail: `SoE(${soe}) + Relations modifier(${relMod}) + AP(+${plus}/−${minus}) − worsening(${worsened}) = ${total}`,
          mutations: [{ kind: 'set', target: 'actionBudget', amount: total }],
        };
      },
    },
  },
];
