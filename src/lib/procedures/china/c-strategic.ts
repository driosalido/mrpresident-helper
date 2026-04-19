import type { Step } from '@/lib/procedures/types';

// Section C — Improve Strategic Capabilities (China)
// Same structure as Russia's, but priority pair is Cyber Warfare + Naval Forces T&T
// (instead of Russia's Cyber + Missiles).

const CAPABILITIES = [
  'Cyber Warfare',
  'Naval Forces Training & Tech',
  'Strategic Missiles / Missile Defense',
  'Space Warfare',
  'Strategic Recon / Intel',
  'Air Warfare',
  'Ground Warfare',
];

export const stepsC: Step[] = [
  {
    id: 'china.C',
    section: 'C',
    title: 'Improve Strategic Capabilities',
    help: '2 attempts (Posture 1) or 3 attempts (Posture 2). Roll d10 +1 per Sanctions. Success ≤ 4 (P1) or ≤ 5 (P2). Priority: trailing areas → Cyber + Naval → random.',
    inputs: [
      {
        id: 'sanctionsCount',
        kind: 'int',
        label: 'Sanctions counters on China',
        min: 0,
        max: 5,
        help: '+1 DRM per counter (makes success harder).',
      },
      {
        id: 'targetCapability',
        kind: 'enum',
        label: 'Which Capability is China attempting to improve?',
        help: 'Follow hierarchy: areas trailing US by ≥2 boxes → Cyber/Naval → random.',
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
        const threshold = String(ctx.sharedState['posture'] ?? '1') === '2' ? 5 : 4;
        const capability = String(ctx.inputs.targetCapability);
        const roll = ctx.dice['stratRoll'];
        if (roll.modified <= threshold) {
          return {
            id: 'china.C.success',
            summary: `Success! Advance China's "${capability}" track by 1 box.`,
            detail: `Roll: ${roll.sum} + DRM ${roll.drmTotal} = ${roll.modified} ≤ ${threshold}.`,
            mutations: [{ kind: 'shift', target: capability, amount: 1 }],
          };
        }
        return {
          id: 'china.C.fail',
          summary: `No advance on "${capability}" this attempt.`,
          detail: `Roll: ${roll.sum} + DRM ${roll.drmTotal} = ${roll.modified} > ${threshold}.`,
        };
      },
    },
  },
];
