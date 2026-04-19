export type USRelationLevel = 1 | 2 | 3 | 4 | 5;
export type USRelationTrend = 'antiUS' | 'none' | 'proUS';

export interface USRelation {
  level: USRelationLevel;
  trend: USRelationTrend;
}

export const US_RELATION_LABELS: Record<USRelationLevel, string> = {
  1: 'Cold War Adversaries',
  2: 'Distrust',
  3: 'Neutral',
  4: 'Trading Partners',
  5: 'Friends & Partners',
};

export const US_RELATION_TREND_LABEL: Record<USRelationTrend, string> = {
  antiUS: 'Anti-US Trend',
  none:   '',
  proUS:  'Pro-US Trend',
};

export const US_RELATION_TREND_SYMBOL: Record<USRelationTrend, string> = {
  antiUS: '↓',
  none:   '',
  proUS:  '↑',
};

export const DEFAULT_US_RELATION: USRelation = { level: 3, trend: 'none' };
