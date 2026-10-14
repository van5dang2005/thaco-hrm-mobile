import { roomApi } from '@/core/api/clients';
import type { Paginated } from '@/core/api/types';
import type { RoomDepartment, RoomUser } from '@/core/session/userTypes';

import type { ApprovalStepDto, ApprovalWorkflowDto, AreaDetail, RoomDto } from '../types';

export const roomsApi = {
  areas: () => roomApi.get<Paginated<AreaDetail>>('/api/areas', { query: { pageNumber: 1, pageSize: 200 } }),
  /** Full department list (parentId) to evaluate cross-level booking restrictions; may be permission-filtered. */
  departments: () => roomApi.get<Paginated<RoomDepartment>>('/api/departments', { query: { pageNumber: 1, pageSize: 5000 } }),
  departmentsWithRooms: (areaId?: string) => roomApi.get<RoomDepartment[]>('/api/departments/get-departments-has-room', { query: { areaId } }),
  rooms: (areaId?: string, departmentId?: string) => roomApi.get<RoomDto[]>('/api/rooms/get-all-rooms', { query: { areaId, departmentId } }),
  /** Free rooms in a window among those where I am an approver (used when approving with a room change). */
  availableRooms: (q: { areaId?: string; departmentId?: string; startTime: string; endTime: string }) =>
    roomApi.get<RoomDto[]>('/api/rooms/get-available-rooms', { query: q }),
  workflows: () => roomApi.get<Paginated<ApprovalWorkflowDto>>('/api/approvalworkflows', { query: { pageNumber: 1, pageSize: 500 } }),
  workflowSteps: (workflowId: string) => roomApi.get<ApprovalStepDto[]>(`/api/approvalsteps/workflow/${workflowId}`),
  searchUsers: (keyword: string) =>
    roomApi.get<Paginated<RoomUser>>('/api/users', { query: { searchKeyword: keyword, pageNumber: 1, pageSize: 20 } }),
};
