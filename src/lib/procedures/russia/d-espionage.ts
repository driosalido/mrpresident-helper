import type { Step } from '@/lib/procedures/types';

// Section D — Espionage
// 1 attempt normally; 2 attempts if Relations ≤ 2 AND Posture = 2.
// Roll d10 with DRMs → 6-band result table.

export const stepsD: Step[] = [
  {
    id: 'russia.D',
    section: 'D',
    title: 'Espionage',
    help: '1 attempt (2 if Relations ≤ 2 AND Posture 2). Roll d10 with DRMs. Results range from stealing tech to exposing a spy network.',
    inputs: [
      {
        id: 'posture',
        kind: 'enum',
        label: 'Russia current Posture',
        options: [
          { value: '1', label: 'Posture 1' },
          { value: '2', label: 'Posture 2' },
        ],
      },
      {
        id: 'relationsBox',
        kind: 'int',
        label: 'Russia/US Relations Track box (1–5)',
        min: 1,
        max: 5,
      },
      {
        id: 'russiaCyberAdv',
        kind: 'enum',
        label: 'Russia Cyber Warfare vs US Cyber Warfare',
        options: [
          { value: 'russia_2plus', label: 'Russia ≥ 2 boxes higher than US (−2 DRM)' },
          { value: 'russia_1',     label: 'Russia 1 box higher than US (−1 DRM)' },
          { value: 'equal',        label: 'Equal' },
          { value: 'us_1',         label: 'US 1 box higher than Russia (+1 DRM)' },
          { value: 'us_2plus',     label: 'US ≥ 2 boxes higher than Russia (+2 DRM)' },
        ],
      },
      {
        id: 'allyEstranged',
        kind: 'bool',
        label: 'Any US ally is currently Estranged? (−2 DRM)',
      },
      {
        id: 'allyNotVeryClose',
        kind: 'bool',
        label: 'Any US ally (except India/Gulf States) is NOT Very Close? (−1 DRM)',
      },
      {
        id: 'hasNextEspDRM',
        kind: 'bool',
        label: '"+2 DRM to Next Espionage" counter on Russia? (+2 DRM, remove after)',
      },
      {
        id: 'hasRemainderDRM',
        kind: 'bool',
        label: '"+2 DRM for Espionage Remainder of Game" counter on Russia? (+2 DRM)',
      },
    ],
    repeat: {
      count: (ctx) =>
        Number(ctx.inputs.relationsBox) <= 2 && String(ctx.inputs.posture) === '2' ? 2 : 1,
      label: 'Espionage Attempt',
    },
    dice: [
      {
        id: 'espRoll',
        kind: 'd10',
        label: 'Espionage roll',
        drms: [
          {
            label: 'Russia Cyber advantage/disadvantage',
            value: (ctx) => {
              switch (String(ctx.inputs.russiaCyberAdv)) {
                case 'russia_2plus': return -2;
                case 'russia_1':    return -1;
                case 'us_1':        return +1;
                case 'us_2plus':    return +2;
                default:            return 0;
              }
            },
          },
          {
            label: 'US ally Estranged',
            value: (ctx) =>
              ctx.inputs.allyEstranged === true || ctx.inputs.allyEstranged === 'true' ? -2 : 0,
          },
          {
            label: 'US ally not Very Close',
            value: (ctx) =>
              ctx.inputs.allyNotVeryClose === true || ctx.inputs.allyNotVeryClose === 'true' ? -1 : 0,
          },
          {
            label: '+2 DRM next espionage counter',
            value: (ctx) =>
              ctx.inputs.hasNextEspDRM === true || ctx.inputs.hasNextEspDRM === 'true' ? +2 : 0,
          },
          {
            label: '+2 DRM remainder of game counter',
            value: (ctx) =>
              ctx.inputs.hasRemainderDRM === true || ctx.inputs.hasRemainderDRM === 'true' ? +2 : 0,
          },
        ],
        cap: { min: -3, max: 3 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const roll = ctx.dice['espRoll'];
        const m = roll.modified;

        if (m <= 0) {
          return {
            id: 'russia.D.major',
            summary: 'Thwart US Counter-Intel & Steal Tech.',
            detail: 'If "+2 DRM Remainder of Game" counter exists, remove it. Roll d10 to pick a random Strategic Capability — advance Russia\'s rating in that area by 1 box.',
            mutations: [{ kind: 'note', note: 'Roll d10 for random capability → +1 box for Russia.' }],
          };
        }
        if (m <= 3) {
          return {
            id: 'russia.D.steal',
            summary: 'Steal Technology.',
            detail: 'Roll d10 to pick a random Strategic Capability — advance Russia\'s rating in that area by 1 box.',
            mutations: [{ kind: 'note', note: 'Roll d10 for random capability → +1 box for Russia.' }],
          };
        }
        if (m <= 7) {
          return {
            id: 'russia.D.warplans',
            summary: 'Steal Military Secrets / War Plans.',
            detail: '(a) If possible, increase the strength of any Adversary in a US War by 2. (b) Otherwise, increase strength of any Adversary in an Ally/US-Supported War by 2. (c) Otherwise, +1 box on Russia/NATO Conflict Track in Russia\'s favor.',
            mutations: [{ kind: 'note', note: 'Apply best available: Adversary in US War +2 strength → or Ally War +2 → or Russia/NATO +1.' }],
          };
        }
        if (m <= 9) {
          return {
            id: 'russia.D.fail',
            summary: 'Failure — no effect.',
          };
        }
        if (m <= 11) {
          return {
            id: 'russia.D.exposed',
            summary: 'Failure exposes Russian Cyber / Intel.',
            detail: 'Place a free "DARPA/Rapid Capabilities" counter on the Cyber Warfare Track (if available and not already there). Place "+2 DRM to Next Espionage" counter on Russia.',
            mutations: [
              { kind: 'place', target: 'DARPA/Rapid Capabilities on Cyber Warfare Track' },
              { kind: 'place', target: '+2 DRM to Next Espionage (Russia)' },
            ],
          };
        }
        // m >= 12
        return {
          id: 'russia.D.network',
          summary: 'US Counter-Intel identifies major Russian Cyber Espionage Network.',
          detail: 'Place "Trending Anti-US" on Russia Relations w/ US. US player chooses:\n(a) Apprehend & expose: remove 1 Russia Influence from Eurozone + 1 from Eastern Europe; place "−1 AP" on Russia; place "+2 DRM to Next Espionage" on Russia.\n(b) Counter-Intel treasure trove: Russia Cyber Warfare −1; Russia/NATO Relative Strength +1 in NATO\'s favor; place "+2 DRM for Espionage Remainder of Game" on Russia (if not already present).',
          mutations: [
            { kind: 'place', target: 'Trending Anti-US on Russia Relations Track' },
          ],
        };
      },
    },
  },
];
