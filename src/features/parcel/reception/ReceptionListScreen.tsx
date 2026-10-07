import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';

import { DEFAULT_PAGE_SIZE, flattenPages, nextPageParam } from '@/core/api/types';
import { qk } from '@/core/query/keys';
import { useCapabilities } from '@/core/session/capabilities';
import { useSessionStore } from '@/core/session/sessionStore';
import { useDebounced } from '@/shared/hooks/useDebounced';
import { Button } from '@/shared/ui/Button';
import { FilterChip } from '@/shared/ui/Chip';
import { HeaderBar, HeaderPillButton } from '@/shared/ui/HeaderBar';
import { HeaderChips } from '@/shared/ui/HeaderChips';
import { HeaderStat, HeaderStatRow } from '@/shared/ui/HeaderStat';
import { LockIcon, MagnifyingGlassIcon, PackageIcon, PlusIcon } from '@/shared/ui/icons';
import { ScreenShell, SHEET_PADDING } from '@/shared/ui/ScreenShell';
import { SelectSheet } from '@/shared/ui/SelectSheet';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { Text } from '@/shared/ui/Text';
import { TextField } from '@/shared/ui/TextField';

import { parcelsApi } from '../api';
import { useAccessibleDepartments, useReceptionStats } from '../hooks';
import { isOpenParcel, rangeFromDate, type ReceptionRange } from '../logic';
import { ParcelStatus } from '../types';
import { ReceptionParcelCard } from './ReceptionParcelCard';

const statusChips = [ParcelStatus.Waiting, ParcelStatus.Due, ParcelStatus.Overdue, ParcelStatus.HandedOver, ParcelStatus.Cancelled] as const;

const rangeLabels = {
  all: 'reception.rangeAll',
  today: 'reception.rangeToday',
  week: 'reception.rangeWeek',
  month: 'reception.rangeMonth',
} as const;

/** Reception desk: parcels of the units I am granted, filters, multi-select → bulk handover. */
export function ReceptionListScreen() {
  const { t } = useTranslation();
  const connected = useSessionStore((s) => s.connected.parcel);
  const { has, isLoading: capsLoading } = useCapabilities();
  const allowed = has('parcel.reception');

  const [search, setSearch] = useState('');
  const keyword = useDebounced(search.trim(), 350);
  const [status, setStatus] = useState<ParcelStatus | undefined>(undefined);
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [range, setRange] = useState<ReceptionRange>('all');
  const [picker, setPicker] = useState<'department' | 'range' | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  const departments = useAccessibleDepartments(allowed);
  const fromDate = rangeFromDate(range);
  const stats = useReceptionStats({ departmentId, fromDate });
  const filters = { search: keyword || undefined, status, departmentId, fromDate };

  const query = useInfiniteQuery({
    queryKey: qk.parcels.reception(filters),
    queryFn: ({ pageParam }) => parcelsApi.list({ pageNumber: pageParam, pageSize: DEFAULT_PAGE_SIZE, ...filters }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: connected && allowed,
  });
  const items = flattenPages(query.data?.pages);
  // Parcels handed over (or cancelled) since they were ticked drop out of the selection.
  const selected = picked.filter((id) => items.some((p) => p.id === id && isOpenParcel(p.status)));
  const department = departments.data?.find((d) => d.id === departmentId);

  const toggle = (id: string) => setPicked(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const changeFilter = (apply: () => void) => {
    apply();
    setPicked([]);
  };

  if (!capsLoading && !allowed) {
    return (
      <ScreenShell header={<HeaderBar title={t('reception.title')} />}>
        <EmptyState icon={LockIcon} message={t('errors.FORBIDDEN')} />
      </ScreenShell>
    );
  }

  const header = (
    <>
      <HeaderBar
        title={t('reception.title')}
        right={<HeaderPillButton testID="reception-create" icon={PlusIcon} label={t('reception.create')} onPress={() => router.push('/parcels/reception/new')} />}
      />
      <HeaderStatRow>
        <HeaderStat value={stats.data?.total} label={t('reception.statTotal')} />
        <HeaderStat value={stats.data?.waiting} label={t('reception.statWaiting')} />
        <HeaderStat value={stats.data?.overdue} label={t('reception.statOverdue')} />
        <HeaderStat value={stats.data?.handedOver} label={t('reception.statHanded')} />
      </HeaderStatRow>
      <HeaderChips
        testID="reception-status"
        value={status === undefined ? 'all' : String(status)}
        onChange={(value) => changeFilter(() => setStatus(value === 'all' ? undefined : (Number(value) as ParcelStatus)))}
        options={[
          { value: 'all', label: t('reception.allStatuses'), testID: 'reception-status-all' },
          ...statusChips.map((s) => ({ value: String(s), label: t(`status.parcel.${s}`), testID: `reception-status-${s}` })),
        ]}
      />
    </>
  );

  return (
    <ScreenShell
      header={header}
      scroll={false}
      overlay={
        selected.length ? (
          <View testID="reception-bulk-bar" className="absolute left-4 right-4 flex-row items-center gap-2 rounded-[16px] py-2.5 pl-4 pr-2.5" style={{ bottom: 16, backgroundColor: '#0F1B2D' }}>
            <Text weight="semibold" numberOfLines={1} className="flex-1 text-body text-white">
              {t('reception.selected', { count: selected.length })}
            </Text>
            <Button size="sm" variant="inverse-soft" label={t('approvals.deselect')} onPress={() => setPicked([])} />
            <Button
              testID="reception-bulk-handover"
              size="sm"
              variant="inverse"
              label={t('reception.handoverSelected')}
              onPress={() => router.push({ pathname: '/parcels/reception/handover', params: { ids: selected.join(',') } })}
            />
          </View>
        ) : null
      }
    >
      <View className="gap-2.5 pb-1 pt-[18px]">
        <View className="px-4">
          <TextField
            testID="reception-search"
            filled
            leftIcon={MagnifyingGlassIcon}
            value={search}
            onChangeText={setSearch}
            placeholder={t('reception.searchPlaceholder')}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            onEndEditing={() => setPicked([])}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0" contentContainerClassName="gap-2 px-4">
          <FilterChip
            testID="reception-department"
            dropdown
            selected={!!departmentId}
            label={department ? t('reception.departmentChip', { name: department.name ?? department.code ?? '' }) : t('reception.allDepartments')}
            onPress={() => setPicker('department')}
          />
          <FilterChip testID="reception-range" dropdown selected={range !== 'all'} label={t(rangeLabels[range])} onPress={() => setPicker('range')} />
        </ScrollView>
      </View>

      {query.isLoading || capsLoading ? (
        <View className="p-4">
          <ListSkeleton count={3} lines={4} />
        </View>
      ) : query.isError && !items.length ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: SHEET_PADDING.horizontal, paddingTop: 12, paddingBottom: selected.length ? 110 : SHEET_PADDING.bottom, gap: 10 }}
          renderItem={({ item }) => (
            <ReceptionParcelCard
              parcel={item}
              selected={selected.includes(item.id)}
              onToggle={() => toggle(item.id)}
              onPress={() => router.push({ pathname: '/parcels/[id]', params: { id: item.id } })}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isFetchingNextPage}
              onRefresh={() => {
                void query.refetch();
                void stats.refetch();
              }}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          ListEmptyComponent={
            <EmptyState icon={PackageIcon} message={t('reception.empty')} actionLabel={t('reception.create')} onAction={() => router.push('/parcels/reception/new')} />
          }
          ListFooterComponent={query.isFetchingNextPage ? <Text className="py-4 text-center text-meta text-muted">{t('common.loadMore')}</Text> : null}
        />
      )}

      <SelectSheet<string>
        testID="reception-department-sheet"
        visible={picker === 'department'}
        onClose={() => setPicker(null)}
        title={t('reception.chooseDepartment')}
        value={departmentId ?? ''}
        options={[
          { value: '', label: t('reception.allDepartments') },
          ...(departments.data ?? []).map((d) => ({ value: d.id, label: d.name ?? d.code ?? d.id, description: d.fullPathName ?? undefined })),
        ]}
        onSelect={(value) => changeFilter(() => setDepartmentId(value || undefined))}
      />
      <SelectSheet<ReceptionRange>
        visible={picker === 'range'}
        onClose={() => setPicker(null)}
        title={t('reception.rangeTitle')}
        value={range}
        options={(Object.keys(rangeLabels) as ReceptionRange[]).map((value) => ({ value, label: t(rangeLabels[value]) }))}
        onSelect={(value) => changeFilter(() => setRange(value))}
      />
    </ScreenShell>
  );
}
