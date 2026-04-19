import type { Step, Outcome, InputSpec } from '@/lib/procedures/types';
import { deriveCyberAdvH1 } from '@/lib/procedures/capabilities';
import type { CapabilityTracks } from '@/lib/procedures/capabilities';

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

const cyberTargetsChina = [
  { roll: [1, 1], label: 'US Economy', effect: 'Success: "Worsening Economy" on US SoE. Major: −1 US SoE box AND +1 US Domestic Crises. (If Relations 4–5, treat roll of 1 as 3–6 result instead.)' },
  { roll: [2, 2], label: 'US Political Cohesion', effect: 'Success: −1 Relations w/ Congress AND −1 Bipartisan Cooperation. Major: same + discard 1 Congressional Friend (or −1 Cabinet Effectiveness AND −2 PA). (If Relations 4–5, treat roll of 2 as 7–8 result.)' },
  { roll: [3, 6], label: 'Discredit & Replace US as Major Trade Partner in Asia/Pacific', effect: 'Success: +1 China Influence in Asia/Pacific. Major: +1 China Influence, "Trending Anti-US" in A/P, +1 A/P Regional Crises.' },
  { roll: [7, 8], label: 'Target India', effect: 'Success: +1 Regional Crises in C/S Asia. Major: +1 Crises in C/S Asia, −1 US/India Ally Relationship, "−1 AP" on India.' },
  { roll: [9, 10], label: 'Target Japan or ROK', effect: 'Success: −1 Ally Relationship for Japan (1–5 on re-roll d10) or ROK (6–10). Major: −1 both Japan AND ROK; +1 China Influence in Asia/Pacific.' },
];

function cyberTargetLabel(roll: number): string {
  const t = cyberTargetsChina.find((t) => roll >= t.roll[0] && roll <= t.roll[1]);
  return t ? `Target: **${t.label}**\n${t.effect}` : 'Unknown target';
}

export const stepsH: Step[] = [
  // ── H1 ──────────────────────────────────────────────────────────────────────
  {
    id: 'china.H1',
    section: 'H',
    title: 'H1 — Cyber Attacks',
    help: '1 attack (Posture 1) or 2 attacks (Posture 2). If Relations 4–5, target rolls of 1 or 2 are redirected to different rows.',
    inputs: [
      ...triggered('Does H1 trigger? (Always yes — H1 is always attempted first)'),
    ],
    repeat: {
      count: (ctx) => (String(ctx.sharedState['posture'] ?? '1') === '2' ? 2 : 1),
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
          return { id: 'china.H1.skip', summary: 'H1 skipped.', consumesAction: false };
        }

        const relations = Number(ctx.sharedState['relationsBox'] ?? 3);
        let target = ctx.dice['cyberTarget'].modified;

        // Relations 4–5 target redirection
        if (relations >= 4) {
          if (target === 1) target = 4; // redirect to 3–6 row
          else if (target === 2) target = 7; // redirect to 7–8 row
        }

        const success = ctx.dice['cyberSuccess'].modified;
        const tracks = ctx.sharedState['capabilityTracks'] as CapabilityTracks | undefined;
        const adv = tracks
          ? deriveCyberAdvH1(tracks.faction.cyber, tracks.us.cyber)
          : 'equal';

        let level: 'major' | 'success' | 'fail';
        if (adv === 'faction_wins') {
          level = success <= 3 ? 'major' : success <= 9 ? 'success' : 'fail';
        } else if (adv === 'equal') {
          level = success <= 1 ? 'major' : success <= 7 ? 'success' : 'fail';
        } else {
          level = success <= 5 ? 'success' : 'fail';
        }

        const targetLine = cyberTargetLabel(target);

        if (level === 'fail') {
          return { id: 'china.H1.fail', summary: `Cyber attack FAILED. ${targetLine.split('\n')[0]}`, detail: targetLine };
        }

        return {
          id: `china.H1.${level}`,
          summary: `Cyber attack — ${level === 'major' ? 'MAJOR SUCCESS' : 'Success'}. ${targetLine.split('\n')[0]}`,
          detail: targetLine,
          mutations: [{ kind: 'note', note: `Apply ${level === 'major' ? 'Major Success' : 'Success'} effects for the target above.` }],
        };
      },
    },
  },

  // ── H2 ──────────────────────────────────────────────────────────────────────
  {
    id: 'china.H2',
    section: 'H',
    title: 'H2 — One Belt One Road',
    help: 'Belt-and-Road regions: Asia/Pacific, C/S Asia, Middle East, Africa, Eastern Europe, Eurozone. Count "Chinese-influenced" regions (≥3 Influence). Either expand or generate economy counters.',
    inputs: [
      ...triggered(),
      {
        id: 'beltRegionsCount',
        kind: 'int',
        label: 'How many Belt-and-Road regions have ≥ 3 China Influence?',
        min: 0,
        max: 6,
        help: 'Belt-and-Road = A/P, C/SA, ME, Africa, Eastern Europe, Eurozone.',
      },
      {
        id: 'obroOption',
        kind: 'enum',
        label: 'Action to take (if ≥ 2 Chinese-influenced regions)',
        options: [
          { value: 'expand', label: 'A: Place 1 China Influence in each of the 2 BR regions with fewest influence' },
          { value: 'economy', label: 'B: Generate Economy counters + place Trending Anti-US in 2 high-alignment regions' },
        ],
        help: 'If 0–1 Chinese-influenced regions, only option A is available.',
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'china.H2.skip', summary: 'H2 skipped.', consumesAction: false };
        }

        const count = Number(ctx.inputs.beltRegionsCount);
        const option = String(ctx.inputs.obroOption);

        const tensionNote = 'Place 2 Tensions on China; 1 Tension each on Japan, India, Australia, ROK, Gulf States/SA, Russia.';

        if (option === 'expand' || count <= 1) {
          return [
            {
              id: 'china.H2.expand',
              summary: 'One Belt One Road — place 1 China Influence in each of the 2 Belt-and-Road regions with the fewest China Influence (tie-break: list order A/P, C/SA, ME, Africa, EE, Eurozone). Place "Trending Anti-US" on China Relations Track.',
              mutations: [
                { kind: 'place', target: 'Trending Anti-US on China Relations Track' },
                { kind: 'note', note: 'Place 1 China Influence in 2 BR regions with fewest influence.' },
              ],
            },
            { id: 'china.H2.tensions', summary: tensionNote, consumesAction: false },
          ];
        }

        const improveCount = Math.ceil(count / 2);
        const antiUSCount = Math.floor(count / 2);
        return [
          {
            id: 'china.H2.economy',
            summary: `One Belt One Road — place ${improveCount} "Improving Economy" counter(s) on China SoE. Place ${antiUSCount} "Trending Anti-US" counter(s) in 2 of the Chinese-influenced BR regions where US Alignment ≥ 6. Place "Trending Anti-US" on China Relations Track.`,
            mutations: [
              { kind: 'place', target: 'Trending Anti-US on China Relations Track' },
              { kind: 'place', target: `${improveCount} × Improving Economy (China SoE)` },
              { kind: 'note', note: `Place ${antiUSCount} Trending Anti-US in BR regions with alignment ≥ 6.` },
            ],
          },
          { id: 'china.H2.tensions', summary: tensionNote, consumesAction: false },
        ];
      },
    },
  },

  // ── H3 ──────────────────────────────────────────────────────────────────────
  {
    id: 'china.H3',
    section: 'H',
    title: 'H3 — Expand China\'s Influence in Neighboring Regions',
    help: 'First: if any region has ≥3 China Influence → create a Base. Otherwise roll d10 + alignment for the first eligible region (A/P, C/SA, then ME/Africa/Eurozone with 0 influence).',
    inputs: [
      ...triggered(),
      {
        id: 'hasThreeInfluenceRegion',
        kind: 'bool',
        label: 'Does any region have ≥ 3 China Influence? (will create a Base)',
      },
      {
        id: 'targetRegion',
        kind: 'enum',
        label: 'Expansion target region (first eligible)',
        options: [
          { value: 'none', label: 'No eligible region' },
          { value: 'ap', label: 'Asia/Pacific' },
          { value: 'csa', label: 'Central/South Asia' },
          { value: 'me', label: 'Middle East (0 influence)' },
          { value: 'africa', label: 'Africa (0 influence)' },
          { value: 'eurozone', label: 'Eurozone (0 influence)' },
        ],
      },
      {
        id: 'regionAlignment',
        kind: 'int',
        label: 'US Regional Alignment of target region (DRM)',
        min: 1,
        max: 10,
      },
    ],
    dice: [
      {
        id: 'h3Roll',
        kind: 'd10',
        label: 'Expansion roll',
        drms: [{ label: 'US Regional Alignment', value: (ctx) => Number(ctx.inputs.regionAlignment) }],
        cap: { min: 0, max: 10 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'china.H3.skip', summary: 'H3 skipped.', consumesAction: false };
        }

        const base = ctx.inputs.hasThreeInfluenceRegion === true || ctx.inputs.hasThreeInfluenceRegion === 'true';
        if (base) {
          return {
            id: 'china.H3.base',
            summary: 'China creates a Base. Remove 3 China Influence counters, place a China Base.',
            detail: '−1 Relations w/ Congress, −2 Public Approval, "Trending Anti-US" on China/US Relations.',
            mutations: [
              { kind: 'remove', target: '3 China Influence counters' },
              { kind: 'place', target: 'China Base in region' },
              { kind: 'shift', target: 'Relations with Congress', amount: -1 },
              { kind: 'shift', target: 'Public Approval', amount: -2 },
              { kind: 'place', target: 'Trending Anti-US on China/US Relations' },
            ],
          };
        }

        const region = String(ctx.inputs.targetRegion);
        if (region === 'none') {
          return { id: 'china.H3.noregion', summary: 'No eligible region for expansion — H3 has no effect.' };
        }

        const names: Record<string, string> = { ap: 'Asia/Pacific', csa: 'Central/South Asia', me: 'Middle East', africa: 'Africa', eurozone: 'Eurozone' };
        const regionName = names[region];
        const roll = ctx.dice['h3Roll'];
        const relations = Number(ctx.sharedState['relationsBox'] ?? 3);

        if (roll.modified <= 10) {
          const outcomes: Outcome[] = [
            {
              id: 'china.H3.expand',
              summary: `Expansion success — place 1 China Influence in ${regionName}.`,
              mutations: [{ kind: 'place' as const, target: `China Influence in ${regionName}` }],
            },
          ];
          if (relations <= 2) {
            outcomes.push({
              id: 'china.H3.antius',
              summary: `Relations ≤ 2 — also place "Trending Anti-US" on ${regionName} Alignment Track.`,
              mutations: [{ kind: 'place' as const, target: `Trending Anti-US on ${regionName} Alignment Track` }],
            });
          }
          if (region === 'csa') {
            outcomes.push({
              id: 'china.H3.csa_competition',
              summary: 'C/S Asia — roll d10 for China vs Russia competition: 1–5 = +1 more China Influence; 6+ = replace 1 Russia Influence with China Influence.',
              mutations: [{ kind: 'note' as const, note: 'Roll d10: 1–5 = +1 China; 6+ = replace 1 Russia Influence with China.' }],
            });
          }
          return outcomes;
        }

        return { id: 'china.H3.fail', summary: `Expansion in ${regionName} fails (roll ${roll.modified} > 10).` };
      },
    },
  },

  // ── H4 ──────────────────────────────────────────────────────────────────────
  {
    id: 'china.H4',
    section: 'H',
    title: 'H4 — Reinforce Allies, Build Military, Use Force',
    help: 'Option A: if China Relative Strength ≤ Japan or India, build military. Option B: if Pakistan at War with India, broker peace or resupply. Option C: if India/Pakistan CT ≥ 3, reduce tensions.',
    inputs: [
      ...triggered(),
      {
        id: 'h4Option',
        kind: 'enum',
        label: 'Which option applies?',
        options: [
          { value: 'a', label: 'A — China Relative Strength ≤ Japan or India (build military)' },
          { value: 'b_winning', label: 'B — Pakistan at War with India, India winning (broker peace)' },
          { value: 'b_other', label: 'B — Pakistan at War with India, other status (resupply)' },
          { value: 'c', label: 'C — India/Pakistan Conflict Track ≥ 3 (reduce tensions)' },
          { value: 'none', label: 'None apply — skip' },
        ],
      },
      {
        id: 'indiaChinaCT',
        kind: 'int',
        label: 'India/China Conflict Track value (used for B intervention)',
        min: 1,
        max: 4,
        help: 'CT 3 → +3 Strength to Pakistan; CT 4 → +5 Strength + Crises + Trending Anti-US.',
      },
    ],
    dice: [{ id: 'h4Roll', kind: 'd10', label: 'H4 action roll' }],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'china.H4.skip', summary: 'H4 skipped.', consumesAction: false };
        }
        const opt = String(ctx.inputs.h4Option);
        if (opt === 'none') {
          return { id: 'china.H4.none', summary: 'H4 — no applicable conditions.', consumesAction: false };
        }

        const roll = ctx.dice['h4Roll'];
        const soe = Number(ctx.sharedState['soe'] ?? 4);

        if (opt === 'a') {
          const adjusted = roll.modified - 2;
          if (adjusted < soe) {
            return {
              id: 'china.H4.a.success',
              summary: 'Military build-up — +1 on the weaker Conflict Track (China/Japan or China/India) in China\'s favor. Place 1 Tension each on China and the opposing country.',
              mutations: [
                { kind: 'note', note: '+1 on China/Japan or China/India Conflict Track (whichever is less favorable for China). +1 Tension on China and opposing country.' },
              ],
            };
          }
          return { id: 'china.H4.a.fail', summary: 'Military build-up fails — no effect.' };
        }

        if (opt === 'b_winning') {
          if (roll.modified <= 5) {
            return {
              id: 'china.H4.b.peace',
              summary: 'China diplomacy succeeds — Pakistan/India war ends.',
              mutations: [{ kind: 'note', note: 'End the Pakistan vs India war.' }],
            };
          }
          return { id: 'china.H4.b.fail', summary: 'China peace diplomacy fails — war continues.' };
        }

        if (opt === 'b_other') {
          const ct = Number(ctx.inputs.indiaChinaCT);
          if (ct >= 3) {
            const strength = ct === 3 ? 3 : 5;
            const extra = ct === 4
              ? ' +1 Asia/Pacific Regional Crises. "Trending Anti-US" on China/US Relations.'
              : '';
            return {
              id: 'china.H4.b.intervene',
              summary: `China intervenes — +${strength} Strength to Pakistan side.${extra}`,
              mutations: [
                { kind: 'shift', target: 'Pakistan War Strength', amount: strength },
                ...(ct === 4 ? [
                  { kind: 'shift' as const, target: 'Asia/Pacific Regional Crises', amount: 1 },
                  { kind: 'place' as const, target: 'Trending Anti-US on China/US Relations' },
                ] : []),
              ],
            };
          }
          // CT < 3: resupply
          const posture = String(ctx.sharedState['posture'] ?? '1');
          const adj = roll.modified - (posture === '2' ? 1 : 0);
          if (adj <= 3) {
            return {
              id: 'china.H4.b.resupply2',
              summary: '+2 Strength to Pakistan side.',
              mutations: [{ kind: 'shift', target: 'Pakistan War Strength', amount: 2 }],
            };
          }
          return {
            id: 'china.H4.b.resupply1',
            summary: '+1 Strength to Pakistan side.',
            mutations: [{ kind: 'shift', target: 'Pakistan War Strength', amount: 1 }],
          };
        }

        // opt === 'c'
        if (roll.modified <= 4) {
          return {
            id: 'china.H4.c.success',
            summary: '−1 India/Pakistan Conflict Track. Place 1 China Influence in C/S Asia.',
            mutations: [
              { kind: 'shift', target: 'India/Pakistan Conflict Track', amount: -1 },
              { kind: 'place', target: 'China Influence in C/S Asia' },
            ],
          };
        }
        return { id: 'china.H4.c.fail', summary: 'Tension reduction fails — no effect.' };
      },
    },
  },

  // ── H5 ──────────────────────────────────────────────────────────────────────
  {
    id: 'china.H5',
    section: 'H',
    title: 'H5 — Secure the Sea Lanes',
    help: 'Requires ≥2 China Influence in Asia/Pacific. Roll d10 (+1 if Posture 2). 1–6 = island building. 7+ = neighbors contest — US player decides whether to intervene with Air/Naval forces.',
    inputs: [
      ...triggered(),
      {
        id: 'apInfluence',
        kind: 'int',
        label: 'China Influence in Asia/Pacific',
        min: 0,
        help: 'Skip H5 if < 2.',
      },
    ],
    dice: [
      {
        id: 'h5Roll',
        kind: 'd10',
        label: 'Sea Lanes roll',
        drms: [{ label: 'Posture 2 (+1)', value: (ctx) => (String(ctx.sharedState['posture'] ?? '1') === '2' ? 1 : 0) }],
        cap: { min: 0, max: 3 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'china.H5.skip', summary: 'H5 skipped.', consumesAction: false };
        }
        if (Number(ctx.inputs.apInfluence) < 2) {
          return { id: 'china.H5.noinf', summary: 'H5 — China has < 2 Influence in Asia/Pacific. Skip.', consumesAction: false };
        }

        const m = ctx.dice['h5Roll'].modified;

        if (m <= 6) {
          return {
            id: 'china.H5.build',
            summary: 'Island Building — place "Trending Anti-US" on China Relations Track. +1 Tensions each on China, Japan, Australia, ROK. +1 China Influence in Asia/Pacific.',
            detail: 'If China Relations w/ US is NOT 4 or 5: US may immediately impose Unilateral or Multilateral Sanctions on China (Diplomatic Master Action #7).',
            mutations: [
              { kind: 'place', target: 'Trending Anti-US on China Relations Track' },
              { kind: 'place', target: '1 Tensions on China' },
              { kind: 'place', target: '1 Tensions on Japan' },
              { kind: 'place', target: '1 Tensions on Australia' },
              { kind: 'place', target: '1 Tensions on ROK' },
              { kind: 'place', target: 'China Influence in Asia/Pacific' },
            ],
          };
        }

        // 7+ — neighbors contest; US player decides
        return {
          id: 'china.H5.contest',
          summary: 'Neighbors contest Chinese expansion (roll ≥ 7). US player CHOOSES:',
          detail: `**Option A — Stand Down:** −1 US Alignment in Asia/Pacific, "Trending Pro-US" on China Relations, −1 Ally Relationship with one random Asia/Pacific Ally.

**Option B — Intervene with Air/Naval forces:** Roll d10 +2.
• 1–3: China wins skirmish. +1 China Influence in A/P. +3 Tensions each on China, Japan, Australia, ROK. China Relations −1 box.
• 4–9 (US Naval+Air sum > China): US patrols prevail — +3 Tensions on China, remove 1 China Influence or replace Base with 2 Influence, +1 Tensions each on Japan/Australia/ROK, China Relations −1.
• 4–9 (China Naval+Air ≥ US): apply 1–3 result instead.
• 10+ (US sum ≥ 2 greater): US wins large skirmish — replace 1 China Base with 2 Influence OR remove 1 Influence. +2 Tensions each on China/Japan/Australia/India. +1 China/Japan CT. +3 PA, +1 RWC, +2 Prestige, +1 Legacy. China Relations −3 boxes.
• 10+ (China sum ≥ 2 greater): China wins large skirmish — +2 China Influence in A/P. −1 US Alignment A/P. −5 PA, −1 RWC, −1 Prestige, −5 Legacy. China Relations −5 boxes.
• 10+ (close): brief skirmish — +2 Tensions each on China/Japan/ROK/Australia. China Relations −2 boxes.`,
          mutations: [{ kind: 'note', note: 'US player chooses Stand Down or Intervene, then resolve as detailed.' }],
        };
      },
    },
  },

  // ── H6 ──────────────────────────────────────────────────────────────────────
  {
    id: 'china.H6',
    section: 'H',
    title: 'H6 — Expand Influence in Central and South America',
    help: 'Roll d10 + Regional Alignment for Central America (if eligible) or South America.',
    inputs: [
      ...triggered(),
      {
        id: 'targetRegion',
        kind: 'enum',
        label: 'Which region to target?',
        options: [
          { value: 'ca', label: 'Central America (eligible: alignment < 7, 0–2 influence, S.America aligned ≥7 or ≥2 influence there)' },
          { value: 'sa', label: 'South America (alignment < 7)' },
          { value: 'none', label: 'Neither eligible — skip' },
        ],
      },
      {
        id: 'regionAlignment',
        kind: 'int',
        label: 'US Regional Alignment of target region',
        min: 1,
        max: 10,
      },
    ],
    dice: [
      {
        id: 'h6Roll',
        kind: 'd10',
        label: 'Latin America expansion roll',
        drms: [{ label: 'Regional Alignment', value: (ctx) => Number(ctx.inputs.regionAlignment) }],
        cap: { min: 0, max: 10 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'china.H6.skip', summary: 'H6 skipped.', consumesAction: false };
        }
        const region = String(ctx.inputs.targetRegion);
        if (region === 'none') {
          return { id: 'china.H6.none', summary: 'H6 — no eligible region.', consumesAction: false };
        }
        const name = region === 'ca' ? 'Central America' : 'South America';
        const roll = ctx.dice['h6Roll'];
        if (roll.modified <= 10) {
          return {
            id: 'china.H6.expand',
            summary: `China expands in ${name} — place 1 China Influence.`,
            mutations: [{ kind: 'place', target: `China Influence in ${name}` }],
          };
        }
        return { id: 'china.H6.fail', summary: `Expansion in ${name} fails (roll ${roll.modified} > 10).` };
      },
    },
  },

  // ── H7 ──────────────────────────────────────────────────────────────────────
  {
    id: 'china.H7',
    section: 'H',
    title: 'H7 — Veto UN Sanctions',
    help: 'If "UN Sanctions" counter on NK or Iran, China vetoes renewal. Priority: NK → Iran.',
    inputs: [
      ...triggered(),
      {
        id: 'sanctionTarget',
        kind: 'enum',
        label: 'Which country has UN Sanctions?',
        options: [
          { value: 'nk', label: 'North Korea (remove NK UN Sanctions)' },
          { value: 'iran', label: 'Iran (remove Iran UN Sanctions)' },
          { value: 'none', label: 'Neither — skip' },
        ],
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'china.H7.skip', summary: 'H7 skipped.', consumesAction: false };
        }
        const target = String(ctx.inputs.sanctionTarget);
        if (target === 'none') {
          return { id: 'china.H7.none', summary: 'No UN Sanctions to veto.', consumesAction: false };
        }
        const name = target === 'nk' ? 'North Korea' : 'Iran';
        return {
          id: 'china.H7.veto',
          summary: `China vetoes UN Sanctions renewal on ${name} — remove the UN Sanctions counter.`,
          mutations: [{ kind: 'remove', target: `UN Sanctions on ${name}` }],
        };
      },
    },
  },

  // ── H8 ──────────────────────────────────────────────────────────────────────
  {
    id: 'china.H8',
    section: 'H',
    title: 'H8 — Oil Partnerships',
    help: 'Roll d10 → target region. Place 1 China Influence there, then make a Regional Alignment Check (D18). Fail = "Trending Anti-US" in that region.',
    inputs: triggered(),
    dice: [
      { id: 'h8Target', kind: 'd10', label: 'Target region roll' },
      { id: 'h8d18a', kind: 'd10', label: 'Alignment Check die 1 (D18)' },
      { id: 'h8d18b', kind: 'd10', label: 'Alignment Check die 2 (D18)' },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'china.H8.skip', summary: 'H8 skipped.', consumesAction: false };
        }
        const target = ctx.dice['h8Target'].modified;
        const region = target <= 3 ? 'South America' : target <= 6 ? 'Africa' : 'Middle East';
        const d18 = ctx.dice['h8d18a'].sum + ctx.dice['h8d18b'].sum;

        // D18 Regional Alignment Check: pass if d18 ≤ alignment (players reads alignment from board)
        // Since we don't have alignment in inputs here, we show the raw roll
        return {
          id: 'china.H8.result',
          summary: `Oil Partnership — place 1 China Influence in ${region}. D18 Alignment Check = ${d18}.`,
          detail: `Compare ${d18} to the ${region} US Alignment value. If D18 > Alignment: place "Trending Anti-US" in ${region}.`,
          mutations: [
            { kind: 'place', target: `China Influence in ${region}` },
            { kind: 'note', note: `D18 = ${d18}. If > ${region} Alignment → place "Trending Anti-US" in ${region}.` },
          ],
        };
      },
    },
  },

  // ── H9 ──────────────────────────────────────────────────────────────────────
  {
    id: 'china.H9',
    section: 'H',
    title: 'H9 — Test Cyberwar Against US Economy',
    help: 'Trigger: China Posture 2 AND Relations ≤ 4. Make a US Homeland Security Check (D18) with DRMs.',
    inputs: [
      ...triggered('Does H9 trigger? (Posture 2 AND Relations ≤ 4)'),
      {
        id: 'usCyberAdv',
        kind: 'bool',
        label: 'US Cyber Strategic Capability > China\'s? (−1 DRM)',
      },
      {
        id: 'cyberBillPassed',
        kind: 'bool',
        label: 'Has the US Cyber Security Legislation been passed? (−1 DRM)',
      },
      {
        id: 'greaterSocietyBills',
        kind: 'int',
        label: 'Number of "National Security/Defense Greater Society" bills passed (−2 DRM each)',
        min: 0,
        max: 3,
      },
    ],
    dice: [
      {
        id: 'h9d18a',
        kind: 'd10',
        label: 'Homeland Security Check die 1 (D18)',
        drms: [
          { label: 'Unknown Chinese tech (+1 to all)', value: () => 1 },
          { label: 'US Cyber > China (−1)', value: (ctx) => (ctx.inputs.usCyberAdv === true || ctx.inputs.usCyberAdv === 'true' ? -1 : 0) },
          { label: 'Cyber Security Bill (−1)', value: (ctx) => (ctx.inputs.cyberBillPassed === true || ctx.inputs.cyberBillPassed === 'true' ? -1 : 0) },
          { label: 'Greater Society Bills (−2 each)', value: (ctx) => -2 * Number(ctx.inputs.greaterSocietyBills) },
        ],
        cap: { min: -3, max: 3 },
      },
      { id: 'h9d18b', kind: 'd10', label: 'Homeland Security Check die 2 (D18)' },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'china.H9.skip', summary: 'H9 skipped.', consumesAction: false };
        }

        const die1 = ctx.dice['h9d18a'];
        const die2 = ctx.dice['h9d18b'];
        const modified = die1.modified + die2.sum;

        // Place 2 Tensions on China and Trending Anti-US regardless
        const base = [
          { id: 'china.H9.setup', summary: 'China tests cyberwar — place 2 Tensions on China and "Trending Anti-US" on China Relations Track.', mutations: [{ kind: 'place' as const, target: '2 Tensions on China' }, { kind: 'place' as const, target: 'Trending Anti-US on China Relations Track' }], consumesAction: false },
        ];

        if (modified <= 0) {
          return [
            ...base,
            {
              id: 'china.H9.counterattack',
              summary: 'Top Secret US Cyber-Sec mitigates attack & counterattacks — −1 China SoE. −1 China Relative Strength vs Japan AND vs India. China Relations −2 boxes.',
              mutations: [
                { kind: 'shift', target: 'China SoE', amount: -1 },
                { kind: 'note', note: '−1 China Relative Strength on China/Japan CT and China/India CT. China Relations −2 boxes.' },
              ],
            },
          ];
        }

        // D18 vs Homeland Security — the check uses the total vs US HS track value (not shown in inputs)
        // We show the raw and let the player compare
        return [
          ...base,
          {
            id: 'china.H9.check',
            summary: `D18 Homeland Security Check = ${modified} (die1 modified + die2 raw). Compare to US Homeland Security track value.`,
            detail: `Pass (modified ≤ HS value): "Worsening Economy" on US SoE; −2 Public Approval; +1 more Tension on China; China Relations −1 box.
Fail (modified > HS value): −1 US SoE; −5 Public Approval; −1 RWC; −1 Homeland Security track. +2 Tensions on China. If Cyber Security Bill not in Congress, introduce it as Opposition Legislation. China Relations −2 boxes.`,
            mutations: [{ kind: 'note', note: `D18 check = ${modified}. Apply Pass or Fail result vs Homeland Security track.` }],
          },
        ];
      },
    },
  },

  // ── H10 ─────────────────────────────────────────────────────────────────────
  {
    id: 'china.H10',
    section: 'H',
    title: 'H10 — Prepare for War',
    help: 'Skip if Relations 4–5 or already attempted this turn. Provoke the country with the higher Conflict Track (India or Japan). Ties → India.',
    inputs: [
      ...triggered('Does H10 trigger? (Relations ≤ 3, not already attempted)'),
      {
        id: 'target',
        kind: 'enum',
        label: 'Which country to provoke? (higher Conflict Track with China; ties → India)',
        options: [
          { value: 'india', label: 'India (China/India Conflict Track is higher or tied)' },
          { value: 'japan', label: 'Japan (China/Japan Conflict Track is higher)' },
        ],
      },
      {
        id: 'chinaRelativeStrength',
        kind: 'enum',
        label: 'China Relative Strength vs the target country',
        options: [
          { value: 'china_lt2', label: 'China Relative Strength < 2 greater than target (build military path)' },
          { value: 'china_ge2', label: 'China Relative Strength ≥ 2 greater than target (probe/provoke path)' },
        ],
      },
      {
        id: 'chinaInfluenceInRegion',
        kind: 'int',
        label: 'China Influence in the target region (DRM on probe roll)',
        min: 0,
        help: 'C/S Asia influence for India; A/P influence for Japan.',
      },
    ],
    dice: [
      {
        id: 'h10Roll',
        kind: 'd10',
        label: 'Provoke roll (d10 − China Influence in region)',
        drms: [
          { label: 'China Influence in region (−1 each)', value: (ctx) => -Number(ctx.inputs.chinaInfluenceInRegion) },
        ],
        cap: { min: -5, max: 0 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        if (String(ctx.inputs.triggered) === 'no') {
          return { id: 'china.H10.skip', summary: 'H10 skipped.', consumesAction: false };
        }

        const target = String(ctx.inputs.target);
        const targetName = target === 'india' ? 'India' : 'Japan';
        const ctName = target === 'india' ? 'China/India' : 'China/Japan';
        const regionName = target === 'india' ? 'C/S Asia' : 'Asia/Pacific';
        const strength = String(ctx.inputs.chinaRelativeStrength);

        if (strength === 'china_lt2') {
          return {
            id: 'china.H10.build',
            summary: `China builds military — +1 ${ctName} Conflict Track in China's favor. +1 Regional Crises in ${regionName}.`,
            mutations: [
              { kind: 'shift', target: `${ctName} Conflict Track (Relative Strength)`, amount: 1 },
              { kind: 'shift', target: `${regionName} Regional Crises`, amount: 1 },
            ],
          };
        }

        const roll = ctx.dice['h10Roll'];
        const m = roll.modified;

        if (m <= 3) {
          return {
            id: 'china.H10.probe.no_response',
            summary: `Economic/political considerations — ${targetName} can't respond. +1 China Influence in ${regionName}. +1 Tension each on China and ${targetName}.`,
            mutations: [
              { kind: 'place', target: `China Influence in ${regionName}` },
              { kind: 'place', target: `1 Tension on China` },
              { kind: 'place', target: `1 Tension on ${targetName}` },
            ],
          };
        }

        if (m <= 6) {
          return {
            id: 'china.H10.probe.response',
            summary: `Limited ${targetName}/US response dissuades China. +1 ${targetName} Relative Strength on ${ctName} CT. +1 Tension each on ${targetName} and China.`,
            mutations: [
              { kind: 'shift', target: `${ctName} Conflict Track (${targetName} favor)`, amount: 1 },
              { kind: 'place', target: `1 Tension on ${targetName}` },
              { kind: 'place', target: `1 Tension on China` },
            ],
          };
        }

        if (m <= 8) {
          return {
            id: 'china.H10.probe.flare',
            summary: `Tensions Flare — +1 ${ctName} CT. +2 Tensions each on China and ${targetName}. +1 Regional Crises in ${regionName}. "Trending Anti-US" on China Relations.`,
            mutations: [
              { kind: 'shift', target: `${ctName} Conflict Track`, amount: 1 },
              { kind: 'place', target: `2 Tensions on China` },
              { kind: 'place', target: `2 Tensions on ${targetName}` },
              { kind: 'shift', target: `${regionName} Regional Crises`, amount: 1 },
              { kind: 'place', target: 'Trending Anti-US on China Relations' },
            ],
          };
        }

        // 9–10 — potential war
        return {
          id: 'china.H10.war_check',
          summary: `⚠ Possible China/${targetName} War — check: if ${ctName} CT ≤ 3 OR China Relations ≥ 3, treat as 7–8 result. Otherwise: CHINA ATTACKS ${targetName.toUpperCase()}. Proceed to War Resolution.`,
          detail: `China/${targetName} War Resolution — score 10 superiority areas:
(1–7) Each of 7 Strategic Capability comparisons (China > US = China superiority)
(8) ${ctName} Conflict Track Relative Strength
(9) China Influence vs US Military Assets in ${regionName} (do NOT count Carriers / Marines in CVBG Deployment Zones)
(10) Pacific Ally Cohesion: Japan+Australia+ROK all Very Close AND ${regionName} Stability ≥ 5 = US superiority; else China

If US superior in ≥ 6 of 10: China sues for peace. Game continues. (See rules for full effects.)
If China superior in ≥ 6 of 10 (or ≥ 5 with +2 Relative Strength advantage): AUTOMATIC US LOSS.
Otherwise: prolonged bloodletting. Game continues. (See rules for full effects.)`,
          mutations: [{ kind: 'note', note: `Check ${ctName} CT ≤ 3 or Relations ≥ 3 first. If not: score 10 superiority areas to determine war outcome.` }],
        };
      },
    },
  },
];
