import type { Href } from 'expo-router';

import type { ServiceId } from '@/core/api/ApiError';
import { qk } from '@/core/query/keys';

/** Where tapping a notification should go. */
export function hrefForNotification(service: ServiceId, bookingId?: string | null): Href {
  if (service === 'room') {
    if (bookingId) return { pathname: '/rooms/bookings/[id]', params: { id: bookingId } };
    return '/calendar';
  }
  return '/parcels';
}

/** Query groups to refresh when a notification arrives (the change it announces happened server-side). */
export function keysForNotification(service: ServiceId): readonly (readonly unknown[])[] {
  return service === 'room'
    ? [qk.bookings.root]
    : [qk.parcels.root];
}

/** ResourceType values of each back-end, used by `ResourceUpdated`. */
export function keysForResource(service: ServiceId, resourceType?: number | null): readonly (readonly unknown[])[] {
  if (service === 'parcel') {
    switch (resourceType) {
      case 1: // Delegation
      case 2: // Parcel
      case 3: // ParcelLog
        return [qk.parcels.root];
      case 4: // Department
        return [qk.parcels.departments];
      case 6: // Menu
      case 7: // Permission
        return [qk.menus];
      case 8: // Notification
        return [qk.notifications.root];
      default:
        return [qk.parcels.root];
    }
  }
  switch (resourceType) {
    case 9: // Booking
      return [qk.bookings.root];
    case 1: // Room
    case 2: // Service
    case 3: // Area
    case 10: // ApprovalWorkflow
    case 11: // ApprovalStep
    case 12: // ApprovalHandler
      return [qk.rooms.root];
    case 14: // Notification
      return [qk.notifications.root];
    default:
      return [qk.bookings.root, qk.rooms.root];
  }
}
