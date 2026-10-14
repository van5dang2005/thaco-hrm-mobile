import { sameId } from '@/core/session/userTypes';

import { approvalLevelCount } from '../utils/booking';
import { useWorkflows } from './useWorkflows';

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
