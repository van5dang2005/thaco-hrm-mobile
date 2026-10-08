// Pure logic of `Stepper4` (kept free of React Native imports so it is testable in isolation).

export type StepState = 'done' | 'current' | 'todo';

/** State of step `index` when `current` is the active one (both 0-based). */
export function stepState(index: number, current: number): StepState {
  if (index < current) return 'done';
  return index === current ? 'current' : 'todo';
}

/** Only completed steps can be revisited; moving forward goes through each step's own "Tiếp tục". */
export const canGoToStep = (index: number, current: number) => index < current;

/** The connector between step `index` and `index + 1` is lit once the wizard is past `index`. */
export const isConnectorDone = (index: number, current: number) => index < current;
