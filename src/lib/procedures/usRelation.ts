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

export interface TrendMarkerResult {
  rel: USRelation;
  cancelledAnti: number;  // pending Anti-US tokens removed by incoming Pro-US
  cancelledPro: number;   // pending Pro-US tokens removed by incoming Anti-US
}

/**
 * Apply accumulated trend markers to a USRelation.
 * Opposite markers cancel 1-for-1 first, then every 2 same-kind markers move the level.
 */
export function applyTrendMarkers(
  rel: USRelation,
  addAntiUS: number,
  addProUS: number,
): TrendMarkerResult {
  let antiUS = rel.pendingAntiUS + addAntiUS;
  let proUS  = rel.pendingProUS + addProUS;

  // Cancel opposites 1-for-1 before pairing.
  const cancel = Math.min(antiUS, proUS);
  antiUS -= cancel;
  proUS  -= cancel;

  // Attribute cancellation to whichever side was ADDED this call.
  const cancelledAnti = Math.min(cancel, addProUS);
  const cancelledPro  = Math.min(cancel, addAntiUS);

  let level = rel.level as number;

  const antiPairs = Math.floor(antiUS / 2);
  antiUS = antiUS % 2;
  level = Math.max(1, level - antiPairs);

  const proPairs = Math.floor(proUS / 2);
  proUS = proUS % 2;
  level = Math.min(5, level + proPairs);

  return {
    rel: { level: level as USRelationLevel, pendingAntiUS: antiUS, pendingProUS: proUS },
    cancelledAnti,
    cancelledPro,
  };
}
