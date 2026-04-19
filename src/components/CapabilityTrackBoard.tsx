'use client';

import { useState } from 'react';
import {
  CAPABILITY_KEYS,
  CAPABILITY_LABELS,
  CAPABILITY_PRIORITY_LABEL,
} from '@/lib/procedures/capabilities';
import type { CapabilityKey, CapabilityTracks } from '@/lib/procedures/capabilities';
import type { Faction } from '@/lib/procedures/types';

const FACTION_FLAG: Record<Faction, string> = { russia: '🇷🇺', china: '🇨🇳' };
const US_FLAG = '🇺🇸';

interface Props {
  tracks: CapabilityTracks;
  faction: Faction;
  onChange?: (next: CapabilityTracks) => void;
  compareTo?: CapabilityTracks;
}

type Peer = 'faction' | 'us';

interface BoxProps {
  cap: CapabilityKey;
  box: number;          // 1–7
  faction: Faction;
  factionVal: number;
  usVal: number;
  activePeer: Peer;
  editable: boolean;
  onClick?: () => void;
  // compare-to values
  prevFaction?: number;
  prevUs?: number;
}

function TrackBox({ cap, box, faction, factionVal, usVal, activePeer, editable, onClick, prevFaction, prevUs }: BoxProps) {
  const hasFaction = factionVal === box;
  const hasUs      = usVal === box;

  // Comparison highlighting (only shown when prevFaction/prevUs are provided)
  const factionMoved  = prevFaction !== undefined && prevFaction !== factionVal;
  const usMoved       = prevUs !== undefined && prevUs !== usVal;

  const factionBefore = prevFaction ?? factionVal;
  const usBefore      = prevUs ?? usVal;

  const factionAdvanced = factionMoved && factionVal > factionBefore;
  const factionDeclined = factionMoved && factionVal < factionBefore;
  const usAdvanced      = usMoved && usVal > usBefore;
  const usDeclined      = usMoved && usVal < usBefore;

  // Trail: box is between old and new position (inclusive of new)
  const inFactionTrail = factionMoved && box > factionBefore && box <= factionVal;
  const inFactionDropTrail = factionMoved && box < factionBefore && box >= factionVal;
  const inUsTrail      = usMoved && box > usBefore && box <= usVal;
  const inUsDropTrail  = usMoved && box < usBefore && box >= usVal;

  const bgClass =
    (inFactionTrail || inUsTrail) ? 'bg-green-50 dark:bg-green-950' :
    (inFactionDropTrail || inUsDropTrail) ? 'bg-red-50 dark:bg-red-950' :
    'bg-white dark:bg-gray-900';

  const ringClass =
    (hasFaction && factionAdvanced) || (hasUs && usAdvanced) ? 'ring-2 ring-green-400' :
    (hasFaction && factionDeclined) || (hasUs && usDeclined) ? 'ring-2 ring-red-400' :
    '';

  const hoverClass = editable
    ? activePeer === 'faction'
      ? 'hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer'
      : 'hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer'
    : '';

  const Tag = editable ? 'button' : 'div';

  return (
    <Tag
      type={editable ? 'button' : undefined}
      onClick={editable ? onClick : undefined}
      aria-label={editable ? `Set ${cap} to ${box}` : undefined}
      className={`relative flex flex-col items-center justify-between w-9 h-12 sm:w-10 sm:h-14 rounded border border-gray-200 dark:border-gray-700 text-xs select-none transition-colors ${bgClass} ${ringClass} ${hoverClass}`}
    >
      <span className="text-gray-400 dark:text-gray-500 leading-none pt-0.5">{box}</span>
      <div className="flex flex-col items-center gap-0.5 pb-0.5">
        {hasFaction && <span className="leading-none text-sm" title={FACTION_FLAG[faction]}>{FACTION_FLAG[faction]}</span>}
        {hasUs && <span className="leading-none text-sm" title={US_FLAG}>{US_FLAG}</span>}
      </div>
    </Tag>
  );
}

export function CapabilityTrackBoard({ tracks, faction, onChange, compareTo }: Props) {
  const [activePeer, setActivePeer] = useState<Peer>('faction');
  const editable = Boolean(onChange);

  const isRussia = faction === 'russia';
  const accentBtn = isRussia
    ? 'bg-red-600 text-white ring-red-500'
    : 'bg-amber-600 text-white ring-amber-500';
  const inactiveBtn = 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 ring-gray-300 dark:ring-gray-600';

  function handleBoxClick(cap: CapabilityKey, box: number) {
    if (!onChange) return;
    const next: CapabilityTracks = {
      faction: { ...tracks.faction },
      us:      { ...tracks.us },
    };
    next[activePeer][cap] = box;
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {editable && (
        <div className="flex items-center gap-2 text-xs mb-3">
          <span className="text-gray-500 dark:text-gray-400">Moving:</span>
          <div className="flex rounded-md overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700">
            <button
              type="button"
              onClick={() => setActivePeer('faction')}
              className={`px-3 py-1 font-medium transition-colors ${activePeer === 'faction' ? accentBtn : inactiveBtn}`}
            >
              {FACTION_FLAG[faction]} Faction
            </button>
            <button
              type="button"
              onClick={() => setActivePeer('us')}
              className={`px-3 py-1 font-medium transition-colors ${activePeer === 'us' ? 'bg-blue-600 text-white ring-blue-500' : inactiveBtn}`}
            >
              {US_FLAG} US
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {CAPABILITY_KEYS.map((cap) => {
          const factionVal = tracks.faction[cap];
          const usVal = tracks.us[cap];
          const prevFaction = compareTo?.faction[cap];
          const prevUs = compareTo?.us[cap];

          return (
            <div key={cap} className="flex items-center gap-2">
              <div className="w-36 sm:w-44 flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500 w-6 text-right shrink-0">
                  {CAPABILITY_PRIORITY_LABEL[cap]}
                </span>
                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                  {CAPABILITY_LABELS[cap]}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7].map((box) => (
                  <TrackBox
                    key={box}
                    cap={cap}
                    box={box}
                    faction={faction}
                    factionVal={factionVal}
                    usVal={usVal}
                    activePeer={activePeer}
                    editable={editable}
                    onClick={() => handleBoxClick(cap, box)}
                    prevFaction={prevFaction}
                    prevUs={prevUs}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
