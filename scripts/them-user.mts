/**
 * Thêm / cập nhật MỘT user bằng tay (khi không tiện dùng trang Quản trị).
 * Dùng chung cho cả SQLite local lẫn Supabase — client Prisma tự chọn provider
 * theo DATABASE_URL. id sinh tất định theo username (idFor) nên đồng bộ được.
 *
 *   npx tsx scripts/them-user.mts <username> "<Họ tên>" [role]
 *
 * Ví dụ:
 *   npx tsx scripts/them-user.mts adminxe "admin_datxe" admin
 *
 * - Mật khẩu khởi tạo: 123456 (KHÔNG đổi mật khẩu nếu user đã tồn tại).
 * - role mặc định: nhan_vien. Hợp lệ: nhan_vien | truong_ban | pho_ban |
 *   truong_phong | pho_phong | to_truong | to_pho | ban_tgd | admin.
 * - Chạy lại nhiều lần vô hại (upsert theo username).
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { idFor } from "../lib/uuid";

const ROLES = [
  "nhan_vien",
  "truong_ban",
  "pho_ban",
  "truong_phong",
  "pho_phong",
  "to_truong",
  "to_pho",
  "ban_tgd",
  "admin_datxe",
  "admin",
];

const [username, fullName, role = "nhan_vien"] = process.argv.slice(2);
if (!username || !fullName) {
  console.error(
    'Cú pháp: npx tsx scripts/them-user.mts <username> "<Họ tên>" [role]',
  );
  process.exit(1);
}
if (!ROLES.includes(role)) {
  console.error(`role không hợp lệ: ${role}\nHợp lệ: ${ROLES.join(" | ")}`);
  process.exit(1);
}

const origin = process.env.ORIGIN_NODE === "cloud" ? "cloud" : "local";
const prisma = new PrismaClient();

const user = await prisma.user.upsert({
  where: { username },
  update: {
    fullName,
    role,
    isActive: true,
    deletedAt: null,
    updatedBy: username,
    originNode: origin,
  },
  create: {
    id: idFor.user(username),
    username,
    fullName,
    role,
    passwordHash: await bcrypt.hash("123456", 10),
    isActive: true,
    updatedBy: username,
    originNode: origin,
  },
});

console.log(
  `OK (${origin}): ${user.username} · ${user.fullName} · ${user.role} · id=${user.id}`,
);
await prisma.$disconnect();
