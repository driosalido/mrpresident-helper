export const CAPABILITY_KEYS = [
  'airForce', 'groundForces', 'navalForces',
  'cyber', 'space', 'strategicMissiles', 'recon',
] as const;

export type CapabilityKey = typeof CAPABILITY_KEYS[number];

export const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  airForce:         'Air Force Training & Tech',
  groundForces:     'Ground Forces Training & Tech',
  navalForces:      'Naval Forces Training & Tech',
  cyber:            'Cyber Warfare',
  space:            'Space Warfare',
  strategicMissiles:'Strategic Missiles/Missile Defence',
  recon:            'Strategic Recon/Intel Gathering',
};

export interface CapabilityTracks {
  faction: Record<CapabilityKey, number>;   // 1–7
  us:      Record<CapabilityKey, number>;   // 1–7
  sanctions: Record<CapabilityKey, boolean>;
}

/** Priority-3 d10 selection table (1–10). */
export function capFromSelectionRoll(roll: number): CapabilityKey {
  if (roll === 1)       return 'airForce';
  if (roll === 2)       return 'groundForces';
  if (roll === 3)       return 'navalForces';
  if (roll <= 5)        return 'cyber';
  if (roll <= 7)        return 'space';
  if (roll <= 9)        return 'strategicMissiles';
  return 'recon';
}

// ─── Cyber-advantage derivations ─────────────────────────────────────────────

export type CyberAdvD  = 'faction_2plus' | 'faction_1' | 'equal' | 'us_1' | 'us_2plus';
export type CyberAdvH1 = 'faction_wins'  | 'equal'    | 'us_wins';

export function deriveCyberAdvD(factionCyber: number, usCyber: number): CyberAdvD {
  const delta = factionCyber - usCyber;
  if (delta >= 2)  return 'faction_2plus';
  if (delta === 1) return 'faction_1';
  if (delta === 0) return 'equal';
  if (delta === -1) return 'us_1';
  return 'us_2plus';
}

export function cyberDrmD(adv: CyberAdvD): number {
  switch (adv) {
    case 'faction_2plus': return -2;
    case 'faction_1':     return -1;
    case 'us_1':          return +1;
    case 'us_2plus':      return +2;
    default:              return 0;
  }
}

export function deriveCyberAdvH1(factionCyber: number, usCyber: number): CyberAdvH1 {
  if (factionCyber > usCyber)  return 'faction_wins';
  if (factionCyber === usCyber) return 'equal';
  return 'us_wins';
}
