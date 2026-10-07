import { env } from '@/core/config/env';

import type { ServiceId } from './ApiError';
import { createApiClient } from './http';

/** thaco_be_ql_buu_pham — parcels, delegations, reception. */
export const parcelApi = createApiClient('parcel', env.parcelApiUrl);

/** thaco_be_ql_phong_hop — rooms, bookings, approvals. */
export const roomApi = createApiClient('room', env.roomApiUrl);

export const apiFor = (service: ServiceId) => (service === 'parcel' ? parcelApi : roomApi);

export const services: ServiceId[] = ['parcel', 'room'];
