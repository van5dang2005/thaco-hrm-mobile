import { toDateKey } from '@/core/time/vn';
import { useNow } from '@/shared/hooks/useNow';

import { documentSummary } from '../utils/incoming';
import { useIncomingDocs } from './useIncomingDocs';
import { useSharedDocs } from './useSharedDocs';
import { useStampQueue } from './useStampQueue';

/** Counts of the Văn thư home (8a) and the Home tile badge; `enabled` false skips the requests. */
export function useDocumentSummary(enabled = true) {
  const incoming = useIncomingDocs(enabled);
  const shared = useSharedDocs(enabled);
  const stamp = useStampQueue(enabled);
  const today = toDateKey(useNow(60_000));
  const loaded = !!incoming.data && !!shared.data && !!stamp.data;
  return {
    summary: loaded ? documentSummary(incoming.data ?? [], shared.data ?? [], stamp.data ?? [], today) : undefined,
    isLoading: enabled && (incoming.isLoading || shared.isLoading || stamp.isLoading),
    isError: incoming.isError || shared.isError || stamp.isError,
    error: incoming.error ?? shared.error ?? stamp.error,
    refetch: () => Promise.all([incoming.refetch(), shared.refetch(), stamp.refetch()]),
  };
}
