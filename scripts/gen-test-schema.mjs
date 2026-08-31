// Sinh DDL cho test Sync Engine (SQLite + Postgres) từ schema Prisma.
// Chạy lại mỗi khi đổi prisma/schema.prisma.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const dummy = { DATABASE_URL: "postgresql://u@h/db", DIRECT_URL: "postgresql://u@h/db" };

execSync("node scripts/pg-schema.mjs", { stdio: "inherit" });

const pg = execSync(
  "npx --no-install prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.postgres.prisma --script",
  { env: { ...process.env, ...dummy } },
).toString();
writeFileSync("sync/test/schema.pg.sql", pg);

const sqlite = execSync(
  "npx --no-install prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script",
  { env: { ...process.env, DATABASE_URL: "file:./x.db" } },
).toString();
writeFileSync("sync/test/schema.sqlite.sql", sqlite);

console.log("Đã sinh sync/test/schema.{pg,sqlite}.sql");
