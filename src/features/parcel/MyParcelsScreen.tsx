import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { DEFAULT_PAGE_SIZE, flattenPages, nextPageParam } from '@/core/api/types';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { useParcelMe } from '@/core/session/useMe';
import { FloatingCard } from '@/shared/ui/Card';
import { PackageIcon } from '@/shared/ui/icons';
import { ModuleHeader } from '@/shared/ui/ModuleHeader';
import { CONTENT_PADDING, ModuleScreen } from '@/shared/ui/ModuleScreen';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { StatusTabs, type StatusTabItem } from '@/shared/ui/StatusTabs';
import { Text } from '@/shared/ui/Text';

import { parcelsApi } from './api';
import { ParcelCard } from './components/ParcelCard';
import { useMyParcelStats } from './hooks';
import { parcelTabs, type ParcelTab } from './logic';

const empty: Record<ParcelTab, 'parcels.emptyPending' | 'parcels.emptyOverdue' | 'parcels.emptyHanded' | 'parcels.emptyCancelled'> = {
  pending: 'parcels.emptyPending',
  overdue: 'parcels.emptyOverdue',
  handed: 'parcels.emptyHanded',
  cancelled: 'parcels.emptyCancelled',
};

/** "Bưu phẩm của tôi" (6d). */
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

  const tabs: StatusTabItem<ParcelTab>[] = [
    { key: 'pending', label: t('parcels.tabPending'), count: stats.data?.waiting, tone: 'wait', testID: 'parcels-tab-pending' },
    { key: 'overdue', label: t('parcels.tabOverdue'), count: stats.data?.overdue, tone: 'danger', alarm: true, testID: 'parcels-tab-overdue' },
    { key: 'handed', label: t('parcels.tabHanded'), count: stats.data?.handedOver, tone: 'ok', testID: 'parcels-tab-handed' },
    { key: 'cancelled', label: t('parcels.tabCancelled'), count: stats.data?.cancelled, tone: 'off', testID: 'parcels-tab-cancelled' },
  ];

  const header = (
    <ModuleHeader testID="parcels-header" icon={PackageIcon} title={t('parcels.title')} />
  );

  const floating = (
    <FloatingCard>
      <StatusTabs testID="parcels-tabs" items={tabs} value={tab} onChange={setTab} />
    </FloatingCard>
  );

  return (
    <ModuleScreen header={header} floating={floating} scroll={false}>
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
          contentContainerStyle={{
            paddingHorizontal: CONTENT_PADDING.horizontal,
            paddingTop: CONTENT_PADDING.top,
            paddingBottom: CONTENT_PADDING.bottom,
            gap: CONTENT_PADDING.gap,
          }}
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
          ListEmptyComponent={<EmptyState testID="parcels-empty" message={t(empty[tab])} />}
          ListFooterComponent={query.isFetchingNextPage ? <Text className="py-4 text-center text-meta text-muted">{t('common.loadMore')}</Text> : null}
        />
      )}
    </ModuleScreen>
  );
}
