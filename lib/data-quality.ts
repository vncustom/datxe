import "server-only";
import { prisma } from "@/lib/prisma";

export type DataQuality = {
  nameEqualsUsername: number;
  bansWithoutLeader: string[];
  usersNoPhone: number;
  driversNoName: number;
  totalActive: number;
};

export async function getDataQuality(): Promise<DataQuality> {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      username: true,
      fullName: true,
      dsBan: true,
      role: true,
      phone: true,
      isDriver: true,
    },
  });

  const norm = (s: string) => s.trim().toLowerCase();
  const nameEqualsUsername = users.filter(
    (u) => norm(u.fullName) === norm(u.username),
  ).length;

  const bans = new Set<string>();
  const bansWithLeader = new Set<string>();
  for (const u of users) {
    if (!u.dsBan) continue;
    bans.add(u.dsBan);
    if (u.role === "truong_ban" || u.role === "pho_ban")
      bansWithLeader.add(u.dsBan);
  }
  const bansWithoutLeader = [...bans]
    .filter((b) => !bansWithLeader.has(b))
    .sort();

  return {
    nameEqualsUsername,
    bansWithoutLeader,
    usersNoPhone: users.filter((u) => !u.phone).length,
    driversNoName: users.filter(
      (u) => u.isDriver && norm(u.fullName) === norm(u.username),
    ).length,
    totalActive: users.length,
  };
}
