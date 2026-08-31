import type { Session } from "@/lib/jwt";

export const VP_DAI = "Văn Phòng Đài";

export const ROLE_LABEL: Record<string, string> = {
  nhan_vien: "Nhân viên",
  truong_ban: "Trưởng ban",
  pho_ban: "Phó ban",
  truong_phong: "Trưởng phòng",
  pho_phong: "Phó phòng",
  to_truong: "Tổ trưởng Đội xe",
  to_pho: "Tổ phó Đội xe",
  ban_tgd: "Ban Tổng Giám đốc",
  admin: "Quản trị",
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

/** Trưởng/phó ban — có quyền duyệt đơn của đơn vị mình. */
export function isBanLeader(s: Session): boolean {
  return s.role === "truong_ban" || s.role === "pho_ban";
}

/** Đội xe — điều xe, dashboard, thống kê. */
export function isDoiXe(s: Session): boolean {
  return s.role === "to_truong" || s.role === "to_pho";
}

/** Trưởng/phó ban của Văn Phòng Đài — được hủy đơn sau khi đã điều xe. */
export function isVpDaiLeader(s: Session): boolean {
  return isBanLeader(s) && s.dsBan === VP_DAI;
}

export function isAdmin(s: Session): boolean {
  return s.role === "admin";
}

export function isLanhDaoDai(s: Session): boolean {
  return s.role === "ban_tgd";
}

export function isDriver(s: Session): boolean {
  return s.isDriver;
}

/** Session này có được duyệt đơn thuộc đơn vị `donVi` không. */
export function canApproveFor(s: Session, donVi: string): boolean {
  return isBanLeader(s) && !!s.dsBan && s.dsBan === donVi;
}

/** Quyền hủy đơn theo trạng thái (khớp với cancelBookingAction). */
export function canCancelBooking(
  s: Session,
  bk: { status: string; requesterUsername: string },
): boolean {
  const owner = bk.requesterUsername === s.username;
  if ((bk.status === "cho_ban_duyet" || bk.status === "nhap") && owner) return true;
  if (bk.status === "cho_doi_xe" && (isDoiXe(s) || isVpDaiLeader(s))) return true;
  if (bk.status === "da_dieu_xe" && isVpDaiLeader(s)) return true;
  return false;
}
