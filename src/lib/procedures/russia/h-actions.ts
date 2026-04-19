import type { Step, InputSpec, Outcome } from '@/lib/procedures/types';

// Section H — Remaining Action Hierarchy (10 actions, in order)
// Each action has a "triggered?" input so the player can confirm preconditions.
// Only one attempt of H10 allowed per turn.

const triggered = (label = 'Does this action trigger?'): InputSpec[] => [
  {
    id: 'triggered',
    kind: 'choice',
    label,
    options: [
      { value: 'yes', label: 'Yes — execute' },
      { value: 'no', label: 'No — skip (preconditions not met)' },
    ],
  },
];

// ── H1 — Cyber Attacks ────────────────────────────────────────────────────────

const cyberTargetsRussia = [
  { roll: [1, 1], label: 'US Economy', effect: 'Success: place "Worsening Economy" on US SoE. Major: −1 US SoE box AND +1 US Domestic Crises.' },
  { roll: [2, 3], label: 'US Political Cohesion', effect: 'Success: −1 Relations w/ Congress AND −1 Bipartisan Cooperation. Major: same + randomly discard 1 Congressional Friend (or −1 Cabinet Effectiveness AND −2 Public Approval if none).' },
  { roll: [4, 4], label: 'Discredit US President', effect: 'Success: −1 AP AND −1 Public Approval. Major: −2 AP AND −1 RWC AND −2 Public Approval.' },
  { roll: [5, 6], label: 'EU Cohesion', effect: 'Success: +1 Regional Crises in Eurozone AND Eastern Europe. Major: −1 Eurozone Stability AND +2 Eastern Europe Regional Crises.' },
  { roll: [7, 8], label: 'US Relationship with European Allies', effect: 'Success: −1 NATO Ally Relationship (or UK if NATO impossible). Major: −1 NATO AND −1 UK.' },
  { roll: [9, 10], label: 'Eastern Europe Democracies', effect: 'Success: +1 Russia Influence in Eastern Europe. Major: +2 Russia Influence in Eastern Europe AND +1 Eastern Europe Regional Crises.' },
];

function cyberTargetLabel(roll: number): string {
  const t = cyberTargetsRussia.find(
    (t) => roll >= t.roll[0] && roll <= t.roll[1],
  );
  return t ? `Target: **${t.label}**\n${t.effect}` : 'Unknown target';
}

// ── H5 War Resolution Helper ──────────────────────────────────────────────────

// Russia/NATO War Resolution compares 10 superiority areas.
// Superiority areas checked:
// 1-7. Each of the 7 Strategic Capability comparisons (Russia > US = Russia superiority)
// 8. Russia/NATO Conflict Track Relative Strength
// 9. Russia Influence vs US Military Assets in Eastern Europe
// 10. NATO Cohesion (NATO+UK+Canada all Very Close AND Eurozone Stability ≥5 = US superiority)

export const stepsH: Step[] = [
  // ── H1 ──────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H1',
    section: 'H',
    title: 'H1 — Cyber Attacks & Online Disinformation',
    help: 'Makes 2 attacks (Posture 1) or 3 attacks (Posture 2). Each attack: roll d10 for target, then d10 for success (vs Cyber Capability comparison).',
    inputs: [
      ...triggered('Does H1 trigger? (Always yes — H1 is always attempted first)'),
      {
        id: 'posture',
        kind: 'enum',
        label: 'Russia current Posture',
        options: [
          { value: '1', label: 'Posture 1 (2 attacks)' },
          { value: '2', label: 'Posture 2 (3 attacks)' },
        ],
      },
      {
        id: 'cyberAdv',
        kind: 'enum',
        label: 'Russia Cyber Warfare vs US Cyber Warfare',
        options: [
          { value: 'russia_wins', label: 'Russia > US (Major ≤3, Success ≤9, Fail 10)' },
          { value: 'equal',       label: 'Equal (Major ≤1, Success ≤7, Fail 8+)' },
          { value: 'us_wins',     label: 'US > Russia (No Major, Success ≤5, Fail 6+)' },
        ],
      },
    ],
    repeat: {
      count: (ctx) => (String(ctx.inputs.posture) === '2' ? 3 : 2),
      label: 'Cyber Attack',
    },
    dice: [
      { id: 'cyberTarget', kind: 'd10', label: 'Target roll (d10)' },
      { id: 'cyberSuccess', kind: 'd10', label: 'Success roll (d10)' },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H1.skip', summary: 'H1 skipped.', consumesAction: false };
        }

        const target = ctx.dice['cyberTarget'].modified;
        const success = ctx.dice['cyberSuccess'].modified;
        const adv = String(ctx.inputs.cyberAdv);

        let level: 'major' | 'success' | 'fail';
        if (adv === 'russia_wins') {
          level = success <= 3 ? 'major' : success <= 9 ? 'success' : 'fail';
        } else if (adv === 'equal') {
          level = success <= 1 ? 'major' : success <= 7 ? 'success' : 'fail';
        } else {
          level = success <= 5 ? 'success' : 'fail';
        }

        const targetLine = cyberTargetLabel(target);

        if (level === 'fail') {
          return {
            id: 'russia.H1.fail',
            summary: `Cyber attack FAILED. ${targetLine.split('\n')[0]}`,
            detail: targetLine,
          };
        }

        return {
          id: `russia.H1.${level}`,
          summary: `Cyber attack — ${level === 'major' ? 'MAJOR SUCCESS' : 'Success'}. ${targetLine.split('\n')[0]}`,
          detail: targetLine,
          mutations: [{ kind: 'note', note: `Apply ${level === 'major' ? 'Major Success' : 'Success'} effects for the target above.` }],
        };
      },
    },
  },

  // ── H2 ──────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H2',
    section: 'H',
    title: 'H2 — Multi-Domain "Grey Zone" Attacks to Expand Russian Influence',
    help: 'First: if any region has ≥3 Russia Influence → convert to a Base (−1 RWC, −2 PA, Trending Anti-US). Otherwise roll d10 + Regional Alignment for the first eligible region.',
    inputs: [
      ...triggered(),
      {
        id: 'hasThreeInfluenceRegion',
        kind: 'bool',
        label: 'Does any region have ≥ 3 Russia Influence? (will create a Base)',
        help: 'If yes, remove 3 counters and place a Russia Base. Then stop (action done).',
      },
      {
        id: 'targetRegion',
        kind: 'enum',
        label: 'Expansion target region (first eligible)',
        help: 'Eastern Europe (0–1 influence, or 2 with ≥3 in Eurozone), then Eurozone (<3), then C/S Asia (<3).',
        options: [
          { value: 'none', label: 'No eligible region' },
          { value: 'ee', label: 'Eastern Europe' },
          { value: 'eurozone', label: 'Eurozone' },
          { value: 'csa', label: 'Central/South Asia' },
        ],
      },
      {
        id: 'regionAlignment',
        kind: 'int',
        label: 'US Regional Alignment of the target region (DRM added to d10)',
        min: 1,
        max: 10,
        help: 'Higher alignment = harder for Russia to expand.',
      },
      {
        id: 'relationsBox',
        kind: 'int',
        label: 'Russia/US Relations box (1–5)',
        min: 1,
        max: 5,
        help: 'Needed to check if Trending Anti-US should also be placed on Alignment Track.',
      },
    ],
    dice: [
      {
        id: 'h2Roll',
        kind: 'd10',
        label: 'Expansion roll',
        drms: [
          {
            label: 'US Regional Alignment (DRM)',
            value: (ctx) => Number(ctx.inputs.regionAlignment),
          },
        ],
        cap: { min: 0, max: 10 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H2.skip', summary: 'H2 skipped.', consumesAction: false };
        }

        const base = ctx.inputs.hasThreeInfluenceRegion === true || ctx.inputs.hasThreeInfluenceRegion === 'true';

        if (base) {
          return {
            id: 'russia.H2.base',
            summary: 'Russia creates a Base in the region with ≥3 Influence. Remove the 3 counters, place a Base.',
            detail: 'Also: −1 Relations w/ Congress, −2 Public Approval, place "Trending Anti-US" on Russia/US Relations Track.',
            mutations: [
              { kind: 'remove', target: '3 Russia Influence counters' },
              { kind: 'place', target: 'Russia Base in region' },
              { kind: 'shift', target: 'Relations with Congress', amount: -1 },
              { kind: 'shift', target: 'Public Approval', amount: -2 },
              { kind: 'place', target: 'Trending Anti-US on Russia/US Relations' },
            ],
          };
        }

        const region = String(ctx.inputs.targetRegion);
        if (region === 'none') {
          return {
            id: 'russia.H2.noregion',
            summary: 'No eligible region for Grey Zone expansion — H2 has no effect.',
          };
        }

        const roll = ctx.dice['h2Roll'];
        const regionName = { ee: 'Eastern Europe', eurozone: 'Eurozone', csa: 'Central/South Asia' }[region];
        const relations = Number(ctx.inputs.relationsBox);

        if (roll.modified <= 10) {
          const outcomes: Outcome[] = [
            {
              id: 'russia.H2.expand',
              summary: `Grey Zone success — place 1 Russia Influence in ${regionName}.`,
              mutations: [{ kind: 'place' as const, target: `Russia Influence in ${regionName}` }],
            },
          ];

          if (relations <= 2) {
            outcomes.push({
              id: 'russia.H2.antius',
              summary: `Russia/US Relations ≤ 2 — also place "Trending Anti-US" on ${regionName} Alignment Track.`,
              mutations: [{ kind: 'place' as const, target: `Trending Anti-US on ${regionName} Alignment Track` }],
            });
          }

          // C/S Asia special: Russia vs China competition
          if (region === 'csa') {
            outcomes.push({
              id: 'russia.H2.csa_competition',
              summary: 'C/S Asia expansion — roll d10 for Russia vs China competition.',
              detail: '1–5: place another Russia Influence in C/S Asia. 6+: replace 1 China Influence in C/S Asia with a Russia Influence.',
              mutations: [{ kind: 'note', note: 'Roll d10: 1–5 = +1 more Russia; 6+ = replace 1 China with Russia.' }],
            });
          }

          return outcomes;
        }

        return {
          id: 'russia.H2.fail',
          summary: `Grey Zone expansion in ${regionName} fails — d10+alignment = ${roll.modified} > 10.`,
        };
      },
    },
  },

  // ── H3 ──────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H3',
    section: 'H',
    title: 'H3 — Compromise to Facilitate Removal of Sanctions',
    help: 'Skip if no Sanctions on Russia. Free removal if Relations 4–5. Otherwise roll d10 with DRMs.',
    inputs: [
      ...triggered(),
      {
        id: 'sanctionsExist',
        kind: 'bool',
        label: 'Are there Sanctions counters on Russia?',
      },
      {
        id: 'relationsBox',
        kind: 'int',
        label: 'Russia/US Relations box (1–5)',
        min: 1,
        max: 5,
      },
      {
        id: 'posture',
        kind: 'enum',
        label: 'Russia Posture',
        options: [{ value: '1', label: '1' }, { value: '2', label: '2' }],
      },
      {
        id: 'russiaStrategicAdvantage',
        kind: 'bool',
        label: 'Russia Strategic Missiles/Missile Defense ≥ 2 boxes higher than US? (−2 DRM)',
      },
      {
        id: 'russiaConflictAdvantage',
        kind: 'bool',
        label: 'Russia is at "+2 Relative Strength" box on Russia/NATO Conflict Track? (−2 DRM)',
      },
      {
        id: 'eeStability6',
        kind: 'bool',
        label: 'Eastern Europe Stability ≥ 6? (+1 DRM)',
      },
      {
        id: 'eurozoneAndEE',
        kind: 'bool',
        label: 'Eurozone Stability ≥ 7 AND Eastern Europe Stability ≥ 6? (+1 DRM)',
      },
      {
        id: 'usStrategicOrNATOAdv',
        kind: 'bool',
        label: 'US Strategic Missiles ≥ 1 box higher than Russia OR NATO is at +1/+2 Relative Strength? (+1 DRM)',
      },
      {
        id: 'lastAction',
        kind: 'bool',
        label: 'Is this Russia\'s last available Action? (+1 DRM)',
      },
      {
        id: 'multilateral',
        kind: 'bool',
        label: 'Multilateral Sanctions marker on Russia? (+2 DRM)',
      },
    ],
    dice: [
      {
        id: 'h3Roll',
        kind: 'd10',
        label: 'Sanctions compromise roll',
        drms: [
          { label: 'Posture 2 (−1)', value: (ctx) => (String(ctx.inputs.posture) === '2' ? -1 : 0) },
          { label: 'Russia Missile adv (−2)', value: (ctx) => (ctx.inputs.russiaStrategicAdvantage === true || ctx.inputs.russiaStrategicAdvantage === 'true' ? -2 : 0) },
          { label: 'Russia Conflict Track +2 (−2)', value: (ctx) => (ctx.inputs.russiaConflictAdvantage === true || ctx.inputs.russiaConflictAdvantage === 'true' ? -2 : 0) },
          { label: 'EE Stability ≥6 (+1)', value: (ctx) => (ctx.inputs.eeStability6 === true || ctx.inputs.eeStability6 === 'true' ? 1 : 0) },
          { label: 'Eurozone ≥7 AND EE ≥6 (+1)', value: (ctx) => (ctx.inputs.eurozoneAndEE === true || ctx.inputs.eurozoneAndEE === 'true' ? 1 : 0) },
          { label: 'US Strategic or NATO adv (+1)', value: (ctx) => (ctx.inputs.usStrategicOrNATOAdv === true || ctx.inputs.usStrategicOrNATOAdv === 'true' ? 1 : 0) },
          { label: 'Last Russia Action (+1)', value: (ctx) => (ctx.inputs.lastAction === true || ctx.inputs.lastAction === 'true' ? 1 : 0) },
          { label: 'Multilateral Sanctions (+2)', value: (ctx) => (ctx.inputs.multilateral === true || ctx.inputs.multilateral === 'true' ? 2 : 0) },
        ],
        cap: { min: -3, max: 3 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H3.skip', summary: 'H3 skipped.', consumesAction: false };
        }
        const sanctions = ctx.inputs.sanctionsExist === true || ctx.inputs.sanctionsExist === 'true';
        if (!sanctions) {
          return { id: 'russia.H3.nosanctions', summary: 'No Sanctions on Russia — H3 has no effect.', consumesAction: false };
        }
        const relations = Number(ctx.inputs.relationsBox);
        if (relations >= 4) {
          return {
            id: 'russia.H3.free',
            summary: 'Relations 4–5 — Remove all Sanctions on Russia at no Action cost.',
            mutations: [{ kind: 'remove', target: 'all Sanctions counters (Russia)' }],
            consumesAction: false,
          };
        }

        const roll = ctx.dice['h3Roll'];
        const m = roll.modified;

        if (m <= 3) {
          return { id: 'russia.H3.nyet', summary: '"Nyet!" — Sanctions remain.' };
        }
        if (m <= 8) {
          return {
            id: 'russia.H3.compromise',
            summary: 'Compromise achieved — remove 1 Russia Influence in Eastern Europe (or Eurozone if EE has none). Remove all Sanctions. If no Influence in either, place "−1 AP" on Russia instead.',
            mutations: [
              { kind: 'remove', target: '1 Russia Influence (EE or Eurozone)' },
              { kind: 'remove', target: 'all Sanctions counters (Russia)' },
            ],
          };
        }
        // 9+
        return {
          id: 'russia.H3.west_firm',
          summary: 'The West Stands Firm and Russia Blinks — remove all Sanctions.',
          detail: 'If Posture 2 → Posture 1. If Posture already 1 → −1 box on Russia/NATO Conflict Track. If Conflict Track already at 1 → remove 2 Russia Influence anywhere.',
          mutations: [
            { kind: 'remove', target: 'all Sanctions counters (Russia)' },
            { kind: 'note', note: 'Apply Posture/Conflict Track/Influence consequence (see detail).' },
          ],
        };
      },
    },
  },

  // ── H4 ──────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H4',
    section: 'H',
    title: 'H4 — Secure / Exploit / Militarize the Arctic',
    help: 'Roll d10. 1–2 = no event (no action consumed). 3–4 = economic gain. 5–6 = Naval capability +1. 7–8 = NATO Conflict Track. 9+ = Russia loses Influence but triggers DARPA + tensions.',
    inputs: triggered(),
    dice: [{ id: 'h4Roll', kind: 'd10', label: 'Arctic roll' }],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H4.skip', summary: 'H4 skipped.', consumesAction: false };
        }
        const m = ctx.dice['h4Roll'].modified;
        if (m <= 2) {
          return { id: 'russia.H4.none', summary: 'No Arctic event — action NOT consumed.', consumesAction: false };
        }
        if (m <= 4) {
          return {
            id: 'russia.H4.mining',
            summary: 'Deep Sea Mining — place "Improving Economy" on Russia SoE Track.',
            mutations: [{ kind: 'place', target: 'Improving Economy (Russia SoE)' }],
          };
        }
        if (m <= 6) {
          return {
            id: 'russia.H4.naval',
            summary: 'Arctic port/naval training — +1 Russia Naval Forces Training & Tech Strategic Capability.',
            mutations: [{ kind: 'shift', target: 'Russia Naval Forces Training & Tech', amount: 1 }],
          };
        }
        if (m <= 8) {
          return {
            id: 'russia.H4.nato',
            summary: 'Arctic naval/air advantage over NATO — move Russia/NATO Conflict Track Relative Strength +1 in Russia\'s favor. Place 2 Tensions counters each on Russia, NATO, Canada.',
            mutations: [
              { kind: 'shift', target: 'Russia/NATO Conflict Track (Relative Strength)', amount: 1 },
              { kind: 'place', target: '2 Tensions on Russia' },
              { kind: 'place', target: '2 Tensions on NATO' },
              { kind: 'place', target: '2 Tensions on Canada' },
            ],
          };
        }
        // 9+
        return {
          id: 'russia.H4.riles',
          summary: 'Russian Arctic expansion riles neighbors — remove 1 Russia Influence from Eurozone (or EE). Place 2 Tensions on each of Russia, UK, NATO, Canada. Place DARPA counter on Naval Forces T&T. Trending Anti-US on Russia/US Relations.',
          mutations: [
            { kind: 'remove', target: '1 Russia Influence (Eurozone or EE)' },
            { kind: 'place', target: '2 Tensions on Russia' },
            { kind: 'place', target: '2 Tensions on UK' },
            { kind: 'place', target: '2 Tensions on NATO' },
            { kind: 'place', target: '2 Tensions on Canada' },
            { kind: 'place', target: 'DARPA/Rapid Capabilities on Naval Forces T&T' },
            { kind: 'place', target: 'Trending Anti-US on Russia/US Relations' },
          ],
        };
      },
    },
  },

  // ── H5 ──────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H5',
    section: 'H',
    title: 'H5 — Reinforce Allies, Build Military, Use Force',
    help: 'Option A: if Russia Relative Strength ≤ NATO, try to build military. Option B: if Serbia is at War, try to broker peace or resupply. First applicable option executes.',
    inputs: [
      ...triggered(),
      {
        id: 'h5Option',
        kind: 'enum',
        label: 'Which condition is met?',
        options: [
          { value: 'a', label: 'A — Russia Relative Strength ≤ NATO (build military)' },
          { value: 'b_losing', label: 'B — Serbia at War, Serbian forces Losing (broker peace)' },
          { value: 'b_other', label: 'B — Serbia at War, status other (resupply Serbia)' },
          { value: 'none', label: 'Neither condition met — skip' },
        ],
      },
      {
        id: 'soe',
        kind: 'int',
        label: 'Russia SoE (used for option A build roll)',
        min: 1,
        max: 7,
      },
    ],
    dice: [{ id: 'h5Roll', kind: 'd10', label: 'H5 action roll' }],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H5.skip', summary: 'H5 skipped.', consumesAction: false };
        }
        const opt = String(ctx.inputs.h5Option);
        if (opt === 'none') {
          return { id: 'russia.H5.none', summary: 'H5 — neither condition met.', consumesAction: false };
        }

        const roll = ctx.dice['h5Roll'];
        const m = roll.modified;
        const soe = Number(ctx.inputs.soe);

        if (opt === 'a') {
          // roll d10 − 2; if result < current Russia SoE → improve
          const adjusted = m - 2;
          if (adjusted < soe) {
            return {
              id: 'russia.H5.a.success',
              summary: 'Military build-up — +1 Russia/NATO Conflict Track in Russia\'s favor. Place 2 Tensions each on Russia, NATO, UK, Canada.',
              mutations: [
                { kind: 'shift', target: 'Russia/NATO Conflict Track (Relative Strength)', amount: 1 },
                { kind: 'place', target: '2 Tensions on Russia' },
                { kind: 'place', target: '2 Tensions on NATO' },
                { kind: 'place', target: '2 Tensions on UK' },
                { kind: 'place', target: '2 Tensions on Canada' },
              ],
            };
          }
          return { id: 'russia.H5.a.fail', summary: 'Military build-up fails — no effect.' };
        }

        if (opt === 'b_losing') {
          if (m <= 4) {
            return {
              id: 'russia.H5.b.peace',
              summary: 'Russia diplomacy succeeds — Serbia war ends.',
              mutations: [{ kind: 'note', note: 'End the war in Serbia\'s region.' }],
            };
          }
          return { id: 'russia.H5.b.fail', summary: 'Russia diplomacy fails — war continues.' };
        }

        // b_other — resupply
        const adjustedResupply = m + (String(ctx.inputs.posture ?? '1') === '2' ? -1 : 0);
        if (adjustedResupply <= 6) {
          return {
            id: 'russia.H5.b.resupply',
            summary: '+1 Strength to Serbia\'s side in the war.',
            mutations: [{ kind: 'shift', target: 'Serbia War Strength', amount: 1 }],
          };
        }
        return { id: 'russia.H5.b.fail', summary: 'Resupply fails — no effect.' };
      },
    },
  },

  // ── H6 ──────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H6',
    section: 'H',
    title: 'H6 — Veto UN Sanctions',
    help: 'If "UN Sanctions" counter on Iran or North Korea, Russia vetoes renewal. Priority: Iran → NK.',
    inputs: [
      ...triggered(),
      {
        id: 'sanctionTarget',
        kind: 'enum',
        label: 'Which country has UN Sanctions?',
        options: [
          { value: 'iran', label: 'Iran (remove Iran UN Sanctions)' },
          { value: 'nk', label: 'North Korea (remove NK UN Sanctions)' },
          { value: 'none', label: 'Neither has UN Sanctions — skip' },
        ],
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H6.skip', summary: 'H6 skipped.', consumesAction: false };
        }
        const target = String(ctx.inputs.sanctionTarget);
        if (target === 'none') {
          return { id: 'russia.H6.none', summary: 'No UN Sanctions to veto — H6 has no effect.', consumesAction: false };
        }
        const name = target === 'iran' ? 'Iran' : 'North Korea';
        return {
          id: 'russia.H6.veto',
          summary: `Russia vetoes UN Sanctions renewal on ${name} — remove the UN Sanctions counter.`,
          mutations: [{ kind: 'remove', target: `UN Sanctions on ${name}` }],
        };
      },
    },
  },

  // ── H7 ──────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H7',
    section: 'H',
    title: 'H7 — Assist Iranian Nuclear Program',
    help: 'Trigger: Relations ≤ 3 AND Iran Nuclear Track in box 1–3 AND no "Can\'t Increase" marker. Roll d10 (+ Sanctions DRM). 1–5 = success (+1 Iran Nuclear Track).',
    inputs: [
      ...triggered(),
      {
        id: 'iranSanctions',
        kind: 'int',
        label: 'Sanctions counters on Iran (+ DRM for Iran, making success harder)',
        min: 0,
        max: 3,
      },
    ],
    dice: [{ id: 'h7Roll', kind: 'd10', label: 'Iran nuclear assist roll', drms: [{ label: 'Iran Sanctions', value: (ctx) => Number(ctx.inputs.iranSanctions) }], cap: { min: 0, max: 3 } }],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H7.skip', summary: 'H7 skipped.', consumesAction: false };
        }
        const m = ctx.dice['h7Roll'].modified;
        if (m <= 5) {
          return {
            id: 'russia.H7.success',
            summary: 'Russia assists Iranian nuclear program — +1 Iran Nuclear Missile Program box. Apply box effects.',
            mutations: [{ kind: 'shift', target: 'Iran Nuclear Missile Program Track', amount: 1 }],
          };
        }
        return { id: 'russia.H7.fail', summary: 'Iran nuclear assistance fails — no effect.' };
      },
    },
  },

  // ── H8 ──────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H8',
    section: 'H',
    title: 'H8 — Assist North Korean Missile Program',
    help: 'Trigger: Relations ≤ 3 AND NK Missile Track in box 1–3 AND no "Can\'t Increase" marker. Roll d10 (+ NK Sanctions count). 1–5 = success.',
    inputs: [
      ...triggered(),
      {
        id: 'nkSanctions',
        kind: 'int',
        label: 'Number of Sanctions counters on North Korea (+ DRM, making it harder)',
        min: 0,
        max: 5,
      },
    ],
    dice: [{ id: 'h8Roll', kind: 'd10', label: 'NK missile assist roll', drms: [{ label: 'NK Sanctions count', value: (ctx) => Number(ctx.inputs.nkSanctions) }], cap: { min: 0, max: 3 } }],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H8.skip', summary: 'H8 skipped.', consumesAction: false };
        }
        const m = ctx.dice['h8Roll'].modified;
        if (m <= 5) {
          return {
            id: 'russia.H8.success',
            summary: 'Russia assists NK missile program — +1 NK Nuclear/Missile Program box. Apply box effects.',
            mutations: [{ kind: 'shift', target: 'NK Nuclear/Missile Program Track', amount: 1 }],
          };
        }
        return { id: 'russia.H8.fail', summary: 'NK missile assistance fails — no effect.' };
      },
    },
  },

  // ── H9 ──────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H9',
    section: 'H',
    title: 'H9 — Middle East Influence',
    help: 'Option A: if <3 Russia Influence in ME → roll to expand. Option B: exactly 3 AND a War in ME → send weapons. Option C: otherwise → +2 Regional Crises in ME.',
    inputs: [
      ...triggered(),
      {
        id: 'meInfluence',
        kind: 'int',
        label: 'Russia Influence in Middle East',
        min: 0,
      },
      {
        id: 'warInME',
        kind: 'bool',
        label: 'Is there a War in the Middle East?',
        help: 'Relevant only if Russia Influence = 3.',
      },
      {
        id: 'meAlignment',
        kind: 'int',
        label: 'US Regional Alignment in Middle East (DRM added)',
        min: 1,
        max: 10,
      },
    ],
    dice: [{ id: 'h9Roll', kind: 'd10', label: 'ME Influence roll', drms: [{ label: 'ME US Alignment (DRM)', value: (ctx) => Number(ctx.inputs.meAlignment) }], cap: { min: 0, max: 10 } }],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H9.skip', summary: 'H9 skipped.', consumesAction: false };
        }
        const inf = Number(ctx.inputs.meInfluence);
        const war = ctx.inputs.warInME === true || ctx.inputs.warInME === 'true';
        const roll = ctx.dice['h9Roll'];

        if (inf < 3) {
          if (roll.modified <= 10) {
            return {
              id: 'russia.H9.a.expand',
              summary: 'Russia expands in Middle East — place 1 Russia Influence in ME.',
              mutations: [{ kind: 'place', target: 'Russia Influence in Middle East' }],
            };
          }
          return { id: 'russia.H9.a.fail', summary: 'Russia ME expansion fails — roll > 10.' };
        }

        if (inf === 3 && war) {
          return {
            id: 'russia.H9.b.weapons',
            summary: 'Russia sends weapons — +1 Strength to a random Adversary in a US/Ally war in the ME.',
            mutations: [{ kind: 'shift', target: 'Adversary War Strength (ME)', amount: 1 }],
          };
        }

        return {
          id: 'russia.H9.c.destabilize',
          summary: 'Russia destabilizes Middle East — +2 Regional Crises in ME.',
          mutations: [{ kind: 'shift', target: 'Middle East Regional Crises', amount: 2 }],
        };
      },
    },
  },

  // ── H10 ─────────────────────────────────────────────────────────────────────
  {
    id: 'russia.H10',
    section: 'H',
    title: 'H10 — Prepare for War / Probe NATO',
    help: 'Skip if Relations 4–5 or already attempted this turn. Compare Relative Strength to decide between "build military" and "probe/provoke" paths. On 9+ with Russian advantage, may trigger Russia/NATO War Resolution.',
    inputs: [
      ...triggered(),
      {
        id: 'relationsBox',
        kind: 'int',
        label: 'Russia/US Relations box (1–5) — skip if 4 or 5',
        min: 1,
        max: 5,
      },
      {
        id: 'h10Path',
        kind: 'enum',
        label: 'Russia Relative Strength vs NATO',
        options: [
          { value: 'russia_le_nato', label: 'Russia ≤ NATO (build military to prepare)' },
          { value: 'russia_gt_nato', label: 'Russia > NATO (provoke / probe)' },
        ],
      },
      {
        id: 'eeInfluenceDiff',
        kind: 'int',
        label: 'Russia Influence in EE minus US Military Assets in EE (DRM; positive = Russia advantage)',
        help: 'Negative if US has more assets. Used as DRM on the probe roll.',
      },
    ],
    dice: [
      {
        id: 'h10Roll',
        kind: 'd10',
        label: 'Probe / Provoke roll',
        drms: [
          {
            label: 'Relations box modifier',
            value: (ctx) => {
              const r = Number(ctx.inputs.relationsBox);
              return [0, -2, -1, 0, 1, 2][r] ?? 0;
            },
          },
          {
            label: 'EE Influence vs US Assets',
            value: (ctx) => Number(ctx.inputs.eeInfluenceDiff),
          },
        ],
        cap: { min: -3, max: 3 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'russia.H10.skip', summary: 'H10 skipped.', consumesAction: false };
        }
        const relations = Number(ctx.inputs.relationsBox);
        if (relations >= 4) {
          return { id: 'russia.H10.peacetime', summary: 'Relations 4–5 — H10 does not trigger.', consumesAction: false };
        }

        const path = String(ctx.inputs.h10Path);
        const roll = ctx.dice['h10Roll'];
        const m = roll.modified;

        if (path === 'russia_le_nato') {
          return {
            id: 'russia.H10.build',
            summary: 'Russia builds military — +1 Russia/NATO Conflict Track in Russia\'s favor. Place "Trending Anti-US" on Russia/US Relations.',
            mutations: [
              { kind: 'shift', target: 'Russia/NATO Conflict Track (Relative Strength)', amount: 1 },
              { kind: 'place', target: 'Trending Anti-US on Russia/US Relations' },
            ],
          };
        }

        // Russia > NATO path: probe
        if (m <= 3) {
          return {
            id: 'russia.H10.probe.nato_responds',
            summary: 'NATO responds — +1 NATO Relative Strength on Russia/NATO Conflict Track. Place 1 Tensions each on NATO and Russia. Trending Anti-US on Russia/US Relations.',
            mutations: [
              { kind: 'place', target: 'Trending Anti-US on Russia/US Relations' },
              { kind: 'shift', target: 'Russia/NATO Conflict Track (Relative Strength in NATO favor)', amount: 1 },
              { kind: 'place', target: '1 Tensions on NATO' },
              { kind: 'place', target: '1 Tensions on Russia' },
            ],
          };
        }
        if (m <= 6) {
          return {
            id: 'russia.H10.probe.no_response',
            summary: 'No NATO response — Russia places 1 Influence in EE, 1 Tensions each on Russia and NATO. Trending Anti-US.',
            mutations: [
              { kind: 'place', target: 'Trending Anti-US on Russia/US Relations' },
              { kind: 'place', target: '1 Russia Influence in Eastern Europe' },
              { kind: 'place', target: '1 Tensions on Russia' },
              { kind: 'place', target: '1 Tensions on NATO' },
            ],
          };
        }
        if (m <= 8) {
          return {
            id: 'russia.H10.probe.flare',
            summary: 'Tensions Flare — +1 Russia/NATO Conflict Track in Russia\'s favor. 2 Tensions each on Russia, NATO, UK, Canada. +1 EE Regional Crises. Trending Anti-US on Russia/US Relations.',
            mutations: [
              { kind: 'shift', target: 'Russia/NATO Conflict Track (Relative Strength)', amount: 1 },
              { kind: 'place', target: '2 Tensions on Russia' },
              { kind: 'place', target: '2 Tensions on NATO' },
              { kind: 'place', target: '2 Tensions on UK' },
              { kind: 'place', target: '2 Tensions on Canada' },
              { kind: 'shift', target: 'Eastern Europe Regional Crises', amount: 1 },
              { kind: 'place', target: 'Trending Anti-US on Russia/US Relations' },
            ],
          };
        }

        // 9+ — potential war
        return {
          id: 'russia.H10.war_check',
          summary: '⚠ Possible Russia/NATO War — check: if Conflict Track ≤ 3 OR Relations ≥ 3, treat as 7–8 result. Otherwise: RUSSIA ATTACKS EASTERN EUROPE. Proceed to NATO War Resolution below.',
          detail: `NATO War Resolution — score 10 superiority areas:
(1–7) Each of 7 Strategic Capability comparisons (Russia > US = Russia superiority)
(8) Russia/NATO Conflict Track Relative Strength
(9) Russia Influence vs US Military Assets in Eastern Europe
(10) NATO Cohesion: NATO+UK+Canada all Very Close AND Eurozone Stability ≥ 5 = US superiority; else Russia

If US superior in ≥ 6 of 10: Russia sues for peace — see rule for full effects. Game continues.
If Russia superior in ≥ 6 of 10 (or ≥ 5 with +2 Relative Strength advantage): AUTOMATIC US LOSS.
Otherwise: prolonged bloodletting — see rule for full effects.`,
          mutations: [
            { kind: 'place', target: 'Trending Anti-US on Russia/US Relations' },
            { kind: 'note', note: 'Check Conflict Track ≤ 3 or Relations ≥ 3 first. If not: score 10 superiority areas to determine war outcome.' },
          ],
        };
      },
    },
  },
];
