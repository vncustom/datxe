import "server-only";
import { prisma } from "@/lib/prisma";

export async function getSyncStatus() {
  const [runs, conflicts, states] = await Promise.all([
    prisma.syncRun.findMany({ orderBy: { startedAt: "desc" }, take: 25 }),
    prisma.syncConflictLog.findMany({ orderBy: { resolvedAt: "desc" }, take: 25 }),
    prisma.syncState.findMany({
      orderBy: [{ tableName: "asc" }, { direction: "asc" }],
    }),
  ]);
  const lastDone = runs.find((r) => r.finishedAt) ?? null;
  const lastError = runs.find((r) => r.error) ?? null;
  const healthy =
    !!lastDone?.finishedAt &&
    Date.now() - lastDone.finishedAt.getTime() < 5 * 60 * 1000 &&
    !lastDone.error;
  return { runs, conflicts, states, lastDone, lastError, healthy };
}

export function agoText(d: Date | null | undefined): string {
  if (!d) return "chưa có";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s} giây trước`;
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}
