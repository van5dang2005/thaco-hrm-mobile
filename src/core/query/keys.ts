import type { ServiceId } from '@/core/api/ApiError';

/**
 * Query keys, grouped per feature (README "State Management"). Realtime `ResourceUpdated`
 * events invalidate whole groups, so every key of a group starts with the group root.
 */
export const qk = {
  me: (service: ServiceId) => ['me', service] as const,
  menus: ['parcel', 'menus'] as const,
  users: {
    root: (service: ServiceId) => ['users', service] as const,
    search: (service: ServiceId, keyword: string) => ['users', service, keyword] as const,
  },
  notifications: {
    root: ['notifications'] as const,
    list: (service: ServiceId) => ['notifications', service, 'list'] as const,
    unread: (service: ServiceId) => ['notifications', service, 'unread'] as const,
  },
  rooms: {
    root: ['rooms'] as const,
    areas: ['rooms', 'areas'] as const,
    departments: (areaId?: string) => ['rooms', 'departments', areaId ?? 'all'] as const,
    list: (areaId?: string, departmentId?: string) => ['rooms', 'list', areaId ?? 'all', departmentId ?? 'all'] as const,
    available: (params: Record<string, unknown>) => ['rooms', 'available', params] as const,
    workflows: ['rooms', 'workflows'] as const,
    workflowSteps: (workflowId: string) => ['rooms', 'workflow-steps', workflowId] as const,
  },
  bookings: {
    root: ['bookings'] as const,
    schedule: (params: Record<string, unknown>) => ['bookings', 'schedule', params] as const,
    mine: (params: Record<string, unknown>) => ['bookings', 'mine', params] as const,
    detail: (id: string) => ['bookings', 'detail', id] as const,
    approvals: (id: string) => ['bookings', 'approvals', id] as const,
  },
  parcels: {
    root: ['parcels'] as const,
    my: (params: Record<string, unknown>) => ['parcels', 'my', params] as const,
    myStats: ['parcels', 'my-stats'] as const,
    detail: (id: string) => ['parcels', 'detail', id] as const,
    reception: (params: Record<string, unknown>) => ['parcels', 'reception', params] as const,
    receptionStats: (params: Record<string, unknown>) => ['parcels', 'reception-stats', params] as const,
    departments: ['parcels', 'departments'] as const,
  },
};
