import type { Step } from '@/lib/procedures/types';

// Section F — Calculate Number of China Actions (same formula as Russia)

const relationsModifier: Record<number, number> = {
  1: -2, 2: -1, 3: 0, 4: 1, 5: 2,
};

export const stepsF: Step[] = [
  {
    id: 'china.F',
    section: 'F',
    title: 'Calculate Number of China Actions',
    help: 'Actions = SoE + Relations-box modifier + AP counters − 1 (if economy worsened in E). Minimum 0.',
    inputs: [
      {
        id: 'soe',
        kind: 'int',
        label: 'China SoE value',
        min: 1,
        max: 7,
      },
      {
        id: 'relationsBox',
        kind: 'int',
        label: 'China/US Relations Track box (1–5)',
        min: 1,
        max: 5,
        help: 'Box 1=−2, 2=−1, 3=0, 4=+1, 5=+2',
      },
      {
        id: 'plusAPCounters',
        kind: 'int',
        label: '+1 AP counters on China',
        min: 0,
      },
      {
        id: 'minusAPCounters',
        kind: 'int',
        label: '−1 AP counters on China',
        min: 0,
      },
      {
        id: 'economyWorsened',
        kind: 'bool',
        label: 'Did Section E produce "Worsening Economy"? (−1 action)',
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const soe = Number(ctx.inputs.soe);
        const relMod = relationsModifier[Number(ctx.inputs.relationsBox)] ?? 0;
        const plus = Number(ctx.inputs.plusAPCounters);
        const minus = Number(ctx.inputs.minusAPCounters);
        const worsened = ctx.inputs.economyWorsened === true || ctx.inputs.economyWorsened === 'true' ? 1 : 0;
        const total = Math.max(0, soe + relMod + plus - minus - worsened);
        return {
          id: 'china.F.actions',
          summary: `China Actions this turn: ${total}`,
          detail: `SoE(${soe}) + Relations(${relMod}) + AP(+${plus}/−${minus}) − worsening(${worsened}) = ${total}`,
          mutations: [{ kind: 'set', target: 'actionBudget', amount: total }],
        };
      },
    },
  },
];
