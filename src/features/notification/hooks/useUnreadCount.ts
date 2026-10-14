import { useQueries, useQuery } from '@tanstack/react-query';

import type { ServiceId } from '@/core/api/ApiError';
import { services } from '@/core/api/clients';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';

import { notificationsApi } from '../api/notification.api';

const unreadQuery = (service: ServiceId, connected: boolean) => ({
  queryKey: qk.notifications.unread(service),
  queryFn: () => notificationsApi.totalUnread(service),
  enabled: connected,
  // SignalR pushes updates; polling is only a fallback when the socket is down.
  refetchInterval: 120_000,
});

export function useUnreadCount(service: ServiceId) {
  const connected = useSessionStore((s) => s.connected[service]);
  return useQuery(unreadQuery(service, connected));
}

/** Badge on the bell: unread notifications of every back-end the user may call. */
export function useTotalUnread() {
  const connected = useSessionStore((s) => s.connected);
  return useQueries({
    queries: services.map((service) => unreadQuery(service, connected[service])),
    combine: (results) => results.reduce((sum, result) => sum + (Number(result.data) || 0), 0),
  });
}
