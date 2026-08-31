"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { ORIGIN } from "@/lib/bookings";
import { idFor } from "@/lib/uuid";

export type AdminState = { error?: string; ok?: string };

const str = (v: FormDataEntryValue | null): string | null => {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
};
const intOr = (v: FormDataEntryValue | null, d: number): number => {
  const t = String(v ?? "").replace(/[.,\s]/g, "");
  return /^\d+$/.test(t) ? Number(t) : d;
};

async function assertAdmin() {
  const s = await requireSession();
  if (!isAdmin(s)) throw new Error("Chỉ Quản trị.");
  return s;
}

const ROLES = [
  "nhan_vien",
  "truong_ban",
  "pho_ban",
  "truong_phong",
  "pho_phong",
  "to_truong",
  "to_pho",
  "ban_tgd",
  "admin",
  "admin_datxe",
];

export async function saveUserAction(
  _prev: AdminState,
  fd: FormData,
): Promise<AdminState> {
  const s = await assertAdmin();
  const mode = String(fd.get("mode") ?? "edit");
  const username = String(fd.get("username") ?? "").trim();
  const fullName = String(fd.get("fullName") ?? "").trim();
  const role = String(fd.get("role") ?? "nhan_vien");

  if (!username) return { error: "Thiếu tên đăng nhập." };
  if (!fullName) return { error: "Thiếu họ tên." };
  if (!ROLES.includes(role)) return { error: "Vai trò không hợp lệ." };

  const fields = {
    fullName,
    role,
    dsBan: str(fd.get("dsBan")),
    dsPhong: str(fd.get("dsPhong")),
    dsTo: str(fd.get("dsTo")),
    jobTitle: str(fd.get("jobTitle")),
    phone: str(fd.get("phone")),
    email: str(fd.get("email")),
    isDriver: fd.get("isDriver") === "on",
    isActive: fd.get("isActive") === "on",
    updatedBy: s.username,
    originNode: ORIGIN,
  };

  if (mode === "new") {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return { error: "Tên đăng nhập đã tồn tại." };
    await prisma.user.create({
      data: {
        id: idFor.user(username),
        username,
        passwordHash: await bcrypt.hash("123456", 10),
        ...fields,
      },
    });
  } else {
    await prisma.user.update({ where: { username }, data: fields });
  }

  revalidatePath("/quan-tri");
  redirect("/quan-tri");
}

export async function resetPasswordAction(fd: FormData): Promise<void> {
  const s = await assertAdmin();
  const username = String(fd.get("username") ?? "");
  await prisma.user.update({
    where: { username },
    data: {
      passwordHash: await bcrypt.hash("123456", 10),
      updatedBy: s.username,
    },
  });
  revalidatePath("/quan-tri");
}

export async function toggleUserActiveAction(fd: FormData): Promise<void> {
  const s = await assertAdmin();
  const username = String(fd.get("username") ?? "");
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u) return;
  await prisma.user.update({
    where: { username },
    data: { isActive: !u.isActive, updatedBy: s.username },
  });
  revalidatePath("/quan-tri");
}

// ---------------- xe ----------------

export async function saveVehicleAction(
  _prev: AdminState,
  fd: FormData,
): Promise<AdminState> {
  const s = await assertAdmin();
  const mode = String(fd.get("mode") ?? "edit");
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const plateNo = String(fd.get("plateNo") ?? "").trim();
  const seats = intOr(fd.get("seats"), 0);

  if (!name || !plateNo) return { error: "Thiếu nhãn hiệu hoặc biển số." };
  if (seats < 1) return { error: "Số chỗ không hợp lệ." };

  const fields = {
    name,
    plateNo,
    seats,
    note: str(fd.get("note")),
    isActive: fd.get("isActive") === "on",
    currentOdometer: intOr(fd.get("currentOdometer"), 0),
    updatedBy: s.username,
    originNode: ORIGIN,
  };

  if (mode === "new") {
    const existing = await prisma.vehicle.findUnique({ where: { plateNo } });
    if (existing) return { error: "Biển số đã tồn tại." };
    await prisma.vehicle.create({
      data: { id: idFor.vehicle(plateNo), ...fields },
    });
  } else {
    await prisma.vehicle.update({ where: { id }, data: fields });
  }

  revalidatePath("/quan-tri/xe");
  redirect("/quan-tri/xe");
}

export async function toggleVehicleActiveAction(fd: FormData): Promise<void> {
  const s = await assertAdmin();
  const id = String(fd.get("id") ?? "");
  const v = await prisma.vehicle.findUnique({ where: { id } });
  if (!v) return;
  await prisma.vehicle.update({
    where: { id },
    data: { isActive: !v.isActive, updatedBy: s.username },
  });
  revalidatePath("/quan-tri/xe");
}
