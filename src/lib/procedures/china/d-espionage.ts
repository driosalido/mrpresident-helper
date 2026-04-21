import type { Step } from '@/lib/procedures/types';
import { deriveCyberAdvD, cyberDrmD, capFromSelectionRoll, CAPABILITY_LABELS } from '@/lib/procedures/capabilities';
import type { CapabilityTracks } from '@/lib/procedures/capabilities';

// Section D — Espionage (China)
// Same DRM table as Russia. 12+ branch: remove Influence from A/P and C/SA (not Eurozone/EE).
// China/Japan Conflict Track shifts instead of Russia/NATO.

export const stepsD: Step[] = [
  {
    id: 'china.D',
    section: 'D',
    title: 'Espionage',
    help: '1 attempt (2 if Relations ≤ 2 AND Posture 2). Roll d10 with DRMs → 6-band result.',
    inputs: [
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
        label: '"+2 DRM to Next Espionage" counter on China?',
      },
      {
        id: 'hasRemainderDRM',
        kind: 'bool',
        label: '"+2 DRM for Espionage Remainder of Game" counter on China?',
      },
    ],
    repeat: {
      count: (ctx) =>
        Number((ctx.sharedState['usRelation'] as { level?: number } | undefined)?.level ?? 3) <= 2 && String(ctx.sharedState['posture'] ?? '1') === '2' ? 2 : 1,
      label: 'Espionage Attempt',
    },
    dice: [
      {
        id: 'espRoll',
        kind: 'd10',
        label: 'Espionage roll',
        drms: [
          {
            label: 'China Cyber advantage/disadvantage',
            value: (ctx) => {
              const tracks = ctx.sharedState['capabilityTracks'] as CapabilityTracks | undefined;
              if (!tracks) return 0;
              return cyberDrmD(deriveCyberAdvD(tracks.faction.cyber, tracks.us.cyber));
            },
          },
          { label: 'US ally Estranged (−2)', value: (ctx) => (ctx.inputs.allyEstranged === true || ctx.inputs.allyEstranged === 'true' ? -2 : 0) },
          { label: 'US ally not Very Close (−1)', value: (ctx) => (ctx.inputs.allyNotVeryClose === true || ctx.inputs.allyNotVeryClose === 'true' ? -1 : 0) },
          { label: '+2 DRM next espionage', value: (ctx) => (ctx.inputs.hasNextEspDRM === true || ctx.inputs.hasNextEspDRM === 'true' ? +2 : 0) },
          { label: '+2 DRM remainder of game', value: (ctx) => (ctx.inputs.hasRemainderDRM === true || ctx.inputs.hasRemainderDRM === 'true' ? +2 : 0) },
        ],
        cap: { min: -3, max: 3 },
      },
      { id: 'capRoll', kind: 'd10', label: 'Capability selection (auto)' },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const m = ctx.dice['espRoll'].modified;
        if (m <= 0 || m <= 3) {
          const capRollVal = ctx.dice['capRoll'].modified;
          const pickedCap = capFromSelectionRoll(capRollVal);
          const tracks = ctx.sharedState['capabilityTracks'] as CapabilityTracks | undefined;
          const beforeVal = tracks?.faction[pickedCap] ?? 1;
          const afterVal = Math.min(7, beforeVal + 1);
          const newTracks = tracks
            ? { faction: { ...tracks.faction, [pickedCap]: afterVal }, us: tracks.us }
            : undefined;

          if (m <= 0) {
            return {
              id: 'china.D.major',
              summary: `Thwart US Counter-Intel & Steal Tech — rolled ${capRollVal} → ${CAPABILITY_LABELS[pickedCap]} advanced.`,
              detail: 'Remove "+2 DRM Remainder" if present.',
              stateChanges: [{ label: CAPABILITY_LABELS[pickedCap], from: String(beforeVal), to: String(afterVal) }],
              mutations: newTracks ? [{ kind: 'set' as const, target: 'capabilityTracks', value: newTracks }] : [],
            };
          }
          return {
            id: 'china.D.steal',
            summary: `Steal Technology — rolled ${capRollVal} → ${CAPABILITY_LABELS[pickedCap]} advanced.`,
            stateChanges: [{ label: CAPABILITY_LABELS[pickedCap], from: String(beforeVal), to: String(afterVal) }],
            mutations: newTracks ? [{ kind: 'set' as const, target: 'capabilityTracks', value: newTracks }] : [],
          };
        }
        if (m <= 7) {
          return {
            id: 'china.D.warplans',
            summary: 'Steal Military Secrets / War Plans.',
            detail: '(a) Increase strength of any Adversary in a US War by 2. (b) Or Ally/US-Supported War by 2. (c) Or +1 box on China/Japan Conflict Track in China\'s favor (else China/India).',
            mutations: [{ kind: 'note', note: 'Apply best available: US War Adversary +2 → Ally War → China/Japan or China/India CT +1.' }],
          };
        }
        if (m <= 9) {
          return { id: 'china.D.fail', summary: 'Failure — no effect.' };
        }
        if (m <= 11) {
          return {
            id: 'china.D.exposed',
            summary: 'Failure exposes Chinese Cyber/Intel.',
            detail: 'Place DARPA/Rapid Capabilities counter on Cyber Warfare Track (if available). Place "+2 DRM to Next Espionage" on China.',
            mutations: [
              { kind: 'place', target: 'DARPA/Rapid Capabilities on Cyber Warfare Track' },
              { kind: 'place', target: '+2 DRM to Next Espionage (China)' },
            ],
          };
        }
        // 12+
        return {
          id: 'china.D.network',
          summary: 'US Counter-Intel identifies major Chinese Cyber Espionage Network.',
          detail: 'Place "Trending Anti-US" on China Relations Track. US player chooses:\n(a) Apprehend: remove 1 China Influence from Asia/Pacific AND 1 from C/S Asia; "−1 AP" on China; "+2 DRM to Next Espionage" on China.\n(b) Counter-Intel treasure: −1 China Cyber Warfare; +1 Japan Relative Strength on China/Japan CT; "+2 DRM Remainder of Game" on China.',
          mutations: [{ kind: 'place', target: 'Trending Anti-US on China Relations Track' }],
        };
      },
    },
  },
];
