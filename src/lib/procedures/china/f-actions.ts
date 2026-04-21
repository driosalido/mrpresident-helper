import type { Step } from '@/lib/procedures/types';
import type { USRelation } from '@/lib/procedures/usRelation';

// Section F — Calculate Number of China Actions (SoE + 1 base, then modifiers)

const relationsModifier: Record<number, number> = {
  1: -2, 2: -1, 3: 0, 4: 1, 5: 2,
};

export const stepsF: Step[] = [
  {
    id: 'china.F',
    section: 'F',
    title: 'Calculate Number of China Actions',
    help: 'Actions = SoE + 1 + Relations-box modifier + AP counters − 1 (if economy worsened in E). Minimum 0.',
    inputs: [
      {
        id: 'plusAPCounters',
        kind: 'int',
        label: '+1 AP counters on China',
        min: 0,
        max: 5,
      },
      {
        id: 'minusAPCounters',
        kind: 'int',
        label: '−1 AP counters on China',
        min: 0,
        max: 5,
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const soe = Number(ctx.sharedState['soe'] ?? 4);
        const rel = ctx.sharedState['usRelation'] as USRelation | undefined;
        const relLevel = rel?.level ?? 3;
        const relMod = relationsModifier[relLevel] ?? 0;
        const plus = Number(ctx.inputs.plusAPCounters);
        const minus = Number(ctx.inputs.minusAPCounters);
        const worsened = ctx.sharedState['worseningEconomy'] === 1 ? 1 : 0;
        const total = Math.max(0, soe + 1 + relMod + plus - minus - worsened);
        return {
          id: 'china.F.actions',
          summary: `China Actions this turn: ${total}`,
          detail: `SoE(${soe}) +1 base + Relations(${relMod}) + AP(+${plus}/−${minus}) − worsening(${worsened}) = ${total}`,
          stateChanges: [{ label: 'Action Budget', from: '—', to: String(total) }],
          mutations: [
            { kind: 'set', target: 'actionBudget', amount: total },
            { kind: 'set', target: 'totalActions', value: total },
          ],
        };
      },
    },
  },
];
