import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CalendarPlusIcon, MapPinIcon, PencilIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { Stepper4 } from '@/shared/ui/Stepper4';

import { useDefaultAreaId } from '../hooks/useDefaultAreaId';
import { useGoToStep, type WizardStep } from '../hooks/useWizardNavigation';
import { useBookingDraft } from '../store/draftStore';
import { useAreaPicker } from './AreaPicker';

const STEP_KEYS: WizardStep[] = ['index', 'time', 'details', 'confirm'];

export type StepNumber = 1 | 2 | 3 | 4;

type Props = {
  step: StepNumber;
  /** Buttons on the right of the toolbar. */
  right?: ReactNode;
  leading?: 'back' | 'close';
  onBack?: () => void;
  /** Area in the subtitle can be changed (B1 only: it resets the room). */
  onAreaChange?: (areaId: string) => void;
  /** Under the stepper (B1: the day strip). */
  children?: ReactNode;
  /** Padding under the header; 44 when a card overlaps it. */
  bottom?: number;
  testID?: string;
};

/** Header of a booking step (4a–4d): "Đặt phòng họp", the area, then the 4-step stepper (done steps go back). */
export function WizardHeader({ step, right, leading, onBack, onAreaChange, children, bottom = 24, testID }: Props) {
  const { t } = useTranslation();
  const goToStep = useGoToStep();
  const mode = useBookingDraft((s) => s.draft.mode);
  const draftArea = useBookingDraft((s) => s.draft.areaId);
  const defaultArea = useDefaultAreaId();
  const area = useAreaPicker(draftArea ?? defaultArea, (id) => onAreaChange?.(id), testID ? `${testID}-area` : undefined);

  return (
    <>
      <ModuleHeader
        testID={testID}
        icon={mode === 'edit' ? PencilIcon : CalendarPlusIcon}
        title={mode === 'edit' ? t('booking.editTitle') : t('booking.bookTitle')}
        subtitle={area.name}
        subtitleIcon={MapPinIcon}
        onSubtitlePress={onAreaChange ? area.open : undefined}
        leading={leading}
        onBack={onBack}
        right={right}
        bottom={bottom}
      >
        <Stepper4
          testID={`${testID ?? 'wizard-header'}-stepper`}
          step={step - 1}
          labels={[t('booking.steps.room'), t('booking.steps.time'), t('booking.steps.details'), t('booking.steps.confirm')]}
          onStepPress={(index) => goToStep(STEP_KEYS[index])}
        />
        {children}
      </ModuleHeader>
      {onAreaChange ? area.sheet : null}
    </>
  );
}
