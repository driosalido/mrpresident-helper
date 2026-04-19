import type { Step } from '@/lib/procedures/types';
import { CAPABILITY_KEYS, CAPABILITY_LABELS } from '@/lib/procedures/capabilities';
import type { CapabilityTracks, CapabilityKey } from '@/lib/procedures/capabilities';

export const stepsSetup: Step[] = [
  {
    id: 'china.SETUP',
    section: 'SETUP',
    title: 'Setup — Capability Track Levels',
    help: 'Enter the current track levels (1–7) for China and the US across all 7 Strategic Capabilities.',
    inputs: CAPABILITY_KEYS.map((k) => ({
      id: `cap_${k}`,
      kind: 'capRow' as const,
      label: CAPABILITY_LABELS[k],
      factionId: `faction_${k}`,
      usId: `us_${k}`,
      min: 1,
      max: 7,
    })),
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const tracks: CapabilityTracks = {
          faction: {} as Record<CapabilityKey, number>,
          us:      {} as Record<CapabilityKey, number>,
        };
        for (const k of CAPABILITY_KEYS) {
          tracks.faction[k] = Number(ctx.inputs[`faction_${k}`] ?? 1);
          tracks.us[k]      = Number(ctx.inputs[`us_${k}`]      ?? 1);
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
