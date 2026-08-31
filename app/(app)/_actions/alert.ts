"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { isDoiXe } from "@/lib/rbac";
import { ORIGIN } from "@/lib/bookings";

export async function ackOdoAlertAction(fd: FormData): Promise<void> {
  const s = await requireSession();
  if (!isDoiXe(s)) throw new Error("Chỉ Đội xe được bỏ qua cảnh báo.");
  const refId = String(fd.get("refId") ?? "");
  if (!refId) return;

  await prisma.alertAck.upsert({
    where: { kind_refId: { kind: "odo_gap", refId } },
    create: {
      kind: "odo_gap",
      refId,
      ackedBy: s.username,
      updatedBy: s.username,
      originNode: ORIGIN,
    },
    update: {
      ackedBy: s.username,
      ackedAt: new Date(),
      deletedAt: null,
      updatedBy: s.username,
    },
  });

  revalidatePath("/cong-to-met");
}

export async function unackOdoAlertAction(fd: FormData): Promise<void> {
  const s = await requireSession();
  if (!isDoiXe(s)) throw new Error("Chỉ Đội xe được thao tác cảnh báo.");
  const refId = String(fd.get("refId") ?? "");
  if (!refId) return;

  await prisma.alertAck.updateMany({
    where: { kind: "odo_gap", refId, deletedAt: null },
    data: { deletedAt: new Date(), updatedBy: s.username },
  });

  revalidatePath("/cong-to-met");
}
