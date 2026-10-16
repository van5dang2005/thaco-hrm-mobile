import { useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { officialDocumentApi } from '../api/officialDocument.api';
import type { SharedDoc } from '../types';

/** One shared document (8h, 8i); shows the list's copy while the detail loads. */
export function useSharedDoc(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: qk.documents.sharedDetail(id),
    queryFn: () => officialDocumentApi.sharedDetail(id),
    placeholderData: () => queryClient.getQueryData<SharedDoc[]>(qk.documents.shared)?.find((d) => d.id === id),
    enabled: !!id,
  });
}
