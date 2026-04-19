import type { Resolution, Band, Outcome, StepCtx, DiceResult } from '@/lib/procedures/types';

function matchBand(bands: Band[], modified: number): Band {
  const match = bands.find((b) => b.match(modified));
  if (!match) {
    // fallback: last band (should be a catch-all)
    return bands[bands.length - 1];
  }
  return match;
}

export function resolveResolution(
  resolution: Resolution,
  ctx: StepCtx,
  dice: Record<string, DiceResult>,
): Outcome[] {
  switch (resolution.kind) {
    case 'static':
      return [resolution.outcome];

    case 'diceTable': {
      const roll = dice[resolution.dieId];
      if (!roll) throw new Error(`Die "${resolution.dieId}" not found in rolls`);
      const band = matchBand(resolution.bands, roll.modified);
      const outcomes: Outcome[] = [band.outcome];
      if (band.then) {
        outcomes.push(...resolveResolution(band.then, ctx, dice));
      }
      return outcomes;
    }

    case 'branch': {
      const key = resolution.when(ctx);
      const branch = resolution.cases[key];
      if (!branch) throw new Error(`No branch case for key "${key}"`);
      return resolveResolution(branch, ctx, dice);
    }

    case 'subSteps':
      // sub-steps are handled by the runner iterating them inline
      return [];

    case 'custom': {
      const result = resolution.resolve(ctx);
      return Array.isArray(result) ? result : [result];
    }
  }
}
