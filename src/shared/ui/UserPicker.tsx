import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { useTheme } from '@/core/theme/ThemeProvider';
import { useDebounced } from '@/shared/hooks/useDebounced';
import { cn } from '@/shared/lib/cn';

import { Button } from './Button';
import { Icon } from './Icon';
import { CheckIcon, SearchIcon } from './icons';
import { PersonRow, type Person } from './PersonRow';
import { BottomSheet } from './BottomSheet';
import { ErrorState } from './StateViews';
import { Text } from './Text';
import { TextField } from './TextField';

type Props<T extends Person> = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** Distinguishes caches of the two services (`GET /api/users` exists on both). */
  cacheKey: string;
  search: (keyword: string) => Promise<T[]>;
  /** Single select: called on tap, then the sheet closes. */
  onSelect?: (person: T) => void;
  /** Multi select: confirm button returns everything ticked. */
  multiple?: boolean;
  initialSelected?: T[];
  onConfirm?: (people: T[]) => void;
  excludeIds?: string[];
  testID?: string;
};

/** Employee search sheet backed by `GET /api/users?searchKeyword=` of either service. */
export function UserPicker<T extends Person>({
  visible,
  onClose,
  title,
  cacheKey,
  search,
  onSelect,
  multiple,
  initialSelected = [],
  onConfirm,
  excludeIds = [],
  testID,
}: Props<T>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [keyword, setKeyword] = useState('');
  const [picked, setPicked] = useState<T[]>(initialSelected);
  const [wasVisible, setWasVisible] = useState(visible);
  const debounced = useDebounced(keyword.trim(), 300);

  // Reset the selection each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setPicked(initialSelected);
      setKeyword('');
    }
  }

  const query = useQuery({
    queryKey: ['users', cacheKey, debounced],
    queryFn: () => search(debounced),
    enabled: visible && debounced.length >= 2,
    staleTime: 60_000,
  });
  const excluded = new Set(excludeIds.map((id) => id.toLowerCase()));
  const results = (query.data ?? []).filter((p) => !excluded.has(p.id.toLowerCase()));
  const isPicked = (p: T) => picked.some((x) => x.id.toLowerCase() === p.id.toLowerCase());

  const toggle = (person: T) => {
    if (!multiple) {
      onSelect?.(person);
      onClose();
      return;
    }
    setPicked((current) => (isPicked(person) ? current.filter((x) => x.id.toLowerCase() !== person.id.toLowerCase()) : [...current, person]));
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      testID={testID}
      scrollable
      maxHeightRatio={0.9}
      footer={
        multiple ? (
          <Button
            testID={testID ? `${testID}-done` : undefined}
            label={picked.length ? `${t('common.done')} (${picked.length})` : t('common.done')}
            onPress={() => {
              onConfirm?.(picked);
              onClose();
            }}
          />
        ) : undefined
      }
    >
      <TextField
        testID={testID ? `${testID}-search` : undefined}
        appearance="ios"
        leftIcon={SearchIcon}
        value={keyword}
        onChangeText={setKeyword}
        placeholder={t('booking.searchUsers')}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
      />
      <View style={{ minHeight: 220 }}>
        {debounced.length < 2 ? (
          <Text className="py-6 text-center text-sub text-muted">{t('booking.searchHint')}</Text>
        ) : query.isLoading ? (
          <View className="py-8">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : query.isError ? (
          <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
        ) : results.length === 0 ? (
          <Text className="py-6 text-center text-sub text-muted">{t('booking.noUsers')}</Text>
        ) : (
          results.map((person, index) => {
            const selected = isPicked(person);
            return (
              <PersonRow
                key={person.id}
                testID={testID ? `${testID}-result-${index}` : undefined}
                person={person}
                onPress={() => toggle(person)}
                className={cn('min-h-[56px] py-2', index > 0 && 'border-t border-line-2')}
                trailing={
                  multiple ? (
                    <View className={cn('h-[22px] w-[22px] items-center justify-center rounded-[7px]', selected ? 'bg-primary' : 'border-2 border-line-strong')}>
                      {selected ? <Icon icon={CheckIcon} size={12} weight="bold" color="on-primary" /> : null}
                    </View>
                  ) : undefined
                }
              />
            );
          })
        )}
      </View>
      {multiple && picked.length ? (
        <Pressable onPress={() => setPicked([])} className="self-start py-1" hitSlop={8}>
          <Text weight="semibold" className="text-sub text-primary">
            {t('common.deselect')}
          </Text>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}
