import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { officialDocumentApi } from '../api/officialDocument.api';

/** The signed-in staff member as the Văn thư back-end knows them (unit line of the headers, "Bạn"). */
export function useDocumentMe() {
  return useQuery({ queryKey: qk.documents.me, queryFn: officialDocumentApi.me, staleTime: 30 * 60 * 1000 });
}
