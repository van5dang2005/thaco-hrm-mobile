import { parcelApi } from '@/core/api/clients';
import type { Paginated } from '@/core/api/types';
import type { ParcelUser } from '@/core/session/userTypes';
import { appendLocalFile, type LocalFile } from '@/shared/lib/upload';

import type { DelegationDto, DelegationStatus, ParcelDepartment, ParcelDto, ParcelLookupDto, ParcelStats, ParcelStatus } from './types';

export type MyParcelsQuery = {
  pageNumber: number;
  pageSize: number;
  search?: string;
  statuses?: ParcelStatus[];
  fromDate?: string;
  toDate?: string;
  /** Only parcels that can still get a new per-parcel delegation. */
  addDelegation?: boolean;
};

export type ReceptionQuery = {
  pageNumber: number;
  pageSize: number;
  search?: string;
  status?: ParcelStatus;
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
};

export type DelegationsQuery = {
  pageNumber: number;
  pageSize: number;
  search?: string;
  status?: DelegationStatus;
  isDefault?: boolean;
};

/** Local file picked from the camera / library, sent as multipart. */
export type UploadFile = LocalFile;

export type ParcelFormInput = {
  trackingNumber?: string;
  trackingNumbers?: string[];
  senderFullName: string;
  senderCompanyName?: string;
  senderPhoneNumber?: string;
  senderAddress?: string;
  receiverId: string;
  receiverPhoneNumber?: string;
  departmentId: string;
  description?: string;
  receivedAt?: string;
  isSendEmail?: boolean;
  attachmentFiles: UploadFile[];
  /** Update only: existing attachments to keep. */
  attachmentIds?: string[];
  /** Update only, cancelled parcels: one-time cancellation note. */
  cancellationNote?: string;
};

function toParcelForm(input: ParcelFormInput) {
  const form = new FormData();
  const scalar: [string, string | undefined][] = [
    ['trackingNumber', input.trackingNumber],
    ['senderFullName', input.senderFullName],
    ['senderCompanyName', input.senderCompanyName],
    ['senderPhoneNumber', input.senderPhoneNumber],
    ['senderAddress', input.senderAddress],
    ['receiverId', input.receiverId],
    ['receiverPhoneNumber', input.receiverPhoneNumber],
    ['departmentId', input.departmentId],
    ['description', input.description],
    ['receivedAt', input.receivedAt],
    ['cancellationNote', input.cancellationNote],
    ['isSendEmail', input.isSendEmail === undefined ? undefined : String(input.isSendEmail)],
  ];
  scalar.forEach(([key, value]) => {
    if (value !== undefined && value !== '') form.append(key, value);
  });
  input.trackingNumbers?.forEach((value) => form.append('trackingNumbers', value));
  input.attachmentIds?.forEach((id) => form.append('attachmentIds', id));
  input.attachmentFiles.forEach((file) => appendLocalFile(form, 'attachmentFiles', file));
  return form;
}

export const parcelsApi = {
  my: (q: MyParcelsQuery) => parcelApi.get<Paginated<ParcelLookupDto>>('/api/parcels/my', { query: q }),
  myStats: () => parcelApi.get<ParcelStats>('/api/parcels/my/stats'),
  detail: (id: string) => parcelApi.get<ParcelDto>(`/api/parcels/${id}`),

  // Reception
  list: (q: ReceptionQuery) => parcelApi.get<Paginated<ParcelDto>>('/api/parcels', { query: q }),
  stats: (q: Omit<ReceptionQuery, 'pageNumber' | 'pageSize' | 'status' | 'search'>) => parcelApi.get<ParcelStats>('/api/parcels/stats', { query: q }),
  create: (input: ParcelFormInput) => parcelApi.postForm<ParcelDto>('/api/parcels', toParcelForm(input)),
  createBulk: (input: ParcelFormInput) => parcelApi.postForm<ParcelDto[]>('/api/parcels/bulk', toParcelForm(input)),
  update: (id: string, input: ParcelFormInput) => parcelApi.putForm<ParcelDto>(`/api/parcels/${id}`, toParcelForm(input)),
  remove: (id: string) => parcelApi.delete<void>(`/api/parcels/${id}`),
  handover: (id: string, body: { userId: string; note?: string; isSendEmail: boolean }) => parcelApi.post<ParcelDto>(`/api/parcels/${id}/handover`, body),
  bulkHandover: (body: { parcelIds: string[]; userId: string; note?: string; isSendEmail: boolean }) =>
    parcelApi.post<ParcelDto[]>('/api/parcels/bulk-handover', body),
  remind: (id: string) => parcelApi.post<boolean>(`/api/parcels/${id}/remind`),
  accessibleDepartments: () => parcelApi.get<ParcelDepartment[]>('/api/departments/accessible'),
  searchUsers: (keyword: string) =>
    parcelApi.get<Paginated<ParcelUser>>('/api/users', { query: { searchKeyword: keyword, pageNumber: 1, pageSize: 20 } }),
};

export const delegationsApi = {
  list: (q: DelegationsQuery) => parcelApi.get<Paginated<DelegationDto>>('/api/delegations', { query: q }),
  /** No parcelId = default (time-bound) delegation; dates required and endDate > startDate. */
  create: (body: { delegatorId: string; parcelId?: string; startDate?: string; endDate?: string; isSendEmail: boolean }) =>
    parcelApi.post<DelegationDto>('/api/delegations', body),
  createBulk: (body: { delegatorId: string; parcelIds: string[]; isSendEmail: boolean }) => parcelApi.post<DelegationDto[]>('/api/delegations/bulk', body),
  edit: (body: { id: string; delegatorId: string; parcelId?: string | null; startDate?: string | null; endDate?: string | null }) =>
    parcelApi.post<DelegationDto>('/api/delegations/edit', body),
  accept: (id: string) => parcelApi.post<DelegationDto>(`/api/delegations/${id}/accept`),
  reject: (id: string) => parcelApi.post<DelegationDto>(`/api/delegations/${id}/reject`),
  renew: (id: string, newEndDate: string) => parcelApi.post<DelegationDto>(`/api/delegations/${id}/renew`, { newEndDate }),
  /** Route name is misspelled on the server ("teminate"); keep it. */
  terminate: (id: string, newEndDate: string) => parcelApi.patch<DelegationDto>(`/api/delegations/${id}/teminate`, { newEndDate }),
  remove: (id: string) => parcelApi.delete<void>(`/api/delegations/${id}`),
};

/**
 * Attachment paths may be absolute server disk paths ("D:\\…\\uploads\\x.jpg"); cut back to the
 * public /uploads root like the web app does.
 */
export function resolveParcelFileUrl(filePath?: string | null) {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;
  let normalized = filePath.replace(/\\/g, '/');
  const index = normalized.toLowerCase().indexOf('/uploads/');
  if (index !== -1) normalized = normalized.slice(index);
  return `${parcelApi.baseUrl}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}
