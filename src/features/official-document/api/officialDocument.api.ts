import { todayKey } from '@/core/time/vn';

import type { AssignInput, DocPerson, IncomingDoc, ShareGrant, SharedDoc, StampDoc } from '../types';
import { directory, incomingSeed, me, sharedSeed, stampSeed } from './mock';

/**
 * Văn thư calls. For now they run against an in-memory copy of `mock.ts` (changes last until the app
 * restarts), with a short delay so loading states show. Each call names the `thaco_be_ql_van_thu` endpoint
 * it stands for (VANTHU.md); swapping one means mapping that endpoint's DTO onto these types.
 */

const LATENCY_MS = 350;
const NOT_FOUND = 'Không tìm thấy văn bản hoặc bạn không còn quyền xem.';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

let incoming: IncomingDoc[] = clone(incomingSeed);
let shared: SharedDoc[] = clone(sharedSeed);

/** A chủ trì who returned a document loses sight of it unless they may distribute it too. */
function visible(doc: IncomingDoc) {
  return doc.trangThai !== 'bi_tra_lai' || doc.coThePhanPhoi;
}

async function updateIncoming(id: string, change: (doc: IncomingDoc) => IncomingDoc) {
  await wait();
  if (!incoming.some((d) => d.id === id && visible(d))) throw new Error(NOT_FOUND);
  incoming = incoming.map((d) => (d.id === id ? change(d) : d));
  return true;
}

export const officialDocumentApi = {
  /** The signed-in staff member (`GET /api/User/Info`). */
  async me(): Promise<DocPerson> {
    await wait();
    return clone(me);
  },

  /** `GET /api/VanBanDen?chiDuocChiaSe=true`: documents I distribute or have a role in. */
  async incoming(): Promise<IncomingDoc[]> {
    await wait();
    return clone(incoming.filter(visible));
  },

  /** `GET /api/VanBanDen/{id}` + `…/TepTin`. */
  async incomingDetail(id: string): Promise<IncomingDoc> {
    await wait();
    const doc = incoming.find((d) => d.id === id && visible(d));
    if (!doc) throw new Error(NOT_FOUND);
    return clone(doc);
  },

  /** `POST /api/VanBanDen/{id}/GhiNhanDaDoc`. */
  markIncomingRead: (id: string) => updateIncoming(id, (d) => ({ ...d, daXem: true })),

  /** `POST /api/VanBanDen/PhanPhoiXuLy`: assigns chủ trì / phối hợp / để biết. */
  assign: (input: AssignInput) =>
    updateIncoming(input.id, (d) => ({
      ...d,
      trangThai: input.khongYeuCauXuLy ? 'khong_xu_ly' : 'dang_xu_ly',
      han: input.khongYeuCauXuLy ? undefined : input.han,
      khan: input.khan,
      quanTrong: input.quanTrong,
      yKienPhanPhoi: input.yKien.trim() || undefined,
      thanhPhan: input.thanhPhan,
      vaiTro: input.thanhPhan.find((a) => a.person.id === me.id)?.role,
      nguoiPhanPhoi: me,
      phanPhoiLuc: new Date().toISOString(),
      lyDoTraLai: undefined,
      daXem: true,
    })),

  /** `POST /api/VanBanDen/HoanTat`. */
  complete: (id: string, ketQua: string) =>
    updateIncoming(id, (d) => ({ ...d, trangThai: 'da_xu_ly', ketQua: ketQua.trim(), ngayHoanTat: todayKey() })),

  /** `POST /api/VanBanDen/TraLai`: back to the distributor; the processing team no longer sees it. */
  returnDoc: (id: string, lyDo: string) => updateIncoming(id, (d) => ({ ...d, trangThai: 'bi_tra_lai', lyDoTraLai: lyDo.trim() })),

  /** "Gửi ý kiến" of a phối hợp member. No endpoint in `thaco_be_ql_van_thu` yet. */
  sendOpinion: (id: string, yKien: string) => updateIncoming(id, (d) => ({ ...d, yKienCuaToi: yKien.trim() })),

  /** `GET /api/VanBan/VaoSo?loai=2|3&chiDuocChiaSe=true`. */
  async shared(): Promise<SharedDoc[]> {
    await wait();
    return clone(shared);
  },

  /** `GET /api/VanBan/{id}` + `…/TepTin`. */
  async sharedDetail(id: string): Promise<SharedDoc> {
    await wait();
    const doc = shared.find((d) => d.id === id);
    if (!doc) throw new Error(NOT_FOUND);
    return clone(doc);
  },

  /** `POST /api/VanBan/{id}/GhiNhanDaDoc`. */
  async markSharedRead(id: string): Promise<boolean> {
    await wait();
    shared = shared.map((d) => (d.id === id ? { ...d, daXem: true } : d));
    return true;
  },

  /** `POST /api/VanBan/ChiaSe` with the existing grants plus `grants` (the API takes the final list). */
  async share(id: string, grants: ShareGrant[]): Promise<boolean> {
    await wait();
    const doc = shared.find((d) => d.id === id);
    if (!doc) throw new Error(NOT_FOUND);
    if (!doc.quyen.chiaSe) throw new Error('Bạn không có quyền chia sẻ văn bản này');
    shared = shared.map((d) => (d.id === id ? { ...d, daChiaSe: [...d.daChiaSe, ...grants] } : d));
    return true;
  },

  /** `GET /api/VanBan/VaoSo?loai=2|3`, rows with `maSoVanBan`, `canDongDau` and not `isDongDau` / `isHuy`: "Chờ đóng dấu". */
  async stampQueue(): Promise<StampDoc[]> {
    await wait();
    return clone(stampSeed);
  },

  /** `GET /api/VanBanDen/{id}/ThanhPhanPhanPhoi` / `GET /api/VanBan/{id}/ThanhPhan`: staff of my unit. */
  async people(): Promise<DocPerson[]> {
    await wait();
    return clone(directory);
  },
};
