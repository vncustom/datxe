import "server-only";
import { prisma } from "@/lib/prisma";
import { STATUS } from "@/lib/status";

/** Quãng đường 1 ngày vượt mức này thì cảnh báo. */
export const KM_DAILY_WARN = 400;
/** Cho phép sai số công-tơ-mét giữa 2 chuyến (km). */
export const GAP_TOLERANCE_KM = 1;

export type OdoAlert = {
  vehicleId: string;
  plateNo: string;
  vehicleName: string;
  kind: "gap" | "giam";
  km: number;
  prevCode: string;
  prevOdoEnd: number;
  curId: string;
  curCode: string;
  curOdoStart: number;
  at: Date;
  acked: boolean;
  ackedBy: string | null;
};

/** refId của các cảnh báo đã bấm "Biết rồi". */
export async function getAckedRefIds(
  kind = "odo_gap",
): Promise<Map<string, string>> {
  const rows = await prisma.alertAck.findMany({
    where: { kind, deletedAt: null },
    select: { refId: true, ackedBy: true },
  });
  return new Map(rows.map((r) => [r.refId, r.ackedBy]));
}

type TripRow = {
  id: string;
  code: string;
  odoStart: number;
  odoEnd: number;
  gioXuatBen: Date | null;
  createdAt: Date;
  vehicleId: string;
  plateNo: string;
  vehicleName: string;
};

async function closedTrips(): Promise<TripRow[]> {
  const rows = await prisma.tripLog.findMany({
    where: {
      deletedAt: null,
      daDongChuyen: true,
      odoStart: { not: null },
      odoEnd: { not: null },
    },
    select: {
      bookingId: true,
      odoStart: true,
      odoEnd: true,
      gioXuatBen: true,
      createdAt: true,
      booking: {
        select: {
          code: true,
          dispatch: {
            select: {
              vehicle: { select: { id: true, plateNo: true, name: true } },
            },
          },
        },
      },
    },
  });

  return rows
    .filter((r) => r.booking.dispatch?.vehicle)
    .map((r) => ({
      id: r.bookingId,
      code: r.booking.code,
      odoStart: r.odoStart as number,
      odoEnd: r.odoEnd as number,
      gioXuatBen: r.gioXuatBen,
      createdAt: r.createdAt,
      vehicleId: r.booking.dispatch!.vehicle.id,
      plateNo: r.booking.dispatch!.vehicle.plateNo,
      vehicleName: r.booking.dispatch!.vehicle.name,
    }));
}

const tKey = (t: TripRow) => (t.gioXuatBen ?? t.createdAt).getTime();

/** Cảnh báo: km chạy ngoài đơn (gap) hoặc công-tơ-mét giảm (nhập sai). */
export async function getOdometerAlerts(): Promise<OdoAlert[]> {
  const [trips, acked] = await Promise.all([closedTrips(), getAckedRefIds()]);
  const byVeh = new Map<string, TripRow[]>();
  for (const t of trips) {
    const arr = byVeh.get(t.vehicleId);
    if (arr) arr.push(t);
    else byVeh.set(t.vehicleId, [t]);
  }

  const alerts: OdoAlert[] = [];
  for (const list of byVeh.values()) {
    list.sort((a, b) => tKey(a) - tKey(b));
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const cur = list[i];
      const diff = cur.odoStart - prev.odoEnd;
      if (diff > GAP_TOLERANCE_KM || diff < 0) {
        alerts.push({
          vehicleId: cur.vehicleId,
          plateNo: cur.plateNo,
          vehicleName: cur.vehicleName,
          kind: diff < 0 ? "giam" : "gap",
          km: diff,
          prevCode: prev.code,
          prevOdoEnd: prev.odoEnd,
          curId: cur.id,
          curCode: cur.code,
          curOdoStart: cur.odoStart,
          at: cur.gioXuatBen ?? cur.createdAt,
          acked: acked.has(cur.id),
          ackedBy: acked.get(cur.id) ?? null,
        });
      }
    }
  }
  alerts.sort((a, b) => b.at.getTime() - a.at.getTime());
  return alerts;
}

export type VehicleOdoSummary = {
  id: string;
  name: string;
  plateNo: string;
  seats: number;
  currentOdometer: number;
  trips30d: number;
  km30d: number;
  lastClosed: { code: string; odoEnd: number; at: Date } | null;
  runningCode: string | null;
};

export async function getVehicleOdoSummaries(): Promise<VehicleOdoSummary[]> {
  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });

  const out: VehicleOdoSummary[] = [];
  for (const v of vehicles) {
    const closed = await prisma.tripLog.findMany({
      where: {
        deletedAt: null,
        daDongChuyen: true,
        odoEnd: { not: null },
        booking: { is: { dispatch: { is: { vehicleId: v.id } } } },
      },
      select: {
        odoEnd: true,
        soKm: true,
        gioXuatBen: true,
        gioKetThuc: true,
        createdAt: true,
        booking: { select: { code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const recent = closed.filter(
      (t) => (t.gioKetThuc ?? t.createdAt).getTime() >= since.getTime(),
    );
    const last = closed
      .slice()
      .sort(
        (a, b) =>
          (b.gioXuatBen ?? b.createdAt).getTime() -
          (a.gioXuatBen ?? a.createdAt).getTime(),
      )[0];

    const running = await prisma.booking.findFirst({
      where: {
        deletedAt: null,
        status: STATUS.DANG_CHAY,
        dispatch: { is: { vehicleId: v.id, deletedAt: null } },
      },
      select: { code: true },
    });

    out.push({
      id: v.id,
      name: v.name,
      plateNo: v.plateNo,
      seats: v.seats,
      currentOdometer: v.currentOdometer,
      trips30d: recent.length,
      km30d: recent.reduce((s, t) => s + (t.soKm ?? 0), 0),
      lastClosed: last
        ? {
            code: last.booking.code,
            odoEnd: last.odoEnd as number,
            at: last.gioXuatBen ?? last.createdAt,
          }
        : null,
      runningCode: running?.code ?? null,
    });
  }
  return out;
}
