import "server-only";
import { prisma } from "@/lib/prisma";
import type { Session } from "@/lib/jwt";
import { isBanLeader, isDoiXe } from "@/lib/rbac";
import { STATUS } from "@/lib/status";

export type Badges = {
  duyet: number;
  dieuXe: number;
  chuyenLaiXe: number;
  chuyenChuaDong: number;
  donCuaToi: number;
};

export async function getBadges(s: Session): Promise<Badges> {
  const [duyet, dieuXe, chuyenLaiXe, chuyenChuaDong, donCuaToi] = await Promise.all([
    isBanLeader(s) && s.dsBan
      ? prisma.booking.count({
          where: {
            deletedAt: null,
            status: STATUS.CHO_BAN_DUYET,
            donViYeuCau: s.dsBan,
          },
        })
      : Promise.resolve(0),
    isDoiXe(s)
      ? prisma.booking.count({
          where: { deletedAt: null, status: STATUS.CHO_DOI_XE },
        })
      : Promise.resolve(0),
    s.isDriver
      ? prisma.booking.count({
          where: {
            deletedAt: null,
            status: { in: [STATUS.DA_DIEU_XE, STATUS.DANG_CHAY] },
            dispatch: { is: { driverUsername: s.username, deletedAt: null } },
          },
        })
      : Promise.resolve(0),
    s.isDriver
      ? prisma.booking.count({
          where: {
            deletedAt: null,
            status: STATUS.DANG_CHAY,
            dispatch: { is: { driverUsername: s.username, deletedAt: null } },
          },
        })
      : Promise.resolve(0),
    prisma.booking.count({
      where: {
        deletedAt: null,
        requesterUsername: s.username,
        status: {
          in: [
            STATUS.BAN_TU_CHOI,
            STATUS.DOI_XE_TU_CHOI,
            STATUS.DA_DIEU_XE,
          ],
        },
      },
    }),
  ]);

  return { duyet, dieuXe, chuyenLaiXe, chuyenChuaDong, donCuaToi };
}
