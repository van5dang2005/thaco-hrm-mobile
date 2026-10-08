import { useQuery } from '@tanstack/react-query';

import { parcelApi, roomApi } from '@/core/api/clients';
import { qk } from '@/core/query/keys';

import { useSessionStore } from './sessionStore';
import type { ParcelUser, RoomUser } from './userTypes';

/** Profile from the parcel service (flat department / job title fields). */
export function useParcelMe() {
  const connected = useSessionStore((s) => s.connected.parcel);
  return useQuery({
    queryKey: qk.me('parcel'),
    queryFn: () => parcelApi.get<ParcelUser>('/api/users/me'),
    enabled: connected,
    staleTime: 10 * 60 * 1000,
  });
}

/** Profile from the room service; its `id` is the one used by bookings / approvals. */
export function useRoomMe() {
  const connected = useSessionStore((s) => s.connected.room);
  return useQuery({
    queryKey: qk.me('room'),
    queryFn: () => roomApi.get<RoomUser>('/api/users/me'),
    enabled: connected,
    staleTime: 10 * 60 * 1000,
  });
}

/** Display profile: prefers the parcel service (richer HR fields), falls back to the room one. */
export function useProfile() {
  const parcel = useParcelMe();
  const room = useRoomMe();
  const p = parcel.data;
  const r = room.data;
  return {
    isLoading: parcel.isLoading && room.isLoading,
    fullname: p?.fullname ?? r?.fullname ?? null,
    employeeCode: p?.employeeCode ?? r?.employeeCode ?? null,
    avatarUrl: p?.avatarUrl ?? r?.avatarUrl ?? null,
    email: p?.email ?? r?.email ?? null,
    phoneNumber: p?.phoneNumber ?? r?.phoneNumber ?? null,
    departmentName: p?.departmentName ?? r?.departments?.[0]?.name ?? null,
    unitName: p?.unitName ?? r?.unitName ?? null,
    jobTitleName: p?.jobTitleName ?? r?.jobTitles?.[0]?.name ?? null,
    positionName: p?.positionName ?? r?.positions?.[0]?.name ?? null,
    /** Areas of the room-service department ("KCN THACO Chu Lai"), else the unit path. */
    workplace: (r?.departments?.[0]?.areas ?? []).map((x) => x.name).filter(Boolean).join(' · ') || p?.unitFullPathName || null,
    parcelUser: p,
    roomUser: r,
  };
}
