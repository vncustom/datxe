import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedUser = {
  username: string;
  fullName: string;
  dsBan: string | null;
  dsPhong: string | null;
  dsTo: string | null;
  role: string;
  jobTitle: string | null;
  email: string | null;
  phone: string | null;
  isDriver: boolean;
};

// Giai đoạn đầu: 4 xe của Đội xe.
const VEHICLES = [
  { name: "Toyota Zace", plateNo: "50A-030.36", seats: 7 },
  { name: "Toyota Corolla Altis", plateNo: "50M-006.30", seats: 5 },
  { name: "Mitsubishi Triton", plateNo: "50A-031.91", seats: 5 },
  { name: "Toyota Hiace", plateNo: "50A-031.67", seats: 16 },
];

async function main() {
  const dataPath = fileURLToPath(new URL("./data/users.json", import.meta.url));
  const users: SeedUser[] = JSON.parse(readFileSync(dataPath, "utf-8"));

  // Mọi username dùng chung mật khẩu 123456 (theo yêu cầu).
  const passwordHash = await bcrypt.hash("123456", 10);

  for (const u of users) {
    const fields = {
      fullName: u.fullName,
      dsBan: u.dsBan,
      dsPhong: u.dsPhong,
      dsTo: u.dsTo,
      role: u.role,
      jobTitle: u.jobTitle,
      email: u.email,
      phone: u.phone,
      isDriver: u.isDriver,
    };
    await prisma.user.upsert({
      where: { username: u.username },
      // Không ghi đè passwordHash nếu user đã tồn tại (tránh reset khi re-seed).
      create: { username: u.username, passwordHash, ...fields },
      update: fields,
    });
  }

  for (const v of VEHICLES) {
    await prisma.vehicle.upsert({
      where: { plateNo: v.plateNo },
      create: v,
      update: { name: v.name, seats: v.seats },
    });
  }

  const [userCount, driverCount, vehicleCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isDriver: true } }),
    prisma.vehicle.count(),
  ]);
  console.log(
    `Seed xong: ${userCount} user (${driverCount} lái xe), ${vehicleCount} xe. Mật khẩu mặc định: 123456`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
