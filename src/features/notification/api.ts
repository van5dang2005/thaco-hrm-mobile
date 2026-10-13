import { useQueries, useQuery } from '@tanstack/react-query';

import type { ServiceId } from '@/core/api/ApiError';
import { apiFor, services } from '@/core/api/clients';
import type { NotificationDto, Paginated } from '@/core/api/types';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';

export const notificationsApi = {
  list: (service: ServiceId, pageNumber: number, pageSize: number) =>
    apiFor(service).get<Paginated<NotificationDto>>('/api/notifications', { query: { pageNumber, pageSize } }),
  totalUnread: (service: ServiceId) => apiFor(service).get<number>('/api/notifications/total-unread'),
  markRead: (service: ServiceId, id: string) => apiFor(service).put<boolean>(`/api/notifications/${id}/mark-as-read`),
  markAllRead: (service: ServiceId) => apiFor(service).put<boolean>('/api/notifications/bulk-seen'),
  remove: (service: ServiceId, id: string) => apiFor(service).delete<boolean>(`/api/notifications/${id}`),
  removeAll: (service: ServiceId) => apiFor(service).delete<boolean>('/api/notifications/bulk-delete'),
};

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
