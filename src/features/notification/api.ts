import { useQuery } from '@tanstack/react-query';

import type { ServiceId } from '@/core/api/ApiError';
import { apiFor } from '@/core/api/clients';
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

export function useUnreadCount(service: ServiceId) {
  const connected = useSessionStore((s) => s.connected[service]);
  return useQuery({
    queryKey: qk.notifications.unread(service),
    queryFn: () => notificationsApi.totalUnread(service),
    enabled: connected,
    // SignalR pushes updates; polling is only a fallback when the socket is down.
    refetchInterval: 120_000,
  });
}

/** Badge on the bell: unread notifications of both services. */
export function useTotalUnread() {
  const parcel = useUnreadCount('parcel');
  const room = useUnreadCount('room');
  return (Number(parcel.data) || 0) + (Number(room.data) || 0);
}
