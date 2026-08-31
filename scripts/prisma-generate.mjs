// Chọn schema theo DATABASE_URL rồi chạy `prisma generate`.
//  - postgres://…  -> sinh schema.postgres.prisma, generate theo nó (Vercel/Supabase)
//  - còn lại       -> schema.prisma (SQLite, máy local)
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL || "";
const isPg = /^postgres(ql)?:\/\//.test(url);
const run = (cmd) => execSync(cmd, { stdio: "inherit", shell: true });

if (isPg) {
  console.log("Prisma: bản PostgreSQL");
  run("node scripts/pg-schema.mjs");
  run("npx --no-install prisma generate --schema prisma/schema.postgres.prisma");
} else {
  console.log("Prisma: bản SQLite");
  run("npx --no-install prisma generate");
}
