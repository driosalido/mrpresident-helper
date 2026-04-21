import type { Step } from '@/lib/procedures/types';

// Section G — Dependent Actions (up to 5, performed in order if conditions met)
// G1: Terror in C/S Asia
// G2: Quell Rising Internal Dissent
// G3: Reinforcements
// G4: Possible Syrian Intervention
// G5: New Conflict in Eastern Europe or C/S Asia

export const stepsG: Step[] = [
  // ── G1 ────────────────────────────────────────────────────────────────────
  {
    id: 'russia.G1',
    section: 'G',
    title: 'G1 — Terror in Central/South Asia',
    help: 'If total Terror Group level in C/S Asia ≥ 5, spend 1 Russia Action to remove one Terror Level from the largest group.',
    inputs: [
      {
        id: 'terrorTotal',
        kind: 'int',
        label: 'Total Terror Group levels in Central/South Asia',
        min: 0,
        max: 20,
        help: 'Sum the levels of all terror groups in the region.',
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const total = Number(ctx.inputs.terrorTotal);
        if (total >= 5) {
          return {
            id: 'russia.G1.act',
            summary: 'Terror total ≥ 5 — Russia spends 1 Action to remove 1 Terror Level from the largest group in C/S Asia.',
            mutations: [
              { kind: 'consumeAction' },
              { kind: 'remove', target: '1 Terror Level from largest group in C/S Asia' },
            ],
          };
        }
        return {
          id: 'russia.G1.skip',
          summary: `Terror total = ${total} (< 5) — G1 does not trigger.`,
          mutations: [{ kind: 'note', note: 'No action spent.' }],
          consumesAction: false,
        };
      },
    },
  },

  // ── G2 ────────────────────────────────────────────────────────────────────
  {
    id: 'russia.G2',
    section: 'G',
    title: 'G2 — Quell Rising Internal Dissent',
    help: 'Roll d10 (+1 if Posture 2). 1–4 = spend 1 Action with no game effect. 5+ = no effect, no Action cost.',
    inputs: [],
    dice: [
      {
        id: 'dissentRoll',
        kind: 'd10',
        label: 'Dissent roll',
        drms: [
          {
            label: 'Posture 2',
            value: (ctx) => (String(ctx.sharedState['posture'] ?? '1') === '2' ? 1 : 0),
          },
        ],
        cap: { min: 0, max: 3 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const roll = ctx.dice['dissentRoll'];
        if (roll.modified <= 4) {
          return {
            id: 'russia.G2.cost',
            summary: 'Internal dissent flares — Russia spends 1 Action with no game effect.',
            mutations: [{ kind: 'consumeAction' as const }],
          };
        }
        return {
          id: 'russia.G2.fine',
          summary: 'Dissent suppressed — no action cost.',
          consumesAction: false,
        };
      },
    },
  },

  // ── G3 ────────────────────────────────────────────────────────────────────
  {
    id: 'russia.G3',
    section: 'G',
    title: 'G3 — Reinforcements',
    help: 'If Russia is at War, spend 1 Action and roll for reinforcement strength.',
    inputs: [
      {
        id: 'russiaAtWar',
        kind: 'bool',
        label: 'Is Russia currently at War?',
      },
    ],
    dice: (_ss, inputs) => {
      const atWar = inputs?.russiaAtWar === true || inputs?.russiaAtWar === 'true';
      return atWar ? [{ id: 'reinforce', kind: 'd10' as const, label: 'Reinforcement roll' }] : [];
    },
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const atWar =
          ctx.inputs.russiaAtWar === true || ctx.inputs.russiaAtWar === 'true';
        if (!atWar) {
          return {
            id: 'russia.G3.skip',
            summary: 'Russia is not at War — G3 skipped.',
            consumesAction: false,
          };
        }

        const roll = ctx.dice['reinforce'];
        const m = roll.modified;

        if (m <= 3) {
          return {
            id: 'russia.G3.plus2',
            summary: 'Russia spends 1 Action — +2 Strength Points to a random Russia War.',
            mutations: [
              { kind: 'consumeAction' },
              { kind: 'shift', target: 'Russia War Strength', amount: 2 },
            ],
          };
        }
        if (m <= 8) {
          return {
            id: 'russia.G3.plus1',
            summary: 'Russia spends 1 Action — +1 Strength Point to a random Russia War.',
            mutations: [
              { kind: 'consumeAction' },
              { kind: 'shift', target: 'Russia War Strength', amount: 1 },
            ],
          };
        }
        return {
          id: 'russia.G3.delayed',
          summary: 'Russia spends 1 Action — reinforcements delayed, no strength added.',
          mutations: [{ kind: 'consumeAction' }],
        };
      },
    },
  },

  // ── G4 ────────────────────────────────────────────────────────────────────
  {
    id: 'russia.G4',
    section: 'G',
    title: 'G4 — Possible Syrian Intervention',
    help: 'Skip if: new player OR Year 1 OR no Civil War markers in Middle East OR Russia has ≥3 Influence in ME OR US Regional Alignment in ME = 8.',
    inputs: [
      {
        id: 'eligible',
        kind: 'bool',
        label: 'Is G4 eligible? (Not Year 1, not new player, Civil War in ME, Russia < 3 ME Influence, US Alignment in ME ≠ 8)',
        help: 'Check all conditions. If any disqualify, answer No.',
      },
      {
        id: 'usAlignmentME',
        kind: 'enum',
        label: 'US Regional Alignment in Middle East',
        options: [
          { value: '3', label: '3' },
          { value: '4_5', label: '4 or 5' },
          { value: '6_7', label: '6 or 7' },
        ],
        help: 'Only needed if eligible = Yes.',
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const eligible =
          ctx.inputs.eligible === true || ctx.inputs.eligible === 'true';
        if (!eligible) {
          return {
            id: 'russia.G4.skip',
            summary: 'G4 conditions not met — Syrian Intervention skipped.',
            consumesAction: false,
          };
        }

        const alignment = String(ctx.inputs.usAlignmentME);
        switch (alignment) {
          case '3':
            return {
              id: 'russia.G4.heavy',
              summary: 'Russia intervenes heavily in Syria: +3 Russia Influence in Middle East. Russia/US Relations −2 boxes (worse).',
              mutations: [
                { kind: 'place', target: 'Russia Influence in Middle East', amount: 3 },
                { kind: 'shift', target: 'Russia/US Relations', amount: -2 },
              ],
            };
          case '4_5':
            return {
              id: 'russia.G4.moderate',
              summary: 'Russia intervenes in Syria: +2 Russia Influence in Middle East. Russia/US Relations −1 box (worse).',
              mutations: [
                { kind: 'place', target: 'Russia Influence in Middle East', amount: 2 },
                { kind: 'shift', target: 'Russia/US Relations', amount: -1 },
              ],
            };
          default: // 6_7
            return {
              id: 'russia.G4.light',
              summary: 'Russia makes limited Syria intervention: +1 Russia Influence in Middle East. Place "Trending Anti-US" on Russia/US Relations Track.',
              mutations: [
                { kind: 'place', target: 'Russia Influence in Middle East', amount: 1 },
                { kind: 'place', target: 'Trending Anti-US on Russia/US Relations' },
              ],
            };
        }
      },
    },
  },

  // ── G5 ────────────────────────────────────────────────────────────────────
  {
    id: 'russia.G5',
    section: 'G',
    title: 'G5 — New Conflict in Eastern Europe or C/S Asia',
    help: 'If a Rogue State (not already at war) exists in EE or C/S Asia, Russia may initiate conflict. Higher-level Rogue has priority; ties = random.',
    inputs: [
      {
        id: 'rogueExists',
        kind: 'bool',
        label: 'Is there a Rogue State (not already at war) in Eastern Europe or C/S Asia?',
      },
      {
        id: 'rogueRegion',
        kind: 'enum',
        label: 'Which region is the Rogue State in?',
        options: [
          { value: 'ee', label: 'Eastern Europe' },
          { value: 'csa', label: 'Central/South Asia' },
        ],
        help: 'Only relevant if a Rogue State exists.',
      },
    ],
    dice: [
      {
        id: 'g5Roll',
        kind: 'd10',
        label: 'G5 conflict roll',
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const exists =
          ctx.inputs.rogueExists === true || ctx.inputs.rogueExists === 'true';
        if (!exists) {
          return {
            id: 'russia.G5.skip',
            summary: 'No eligible Rogue State — G5 skipped.',
            consumesAction: false,
          };
        }

        const region =
          String(ctx.inputs.rogueRegion) === 'ee'
            ? 'Eastern Europe'
            : 'Central/South Asia';
        const roll = ctx.dice['g5Roll'];
        const m = roll.modified;

        if (m <= 3) {
          return {
            id: 'russia.G5.war',
            summary: `Russia initiates Combined Air/Ground War vs the Rogue State in ${region}. Spend 1 Action. Set up War per WM5 — Russia is attacker with −2 DRM (surprise). Perform initial War Progress roll.`,
            mutations: [
              { kind: 'consumeAction' },
              { kind: 'note', note: `Set up Russia vs Rogue State War in ${region}. Use WM5 with −2 DRM for Russia.` },
            ],
          };
        }
        if (m <= 7) {
          return {
            id: 'russia.G5.spetsnaz',
            summary: 'Russia launches Spetsnaz decapitation op — roll d10 for result. (No Action spent.)',
            detail: '1–7 Success: Decrease Rogue State level by 1 (if Lvl 1, remove and replace with a Lvl 4 Terror Group). 8+ Failure: Operation compromised — remove 1 Russia Influence in region (or place "Trending Pro-US" if none).',
            mutations: [{ kind: 'note', note: 'Roll d10: 1–7 = −1 Rogue level; 8+ = −1 Russia Influence or Trending Pro-US.' }],
            consumesAction: false,
          };
        }
        return {
          id: 'russia.G5.decline',
          summary: 'Russia declines to act against the Rogue State. (No Action spent.)',
          consumesAction: false,
        };
      },
    },
  },
];
