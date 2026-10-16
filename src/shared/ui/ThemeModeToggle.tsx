import { useTranslation } from 'react-i18next';

import type { SchemePreference } from '@/core/theme/ThemeProvider';

import { MoonIcon, SmartphoneIcon, SunIcon } from './icons';
import { SegmentedToggle } from './SegmentedToggle';

const modes = [
  { value: 'system', icon: SmartphoneIcon },
  { value: 'light', icon: SunIcon },
  { value: 'dark', icon: MoonIcon },
] as const;

/** "Tự động · Sáng · Tối" switch (Profile settings, home layout sheet). */
export function ThemeModeToggle({ value, onChange, className, testID = 'theme-mode' }: { value: SchemePreference; onChange: (value: SchemePreference) => void; className?: string; testID?: string }) {
  const { t } = useTranslation();
  return (
    <SegmentedToggle<SchemePreference>
      testID={testID}
      className={className}
      options={modes.map((mode) => ({ value: mode.value, label: t(`appearance.${mode.value}`), icon: mode.icon, testID: `${testID}-${mode.value}` }))}
      value={value}
      onChange={onChange}
    />
  );
}
