import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { officialDocumentApi } from '../api/officialDocument.api';

/** Outgoing / internal documents of my unit waiting for the stamp ("Chờ đóng dấu"). */
export function useStampQueue(enabled = true) {
  return useQuery({ queryKey: qk.documents.stampQueue, queryFn: officialDocumentApi.stampQueue, enabled });
}
