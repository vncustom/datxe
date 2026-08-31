import "server-only";
import { prisma } from "@/lib/prisma";
import { GAP_TOLERANCE_KM } from "@/lib/odometer";
import { instantFromVN, vnParts } from "@/lib/tz";

const pad = (n: number) => String(n).padStart(2, "0");

export type Range = { from: Date; to: Date; key: string; label: string };

function monthRange(y: number, m: number): Range {
  const from = instantFromVN(`${y}-${pad(m)}-01`, "00:00");
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const to = instantFromVN(`${ny}-${pad(nm)}-01`, "00:00");
  return { from, to, key: `${y}-${pad(m)}`, label: `Tháng ${m}/${y}` };
}

/** Đọc khoảng thời gian từ query: ?tu=&den= (den tính hết ngày) | ?ngay= | ?thang=YYYY-MM. Mặc định tháng hiện tại. */
export function parseRange(sp: URLSearchParams | Record<string, string | undefined>): Range {
  const get = (k: string) =>
    sp instanceof URLSearchParams ? sp.get(k) ?? undefined : sp[k];

  const tu = get("tu");
  const den = get("den");
  const ngay = get("ngay");
  const thang = get("thang");

  if (tu && /^\d{4}-\d{2}-\d{2}$/.test(tu)) {
    const endDay = den && /^\d{4}-\d{2}-\d{2}$/.test(den) ? den : tu;
    const to = new Date(instantFromVN(endDay, "00:00").getTime() + 24 * 3600_000);
    return {
      from: instantFromVN(tu, "00:00"),
      to,
      key: `${tu}_${endDay}`,
      label: `${fmtDay(tu)} – ${fmtDay(endDay)}`,
    };
  }
  if (ngay && /^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
    return {
      from: instantFromVN(ngay, "00:00"),
      to: new Date(instantFromVN(ngay, "00:00").getTime() + 24 * 3600_000),
      key: ngay,
      label: `Ngày ${fmtDay(ngay)}`,
    };
  }
  if (thang && /^\d{4}-\d{2}$/.test(thang)) {
    const [y, m] = thang.split("-").map(Number);
    return monthRange(y, m);
  }
  const now = vnParts(new Date());
  return monthRange(now.year, now.month);
}

function fmtDay(k: string) {
  const [y, m, d] = k.split("-");
  return `${d}/${m}/${y}`;
}

// ---------------- dữ liệu chuyến đã đóng ----------------

type Raw = {
  bookingId: string;
  code: string;
  noiDung: string;
  diemXuatPhat: string;
  diemDen: string;
  isPhatSinh: boolean;
  driverUsername: string;
  driverName: string;
  vehicleId: string;
  vehicleName: string;
  plateNo: string;
  odoStart: number;
  odoEnd: number;
  soKm: number;
  gioXuatBen: Date | null;
  gioKetThuc: Date | null;
  sortAt: Date;
};

async function allClosedTrips(): Promise<Raw[]> {
  const rows = await prisma.tripLog.findMany({
    where: {
      deletedAt: null,
      daDongChuyen: true,
      odoStart: { not: null },
      odoEnd: { not: null },
      soKm: { not: null },
    },
    select: {
      bookingId: true,
      driverUsername: true,
      odoStart: true,
      odoEnd: true,
      soKm: true,
      gioXuatBen: true,
      gioKetThuc: true,
      createdAt: true,
      driver: { select: { fullName: true } },
      booking: {
        select: {
          code: true,
          noiDung: true,
          diemXuatPhat: true,
          diemDen: true,
          isPhatSinh: true,
          startTime: true,
          dispatch: {
            select: { vehicle: { select: { id: true, name: true, plateNo: true } } },
          },
        },
      },
    },
  });

  return rows
    .filter((r) => r.booking.dispatch?.vehicle)
    .map((r) => ({
      bookingId: r.bookingId,
      code: r.booking.code,
      noiDung: r.booking.noiDung,
      diemXuatPhat: r.booking.diemXuatPhat,
      diemDen: r.booking.diemDen,
      isPhatSinh: r.booking.isPhatSinh,
      driverUsername: r.driverUsername,
      driverName: r.driver.fullName,
      vehicleId: r.booking.dispatch!.vehicle.id,
      vehicleName: r.booking.dispatch!.vehicle.name,
      plateNo: r.booking.dispatch!.vehicle.plateNo,
      odoStart: r.odoStart as number,
      odoEnd: r.odoEnd as number,
      soKm: r.soKm as number,
      gioXuatBen: r.gioXuatBen,
      gioKetThuc: r.gioKetThuc,
      sortAt: r.gioXuatBen ?? r.booking.startTime,
    }));
}

const inRange = (t: Raw, r: Range) =>
  t.sortAt.getTime() >= r.from.getTime() && t.sortAt.getTime() < r.to.getTime();

const tripHours = (t: Raw) => {
  if (!t.gioXuatBen || !t.gioKetThuc) return 0;
  const h = (t.gioKetThuc.getTime() - t.gioXuatBen.getTime()) / 3600_000;
  return h > 0 ? h : 0;
};

/** Gap công-tơ-mét giữa 2 chuyến liên tiếp cùng xe, gán cho chuyến sau (bookingId). */
function gapsByBooking(trips: Raw[]): Map<string, number> {
  const byVeh = new Map<string, Raw[]>();
  for (const t of trips) {
    const a = byVeh.get(t.vehicleId);
    if (a) a.push(t);
    else byVeh.set(t.vehicleId, [t]);
  }
  const out = new Map<string, number>();
  for (const list of byVeh.values()) {
    list.sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime());
    for (let i = 1; i < list.length; i++) {
      const d = list[i].odoStart - list[i - 1].odoEnd;
      if (d > GAP_TOLERANCE_KM || d < 0) out.set(list[i].bookingId, d);
    }
  }
  return out;
}

// ---------------- thống kê lái xe ----------------

export type DriverStat = {
  username: string;
  fullName: string;
  trips: number;
  phatSinh: number;
  km: number;
  hours: number;
  unaccountedKm: number;
};

export async function getDriverStats(range: Range): Promise<DriverStat[]> {
  const [trips, drivers] = await Promise.all([
    allClosedTrips(),
    prisma.user.findMany({
      where: { isDriver: true, isActive: true, deletedAt: null },
      select: { username: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);
  const gaps = gapsByBooking(trips);
  const period = trips.filter((t) => inRange(t, range));

  const map = new Map<string, DriverStat>();
  for (const d of drivers)
    map.set(d.username, {
      username: d.username,
      fullName: d.fullName,
      trips: 0,
      phatSinh: 0,
      km: 0,
      hours: 0,
      unaccountedKm: 0,
    });

  for (const t of period) {
    let row = map.get(t.driverUsername);
    if (!row) {
      row = {
        username: t.driverUsername,
        fullName: t.driverName,
        trips: 0,
        phatSinh: 0,
        km: 0,
        hours: 0,
        unaccountedKm: 0,
      };
      map.set(t.driverUsername, row);
    }
    row.trips += 1;
    if (t.isPhatSinh) row.phatSinh += 1;
    row.km += t.soKm;
    row.hours += tripHours(t);
    const g = gaps.get(t.bookingId);
    if (g && g > 0) row.unaccountedKm += g;
  }

  return [...map.values()].sort((a, b) => b.km - a.km);
}

// ---------------- thống kê xe ----------------

export type VehicleStat = {
  id: string;
  name: string;
  plateNo: string;
  trips: number;
  kmByTrips: number;
  odoDelta: number;
  unaccountedKm: number;
  currentOdometer: number;
};

export async function getVehicleStats(range: Range): Promise<VehicleStat[]> {
  const [trips, vehicles] = await Promise.all([
    allClosedTrips(),
    prisma.vehicle.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ]);
  const gaps = gapsByBooking(trips);
  const period = trips.filter((t) => inRange(t, range));

  return vehicles.map((v) => {
    const list = period
      .filter((t) => t.vehicleId === v.id)
      .sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime());
    const kmByTrips = list.reduce((s, t) => s + t.soKm, 0);
    const odoDelta =
      list.length > 0 ? list[list.length - 1].odoEnd - list[0].odoStart : 0;
    const unaccountedKm = list.reduce((s, t) => {
      const g = gaps.get(t.bookingId);
      return s + (g && g > 0 ? g : 0);
    }, 0);
    return {
      id: v.id,
      name: v.name,
      plateNo: v.plateNo,
      trips: list.length,
      kmByTrips,
      odoDelta,
      unaccountedKm,
      currentOdometer: v.currentOdometer,
    };
  });
}

// ---------------- dòng thời gian công-tơ-mét ----------------

export type TimelineTrip = {
  code: string;
  bookingId: string;
  driverName: string;
  odoStart: number;
  odoEnd: number;
  soKm: number;
  prevOdoEnd: number | null;
  gap: number | null;
  at: Date;
};

export type VehicleTimeline = {
  id: string;
  name: string;
  plateNo: string;
  trips: TimelineTrip[];
};

export async function getVehicleTimelines(range: Range): Promise<VehicleTimeline[]> {
  const [trips, vehicles] = await Promise.all([
    allClosedTrips(),
    prisma.vehicle.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ]);

  return vehicles.map((v) => {
    const chain = trips
      .filter((t) => t.vehicleId === v.id)
      .sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime());
    const out: TimelineTrip[] = [];
    for (let i = 0; i < chain.length; i++) {
      const t = chain[i];
      if (!inRange(t, range)) continue;
      const prevOdoEnd = i > 0 ? chain[i - 1].odoEnd : null;
      const gap = prevOdoEnd != null ? t.odoStart - prevOdoEnd : null;
      out.push({
        code: t.code,
        bookingId: t.bookingId,
        driverName: t.driverName,
        odoStart: t.odoStart,
        odoEnd: t.odoEnd,
        soKm: t.soKm,
        prevOdoEnd,
        gap,
        at: t.sortAt,
      });
    }
    return { id: v.id, name: v.name, plateNo: v.plateNo, trips: out };
  });
}

// ---------------- chi tiết chuyến của 1 lái xe ----------------

export type DriverTrip = {
  code: string;
  bookingId: string;
  at: Date;
  gioKetThuc: Date | null;
  vehicle: string;
  plateNo: string;
  route: string;
  noiDung: string;
  soKm: number;
  hours: number;
  isPhatSinh: boolean;
};

export async function getDriverTrips(
  username: string,
  range: Range,
): Promise<{ fullName: string; trips: DriverTrip[] }> {
  const [all, user] = await Promise.all([
    allClosedTrips(),
    prisma.user.findUnique({
      where: { username },
      select: { fullName: true },
    }),
  ]);
  const trips = all
    .filter((t) => t.driverUsername === username && inRange(t, range))
    .sort((a, b) => a.sortAt.getTime() - b.sortAt.getTime())
    .map((t) => ({
      code: t.code,
      bookingId: t.bookingId,
      at: t.sortAt,
      gioKetThuc: t.gioKetThuc,
      vehicle: t.vehicleName,
      plateNo: t.plateNo,
      route: `${t.diemXuatPhat} → ${t.diemDen}`,
      noiDung: t.noiDung,
      soKm: t.soKm,
      hours: tripHours(t),
      isPhatSinh: t.isPhatSinh,
    }));
  return { fullName: user?.fullName ?? username, trips };
}
