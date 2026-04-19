import type { Step } from '@/lib/procedures/types';
import { CAPABILITY_KEYS, CAPABILITY_LABELS } from '@/lib/procedures/capabilities';
import type { CapabilityTracks, CapabilityKey } from '@/lib/procedures/capabilities';

export const stepsSetup: Step[] = [
  {
    id: 'china.SETUP',
    section: 'SETUP',
    title: 'Setup — Capability Track Levels',
    help: 'Enter the current track levels (1–7) for China and the US across all 7 Strategic Capabilities, plus any Sanctions markers.',
    inputs: [
      ...CAPABILITY_KEYS.map((k) => ({
        id: `faction_${k}`,
        kind: 'int' as const,
        label: `China — ${CAPABILITY_LABELS[k]}`,
        min: 1,
        max: 7,
      })),
      ...CAPABILITY_KEYS.map((k) => ({
        id: `us_${k}`,
        kind: 'int' as const,
        label: `US — ${CAPABILITY_LABELS[k]}`,
        min: 1,
        max: 7,
      })),
      ...CAPABILITY_KEYS.map((k) => ({
        id: `sanctions_${k}`,
        kind: 'bool' as const,
        label: `Sanctions marker on China ${CAPABILITY_LABELS[k]}?`,
      })),
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const tracks: CapabilityTracks = {
          faction: {} as Record<CapabilityKey, number>,
          us:      {} as Record<CapabilityKey, number>,
          sanctions: {} as Record<CapabilityKey, boolean>,
        };
        for (const k of CAPABILITY_KEYS) {
          tracks.faction[k]   = Number(ctx.inputs[`faction_${k}`] ?? 1);
          tracks.us[k]        = Number(ctx.inputs[`us_${k}`] ?? 1);
          tracks.sanctions[k] = ctx.inputs[`sanctions_${k}`] === true || ctx.inputs[`sanctions_${k}`] === 'true';
        }
        return {
          id: 'china.SETUP.done',
          summary: 'Capability tracks recorded.',
          mutations: [{ kind: 'set', target: 'capabilityTracks', value: tracks }],
        };
      },
    },
  },
];
