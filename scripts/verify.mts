import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const roles = await p.user.groupBy({ by: ["role"], _count: true });
console.log("Roles:", roles.map((r) => `${r.role}=${r._count}`).join(", "));

const doixe = await p.user.findMany({
  where: { OR: [{ role: { in: ["to_truong", "to_pho"] } }, { isDriver: true }] },
  select: { username: true, fullName: true, role: true, dsBan: true, isDriver: true },
});
console.log("\nĐội xe:");
console.table(doixe);

const v = await p.vehicle.findMany({
  select: { name: true, plateNo: true, seats: true, currentOdometer: true },
});
console.log("Xe:");
console.table(v);

const tb = await p.user.findMany({
  where: { dsBan: "TT Tin Tức", role: { in: ["truong_ban", "pho_ban"] } },
  select: { username: true, fullName: true, role: true },
});
console.log("Người duyệt đơn cho 'TT Tin Tức':");
console.table(tb);

await p.$disconnect();
