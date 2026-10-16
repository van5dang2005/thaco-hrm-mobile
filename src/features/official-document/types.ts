import type { DateKey } from '@/core/time/vn';

/**
 * Văn thư (official documents), mobile scope of VANTHU_MOBILE.md: incoming documents the user distributes or
 * processes, and outgoing / internal documents shared with them. Served by `api/officialDocument.api.ts`
 * (mock data for now, shaped so the calls can move to `thaco_be_ql_van_thu`).
 */

/** The user's part in an incoming document's processing (`VanBanDen_ThanhPhanCongViec.VaiTro` 1 / 2 / 3). */
export type DocRole = 'chu_tri' | 'phoi_hop' | 'de_biet';

/**
 * Incoming document status, from `VanBanDen.TrangThai` and `IsTraLai`:
 * 1 → `cho_phan_phoi`, 2 → `dang_xu_ly` (or `bi_tra_lai` when `IsTraLai`), 3 → `khong_xu_ly`, 4 → `da_xu_ly`.
 */
export type IncomingStatus = 'cho_phan_phoi' | 'dang_xu_ly' | 'bi_tra_lai' | 'khong_xu_ly' | 'da_xu_ly';

export type FileKind = 'pdf' | 'doc' | 'xls' | 'other';

export type DocFile = {
  id: string;
  name: string;
  kind: FileKind;
  /** Size as the back-end reports it ("1,2 MB"). */
  size: string;
  /** "Văn bản đóng dấu", "Phụ lục"… */
  description?: string;
  pages?: number;
  /** Absolute URL once the API serves files; mock files have none. */
  url?: string;
};

/** A staff member (`NhanVien`): what person pickers and rows show. */
export type DocPerson = {
  id: string;
  name: string;
  /** MSNV. */
  code: string;
  unit: string;
  position?: string;
  /** Works in `unit` as a concurrent post (`NhanVien_KiemNhiem`). */
  concurrent?: boolean;
};

export type Assignment = { person: DocPerson; role: DocRole };

export type IncomingDoc = {
  id: string;
  /** Số đến (registry number on arrival). */
  soDen: string;
  /** Số ký hiệu of the sender. */
  soHieu: string;
  trichYeu: string;
  /** Sending agency. */
  coQuan: string;
  ngayNhan: DateKey;
  /** Deadline (`HanXuLy`); none before distribution or without processing. */
  han?: DateKey;
  khan: boolean;
  quanTrong: boolean;
  trangThai: IncomingStatus;
  /** The user's role once processing is assigned (none for a distributor only). */
  vaiTro?: DocRole;
  /** The user may distribute it (creator or chosen distributor). */
  coThePhanPhoi: boolean;
  /** Who assigned the processing, and when. */
  nguoiPhanPhoi?: DocPerson;
  phanPhoiLuc?: string;
  yKienPhanPhoi?: string;
  thanhPhan: Assignment[];
  tep: DocFile[];
  lyDoTraLai?: string;
  ketQua?: string;
  ngayHoanTat?: DateKey;
  /** The document was cancelled by the clerk (`IsHuy`). */
  daHuy?: boolean;
  /** The user opened it (distributor red/black, "để biết" read receipt). */
  daXem: boolean;
  /** Opinion the user sent as "phối hợp". */
  yKienCuaToi?: string;
};

/** `VanBan.Loai` 2 / 3. */
export type SharedKind = 'di' | 'noi_bo';

export type SharePermissions = { xem: boolean; tai: boolean; chiaSe: boolean };

export type ShareGrant = { person: DocPerson; quyen: SharePermissions };

export type SharedDoc = {
  id: string;
  kind: SharedKind;
  soHieu: string;
  /** Loại văn bản: Quyết định, Thông báo, Hướng dẫn, Công văn… */
  loai: string;
  trichYeu: string;
  /** Issuing unit. */
  donVi: string;
  ngayGui: DateKey;
  daXem: boolean;
  /** "Theo dõi phản hồi" deadline. */
  hanPhanHoi?: DateKey;
  daHuy: boolean;
  lyDoHuy?: string;
  /** What the user was granted. */
  quyen: SharePermissions;
  nguoiKy: { name: string; position: string };
  nguoiDuThao: string;
  doKhan: string;
  doMat: string;
  /** The stamped main file. */
  vanBan: DocFile;
  tep: DocFile[];
  /** Earlier versions (original before stamping). */
  phienBan: DocFile[];
  /** Who already has it, read-only on the share sheet. */
  daChiaSe: ShareGrant[];
};

/**
 * An outgoing / internal document of my unit registered in the book (`MaSoVanBan` set) but not stamped yet:
 * "Chờ đóng dấu" (VANTHU.md 2.3, label 6). Only the unit's clerk (văn thư đơn vị) gets these; stamping itself
 * stays on the web (drag the seal onto the PDF).
 */
export type StampDoc = {
  id: string;
  kind: SharedKind;
  /** Số ký hiệu given when registering. */
  soHieu: string;
  loai: string;
  trichYeu: string;
  donVi: string;
  ngayVaoSo: DateKey;
  nguoiKy: { name: string; position: string };
  /** Signed on E-sign, waits here for the stamp. */
  tuEsign?: boolean;
};

/** Body of "Chuyển người xử lý" (`POST /api/VanBanDen/PhanPhoiXuLy`). */
export type AssignInput = {
  id: string;
  han?: DateKey;
  khan: boolean;
  quanTrong: boolean;
  khongYeuCauXuLy: boolean;
  yKien: string;
  guiEmail: boolean;
  thanhPhan: Assignment[];
};

/** One item of "Việc của tôi": an incoming document the user has a role in. */
export type DocTask = {
  id: string;
  docId: string;
  soDen: string;
  trichYeu: string;
  role: DocRole;
  /** Distribution day: the task bar starts here. */
  from: DateKey;
  /** Deadline: the task bar ends here (from when there is none). */
  to: DateKey;
  hasDeadline: boolean;
  done: boolean;
  cancelled: boolean;
  chuTri?: string;
  nguoiPhanPhoi?: string;
};
