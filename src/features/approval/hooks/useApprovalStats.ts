import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';
import { useSessionStore } from '@/core/session/sessionStore';

import { approvalsApi } from '../api/approval.api';

/** GET /api/dashboard/approval-stats — `pendingApprovalsForUser` is the "Duyệt" tab badge. */
export function useApprovalStats() {
  const connected = useSessionStore((s) => s.connected.room);
  return useQuery({ queryKey: qk.approvals.stats, queryFn: approvalsApi.stats, enabled: connected });
}
