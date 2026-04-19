import type { Faction, Procedure } from './types';
import { russiaProcedure } from './russia/index';
import { chinaProcedure } from './china/index';

export const procedures: Record<Faction, Procedure> = {
  russia: russiaProcedure,
  china: chinaProcedure,
};
