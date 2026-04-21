// Domain types — the contract between procedure data files and the engine.
// The engine is faction-agnostic; all faction logic lives in the procedure data.

export type Faction = 'russia' | 'china';
export type EntryMode = 'regular' | 'crisis-chit';
export type Section = 'SETUP' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

// ─── Inputs ──────────────────────────────────────────────────────────────────

export type InputSpec =
  | { id: string; kind: 'enum'; label: string; options: { value: string; label: string }[]; help?: string }
  | { id: string; kind: 'int'; label: string; min?: number; max?: number; help?: string }
  | { id: string; kind: 'bool'; label: string; help?: string }
  | { id: string; kind: 'choice'; label: string; options: { value: string; label: string }[]; help?: string }
  | { id: string; kind: 'capRow'; label: string; factionId: string; usId: string; min?: number; max?: number };

export type Inputs = Record<string, string | number | boolean>;

// ─── Dice ─────────────────────────────────────────────────────────────────────

export type DieKind = 'd6' | 'd10' | '2d10';

export interface DrmTerm {
  label: string;
  value: number | ((ctx: StepCtx) => number);
}

export interface DiceSpec {
  id: string;
  kind: DieKind;
  label?: string;
  drms?: DrmTerm[];
  cap?: { min?: number; max?: number };
}

export interface DiceResult {
  id: string;
  kind: DieKind;
  label?: string;
  raw: number[];
  sum: number;
  drmsApplied: { label: string; value: number }[];
  drmTotal: number;
  modified: number;
}

// ─── Outcomes ─────────────────────────────────────────────────────────────────

export type MutationKind =
  | 'place' | 'remove' | 'shift' | 'set'
  | 'gainAP' | 'loseAP' | 'note'
  | 'autoLoss' | 'skipTo' | 'endProcedure' | 'consumeAction';

export interface Mutation {
  kind: MutationKind;
  target?: string;
  amount?: number;
  note?: string;
  value?: unknown;
}

import type { CapabilityKey, CapabilityTracks } from '@/lib/procedures/capabilities';
import type { USRelation } from '@/lib/procedures/usRelation';

export interface StateChange {
  label: string;
  from: string;
  to: string;
  removed?: boolean;  // render in red with strikethrough instead of before→after
}

export interface SoESnapshot {
  value: number; // 3–7
  trend: 'none' | 'improving' | 'worsening';
}

export interface RelationsSnapshot {
  level: number; // 1–5
  pendingAntiUS: number;
  pendingProUS: number;
}

export interface Outcome {
  id: string;
  summary: string;
  detail?: string;
  mutations?: Mutation[];
  stateChanges?: StateChange[];
  consumesAction?: boolean; // default true inside section H
  boardSnapshot?: { before: CapabilityTracks; after: CapabilityTracks; faction: Faction };
  soeSnapshot?: { before: SoESnapshot; after: SoESnapshot };
  relationsSnapshot?: { before: RelationsSnapshot; after: RelationsSnapshot };
  hidden?: boolean; // suppress card display; mutations still apply
}

// ─── Resolutions ──────────────────────────────────────────────────────────────

export interface Band {
  match: (modified: number) => boolean;
  outcome: Outcome;
  then?: Resolution;
}

export type Resolution =
  | { kind: 'static'; outcome: Outcome }
  | { kind: 'diceTable'; dieId: string; bands: Band[] }
  | { kind: 'branch'; when: (ctx: StepCtx) => string; cases: Record<string, Resolution> }
  | { kind: 'subSteps'; steps: Step[] }
  | { kind: 'custom'; resolve: (ctx: StepCtx) => Outcome | Outcome[] };

// ─── Steps ────────────────────────────────────────────────────────────────────

export interface RepeatSpec {
  count: (ctx: StepCtx) => number;
  label?: string;
}

export interface Step {
  id: string;
  section: Section;
  title: string;
  help?: string | ((sharedState: Record<string, unknown>) => string);
  guard?: (ctx: StepCtx) => boolean;
  inputs?: InputSpec[];
  dice?: DiceSpec[] | ((sharedState: Record<string, unknown>, inputs?: Inputs) => DiceSpec[]);
  repeat?: RepeatSpec;
  resolution: Resolution;
}

// ─── Procedure ────────────────────────────────────────────────────────────────

export interface Procedure {
  faction: Faction;
  name: string;
  steps: Step[];
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  createdAt: string;
  faction: Faction;
  mode: EntryMode;
  /** id of the step currently being presented (null = done) */
  cursorStepId: string | null;
  /** index within repeat loop (0-based) */
  cursorRepeatIdx: number;
  actionBudget: number;
  /** key-value bag steps can read/write across the session */
  sharedState: Record<string, unknown>;
  log: LogEntry[];
  finishedAt?: string;
}

export interface LogEntry {
  at: string;
  stepId: string;
  stepTitle: string;
  skipped?: boolean;
  inputs?: Inputs;
  rolls?: DiceResult[];
  outcomes: Outcome[];
}

// ─── Game ─────────────────────────────────────────────────────────────────────

export interface GameSharedState {
  capabilityTracks: {
    russia: Record<CapabilityKey, number>;
    china:  Record<CapabilityKey, number>;
    us:     Record<CapabilityKey, number>;
  };
  usRelation: {
    russia: USRelation;
    china:  USRelation;
  };
}

export interface Game {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sharedState: GameSharedState;
  activeRuns: Partial<Record<Faction, Session>>;
  archive: Session[];
}

// ─── Runtime context ──────────────────────────────────────────────────────────

export interface StepCtx {
  faction: Faction;
  mode: EntryMode;
  inputs: Inputs;
  dice: Record<string, DiceResult>;
  actionBudget: number;
  sharedState: Record<string, unknown>;
}
