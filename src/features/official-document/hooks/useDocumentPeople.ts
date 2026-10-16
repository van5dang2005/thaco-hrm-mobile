import { useQuery } from '@tanstack/react-query';

import { qk } from '@/core/query/keys';

import { officialDocumentApi } from '../api/officialDocument.api';

/** Staff of my unit, for "Thành phần xử lý" and "Chia sẻ tiếp" (searched on the device). */
export function useDocumentPeople(enabled = true) {
  return useQuery({ queryKey: qk.documents.people, queryFn: officialDocumentApi.people, staleTime: 10 * 60 * 1000, enabled });
}
