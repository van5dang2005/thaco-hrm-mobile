/** Envelope returned by every paginated endpoint of both back-ends. */
export type Paginated<T> = {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PageParams = { pageNumber?: number; pageSize?: number };

export const DEFAULT_PAGE_SIZE = 20;

export function nextPageParam(last: Paginated<unknown>) {
  return last.hasNextPage ? last.pageNumber + 1 : undefined;
}

/** Flattens the pages of an infinite query. */
export function flattenPages<T>(pages: Paginated<T>[] | undefined): T[] {
  return pages?.flatMap((page) => page.items) ?? [];
}

export type LoginRequest = { username: string; password: string; domain: string };

/** GET /api/menus item (parcel service). Results are filtered by the caller's Menu permissions. */
export type MenuDto = {
  id: string;
  name?: string | null;
  parentId?: string | null;
  index?: number | null;
  url?: string | null;
  icon?: string | null;
  isActive?: boolean | null;
};

/** NotificationDto, same on both services. */
export type NotificationDto = {
  id: string;
  title?: string | null;
  content?: string | null;
  code?: string | null;
  isRead?: boolean | null;
  createdAt?: string | null;
};
