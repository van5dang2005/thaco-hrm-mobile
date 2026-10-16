import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { officialDocumentApi } from '../api/officialDocument.api';

/** Incoming documents I distribute or have a role in (8a, 8b, 8c). */
export function useIncomingDocs(enabled = true) {
  return useQuery({ queryKey: qk.documents.incoming, queryFn: officialDocumentApi.incoming, enabled });
}
