"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, type Session } from "@/lib/auth";
import { isDoiXe } from "@/lib/rbac";
import { STATUS } from "@/lib/status";
import { ORIGIN } from "@/lib/bookings";
import { KM_DAILY_WARN } from "@/lib/odometer";
import { fromDatetimeLocal } from "@/lib/tz";

export type TripState = { error?: string; warn?: string; ok?: string };

const str = (v: FormDataEntryValue | null): string | null => {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
};

const intOrNull = (v: FormDataEntryValue | null): number | null => {
  const t = String(v ?? "").trim().replace(/[.,\s]/g, "");
  return /^\d+$/.test(t) ? Number(t) : null;
};

const vi = (n: number) => n.toLocaleString("vi-VN");

function revalidate(id?: string) {
  revalidatePath("/lich");
  revalidatePath("/dieu-xe");
  revalidatePath("/chuyen-cua-toi");
  revalidatePath("/cong-to-met");
  revalidatePath("/thong-bao");
  if (id) revalidatePath(`/don/${id}`);
}

async function loadCtx(id: string, s: Session) {
  const bk = await prisma.booking.findUnique({
    where: { id },
    include: { dispatch: { include: { vehicle: true } }, tripLog: true },
  });
  if (!bk || bk.deletedAt || !bk.dispatch) return null;
  const assigned = bk.dispatch.driverUsername === s.username;
  if (!assigned && !isDoiXe(s)) return null;
  return bk as typeof bk & { dispatch: NonNullable<typeof bk.dispatch> };
}

export async function startTripAction(
  _prev: TripState,
  fd: FormData,
): Promise<TripState> {
  const s = await requireSession();
  const id = String(fd.get("bookingId") ?? "");
  const bk = await loadCtx(id, s);
  if (!bk) return { error: "Không tìm thấy chuyến hoặc bạn không có quyền." };
  if (bk.status !== STATUS.DA_DIEU_XE)
    return { error: "Chuyến không ở trạng thái 'Đã điều xe'." };

  const odoStart = intOrNull(fd.get("odoStart"));
  if (odoStart == null) return { error: "Nhập số km lúc xuất bến (số nguyên)." };

  const openOther = await prisma.booking.findFirst({
    where: {
      deletedAt: null,
      status: STATUS.DANG_CHAY,
      id: { not: id },
      dispatch: { is: { vehicleId: bk.dispatch.vehicleId, deletedAt: null } },
    },
    select: { code: true },
  });
  if (openOther)
    return {
      error: `Xe đang có chuyến chưa đóng (${openOther.code}). Đóng chuyến đó trước.`,
    };

  const gioRaw = String(fd.get("gioXuatBen") ?? "");
  const gioXuatBen = gioRaw ? fromDatetimeLocal(gioRaw) : bk.startTime;
  const expected = bk.dispatch.vehicle.currentOdometer;

  await prisma.$transaction([
    prisma.tripLog.upsert({
      where: { bookingId: id },
      create: {
        bookingId: id,
        driverUsername: bk.dispatch.driverUsername,
        odoStart,
        gioXuatBen,
        updatedBy: s.username,
        originNode: ORIGIN,
      },
      update: { odoStart, gioXuatBen, updatedBy: s.username, deletedAt: null },
    }),
    prisma.booking.update({
      where: { id },
      data: { status: STATUS.DANG_CHAY, updatedBy: s.username },
    }),
    prisma.odometerEvent.create({
      data: {
        vehicleId: bk.dispatch.vehicleId,
        bookingId: id,
        loai: "start",
        odoValue: odoStart,
        byUsername: s.username,
        originNode: ORIGIN,
      },
    }),
  ]);

  revalidate(id);
  const warn =
    expected > 0 && odoStart !== expected
      ? `Số km nhập (${vi(odoStart)}) khác số hệ thống đang ghi cho xe (${vi(
          expected,
        )}). Chênh lệch sẽ hiện ở mục Công-tơ-mét.`
      : undefined;
  return { ok: "Đã bắt đầu chuyến.", warn };
}

export async function endTripAction(
  _prev: TripState,
  fd: FormData,
): Promise<TripState> {
  const s = await requireSession();
  const id = String(fd.get("bookingId") ?? "");
  const bk = await loadCtx(id, s);
  if (!bk || !bk.tripLog) return { error: "Không tìm thấy chuyến." };
  if (bk.status !== STATUS.DANG_CHAY)
    return { error: "Chuyến không ở trạng thái 'Đang chạy'." };
  if (bk.tripLog.odoStart == null) return { error: "Chưa có số km lúc đi." };

  const odoStart = bk.tripLog.odoStart;
  const odoEnd = intOrNull(fd.get("odoEnd"));
  if (odoEnd == null) return { error: "Nhập số km lúc về (số nguyên)." };
  if (odoEnd < odoStart)
    return {
      error: `Số km lúc về (${vi(odoEnd)}) phải ≥ số km lúc đi (${vi(odoStart)}).`,
    };

  const soKm = odoEnd - odoStart;
  const gioRaw = String(fd.get("gioKetThuc") ?? "");
  const gioKetThuc = gioRaw ? fromDatetimeLocal(gioRaw) : new Date();
  const gioXuatBen = bk.tripLog.gioXuatBen;
  const timeWarn =
    gioXuatBen && gioKetThuc <= gioXuatBen
      ? "Thời gian kết thúc không sau thời gian xuất bến — đã lưu nhưng nên kiểm tra lại."
      : undefined;

  await prisma.$transaction([
    prisma.tripLog.update({
      where: { bookingId: id },
      data: {
        odoEnd,
        gioKetThuc,
        soKm,
        ghiChuLaiXe: str(fd.get("ghiChuLaiXe")),
        daDongChuyen: true,
        updatedBy: s.username,
      },
    }),
    prisma.booking.update({
      where: { id },
      data: { status: STATUS.HOAN_THANH, updatedBy: s.username },
    }),
    prisma.vehicle.update({
      where: { id: bk.dispatch.vehicleId },
      data: { currentOdometer: odoEnd, updatedBy: s.username },
    }),
    prisma.odometerEvent.create({
      data: {
        vehicleId: bk.dispatch.vehicleId,
        bookingId: id,
        loai: "end",
        odoValue: odoEnd,
        byUsername: s.username,
        originNode: ORIGIN,
      },
    }),
  ]);

  revalidate(id);
  const kmWarn =
    soKm > KM_DAILY_WARN
      ? `Quãng đường ${vi(soKm)} km vượt ngưỡng cảnh báo ${vi(KM_DAILY_WARN)} km.`
      : undefined;
  const warn = [kmWarn, timeWarn].filter(Boolean).join(" ") || undefined;
  return { ok: `Đã đóng chuyến. Quãng đường: ${vi(soKm)} km.`, warn };
}

/** Tổ trưởng / Tổ phó điều chỉnh số km của chuyến đã đóng (ghi audit). */
export async function adjustTripAction(fd: FormData): Promise<void> {
  const s = await requireSession();
  if (!isDoiXe(s)) throw new Error("Chỉ Đội xe được điều chỉnh số km.");
  const id = String(fd.get("bookingId") ?? "");
  const bk = await prisma.booking.findUnique({
    where: { id },
    include: { tripLog: true, dispatch: true },
  });
  if (!bk?.tripLog || !bk.dispatch) return;

  const odoStart = intOrNull(fd.get("odoStart")) ?? bk.tripLog.odoStart;
  const odoEnd = intOrNull(fd.get("odoEnd")) ?? bk.tripLog.odoEnd;
  if (odoStart == null || odoEnd == null || odoEnd < odoStart)
    throw new Error("Số km không hợp lệ.");
  const soKm = odoEnd - odoStart;

  const before = {
    odoStart: bk.tripLog.odoStart,
    odoEnd: bk.tripLog.odoEnd,
    soKm: bk.tripLog.soKm,
  };

  await prisma.$transaction([
    prisma.tripLog.update({
      where: { bookingId: id },
      data: { odoStart, odoEnd, soKm, updatedBy: s.username },
    }),
    prisma.auditLog.create({
      data: {
        entity: "trip_log",
        entityId: id,
        action: "dieu_chinh_km",
        byUsername: s.username,
        diff: JSON.stringify({
          before,
          after: { odoStart, odoEnd, soKm },
          lyDo: str(fd.get("lyDo")),
        }),
        originNode: ORIGIN,
      },
    }),
  ]);

  // Đồng bộ lại currentOdometer = odoEnd lớn nhất trong các chuyến đã đóng của xe
  const agg = await prisma.tripLog.aggregate({
    where: {
      deletedAt: null,
      daDongChuyen: true,
      booking: { is: { dispatch: { is: { vehicleId: bk.dispatch.vehicleId } } } },
    },
    _max: { odoEnd: true },
  });
  if (agg._max.odoEnd != null) {
    await prisma.vehicle.update({
      where: { id: bk.dispatch.vehicleId },
      data: { currentOdometer: agg._max.odoEnd, updatedBy: s.username },
    });
  }

  revalidate(id);
}

/** Đội xe đặt lại số công-tơ-mét gốc của một xe (dùng khi khởi tạo). */
export async function setVehicleOdometerAction(fd: FormData): Promise<void> {
  const s = await requireSession();
  if (!isDoiXe(s)) throw new Error("Chỉ Đội xe được chỉnh số km xe.");
  const vehicleId = String(fd.get("vehicleId") ?? "");
  const value = intOrNull(fd.get("odoValue"));
  if (value == null) throw new Error("Số km không hợp lệ.");
  const veh = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!veh || veh.deletedAt) return;

  await prisma.$transaction([
    prisma.vehicle.update({
      where: { id: vehicleId },
      data: { currentOdometer: value, updatedBy: s.username },
    }),
    prisma.odometerEvent.create({
      data: {
        vehicleId,
        loai: "dieu_chinh",
        odoValue: value,
        byUsername: s.username,
        originNode: ORIGIN,
      },
    }),
    prisma.auditLog.create({
      data: {
        entity: "vehicle",
        entityId: vehicleId,
        action: "set_odometer",
        byUsername: s.username,
        diff: JSON.stringify({ before: veh.currentOdometer, after: value }),
        originNode: ORIGIN,
      },
    }),
  ]);

  revalidatePath("/cong-to-met");
}
