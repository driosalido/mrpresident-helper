import type { Step } from '@/lib/procedures/types';

// Section G — Dependent Actions (China)
// G1: Terror in C/S Asia (identical to Russia)
// G2: Quell Rising Internal Dissent (−1 DRM if SoE ≥ 6)
// G3: Reinforcements (identical to Russia)
// G4: Remove/Reduce Sanctions on China
// G5: Extra War Progress Roll

export const stepsG: Step[] = [
  // ── G1 ────────────────────────────────────────────────────────────────────
  {
    id: 'china.G1',
    section: 'G',
    title: 'G1 — Terror in Central/South Asia',
    help: 'If total Terror Group levels in C/S Asia ≥ 5, spend 1 China Action to remove one Terror Level from the largest group.',
    inputs: [
      {
        id: 'terrorTotal',
        kind: 'int',
        label: 'Total Terror Group levels in Central/South Asia',
        min: 0,
        max: 20,
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const total = Number(ctx.inputs.terrorTotal);
        if (total >= 5) {
          return {
            id: 'china.G1.act',
            summary: 'Terror total ≥ 5 — China spends 1 Action to remove 1 Terror Level from the largest group in C/S Asia.',
            mutations: [
              { kind: 'consumeAction' },
              { kind: 'remove', target: '1 Terror Level from largest group in C/S Asia' },
            ],
          };
        }
        return {
          id: 'china.G1.skip',
          summary: `Terror total = ${total} (< 5) — G1 does not trigger.`,
          consumesAction: false,
        };
      },
    },
  },

  // ── G2 ────────────────────────────────────────────────────────────────────
  {
    id: 'china.G2',
    section: 'G',
    title: 'G2 — Quell Rising Internal Dissent',
    help: 'Roll d10 (+1 if Posture 2, −1 if SoE ≥ 6). 1–4 = spend 1 Action, no effect. 5+ = no cost.',
    inputs: [],
    dice: [
      {
        id: 'dissentRoll',
        kind: 'd10',
        label: 'Dissent roll',
        drms: [
          { label: 'Posture 2 (+1)', value: (ctx) => (String(ctx.sharedState['posture'] ?? '1') === '2' ? 1 : 0) },
          { label: 'SoE ≥ 6 (−1)', value: (ctx) => (Number(ctx.sharedState['soe'] ?? 4) >= 6 ? -1 : 0) },
        ],
        cap: { min: -1, max: 3 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const m = ctx.dice['dissentRoll'].modified;
        if (m <= 4) {
          return {
            id: 'china.G2.cost',
            summary: 'Internal dissent flares — no game effect. (No Action cost.)',
            consumesAction: false,
          };
        }
        return { id: 'china.G2.fine', summary: 'Dissent suppressed — no action cost.', consumesAction: false };
      },
    },
  },

  // ── G3 ────────────────────────────────────────────────────────────────────
  {
    id: 'china.G3',
    section: 'G',
    title: 'G3 — Reinforcements',
    help: 'If China is at War, spend 1 Action and roll for reinforcement strength.',
    inputs: [
      { id: 'chinaAtWar', kind: 'bool', label: 'Is China currently at War?' },
    ],
    dice: [{ id: 'reinforce', kind: 'd10', label: 'Reinforcement roll' }],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const atWar = ctx.inputs.chinaAtWar === true || ctx.inputs.chinaAtWar === 'true';
        if (!atWar) {
          return { id: 'china.G3.skip', summary: 'China is not at War — G3 skipped.', consumesAction: false };
        }
        const m = ctx.dice['reinforce'].modified;
        if (m <= 3) {
          return {
            id: 'china.G3.plus2',
            summary: 'China spends 1 Action — +2 Strength Points to a random China War.',
            mutations: [{ kind: 'consumeAction' }, { kind: 'shift', target: 'China War Strength', amount: 2 }],
          };
        }
        if (m <= 8) {
          return {
            id: 'china.G3.plus1',
            summary: 'China spends 1 Action — +1 Strength Point to a random China War.',
            mutations: [{ kind: 'consumeAction' }, { kind: 'shift', target: 'China War Strength', amount: 1 }],
          };
        }
        return {
          id: 'china.G3.delayed',
          summary: 'China spends 1 Action — reinforcements delayed, no strength added.',
          mutations: [{ kind: 'consumeAction' }],
        };
      },
    },
  },

  // ── G4 ────────────────────────────────────────────────────────────────────
  {
    id: 'china.G4',
    section: 'G',
    title: 'G4 — Remove / Reduce Sanctions on China',
    help: 'Free removal if Relations 4–5 OR ≥6 of 8 regions have ≥1 China Influence. Otherwise costs 1 (Relations 2–3) or 2 (Relations 1) Actions.',
    inputs: [
      { id: 'sanctionsExist', kind: 'bool', label: 'Are there Sanctions counters on China?' },
      { id: 'regionsWithInfluence', kind: 'int', label: 'Number of world regions (out of 8) with at least 1 China Influence', min: 0, max: 8 },
      { id: 'hasMultilateral', kind: 'bool', label: 'Is there a Multilateral Sanctions counter on China?' },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (!(ctx.inputs.sanctionsExist === true || ctx.inputs.sanctionsExist === 'true')) {
          return { id: 'china.G4.none', summary: 'No Sanctions on China — G4 skipped.', consumesAction: false };
        }
        const relations = Number(ctx.sharedState['relationsBox'] ?? 3);
        const regions = Number(ctx.inputs.regionsWithInfluence);
        const multilateral = ctx.inputs.hasMultilateral === true || ctx.inputs.hasMultilateral === 'true';

        if (relations >= 4 || regions >= 6) {
          return {
            id: 'china.G4.free',
            summary: 'Remove all Sanctions on China — no Action cost (Relations 4–5 or ≥6 regions with influence).',
            mutations: [{ kind: 'remove', target: 'all Sanctions counters (China)' }],
            consumesAction: false,
          };
        }

        const actions = relations <= 1 ? 2 : 1;
        const effect = multilateral
          ? 'Remove any Unilateral Sanctions; replace Multilateral with Unilateral.'
          : 'Remove any Unilateral Sanctions.';

        return {
          id: 'china.G4.partial',
          summary: `China spends ${actions} Action(s) — ${effect} Then: place "Worsening Economy" on both China and US SoE Tracks.`,
          mutations: [
            { kind: 'consumeAction' },
            ...(actions > 1 ? [{ kind: 'consumeAction' as const }] : []),
            { kind: 'note', note: effect },
            { kind: 'place', target: 'Worsening Economy (China SoE)' },
            { kind: 'place', target: 'Worsening Economy (US SoE)' },
          ],
        };
      },
    },
  },

  // ── G5 ────────────────────────────────────────────────────────────────────
  {
    id: 'china.G5',
    section: 'G',
    title: 'G5 — Extra War Progress Roll',
    help: 'If China is at War, make a China SoE Check (D18). If pass, spend 1 Action for an immediate War Progress roll for a random China War.',
    inputs: [
      { id: 'chinaAtWar', kind: 'bool', label: 'Is China currently at War?' },
    ],
    dice: [
      { id: 'd18a', kind: 'd10', label: 'D18 die 1' },
      { id: 'd18b', kind: 'd10', label: 'D18 die 2' },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const atWar = ctx.inputs.chinaAtWar === true || ctx.inputs.chinaAtWar === 'true';
        if (!atWar) {
          return { id: 'china.G5.notwar', summary: 'China not at War — G5 skipped.', consumesAction: false };
        }

        const die1 = ctx.dice['d18a'].sum;
        const die2 = ctx.dice['d18b'].sum;
        const total = die1 + die2;
        const soe = Number(ctx.sharedState['soe'] ?? 4);

        // D18 SoE Check: pass if total ≤ SoE (exact rules in Governing Manual; standard interpretation)
        const pass = total <= soe;

        if (pass) {
          return {
            id: 'china.G5.pass',
            summary: `SoE Check passed (${die1}+${die2}=${total} ≤ SoE ${soe}) — China spends 1 Action for an immediate War Progress roll for a random China War. Resolve per WM5.`,
            mutations: [
              { kind: 'consumeAction' },
              { kind: 'note', note: 'Make War Progress roll for a random China War (WM5).' },
            ],
          };
        }

        return {
          id: 'china.G5.fail',
          summary: `SoE Check failed (${die1}+${die2}=${total} > SoE ${soe}) — no extra War Progress roll.`,
          consumesAction: false,
        };
      },
    },
  },
];
