import type { Step } from '@/lib/procedures/types';
import { CAPABILITY_KEYS, CAPABILITY_LABELS } from '@/lib/procedures/capabilities';
import type { CapabilityTracks, CapabilityKey } from '@/lib/procedures/capabilities';
import { US_RELATION_LABELS, type USRelationLevel, type USRelationTrend } from '@/lib/procedures/usRelation';

export const stepsSetup: Step[] = [
  {
    id: 'china.SETUP',
    section: 'SETUP',
    title: 'Setup — Capability Tracks & US Relation',
    help: 'Enter China and US capability track levels (1–7) and the current China–US Relation level and trend.',
    inputs: [
      ...CAPABILITY_KEYS.map((k) => ({
        id: `cap_${k}`,
        kind: 'capRow' as const,
        label: CAPABILITY_LABELS[k],
        factionId: `faction_${k}`,
        usId: `us_${k}`,
        min: 1,
        max: 7,
      })),
      {
        id: 'usRelationLevel',
        kind: 'enum' as const,
        label: 'China–US Relation Level',
        options: ([1, 2, 3, 4, 5] as USRelationLevel[]).map((v) => ({
          value: String(v),
          label: `${v} — ${US_RELATION_LABELS[v]}`,
        })),
      },
      {
        id: 'usRelationTrend',
        kind: 'enum' as const,
        label: 'Trend Marker',
        options: [
          { value: 'none',   label: 'None' },
          { value: 'antiUS', label: 'Anti-US Trend ↓' },
          { value: 'proUS',  label: 'Pro-US Trend ↑' },
        ],
      },
    ],
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
        const level   = Number(ctx.inputs['usRelationLevel'] ?? 3) as USRelationLevel;
        const trend   = (ctx.inputs['usRelationTrend'] ?? 'none') as USRelationTrend;
        return {
          id: 'china.SETUP.done',
          summary: `Capability tracks and US Relation recorded (${US_RELATION_LABELS[level]}).`,
          mutations: [
            { kind: 'set', target: 'capabilityTracks', value: tracks },
            { kind: 'set', target: 'usRelation',        value: { level, trend } },
          ],
        };
      },
    },
  },
];
