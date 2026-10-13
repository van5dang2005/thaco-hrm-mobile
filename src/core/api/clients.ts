import { env } from '@/core/config/env';

import type { ServiceId } from './ApiError';
import { type ApiClient, createApiClient } from './http';

/** thaco_be_ql_buu_pham — parcels, delegations, reception. */
export const parcelApi = createApiClient('parcel', env.parcelApiUrl);

/** thaco_be_ql_phong_hop — rooms, bookings, approvals. */
export const roomApi = createApiClient('room', env.roomApiUrl);

const clients: Record<ServiceId, ApiClient> = { parcel: parcelApi, room: roomApi };

export const apiFor = (service: ServiceId) => clients[service];

/** Every back-end, for code that runs once per service (hubs, unread counts). */
export const services = Object.keys(clients) as ServiceId[];
