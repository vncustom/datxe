// Chọn schema rồi chạy `prisma generate`.
//  - Trên Vercel (process.env.VERCEL) HOẶC DATABASE_URL là postgres:// -> bản PostgreSQL
//  - còn lại -> schema.prisma (SQLite, máy local)
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL || "";
const onVercel = !!process.env.VERCEL;
const urlIsPg = /^postgres(ql)?:\/\//.test(url);
const isPg = onVercel || urlIsPg;
const run = (cmd) => execSync(cmd, { stdio: "inherit", shell: true });

if (isPg) {
  if (onVercel && !urlIsPg) {
    console.warn(
      "\n⚠  Build trên Vercel nhưng DATABASE_URL chưa phải postgres://…\n" +
        "   Kiểm tra Vercel → Settings → Environment Variables (DATABASE_URL, DIRECT_URL).\n",
    );
  }
  console.log("Prisma: bản PostgreSQL");
  run("node scripts/pg-schema.mjs");
  run("npx --no-install prisma generate --schema prisma/schema.postgres.prisma");
} else {
  console.log("Prisma: bản SQLite");
  run("npx --no-install prisma generate");
}
