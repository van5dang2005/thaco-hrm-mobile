import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { DEFAULT_PAGE_SIZE, flattenPages, nextPageParam } from '@/core/api/types';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { useParcelMe } from '@/core/session/useMe';
import { HeaderBar, HeaderPillButton } from '@/shared/ui/HeaderBar';
import { HeaderChips } from '@/shared/ui/HeaderChips';
import { HeaderStat, HeaderStatRow } from '@/shared/ui/HeaderStat';
import { PackageIcon, UserCheckIcon } from '@/shared/ui/icons';
import { ScreenShell, SHEET_PADDING } from '@/shared/ui/ScreenShell';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { Text } from '@/shared/ui/Text';

import { parcelsApi } from './api';
import { ParcelCard } from './components/ParcelCard';
import { useMyParcelStats } from './hooks';
import { parcelTabs, type ParcelTab } from './logic';

const tabs: { key: ParcelTab; label: 'parcels.tabPending' | 'parcels.tabOverdue' | 'parcels.tabHanded' | 'parcels.tabCancelled'; empty: 'parcels.emptyPending' | 'parcels.emptyOverdue' | 'parcels.emptyHanded' | 'parcels.emptyCancelled' }[] = [
  { key: 'pending', label: 'parcels.tabPending', empty: 'parcels.emptyPending' },
  { key: 'overdue', label: 'parcels.tabOverdue', empty: 'parcels.emptyOverdue' },
  { key: 'handed', label: 'parcels.tabHanded', empty: 'parcels.emptyHanded' },
  { key: 'cancelled', label: 'parcels.tabCancelled', empty: 'parcels.emptyCancelled' },
];

/** "Bưu phẩm của tôi" (6d): my parcels plus those I collect on someone's behalf. */
export function MyParcelsScreen() {
  const { t } = useTranslation();
  const connected = useSessionStore((s) => s.connected.parcel);
  const me = useParcelMe();
  const stats = useMyParcelStats();
  const [tab, setTab] = useState<ParcelTab>('pending');

  const query = useInfiniteQuery({
    queryKey: qk.parcels.my({ tab }),
    queryFn: ({ pageParam }) => parcelsApi.my({ pageNumber: pageParam, pageSize: DEFAULT_PAGE_SIZE, statuses: [...parcelTabs[tab]] }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: connected,
  });
  const items = flattenPages(query.data?.pages);
  const current = tabs.find((x) => x.key === tab)!;

  const header = (
    <>
      <HeaderBar
        title={t('parcels.title')}
        right={<HeaderPillButton testID="parcels-delegations" icon={UserCheckIcon} label={t('parcels.delegation')} onPress={() => router.push('/parcels/delegations')} />}
      />
      <HeaderStatRow>
        <HeaderStat testID="parcels-stat-pending" value={stats.data?.waiting} label={t('parcels.statPending')} />
        <HeaderStat testID="parcels-stat-overdue" value={stats.data?.overdue} label={t('parcels.statOverdue')} />
        <HeaderStat testID="parcels-stat-received" value={stats.data?.handedOver} label={t('parcels.statReceived')} />
      </HeaderStatRow>
      <HeaderChips
        testID="parcels-tabs"
        value={tab}
        onChange={setTab}
        options={tabs.map((x) => ({ value: x.key, label: t(x.label), testID: `parcels-tab-${x.key}` }))}
      />
    </>
  );

  return (
    <ScreenShell header={header} scroll={false}>
      {query.isLoading ? (
        <View className="p-4">
          <ListSkeleton count={3} lines={4} />
        </View>
      ) : query.isError && !items.length ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SHEET_PADDING.horizontal, paddingTop: SHEET_PADDING.top, paddingBottom: SHEET_PADDING.bottom, gap: SHEET_PADDING.gap }}
          renderItem={({ item }) => (
            <ParcelCard parcel={item} myCode={me.data?.employeeCode} onPress={() => router.push({ pathname: '/parcels/[id]', params: { id: item.id } })} />
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
            <EmptyState
              icon={PackageIcon}
              message={t(current.empty)}
              actionLabel={tab === 'pending' ? t('parcels.delegation') : undefined}
              onAction={tab === 'pending' ? () => router.push('/parcels/delegations') : undefined}
            />
          }
          ListFooterComponent={query.isFetchingNextPage ? <Text className="py-4 text-center text-meta text-muted">{t('common.loadMore')}</Text> : null}
        />
      )}
    </ScreenShell>
  );
}
