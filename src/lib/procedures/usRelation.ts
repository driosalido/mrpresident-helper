export type USRelationLevel = 1 | 2 | 3 | 4 | 5;

export interface USRelation {
  level: USRelationLevel;
  pendingAntiUS: number;
  pendingProUS: number;
}

export const US_RELATION_LABELS: Record<USRelationLevel, string> = {
  1: 'Cold War Adversaries',
  2: 'Distrust',
  3: 'Neutral',
  4: 'Trading Partners',
  5: 'Friends & Partners',
};

export const DEFAULT_US_RELATION: USRelation = { level: 3, pendingAntiUS: 0, pendingProUS: 0 };

/**
 * Apply accumulated trend markers to a USRelation.
 * Every 2 anti-US markers reduce the level by 1; every 2 pro-US markers raise it.
 */
export function applyTrendMarkers(
  rel: USRelation,
  addAntiUS: number,
  addProUS: number,
): USRelation {
  let antiUS = rel.pendingAntiUS + addAntiUS;
  let proUS = rel.pendingProUS + addProUS;
  let level = rel.level as number;

  const antiPairs = Math.floor(antiUS / 2);
  antiUS = antiUS % 2;
  level = Math.max(1, level - antiPairs);

  const proPairs = Math.floor(proUS / 2);
  proUS = proUS % 2;
  level = Math.min(5, level + proPairs);

  return { level: level as USRelationLevel, pendingAntiUS: antiUS, pendingProUS: proUS };
}
