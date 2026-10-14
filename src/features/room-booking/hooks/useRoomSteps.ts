import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { sameId } from '@/core/session/userTypes';

import { roomsApi } from '../api/room.api';
import type { ApprovalStepDto } from '../types';
import { useWorkflows } from './useWorkflows';

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
