import { useQuery } from '@tanstack/react-query';

import { isApiError } from '@/core/api/ApiError';
import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';
import { useRoomMe } from '@/core/session/useMe';
import { sameId } from '@/core/session/userTypes';
import { kv, kvKeys } from '@/core/storage/kv';
import { parseServerDate } from '@/core/time/vn';
import { approvalsApi } from '@/features/approval/api';

import { bookingsApi, roomsApi, type ScheduleQuery } from './api';
import { approvalLevelCount, crossLevelStatus, type CrossLevelContext } from './logic';
import type { ApprovalStepDto, BookingDto, RoomDto } from './types';

const useRoomConnected = () => useSessionStore((s) => s.connected.room);

export function useAreas() {
  const enabled = useRoomConnected();
  return useQuery({ queryKey: qk.rooms.areas, queryFn: roomsApi.areas, enabled, staleTime: 10 * 60 * 1000, select: (page) => page.items.filter((a) => a.isActive !== false) });
}

export function useDepartmentsWithRooms(areaId?: string) {
  const enabled = useRoomConnected() && !!areaId;
  return useQuery({ queryKey: qk.rooms.departments(areaId), queryFn: () => roomsApi.departmentsWithRooms(areaId), enabled, staleTime: 10 * 60 * 1000 });
}

export function useRooms(areaId?: string, departmentId?: string) {
  const enabled = useRoomConnected() && !!areaId;
  return useQuery({
    queryKey: qk.rooms.list(areaId, departmentId),
    queryFn: () => roomsApi.rooms(areaId, departmentId),
    enabled,
    staleTime: 5 * 60 * 1000,
    select: (rooms) => [...rooms].filter((r) => r.isActive !== false).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999) || (a.name ?? '').localeCompare(b.name ?? '')),
  });
}

export function useSchedule(query: ScheduleQuery, enabled = true) {
  const connected = useRoomConnected();
  return useQuery({ queryKey: qk.bookings.schedule(query), queryFn: () => bookingsApi.schedule(query), enabled: connected && enabled && !!query.areaId });
}

/**
 * Approval workflows. The list can be permission-filtered; failures are tolerated and simply hide
 * "Duyệt N cấp" hints and future steps.
 */
export function useWorkflows() {
  const enabled = useRoomConnected();
  return useQuery({
    queryKey: qk.rooms.workflows,
    queryFn: roomsApi.workflows,
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: false,
    select: (page) => page.items.filter((w) => w.isActive !== false),
  });
}

/** Approval steps of a room, or undefined when unknown. */
export function useRoomSteps(roomId?: string | null): ApprovalStepDto[] | undefined {
  const workflows = useWorkflows();
  const workflow = workflows.data?.find((w) => sameId(w.roomId, roomId));
  const fallback = useQuery({
    queryKey: qk.rooms.workflowSteps(workflow?.id ?? ''),
    queryFn: () => roomsApi.workflowSteps(workflow!.id),
    enabled: !!workflow && !workflow.approvalSteps,
    retry: false,
  });
  if (!workflows.data) return undefined;
  if (!workflow) return [];
  return workflow.approvalSteps ?? fallback.data;
}

/** Approval level count per room id (null = unknown). */
export function useApprovalLevels() {
  const workflows = useWorkflows();
  return (roomId?: string | null): number | null => {
    if (!workflows.data) return null;
    const workflow = workflows.data.find((w) => sameId(w.roomId, roomId));
    if (!workflow) return 0;
    return workflow.approvalSteps ? approvalLevelCount(workflow.approvalSteps) : null;
  };
}

/** Department list for exact cross-level checks; optional (falls back to a partial check). */
function useDepartmentTree() {
  const enabled = useRoomConnected();
  return useQuery({
    queryKey: ['rooms', 'department-tree'],
    queryFn: roomsApi.departments,
    enabled,
    staleTime: 60 * 60 * 1000,
    retry: (count, error) => !(isApiError(error) && error.status === 403) && count < 1,
    select: (page) => new Map(page.items.map((d) => [d.id.toLowerCase(), d.parentId ? d.parentId.toLowerCase() : null])),
  });
}

export function useCrossLevel() {
  const me = useRoomMe();
  const areas = useAreas();
  const tree = useDepartmentTree();
  const ctx: CrossLevelContext = {
    userDepartments: me.data?.departments ?? [],
    areas: areas.data ?? [],
    parentMap: tree.data && tree.data.size > 0 ? tree.data : undefined,
  };
  return (room: RoomDto) => crossLevelStatus(room, ctx);
}

/** Default area: last used, else one linked to my department, else the first. */
export function useDefaultAreaId() {
  const areas = useAreas();
  const me = useRoomMe();
  const list = areas.data ?? [];
  const last = kv.getString(kvKeys.lastAreaId);
  if (last && list.some((a) => sameId(a.id, last))) return last;
  const mine = me.data?.departments?.flatMap((d) => d.areas ?? []) ?? [];
  const linked = list.find((a) => mine.some((m) => sameId(m.id, a.id)) || a.departments?.some((d) => me.data?.departments?.some((u) => sameId(u.id, d.id))));
  return linked?.id ?? list[0]?.id;
}

export function rememberArea(areaId: string) {
  kv.set(kvKeys.lastAreaId, areaId);
}

export function useBooking(id?: string) {
  const enabled = useRoomConnected() && !!id;
  return useQuery({ queryKey: qk.bookings.detail(id ?? ''), queryFn: () => bookingsApi.detail(id!), enabled });
}

export function useBookingApprovals(id?: string) {
  const enabled = useRoomConnected() && !!id;
  return useQuery({ queryKey: qk.bookings.approvals(id ?? ''), queryFn: () => approvalsApi.forBooking(id!), enabled });
}

/**
 * Sessions of a booking's group. There is no group endpoint, so this reads the area schedule over a
 * wide window and filters by groupId. Only used for series (isSingleBooking = false).
 */
export function useGroupSessions(booking?: BookingDto | null) {
  const from = parseServerDate(booking?.from);
  const areaId = booking?.room?.areaId ?? booking?.room?.area?.id ?? undefined;
  const enabled = !!booking && booking.isSingleBooking === false && !!from;
  const query = useSchedule(
    {
      fromDate: new Date((from?.getTime() ?? 0) - 120 * 24 * 3600_000).toISOString(),
      toDate: new Date((from?.getTime() ?? 0) + 240 * 24 * 3600_000).toISOString(),
      areaId,
    },
    enabled,
  );
  const sessions = (query.data ?? [])
    .filter((b) => sameId(b.groupId, booking?.groupId))
    .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''));
  return { ...query, sessions: enabled ? sessions : booking ? [booking] : [] };
}
