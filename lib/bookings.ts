import "server-only";
import { prisma } from "@/lib/prisma";
import { APP_TZ } from "@/lib/tz";
import { STATUS } from "@/lib/status";

export const ORIGIN = process.env.ORIGIN_NODE === "cloud" ? "cloud" : "local";
const CODE_PREFIX = ORIGIN === "cloud" ? "C" : "L";
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

const yearFmt = new Intl.DateTimeFormat("en", { timeZone: APP_TZ, year: "numeric" });

/** Mã đơn dạng HTV-L-2026-000123 (L = local, C = cloud) — không trùng giữa 2 DB. */
export async function genBookingCode(now = new Date()): Promise<string> {
  const prefix = `HTV-${CODE_PREFIX}-${yearFmt.format(now)}-`;
  const last = await prisma.booking.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const n = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
  return prefix + String(n).padStart(6, "0");
}

export const bookingInclude = {
  requester: {
    select: { fullName: true, username: true, phone: true, dsBan: true },
  },
  approval: { include: { approver: { select: { fullName: true } } } },
  dispatch: {
    include: {
      vehicle: true,
      driver: { select: { fullName: true, username: true, phone: true } },
      dispatcher: { select: { fullName: true } },
    },
  },
  tripLog: true,
} as const;

export function effectiveEnd(startTime: Date, endTime: Date | null): Date {
  return endTime ?? new Date(startTime.getTime() + DEFAULT_DURATION_MS);
}

export type BusyRow = {
  code: string;
  diemDen: string;
  startTime: Date;
  endTime: Date | null;
  vehicleName: string;
  plateNo: string;
  driverName: string;
};

/** Các chuyến đã điều xe đang bận trong khung giờ [start, end] — để Đội xe tham khảo. */
export async function findBusyInWindow(
  start: Date,
  end: Date | null,
  excludeBookingId?: string,
): Promise<BusyRow[]> {
  const effEnd = effectiveEnd(start, end);
  const rows = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: [STATUS.DA_DIEU_XE, STATUS.DANG_CHAY] },
      dispatch: { is: { deletedAt: null } },
    },
    select: {
      code: true,
      diemDen: true,
      startTime: true,
      endTime: true,
      dispatch: {
        select: {
          vehicle: { select: { name: true, plateNo: true } },
          driver: { select: { fullName: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return rows
    .filter((r) => r.startTime < effEnd && start < effectiveEnd(r.startTime, r.endTime))
    .map((r) => ({
      code: r.code,
      diemDen: r.diemDen,
      startTime: r.startTime,
      endTime: r.endTime,
      vehicleName: r.dispatch?.vehicle.name ?? "",
      plateNo: r.dispatch?.vehicle.plateNo ?? "",
      driverName: r.dispatch?.driver.fullName ?? "",
    }));
}

export type OpenTrip = {
  id: string;
  code: string;
  route: string;
  diemDen: string;
  vehicleName: string;
  plateNo: string;
  driverUsername: string;
  driverName: string;
  since: Date;
  hours: number;
  odoStart: number | null;
  overdue: boolean;
};

const OVERDUE_HOURS = 12;

/** Các chuyến đang chạy (đã nhập km đi) nhưng chưa đóng chuyến. */
export async function getOpenTrips(driverUsername?: string): Promise<OpenTrip[]> {
  const rows = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: STATUS.DANG_CHAY,
      dispatch: driverUsername
        ? { is: { deletedAt: null, driverUsername } }
        : { is: { deletedAt: null } },
    },
    select: {
      id: true,
      code: true,
      diemXuatPhat: true,
      diemDen: true,
      startTime: true,
      endTime: true,
      dispatch: {
        select: {
          driverUsername: true,
          vehicle: { select: { name: true, plateNo: true } },
          driver: { select: { fullName: true } },
        },
      },
      tripLog: { select: { gioXuatBen: true, odoStart: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const now = Date.now();
  return rows.map((r) => {
    const since = r.tripLog?.gioXuatBen ?? r.startTime;
    const hours = Math.max(0, (now - since.getTime()) / 3600_000);
    const overdue =
      (!!r.endTime && now > r.endTime.getTime()) || hours > OVERDUE_HOURS;
    return {
      id: r.id,
      code: r.code,
      route: `${r.diemXuatPhat} → ${r.diemDen}`,
      diemDen: r.diemDen,
      vehicleName: r.dispatch?.vehicle.name ?? "",
      plateNo: r.dispatch?.vehicle.plateNo ?? "",
      driverUsername: r.dispatch?.driverUsername ?? "",
      driverName: r.dispatch?.driver.fullName ?? "",
      since,
      hours,
      odoStart: r.tripLog?.odoStart ?? null,
      overdue,
    };
  });
}
