import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { sameId } from '@/core/session/userTypes';
import { SelectSheet } from '@/shared/ui/SelectSheet';

import { useAreas } from '../hooks/useAreas';
import { rememberArea } from '../hooks/useDefaultAreaId';

/**
 * Area of a module header subtitle ("📍 THACO Chu Lai ⌄"): the area name, a function that opens the
 * area list (GET /api/areas) and the sheet element to render. Choosing an area also remembers it.
 */
export function useAreaPicker(areaId: string | undefined, onChange: (areaId: string) => void, testID?: string) {
  const { t } = useTranslation();
  const areas = useAreas();
  const [open, setOpen] = useState(false);
  const area = areas.data?.find((a) => sameId(a.id, areaId));

  const sheet = (
    <SelectSheet
      testID={testID ? `${testID}-sheet` : undefined}
      visible={open}
      onClose={() => setOpen(false)}
      title={t('rooms.chooseArea')}
      value={areaId}
      options={(areas.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
      onSelect={(value) => {
        rememberArea(value);
        onChange(value);
      }}
    />
  );

  return { name: area?.name ?? t('rooms.chooseArea'), open: () => setOpen(true), sheet };
}
