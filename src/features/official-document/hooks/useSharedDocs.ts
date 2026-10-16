import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { officialDocumentApi } from '../api/officialDocument.api';

/** Outgoing and internal documents shared with me (8a, 8g). */
export function useSharedDocs(enabled = true) {
  return useQuery({ queryKey: qk.documents.shared, queryFn: officialDocumentApi.shared, enabled });
}
