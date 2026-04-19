import type { Step } from '@/lib/procedures/types';
import { CAPABILITY_KEYS, CAPABILITY_LABELS } from '@/lib/procedures/capabilities';
import type { CapabilityTracks, CapabilityKey } from '@/lib/procedures/capabilities';
import { US_RELATION_LABELS, type USRelationLevel } from '@/lib/procedures/usRelation';

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
      {
        id: 'posture',
        kind: 'enum' as const,
        label: 'China current Posture',
        options: [
          { value: '1', label: 'Posture 1 (passive)' },
          { value: '2', label: 'Posture 2 (aggressive)' },
        ],
      },
      {
        id: 'soe',
        kind: 'enum' as const,
        label: 'China State of the Economy (SoE)',
        options: [
          { value: '3', label: '3 — Recession' },
          { value: '4', label: '4 — Stagnation' },
          { value: '5', label: '5 — Recovery' },
          { value: '6', label: '6 — Peak Performance' },
          { value: '7', label: '7 — Peak Performance' },
        ],
      },
      {
        id: 'soeTrend',
        kind: 'enum' as const,
        label: 'SoE Trend Marker',
        options: [
          { value: 'none',      label: 'None' },
          { value: 'improving', label: 'Improving Economy ↑' },
          { value: 'worsening', label: 'Worsening Economy ↓' },
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
        const level = Number(ctx.inputs['usRelationLevel'] ?? 3) as USRelationLevel;
        const trendInput = String(ctx.inputs['usRelationTrend'] ?? 'none');
        const pendingAntiUS = trendInput === 'antiUS' ? 1 : 0;
        const pendingProUS  = trendInput === 'proUS'  ? 1 : 0;
        const posture = Number(ctx.inputs['posture'] ?? 1);
        const soe = Number(ctx.inputs['soe'] ?? 5);
        const soeTrend = String(ctx.inputs['soeTrend'] ?? 'none');
        return {
          id: 'china.SETUP.done',
          summary: `Capability tracks, US Relation (${US_RELATION_LABELS[level]}), SoE (${soe}), Posture ${posture} recorded.`,
          mutations: [
            { kind: 'set', target: 'capabilityTracks', value: tracks },
            { kind: 'set', target: 'usRelation', value: { level, pendingAntiUS, pendingProUS } },
            { kind: 'set', target: 'soe', amount: soe },
            { kind: 'set', target: 'soeTrend', value: soeTrend },
            { kind: 'set', target: 'posture', amount: posture },
          ],
        };
      },
    },
  },
];
