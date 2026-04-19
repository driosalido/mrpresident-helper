import type { Step } from '@/lib/procedures/types';

// Section C — Improve Strategic Capabilities
// 2 attempts if Posture 1, 3 if Posture 2.
// Roll d10 (+1 DRM per Sanctions counter). Success if modified ≤ threshold (4 at P1, 5 at P2).
// Selection hierarchy: areas trailing US by ≥2 first, then Cyber + Missiles, then random.

const CAPABILITIES = [
  'Cyber Warfare',
  'Strategic Missiles / Missile Defense',
  'Naval Forces Training & Tech',
  'Space Warfare',
  'Strategic Recon / Intel',
  'Air Warfare',
  'Ground Warfare',
];

export const stepsC: Step[] = [
  {
    id: 'russia.C',
    section: 'C',
    title: 'Improve Strategic Capabilities',
    help: 'Russia makes 2 attempts (Posture 1) or 3 attempts (Posture 2) to advance a Strategic Capability. Roll d10 +1 per Sanctions counter. Success ≤ 4 (P1) or ≤ 5 (P2). Hierarchy: trailing areas → Cyber + Missiles → random.',
    inputs: [
      {
        id: 'sanctionsCount',
        kind: 'int',
        label: 'Sanctions counters on Russia',
        min: 0,
        max: 5,
        help: '+1 DRM per counter (makes success harder).',
      },
      {
        id: 'targetCapability',
        kind: 'enum',
        label: 'Which Capability is Russia attempting to improve?',
        help: 'Follow the selection hierarchy: areas trailing US by ≥2 boxes first, then Cyber/Missiles, then random.',
        options: CAPABILITIES.map((c) => ({ value: c, label: c })),
      },
    ],
    repeat: {
      count: (ctx) => (String(ctx.sharedState['posture'] ?? '1') === '2' ? 3 : 2),
      label: 'Capability Attempt',
    },
    dice: [
      {
        id: 'stratRoll',
        kind: 'd10',
        label: 'Capability improvement roll',
        drms: [
          {
            label: 'Sanctions (+1 per counter)',
            value: (ctx) => Number(ctx.inputs.sanctionsCount),
          },
        ],
        cap: { min: -3, max: 3 },
      },
    ],
    resolution: {
      kind: 'custom',
      resolve: (ctx) => {
        const posture = String(ctx.sharedState['posture'] ?? '1');
        const threshold = posture === '2' ? 5 : 4;
        const capability = String(ctx.inputs.targetCapability);
        const roll = ctx.dice['stratRoll'];

        if (roll.modified <= threshold) {
          return {
            id: 'russia.C.success',
            summary: `Success! Advance Russia's "${capability}" track by 1 box.`,
            detail: `Roll: ${roll.sum} (raw) + ${roll.drmTotal} (DRM) = ${roll.modified} ≤ ${threshold}.`,
            mutations: [{ kind: 'shift', target: capability, amount: 1 }],
          };
        }

        return {
          id: 'russia.C.fail',
          summary: `No advance on "${capability}" this attempt.`,
          detail: `Roll: ${roll.sum} (raw) + ${roll.drmTotal} (DRM) = ${roll.modified} > ${threshold}.`,
        };
      },
    },
  },
];
