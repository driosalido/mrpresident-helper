import type { Procedure } from '@/lib/procedures/types';
import { stepsA } from './a-autocheck';
import { stepsB } from './b-posture';
import { stepsC } from './c-strategic';
import { stepsD } from './d-espionage';
import { stepsE } from './e-economy';
import { stepsF } from './f-actions';
import { stepsG } from './g-dependent';
import { stepsH } from './h-actions';

export const russiaProcedure: Procedure = {
  faction: 'russia',
  name: 'Russia Acts (WPR1)',
  steps: [
    ...stepsA,
    ...stepsB,
    ...stepsC,
    ...stepsD,
    ...stepsE,
    ...stepsF,
    ...stepsG,
    ...stepsH,
  ],
};
