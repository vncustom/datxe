"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canApproveFor, isDoiXe, isVpDaiLeader } from "@/lib/rbac";
import { STATUS } from "@/lib/status";
import { genBookingCode, ORIGIN } from "@/lib/bookings";
import { fromDatetimeLocal } from "@/lib/tz";

export type FormState = { error?: string };

const str = (v: FormDataEntryValue | null): string | null => {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
};

function revalidateAll(id?: string) {
  revalidatePath("/lich");
  revalidatePath("/duyet");
  revalidatePath("/dieu-xe");
  revalidatePath("/cua-toi");
  revalidatePath("/chuyen-cua-toi");
  revalidatePath("/thong-bao");
  if (id) revalidatePath(`/don/${id}`);
}

export async function createBookingAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const s = await requireSession();

  const startRaw = String(fd.get("startTime") ?? "");
  const endRaw = String(fd.get("endTime") ?? "");
  const diemDen = String(fd.get("diemDen") ?? "").trim();
  const noiDung = String(fd.get("noiDung") ?? "").trim();
  const donVi = (str(fd.get("donViYeuCau")) ?? s.dsBan ?? "").trim();

  if (!startRaw) return { error: "Chọn thời gian bắt đầu." };
  if (!diemDen) return { error: "Nhập địa điểm đến." };
  if (!noiDung) return { error: "Nhập nội dung công tác." };

  const startTime = fromDatetimeLocal(startRaw);
  const endTime = endRaw ? fromDatetimeLocal(endRaw) : null;
  if (Number.isNaN(startTime.getTime())) return { error: "Thời gian bắt đầu không hợp lệ." };
  if (endTime && endTime <= startTime)
    return { error: "Thời gian kết thúc phải sau thời gian bắt đầu." };

  const soNguoiRaw = String(fd.get("soNguoi") ?? "").trim();
  const soNguoi = soNguoiRaw ? Math.max(1, Math.trunc(Number(soNguoiRaw)) || 1) : null;

  const isPhatSinh = fd.get("isPhatSinh") === "on" && (isDoiXe(s) || s.isDriver);

  const code = await genBookingCode(startTime);
  const created = await prisma.booking.create({
    data: {
      code,
      requesterUsername: s.username,
      donViYeuCau: donVi || "(chưa rõ)",
      startTime,
      endTime,
      diemXuatPhat: (str(fd.get("diemXuatPhat")) ?? "HTV") || "HTV",
      diemDen,
      noiDung,
      bienTap: str(fd.get("bienTap")),
      quayPhim: str(fd.get("quayPhim")),
      soNguoi,
      isPhatSinh,
      // Đơn phát sinh bỏ qua bước Ban.
      status: isPhatSinh ? STATUS.CHO_DOI_XE : STATUS.CHO_BAN_DUYET,
      createdBy: s.username,
      updatedBy: s.username,
      originNode: ORIGIN,
    },
  });

  revalidateAll(created.id);
  redirect(`/don/${created.id}`);
}

export async function approveBookingAction(fd: FormData): Promise<void> {
  const s = await requireSession();
  const id = String(fd.get("bookingId") ?? "");
  const decision = String(fd.get("decision") ?? ""); // "duyet" | "tu_choi"
  const ghiChu = str(fd.get("ghiChu"));

  const bk = await prisma.booking.findUnique({ where: { id } });
  if (!bk || bk.deletedAt) return;
  if (!canApproveFor(s, bk.donViYeuCau))
    throw new Error("Không có quyền duyệt đơn của đơn vị này.");
  if (bk.status !== STATUS.CHO_BAN_DUYET)
    throw new Error("Đơn không còn ở trạng thái chờ Ban duyệt.");

  const nextStatus = decision === "duyet" ? STATUS.CHO_DOI_XE : STATUS.BAN_TU_CHOI;

  await prisma.$transaction([
    prisma.bookingApproval.upsert({
      where: { bookingId: id },
      create: {
        bookingId: id,
        approverUsername: s.username,
        quyetDinh: decision,
        ghiChu,
        updatedBy: s.username,
        originNode: ORIGIN,
      },
      update: {
        approverUsername: s.username,
        quyetDinh: decision,
        ghiChu,
        decidedAt: new Date(),
        updatedBy: s.username,
        deletedAt: null,
      },
    }),
    prisma.booking.update({
      where: { id },
      data: { status: nextStatus, updatedBy: s.username },
    }),
  ]);

  revalidateAll(id);
}

export async function dispatchBookingAction(fd: FormData): Promise<void> {
  const s = await requireSession();
  if (!isDoiXe(s)) throw new Error("Chỉ Đội xe được điều xe.");

  const id = String(fd.get("bookingId") ?? "");
  const decision = String(fd.get("decision") ?? "dieu"); // "dieu" | "tu_choi"

  const bk = await prisma.booking.findUnique({ where: { id } });
  if (!bk || bk.deletedAt) return;
  if (bk.status !== STATUS.CHO_DOI_XE)
    throw new Error("Đơn không còn ở trạng thái chờ Đội xe.");

  if (decision === "tu_choi") {
    await prisma.booking.update({
      where: { id },
      data: { status: STATUS.DOI_XE_TU_CHOI, updatedBy: s.username },
    });
    revalidateAll(id);
    return;
  }

  const vehicleId = String(fd.get("vehicleId") ?? "");
  const driverUsername = String(fd.get("driverUsername") ?? "");
  const ghiChuDoiXe = str(fd.get("ghiChuDoiXe"));
  if (!vehicleId || !driverUsername) throw new Error("Chọn xe và lái xe.");

  await prisma.$transaction([
    prisma.bookingDispatch.upsert({
      where: { bookingId: id },
      create: {
        bookingId: id,
        vehicleId,
        driverUsername,
        ghiChuDoiXe,
        dispatchedBy: s.username,
        updatedBy: s.username,
        originNode: ORIGIN,
      },
      update: {
        vehicleId,
        driverUsername,
        ghiChuDoiXe,
        dispatchedBy: s.username,
        dispatchedAt: new Date(),
        updatedBy: s.username,
        deletedAt: null,
      },
    }),
    prisma.booking.update({
      where: { id },
      data: { status: STATUS.DA_DIEU_XE, updatedBy: s.username },
    }),
  ]);

  revalidateAll(id);
}

export async function cancelBookingAction(fd: FormData): Promise<void> {
  const s = await requireSession();
  const id = String(fd.get("bookingId") ?? "");

  const bk = await prisma.booking.findUnique({ where: { id } });
  if (!bk || bk.deletedAt) return;

  const isOwner = bk.requesterUsername === s.username;
  let allowed = false;

  if ((bk.status === STATUS.CHO_BAN_DUYET || bk.status === STATUS.NHAP) && isOwner) {
    allowed = true; // chưa duyệt: người tạo tự hủy
  } else if (bk.status === STATUS.CHO_DOI_XE && (isDoiXe(s) || isVpDaiLeader(s))) {
    allowed = true;
  } else if (bk.status === STATUS.DA_DIEU_XE && isVpDaiLeader(s)) {
    allowed = true; // đã điều xe: chỉ Trưởng/Phó Ban Văn phòng Đài
  }

  if (!allowed) throw new Error("Không có quyền hủy đơn ở trạng thái này.");

  await prisma.booking.update({
    where: { id },
    data: { status: STATUS.HUY, updatedBy: s.username },
  });

  revalidateAll(id);
}
