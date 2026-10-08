import { canGoToStep, isConnectorDone, stepState } from '../stepper';

describe('Stepper4 logic', () => {
  it('marks steps before the current one as done', () => {
    expect([0, 1, 2, 3].map((i) => stepState(i, 2))).toEqual(['done', 'done', 'current', 'todo']);
    expect(stepState(0, 0)).toBe('current');
  });

  it('only lets the user go back to completed steps', () => {
    expect(canGoToStep(0, 2)).toBe(true);
    expect(canGoToStep(2, 2)).toBe(false);
    expect(canGoToStep(3, 2)).toBe(false);
  });

  it('lights a connector once the step on its left is done', () => {
    expect(isConnectorDone(0, 1)).toBe(true);
    expect(isConnectorDone(1, 1)).toBe(false);
  });
});
