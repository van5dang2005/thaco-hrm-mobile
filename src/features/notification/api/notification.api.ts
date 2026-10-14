import type { ServiceId } from '@/core/api/ApiError';
import { apiFor } from '@/core/api/clients';
import type { NotificationDto, Paginated } from '@/core/api/types';

export const notificationsApi = {
  list: (service: ServiceId, pageNumber: number, pageSize: number) =>
    apiFor(service).get<Paginated<NotificationDto>>('/api/notifications', { query: { pageNumber, pageSize } }),
  totalUnread: (service: ServiceId) => apiFor(service).get<number>('/api/notifications/total-unread'),
  markRead: (service: ServiceId, id: string) => apiFor(service).put<boolean>(`/api/notifications/${id}/mark-as-read`),
  markAllRead: (service: ServiceId) => apiFor(service).put<boolean>('/api/notifications/bulk-seen'),
  remove: (service: ServiceId, id: string) => apiFor(service).delete<boolean>(`/api/notifications/${id}`),
  removeAll: (service: ServiceId) => apiFor(service).delete<boolean>('/api/notifications/bulk-delete'),
};
