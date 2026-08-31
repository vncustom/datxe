export const STATUS = {
  NHAP: "nhap",
  CHO_BAN_DUYET: "cho_ban_duyet",
  BAN_TU_CHOI: "ban_tu_choi",
  CHO_DOI_XE: "cho_doi_xe",
  DOI_XE_TU_CHOI: "doi_xe_tu_choi",
  DA_DIEU_XE: "da_dieu_xe",
  DANG_CHAY: "dang_chay",
  HOAN_THANH: "hoan_thanh",
  HUY: "huy",
} as const;

export type BookingStatus = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_LABEL: Record<string, string> = {
  nhap: "Nháp",
  cho_ban_duyet: "Chờ Ban duyệt",
  ban_tu_choi: "Ban từ chối",
  cho_doi_xe: "Chờ Đội xe",
  doi_xe_tu_choi: "Đội xe từ chối",
  da_dieu_xe: "Đã điều xe",
  dang_chay: "Đang chạy",
  hoan_thanh: "Hoàn thành",
  huy: "Đã hủy",
};

/** Màu theo kế hoạch: xám → cam → xanh lá → xanh dương; từ chối = đỏ. */
export const STATUS_COLOR: Record<string, string> = {
  nhap: "#94a3b8",
  cho_ban_duyet: "#6b7280",
  ban_tu_choi: "#dc2626",
  cho_doi_xe: "#ea8a1f",
  doi_xe_tu_choi: "#dc2626",
  da_dieu_xe: "#16a34a",
  dang_chay: "#2563eb",
  hoan_thanh: "#475569",
  huy: "#9ca3af",
};

export function statusLabel(s: string): string {
  return STATUS_LABEL[s] ?? s;
}
export function statusColor(s: string): string {
  return STATUS_COLOR[s] ?? "#6b7280";
}

/** Trạng thái "còn sống" (hiện trên lịch với màu đầy đủ). */
export const ACTIVE_STATUSES: string[] = [
  STATUS.CHO_BAN_DUYET,
  STATUS.CHO_DOI_XE,
  STATUS.DA_DIEU_XE,
  STATUS.DANG_CHAY,
  STATUS.HOAN_THANH,
];

export const REJECTED_STATUSES: string[] = [
  STATUS.BAN_TU_CHOI,
  STATUS.DOI_XE_TU_CHOI,
];
