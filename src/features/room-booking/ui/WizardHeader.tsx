import type { ReactNode } from 'react';

import { HeaderBar } from '@/shared/ui/HeaderBar';

import { useGoToStep, type WizardStep } from '../wizard/navigation';
import { StepCounter, StepperBar, type StepNumber } from './StepperBar';

const STEP_KEYS: WizardStep[] = ['index', 'time', 'details', 'confirm'];

type Props = {
  title: string;
  step: StepNumber;
  /** Replaces the "n/4" counter. */
  right?: ReactNode;
  leading?: 'back' | 'close';
  onBack?: () => void;
  testID?: string;
};

/** Toolbar of a booking wizard step: title, "n/4" and the 4-step StepperBar (finished steps are pressable). */
export function WizardHeader({ title, step, right, leading, onBack, testID }: Props) {
  const goToStep = useGoToStep();
  return (
    <>
      <HeaderBar testID={testID} title={title} leading={leading} onBack={onBack} right={right ?? <StepCounter current={step} />} />
      <StepperBar testID={`${testID ?? 'wizard-header'}-stepper`} current={step} onStepPress={(target) => goToStep(STEP_KEYS[target - 1])} />
    </>
  );
}
