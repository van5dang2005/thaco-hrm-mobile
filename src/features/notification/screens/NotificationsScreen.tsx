import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, RefreshControl, View } from 'react-native';

import type { ServiceId } from '@/core/api/ApiError';
import { DEFAULT_PAGE_SIZE, flattenPages, nextPageParam, type NotificationDto } from '@/core/api/types';
import { errorMessage } from '@/core/errors/errorMessage';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { formatRelative, parseServerDate } from '@/core/time/vn';
import { Button } from '@/shared/ui/Button';
import { PressableCard } from '@/shared/ui/Card';
import { HeaderBar, HeaderPillButton } from '@/shared/ui/HeaderBar';
import { HeaderSegmented } from '@/shared/ui/HeaderSegmented';
import { type AppIcon, BellIcon, CalendarCheckIcon, CheckCheckIcon, PackageIcon } from '@/shared/ui/icons';
import { RoundIcon } from '@/shared/ui/RoundIcon';
import { ScreenShell, SHEET_PADDING } from '@/shared/ui/ScreenShell';
import { ListSkeleton } from '@/shared/ui/Skeleton';
import { EmptyState, ErrorState } from '@/shared/ui/StateViews';
import { Text } from '@/shared/ui/Text';
import { toast } from '@/shared/ui/Toast';
import { usePullRefresh } from '@/shared/hooks/usePullRefresh';

import { notificationsApi } from '../api/notification.api';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { hrefForNotification } from '../utils/routing';

function iconFor(service: ServiceId, code?: string | null): AppIcon {
  if (service === 'room') return CalendarCheckIcon;
  return code ? PackageIcon : BellIcon;
}

export function NotificationsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const connected = useSessionStore((s) => s.connected);
  const available = (['room', 'parcel'] as const).filter((s) => connected[s]);
  const [service, setService] = useState<ServiceId>(available[0] ?? 'room');
  const roomUnread = Number(useUnreadCount('room').data) || 0;
  const parcelUnread = Number(useUnreadCount('parcel').data) || 0;

  const query = useInfiniteQuery({
    queryKey: qk.notifications.list(service),
    queryFn: ({ pageParam }) => notificationsApi.list(service, pageParam, DEFAULT_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: connected[service],
  });
  const items = flattenPages(query.data?.pages);
  const pull = usePullRefresh(() => query.refetch());

  const refreshBadges = () => {
    void queryClient.invalidateQueries({ queryKey: qk.notifications.unread(service) });
    void queryClient.invalidateQueries({ queryKey: qk.notifications.list(service) });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(service, id),
    onSettled: refreshBadges,
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(service),
    onSuccess: () => toast.success(t('notifications.markedAllRead')),
    onError: (error) => toast.error(errorMessage(error, t)),
    onSettled: refreshBadges,
  });
  const remove = useMutation({
    mutationFn: (id: string) => notificationsApi.remove(service, id),
    onSuccess: () => toast.success(t('notifications.deleted')),
    onError: (error) => toast.error(errorMessage(error, t)),
    onSettled: refreshBadges,
  });
  const removeAll = useMutation({
    mutationFn: () => notificationsApi.removeAll(service),
    onError: (error) => toast.error(errorMessage(error, t)),
    onSettled: refreshBadges,
  });

  const relative = (date: Date | null) =>
    formatRelative(date, {
      justNow: t('time.justNow'),
      minutesAgo: (count) => t('time.minutesAgo', { count }),
      hoursAgo: (count) => t('time.hoursAgo', { count }),
      daysAgo: (count) => t('time.daysAgo', { count }),
    });

  const openItem = (item: NotificationDto) => {
    if (!item.isRead) markRead.mutate(item.id);
    router.push(hrefForNotification(service));
  };

  const renderItem = ({ item }: { item: NotificationDto }) => (
    <PressableCard
      testID={`notification-${item.id}`}
      onPress={() => openItem(item)}
      onLongPress={() =>
        Alert.alert(t('notifications.title'), t('notifications.deleteOne'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: () => remove.mutate(item.id) },
        ])
      }
      className="flex-row gap-3 p-3.5"
      style={{ flexShrink: 0 }}
    >
      <RoundIcon icon={iconFor(service, item.code)} tone={item.isRead ? 'brand' : 'wait'} />
      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row items-start gap-2">
          <Text weight={item.isRead ? 'medium' : 'semibold'} className="flex-1" numberOfLines={2} style={{ fontSize: 14, lineHeight: 19 }}>
            {item.title || t('notifications.title')}
          </Text>
          {!item.isRead ? <View className="mt-1.5 h-2 w-2 rounded-full bg-primary" accessibilityLabel="unread" /> : null}
        </View>
        {item.content ? (
          <Text className="text-muted" numberOfLines={3} style={{ fontSize: 13, lineHeight: 18 }}>
            {item.content}
          </Text>
        ) : null}
        <Text className="pt-0.5 text-subtle" style={{ fontSize: 12, lineHeight: 16 }}>
          {relative(parseServerDate(item.createdAt))}
        </Text>
      </View>
    </PressableCard>
  );

  const unread = service === 'room' ? roomUnread : parcelUnread;

  const header = (
    <>
      <HeaderBar
        icon={BellIcon}
        title={t('notifications.title')}
        right={unread > 0 ? <HeaderPillButton testID="notifications-mark-all" icon={CheckCheckIcon} label={t('notifications.markAllRead')} onPress={() => markAll.mutate()} /> : undefined}
      />
      {available.length > 1 ? (
        <HeaderSegmented
          value={service}
          onChange={setService}
          options={[
            { value: 'room', label: t('notifications.tabRoom'), badge: roomUnread, testID: 'notifications-tab-room' },
            { value: 'parcel', label: t('notifications.tabParcel'), badge: parcelUnread, testID: 'notifications-tab-parcel' },
          ]}
        />
      ) : null}
    </>
  );

  return (
    <ScreenShell header={header} scroll={false}>
      {query.isLoading ? (
        <View className="p-4">
          <ListSkeleton count={5} lines={3} />
        </View>
      ) : query.isError && !items.length ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SHEET_PADDING.horizontal, paddingTop: SHEET_PADDING.top, paddingBottom: SHEET_PADDING.bottom, gap: 10 }}
          refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={() => void pull.onRefresh()} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          ListEmptyComponent={<EmptyState icon={BellIcon} message={t('notifications.empty')} />}
          ListFooterComponent={
            items.length ? (
              <View className="items-center gap-3 py-6">
                {query.isFetchingNextPage ? <Text className="text-meta text-muted">{t('common.loadMore')}</Text> : null}
                <Button
                  variant="danger"
                  size="sm"
                  label={t('notifications.deleteAll')}
                  onPress={() =>
                    Alert.alert(t('notifications.title'), t('notifications.deleteAllConfirm', { service: t(`services.${service}`) }), [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('common.delete'), style: 'destructive', onPress: () => removeAll.mutate() },
                    ])
                  }
                />
              </View>
            ) : null
          }
        />
      )}
    </ScreenShell>
  );
}
